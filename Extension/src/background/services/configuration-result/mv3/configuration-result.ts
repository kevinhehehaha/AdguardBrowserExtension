import browser from 'webextension-polyfill';

import { ConfigurationResult } from '@adguard/tswebextension/dist/types/src/lib/mv3/background';
import {
    TooManyRegexpRulesError,
    TooManyRulesError,
    RULE_SET_NAME_PREFIX,
    LimitationError,
} from '@adguard/tswebextension/mv3';

import { configurationResultApi } from '../../../api/configuration-result/mv3/configuration-result';
import { messageHandler } from '../../../message-handler';
import { MessageType } from '../../../../common/messages';
import { FilterMetadata, FiltersApi } from '../../../api';
import { CUSTOM_FILTERS_START_ID } from '../../../../common/constants';

const {
    MAX_NUMBER_OF_DYNAMIC_AND_SESSION_RULES,
    MAX_NUMBER_OF_REGEX_RULES,
    MAX_NUMBER_OF_ENABLED_STATIC_RULESETS,
} = browser.declarativeNetRequest;

interface RuleSetCounter {
    filterId: number;
    rulesCount: number;
    regexpRulesCount: number;
}

interface RuleSetCountersMap {
    [key: number]: RuleSetCounter;
}

// FIXME move to common files
export interface IRulesLimits {
    userRulesEnabledCount: number;
    userRulesMaximumCount: number;
    userRulesRegexpsEnabledCount: number;
    userRulesRegexpsMaximumCount: number;
    staticFiltersEnabledCount: number;
    staticFiltersMaximumCount: number;
    staticRulesEnabledCount: number;
    staticRulesMaximumCount: number;
    staticRulesRegexpsEnabledCount: number;
    staticRulesRegexpsMaxCount: number;
}

// FIXME docs
/**
 *
 */
export class ConfigurationResultService {
    configurationResultApi = configurationResultApi;

    // FIXME: notify options page if limits has changed
    /**
     *
     */
    init() {
        messageHandler.addListener(MessageType.GetRulesLimits, this.onGetRulesLimits.bind(this));
    }

    /**
     *
     */
    static getStaticEnabledFiltersCount(): number {
        return FiltersApi.getEnabledFiltersWithMetadata()
            .filter(f => f.groupId <= CUSTOM_FILTERS_START_ID).length;
    }

    static getRuleSetsCountersMap = (result: ConfigurationResult): RuleSetCountersMap => {
        return result.staticFilters
            .reduce((acc: { [key: number]: RuleSetCounter }, ruleset) => {
                const filterId = Number(ruleset.getId()
                    .slice(RULE_SET_NAME_PREFIX.length));

                acc[filterId] = {
                    filterId,
                    rulesCount: ruleset.getRulesCount(),
                    regexpRulesCount: ruleset.getRegexpRulesCount(),
                };

                return acc;
            }, {});
    };

    static getRuleSetCounters = (filters: FilterMetadata[], ruleSetsCounters: RuleSetCountersMap) => {
        return filters
            .filter((f) => f.groupId < CUSTOM_FILTERS_START_ID)
            .map(filter => ruleSetsCounters[filter.filterId])
            .filter((ruleSet): ruleSet is RuleSetCounter => ruleSet !== undefined);
    };

    /**
     *
     * @param result
     * @param filters
     */
    getStaticRulesEnabledCount(result: ConfigurationResult, filters: FilterMetadata[]): number {
        const ruleSetsCounters = ConfigurationResultService.getRuleSetsCountersMap(result);

        const ruleSets = ConfigurationResultService.getRuleSetCounters(filters, ruleSetsCounters);

        return ruleSets.reduce((sum, ruleSet) => {
            return sum + ruleSet.rulesCount;
        }, 0);
    }

