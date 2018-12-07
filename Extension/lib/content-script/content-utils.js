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

/* global contentPage, HTMLDocument */

(function () {
    if (window !== window.top) {
        return;
    }

    if (!(document instanceof HTMLDocument)) {
        return;
    }

    /**
     * On extension startup contentPage is undefined
     */
    if (typeof contentPage === 'undefined') {
        return;
    }

    const MAX_Z_INDEX = '2147483647';

    /**
     * Creates iframe and appends it after target open tag
     * @param target Node where to append iframe with html
     * @param html html string to write inside iframe
     * @returns {HTMLElement} iframe element
     */
    const appendIframe = (target, html) => {
        const iframe = document.createElement('iframe');
        target.insertAdjacentElement('afterbegin', iframe);
        iframe.src = 'about:blank';
        if (navigator.userAgent.indexOf('Edge') > -1) {
            // Edge doesn't allow to write html in iframe srcdoc
            const iframedoc = iframe.contentDocument || iframe.contentWindow.document;
            iframedoc.open();
            iframedoc.write(html);
            iframedoc.close();
        } else {
            iframe.srcdoc = html;
        }
        iframe.style.zIndex = MAX_Z_INDEX;
        return iframe;
    };


    /**
     * Creates div and appends it to the page
     * @param target
     * @param html
     * @returns {any | HTMLElement}
     */
    const appendDiv = (target, html) => {
        const div = document.createElement('div');
        div.innerHTML = html;
        target.insertAdjacentElement('afterbegin', div);
        div.style.zIndex = MAX_Z_INDEX;
        return div;
    };

    /**
     * If isAdguardTab we append div, else we append iframe
     * @param target
     * @param html
     * @param isAdguardTab
     * @returns {HTMLElement}
     */
    const appendAlertElement = (target, html, isAdguardTab) => {
        if (isAdguardTab) {
            return appendDiv(target, html);
        }
        return appendIframe(target, html);
    };

    /**
     * Generates alert html
     * @param {string} title
     * @param {string} text
     * @returns {string}
     */
    const genAlertHtml = (title, text) => {
        let descBlock = '';
        if (text && text.length > 0) {
            descBlock = `<div class="adguard-popup-alert__desc">
                            ${text}
                        </div>`;
        }

        // don't show description text if it is same as title or if it is equal to undefined
        if (title === text || text === 'undefined') {
            descBlock = '';
        }

        return `<div class="adguard-popup-alert">
                    <div class="adguard-popup-alert__title">
                        ${title}
                    </div>
                    ${descBlock}
                </div>`;
    };

    /**
     * Shows alert popup.
     * Popup content is added right to the page content.
     *
     * @param message Message text
     */
    function showAlertPopup(message) {
        const { text, title, isAdguardTab } = message;

        if (!title) {
            return;
        }

        let messages = [];
        if (Array.isArray(text)) {
            messages = text;
        } else {
            messages = [text];
        }

        let fullText = '';
        for (let i = 0; i < messages.length; i += 1) {
            if (i > 0) {
                fullText += ', ';
            }
            fullText += messages[i];
        }

        const alertDivHtml = genAlertHtml(title, fullText);

        const triesCount = 10;

        function appendPopup(count) {
            if (count >= triesCount) {
                return;
            }

            if (document.body) {
                const alertElement = appendAlertElement(document.body, alertDivHtml, isAdguardTab);
                alertElement.classList.add('adguard-alert-iframe');
                setTimeout(function () {
                    if (alertElement && alertElement.parentNode) {
                        alertElement.parentNode.removeChild(alertElement);
                    }
                }, 4000);
            } else {
                setTimeout(function () {
                    appendPopup(count + 1);
                }, 500);
            }
        }

        appendPopup(0);
    }

    /**
     * Shows version updated popup.
     * Popup content is added right to the page content.
     *
     * @param {{title,description, changelogHref, changelogText, offer, offerButtonHref, offerButtonText}} message
     */
    function showVersionUpdatedPopup(message) {
        const {
            title,
            description,
            changelogHref,
            changelogText,
            offer,
            offerButtonHref,
            offerButtonText,
        } = message;

        const updateIframeHtml = `<head></head>
                            <body>
                            <div id="adguard-new-version-popup" class="adguard-update-popup adguard-update-popup--active">
                                <div id="adguard-new-version-popup-close" class="adguard-update-popup__close"></div>
                                <div class="adguard-update-popup__logo"></div>
                                <div class="adguard-update-popup__title">
                                    ${title}
                                </div>
                                <div class="adguard-update-popup__desc">
                                    ${description}
                                </div>
                                <a href="${changelogHref}" class="adguard-update-popup__link" target="_blank">
                                    ${changelogText}
                                </a>
                                <div class="adguard-update-popup__offer">
                                    ${offer}
                                </div>
                                <a href="${offerButtonHref}" class="adguard-update-popup__btn">
                                    ${offerButtonText}
                                </a>
                            </div>
                            <script>
                                const close = document.querySelector('.adguard-update-popup__close');
                                close.addEventListener('click', () => {
                                    parent.postMessage({type: 'close.iframe'}, location.origin);
                                });
                            </script>
                            </body>`;

        const triesCount = 10;

        function appendPopup(count) {
            if (count >= triesCount) {
                return;
            }

            if (document.body) {
                const iframe = appendIframe(document.body, updateIframeHtml);
                iframe.classList.add('adguard-update-iframe');

                const iframeMessageHandler = (event) => {
                    if (document.location.origin !== event.origin) {
                        return;
                    }
                    const { data: { type } } = event;
                    if (type && type === 'close.iframe') {
                        iframe.parentNode.removeChild(iframe);
                        window.removeEventListener('message', iframeMessageHandler);
                    }
                };

                window.addEventListener('message', iframeMessageHandler, false);
            } else {
                setTimeout(function () {
                    appendPopup(count + 1);
                }, 500);
            }
        }

        appendPopup(0);
    }

    /**
     * Reload page without cache
     */
    function noCacheReload() {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', document.location.href);
        xhr.setRequestHeader('Pragma', 'no-cache');
        xhr.setRequestHeader('Expires', '-1');
        xhr.setRequestHeader('Expires', 'no-cache');
        xhr.onload = xhr.onerror = xhr.onabort = xhr.ontimeout = function () {
            document.location.reload(true);
        };
        xhr.send(null);
    }

    contentPage.onMessage.addListener(function (message) {
        if (message.type === 'show-alert-popup') {
            showAlertPopup(message);
        } else if (message.type === 'show-version-updated-popup') {
            showVersionUpdatedPopup(message);
        } else if (message.type === 'no-cache-reload') {
            noCacheReload();
        } else if (message.type === 'update-tab-url') {
            window.location = message.url;
        }
    });
})();
