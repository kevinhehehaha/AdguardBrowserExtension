import React, { useContext, useEffect } from 'react';

import { SettingsSection } from '../Settings/SettingsSection';
import { reactTranslator } from '../../../../common/translators/reactTranslator';
import { observer } from 'mobx-react';
import { rootStore } from '../../stores/RootStore';

export const RulesLimits = observer(() => {
    const { settingsStore } = useContext(rootStore);

    useEffect(() => {
        settingsStore.setRulesLimits();
    }, []);

    const {
        userRulesEnabledCount,
        userRulesMaximumCount,
        userRulesRegexpsEnabledCount,
        userRulesRegexpsMaximumCount,
        staticFiltersEnabledCount,
        staticFiltersMaximumCount, MAX_NUMBER_OF_ENABLED_STATIC_RULESETS
    } = settingsStore;

    return (
        <SettingsSection
            title={reactTranslator.getMessage('options_rule_limits')}
            description={<>
                <div>This extension complies with Manifest V3</div>
                <div>Learn more about Manifest V3</div>
            </>}
        >
            <div className="rules-limits">
                <div className="rules-limits__section">
                    <div
                        className="rules-limits__section-title">{reactTranslator.getMessage('options_rule_limits_dynamic')}</div>
                    <div className="rules-limits__group">
                        <div className="rules-limits__group-title">
                            {reactTranslator.getMessage('options_rule_limits_dynamic_user_rules')}
                        </div>
                        <div className="rules-limits__group-limits">
                            {reactTranslator.getMessage('options_rule_limits_numbers', {
                                cur: userRulesEnabledCount,
                                max: userRulesMaximumCount,
                            })}
                        </div>
                    </div>
                    <div className="rules-limits__group">
                        <div className="rules-limits__group-title">
                            {reactTranslator.getMessage('options_rule_limits_dynamic_regex')}
                        </div>
                        <div className="rules-limits__group-limits">
                            {reactTranslator.getMessage('options_rule_limits_numbers', {
                                    cur: userRulesRegexpsEnabledCount,
                                    max: userRulesRegexpsMaximumCount,
                                }
                            )}
                        </div>
                    </div>
                </div>
                <div className="rules-limits__section">
                    <div
                        className="rules-limits__section-title">{reactTranslator.getMessage('options_rule_limits_static')}</div>
                    <div className="rules-limits__group">
                        <div className="rules-limits__group-title">
                            {reactTranslator.getMessage('options_rule_limits_static_builtin_filters')}
                        </div>
                        <div className="rules-limits__group-limits">
                            {reactTranslator.getMessage('options_rule_limits_numbers', {
                                cur: 5,
                                max: 10
                            })}
                        </div>
                    </div>
                </div>
                <div className="rules-limits__section">
                    <div className="rules-limits__section-title">Static rules</div>
                    <div className="rules-limits__group">
                        <div className="rules-limits__group-title">
                            Rules from built-in filters. All extensions in your Chrome browser can
                            use 150,000 static rules at once
                        </div>
                        <div className="rules-limits__group-limits">
                            22,000 of 150,000
                        </div>
                    </div>
                    <div className="rules-limits__group">
                        <div className="rules-limits__group-title">
                            Regex rules — included in the above
                        </div>
                        <div className="rules-limits__group-limits">
                            500 of 1000
                        </div>
                    </div>
                </div>
            </div>
        </SettingsSection>
    );
});
