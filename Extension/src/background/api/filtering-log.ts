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
import { Tabs } from 'webextension-polyfill';

import {
    BACKGROUND_TAB_ID,
    ContentType,
    CookieEvent,
    isExtensionUrl,
    CosmeticRule,
    NetworkRule,
    CosmeticRuleType,
    NetworkRuleOption,
    StealthActionEvent,
    getRuleSourceText,
    getRuleSourceIndex,
} from '@adguard/tswebextension';

import { AntiBannerFiltersId } from '../../common/constants';
import { logger } from '../../common/logger';
import { translator } from '../../common/translators/translator';
import { listeners } from '../notifier';
import { Engine } from '../engine';
import {
    FilterData,
    FiltersStorage,
    settingsStorage,
} from '../storages';
import { SettingOption } from '../schema';
import { TabsApi } from '../../common/api/extension/tabs';
import { messageHandler } from '../message-handler';
import { MessageType } from '../../common/messages';

export type FilteringEventRuleData = {
    filterId: number,
    ruleText: string,
    isImportant?: boolean,
    documentLevelRule?: boolean,
    isStealthModeRule?: boolean,
    allowlistRule?: boolean,
    cspRule?: boolean,
    modifierValue?: string,
    cookieRule?: boolean,
    contentRule?: boolean,
    cssRule?: boolean,
    scriptRule?: boolean,
    appliedRuleText?: string,
};

export type FilteringLogEvent = {
    eventId: string,
    requestUrl?: string,
    requestDomain?: string,
    frameUrl?: string,
    frameDomain?: string,
    requestType?: ContentType,
    timestamp?: number,
    requestThirdParty?: boolean,
    method?: string,
    statusCode?: number,
    requestRule?: FilteringEventRuleData,
    removeParam?: boolean,
    removeHeader?: boolean,
    headerName?: string,
    element?: string,
    cookieName?: string,
    cookieValue?: string,
    isModifyingCookieRule?: boolean,
    cspReportBlocked?: boolean,
    replaceRules?: FilteringEventRuleData[],
    stealthActions?: StealthActionEvent['data']['stealthActions'],
};

export type FilteringLogTabInfo = {
    tabId: number,
    title: string,
    isExtensionTab: boolean,
    filteringEvents: FilteringLogEvent[],
};

/**
 * Interface for representing rule text and applied rule text. Sometimes rules are converted, but we also need to show
 * original rule text in the filtering log.
 */
interface RuleText {
    /**
     * Original rule text, always present. If rule wasn't converted, only rule text is present.
     */
    ruleText: string;

    /**
     * Applied rule text. If rule was converted, applied rule text is the converted rule text and rule text is the
     * original rule text.
     */
    appliedRuleText?: string;
}

/**
 * The filtering log collects all available information about requests
 * and the rules applied to them.
 */
export class FilteringLogApi {
    private static readonly REQUESTS_SIZE_PER_TAB = 1000;

    private preserveLogEnabled = false;

    private openedFilteringLogsPages = 0;

    private tabsInfoMap = new Map<number, FilteringLogTabInfo>([
        [BACKGROUND_TAB_ID, {
            tabId: BACKGROUND_TAB_ID,
            title: translator.getMessage('background_tab_title'),
            isExtensionTab: false,
            filteringEvents: [],
        }],
    ]);

    /**
     * Cache for filters data.
     *
     * The key is the filter list id and the value is the filter data.
     * This cache is used to avoid unnecessary requests to the storage while filtering log is opened.
     * After closing the filtering log, the cache is purged to free up memory.
     */
    private filtersCache = new Map<number, FilterData>();

    /**
     * Creates an instance of the filtering log API.
     * Initializes the event listeners.
     */
    constructor() {
        // FIXME: double check events
        const events = [
            MessageType.AddAndEnableFilter,
            MessageType.ApplySettingsJson,
            MessageType.ResetSettings,
            MessageType.SaveUserRules,
            MessageType.SaveAllowlistDomains,
            MessageType.DisableFiltersGroup,
            MessageType.DisableFilter,
            MessageType.SubscribeToCustomFilter,
            MessageType.RemoveAntiBannerFilter,
            MessageType.ChangeApplicationFilteringDisabled,
            MessageType.ResetCustomRulesForPage,
            MessageType.RemoveAllowlistDomain,
            MessageType.AddAllowlistDomainPopup,
            MessageType.AddUserRule,
            MessageType.RemoveUserRule,
            MessageType.EnableFiltersGroup,
            MessageType.ChangeUserSettings,
            MessageType.CheckRequestFilterReady,
            MessageType.SetConsentedFilters,
        ];

        this.purgeFiltersCache = this.purgeFiltersCache.bind(this);

        events.forEach((event) => {
            messageHandler.addListener(event, this.purgeFiltersCache);
        });
    }

