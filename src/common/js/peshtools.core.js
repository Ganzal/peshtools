/**
 * Полезные инструменты для сайта Peshkariki.ru.
 * 
 * @author Sergey D. Ivanov <me@ganzal.pro>
 * @copyright Copyright (c) 2016, Sergey D. Ivanov <me@ganzal.pro>
 *                      (c) 2016, PeshTools Project https://peshtools.ganzal.com/
 *                      
 * @package peshtools
 * @license MIT
 */

/* global chrome, browser, ga */

/**
 * Фоновый сценарий PeshTools.
 * 
 * @since   0.1.0   2016-12-16
 * @version 0.1.0   2017-01-10
 * @date    2017-01-10
 * 
 * @returns {Void}
 */
(function () {
    PeshToolsENV = chrome || browser;
    PeshToolsDbg = false;

    PeshTools = {};

    PeshTools.core = {};
    PeshTools.core.fns = {};

    /**
     * Обработчик сообщений в адрес фонового сценария.
     * 
     * @param {mixed} request
     * @param {MessageSender} sender
     * @param {Function} responseCallback
     * @return {Void}
     */
    PeshTools.core.fns.onmessage_hnd = function (request, sender, responseCallback)
    {
        PeshToolsDbg && console.log('@ PeshTools.core.fns.onmessage_hnd()', request, sender, responseCallback);
        PeshToolsDbg && console.log('! PeshTools.core.fns.onmessage_hnd()', typeof request, typeof sender, typeof responseCallback);

        request.sender = sender;

        switch (request.method)
        {
            /**
             * Сохранение значения конфигурации, фильтра, строки.
             */
            case 'config.save':
                PeshTools.run[request.bank][request.name] = request.value;
                PeshTools.core.fns.configSave();

                if ('config' === request.bank && 'selfAutoupdate' === request.name)
                {
                    PeshToolsDbg = !!request.value;
                }

                if (request.scheduleUpdate)
                {
                    PeshTools.core.fns.postUpdateHook();
                }

                var ga_pageview_page = '/' + request.bank + '/' + request.name;
                if ('strings' === request.bank && 'undefined' === typeof PeshTools.run.strings[request.name])
                {
                    ga_pageview_page += '/add';
                } else
                {
                    ga_pageview_page += '/' + request.value.toString();
                }

                PeshTools.core.fns.googleAnalyticsSendEvent('pageview', {
                    'page': ga_pageview_page,
                    'title': request.title
                });

                break;

                /**
                 * Сведения о конфигурации на этапе начальной загрузки встраиваемого сценария.
                 */
            case 'skel.fetch':
                var response = {
                    skel: PeshTools.run.skel,
                    config: PeshTools.run.config,
                    filters: PeshTools.run.filters,
                    strings: PeshTools.run.strings
                };

                PeshToolsDbg && console.info(response);

                responseCallback(response);
                break;

                /**
                 * Сведения о конфигурации на этапе регулярного обновления встраиваемым сценарием.
                 */
            case 'run.fetch':
                var response = {
                    config: PeshTools.run.config,
                    filters: PeshTools.run.filters,
                    strings: PeshTools.run.strings,
                    forceUpdate: request.forceUpdate
                };

                PeshToolsDbg && console.info(response);

                responseCallback(response);
                break;

                /**
                 * Удаление строки.
                 */
            case 'strings.delete':
                var string = request.name;

                delete PeshTools.run.strings[string];

                PeshTools.core.fns.configSave();

                if (request.scheduleUpdate)
                {
                    PeshTools.core.fns.postUpdateHook();
                }

                PeshTools.core.fns.googleAnalyticsSendEvent('pageview', {
                    'page': '/strings/' + request.name + '/delete',
                    'title': request.title
                });

                break;

                /**
                 * Отправка статистики о событии.
                 */
            case 'ga.pageview':
                PeshTools.core.fns.googleAnalyticsSendEvent('pageview', {
                    'page': request.page,
                    'title': request.title
                });
                break;

        }

        // switch (request.method)
    };

    // PeshTools.core.fns.onmessage_hnd = function (request, sender, responseCallback)


    /**
     * Рутина после обновления конфигурации.
     * 
     * Запускает обновление информации встраиваемым сценарием
     * на всех вкладках, где открыт список заказов.
     * 
     * @return {Void}
     */
    PeshTools.core.fns.postUpdateHook = function ()
    {
        PeshToolsENV.tabs.query({
            url: 'http://peshkariki.ru/order/courOrders.html*'
        }, function (tabs)
        {
            for (var i in tabs)
            {
                PeshToolsENV.tabs.sendMessage(tabs[i].id, {
                    method: 'update.run'
                });
            }
        });
    };

    // PeshTools.core.fns.postUpdateHook = function ()


    /**
     * Обработчик события готовности исходного кода страницы.
     * 
     * Внедряет встраиваемый сценарий в страницу списка заказов.
     * 
     * @param {Object} details
     * @returns {Void}
     */
    PeshTools.core.fns.ondomcontentloaded_hnd = function (details)
    {
        PeshToolsDbg && console.info(details);

        if (details.frameId !== 0)
        {
            PeshToolsDbg && console.log('-Dom', details.tabId);
            return;
        }

        PeshToolsDbg && console.log('#Dom', details.tabId);

        if (!/^http:\/\/peshkariki.ru\/order\/courOrders\.html/.test(details.url))
        {
            return;
        }

        PeshToolsENV.tabs.executeScript(
                details.tabId,
                {
                    file: '/js/peshtools.embedded.js'
                },
                function ()
                {
                    if (PeshToolsENV.runtime.lastError)
                    {
                        if (/Cannot access contents of url.*Extension manifest must request permission to access this host/.test(PeshToolsENV.runtime.lastError.message))
                        {
                            return;
                        }

                        // An error occurred :(
                        console.log("WHY ERROR: ", details.tabId, PeshToolsENV.runtime.lastError);
                    }
                }
        );

        return;
    };

    // PeshTools.core.fns.ondomcontentloaded_hnd = function (details)


    /**
     * Обработчик события обновления страницы во вкладке.
     * 
     * Запускает обновление информации встраиваемым сценарием
     * на обновленной вкладке списка заказов.
     * 
     * @param {Number} tabId
     * @return {Void}
     */
    PeshTools.core.fns.onupdated_hnd = function (tabId)
    {
        if (!PeshTools.run.config.selfAutoupdate)
        {
            return;
        }

        PeshToolsENV.tabs.get(tabId, function (tab) {
            PeshToolsDbg && console.log('tab updated', tabId, tab.url, tab);

            if ('complete' === tab.status && /^http:\/\/peshkariki.ru\/order\/courOrders\.html/.test(tab.url))
            {
                PeshToolsDbg && console.info('executing "update.run"');

                PeshToolsENV.tabs.sendMessage(tab.id, {
                    method: 'update.run'
                });
            }
        });
    };

    // PeshTools.core.fns.onupdated_hnd = function (tabId)


    /**
     * Сохранение конфигурации.
     * 
     * @return {Void}
     */
    PeshTools.core.fns.configSave = function ()
    {
        PeshToolsDbg && console.log('configSave');

        localStorage['selfConfig'] = JSON.stringify(PeshTools.run.config);
        localStorage['filtersConfig'] = JSON.stringify(PeshTools.run.filters);
        localStorage['stringsConfig'] = JSON.stringify(PeshTools.run.strings);
    };

    // PeshTools.core.fns.configSave = function ()


    /**
     * Загрузка конфигурации.
     * 
     * @return {Void}
     */
    PeshTools.core.fns.configLoad = function ()
    {
        PeshTools.run.skel = {};

        for (var p in PeshTools.core.skel)
        {
            if (PeshTools.core.skel.hasOwnProperty(p))
            {
                PeshTools.run.skel[p] = PeshTools.core.skel[p];
            }
        }

        PeshTools.run.config = {};
        PeshTools.run.filters = {};
        PeshTools.run.strings = {};

        for (var p in PeshTools.core.skel.selfConfig)
        {
            if (PeshTools.core.skel.selfConfig.hasOwnProperty(p))
            {
                PeshTools.run.config[p] = PeshTools.core.skel.selfConfig[p];
            }
        }

        for (var p in PeshTools.core.skel.filtersConfig)
        {
            if (PeshTools.core.skel.filtersConfig.hasOwnProperty(p))
            {
                PeshTools.run.filters[p] = PeshTools.core.skel.filtersConfig[p];
            }
        }

        var cfgSelfJSON = localStorage['selfConfig'];
        var cfgFiltersJSON = localStorage['filtersConfig'];
        var cfgStringsJSON = localStorage['stringsConfig'];

        console.log('localStorage[*Config]', cfgSelfJSON, cfgFiltersJSON, cfgStringsJSON);

        if ('undefined' !== typeof cfgSelfJSON)
        {
            var cfg = JSON.parse(cfgSelfJSON);

            console.info('selfConfig', cfg);

            for (var c in cfg)
            {
                if (PeshTools.run.skel.selfConfig.hasOwnProperty(c))
                {
                    console.log(c, cfg[c]);
                    PeshTools.run.config[c] = cfg[c];
                }
            }
        }

        PeshToolsDbg = PeshTools.run.config.selfDebug;

        if ('undefined' !== typeof cfgFiltersJSON)
        {
            var cfg = JSON.parse(cfgFiltersJSON);

            PeshToolsDbg && console.info('filtersConfig', cfg);

            for (var c in cfg)
            {
                if (PeshTools.run.skel.filtersConfig.hasOwnProperty(c))
                {
                    PeshToolsDbg && console.log(c, cfg[c]);
                    PeshTools.run.filters[c] = cfg[c];
                }
            }
        }

        if ('undefined' !== typeof cfgStringsJSON)
        {
            var cfg = JSON.parse(cfgStringsJSON);

            PeshToolsDbg && console.info('stringsConfig', cfg);

            PeshTools.run.strings = cfg;
        }
    };

    // PeshTools.core.fns.configLoad = function ()


    /**
     * Скелет конфигурации.
     * 
     * @type {Object}
     */
    PeshTools.core.skel = {
        "selfConfig": {
            "selfAutoupdate": true,
            "hidePeshCountdowns": false,
            "showCommissionRate": false,
            "showSelfCountdown": false,
            "selfDebug": false
        },

        "filtersConfig": {
            "catchToday": "Bypass",
            "catchTomorrow": "Bypass",
            "catchOther": "Bypass",
            "dropToday": "Bypass",
            "dropTomorrow": "Bypass",
            "dropOther": "Bypass",
            "execStrings": false,
            "maxDistanceApply": false,
            "maxDistance": 3.3,
            "maxFullPledgeApply": false,
            "maxFullPledge": 5001,
            "maxFullPledgeRecharge": 0,
            "maxFullPledgeCommission": 1,
            "maxWeightApply": false,
            "maxWeight": 7.0,
            "minRealEarningApply": false,
            "minRealEarning": 180,
            "propAutocomplete": "Bypass",
            "propRecharge": "Bypass",
            "propBuyout": "Bypass",
            "propAirport": "Bypass",
            "propHooking": "Bypass",
            "propWagon": "Bypass",
            "propFragile": "Bypass",
            "propOversized": "Bypass",
            "propWaiting": "Bypass",
            "propPhotoOfShipment": "Bypass",
            "propPhotoOfCertificate": "Bypass",
            "propPhotoOfCheck": "Bypass"
        },

        "filtersLayout": [
            {
                "catch": {
                    "title": "Забор",
                    "type": "QuadState",
                    "data": {
                        "catchToday": "Сегодня",
                        "catchTomorrow": "Завтра",
                        "catchOther": "Другие"
                    }
                },

                "drop": {
                    "title": "Доставка",
                    "type": "QuadState",
                    "data": {
                        "dropToday": "Сегодня",
                        "dropTomorrow": "Завтра",
                        "dropOther": "Другие"
                    }
                }
            },

            {
                "properties": {
                    "title": "Свойства",
                    "type": "QuadState",
                    "data": {
                        "propAutocomplete": "Ракета",
                        "propAirport": "Аэропорт",
                        "propHooking": "Аренда",
                        "propRecharge": "На баланс",
                        "propBuyout": "Выкуп",
                        "propOversized": "Негабарит",
                        "propFragile": "Хрупкий",
                        "propWagon": "Автомобиль",
                        "propWaiting": "Ожидание",
                        "propPhotoOfShipment": "Фото товара",
                        "propPhotoOfCheck": "Фото чека",
                        "propPhotoOfCertificate": "Фото акта"
                    }
                }
            },

            {
                "minRealEarning": {
                    "title": "Заработок",
                    "type": 'Earning'
                },

                "maxFullPledge": {
                    "title": "Залог",
                    "type": 'Pledge'
                },

                "maxDistance": {
                    "title": "Дистанция",
                    "type": 'Distance'
                },

                "maxWeight": {
                    "title": "Вес",
                    "type": 'Weight'
                }
            },

            {
                "strings": {
                    "title": "Магия букв",
                    "type": 'Strings'
                }
            },

            {
                "options": {
                    "title": "Опции",
                    "type": "Options",
                    "data": {
                        "selfAutoupdate": "Автообновление",
                        "hidePeshCountdowns": "Нет секундомерам!",
                        "showCommissionRate": "Проценты комиссий",
                        "showSelfCountdown": "Время до обновления",
                        "selfDebug": "Отладка в консоли"
                    }
                }
            }

        ],

        "filtersQuadStates": {
            "Require": {
                "title": "Требовать",
                "label": "!"
            },

            "Bypass": {
                "title": "Допускать",
                "label": "0"
            },

            "Exclude": {
                "title": "Исключать",
                "label": "x"
            }
        }
    };

    // PeshTools.core.skel = {...}


    /**
     * Отправляет информацию на сервис Google Analytics.
     * 
     * @return {Void}
     */
    PeshTools.core.fns.googleAnalyticsSendEvent = function ()
    {
        var args = Array.prototype.slice.call(arguments);

        args.unshift('send');

        PeshToolsDbg && console.info('ga()', args);

        ga.apply(window, args);
    };

    // PeshTools.core.fns.googleAnalyticsSendEvent = function ()


    /**
     * Начальная загрузка фонового сценария.
     * 
     * @return {Void}
     */
    PeshTools.core.fns.bootstrap = function ()
    {
        // Мусор момент исполнения.
        PeshTools.run = {};

        var manifest = PeshToolsENV.runtime.getManifest();

        PeshTools.run.manifest = manifest;
        PeshTools.run.version = (manifest.version_name ? manifest.version_name : manifest.version);

        // Определение наличия отладочных сообщений.
        var dbgCnt = 0;
        console.debug('PeshTools/Core [v%s]: Testing console.debug()... %d %d %d',
                PeshTools.run.version,
                dbgCnt++, dbgCnt++, dbgCnt++);

        PeshTools.run.debugStripped = (0 === dbgCnt);

        // Чтение конфигурации.
        PeshTools.core.fns.configLoad();

        // Определение режима отладки.
        PeshToolsDbg = PeshTools.run.config.selfDebug;

        // Инициализация статистики Google Analytics.
        var gaDbg = PeshTools.run.debugStripped ? '' : '_debug';

        (function (i, s, o, g, r, a, m) {
            i['GoogleAnalyticsObject'] = r;
            i[r] = i[r] || function () {
                (i[r].q = i[r].q || []).push(arguments);
            }, i[r].l = 1 * new Date();
            a = s.createElement(o),
                    m = s.getElementsByTagName(o)[0];
            a.async = 1;
            a.src = g;
            m.parentNode.insertBefore(a, m)
        })(window, document, 'script', 'https://www.google-analytics.com/analytics' + gaDbg + '.js', 'ga');

        ga('create', 'UA-89920588-1', 'auto');
        ga('set', 'checkProtocolTask', null);
        ga('set', 'appName', PeshTools.run.manifest.name);
        ga('set', 'appVersion', PeshTools.run.version);

        // Отправка события загрузки фонового сценария.
        PeshTools.core.fns.googleAnalyticsSendEvent('pageview', {
            'page': '/'
        });

        // Регистрация обработчика сообщений расширению.
        PeshToolsENV.runtime.onMessage.addListener(PeshTools.core.fns.onmessage_hnd);

        // Регистрация обработчиков событий и состояний вкладок браузера.
        PeshToolsENV.tabs.onUpdated.addListener(PeshTools.core.fns.onupdated_hnd);
//        PeshToolsENV.tabs.onActivated.addListener(PeshTools.core.fns.onactivated_hnd);
//        PeshToolsENV.tabs.onRemoved.addListener(PeshTools.core.fns.onremoved_hnd);

        PeshToolsENV.webNavigation.onDOMContentLoaded.addListener(PeshTools.core.fns.ondomcontentloaded_hnd);
    };

    // PeshTools.core.fns.bootstrap = function ()

})();


/**
 * Запуск фонового сценария.
 * 
 * @return {Void}
 */
(function () {
    PeshTools.core.fns.bootstrap();
})();

// eof: /js/peshtools.core.js