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
import { OPTIONS_PAGE } from '../../../Extension/src/common/constants';

export const chromeMv3Manifest = {
    'manifest_version': 3,
    'action': {
        'default_icon': {
            '19': 'assets/icons/green-19.png',
            '38': 'assets/icons/green-38.png',
        },
        'default_title': '__MSG_name__',
        'default_popup': 'pages/popup.html',
    },
    'background': {
        'service_worker': 'pages/background.js',
    },
    'host_permissions': [
        '<all_urls>',
    ],
    'minimum_chrome_version': '88.0',
    'web_accessible_resources': [
        {
            'resources': ['web-accessible-resources/*'],
            'matches': [
                'http://*/*',
                'https://*/*',
            ],
            'use_dynamic_url': true,
        },
    ],
    'options_page': OPTIONS_PAGE,
    'devtools_page': 'pages/devtools.html',
    'permissions': [
        'tabs',
        'webRequest',
        'webNavigation',
        'storage',
        'unlimitedStorage',
        'contextMenus',
        'cookies',
        'declarativeNetRequest',
        'declarativeNetRequestFeedback',
        'scripting',
        'alarms',
    ],
    'optional_permissions': [
        'privacy',
    ],
};