    /**
     * Purges filters cache.
     */
    private purgeFiltersCache(): void {
        this.filtersCache.clear();
    }

    /**
     * Gets rule text for the specified filter id and rule index.
     * If the rule is not found, returns null.
     * It handles a cache internally to speed up requests for the same filter next time.
     *
     * @param filterId Filter id.
     * @param ruleIndex Rule index.
     * @returns Rule text or null if the rule is not found.
     */
    public async getRuleText(filterId: number, ruleIndex: number): Promise<RuleText | null> {
        let filterData;

        filterData = this.filtersCache.get(filterId);

        if (!filterData) {
            // It's not in the cache, try to get it from storage
            filterData = await FiltersStorage.getAllFilterData(filterId);

            if (filterData) {
                this.filtersCache.set(filterId, filterData);
            } else {
                return null;
            }
        }

        const { convertedFilterList, conversionMap, sourceMap } = filterData;

        // It is impossible to get rule text if there is no source map
        if (!sourceMap) {
            return null;
        }

        // Get line start index for the rule from the rule index
        const lineStartIndex = getRuleSourceIndex(ruleIndex, sourceMap);

        if (lineStartIndex === -1) {
            return null;
        }

        const sourceRule = getRuleSourceText(lineStartIndex, convertedFilterList);

        if (!sourceRule) {
            return null;
        }

        // FIXME: May change `conversionMap` key to `lineStartIndex` which is just a number?
        // (Currently we maps the converted rule text to the original rule text)
        if (conversionMap && conversionMap[sourceRule]) {
            return {
                ruleText: sourceRule,
                appliedRuleText: conversionMap[ruleIndex],
            };
        }

        return {
            ruleText: sourceRule,
        };
    }

    /**
     * Checks if filtering log page is opened.
     *
     * @returns True, if filtering log page is opened, else false.
     */
    public isOpen(): boolean {
        return this.openedFilteringLogsPages > 0;
    }

    /**
     * Checks if preserve log is enabled.
     *
     * @returns True, if preserve log is enabled, else false.
     */
    public isPreserveLogEnabled(): boolean {
        return this.preserveLogEnabled;
    }

    /**
     * Sets preserve log state.
     *
     * @param enabled Is preserve log enabled.
     */
    public setPreserveLogState(enabled: boolean): void {
        this.preserveLogEnabled = enabled;
    }

    /**
     * We collect filtering events if opened at least one page of log.
     */
    public async onOpenFilteringLogPage(): Promise<void> {
        this.openedFilteringLogsPages += 1;

        try {
            Engine.api.setDebugScriptlets(true);
        } catch (e) {
            logger.error('Failed to enable `verbose scriptlets logging` option', e);
        }

        try {
            Engine.api.setCollectHitStats(true);
        } catch (e) {
            logger.error('Failed to enable `collect hit stats` option', e);
        }
    }

    /**
     * Cleanups when last page of log closes.
     */
    public onCloseFilteringLogPage(): void {
        this.openedFilteringLogsPages = Math.max(this.openedFilteringLogsPages - 1, 0);
        if (this.openedFilteringLogsPages === 0) {
            // Purge filters cache to free up memory
            this.purgeFiltersCache();

            // Clear events
            this.tabsInfoMap.forEach((tabInfo) => {
                tabInfo.filteringEvents = [];
            });

            try {
                Engine.api.setDebugScriptlets(false);
            } catch (e) {
                logger.error('Failed to disable `verbose scriptlets logging` option', e);
            }

            if (settingsStorage.get(SettingOption.DisableCollectHits)) {
                try {
                    Engine.api.setCollectHitStats(false);
                } catch (e) {
                    logger.error('Failed to disable `collect hit stats` option', e);
                }
            }
        }
    }

    /**
     * Creates tab info.
     *
     * @param tab {@link browser.Tabs.Tab} Data.
     * @param isSyntheticTab Is tab is used to send initial requests from new tab in chrome.
     */
    public createTabInfo(tab: Tabs.Tab, isSyntheticTab = false): void {
        const { id, title, url } = tab;

        if (!id || !url || !title) {
            return;
        }

        // Background tab can't be added
        // Synthetic tabs are used to send initial requests from new tab in chrome
        if (id === BACKGROUND_TAB_ID || isSyntheticTab) {
            return;
        }

        const tabInfo: FilteringLogTabInfo = {
            tabId: id,
            title,
            isExtensionTab: isExtensionUrl(url),
            filteringEvents: [],
        };

        this.tabsInfoMap.set(id, tabInfo);

        listeners.notifyListeners(listeners.TabAdded, tabInfo);
    }

