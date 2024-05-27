// TODO figure out how to fix the eslint errors
/* eslint-disable jsx-a11y/anchor-is-valid,jsx-a11y/click-events-have-key-events,jsx-a11y/no-static-element-interactions */
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

import React from 'react';

import { reactTranslator } from '../../../../../common/translators/reactTranslator';
import { translator } from '../../../../../common/translators/translator';
import { Icon } from '../../../../common/components/ui/Icon';

type WarningProps = {
    nowEnabled: number[],
    wasEnabled: number[],
    onClickReactivateFilters: () => void,
    onClickCloseWarning: () => void,
};

export const Warning = ({
    nowEnabled,
    wasEnabled,
    onClickReactivateFilters,
    onClickCloseWarning,
}: WarningProps) => {
    return (
        <>
            <div className="rules-limits rules-limits__warning">
                <div className="rules-limits__warning-title">
                    <Icon
                        id="#info"
                        classname="rules-limits__warning-title--icon"
                    />
                    <div className="rules-limits__warning-title--text">
                        {translator.getMessage('options_rule_limits_warning_title')}
                    </div>
                </div>
                <div className="rules-limits__section">
                    <div className="rules-limits__section-title">
                        {translator.getMessage('options_rule_limits_warning_explanation_title')}
                    </div>
                    <div className="rules-limits__group rules-limits__text--gray">
                        {translator.getMessage('options_rule_limits_warning_explanation_description')}
                    </div>
                </div>
                <div className="rules-limits__section">
                    <div className="rules-limits__section-title">
                        {translator.getMessage('options_rule_limits_warning_enabled_before_title')}
                    </div>
                    <div className="rules-limits__group rules-limits__text--gray">
                        {wasEnabled.join(', ')}
                    </div>
                </div>
                <div className="rules-limits__section">
                    <div className="rules-limits__section-title">
                        {translator.getMessage('options_rule_limits_warning_enabled_now_title')}
                    </div>
                    <div className="rules-limits__group rules-limits__text--gray">
                        {nowEnabled.join(', ')}
                    </div>
                </div>
                <div className="rules-limits__section">
                    <div className="rules-limits__section-title">
                        {translator.getMessage('options_rule_limits_warning_actions_title')}
                    </div>
                    <div className="rules-limits__group rules-limits__text--gray">
                        <div className="rules-limits__group-option">
                            {reactTranslator.getMessage('options_rule_limits_warning_actions_delete_filters', {
                                a: (chunks: string) => (
                                    <a
                                        target="_blank"
                                        rel="noreferrer"
                                        className="rules-limits__group-option-link"
                                        onClick={onClickReactivateFilters}
                                    >
                                        {chunks}
                                    </a>
                                ),
                            })}
                        </div>
                        <div className="rules-limits__group-option">
                            {reactTranslator.getMessage('options_rule_limits_warning_actions_install_app', {
                                a: (chunks: string) => (
                                    <a
                                        target="_blank"
                                        rel="noreferrer"
                                        // FIXME: update href
                                        // FIXME: use Forward.get() for the url
                                        href="https://example.com"
                                        className="rules-limits__group-option-link rules-limits__text--gray"
                                    >
                                        {chunks}
                                    </a>
                                ),
                            })}
                        </div>
                        <div className="rules-limits__group-option">
                            {reactTranslator.getMessage(
                                nowEnabled.length > 0
                                    ? 'options_rule_limits_warning_actions_close_warning_multiple_filters'
                                    : 'options_rule_limits_warning_actions_close_warning_one_filter',
                                {
                                    a: (chunks: string) => {
                                        return (
                                            <a
                                                target="_blank"
                                                rel="noreferrer"
                                                className="rules-limits__group-option-link"
                                                onClick={onClickCloseWarning}
                                            >
                                                {chunks}
                                            </a>
                                        );
                                    },
                                },
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};
