/**
 * @file
 * This file is part of AdGuard Browser Extension (https://github.com/AdguardTeam/AdguardBrowserExtension).
 *
 * AdGuard Browser Extension is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * AdGuard Browser Extension is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 * See the GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with AdGuard Browser Extension. If not, see <http://www.gnu.org/licenses/>.
 */
import zod from 'zod';

import { FilterConverter } from '../utils/filter-converter';
import { logger } from '../../common/logger';
import { AntiBannerFiltersId, FILTER_LIST_EXTENSION } from '../../common/constants';

import { hybridStorage } from './shared-instances';

/**
 * Prefix for storage keys where filter lists are stored.
 * These filter lists are stored in converted format, so before storing them, we convert them to AdGuard format.
 *
 * @example
 * filterrules_1.txt
 */
export const FILTER_KEY_PREFIX = 'filterrules_';

/**
 * A special prefix for storage keys where original user rules are stored.
 * It is only used for user rules which is a special filter list.
 * The purpose is this data is to easily get the original user rules for the editor UI and for exporting user rules.
 *
 * @example
 * originalfilterrules_1.txt
 */
const ORIGINAL_FILTER_KEY_PREFIX = 'originalfilterrules_';

/**
 * Prefix for storage keys where conversion maps are stored.
 * Conversion maps are used to show original rule text in the filtering log if a converted rule is applied.
 *
 * @example
 * conversionmap_1.txt
 */
const CONVERSION_MAP_PREFIX = 'conversionmap_';

/**
 * Regular expression that helps to extract filter id from the key.
 */
const RE_FILTER_KEY = new RegExp(
    `^(${FILTER_KEY_PREFIX}|${ORIGINAL_FILTER_KEY_PREFIX})(?<filterId>\\d+)${FILTER_LIST_EXTENSION}$`,
);

/**
 * Encapsulates interaction with stored filter rules.
 */
export class FiltersStorage {
    /**
     * Sets specified filter list to {@link storage}.
     *
     * @param filterId Filter id.
     * @param filter Filter rules strings.
     */
    static async set(filterId: number, filter: string[]): Promise<void> {
        const data = FiltersStorage.getDataToSet(filterId, filter);
        await hybridStorage.setMultiple(data);
    }

    /**
     * Helper method to get data to set to the storage for the specified filter list.
     *
     * @param filterId Filter id.
     * @param filter Filter rules strings.
     * @returns Record with data to set to the storage.
     */
    static getDataToSet(filterId: number, filter: string[]): Record<string, unknown> {
        const result: Record<string, unknown> = {};

        const filterKey = FiltersStorage.getFilterKey(filterId);
        const conversionMapKey = FiltersStorage.getConversionMapKey(filterId);

        // Convert filter rules to AdGuard format where it's possible.
        // We need conversion map to show original rule text in the filtering log if a converted rule is applied.
        const { filter: convertedFilter, conversionMap } = FilterConverter.convertFilter(filter);

        result[filterKey] = convertedFilter;
        result[conversionMapKey] = conversionMap;

        // Special case: user rules — we need to store original rules as well.
        // This is needed for the editor UI and for exporting user rules.
        // Conversion map is not enough because it can't convert back multiple
        // rules to the same single rule easily.
        // Think about the following example:
        //  example.com#$#abp-snippet1; abp-snippet2; abp-snippet3
        if (filterId === AntiBannerFiltersId.UserFilterId) {
            const originalFilterKey = FiltersStorage.getFilterKey(filterId, true);
            result[originalFilterKey] = filter;
        }

        return result;
    }

    /**
     * Returns specified filter list from {@link hybridStorage}.
     *
     * @param filterId Filter id.
     *
     * @returns Promise, resolved with filter rules strings.
     * @throws Error, if filter list data is not valid.
     */
    static async get(filterId: number): Promise<string[]> {
        const filterKey = FiltersStorage.getFilterKey(filterId);
        const data = await hybridStorage.get(filterKey);
        return zod.string().array().parse(data);
    }

    /**
     * Removes specified filter list from {@link hybridStorage}.
     *
     * @param filterId Filter id.
     */
    static async remove(filterId: number): Promise<void> {
        const filterKey = FiltersStorage.getFilterKey(filterId);
        return hybridStorage.remove(filterKey);
    }

    /**
     * Returns {@link hybridStorage} key from specified filter list.
     *
     * @param filterId Filter id.
     * @param original If `true`, returns key for original filter list. Especially needed for user rules.
     * Defaults to `false`.
     * @returns Storage key from specified filter list.
     */
    private static getFilterKey(filterId: number, original = false): string {
        const prefix = original ? ORIGINAL_FILTER_KEY_PREFIX : FILTER_KEY_PREFIX;
        return `${prefix}${filterId}${FILTER_LIST_EXTENSION}`;
    }

    /**
     * Helper method to extract filter id from the key.
     *
     * @param key Storage key.
     * @returns Filter id or `null` if the key is invalid.
     */
    static extractFilterIdFromFilterKey(key: string): number | null {
        const match = key.match(RE_FILTER_KEY);
        return match ? parseInt(match.groups?.filterId ?? '', 10) : null;
    }

    /**
     * Returns {@link hybridStorage} key to conversion map from specified filter list.
     *
     * @param filterId Filter id.
     * @returns Storage key to conversion map from specified filter list.
     */
    private static getConversionMapKey(filterId: number): string {
        return `${CONVERSION_MAP_PREFIX}${filterId}${FILTER_LIST_EXTENSION}`;
    }

    /**
     * Returns original user rules from {@link hybridStorage}.
     *
     * @returns Promise, resolved with original user rules strings.
     * @throws Error, if filter list data is not valid.
     */
    static async getOriginalUserRules(): Promise<string[]> {
        // Special case: user rules have original rules stored separately
        const originalFilterKey = FiltersStorage.getFilterKey(AntiBannerFiltersId.UserFilterId, true);
        const data = await hybridStorage.get(originalFilterKey);
        // If there are no rules in the storage, fallback to empty array
        const schema = zod.array(zod.string()).optional().default([]);
        return schema.parse(data);
    }

    /**
     * Returns original rule text from the specified filter list and converted rule text.
     *
     * @param filterId Filter id.
     * @param ruleText Rule text from the converted filter list.
     * @returns Promise, resolved with the original rule text or `null` if the original rule text cannot be found.
     */
    static async getOriginalRuleText(filterId: number, ruleText: string): Promise<string | null> {
        logger.debug(`Getting original rule text for '${ruleText}'`);

        const conversionMapKey = FiltersStorage.getConversionMapKey(filterId);
        const data = await hybridStorage.get(conversionMapKey);

        try {
            const conversionMap = zod.record(zod.string(), zod.string()).parse(data);
            // eslint-disable-next-line max-len
            logger.debug(`Conversion map for ${FiltersStorage.getFilterKey(filterId)}: ${JSON.stringify(conversionMap)}`);
            return conversionMap[ruleText] ?? null;
        } catch (error: unknown) {
            logger.debug(`Failed to get original rule text for '${ruleText}' due to`, error);
            return null;
        }
    }
}