    /**
     * Updates tab title and url.
     *
     * @param tab {@link browser.Tabs.Tab} Data.
     */
    public updateTabInfo(tab: Tabs.Tab): void {
        const { id, title, url } = tab;

        if (!id || !url || !title) {
            return;
        }

        // Background tab can't be updated
        if (id === BACKGROUND_TAB_ID) {
            return;
        }

        const tabInfo = this.getFilteringInfoByTabId(id);

        if (!tabInfo) {
            this.createTabInfo(tab);
            return;
        }

        tabInfo.title = title;
        tabInfo.isExtensionTab = isExtensionUrl(url);

        listeners.notifyListeners(listeners.TabUpdate, tabInfo);
    }

    /**
     * Removes tab info.
     *
     * @param id Tab id.
     */
    public removeTabInfo(id: number): void {
        // Background tab can't be removed
        if (id === BACKGROUND_TAB_ID) {
            return;
        }

        const tabInfo = this.tabsInfoMap.get(id);

        if (tabInfo) {
            listeners.notifyListeners(listeners.TabClose, tabInfo);
        }

        this.tabsInfoMap.delete(id);
    }

    /**
     * Returns filtering info for tab.
     *
     * @param tabId Tab id.
     *
     * @returns Tab data for filtering log window.
     */
    public getFilteringInfoByTabId(tabId: number): FilteringLogTabInfo | undefined {
        return this.tabsInfoMap.get(tabId);
    }

    /**
     * Synchronizes currently opened tabs with out state.
     */
    public async synchronizeOpenTabs(): Promise<FilteringLogTabInfo[]> {
        const tabs = await TabsApi.getAll();

        // As Object.keys() returns strings we convert them to integers,
        // because tabId is integer in extension API
        const tabIdsToRemove = Object.keys(this.tabsInfoMap).map(id => Number(id));

        for (let i = 0; i < tabs.length; i += 1) {
            const openTab = tabs[i];

            if (!openTab?.id) {
                continue;
            }

            const tabInfo = this.tabsInfoMap.get(openTab.id);

            if (!tabInfo) {
                this.createTabInfo(openTab);
            } else {
                // update tab
                this.updateTabInfo(openTab);
            }
            const index = tabIdsToRemove.indexOf(openTab.id);
            if (index >= 0) {
                tabIdsToRemove.splice(index, 1);
            }
        }

        for (let j = 0; j < tabIdsToRemove.length; j += 1) {
            const tabIdToRemove = tabIdsToRemove[j];

            if (tabIdToRemove) {
                this.removeTabInfo(tabIdToRemove);
            }
        }

        return Array.from(this.tabsInfoMap.values());
    }

    /**
     * Remove log requests for tab.
     *
     * @param tabId Tab id.
     * @param ignorePreserveLog Is {@link preserveLogEnabled} flag ignored.
     */
    public clearEventsByTabId(tabId: number, ignorePreserveLog = false): void {
        const tabInfo = this.tabsInfoMap.get(tabId);

        const preserveLog = ignorePreserveLog ? false : this.preserveLogEnabled;

        if (tabInfo && !preserveLog) {
            tabInfo.filteringEvents = [];
            listeners.notifyListeners(listeners.TabReset, tabInfo);
        }
    }

    /**
     * Adds a filter log event (for example when applying a csp rule, enforcing a script, sending a request)
     * with data related to that event.
     *
     * @param tabId Tab id.
     * @param data {@link FilteringLogEvent} Event data.
     */
    public addEventData(tabId: number, data: FilteringLogEvent): void {
        const tabInfo = this.getFilteringInfoByTabId(tabId);
        if (!tabInfo || !this.isOpen()) {
            return;
        }

        tabInfo.filteringEvents.push(data);

        if (tabInfo.filteringEvents.length > FilteringLogApi.REQUESTS_SIZE_PER_TAB) {
            // don't remove first item, cause it's request to main frame
            tabInfo.filteringEvents.splice(1, 1);
        }

        // TODO: Looks like not using. Maybe lost listener in refactoring.
        listeners.notifyListeners(listeners.LogEventAdded, tabInfo, data);
    }

    /**
     * Updates the event data for an already recorded event.
     *
     * @param tabId Tab id.
     * @param eventId Event id.
     * @param data Event data.
     */
    public updateEventData(
        tabId: number,
        eventId: string,
        data: Partial<FilteringLogEvent>,
    ): void {
        const tabInfo = this.getFilteringInfoByTabId(tabId);
        if (!tabInfo || !this.isOpen()) {
            return;
        }

        const { filteringEvents } = tabInfo;

        let event = filteringEvents.find(e => e.eventId === eventId);

        if (event) {
            event = Object.assign(event, data);

            // TODO: Looks like not using. Maybe lost listener in refactoring.
            listeners.notifyListeners(listeners.LogEventAdded, tabInfo, event);
        }
    }

