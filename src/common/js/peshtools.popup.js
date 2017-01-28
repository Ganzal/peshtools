/**
 * Полезные инструменты для сайта Peshkariki.ru.
 * 
 * @author Sergey D. Ivanov <me@ganzal.pro>
 * @copyright Copyright (c) 2016-2017, Sergey D. Ivanov <me@ganzal.pro>
 *                      (c) 2016-2017, PeshTools Project https://peshtools.ganzal.com/
 *                      
 * @package peshtools
 * @license MIT
 */

/* global chrome, browser */

/**
 * Сценарий всплывающего окна PeshTools.
 * 
 * @since   0.1.0   2016-12-16
 * @version 0.1.0   2017-01-07
 * @date    2017-01-09
 * 
 * @type {Void}
 */
(function () {
    PeshToolsENV = chrome || browser;

    PeshToolsENV.runtime.sendMessage({
        method: 'ga.pageview',
        page: '/popup',
        title: 'PeshTools-Popup'
    });

    var manifest = PeshToolsENV.runtime.getManifest();

    var version = (manifest.version_name ? manifest.version_name : manifest.version);
    var name = manifest.name;

    var v = document.getElementById('version');

    v.innerHTML = name + ', v' + version;
    v.style.visibility = 'visible';
})();

// eof: /js/peshtools.popup.js
