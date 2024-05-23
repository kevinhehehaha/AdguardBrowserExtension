import React from 'react';

import { reactTranslator } from '../../../../../common/translators/reactTranslator';

type WarningProps = {
    nowEnabled: string,
    wasEnabled: string,
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
            <div className="warning">
                <div className="title">
                    {reactTranslator.getMessage('options_limits_warning_title')}
                </div>
                <div className="item">
                    <div className="title">
                        {reactTranslator.getMessage('options_rule_limits_warning_explanation_title')}
                    </div>
                    <div className="description">
                        {reactTranslator.getMessage('options_rule_limits_warning_explanation_description')}
                    </div>
                </div>
                <div className="item">
                    <div className="title">
                        {reactTranslator.getMessage('options_rule_limits_warning_enabled_before_title')}
                    </div>
                    <div className="description">
                        {wasEnabled}
                    </div>
                </div>
                <div className="item">
                    <div className="title">
                        {reactTranslator.getMessage('options_rule_limits_warning_enabled_now_title')}
                    </div>
                    <div className="description">
                        {nowEnabled}
                    </div>
                </div>
                <div className="item">
                    <div className="title">
                        {reactTranslator.getMessage('options_rule_limits_warning_actions_title')}
                    </div>
                    <div className="description">
                        <div className="option">
                            {reactTranslator.getMessage('options_rule_limits_warning_actions_delete_filters')}
                        </div>
                        <div className="option">
                            {reactTranslator.getMessage('options_rule_limits_warning_actions_install_app')}
                        </div>
                        <div className="option">
                            {reactTranslator.getMessage('options_rule_limits_warning_actions_close_warning')}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};
