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

import { FilterListPreprocessor, PreprocessedFilterList } from '@adguard/tswebextension';

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

export const BINARY_FILTER_KEY_PREFIX = 'binaryfilterrules_';

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
 * Schema for the conversion map.
 */
const CONVERSION_MAP_SCHEMA = zod.record(zod.string(), zod.string()).default({});

const SOURCE_MAP_SCHEMA = zod.record(zod.string(), zod.number()).default({});

const SOURCE_MAP_PREFIX = 'sourcemap_';

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
        const data = FiltersStorage.prepareFilterForStorage(filterId, filter);
        await hybridStorage.setMultiple(data);
    }

    /**
     * Helper method to get data to set to the storage for the specified filter list.
     *
     * @param filterId Filter id.
     * @param filter Filter rules strings.
     * @returns Record with data to set to the storage.
     */
    static prepareFilterForStorage(filterId: number, filter: string[]): Record<string, unknown> {
        const result: Record<string, unknown> = {};

        const filterKey = FiltersStorage.getFilterKey(filterId);
        const binaryFilterKey = FiltersStorage.getBinaryFilterKey(filterId);
        const conversionMapKey = FiltersStorage.getConversionMapKey(filterId);
        const sourceMapKey = FiltersStorage.getSourceMapKey(filterId);

        const {
            rawFilterList, filterList, conversionMap, sourceMap,
        } = FilterListPreprocessor.preprocess(filter.join('\n')); // FIXME: why need to join?

        result[filterKey] = rawFilterList;
        result[binaryFilterKey] = filterList;
        result[conversionMapKey] = conversionMap;
        result[sourceMapKey] = sourceMap;

        // Special case: user rules — we need to store original rules as well.
        // This is needed for the editor UI and for exporting user rules.
        // Conversion map is not enough because it can't convert back multiple
        // rules to the same single rule easily.
        // Think about the following example: `example.com#$#abp-snippet1; abp-snippet2; abp-snippet3`
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
    static async get(filterId: number): Promise<Uint8Array[]> {
        const binaryFilterKey = FiltersStorage.getBinaryFilterKey(filterId);
        const data = await hybridStorage.get(binaryFilterKey);
        return zod.array(zod.instanceof(Uint8Array)).parse(data);
    }

    /**
     * Returns source map for the specified filter list.
     *
     * @param filterId Filter id.
     * @returns Promise, resolved with source map.
     */
    static async getSourceMap(filterId: number): Promise<Record<number, number>> {
        const sourceMapKey = FiltersStorage.getSourceMapKey(filterId);
        const data = await hybridStorage.get(sourceMapKey);
        return SOURCE_MAP_SCHEMA.parse(data);
    }

    /**
     * Removes specified filter list from {@link hybridStorage}.
     *
     * @param filterId Filter id.
     */
    static async remove(filterId: number): Promise<void> {
        await hybridStorage.remove(FiltersStorage.getConversionMapKey(filterId));
        await hybridStorage.remove(FiltersStorage.getFilterKey(filterId, true));
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
     * Returns {@link hybridStorage} key to source map from specified filter list.
     *
     * @param filterId Filter id.
     * @returns Storage key to source map from specified filter list.
     */
    private static getSourceMapKey(filterId: number): string {
        return `${SOURCE_MAP_PREFIX}${filterId}${FILTER_LIST_EXTENSION}`;
    }

    /**
     * Returns {@link hybridStorage} key to binary filter list from specified filter list.
     *
     * @param filterId Filter id.
     * @returns Storage key to binary filter list from specified filter list.
     */
    private static getBinaryFilterKey(filterId: number): string {
        return `${BINARY_FILTER_KEY_PREFIX}${filterId}${FILTER_LIST_EXTENSION}`;
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
     * Get all filter data, including conversion map and source map.
     *
     * @param filterId Filter id.
     * @returns Promise, resolved with filter data or `null` if filter is not found.
     */
    static async getAllFilterData(filterId: number): Promise<PreprocessedFilterList | null> {
        const filterKey = FiltersStorage.getFilterKey(filterId);
        const binaryFilterKey = FiltersStorage.getBinaryFilterKey(filterId);
        const conversionMapKey = FiltersStorage.getConversionMapKey(filterId);
        const sourceMapKey = FiltersStorage.getSourceMapKey(filterId);

        const data = await Promise.all([
            hybridStorage.get(filterKey),
            hybridStorage.get(binaryFilterKey),
            hybridStorage.get(conversionMapKey),
            hybridStorage.get(sourceMapKey),
        ]);

        if (data.every((item) => !item)) {
            return null;
        }

        const [rawFilterList, filterList, conversionMap, sourceMap] = data;

        return {
            rawFilterList: zod.string().parse(rawFilterList), // FIXME: why need to join?
            filterList: zod.array(zod.instanceof(Uint8Array)).default([]).parse(filterList),
            conversionMap: CONVERSION_MAP_SCHEMA.parse(conversionMap),
            sourceMap: SOURCE_MAP_SCHEMA.parse(sourceMap),
        };
    }
}
