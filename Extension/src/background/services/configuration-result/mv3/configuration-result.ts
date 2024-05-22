import { configurationResultApi } from '../../../api/configuration-result/mv3/configuration-result';
import { ConfigurationResult } from '@adguard/tswebextension/dist/types/src/lib/mv3/background';
import { messageHandler } from '../../../message-handler';
import { MessageType } from '../../../../common/messages';
import {
    TooManyRegexpRulesError,
    TooManyRulesError,
} from '@adguard/tswebextension/mv3';
import browser from 'webextension-polyfill';
import { FiltersApi } from '../../../api';

const {
    MAX_NUMBER_OF_DYNAMIC_AND_SESSION_RULES,
    MAX_NUMBER_OF_REGEX_RULES,
    MAX_NUMBER_OF_ENABLED_STATIC_RULESETS,
} = browser.declarativeNetRequest;

// FIXME docs
export class ConfigurationResultService {
    configurationResultApi = configurationResultApi;

    // FIXME: notify options page if limits has changed
    init() {
        messageHandler.addListener(MessageType.GetRulesLimits, this.onGetRulesLimits.bind(this));
    }

    onGetRulesLimits() {
        const result = this.configurationResultApi.get();
        if (!result) {
            throw new Error('result should be ready');
        }

        const {
            dynamicRules: {
                ruleSet,
                limitations
            }
        } = result;

        const declarativeRulesCount = ruleSet.getRulesCount();
        const regexpsCount = ruleSet.getRegexpRulesCount();

        const rulesLimitExceedErr = limitations
            .find((e) => e instanceof TooManyRulesError);
        const regexpRulesLimitExceedErr = limitations
            .find((e) => e instanceof TooManyRegexpRulesError);

        // FIXME: consider this numbers to be returned by the TSWebExtension -> AdGuard API
        return {
            userRulesEnabledCount: rulesLimitExceedErr?.numberOfMaximumRules || declarativeRulesCount,
            userRulesMaximumCount: rulesLimitExceedErr?.numberOfMaximumRules || MAX_NUMBER_OF_DYNAMIC_AND_SESSION_RULES,
            userRulesRegexpsEnabledCount: regexpsCount + (regexpRulesLimitExceedErr?.excludedRulesIds.length || 0),
            userRulesRegexpsMaximumCount: regexpRulesLimitExceedErr?.numberOfMaximumRules || MAX_NUMBER_OF_REGEX_RULES,
            staticFiltersEnabledCount: FiltersApi.getEnabledFilters().filter(f =);
            staticFiltersMaximumCount: MAX_NUMBER_OF_ENABLED_STATIC_RULESETS,
        }
    }

    // FIXME docs
    set(result: ConfigurationResult) {
        this.configurationResultApi.set(result);
    }
}

export const configurationResultService = new ConfigurationResultService();
