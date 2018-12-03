/**
 * This file is part of Adguard Browser Extension (https://github.com/AdguardTeam/AdguardBrowserExtension).
 *
 * Adguard Browser Extension is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * Adguard Browser Extension is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with Adguard Browser Extension.  If not, see <http://www.gnu.org/licenses/>.
 */

/* global adguard */

adguard.stealthService = (function (adguard) {

    'use strict';

    /**
     * Search engines regexps
     *
     * @type {[*]}
     */
    const SEARCH_ENGINES = [
        /https?:\/\/(www\.)?google\./i,
        /https?:\/\/(www\.)?yandex\./i,
        /https?:\/\/(www\.)?bing\./i,
        /https?:\/\/(www\.)?yahoo\./i,
        /https?:\/\/(www\.)?go\.mail\.ru/i,
        /https?:\/\/(www\.)?ask\.com/i,
        /https?:\/\/(www\.)?aol\.com/i,
        /https?:\/\/(www\.)?baidu\.com/i,
        /https?:\/\/(www\.)?seznam\.cz/i
    ];

    /**
     * Headers
     */
    const HEADERS = {
        USER_AGENT: 'User-Agent',
        REFERRER: 'Referer',
        ETAG: 'ETag',
        X_CLIENT_DATA: 'X-Client-Data',
        DO_NOT_TRACK: 'DNT'
    };

    /**
     * Header values
     */
    const HEADER_VALUES = {
        PRAGMA: {
            name: 'Pragma',
            value: 'no-cache'
        },
        DO_NOT_TRACK: {
            name: 'DNT',
            value: '1'
        },
        REFERRER: {
            name: 'Referer',
            value: 'https://adguard.com/referrer.html'
        }
    };

    /**
     * Is url search engine
     *
     * @param url
     * @returns {boolean}
     */
    const isSearchEngine = function (url) {
        if (!url) {
            return false;
        }

        for (let i = 0; i < SEARCH_ENGINES.length; i++) {
            if (SEARCH_ENGINES[i].test(url)) {
                return true;
            }
        }

        return false;
    };

    /**
     * Header value
     *
     * @param headers
     * @param headerName
     * @returns {string}
     */
    const getHeaderValue = function (headers, headerName) {
        if (!headers) {
            return '';
        }

        for (let i = 0; i < headers.length; i++) {
            if (headers[i].name === headerName) {
                return headers[i].value;
            }
        }

        return '';
    };

    /**
     * Replaces header value in headers
     *
     * @param headers
     * @param header
     * @param appendIfNotExist
     */
    const replaceHeader = function (headers, header, appendIfNotExist) {
        let headerFound = false;
        for (let i = 0; i < headers.length; i++) {
            if (headers[i].name === header.name) {
                headers[i] = header;
                headerFound = true;
            }
        }

        if (!headerFound && appendIfNotExist) {
            headers.push(header);
        }
    };

    /**
     * Removes header from headers by name
     *
     * @param headers
     * @param headerName
     */
    const removeHeader = function (headers, headerName) {
        if (headers) {
            for (let i = headers.length - 1; i >= 0; i--) {
                if (headers[i].name === headerName) {
                    headers.splice(i, 1);
                }
            }
        }
    };

    /**
     * Generates rule removing cookies
     *
     * @param maxAge
     */
    const generateRemoveRule = function (maxAge) {
        const maxAgeOption = maxAge > 0 ? `;maxAge=${maxAge * 60}` : '';
        return new adguard.rules.UrlFilterRule(`$cookie=/.+/${maxAgeOption}`);
    };

    /**
     * Adds stealth event to filtering log
     *
     * @param {Object} tab
     * @param {Object} rule
     * @param {Object?} headerName
     * @param {Object?} headerValue
     * @param {Object?} requestType
     * @param {Object?} thirdParty
     */
    const addStealthLogEvent = (tab, rule, headerName, headerValue, requestUrl, thirdParty) => {
        adguard.filteringLog.addStealthEvent(tab, rule, headerName, headerValue, adguard.RequestTypes.STEALTH, thirdParty, requestUrl);
    };

    /**
     * Processes request headers
     *
     * @param {string} requestId Request identifier
     * @param {Array} requestHeaders Request headers
     * @return {boolean} True if headers were modified
     */
    const processRequestHeaders = function (requestId, requestHeaders) {

        const context = adguard.requestContextStorage.get(requestId);
        if (!context) {
            return false;
        }

        const tab = context.tab;
        const requestUrl = context.requestUrl;
        const requestType = context.requestType;

        adguard.console.debug('Stealth service processing request headers for {0}', requestUrl);

        if (adguard.frames.isTabWhiteListed(tab) || adguard.frames.isTabProtectionDisabled(tab)) {
            adguard.console.debug('Tab whitelisted or protection disabled');
            return false;
        }

        let sourceUrl = adguard.frames.getMainFrameUrl(tab);
        if (!sourceUrl) {
            //frame wasn't recorded in onBeforeRequest event
            adguard.console.debug('Frame was not recorded in onBeforeRequest event');
            return false;
        }

        if (requestUrl === sourceUrl) {
            sourceUrl = getHeaderValue(requestHeaders, HEADERS.REFERRER);
        }

        const whiteListRule = adguard.antiBannerService.getRequestFilter().findWhiteListRule(requestUrl, sourceUrl, requestType);
        if (whiteListRule && whiteListRule.isDocumentWhiteList()) {
            adguard.console.debug('Whitelist rule found');
            return false;
        }

        const thirdParty = adguard.utils.url.isThirdPartyRequest(requestUrl, sourceUrl);
        const stealthWhiteListRule = findStealthWhitelistRule(requestUrl, sourceUrl, requestType);
        if (stealthWhiteListRule) {
            adguard.console.debug('Whitelist stealth rule found');
            addStealthLogEvent(tab, stealthWhiteListRule, null, null, sourceUrl, thirdParty);
            return false;
        }

        let headersModified = false;

        let isMainFrame = requestType === "DOCUMENT";

        // Remove referrer for third-party requests
        const hideReferrer = adguard.settings.getProperty(adguard.settings.HIDE_REFERRER);
        if (thirdParty && hideReferrer) {
            adguard.console.debug('Remove referrer for third-party requests');
            replaceHeader(requestHeaders, HEADER_VALUES.REFERRER);
            addStealthLogEvent(tab, null, HEADER_VALUES.REFERRER.name, HEADER_VALUES.REFERRER.value, sourceUrl, thirdParty);
            headersModified = true;
        }

        // Hide referrer in case of search engine is referrer
        const hideSearchQueries = adguard.settings.getProperty(adguard.settings.HIDE_SEARCH_QUERIES);
        if (hideSearchQueries && isMainFrame && thirdParty && isSearchEngine(sourceUrl)) {
            adguard.console.debug('Hide referrer in case of search engine is referrer');
            replaceHeader(requestHeaders, HEADER_VALUES.REFERRER);
            addStealthLogEvent(tab, null, HEADER_VALUES.REFERRER.name, HEADER_VALUES.REFERRER.value, sourceUrl, thirdParty);
            headersModified = true;
        }

        // Remove X-Client-Data header
        const blockChromeClientData = adguard.settings.getProperty(adguard.settings.BLOCK_CHROME_CLIENT_DATA);
        if (blockChromeClientData) {
            adguard.console.debug('Remove X-Client-Data header');
            removeHeader(requestHeaders, HEADERS.X_CLIENT_DATA);
            addStealthLogEvent(tab, null, HEADERS.X_CLIENT_DATA, null, sourceUrl, thirdParty);
            headersModified = true;
        }

        // Adding Do-Not-Track (DNT) header
        const sendDoNotTrack = adguard.settings.getProperty(adguard.settings.SEND_DO_NOT_TRACK);
        if (sendDoNotTrack) {
            adguard.console.debug('Adding Do-Not-Track (DNT) header');
            requestHeaders.push(HEADER_VALUES.DO_NOT_TRACK);
            addStealthLogEvent(tab, null, HEADER_VALUES.DO_NOT_TRACK.name, HEADER_VALUES.DO_NOT_TRACK.value, sourceUrl, thirdParty);
            headersModified = true;
        }

        adguard.console.debug('Stealth service processed request headers for {0}', requestUrl);

        return headersModified;
    };

    /**
     * Returns synthetic set of rules matching the specified request
     *
     * @param requestUrl
     * @param referrerUrl
     * @param requestType
     */
    const getCookieRules = function (requestUrl, referrerUrl, requestType) {

        const result = [];

        adguard.console.debug('Stealth service lookup cookie rules for {0}', requestUrl);

        // Remove cookie header for first-party requests
        const blockCookies = adguard.settings.getProperty(adguard.settings.SELF_DESTRUCT_FIRST_PARTY_COOKIES);
        if (blockCookies) {
            result.push(generateRemoveRule(adguard.settings.getProperty(adguard.settings.SELF_DESTRUCT_FIRST_PARTY_COOKIES_TIME)));
        }

        const blockThirdPartyCookies = adguard.settings.getProperty(adguard.settings.SELF_DESTRUCT_THIRD_PARTY_COOKIES);
        if (!blockThirdPartyCookies) {
            adguard.console.debug('Stealth service processed lookup cookie rules for {0}', requestUrl);
            return result;
        }

        const thirdParty = adguard.utils.url.isThirdPartyRequest(requestUrl, referrerUrl);
        let isMainFrame = requestType === "DOCUMENT";

        // Remove cookie header for third-party requests
        if (thirdParty && !isMainFrame) {
            result.push(generateRemoveRule(adguard.settings.getProperty(adguard.settings.SELF_DESTRUCT_THIRD_PARTY_COOKIES_TIME)));
        }

        adguard.console.debug('Stealth service processed lookup cookie rules for {0}', requestUrl);

        return result;
    };

    /**
     * Checks if tab if whitelisted for stealth
     *
     * @param requestUrl
     * @param referrerUrl
     * @param requestType
     * @returns whitelist rule if found
     */
    const findStealthWhitelistRule = function (requestUrl, referrerUrl, requestType) {
        const stealthDocumentWhitelistRule = adguard.requestFilter.findStealthWhiteListRule(referrerUrl, referrerUrl, requestType);
        if (stealthDocumentWhitelistRule && stealthDocumentWhitelistRule.isDocumentWhiteList()) {
            adguard.console.debug('Stealth document whitelist rule found.');
            return stealthDocumentWhitelistRule;
        }

        const stealthWhiteListRule = adguard.requestFilter.findStealthWhiteListRule(requestUrl, referrerUrl, requestType);
        if (stealthWhiteListRule) {
            adguard.console.debug('Stealth whitelist rule found.');
            return stealthWhiteListRule;
        }

        return null;
    };

    /**
     * Updates browser privacy.network settings depending on blocking WebRTC or not
     */
    const handleWebRTCDisabled = () => {

        const resetLastError = () => {
            const ex = browser.runtime.lastError;
            if (ex) {
                adguard.console.error('Error updating privacy.network settings: {0}', ex);
            }
        };

        const webRTCDisabled = adguard.settings.isWebRTCDisabled();

        // Deprecated since Chrome 48
        if (typeof browser.privacy.network.webRTCMultipleRoutesEnabled === 'object') {
            if (webRTCDisabled) {
                browser.privacy.network.webRTCMultipleRoutesEnabled.set({
                    value: false,
                    scope: 'regular',
                }, resetLastError);
            } else {
                browser.privacy.network.webRTCMultipleRoutesEnabled.clear({
                    scope: 'regular',
                }, resetLastError);
            }
        }

        // Since chromium 48
        if (typeof browser.privacy.network.webRTCIPHandlingPolicy === 'object') {
            if (webRTCDisabled) {
                browser.privacy.network.webRTCIPHandlingPolicy.set({
                    value: 'disable_non_proxied_udp',
                    scope: 'regular',
                }, resetLastError);
            } else {
                browser.privacy.network.webRTCIPHandlingPolicy.clear({
                    scope: 'regular',
                }, resetLastError);
            }
        }

        if (typeof browser.privacy.network.peerConnectionEnabled === 'object') {
            if (webRTCDisabled) {
                browser.privacy.network.peerConnectionEnabled.set({
                    value: false,
                    scope: 'regular',
                }, resetLastError);
            } else {
                browser.privacy.network.peerConnectionEnabled.clear({
                    scope: 'regular',
                }, resetLastError);
            }
        }
    };

    adguard.settings.onUpdated.addListener(function (setting) {
        if (setting === adguard.settings.BLOCK_WEBRTC) {
            handleWebRTCDisabled();
        }
    });

    handleWebRTCDisabled();

    return {
        processRequestHeaders: processRequestHeaders,
        getCookieRules: getCookieRules,
        findStealthWhitelistRule: findStealthWhitelistRule
    };

})(adguard);
