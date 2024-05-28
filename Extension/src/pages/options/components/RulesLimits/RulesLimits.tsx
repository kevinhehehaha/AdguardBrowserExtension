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
import { translator } from '../../../../common/translators/translator';
import { rootStore } from '../../stores/RootStore';
import { type IRulesLimits } from '../../../../background/services/rules-limits/mv3/rules-limits';
import { messenger } from '../../../services/messenger';
import { MessageType } from '../../../../common/messages';

import { Warning } from './Warning';

import './rules-limits.pcss';

export const RulesLimits = observer(() => {
    const { settingsStore } = useContext(rootStore);

    useEffect(() => {
        settingsStore.getRulesLimits();
    }, [settingsStore]);

    const rulesLimits = settingsStore.rulesLimits as IRulesLimits;

    const actuallyEnabledFilterNames = rulesLimits.actuallyEnabledFilters.map((filterId) => {
        return settingsStore.filters.find(f => f.filterId === filterId)?.name;
    });

    const expectedEnabledFilterNames = rulesLimits.expectedEnabledFilters.map((filterId) => {
        return settingsStore.filters.find(f => f.filterId === filterId)?.name;
    });

    const showWarning = rulesLimits.expectedEnabledFilters.length > 0;

    const onClickReactivateFilters = async () => {
        // FIXME enable loader
        await messenger.sendMessage(MessageType.RestoreFilters);
        await settingsStore.getRulesLimits();
        // FIXME disable loader
    };

    const onClickCloseWarning = async () => {
        // FIXME enable loader
        await messenger.sendMessage(MessageType.ClearRulesLimitsWarning);
        await settingsStore.getRulesLimits();
        // FIXME disable loader
    };

    return (
        <SettingsSection
            title={translator.getMessage('options_rule_limits')}
            description={(
                <>
                    <div>{translator.getMessage('options_rule_limits_description')}</div>
                    <div className="title__desc--additional">
                        <a
                            target="_blank"
                            rel="noreferrer"
                            // FIXME: use Forward.get() for the url
                            // FIXME: update href
                            href="https://example.com"
                            className="title__desc--additional-link"
                        >
                            {translator.getMessage('options_rule_limits_description_link')}
                        </a>
                    </div>
                </>
            )}
        >
            {showWarning && (
                <Warning
                    actuallyEnabledFilterNames={actuallyEnabledFilterNames.join(', ')}
                    expectedEnabledFilterNames={expectedEnabledFilterNames.join(', ')}
                    onClickReactivateFilters={onClickReactivateFilters}
                    onClickCloseWarning={onClickCloseWarning}
                />
            )}
            <div className="rules-limits">
                <div className="rules-limits__section">
                    <div
                        className="rules-limits__section-title"
                    >
                        {translator.getMessage('options_rule_limits_dynamic')}
                    </div>
                    <div className="rules-limits__group">
                        <div className="rules-limits__text--gray">
                            {translator.getMessage('options_rule_limits_dynamic_user_rules')}
                        </div>
                        <div className="rules-limits__group-limits rules-limits__text--orange">
                            {reactTranslator.getMessage('options_rule_limits_numbers', {
                                current: rulesLimits.userRulesEnabledCount,
                                maximum: rulesLimits.userRulesMaximumCount,
                            })}
                        </div>
                    </div>
                    <div className="rules-limits__group">
                        <div className="rules-limits__text--gray">
                            {translator.getMessage('options_rule_limits_dynamic_regex')}
                        </div>
                        <div className="rules-limits__group-limits rules-limits__text--orange">
                            {reactTranslator.getMessage('options_rule_limits_numbers', {
                                current: rulesLimits.userRulesRegexpsEnabledCount,
                                maximum: rulesLimits.userRulesRegexpsMaximumCount,
                            })}
                        </div>
                    </div>
                </div>
                <div className="rules-limits__section">
                    <div
                        className="rules-limits__section-title"
                    >
                        {translator.getMessage('options_rule_limits_static_rulesets')}
                    </div>
                    <div className="rules-limits__group">
                        <div className="rules-limits__text--gray">
                            {translator.getMessage('options_rule_limits_static_rulesets_builtin')}
                        </div>
                        <div className="rules-limits__group-limits rules-limits__text--green">
                            {reactTranslator.getMessage('options_rule_limits_numbers', {
                                current: rulesLimits.staticFiltersEnabledCount,
                                maximum: rulesLimits.staticFiltersMaximumCount,
                            })}
                        </div>
                    </div>
                </div>
                <div className="rules-limits__section">
                    <div
                        className="rules-limits__section-title"
                    >
                        {translator.getMessage('options_rule_limits_static_rules')}
                    </div>
                    <div className="rules-limits__group">
                        <div className="rules-limits__text--gray">
                            {translator.getMessage('options_rule_limits_static_rules_all')}
                        </div>
                        <div className="rules-limits__group-limits rules-limits__text--orange">
                            {reactTranslator.getMessage('options_rule_limits_numbers', {
                                current: rulesLimits.staticRulesEnabledCount,
                                maximum: rulesLimits.staticRulesMaximumCount,
                            })}
                        </div>
                    </div>
                    <div className="rules-limits__group">
                        <div className="rules-limits__text--gray">
                            {translator.getMessage('options_rule_limits_static_rules_regex')}
                        </div>
                        <div className="rules-limits__group-limits rules-limits__text--orange">
                            {reactTranslator.getMessage('options_rule_limits_numbers', {
                                current: rulesLimits.staticRulesRegexpsEnabledCount,
                                maximum: rulesLimits.staticRulesRegexpsMaxCount,
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </SettingsSection>
    );
});
