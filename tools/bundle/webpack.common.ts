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

import path from 'path';

import HtmlWebpackPlugin from 'html-webpack-plugin';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import { CleanWebpackPlugin } from 'clean-webpack-plugin';
import { Configuration, DefinePlugin } from 'webpack';

import {
    BUILD_PATH,
    Env,
    Browser,
    BUILD_ENV,
    BrowserConfig,
} from '../constants';
import { getEnvConf, updateLocalesMSGName } from '../helpers';
import {
    WEB_ACCESSIBLE_RESOURCES_OUTPUT,
    SUBSCRIBE_OUTPUT,
    CONTENT_SCRIPT_START_OUTPUT,
    CONTENT_SCRIPT_END_OUTPUT,
    OPTIONS_OUTPUT,
    POST_INSTALL_OUTPUT,
    FULLSCREEN_USER_RULES_OUTPUT,
    SAFEBROWSING_OUTPUT,
    DOCUMENT_BLOCK_OUTPUT,
    POPUP_OUTPUT,
    THANKYOU_OUTPUT,
    EDITOR_OUTPUT,
    REACT_VENDOR_OUTPUT,
    MOBX_VENDOR_OUTPUT,
    XSTATE_VENDOR_OUTPUT,
    ASSISTANT_INJECT_OUTPUT,
    TSURLFILTER_VENDOR_OUTPUT,
    TSWEBEXTENSION_VENDOR_OUTPUT,
    FILTERING_LOG_OUTPUT,
} from '../../constants';

import { htmlTemplatePluginCommonOptions } from './common-constants';

const config = getEnvConf(BUILD_ENV);

const OPTIONS_PATH = path.resolve(__dirname, '../../Extension/pages/options');
const POPUP_PATH = path.resolve(__dirname, '../../Extension/pages/popup');
const FILTERING_LOG_PATH = path.resolve(__dirname, '../../Extension/pages/filtering-log');
const POST_INSTALL_PATH = path.resolve(__dirname, '../../Extension/pages/post-install');
const CONTENT_SCRIPT_START_PATH = path.resolve(__dirname, '../../Extension/pages/content-script-start');
const ASSISTANT_INJECT_PATH = path.resolve(__dirname, '../../Extension/pages/assistant-inject');
const CONTENT_SCRIPT_END_PATH = path.resolve(__dirname, '../../Extension/pages/content-script-end');
const SUBSCRIBE_PATH = path.resolve(__dirname, '../../Extension/pages/subscribe');
const THANKYOU_PATH = path.resolve(__dirname, '../../Extension/pages/thankyou');
const FULLSCREEN_USER_RULES_PATH = path.resolve(__dirname, '../../Extension/pages/fullscreen-user-rules');
const SAFEBROWSING_PATH = path.resolve(__dirname, '../../Extension/pages/safebrowsing');
const AD_BLOCKED_PATH = path.resolve(__dirname, '../../Extension/pages/ad-blocked');
const EDITOR_PATH = path.resolve(__dirname, '../../Extension/src/pages/common/components/Editor');

const OUTPUT_PATH = config.outputPath;