    /**
     * Checks if a cookie event exists or not.
     *
     * @param cookieEvent Cookie event.
     * @param cookieEvent.data Cookie event data.
     * @returns True if a cookie with the same frame domain, name and value
     * has already been written, and false otherwise.
     */
    public isExistingCookieEvent({ data }: CookieEvent): boolean {
        const {
            tabId,
            cookieName,
            cookieValue,
            frameDomain,
        } = data;

        const tabInfo = this.getFilteringInfoByTabId(tabId);
        const filteringEvents = tabInfo?.filteringEvents;

        if (!filteringEvents) {
            return false;
        }

        return filteringEvents.some(event => {
            return event.frameDomain === frameDomain
                && event.cookieName === cookieName
                && event.cookieValue === cookieValue;
        });
    }

    /**
     * Helper method to get original rule text from {@link FiltersStorage}.
     * Applied filter rule may be converted, but we need to store original rule text in the filtering log.
     *
     * @param filterId Filter id.
     * @param ruleText Applied rule text.
     * @returns Rule text and applied rule text (if rule was converted, otherwise `undefined`).
     */
    private static getAppliedAndOriginalRuleTexts(filterId: number, ruleText: string): RuleText {
        // Get original rule text from storage. If rule wasn't converted, original rule text is `undefined`.
        const originalRuleText = FiltersStorage.getOriginalRuleText(filterId, ruleText);

        if (!originalRuleText) {
            return { ruleText };
        }

        return { ruleText: originalRuleText, appliedRuleText: ruleText };
    }

    /**
     * Creates {@link FilteringEventRuleData} from {@link NetworkRule}.
     *
     * @param rule Network rule.
     * @returns Object of {@link FilteringEventRuleData}.
     */
    public static createNetworkRuleEventData(rule: NetworkRule): FilteringEventRuleData {
        const filterId = rule.getFilterListId();
        const ruleText = rule.getText();

        const data: FilteringEventRuleData = {
            filterId,
            // FIXME: rework & do not execute if filtering log is not opened
            ...FilteringLogApi.getAppliedAndOriginalRuleTexts(filterId, ruleText),
        };

        if (rule.isOptionEnabled(NetworkRuleOption.Important)) {
            data.isImportant = true;
        }

        if (rule.isDocumentLevelAllowlistRule()) {
            data.documentLevelRule = true;
        }

        if (rule.getFilterListId() === AntiBannerFiltersId.StealthModeFilterId) {
            data.isStealthModeRule = true;
        }

        data.allowlistRule = rule.isAllowlist();
        data.cspRule = rule.isOptionEnabled(NetworkRuleOption.Csp);
        data.cookieRule = rule.isOptionEnabled(NetworkRuleOption.Cookie);

        const advancedModifiedValue = rule.getAdvancedModifierValue();
        if (advancedModifiedValue !== null) {
            data.modifierValue = advancedModifiedValue;
        }

        return data;
    }

    /**
     * Creates {@link FilteringEventRuleData} from {@link CosmeticRule}.
     *
     * @param rule Cosmetic rule.
     * @returns Object of {@link FilteringEventRuleData}.
     */
    public static createCosmeticRuleEventData(rule: CosmeticRule): FilteringEventRuleData {
        const data: FilteringEventRuleData = Object.create(null);

        const filterId = rule.getFilterListId();
        // FIXME: get index here, and fetch original text from storage
        const ruleText = rule.getText();

        data.filterId = filterId;
        // FIXME: rework & do not execute if filtering log is not opened
        // add `ruleText` and `appliedRuleText` properties to data for original and applied rule texts respectively
        Object.assign(data, FilteringLogApi.getAppliedAndOriginalRuleTexts(filterId, ruleText));

        const ruleType = rule.getType();

        switch (ruleType) {
            case CosmeticRuleType.CssInjectionRule:
            case CosmeticRuleType.ElementHidingRule:
                data.cssRule = true;
                break;
            case CosmeticRuleType.ScriptletInjectionRule:
            case CosmeticRuleType.JsInjectionRule:
                data.scriptRule = true;
                break;
            case CosmeticRuleType.HtmlFilteringRule:
                data.contentRule = true;
                break;
            default:
        }

        return data;
    }
}

export const filteringLogApi = new FilteringLogApi();