    getStaticRulesRegexpsCount(result: ConfigurationResult, filters: FilterMetadata[]): number {
        const ruleSetsCounters = ConfigurationResultService.getRuleSetsCountersMap(result);

        const ruleSets = ConfigurationResultService.getRuleSetCounters(filters, ruleSetsCounters);

        return ruleSets.reduce((sum, ruleSet) => {
            return sum + ruleSet.regexpRulesCount;
        }, 0);
    }

    static getRegexpRulesLimitExceedErr = (result: ConfigurationResult): LimitationError | undefined => {
        return result.dynamicRules.limitations
            .find((e) => e instanceof TooManyRegexpRulesError);
    };

    static getRulesLimitExceedErr = (result: ConfigurationResult): LimitationError | undefined => {
        return result.dynamicRules.limitations
            .find((e) => e instanceof TooManyRulesError);
    };

    static getUserRulesEnabledCount = (result: ConfigurationResult): number => {
        const rulesLimitExceedErr = ConfigurationResultService.getRulesLimitExceedErr(result);
        const declarativeRulesCount = result.dynamicRules.ruleSet.getRulesCount();
        return rulesLimitExceedErr?.numberOfMaximumRules || declarativeRulesCount;
    };

    static getUserRulesMaximumCount = (result: ConfigurationResult): number => {
        const rulesLimitExceedErr = ConfigurationResultService.getRulesLimitExceedErr(result);
        return rulesLimitExceedErr?.numberOfMaximumRules || MAX_NUMBER_OF_DYNAMIC_AND_SESSION_RULES;
    };

    static getUserRulesRegexpsEnabledCount = (result: ConfigurationResult): number => {
        const regexpRulesLimitExceedErr = ConfigurationResultService.getRegexpRulesLimitExceedErr(result);
        const regexpsCount = result.dynamicRules.ruleSet.getRegexpRulesCount();
        return regexpsCount + (regexpRulesLimitExceedErr?.excludedRulesIds.length || 0);
    };

    static getUserRulesRegexpsMaximumCount = (result: ConfigurationResult): number => {
        const regexpRulesLimitExceedErr = ConfigurationResultService.getRegexpRulesLimitExceedErr(result);
        return regexpRulesLimitExceedErr?.numberOfMaximumRules || MAX_NUMBER_OF_REGEX_RULES;
    };

    /**
     *
     */
    async onGetRulesLimits(): Promise<IRulesLimits> {
        const result = this.configurationResultApi.get();
        if (!result) {
            throw new Error('result should be ready');
        }

        const filters = FiltersApi.getEnabledFiltersWithMetadata();

        const staticRulesEnabledCount = this.getStaticRulesEnabledCount(result, filters);
        const availableStaticRulesCount = await browser.declarativeNetRequest.getAvailableStaticRuleCount();
        const staticRulesMaximumCount = staticRulesEnabledCount + availableStaticRulesCount;

        // FIXME: consider this numbers to be returned by the TSWebExtension -> AdGuard API
        return {
            userRulesEnabledCount: ConfigurationResultService.getUserRulesEnabledCount(result),
            userRulesMaximumCount: ConfigurationResultService.getUserRulesMaximumCount(result),
            userRulesRegexpsEnabledCount: ConfigurationResultService.getUserRulesRegexpsEnabledCount(result),
            userRulesRegexpsMaximumCount: ConfigurationResultService.getUserRulesRegexpsMaximumCount(result),
            staticFiltersEnabledCount: ConfigurationResultService.getStaticEnabledFiltersCount(),
            staticFiltersMaximumCount: MAX_NUMBER_OF_ENABLED_STATIC_RULESETS,
            staticRulesEnabledCount,
            staticRulesMaximumCount,
            staticRulesRegexpsEnabledCount: this.getStaticRulesRegexpsCount(result, filters),
            staticRulesRegexpsMaxCount: MAX_NUMBER_OF_REGEX_RULES,
        };
    }

    // FIXME docs
    /**
     *
     * @param result
     */
    set(result: ConfigurationResult) {
        this.configurationResultApi.set(result);
    }
}

export const configurationResultService = new ConfigurationResultService();
