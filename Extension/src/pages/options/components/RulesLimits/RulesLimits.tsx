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

import React, { useContext, useEffect } from 'react';
import { observer } from 'mobx-react';

import { SettingsSection } from '../Settings/SettingsSection';
import { reactTranslator } from '../../../../common/translators/reactTranslator';
import { rootStore } from '../../stores/RootStore';
import { type IRulesLimits } from '../../../../background/services/rules-limits/mv3/rules-limits';

import { Warning } from './Warning';

export const RulesLimits = observer(() => {
    const { settingsStore } = useContext(rootStore);

    useEffect(() => {
        settingsStore.setRulesLimits();
    }, [settingsStore]);

    const rulesLimits = settingsStore.rulesLimits as IRulesLimits;

    const showWarning = rulesLimits.previouslyEnabledFilters.length > 0;

    // FIXME
    const onClickReactivateFilters = () => {
        // eslint-disable-next-line no-console
        console.log('Reactivate filters');
    };

    // FIXME
    const onClickCloseWarning = () => {
        // eslint-disable-next-line no-console
        console.log('Close warning');
    };

    return (
        <SettingsSection
            title={reactTranslator.getMessage('options_rule_limits')}
            description={(
                <>
                    {/* FIXME add this texts to messages */}
                    <div>This extension complies with Manifest V3</div>
                    <div>Learn more about Manifest V3</div>
                </>
            )}
        >
            { showWarning && (
                <Warning
                    nowEnabled={rulesLimits.nowEnabledFilters.join(',')}
                    wasEnabled={rulesLimits.previouslyEnabledFilters.join(',')}
                    onClickReactivateFilters={onClickReactivateFilters}
                    onClickCloseWarning={onClickCloseWarning}
                />
            ) }
            <div className="rules-limits">
                <div className="rules-limits__section">
                    <div
                        className="rules-limits__section-title"
                    >
                        {reactTranslator.getMessage('options_rule_limits_dynamic')}
                    </div>
                    <div className="rules-limits__group">
                        <div className="rules-limits__group-title">
                            {reactTranslator.getMessage('options_rule_limits_dynamic_user_rules')}
                        </div>
                        <div className="rules-limits__group-limits">
                            {reactTranslator.getMessage('options_rule_limits_numbers', {
                                cur: rulesLimits.userRulesEnabledCount,
                                max: rulesLimits.userRulesMaximumCount,
                            })}
                        </div>
                    </div>
                    <div className="rules-limits__group">
                        <div className="rules-limits__group-title">
                            {reactTranslator.getMessage('options_rule_limits_dynamic_regex')}
                        </div>
                        <div className="rules-limits__group-limits">
                            {reactTranslator.getMessage('options_rule_limits_numbers', {
                                cur: rulesLimits.userRulesRegexpsEnabledCount,
                                max: rulesLimits.userRulesRegexpsMaximumCount,
                            })}
                        </div>
                    </div>
                </div>
                <div className="rules-limits__section">
                    <div
                        className="rules-limits__section-title"
                    >
                        {reactTranslator.getMessage('options_rule_limits_static_rulesets')}
                    </div>
                    <div className="rules-limits__group">
                        <div className="rules-limits__group-title">
                            {reactTranslator.getMessage('options_rule_limits_static_rulesets_builtin')}
                        </div>
                        <div className="rules-limits__group-limits">
                            {reactTranslator.getMessage('options_rule_limits_numbers', {
                                cur: rulesLimits.staticFiltersEnabledCount,
                                max: rulesLimits.staticFiltersMaximumCount,
                            })}
                        </div>
                    </div>
                </div>
                <div className="rules-limits__section">
                    <div
                        className="rules-limits__section-title"
                    >
                        {reactTranslator.getMessage('options_rule_limits_static_rules')}
                    </div>
                    <div className="rules-limits__group">
                        <div className="rules-limits__group-title">
                            {reactTranslator.getMessage('options_rule_limits_static_rules_all')}
                        </div>
                        <div className="rules-limits__group-limits">
                            {reactTranslator.getMessage('options_rule_limits_numbers', {
                                cur: rulesLimits.staticRulesEnabledCount,
                                max: rulesLimits.staticRulesMaximumCount,
                            })}
                        </div>
                    </div>
                    <div className="rules-limits__group">
                        <div className="rules-limits__group-title">
                            {reactTranslator.getMessage('options_rule_limits_static_rules_regex')}
                        </div>
                        <div className="rules-limits__group-limits">
                            {reactTranslator.getMessage('options_rule_limits_numbers', {
                                cur: rulesLimits.staticRulesRegexpsEnabledCount,
                                max: rulesLimits.staticRulesRegexpsMaxCount,
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </SettingsSection>
    );
});
