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
 * Фоновый сценарий PeshTools.
 * 
 * @since   0.1.0   2016-12-16
 * @version 0.7.0   2017-01-31
 * @date    2017-01-31
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
     * Изменяет иконку приложения, текст и цвет бэджика.
     * 
     * @param {undefined|Object} data
     * @return {Void}
     * @since   0.3.0   2017-01-11
     */
    PeshTools.core.fns.badge = function (data)
    {
        if ('undefined' !== typeof data.color)
        {
            PeshToolsENV.browserAction.setBadgeBackgroundColor({color: data.color});
        }

        if ('undefined' !== typeof data.text)
        {
            PeshToolsENV.browserAction.setBadgeText({text: '' + data.text + ''});
        }

        if ('undefined' !== typeof data.icon)
        {
            PeshToolsENV.browserAction.setIcon({path: data.icon});
        }
    };

    // PeshTools.core.fns.badge = function (data)


    /**
     * Безопасно изменяет иконку приложения, текст и цвет бэджика, учитывая демо-режим мигалки.
     * 
     * @param {Object} data
     * @return {Void}
     * @since   0.3.0   2017-01-13
     */
    PeshTools.core.fns.badgeSafe = function (data)
    {
        if (PeshTools.run.badgeBlinkDemo)
        {
            PeshTools.run.badgePending = data;
            return;
        }

        PeshTools.core.fns.badge(data);
    };

    // PeshTools.core.fns.badgeSafe = function (data)


    /**
     * Создает последовательность цветов для демонстрации мигания бэджика в заданном стиле.
     * 
     * @param {String} s
     * @return {Array}
     * @since   0.3.0   2017-01-13
     */
    PeshTools.core.fns.badgeBlinkStyleDemo = function (s)
    {
        var schemeGenerator = PeshTools.core.fns['badgeBlinkStyle' + s];
        if ('undefined' === typeof schemeGenerator)
        {
            schemeGenerator = PeshTools.core.fns.badgeBlinkStylePulse;
        }

        var g = schemeGenerator('#1bb06c', '#68fdd9');
        var b = schemeGenerator('#18649e', '#65b1eb');

        b.push('#65b1eb', [255, 255, 255, 0], [255, 255, 255, 128], [255, 255, 255, 0]);

        return b.concat(g);
    };

    // PeshTools.core.fns.badgeBlinkStyleDemo = function (s)


    /**
     * Задает последовательность цветов для мигания бэджика в стиле Пульсации.
     * 
     * @param {String} m
     * @param {String} l
     * @return {Array}
     * @since   0.3.0   2017-01-13
     */
    PeshTools.core.fns.badgeBlinkStylePulse = function (m, l)
    {
        return [
            m, m, m, l,
            m, m, m, l,
            m
        ].reverse();
    };

    // PeshTools.core.fns.badgeBlinkStylePulse = function (m, l)


    /**
     * Задает последовательность цветов для мигания бэджика в стиле Зебры.
     * 
     * @param {String} m
     * @param {String} l
     * @return {Array}
     * @since   0.3.0   2017-01-13
     */
    PeshTools.core.fns.badgeBlinkStyleZebra = function (m, l)
    {
        return [
            m, l,
            m, l,
            m, l,
            m
        ].reverse();
    };

    // PeshTools.core.fns.badgeBlinkStyleZebra = function (m, l)


    /**
     * Конструктор мигалки.
     * 
     * @param {mixed} v Значение бэджа.
     * @param {String} m Основной ("темный") цвет.
     * @param {String} l Дополнительный ("светлый") цвет.
     * @param {String} s Стиль мигания.
     * @param {undefined|Function} c Опциональная функция окончания цикла мигания.
     * @return {Void}
     * @since   0.3.0   2017-01-13
     */
    PeshTools.core.fns.badgeBlinkPrepare = function (v, m, l, s, c)
    {
        // Не моргаем, если активна демка.
        if (PeshTools.run.badgeBlinkDemo)
        {
            return;
        }

        // Выбор генератора стиля моргания.
        var schemeGenerator = PeshTools.core.fns['badgeBlinkStyle' + s];
        if ('undefined' === typeof schemeGenerator)
        {
            schemeGenerator = PeshTools.core.fns.badgeBlinkStylePulse;
        }

        // Режим демонстрации.
        if ('@badgeBlinkDemo' === v)
        {
            // Включение демо-режима.
            PeshTools.run.badgeBlinkDemo = true;

            // Схема мигания.
            PeshTools.run.badgeBlinkScheme = PeshTools.core.fns.badgeBlinkStyleDemo(s);
            PeshTools.run.badgeBlinkCounter = PeshTools.run.badgeBlinkScheme.length;

            // Текст бэджа - название режима без гласных букв.
            v = s.replace(/[aeiouy]/ig, '').toUpperCase();

            var currentColor, currentValue;
            // Получение текущего цвета бэджика.
            PeshToolsENV.browserAction.getBadgeBackgroundColor({}, function (arg)
            {
                // Лиса говорит #rrggbb.
                if (/^#[0-9a-f]{6}$/i.test(arg))
                {
                    currentColor = arg;
                } else
                {
                    // Хром говорит [rrr, ggg, bbb, aaa].
                    var r = ('000000000000000' + arg[0].toString(16)).substr(-2);
                    var g = ('000000000000000' + arg[1].toString(16)).substr(-2);
                    var b = ('000000000000000' + arg[2].toString(16)).substr(-2);
                    currentColor = '#' + r + g + b;
                }

                // Получение текущего текста бэджика
                PeshToolsENV.browserAction.getBadgeText({}, function () {
                    currentValue = arguments[0];

                    // Функция завершения цикла мигания.
                    c = function ()
                    {
                        // Выключение демо-режима.
                        PeshTools.run.badgeBlinkDemo = false;

                        // Вспоминаем данные до демонстрации.
                        var data = {
                            color: currentColor,
                            text: currentValue
                        };

                        // Проверяем ожидающие данные.
                        if (PeshTools.run.badgePending)
                        {
                            data = PeshTools.run.badgePending;
                            PeshTools.run.badgePending = null;
                        }

                        // Прямая установка нового старого состояния бэджа.
                        PeshTools.core.fns.badge(data);
                    };

                    // Первый "блинк".
                    PeshTools.core.fns.badge({
                        text: v, // заполняем бэджик значением
                        color: '#68fdd9' // мигание начинается со второго ("светлого") цвета в схеме
                    });

                    // Конструируем мигалку.
                    PeshTools.core.fns.badgeBlinkExec(c);
                });
            });

            return;
        } else
        {
            // Схема мигания.
            PeshTools.run.badgeBlinkScheme = schemeGenerator(m, l);
            PeshTools.run.badgeBlinkCounter = PeshTools.run.badgeBlinkScheme.length;
        }

        // Первый "блинк".
        PeshTools.core.fns.badge({
            text: v, // заполняем бэджик значением
            color: l // мигание начинается со второго ("светлого") цвета в схеме
        });

        // Конструируем мигалку.
        PeshTools.core.fns.badgeBlinkExec(c);
    };

    // PeshTools.core.fns.badgeBlinkPrepare = function (v, m, l, s, c)


    /**
     * Мигание бэджика.
     * 
     * В цикле прохоид все цвета, которые нужно применить к бэджику, после
     * чего выполняет опциональную функцию завершения мигания.
     * 
     * @param {undefined|Function} c
     * @return {Void}
     * 
     */
    PeshTools.core.fns.badgeBlinkExec = function (c)
    {
        // Функция мигания задается единожды.
        if (!PeshTools.run.badgeBlinkIntervalId)
        {
            // Создание функции мигания.
            PeshTools.run.badgeBlinkIntervalId = window.setInterval(function () {
                // Пока счетчик не достиг нуля...
                if (0 < PeshTools.run.badgeBlinkCounter)
                {
                    // Декремент счетчика.
                    PeshTools.run.badgeBlinkCounter--;

                    // Получение цвета для текущего значения счетчики.
                    var color = PeshTools.run.badgeBlinkScheme[PeshTools.run.badgeBlinkCounter];

                    // Установка цветка бэджа.
                    PeshTools.core.fns.badge({
                        color: color
                    });

                    return;
                }

                // Когда счетчик достиг нуля:
                // Удаляем интервал функции мигания.
                window.clearInterval(PeshTools.run.badgeBlinkIntervalId);
                PeshTools.run.badgeBlinkIntervalId = null;

                // Вызываем необязательнуй функцию.
                if ('undefined' !== typeof c)
                {
                    c.call();
                }
            }, PeshTools.run.badgeBlinkDelay);
        }
    };

    // PeshTools.core.fns.badgeBlinkExec = function (c)


    /**
     * Демонстрирует мигание бэджика в выбранном стиле.
     * 
     * @param {String} s
     * @return {Void}
     * @since   0.3.0   2017-01-13
     */
    PeshTools.core.fns.badgeBlinkDemo = function (s)
    {
        if ('undefined' === typeof PeshTools.core.fns['badgeBlinkStyle' + s])
        {
            return;
        }

        PeshTools.core.fns.badgeBlinkPrepare('@badgeBlinkDemo', '', '', s);
    };

    // PeshTools.core.fns.badgeBlinkDemo = function (s)


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

        if ('undefined' !== typeof PeshTools.run.tabs[sender.tab.id])
        {
            PeshTools.run.tabs[sender.tab.id].status = 4;
        }

        switch (request.method)
        {
            /**
             * Сохранение значения конфигурации, фильтра, строки.
             */
            case 'config.save':
                var forceSendStatistics = false;
                if ('config' === request.bank && 'sendStatistics' === request.name)
                {
                    forceSendStatistics = PeshTools.run.config.sendStatistics;
                }

                if ('config' === request.bank && 'badgeBlinking' === request.name)
                {
                    PeshTools.core.fns.badgeBlinkDemo(request.value);
                }

                PeshTools.run[request.bank][request.name] = request.value;
                PeshTools.core.fns.configSave();

                if ('config' === request.bank && 'selfAutoupdate' === request.name)
                {
                    PeshToolsDbg = !!request.value;
                }

                if ('filters' === request.bank && 'execStrings' === request.name)
                {
                    PeshToolsENV.contextMenus.update(PeshTools.run.ctxMenuStringsExec, {
                        title: 'Фильтр ' + (!PeshTools.run.filters.execStrings ? 'не ' : '') + 'активирован'
                    });
                }

                if (request.scheduleUpdate)
                {
                    PeshTools.core.fns.postUpdateHook(true);
                }

                var ga_pageview_page = '/' + request.bank + '/' + request.name;
                if ('strings' === request.bank && 'undefined' === typeof PeshTools.run.strings[request.name])
                {
                    ga_pageview_page += '/add';
                } else
                {
                    ga_pageview_page += '/' + request.value.toString();
                }

                if ('notifications' === request.bank && !request.value && 'undefined' !== typeof PeshTools.run.notifications[request.name])
                {
                    delete PeshTools.run.notifications[request.name];
                }

                PeshTools.core.fns.googleAnalyticsSendEvent({
                    'page': ga_pageview_page,
                    'referrer': request.referrer,
                    'title': request.title
                }, forceSendStatistics);

                break;

                /**
                 * Сведения о конфигурации на этапе начальной загрузки встраиваемого сценария.
                 */
            case 'skel.fetch':
                var response = {
                    sess: PeshTools.run.sess,
                    skel: PeshTools.run.skel,
                    config: PeshTools.run.config,
                    filters: PeshTools.run.filters,
                    notifications: PeshTools.run.notifications,
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
                    notifications: PeshTools.run.notifications,
                    strings: PeshTools.run.strings,
                    interaction: !!request.interaction,
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

                if ('undefined' !== typeof PeshTools.run.notifications['string' + string])
                {
                    delete PeshTools.run.notifications['string' + string];
                }

                PeshTools.core.fns.configSave();

                if (request.scheduleUpdate)
                {
                    PeshTools.core.fns.postUpdateHook(true);
                }

                PeshTools.core.fns.googleAnalyticsSendEvent({
                    'page': '/strings/' + request.name + '/delete',
                    'referrer': request.referrer,
                    'title': request.title
                });

                break;

                /**
                 * Регистрирует текущее выделение на странице и готовит контекстное меню.
                 */
            case 'strings.selection':
                if ('undefined' !== typeof PeshTools.run.selections[sender.tab.id])
                {
                    if (PeshTools.run.selections[sender.tab.id] === request.value)
                    {
                        return;
                    }
                }

                PeshTools.run.selections[sender.tab.id] = request.value;
                PeshTools.core.fns.stringsUpdateContextMenu(sender.tab.id);
                break;

                /**
                 * Отправка статистики о событии.
                 */
            case 'ga.pageview':
                PeshTools.core.fns.googleAnalyticsSendEvent(request);
                break;

                /**
                 * Демонстрация бэджа с количеством заказов.
                 * 
                 * Зеленый фон - количество не скрытых фильтрами заказов.
                 * Синий фон - общее количество заказов, при нулевом количестве видимых.
                 */
            case 'stats.push':
                PeshTools.core.fns.statsToBadge(request);
                break;

                /**
                 * Пинг встраиваемым сценарием фонового сценария.
                 */
            case 'noop.ping':
                responseCallback(request.bypass);
                break;

                /**
                 * Отображение уведомления.
                 */
            case 'notification.show':
                if (!PeshTools.run.config.showNotifications)
                {
                    return;
                }

                request.data.sender = {
                    windowId: sender.tab.windowId,
                    tabId: sender.tab.id
                };

                PeshTools.core.fns.notificationParseData(request.data);
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
     * @param {Boolean} interaction
     * @return {Void}
     */
    PeshTools.core.fns.postUpdateHook = function (interaction)
    {
        PeshToolsENV.tabs.query({
            status: "complete",
            url: 'http://peshkariki.ru/order/courOrders.html*'
        }, function (tabs)
        {
            for (var i in tabs)
            {
                PeshToolsENV.tabs.sendMessage(tabs[i].id, {
                    interaction: interaction,
                    method: 'update.run'
                });
            }
        });
    };

    // PeshTools.core.fns.postUpdateHook = function (interaction)


    /**
     * Обрабатывает статистику и заполняет бэджик.
     * 
     * Зеленый фон - количество не скрытых фильтрами заказов.
     * Синий фон - общее количество заказов, при нулевом количестве видимых.
     * 
     * А еще есть режим моргания бэджа при увеличении значения счетчика.
     * 
     * @param {Object} request
     * @return {Void}
     * @since   0.3.0   2017-01-13
     */
    PeshTools.core.fns.statsToBadge = function (request)
    {
        // Сброс бэджа.
        var data = {
            color: '#ffffff',
            text: ''
        };

        // Если есть видимые заказы...
        if (request.data.ordersVisible)
        {
            // Показываем зеленый бэдж.
            data.color = '#1bb06c';
            data.text = request.data.ordersVisible;
        } else
        {
            // Иначе - синий бэдж с общим числом заказов.
            data.color = '#18649e';
            data.text = request.data.ordersOverall;
        }

        // Не мигаем если отключено, или было взаимодейтсвие.
        if (request.interaction || 'None' === PeshTools.run.config.badgeBlinking)
        {
            PeshTools.core.fns.badgeSafe(data);
            return;
        }

        // Ниже - простая процедура подготовки мигания.

        var newValue = Number.parseInt(data.text);
        var currentColor, currentValue;

        // Получение текущего цвета бэджа.
        PeshToolsENV.browserAction.getBadgeBackgroundColor({}, function (arg)
        {
            if (/^#[0-9a-f]{6}$/i.test(arg))
            {
                // Лиса говорит #rrggbb.
                currentColor = arg;
            } else
            {
                // Хром говорит [rrr, ggg, bbb, aaa].
                var r = ('000000000000000' + arg[0].toString(16)).substr(-2);
                var g = ('000000000000000' + arg[1].toString(16)).substr(-2);
                var b = ('000000000000000' + arg[2].toString(16)).substr(-2);
                currentColor = '#' + r + g + b;
            }

            // Получение текущего текста бэджа.
            PeshToolsENV.browserAction.getBadgeText({}, function () {
                currentValue = Number.parseInt(arguments[0]);

                var needBlink = true;

                // Не мигаем при переходе от зеленого к синему.
                if ('#1bb06c' === currentColor && '#18649e' === data.color)
                {
                    needBlink = false;
                }

                // Мигаем если идет смена синего на зеленый или если в зеленом повышается значение.
                needBlink &= currentColor !== data.color || currentValue < newValue;

                // Без мигания - выполняем простую функцию установки бэджа.
                if (!needBlink)
                {
                    PeshTools.core.fns.badgeSafe(data);
                    return;
                }

                // При активном демо-мигании - встанем в очередь
                if (PeshTools.run.badgeBlinkDemo)
                {
                    PeshTools.run.badgePending = data;
                    return;
                }

                // Темный цвет в паре.
                var mainColor = data.color;

                // Светлый цвет в паре.
                switch (data.color)
                {
                    case '#1bb06c':
                        data.color = '#68fdd9';

                        break;

                    case '#18649e':

                        data.color = '#65b1eb';

                        break;
                }

                // Конструируем мигалку.
                PeshTools.core.fns.badgeBlinkPrepare(
                        newValue, mainColor, data.color,
                        PeshTools.run.config.badgeBlinking
                        );
            });
        });
    };

    // PeshTools.core.fns.statsToBadge = function (request)


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

        PeshTools.core.fns.injectEmbedded(details.tabId);

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
                    interaction: false,
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

        for (var n in PeshTools.run.notifications)
        {
            if (!PeshTools.run.notifications.hasOwnProperty(n))
            {
                continue;
            }

            if (!PeshTools.run.notifications[n])
            {
                delete PeshTools.run.notifications[n];
            }
        }

        localStorage['notificationsConfig'] = JSON.stringify(PeshTools.run.notifications);
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
        PeshTools.run.notifications = {};
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
        var cfgNotificationsJSON = localStorage['notificationsConfig'];
        var cfgStringsJSON = localStorage['stringsConfig'];

        console.log('localStorage[*Config]', cfgSelfJSON, cfgFiltersJSON, cfgNotificationsJSON, cfgStringsJSON);

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

        if ('undefined' !== typeof cfgNotificationsJSON)
        {
            var cfg = JSON.parse(cfgNotificationsJSON);

            PeshToolsDbg && console.info('notificationsConfig', cfg);

            PeshTools.run.notifications = cfg;
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
            "filtersEnabled": true,
            "filteringStyle": "Hide",
            "showNotifications": true,
            "selfAutoupdate": true,
            "badgeBlinking": "None",
            "hidePeshCountdowns": false,
            "showCommissionRate": false,
            "showSelfCountdown": false,
            "sendStatistics": true,
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
            "fullPledgeMathDisplay": true,
            "fullPledgeMathHideNegative": false,
            "fullPledgeMathReadyToRecharge": false,
            "fullPledgeMathRecharge": 1500,
            "maxBuyoutPriceApply": false,
            "maxBuyoutPrice": 2500,
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
            "propPersonal": "Bypass",
            "propAutocomplete": "Bypass",
            "propRecharge": "Bypass",
            "propBuyout": "Bypass",
            "propAirport": "Bypass",
            "propHooking": "Bypass",
            "propWagon": "Bypass",
            "propFragile": "Bypass",
            "propOversized": "Bypass",
            "propWaiting": "Bypass",
            "propPostOffice": "Bypass",
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
                        "propPersonal": "Персональный",
                        "propAutocomplete": "Ракета",
                        "propAirport": "Аэропорт",
                        "propHooking": "Аренда",
                        "propRecharge": "На баланс",
                        "propBuyout": "Выкуп",
                        "propOversized": "Негабарит",
                        "propFragile": "Хрупкий",
                        "propWagon": "Автомобиль",
                        "propWaiting": "Ожидание",
                        "propPostOffice": "Отправка почтой",
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

                "maxBuyoutPrice": {
                    "title": "Выкуп",
                    "type": 'Buyout'
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
                        "filtersEnabled": "Включить фильтрацию",
                        "filteringStyle": "Стиль фильтрации",
                        "showNotifications": "Уведомления",
                        "selfAutoupdate": "Автообновление",
                        "badgeBlinking": "Мигание бэджа",
                        "hidePeshCountdowns": "Нет секундомерам!",
                        "showCommissionRate": "Проценты комиссий",
                        "showSelfCountdown": "Время до обновления",
                        "sendStatistics": "Отправлять статистику",
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

            "Include": {
                "title": "Включать",
                "label": "+"
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
     * @param {Object} data
     * @param {mixed} force
     * @return {Void}
     */
    PeshTools.core.fns.googleAnalyticsSendEvent = function (data, force)
    {
        force = !!force;

        // учитываем значение опции sendStatistics
        if (!PeshTools.run.config.sendStatistics && !force)
        {
            return;
        }

        // собираем данные
        var tmp = {
            'v': '1',
            'tid': 'UA-89920588-1',
            'cid': PeshTools.core.fns.getUUID(true),
            'aip': PeshTools.run.getGADataAIP(),
            'an': PeshTools.run.manifest.name,
            'av': PeshTools.run.version,

            't': 'pageview',
            'dl': document.location.href,
            'dp': data.page || document.location.href,
            'dr': data.referrer || '',
            'dt': data.title || document.title,
            'ni': data.nonInteraction ? '1' : '0',

            'sd': screen.pixelDepth + '-bits',
            'sr': screen.width + 'x' + screen.height,
            'vp': [
                Math.max(document.documentElement.clientWidth, window.innerWidth || 0),
                Math.max(document.documentElement.clientHeight, window.innerHeight || 0)
            ].join('x'),

            'z': Math.random().toString().slice(2)
        };

        // очищаем пустоты
        if ('' === tmp.dr)
        {
            delete tmp.dr;
        }

        if ('0x0' === tmp.vp)
        {
            delete tmp.vp;
        }

        PeshToolsDbg && console.log(tmp);

        // оформляем посылку
        var post = [];
        for (var p in tmp)
        {
            if (tmp.hasOwnProperty(p))
            {
                post.push(encodeURIComponent(p) + "=" + encodeURIComponent(tmp[p]));
            }
        }

        var message = post.join("&");

        PeshToolsDbg && console.info(message);

        // отправляем
        try
        {
            var request = new XMLHttpRequest();

            request.open("POST", "https://www.google-analytics.com/collect", true);
            request.send(message);
        } catch (e)
        {
            console.error(e);
        }
    };

    // PeshTools.core.fns.googleAnalyticsSendEvent = function (data)


    /**
     * Возвращает UUID пользователя расширения.
     * 
     * @param {mixed} renew
     * @param {mixed} regen
     * @return {String}
     * @since   0.2.0   2017-01-10
     */
    PeshTools.core.fns.getUUID = function (renew, regen)
    {
        var uuid = void 0;
        renew = !!renew;
        regen = !!regen;

        // если нет заявки на регенерацию - пробуем прочитать печеньки
        if (!regen)
        {
            var matches = document.cookie.match(new RegExp(
                    "(?:^|; )uuid=([^;]*)"
                    ));
            uuid = matches ? decodeURIComponent(matches[1]) : void 0;
        }

        // проверка необходимости регенерации
        if ('undefined' === typeof uuid)
        {
            uuid = PeshTools.core.fns.generateUUID();
            renew = true;
        }

        // проверка необходимости обновления печеньки
        if (renew)
        {
            var date = new Date();
            date.setFullYear(date.getFullYear() + 2);

            document.cookie = 'uuid=' + uuid + '; path=/; expires=' + date.toUTCString();
        }

        // возврат значения
        return uuid;
    };

    // PeshTools.core.fns.getUUID = function (renew)


    /**
     * Генерирует UUID.
     * 
     * @author broofa <http://stackoverflow.com/users/109538>
     * @link http://stackoverflow.com/questions/105034/create-guid-uuid-in-javascript
     * @return {String}
     * @since   0.2.0   2017-01-10
     */
    PeshTools.core.fns.generateUUID = function ()
    {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };

    // PeshTools.core.fns.generateUUID = function ()


    /**
     * Регулярная проверка открытых вкладок на выполнение встраиваемого сценария.
     * 
     * @return {Void}
     * @since   0.3.0   2017-01-12
     */
    PeshTools.core.fns.healthCheck = function ()
    {
        // Инъекция встраиваемого сценария во все вкладки, не ответившие на NOOP-PING.
        for (var tabId in PeshTools.run.tabs)
        {
            // Отбор по совпадению адреса.
            if (1 === PeshTools.run.tabs[tabId].status)
            {
                PeshTools.core.fns.injectEmbedded(tabId);
                PeshTools.run.tabs[tabId].status = 3;

                continue;
            }

            // Отбор по тишине в ответ на NOOP-PING.
            if (2 === PeshTools.run.tabs[tabId].status)
            {
                PeshTools.core.fns.injectEmbedded(tabId);
                PeshTools.run.tabs[tabId].status = 3;

                continue;
            }
        }

        // Обнуление живых вкладок.
        for (var tabId in PeshTools.run.tabs)
        {
            // Ранее обнуленная - готовится к удалению.
            if (0 === PeshTools.run.tabs[tabId].status)
            {
                PeshTools.run.tabs[tabId].status = -1;
                continue;
            }

            // Ранее живая - обнуляется.
            if (4 === PeshTools.run.tabs[tabId].status)
            {
                PeshTools.run.tabs[tabId].status = 0;
            }
        }

        // Выборка вкладок со списком заказов.
        PeshToolsENV.tabs.query({
            status: "complete",
            url: 'http://peshkariki.ru/order/courOrders.html*'
        }, function (tabs)
        {
            for (var i in tabs)
            {
                var tabId = tabs[i].id;

                if ('undefined' === typeof PeshTools.run.tabs[tabId])
                {
                    PeshTools.run.tabs[tabId] = {
                        status: 0,
                        stats: {}
                    };
                }

                if (0 !== PeshTools.run.tabs[tabId].status)
                {
                    continue;
                }

                PeshTools.run.tabs[tabs[i].id].status = 1;

                PeshToolsENV.tabs.sendMessage(tabs[i].id, {
                    method: 'noop.ping',
                    bypass: [tabs[i].id]
                }, PeshTools.core.fns.healthCheckMarkAsAlive);
            }
        });

        // Анализ вкладок.
        var anyTab = false;

        for (var tabId in PeshTools.run.tabs)
        {
            // Удаление отмеченных на удаление.
            if (-1 > PeshTools.run.tabs[tabId].status)
            {
                delete PeshTools.run.tabs[tabId];
                continue;
            }

            // Пометка на удаление подготовленных к удалению
            if (-1 === PeshTools.run.tabs[tabId].status)
            {
                PeshTools.run.tabs[tabId].status--;
                continue;
            }

            anyTab = true;
        }

        // Если живчиков нет - убираем бэджик.
        if (!anyTab)
        {
            PeshTools.core.fns.badgeSafe({
                "text": "",
                "color": "#000000"
            });
        }
    };

    // PeshTools.core.fns.healthCheck = function ()


    /**
     * Отмечает живчиком вкладку, ответившую на NOOP-PING.
     * 
     * @param {mixed} tabId
     * @return {Void}
     * @since   0.3.0   2017-01-12
     */
    PeshTools.core.fns.healthCheckMarkAsAlive = function (tabId)
    {
        if (isNaN(tabId))
        {
            return;
        }

        tabId = Number.parseInt(tabId);
        PeshTools.run.tabs[tabId].status = 4;
    };

    // PeshTools.core.fns.healthCheckMarkAsAlive = function (tabId)


    /**
     * Производит инъекцию встраиваемого сценария во вкладку.
     * 
     * @param {Number} tabId
     * @return {Void}
     * @since   0.3.0   2017-01-12
     */
    PeshTools.core.fns.injectEmbedded = function (tabId)
    {
        tabId = Number.parseInt(tabId);

        PeshToolsENV.tabs.executeScript(
                tabId,
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
                        console.log("WHY ERROR: ", tabId, PeshToolsENV.runtime.lastError);
                    }
                }
        );
    };

    // PeshTools.core.fns.injectEmbedded = function (tabId)


    /**
     * Обработчик заявки на отображение уведомлений.
     * 
     * @param {Object} data
     * @return {Void}
     * @since   0.7.0   2017-01-31
     */
    PeshTools.core.fns.notificationParseData = function (data)
    {
        PeshToolsDbg && console.info(data);

        if (!data.ids.length || !PeshTools.run.config.showNotifications)
        {
            return;
        }

        // Фильтрация пакета данных.
        var tmp = {
            ids: [],
            visibility: {},
            texts: {}
        };

        for (var i in data.ids)
        {
            var orderId = data.ids[i];
            if ('undefined' !== typeof PeshTools.run.shownNotifications[orderId])
            {
                PeshToolsDbg && console.info('skip notification for', orderId);

                continue;
            }

            PeshTools.run.shownNotifications[orderId] = true;
            tmp.ids.push(orderId);

            if ('undefined' !== typeof data.visibility[orderId])
            {
                tmp.visibility[orderId] = data.visibility[orderId];
            }

            if ('undefined' !== typeof data.texts[orderId])
            {
                tmp.texts[orderId] = data.texts[orderId];
            }
        }

        if (!tmp.ids.length)
        {
            return;
        }

        // Подготовка уведомления.
        var nOpts = {
            type: "basic",
            iconUrl: PeshToolsENV.extension.getURL("/img/peshtools.png")
        };

        if (1 === tmp.ids.length)
        {
            var orderId = tmp.ids[0];

            nOpts.title = "Заказ " + orderId + (tmp.visibility[orderId] ? '' : ' [скрыт]');
            nOpts.message = tmp.texts[orderId];
        } else
        {
            nOpts.title = "Новые заказы: " + tmp.ids.length;
            var message = [];

            for (var i in tmp.ids)
            {
                var orderId = tmp.ids[i];

                message.push('#' + orderId + (tmp.visibility[orderId] ? '' : ' [скрыт]'));
            }

            nOpts.message = message.join(", ");

        }

        // Демонстрация уведомления.
        var nId = PeshTools.core.fns.generateUUID();
        PeshTools.run.notificationSenders[nId] = data.sender;
        PeshToolsENV.notifications.create(nId, nOpts, PeshTools.core.fns.notificationCreationCallback);
    };

    // PeshTools.core.fns.notificationParseData = function (data)


    /**
     * Обработчик создания уведомления.
     * 
     * @param {String} notificationId
     * @return {Void}
     * @since   0.7.0   2017-01-31
     */
    PeshTools.core.fns.notificationCreationCallback = function (notificationId)
    {
        PeshToolsDbg && console.info('creation', notificationId);

        PeshTools.core.fns.googleAnalyticsSendEvent({
            'page': '/notifications#create',
            referrer: document.location.href,
            title: document.title
        });
    };

    // PeshTools.core.fns.notificationCreationCallback = function (notificationId)


    /**
     * Обработчик клика по уведомлению.
     * 
     * Пробует активировать окно и вкладку, создавшие уведомление.
     * 
     * @param {String} notificationId
     * @return {Void}
     * @since   0.7.0   2017-01-31
     */
    PeshTools.core.fns.notificationClickCallback = function (notificationId)
    {
        PeshToolsDbg && console.info('click', notificationId);

        PeshToolsENV.notifications.clear(notificationId);

        if ('undefined' === typeof PeshTools.run.notificationSenders[notificationId])
        {
            return;
        }
        var sender = PeshTools.run.notificationSenders[notificationId];
        var tabId = sender.tabId;
        var windowId = sender.windowId;

        delete PeshTools.run.notificationSenders[notificationId];

        PeshToolsENV.windows.update(windowId, {focused: true});
        PeshToolsENV.tabs.update(tabId, {active: true});

        PeshTools.core.fns.googleAnalyticsSendEvent({
            'page': '/notifications#click',
            referrer: document.location.href,
            title: document.title
        });
    };

    // PeshTools.core.fns.notificationClickCallback = function (tabId)


    /**
     * Обработчик клика по кнопке на уведомлении.
     * 
     * @param {String} notificationId
     * @param {Number} buttonIndex
     * @return {Void}
     * @since   0.7.0   2017-01-31
     */
    PeshTools.core.fns.notificationButtonClickCallback = function (notificationId, buttonIndex)
    {
        PeshToolsDbg && console.info('button click', notificationId, buttonIndex);

        PeshToolsENV.notifications.clear(notificationId);

        if ('undefined' === typeof PeshTools.run.notificationSenders[notificationId])
        {
            return;
        }

        delete PeshTools.run.notificationSenders[notificationId];

        PeshTools.core.fns.googleAnalyticsSendEvent({
            'page': '/notifications#button',
            referrer: document.location.href,
            title: document.title
        });

    };

    // PeshTools.core.fns.notificationButtonClickCallback = function (tabId, buttonIndex)


    /**
     * Обработчик закрытия уведомления.
     * 
     * @param {String} notificationId
     * @return {Void}
     * @since   0.7.0   2017-01-31
     */
    PeshTools.core.fns.notificationCloseCallback = function (notificationId)
    {
        PeshToolsDbg && console.info('close', notificationId);

        if ('undefined' !== typeof PeshTools.run.notificationSenders[notificationId])
        {
            return;
        }

        delete PeshTools.run.notificationSenders[notificationId];

        PeshTools.core.fns.googleAnalyticsSendEvent({
            'page': '/notifications#close',
            referrer: document.location.href,
            title: document.title
        });
    };

    // PeshTools.core.fns.notificationCloseCallback = function (tabId)


    /**
     * Вставка или обновление слова через контекстное меню.
     * 
     * @param {Object} data
     * @return {Void}
     * @since   0.4.0   2017-01-14
     */
    PeshTools.core.fns.stringsChangeByContextMenu = function (data)
    {
        PeshToolsDbg && console.info(data);

        var string = data.string.trim().toLowerCase();
        var ga_pageview_page = '/strings/' + string + '/' + data.value;

        if ('undefined' === typeof PeshTools.run.strings[string])
        {
            ga_pageview_page += '#added-via-context-menu';
        } else
        {
            ga_pageview_page += '#via-context-menu';
        }

        PeshTools.core.fns.googleAnalyticsSendEvent({
            'page': ga_pageview_page,
            referrer: document.location.href,
            title: document.title
        });

        PeshTools.run.strings[string] = data.value;
        PeshTools.core.fns.configSave();

        PeshTools.core.fns.postUpdateHook(true);
    };

    // PeshTools.core.fns.stringsChangeByContextMenu = function (data)


    /**
     * Единый обработчик выбора опции для строки в контекстном меню.
     * 
     * @param {Object} details
     * @param {Object} tab
     * @return {Void}
     * @since   0.6.0   2017-01-24
     */
    PeshTools.core.fns.stringsOnContextMenuAction_hnd = function (details, tab)
    {
        PeshToolsDbg && console.debug(details, tab);

        var m = PeshTools.run.cmStringQuadStateRegex.exec(details.menuItemId);

        if (!m)
        {
            return;
        }

        PeshTools.core.fns.stringsChangeByContextMenu({
            string: details.selectionText,
            value: m[1]
        });

        PeshTools.core.fns.stringsUpdateContextMenu(tab.id);
    };

    // PeshTools.core.fns.stringsOnContextMenuAction_hnd = function (details, tab)


    /**
     * Обновляет контекстного меню в контексте фильтра "Магия букв".
     * 
     * @param {Number} tabId
     * @return {Void}
     * @since   0.4.0   2017-01-14
     */
    PeshTools.core.fns.stringsUpdateContextMenu = function (tabId)
    {
        PeshToolsDbg && console.debug(arguments);

        var data = PeshTools.core.fns.stringsUpdateContextMenuResolve(tabId);

        if (!data)
        {
            return;
        }

        PeshToolsDbg && console.info(data);

        if (PeshTools.run.ctxMenuStringsAboutTitle !== data.AboutTitle)
        {
            PeshTools.run.ctxMenuStringsAboutTitle = data.AboutTitle;
            PeshToolsENV.contextMenus.update(PeshTools.run.ctxMenuStringsAbout, {
                title: data.AboutTitle
            });
        }

        for (var s in PeshTools.run.skel.filtersQuadStates)
        {
            if (!PeshTools.run.skel.filtersQuadStates.hasOwnProperty(s))
            {
                continue;
            }

            var runKey = 'ctxMenuStrings' + s + 'Enabled';
            var dataKey = s + 'Enabled';

            if (PeshTools.run[runKey] !== data[dataKey])
            {
                PeshTools.run[runKey] = data[dataKey];
                PeshToolsENV.contextMenus.update(PeshTools.run['ctxMenuStrings' + s], {
                    enabled: data[dataKey]
                });
            }
        }
    };

    // PeshTools.core.fns.stringsUpdateContextMenu = function (tabId)


    /**
     * Готовит план обновления контекстного меню в контексте фильтра "Магия букв".
     * 
     * @return {Void}
     * @since   0.4.0   2017-01-14
     */
    PeshTools.core.fns.stringsUpdateContextMenuResolve = function (tabId)
    {
        if ('undefined' === typeof PeshTools.run.selections[tabId])
        {
            return;
        }

        var newString = PeshTools.run.selections[tabId];
        var data = {};

        for (var s in PeshTools.run.skel.filtersQuadStates)
        {
            if (PeshTools.run.skel.filtersQuadStates.hasOwnProperty(s))
            {
                data[s + 'Enabled'] = false;
            }
        }

        if ('' === newString)
        {
            data.AboutTitle = 'Пустая строка';
            return data;
        }

        for (var s in PeshTools.run.skel.filtersQuadStates)
        {
            if (PeshTools.run.skel.filtersQuadStates.hasOwnProperty(s))
            {
                data[s + 'Enabled'] = true;
            }
        }

        if ('undefined' !== typeof PeshTools.run.strings[newString])
        {
            data.AboutTitle = 'Изменить';

            data[PeshTools.run.strings[newString] + 'Enabled'] = false;
            return data;
        }

        var AboutTitle = ['Добавить'];
//        var substrings = 0;
//        var supstrings = 0;
//
//        for (var string in PeshTools.run.strings)
//        {
//            console.log(string, string.indexOf(newString), newString.indexOf(string));
//
//            // Новая строка входит в известную
//            if (-1 !== string.indexOf(newString))
//            {
//                supstrings++;
//            }
//
//            // Известная строка входит в новую
//            if (-1 !== newString.indexOf(string))
//            {
//                substrings++;
//            }
//        }
//        ;
//
//        console.info(substrings, supstrings);
//
//        if (supstrings)
//        {
//            AboutTitle.push('входит в: ' + supstrings);
//        }
//
//        if (substrings)
//        {
//            AboutTitle.push('поглощает: ' + substrings);
//        }

        data.AboutTitle = AboutTitle.join(', ');
        return data;
    };

    // PeshTools.core.fns.stringsUpdateContextMenuResolve = function (tabId)


    /**
     * Инициализация контекстного меню.
     * 
     * @return {Void}
     * @since   0.4.0   2017-01-14
     */
    PeshTools.core.fns.bootstrapContextMenu = function ()
    {
        var urls = [
            'http://peshkariki.ru/order/courOrders.html*'
        ];

        PeshTools.run.ctxMenuRoot = PeshToolsENV.contextMenus.create({
            id: 'PeshToolsCMRoot',
            title: 'PeshTools',
            contexts: ['selection'],
            documentUrlPatterns: urls
        });

        PeshTools.run.ctxMenuStrings = PeshToolsENV.contextMenus.create({
            parentId: PeshTools.run.ctxMenuRoot,
            id: 'PeshToolsCMStrings',
            title: '"%s" в Магии букв',
            contexts: ['selection'],
            documentUrlPatterns: urls
        });

        if (!/firefox|seamonkey/i.test(navigator.userAgent))
        {
            PeshTools.run.ctxMenuStringsAboutTitle = 'Неизвестно';
            PeshTools.run.ctxMenuStringsAbout = PeshToolsENV.contextMenus.create({
                parentId: PeshTools.run.ctxMenuStrings,
                id: 'PeshToolsCMStringsAbout',
                title: 'Неизвестно',
                contexts: ['selection'],
                documentUrlPatterns: urls,
                enabled: false
            });


            PeshTools.run.ctxMenuStringsSeparator0 = PeshToolsENV.contextMenus.create({
                parentId: PeshTools.run.ctxMenuStrings,
                id: 'PeshToolsCMStringsSeparator0',
                type: 'separator',
                contexts: ['selection']
            });
        }

        PeshTools.run.cmStringQuadStateRegex = new RegExp('^PeshToolsCMStrings(' + Object.keys(PeshTools.run.skel.filtersQuadStates).join('|') + ')$');

        for (var state in PeshTools.run.skel.filtersQuadStates)
        {
            if (!PeshTools.run.skel.filtersQuadStates.hasOwnProperty(state))
            {
                continue;
            }

            var data = PeshTools.run.skel.filtersQuadStates[state];

            PeshTools.run['ctxMenuStrings' + state + 'Enabled'] = true;
            PeshTools.run['ctxMenuStrings' + state] = PeshToolsENV.contextMenus.create({
                parentId: PeshTools.run.ctxMenuStrings,
                id: 'PeshToolsCMStrings' + state,
                title: '[' + data.label + '] ' + data.title,
                contexts: ['selection'],
                documentUrlPatterns: urls,
                onclick: PeshTools.core.fns.stringsOnContextMenuAction_hnd
            });
        }

        PeshTools.run.ctxMenuStringsSeparator1 = PeshToolsENV.contextMenus.create({
            parentId: PeshTools.run.ctxMenuStrings,
            id: 'PeshToolsCMStringsSeparator1',
            type: 'separator',
            contexts: ['selection']
        });

        PeshTools.run.ctxMenuStringsExec = PeshToolsENV.contextMenus.create({
            parentId: PeshTools.run.ctxMenuStrings,
            id: 'PeshToolsCMStringsExec',
            title: 'Фильтр ' + (!PeshTools.run.filters.execStrings ? 'не ' : '') + 'активирован',
            contexts: ['selection'],
            documentUrlPatterns: urls,
            enabled: false
        });
    };

    // PeshTools.core.fns.bootstrapContextMenu = function ()


    /**
     * Начальная загрузка фонового сценария.
     * 
     * @return {Void}
     */
    PeshTools.core.fns.bootstrap = function ()
    {
        // Мусор момент исполнения.
        PeshTools.run = {};
        PeshTools.run.tabs = {};
        PeshTools.run.sess = PeshTools.core.fns.generateUUID();
        PeshTools.run.badgeBlinkDelay = 200;
        PeshTools.run.badgeBlinkDemo = false;
        PeshTools.run.selections = {};
        PeshTools.run.shownNotifications = {};
        PeshTools.run.notificationSenders = {};

        var manifest = PeshToolsENV.runtime.getManifest();

        PeshTools.run.manifest = manifest;
        PeshTools.run.version = (manifest.version_name ? manifest.version_name : manifest.version);

        // Определение наличия отладочных сообщений.
        var dbgCnt = 0;
        console.debug('PeshTools/Core [v%s]: Testing console.debug()... %d %d %d',
                PeshTools.run.version,
                dbgCnt++, dbgCnt++, dbgCnt++);

        PeshTools.run.debugStripped = (0 === dbgCnt);

        var ga_data_aip = 0;

        // Cоблюдение политики анонимности Mozilla для пользователей Firefox.
        if (/firefox|seamonkey/i.test(navigator.userAgent))
        {
            PeshTools.core.skel.selfConfig.sendStatistics = false;
            ga_data_aip = 1;

            // Маленький привет пользователям Firefox.
            PeshTools.core.fns.stringsUpdateContextMenu = function () {};
        }

        PeshTools.run.getGADataAIP = (function () {
            return function () {
                return ga_data_aip;
            };
        })();

        // Чтение конфигурации.
        PeshTools.core.fns.configLoad();

        // Инициализация контекстного меню.
        PeshTools.core.fns.bootstrapContextMenu();

        // Определение режима отладки.
        PeshToolsDbg = PeshTools.run.config.selfDebug;

        // Отправка события загрузки фонового сценария.
        PeshTools.core.fns.googleAnalyticsSendEvent({
            'page': '/'
        });

        // Регистрация обработчика сообщений расширению.
        PeshToolsENV.runtime.onMessage.addListener(PeshTools.core.fns.onmessage_hnd);

        // Регистрация обработчиков событий и состояний вкладок браузера.
        PeshToolsENV.tabs.onUpdated.addListener(PeshTools.core.fns.onupdated_hnd);
//        PeshToolsENV.tabs.onActivated.addListener(PeshTools.core.fns.onactivated_hnd);
//        PeshToolsENV.tabs.onRemoved.addListener(PeshTools.core.fns.onremoved_hnd);

        PeshToolsENV.webNavigation.onDOMContentLoaded.addListener(PeshTools.core.fns.ondomcontentloaded_hnd);

        PeshToolsENV.notifications.onButtonClicked.addListener(PeshTools.core.fns.notificationButtonClickCallback);
        PeshToolsENV.notifications.onClicked.addListener(PeshTools.core.fns.notificationClickCallback);
        PeshToolsENV.notifications.onClosed.addListener(PeshTools.core.fns.notificationCloseCallback);

        PeshTools.run.healhCheckIntervalId = window.setInterval(function ()
        {
            PeshTools.core.fns.healthCheck();
        }, 2000);
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