export const genCommonConfig = (browserConfig: BrowserConfig): Configuration => {
    const isDev = process.env.BUILD_ENV === Env.Dev;
    return {
        mode: config.mode,
        target: 'web',
        optimization: {
            minimize: false,
            runtimeChunk: 'single',
        },
        cache: isDev,
        devtool: isDev ? 'eval-source-map' : false, // FIXME check how it will work with mv3
        entry: {
            [OPTIONS_OUTPUT]: {
                import: OPTIONS_PATH,
                dependOn: [
                    REACT_VENDOR_OUTPUT,
                    MOBX_VENDOR_OUTPUT,
                    XSTATE_VENDOR_OUTPUT,
                    EDITOR_OUTPUT,
                ],
            },
            [POPUP_OUTPUT]: {
                import: POPUP_PATH,
                dependOn: [
                    REACT_VENDOR_OUTPUT,
                    MOBX_VENDOR_OUTPUT,
                ],
            },
            [FILTERING_LOG_OUTPUT]: {
                import: FILTERING_LOG_PATH,
                dependOn: [
                    TSURLFILTER_VENDOR_OUTPUT,
                    TSWEBEXTENSION_VENDOR_OUTPUT,
                    REACT_VENDOR_OUTPUT,
                    MOBX_VENDOR_OUTPUT,
                    XSTATE_VENDOR_OUTPUT,
                ],
            },
            [POST_INSTALL_OUTPUT]: {
                import: POST_INSTALL_PATH,
                runtime: false,
            },
            [CONTENT_SCRIPT_START_OUTPUT]: {
                import: CONTENT_SCRIPT_START_PATH,
                runtime: false,
            },
            [ASSISTANT_INJECT_OUTPUT]: {
                import: ASSISTANT_INJECT_PATH,
                runtime: false,
            },
            [CONTENT_SCRIPT_END_OUTPUT]: {
                import: CONTENT_SCRIPT_END_PATH,
                runtime: false,
            },
            [SUBSCRIBE_OUTPUT]: {
                import: SUBSCRIBE_PATH,
                runtime: false,
            },
            [THANKYOU_OUTPUT]: {
                import: THANKYOU_PATH,
                runtime: false,
            },
            [FULLSCREEN_USER_RULES_OUTPUT]: {
                import: FULLSCREEN_USER_RULES_PATH,
                dependOn: [
                    REACT_VENDOR_OUTPUT,
                    MOBX_VENDOR_OUTPUT,
                    XSTATE_VENDOR_OUTPUT,
                    EDITOR_OUTPUT,
                ],
            },
            [SAFEBROWSING_OUTPUT]: {
                import: SAFEBROWSING_PATH,
                dependOn: [
                    REACT_VENDOR_OUTPUT,
                ],
            },
            [DOCUMENT_BLOCK_OUTPUT]: {
                import: AD_BLOCKED_PATH,
                dependOn: [
                    REACT_VENDOR_OUTPUT,
                ],
            },
            [EDITOR_OUTPUT]: {
                import: EDITOR_PATH,
                dependOn: [
                    REACT_VENDOR_OUTPUT,
                ],
            },
            [REACT_VENDOR_OUTPUT]: ['react', 'react-dom'],
            [MOBX_VENDOR_OUTPUT]: ['mobx'],
            [XSTATE_VENDOR_OUTPUT]: ['xstate'],
            [TSURLFILTER_VENDOR_OUTPUT]: ['@adguard/tsurlfilter'],
            [TSWEBEXTENSION_VENDOR_OUTPUT]: {
                import: '@adguard/tswebextension',
                dependOn: [
                    TSURLFILTER_VENDOR_OUTPUT,
                ],
            },
        },
        output: {
            path: path.join(BUILD_PATH, OUTPUT_PATH),
            filename: '[name].js',
        },
        resolve: {
            fallback: {
                crypto: require.resolve('crypto-browserify'),
                stream: require.resolve('stream-browserify'),
            },
            extensions: ['.*', '.js', '.jsx', '.ts', '.tsx'],
            symlinks: false,
        },
        module: {
            rules: [
                {
                    include: [
                        path.resolve(__dirname, '../../Extension/src/background/filter/request-filter.js'),
                        path.resolve(__dirname, '../../Extension/pages/content-script-end/index.js'),
                    ],
                    use: [{
                        loader: 'preprocess-loader',
                        options: {
                            devtools: browserConfig.devtools,
                            ppOptions: {
                                type: 'js',
                            },
                        },
                    }],
                },
                /*
                 * Prevent browser console warnings with source map issue
                 * by deleting source map url comments in production build
                 */
                {
                    test: /\.(js|ts)x?$/,
                    enforce: 'pre',
                    use: [
                        {
                            loader: 'source-map-loader',
                            options: {
                                filterSourceMappingUrl: () => (isDev ? 'skip' : 'remove'),
                            },
                        },
                    ],
                },
                {
                    test: /\.(js|ts)x?$/,
                    exclude: /node_modules\/(?!@adguard\/tswebextension)/,
                    use: [
                        {
                            loader: 'swc-loader',
                            options: {
                                env: {
                                    targets: {
                                        chrome: 79,
                                        firefox: 78,
                                        opera: 66,
                                    },
                                    mode: 'usage',
                                    coreJs: '3.32',
                                },
                            },
                        },
                    ],
                },
                {
                    test: /\.(css|pcss)$/,
                    use: [
                        'style-loader',
                        {
                            loader: 'css-loader',
                            options: {
                                importLoaders: 1,
                                url: false,
                            },
                        },
                        'postcss-loader',
                    ],
                },
                {
                    test: /\.(woff|woff2|eot|ttf|otf)$/,
                    type: 'asset/resource',
                },
            ],
        },
        plugins: [
            new CleanWebpackPlugin(),
            new HtmlWebpackPlugin({
                ...htmlTemplatePluginCommonOptions,
                template: path.join(OPTIONS_PATH, 'index.html'),
                filename: `${OPTIONS_OUTPUT}.html`,
                chunks: [
                    TSURLFILTER_VENDOR_OUTPUT,
                    REACT_VENDOR_OUTPUT,
                    MOBX_VENDOR_OUTPUT,
                    XSTATE_VENDOR_OUTPUT,
                    EDITOR_OUTPUT,
                    OPTIONS_OUTPUT,
                ],
            }),
            new HtmlWebpackPlugin({
                ...htmlTemplatePluginCommonOptions,
                template: path.join(POPUP_PATH, 'index.html'),
                filename: `${POPUP_OUTPUT}.html`,
                chunks: [REACT_VENDOR_OUTPUT, MOBX_VENDOR_OUTPUT, POPUP_OUTPUT],
            }),
            new HtmlWebpackPlugin({
                ...htmlTemplatePluginCommonOptions,
                template: path.join(POST_INSTALL_PATH, 'index.html'),
                filename: `${POST_INSTALL_OUTPUT}.html`,
                chunks: [POST_INSTALL_OUTPUT],
            }),
            new HtmlWebpackPlugin({
                ...htmlTemplatePluginCommonOptions,
                template: path.join(FILTERING_LOG_PATH, 'index.html'),
                filename: `${FILTERING_LOG_OUTPUT}.html`,
                chunks: [
                    TSURLFILTER_VENDOR_OUTPUT,
                    TSWEBEXTENSION_VENDOR_OUTPUT,
                    REACT_VENDOR_OUTPUT,
                    MOBX_VENDOR_OUTPUT,
                    XSTATE_VENDOR_OUTPUT,
                    FILTERING_LOG_OUTPUT,
                ],
            }),
            new HtmlWebpackPlugin({
                ...htmlTemplatePluginCommonOptions,
                template: path.join(FULLSCREEN_USER_RULES_PATH, 'index.html'),
                filename: `${FULLSCREEN_USER_RULES_OUTPUT}.html`,
                chunks: [
                    REACT_VENDOR_OUTPUT,
                    MOBX_VENDOR_OUTPUT,
                    XSTATE_VENDOR_OUTPUT,
                    EDITOR_OUTPUT,
                    FULLSCREEN_USER_RULES_OUTPUT,
                ],
            }),
            new HtmlWebpackPlugin({
                ...htmlTemplatePluginCommonOptions,
                template: path.join(AD_BLOCKED_PATH, 'index.html'),
                filename: `${DOCUMENT_BLOCK_OUTPUT}.html`,
                chunks: [REACT_VENDOR_OUTPUT, DOCUMENT_BLOCK_OUTPUT],
            }),
            new HtmlWebpackPlugin({
                ...htmlTemplatePluginCommonOptions,
                template: path.join(SAFEBROWSING_PATH, 'index.html'),
                filename: `${SAFEBROWSING_OUTPUT}.html`,
                chunks: [REACT_VENDOR_OUTPUT, SAFEBROWSING_OUTPUT],
            }),
            new CopyWebpackPlugin({
                patterns: [
                    {
                        context: 'Extension',
                        from: 'assets',
                        to: 'assets',
                    },
                    {
                        context: 'Extension',
                        from: '_locales',
                        to: '_locales',
                        transform: (content) => {
                            return updateLocalesMSGName(content, BUILD_ENV, browserConfig.browser);
                        },
                    },
                    {
                        context: 'Extension',
                        from: 'web-accessible-resources',
                        to: WEB_ACCESSIBLE_RESOURCES_OUTPUT,
                    },
                ],
            }),
            new DefinePlugin({
                // We are doing stricter JS rule checking for Firefox AMO, so we
                // need to determine if the Firefox browser is AMO or not.
                // TODO consider making this variable to be less common used
                //  (e.g., make it to be __IS_FIREFOX_AMO__ instead of IS_FIREFOX_AMO)
                IS_FIREFOX_AMO: browserConfig.browser === Browser.FirefoxAmo,
                // TODO consider making this variable to be less common used
                //  (e.g., make it to be __IS_RELEASE__ instead of IS_RELEASE)
                IS_RELEASE: process.env.BUILD_ENV === Env.Release,
                IS_BETA: process.env.BUILD_ENV === Env.Beta,
                __IS_MV3__: browserConfig.browser === Browser.ChromeMv3,
            }),
        ],
    };
};