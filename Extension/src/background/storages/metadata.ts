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
import browser from 'webextension-polyfill';

import {
    SettingOption,
    Metadata,
    TagMetadata,
    RegularFilterMetadata,
    GroupMetadata,
    FiltersI18n,
    GroupsI18n,
    I18nMetadata,
    TagsI18n,
} from '../schema';
import { StringStorage } from '../utils/string-storage';
import { I18n } from '../utils/i18n';

import { settingsStorage } from './settings';

/**
 * Class for synchronous control {@link Metadata} storage,
 * that is persisted as string in another key value storage.
 *
 * @see {@link StringStorage}
 */
export class MetadataStorage extends StringStorage<SettingOption.Metadata, Metadata, 'sync'> {
    /**
     * Returns regular filters metadata.
     *
     * @returns Regular filters metadata.
     * @throws Error if metadata is not initialized.
     */
    public getFilters(): RegularFilterMetadata[] {
        if (!this.data) {
            throw MetadataStorage.createNotInitializedError();
        }

        return this.data.filters;
    }

    /**
     * Returns specified regular filter metadata.
     *
     * @param filterId Filter id.
     * @returns Specified regular filter metadata.
     * @throws Error if metadata is not initialized.
     */
    public getFilter(filterId: number): RegularFilterMetadata | undefined {
        if (!this.data) {
            throw MetadataStorage.createNotInitializedError();
        }

        return this.data.filters.find(el => el.filterId === filterId);
    }

    /**
     * Returns groups metadata.
     *
     * @returns Groups metadata.
     * @throws Error if metadata is not initialized.
     */
    public getGroups(): GroupMetadata[] {
        if (!this.data) {
            throw MetadataStorage.createNotInitializedError();
        }

        return this.data.groups;
    }

    /**
     * Returns specified group metadata.
     *
     * @param groupId Group id.
     * @returns Specified group metadata.
     * @throws Error if metadata is not initialized.
     */
    public getGroup(groupId: number): GroupMetadata | undefined {
        if (!this.data) {
            throw MetadataStorage.createNotInitializedError();
        }

        return this.data.groups.find(el => el.groupId === groupId);
    }

    /**
     * Returns tags metadata.
     *
     * @returns Tags metadata.
     * @throws Error if metadata is not initialized.
     */
    public getTags(): TagMetadata[] {
        if (!this.data) {
            throw MetadataStorage.createNotInitializedError();
        }

        return this.data.tags;
    }

    /**
     * Returns specified tag metadata.
     *
     * @param tagId Tag id.
     * @returns Specified tag metadata.
     * @throws Error if metadata is not initialized.
     */
    public getTag(tagId: number): TagMetadata | undefined {
        if (!this.data) {
            throw MetadataStorage.createNotInitializedError();
        }

        return this.data.tags.find(el => el.tagId === tagId);
    }

    /**
     * Returns list of filters for the specified languages.
     *
     * @param locale Locale string.
     * @returns List of language specific filters ids.
     */
    public getFilterIdsForLanguage(locale: string): number[] {
        if (!locale) {
            return [];
        }

        return this.getFilters()
            .filter(({ languages }) => languages.length > 0 && I18n.find(languages, locale))
            .map(({ filterId }) => filterId);
    }

    /**
     * Refreshes metadata objects with i18n metadata.
     *
     * @param metadata Current {@link Metadata}.
     * @param i18nMetadata Applied {@link I18nMetadata}.
     *
     * @returns Updated {@link Metadata}.
     */
    public static applyI18nMetadata(
        metadata: Metadata,
        i18nMetadata: I18nMetadata,
    ): Metadata {
        const tagsI18n = i18nMetadata.tags;
        const filtersI18n = i18nMetadata.filters;
        const groupsI18n = i18nMetadata.groups;

        const { tags, groups, filters } = metadata;

        tags.forEach((tag) => MetadataStorage.applyFilterTagLocalization(tag, tagsI18n));
        filters.forEach((filter) => MetadataStorage.applyFilterLocalization(filter, filtersI18n));
        groups.forEach((group) => MetadataStorage.applyGroupLocalization(group, groupsI18n));

        return metadata;
    }

    /**
     * Localize tag.
     *
     * @param tag Tag metadata.
     * @param tagsI18n Tag i18n metadata.
     */
    private static applyFilterTagLocalization(
        tag: TagMetadata,
        tagsI18n: TagsI18n,
    ): void {
        const { tagId } = tag;
        const localizations = tagsI18n[tagId];
        if (localizations) {
            const locale = I18n.find(localizations, browser.i18n.getUILanguage());

            if (!locale) {
                return;
            }

            const localization = localizations[locale];

            if (localization) {
                tag.name = localization.name;
                tag.description = localization.description;
            }
        }
    }

    /**
     * Localize filter.
     *
     * @param filter Regular filter metadata.
     * @param filtersI18n Regular filter i18n metadata.
     */
    private static applyFilterLocalization(
        filter: RegularFilterMetadata,
        filtersI18n: FiltersI18n,
    ): void {
        const { filterId } = filter;
        const localizations = filtersI18n[filterId];
        if (localizations) {
            const locale = I18n.find(localizations, browser.i18n.getUILanguage());

            if (!locale) {
                return;
            }

            const localization = localizations[locale];

            if (localization) {
                filter.name = localization.name;
                filter.description = localization.description;
            }
        }
    }

    /**
     * Localize group.
     *
     * @param group Group metadata.
     * @param groupsI18n Group i18n metadata.
     */
    private static applyGroupLocalization(
        group: GroupMetadata,
        groupsI18n: GroupsI18n,
    ): void {
        const { groupId } = group;
        const localizations = groupsI18n[groupId];
        if (localizations) {
            const locale = I18n.find(localizations, browser.i18n.getUILanguage());

            if (!locale) {
                return;
            }

            const localization = localizations[locale];
            if (localization) {
                group.groupName = localization.name;
            }
        }
    }

    /**
     * Helper function to create a basic {@link Error} with a custom message.
     *
     * @returns A basic {@link Error} with a custom message.
     */
    private static createNotInitializedError(): Error {
        return new Error('Metadata is not initialized');
    }
}

/**
 * {@link MetadataStorage} Instance, that stores
 * stringified {@link Metadata} in {@link settingsStorage} under
 * {@link SettingOption.Metadata} key.
 */
export const metadataStorage = new MetadataStorage(SettingOption.Metadata, settingsStorage);
