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

/* global chrome, browser, HTMLElement */

/**
 * Встраиваемый сценарий PeshTools.
 * 
 * @since   0.1.0   2016-12-16
 * @version 0.5.0   2017-01-21
 * @date    2017-01-21
 * 
 * @returns {Void}
 */
(function () {
    PeshToolsENV = chrome || browser;
    PeshToolsDbg = false;

    PeshTools = {};

    PeshTools.embedded = {};
    PeshTools.embedded.fns = {};
    PeshTools.embedded.classes = {};


    /**
     * Выполняет запрос фильтров и конфигурации у фонового сценария.
     * 
     * @param {Boolean} scheduleUpdate
     * @param {Boolean} interaction Признак пользовательского взаимодействия,
     *  которое запустило процедуру обновления информации о списке заказов.
     * @return {Void}
     */
    PeshTools.embedded.fns.fetchRunDataRequest = function (forceUpdate, interaction)
    {
        PeshTools.embedded.fns.sendMessageWrapper({
            method: 'run.fetch',
            forceUpdate: forceUpdate,
            interaction: interaction,
            title: document.title
        }, PeshTools.embedded.fns.fetchRunDataResponseCallback);

    };

    // PeshTools.embedded.fns.fetchRunDataRequest = function (forceUpdate, interaction)


    /**
     * Обработчик ответа на запрос фильтров и конфигурации у фонового сценария.
     * 
     * @param {Object} response
     * @return {Void}
     */
    PeshTools.embedded.fns.fetchRunDataResponseCallback = function (response)
    {
        if (PeshTools.embedded.fns.detectBrokenPage())
        {
            return;
        }

        PeshToolsDbg && console.info('@ PeshTools.embedded.fns.fetchRunDataResponseCallback', response);

        PeshTools.run.config = response.config;
        PeshTools.run.debug = response.config.selfDebug;
        PeshToolsDbg = response.config.selfDebug;
        PeshTools.run.filters = response.filters;
        PeshTools.run.strings = response.strings;

        PeshToolsDbg && console.info(PeshTools.run.selfAutoupdate, response.config.selfAutoupdate);

        if (PeshTools.run.selfAutoupdate !== response.config.selfAutoupdate)
        {
            if (response.config.selfAutoupdate)
            {
                window.setTimeout(function ()
                {
                    PeshTools.embedded.fns.ticksStart();
                }, 0);
            } else
            {
                window.setTimeout(function ()
                {
                    PeshTools.embedded.fns.ticksStop();
                }, 0);
            }

            PeshTools.run.selfAutoupdate = response.config.selfAutoupdate;
        }

        PeshTools.embedded.fns.updateUI();

        if (!PeshTools.run.isOptionsPage())
        {
            PeshTools.embedded.fns.updateCourierBalance();
        }

        if (response.forceUpdate || response.config.selfAutoupdate)
        {
            return PeshTools.embedded.fns.update(response.interaction);
        }

        window.setTimeout(function ()
        {
            PeshTools.embedded.fns.resetCountdown();
        }, 0);
    };

    // PeshTools.embedded.fns.fetchRunDataResponseCallback = function (response)


    /**
     * Планирует обновление информации о списке заказов.
     * 
     * @param {Boolean} required
     * @return {Void}
     */
    PeshTools.embedded.fns.scheduleUpdate = function (forceUpdate)
    {
        if ('undefined' === typeof forceUpdate)
        {
            forceUpdate = false;
        }

        PeshToolsDbg && console.log('PeshTools.run :', PeshTools.run);

        PeshTools.embedded.fns.fetchRunDataRequest(forceUpdate);
    };

    // PeshTools.embedded.fns.scheduleUpdate = function (forceUpdate)


    /**
     * Обновление информации о списке заказов.
     * 
     * @return {Void}
     */
    PeshTools.embedded.fns.update = function (interaction)
    {
        interaction = !!interaction;

        PeshToolsDbg && console.info('@ PeshTools.embedded.fns.update()');

        // Формирования дат Вчера, Сегодня, Завтра.
        var todayDate = new Date();
        PeshTools.run.todayDate = todayDate;
        PeshTools.run.todayYmd = PeshTools.embedded.fns.dateYmd(todayDate);

        var tomorrowDate = new Date(new Date().getTime() + (24 * 60 * 60 * 1000));
        PeshTools.run.tomorrowDate = tomorrowDate;
        PeshTools.run.tomorrowYmd = PeshTools.embedded.fns.dateYmd(tomorrowDate);

        var yesterdayDate = new Date(new Date().getTime() - (24 * 60 * 60 * 1000));
        PeshTools.run.yesterdayDate = yesterdayDate;
        PeshTools.run.yesterdayYmd = PeshTools.embedded.fns.dateYmd(yesterdayDate);

        PeshToolsDbg && console.log('PeshTools.run :', PeshTools.run);

        // Отметка заказов как не представленных на странице.
        for (var orderId in PeshTools.run.orders)
        {
            PeshTools.run.orders[orderId].listed = false;
        }

        // Обработка всех таблиц на странице.
        var tables = document.getElementsByTagName('table');

        for (var i in tables)
        {
            PeshTools.embedded.fns.parseTable(tables[i]);
        }

        // Удаление заказов, не представленных на странице.
        for (var orderId in PeshTools.run.orders)
        {
            if (!PeshTools.run.orders[orderId].listed)
            {
                PeshToolsDbg && console.warn('Order not listed', orderId);
                PeshToolsDbg && console.log(PeshTools.run.orders[orderId]);

                delete PeshTools.run.orders[orderId];
            }
        }

        // Обнуление статистики.
        PeshTools.run.stats = {};

        for (var p in PeshTools.run.skel.stats)
        {
            if (!PeshTools.run.skel.stats.hasOwnProperty(p))
            {
                continue;
            }

            PeshTools.run.stats[p] = 0;
        }

        // Поиск обязательных фильтров.
        var haveRequired = false;
        var haveIncludes = false;

        for (var f in PeshTools.run.QuadStateFilters)
        {
            var filter = PeshTools.run.QuadStateFilters[f];

            haveRequired |= ('Require' === PeshTools.run.filters[filter]);
            haveIncludes |= ('Include' === PeshTools.run.filters[filter]);

            PeshToolsDbg && console.log(filter, PeshTools.run.filters[filter], haveRequired, haveIncludes);
        }

        haveRequired |= PeshTools.run.filters.minRealEarningApply;
        PeshToolsDbg && console.log('minRealEarningApply', PeshTools.run.filters.minRealEarningApply, haveRequired);

        haveRequired |= PeshTools.run.filters.maxFullPledgeApply;
        PeshToolsDbg && console.log('maxFullPledgeApply', PeshTools.run.filters.maxFullPledgeApply, haveRequired);

        haveRequired |= PeshTools.run.filters.maxDistanceApply;
        PeshToolsDbg && console.log('maxDistanceApply', PeshTools.run.filters.maxDistanceApply, haveRequired);

        var haveRequiredStrings = false;
        var haveIncludesStrings = false;
        for (var string in PeshTools.run.strings)
        {
            if (!PeshTools.run.strings.hasOwnProperty(string))
            {
                continue;
            }

            haveRequiredStrings |= ('Require' === PeshTools.run.strings[string]);
            haveIncludesStrings |= ('Include' === PeshTools.run.strings[string]);
        }

        haveRequiredStrings &= PeshTools.run.filters.execStrings;
        haveRequired |= haveRequiredStrings;
        haveIncludes |= haveIncludesStrings;

        PeshToolsDbg && console.info('haveRequired', haveRequired);
        PeshToolsDbg && console.info('haveIncludes', haveIncludes);

        // Применение фильтров к заказам.
        for (var orderId in PeshTools.run.orders)
        {
            if (null === PeshTools.run.orders[orderId])
            {
                continue;
            }

            PeshTools.run.stats.ordersOverall++;

            /** @var order PeshTools.embedded.classes.order */
            var order = PeshTools.run.orders[orderId];
            order.resetWichArrays();

            PeshToolsDbg && console.groupCollapsed(order.id);

            // Применение четырехзначных фильтров.
            for (var f in PeshTools.run.QuadStateFilters)
            {
                var filter = PeshTools.run.QuadStateFilters[f];

                PeshToolsDbg && console.log('filter', filter, PeshTools.run.filters[filter]);
                PeshToolsDbg && console.log('order[filter]', order[filter]);

                if (order[filter])
                {
                    PeshTools.run.stats[filter]++;

                    if ('Require' === PeshTools.run.filters[filter])
                    {
                        PeshToolsDbg && console.info('Require by', filter);

                        order.whichRequire.push(filter);
                    } else if ('Include' === PeshTools.run.filters[filter])
                    {
                        PeshToolsDbg && console.info('Include by', filter);

                        order.whichInclude.push(filter);
                    } else if ('Exclude' === PeshTools.run.filters[filter])
                    {
                        PeshToolsDbg && console.info('Exclude by', filter);

                        order.whichExclude.push(filter);
                    }
                } else if ('Require' === PeshTools.run.filters[filter])
                {
                    PeshToolsDbg && console.info('Exclude by required', filter);

                    order.whichExclude.push(filter);
                }
            }


            // Применение фильтра по строкам.
            for (var string in PeshTools.run.strings)
            {
                if (!PeshTools.run.strings.hasOwnProperty(string))
                {
                    continue;
                }

                if (-1 !== order.lowerText.indexOf(string))
                {
                    var filter = 'string' + string;
                    PeshTools.run.stats[filter]++;

                    if (!PeshTools.run.filters.execStrings)
                    {
                        continue;
                    }

                    if ('Require' === PeshTools.run.strings[string])
                    {
                        PeshToolsDbg && console.info('Require by', string);

                        order.whichRequire.push(filter);
                    } else if ('Include' === PeshTools.run.strings[string])
                    {
                        PeshToolsDbg && console.info('Include by', string);

                        order.whichInclude.push(filter);
                    } else if ('Exclude' === PeshTools.run.strings[string])
                    {
                        PeshToolsDbg && console.info('Exclude by', string);

                        order.whichExclude.push(filter);
                    }
                } else if ('Require' === PeshTools.run.strings[string])
                {
                    if (!PeshTools.run.filters.execStrings)
                    {
                        continue;
                    }

                    PeshToolsDbg && console.info('Exclude by required', string);

                    order.whichExclude.push(filter);
                }
            }


            // Применение фильтра минимального реального заработка.
            if (order.realEarning >= PeshTools.run.filters.minRealEarning)
            {
                PeshTools.run.stats.minRealEarning++;

                if (PeshTools.run.filters.minRealEarningApply)
                {
                    PeshToolsDbg && console.info('Require by minRealEarning');

                    order.whichRequire.push(filter);
                }
            } else
            {
                if (PeshTools.run.filters.minRealEarningApply)
                {
                    PeshToolsDbg && console.info('Exclude by minRealEarning');

                    order.whichExclude.push(filter);
                }
            }


            // Применение фильтра максимального полного залога.
            if (order.fullPledge <= PeshTools.run.filters.maxFullPledge)
            {
                if (PeshTools.run.filters.maxFullPledgeApply)
                {
                    PeshToolsDbg && console.info('Require by maxFullPledge');

                    order.whichRequire.push(filter);
                }
            } else
            {
                PeshTools.run.stats.maxFullPledge++;

                if (PeshTools.run.filters.maxFullPledgeApply)
                {
                    PeshToolsDbg && console.info('Exclude by maxFullPledge');

                    order.whichExclude.push(filter);
                }
            }


            // Применение фильтра максимальной дистанции.
            if (order.maxDistance <= PeshTools.run.filters.maxDistance)
            {
                if (PeshTools.run.filters.maxDistanceApply)
                {
                    PeshToolsDbg && console.info('Require by maxDistance');

                    order.whichRequire.push(filter);
                }
            } else
            {
                PeshTools.run.stats.maxDistance++;

                if (PeshTools.run.filters.maxDistanceApply)
                {
                    PeshToolsDbg && console.info('Exclude by maxDistance');

                    order.whichExclude.push(filter);
                }
            }


            // Применение фильтра максимального веса.
            if (order.weight <= PeshTools.run.filters.maxWeight)
            {
                if (PeshTools.run.filters.maxWeightApply)
                {
                    PeshToolsDbg && console.info('Require by maxWeight');

                    order.whichRequire.push(filter);
                }
            } else
            {
                PeshTools.run.stats.maxWeight++;

                if (PeshTools.run.filters.maxWeightApply)
                {
                    PeshToolsDbg && console.info('Exclude by maxWeight');

                    order.whichExclude.push(filter);
                }
            }

            PeshToolsDbg && console.groupEnd(order.id);
            PeshToolsDbg && console.log(order.id, haveRequired, order.whichRequire.length);
            PeshToolsDbg && console.log(order.id, haveIncludes, order.whichInclude.length);
            PeshToolsDbg && console.log(order.id, order.whichExclude.length);

            if (order.whichExclude.length)
            {
                PeshToolsDbg && console.info(order.id, 'hide by whichExclude');

                order.hide();
                continue;
            }

            if (haveRequired && !order.whichRequire.length)
            {
                PeshToolsDbg && console.info(order.id, 'hide by haveRequired && !whichRequire');

                order.hide();
                continue;
            }

            if (haveIncludes && !order.whichInclude.length)
            {
                PeshToolsDbg && console.info(order.id, 'hide by haveIncludes && !whichInclude');

                order.hide();
                continue;
            }

            PeshTools.run.stats.ordersVisible++;

            PeshToolsDbg && console.info(order.id, 'show');

            order.show();
            continue;
        }

        // for (var orderId in PeshTools.run.orders)


        // Запись статистики в соответствующие счетчики Стикера и Панели.
        PeshToolsDbg && console.info('PeshTools.run.stats :', PeshTools.run.stats);

        for (var c in PeshTools.run.stats)
        {
            if ('undefined' === typeof PeshTools.run.$[c + '_cnt'])
            {
                PeshToolsDbg && console.warn('No CNT element for ', c);
                continue;
            }

            PeshTools.run.$[c + '_cnt'].innerHTML = PeshTools.run.stats[c];
        }

        if (!PeshTools.run.isOptionsPage())
        {
            PeshTools.embedded.fns.sendMessageWrapper({
                method: 'stats.push',
                interaction: interaction,
                data: PeshTools.run.stats
            });
        }

        // Сброс счетчика следующего обновления.
        window.setTimeout(function ()
        {
            PeshTools.embedded.fns.resetCountdown();
        }, 0);
    };

    // PeshTools.embedded.fns.update = function (interaction)


    /**
     * Показывает заказ в списке (по идентификатору заказа).
     *
     * @param {Number} orderId
     * @return {Void}
     */
    PeshTools.embedded.fns.orderShowById = function (orderId)
    {
        if ('undefined' !== typeof PeshTools.run.orders[orderId])
        {
            PeshTools.run.orders[orderId].show();
        }
    };

    // PeshTools.embedded.fns.orderShowById = function (orderId)


    /**
     * Скрывает заказ из списка (по идентификатору заказа).
     *
     * @param {Number} orderId
     * @return {Void}
     */
    PeshTools.embedded.fns.orderHideById = function (orderId)
    {
        if ('undefined' !== typeof PeshTools.run.orders[orderId])
        {
            PeshTools.run.orders[orderId].hide();
        }
    };

    // PeshTools.embedded.fns.orderHideById = function (orderId)


    /**
     * Разбор HTML-таблицы со страницы списка заказов.
     *
     * @param {HTMLElement} table
     * @return {Void}
     */
    PeshTools.embedded.fns.parseTable = function (table)
    {
        try
        {
            // Обрабатываем только ELEMENT_NODE.
            if (!(table instanceof HTMLElement))
            {
                return;
            }

            var force = 'undefined' === typeof table.dataset.peshToolsSess ||
                    table.dataset.peshToolsSess !== PeshTools.run.sess;

            // Пропускаем таблицы с объявленным идентификатором заказа.
            if ('undefined' !== typeof table.dataset.peshToolsOrderId && !force)
            {
                PeshToolsDbg && console.info(table.dataset.peshToolsOrderId);
                PeshToolsDbg && console.log(PeshTools.run.orders[table.dataset.peshToolsOrderId]);

                // Отметка заказа как представленного в списке.
                var order = PeshTools.run.orders[table.dataset.peshToolsOrderId];
                order.listed = true;

                return;
            }

            // Проверка метки пропуска таблицы.
            if ('undefined' !== typeof table.dataset.peshToolsSkip && !force)
            {
                return;
            }

            // Попытка создания объекта заказа на базе обрабатываемой таблицы.
            var order = new PeshTools.embedded.classes.order(table);

            // Запись успешно созданного объекта заказа
            if (order.id)
            {
                PeshTools.run.orders[order.id] = order;
            }
        } catch (e)
        {
            console.error(e);
            table.dataset.peshToolsSkip = true;
        }
    };

    // PeshTools.embedded.fns.parseTable = function (table)


    /**
     * Обновление некоторых элементов интерфейса после изменения конфигурации.
     *
     * @return {Void}
     */
    PeshTools.embedded.fns.updateUI = function ()
    {
        PeshTools.embedded.fns.updateUIFilters();
        PeshTools.embedded.fns.updateUIStrings();
        PeshTools.embedded.fns.updateUIConfig();

        PeshTools.embedded.fns.updateSendStatisticsNote();

        if (PeshTools.run.isOptionsPage())
        {
            return;
        }

        if (PeshTools.run.config.showCommissionRate)
        {
            PeshTools.run.$body.className = PeshTools.run.$body.className.replace(/\s*peshToolsHideCommissionRate\s*/, '');
        } else
        {
            if (!/\s*peshToolsHideCommissionRate\s*/.test(PeshTools.run.$body.className))
            {
                PeshTools.run.$body.className += ' peshToolsHideCommissionRate';
            }
        }

        if (!PeshTools.run.config.hidePeshCountdowns)
        {
            PeshTools.run.$body.className = PeshTools.run.$body.className.replace(/\s*peshToolsHideCountdowns\s*/, '');
        } else
        {
            if (!/\s*peshToolsHideCountdowns\s*/.test(PeshTools.run.$body.className))
            {
                PeshTools.run.$body.className += ' peshToolsHideCountdowns';
            }
        }

        if (PeshTools.run.filters.fullPledgeMathDisplay)
        {
            PeshTools.run.$body.className = PeshTools.run.$body.className.replace(/\s*peshToolsHideFullPledgeMath\s*/, '');
        } else
        {
            if (!/\s*peshToolsHideFullPledgeMath\s*/.test(PeshTools.run.$body.className))
            {
                PeshTools.run.$body.className += ' peshToolsHideFullPledgeMath';
            }
        }

    };

    // PeshTools.embedded.fns.updateUI = function ()


    /**
     * Обновляет значения фильтров на панели.
     * 
     * @return {Void}
     * @since   0.4.0   2017-01-14
     */
    PeshTools.embedded.fns.updateUIFilters = function ()
    {
        for (var f in PeshTools.run.filters)
        {
            var value = PeshTools.run.filters[f];

            switch (f)
            {
                // int
                case 'maxFullPledge':
                case 'minRealEarning':

                // float
                case 'maxDistance':
                case 'maxWeight':
                    PeshTools.run.$[f].value = value;
                    break;

                    // checkbox
                case 'execStrings':
                case 'fullPledgeMathDisplay':
                case 'maxDistanceApply':
                case 'maxFullPledgeApply':
                case 'maxWeightApply':
                case 'minRealEarningApply':
                    PeshTools.run.$[f].checked = !!value;

                    switch (f)
                    {
                        case 'maxDistanceApply':
                        case 'maxFullPledgeApply':
                        case 'maxWeightApply':
                        case 'minRealEarningApply':
                            var inputId = f.replace(/(Apply)$/, '');
                            PeshTools.run.$[inputId].disabled = !value;
                            break;
                    }
                    break;

                    // quad-state
                case 'catchToday':
                case 'catchTomorrow':
                case 'catchOther':
                case 'dropToday':
                case 'dropTomorrow':
                case 'dropOther':
                case 'propAutocomplete':
                case 'propRecharge':
                case 'propBuyout':
                case 'propAirport':
                case 'propHooking':
                case 'propWagon':
                case 'propFragile':
                case 'propOversized':
                case 'propWaiting':
                case 'propPhotoOfShipment':
                case 'propPhotoOfCertificate':
                case 'propPhotoOfCheck':
                    PeshTools.run.$[f + value].checked = true;
                    break;
            }

        }
    };

    // PeshTools.embedded.fns.updateUIFilters = function ()


    /**
     * Обновляет список и настройки строк на панели.
     * 
     * @return {Void}
     * @since   0.4.0   2017-01-14
     */
    PeshTools.embedded.fns.updateUIStrings = function ()
    {
        // Итерация имеющихся строк для поиска удаленных.
        // Быстрее работать с кнопками удаления - там чистое значение строки есть в dataset.
        var buttons = document.getElementsByTagName('button');

        for (var b in buttons)
        {
            if (!/string.+?Delete/.test(buttons[b].id))
            {
                continue;
            }

            var string = buttons[b].dataset.value;

            if ('undefined' !== typeof PeshTools.run.strings[string])
            {
                continue;
            }

            var dl = PeshTools.run.$['string' + string + '_dl'];
            if ('undefined' === typeof dl)
            {
                continue;
            }

            dl.parentNode.removeChild(dl);

            delete PeshTools.run.$['string' + string + '_dl'];
            delete PeshTools.run.$['string' + string + '_cnt'];
            delete PeshTools.run.$['string' + string + 'Require'];
            delete PeshTools.run.$['string' + string + 'Bypass'];
            delete PeshTools.run.$['string' + string + 'Exclude'];
            delete PeshTools.run.$['string' + string + 'Delete'];
        }

        // Итерация списка слов для поиска добавленных.
        for (var string in PeshTools.run.strings)
        {
            if (!PeshTools.run.strings.hasOwnProperty(string))
            {
                continue;
            }

            var dl = PeshTools.run.$['string' + string + '_dl'];
            if ('undefined' !== typeof dl)
            {
                PeshTools.run.$['string' + string + PeshTools.run.strings[string]].checked = true;
                continue;
            }

            var stringRow = PeshTools.embedded.fns.bootstrapUIFiltersDrawStringsListItem(string);
            PeshTools.run.$.strings_fs.appendChild(stringRow);
        }
    };

    // PeshTools.embedded.fns.updateUIStrings = function ()


    /**
     * Обновляет значения опций на панели.
     * 
     * @return {Void}
     * @since   0.4.0   2017-01-14
     */
    PeshTools.embedded.fns.updateUIConfig = function ()
    {
        for (var c in PeshTools.run.config)
        {
            var value = PeshTools.run.config[c];
            switch (c)
            {
                case "selfAutoupdate":
                case "hidePeshCountdowns":
                case "showCommissionRate":
                case "showSelfCountdown":
                case "sendStatistics":
                case "selfDebug":
                    PeshTools.run.$[c].checked = !!value;
                    break;

                case "badgeBlinking":
                    PeshTools.run.$[c + value].checked = true;
                    break;
            }
        }
    };

    // PeshTools.embedded.fns.updateUIConfig = function ()


    /**
     * Обновляет информацию о балансе и статусе верфицикации курьера.
     * 
     * @return {Void}
     * @since   0.4.0   2017-01-14
     */
    PeshTools.embedded.fns.updateCourierBalance = function ()
    {
        // Поиск источников, если они не заданы.
        if (!PeshTools.run.$courierBalanceNode || !PeshTools.run.$courierVerifiedNode)
        {
            var searchCourierBalance = true;
            var searchCourierVerified = true;

            var aElements = document.getElementsByTagName('a');

            for (var i in aElements)
            {
                if (!searchCourierBalance && !searchCourierVerified)
                {
                    break;
                }

                var a = aElements[i];

                if ('undefined' === typeof a.href)
                {
                    continue;
                }

                // http://peshkariki.ru/user/profile.html a.parentNode.title
                // Верифицированный курьер
                if (searchCourierVerified && 'http://peshkariki.ru/user/profile.html' === a.href)
                {
                    if ('Верифицированный курьер' === a.parentNode.title)
                    {
                        searchCourierVerified = false;

                        PeshTools.run.$courierVerifiedNode = a.parentNode;
                    }

                    continue;
                }

                // http://peshkariki.ru/user/balance.html a.title
                // Ваш баланс: 0 руб.
                if (searchCourierBalance && 'http://peshkariki.ru/user/balance.html' === a.href)
                {
                    if (/Ваш баланс: (-?\d+) руб\./.test(a.title))
                    {
                        searchCourierBalance = false;

                        PeshTools.run.$courierBalanceNode = a;
                    }


                    continue;
                }
            }
        }

        // Запоминаем прошлое значение полного баланса курьера.
        var oldCourierBalanceFull = PeshTools.run.courierBalanceFull;

        // Проверка статуса верификации курьера.
        if (null !== PeshTools.run.$courierVerifiedNode)
        {
            PeshTools.run.courierVerified = 'Верифицированный курьер' === PeshTools.run.$courierVerifiedNode.title;
        }

        // Извлечение информации о текущем балансе курьера.
        var m = /Ваш баланс: (-?\d+) руб\./.exec(PeshTools.run.$courierBalanceNode.title);

        if (m)
        {
            PeshTools.run.courierBalance = Number.parseInt(m[1]);
        } else
        {
            throw 'Unable to update courier info';
        }

        // Вычисление полного баланса курьера.
        PeshTools.run.courierBalanceFull = PeshTools.run.courierBalance;
        if (PeshTools.run.courierVerified)
        {
            PeshTools.run.courierBalanceFull += 5000;
        }

        // Если значение полного баланса изменилось...
        if (oldCourierBalanceFull !== PeshTools.run.courierBalanceFull)
        {
            for (var orderId in PeshTools.run.orders)
            {
                // Обновляем информацию о выходном балансе заказа.
                PeshTools.run.orders[orderId].updateClosingBalance();
            }
        }
    };

    // PeshTools.embedded.fns.updateCourierBalance = function ()


    /**
     * Обработчик сообщений от фонового скрипта.
     * 
     * @param {Object} request
     * @param {MessageSender} sender
     * @param {Function} responseCallback
     * @returns {Void}
     */
    PeshTools.embedded.fns.onmessage_hnd = function (request, sender, responseCallback)
    {
        PeshToolsDbg && console.info('@ PeshTools.embedded.fns.onmessage_hnd()', request, sender, responseCallback);

        switch (request.method)
        {
            /**
             * Обновление информации о списке заказов.
             */
            case 'update.run':
                if ('undefined' === typeof request.interaction)
                {
                    request.interaction = false;
                }

                PeshTools.embedded.fns.fetchRunDataRequest(true, request.interaction);
                break;

                /**
                 * Пинг фоновым сценарием встраиваемого.
                 */
            case 'noop.ping':
                responseCallback(request.bypass);
                break;

        }
    };

    // PeshTools.embedded.fns.onmessage_hnd = function (request, sender, responseCallback)


    /**
     * Возвращает дату в формате YYYY-mm-dd.
     *
     * @param {Date} date
     * @returns {String}
     */
    PeshTools.embedded.fns.dateYmd = function (date)
    {
        var dateDate = date.getDate();
        var dateMonth = date.getMonth() + 1;
        var dateYear = date.getFullYear();

        return dateYear + '-' + dateMonth + '-' + dateDate;
    };

    // PeshTools.embedded.fns.onmessage_hnd = function (request)


    /**
     * Разбор строки даты-времени и конвертация в объект типа Date.
     *
     * @param {Array} dateMatch
     * @returns {Date|Boolean}
     */
    PeshTools.embedded.fns.dateParse = function (dateMatch)
    {
        if (!dateMatch)
        {
            return false;
        }

        switch (dateMatch[2])
        {
            case 'января':
                dateMatch[2] = 0;
                break;

            case 'февраля':
                dateMatch[2] = 1;
                break;

            case 'марта':
                dateMatch[2] = 2;
                break;

            case 'апреля':
                dateMatch[2] = 3;
                break;

            case 'мая':
                dateMatch[2] = 4;
                break;

            case 'июня':
                dateMatch[2] = 5;
                break;

            case 'июля':
                dateMatch[2] = 6;
                break;

            case 'августа':
                dateMatch[2] = 7;
                break;

            case 'сентября':
                dateMatch[2] = 8;
                break;

            case 'октября':
                dateMatch[2] = 9;
                break;

            case 'ноября':
                dateMatch[2] = 10;
                break;

            case 'декабря':
                dateMatch[2] = 11;
                break;

        }

        var returnDate = new Date;

        returnDate.setDate(dateMatch[1]);
        returnDate.setMonth(dateMatch[2]);
        returnDate.setHours(dateMatch[3]);
        returnDate.setMinutes(dateMatch[4]);
        returnDate.setSeconds(0);

        return returnDate;
    };

    // PeshTools.embedded.fns.dateParse = function (dateMatch)


    /**
     * Класс заказа.
     *
     * @param {HTMLElement} orderTable
     */
    PeshTools.embedded.classes.order = function (orderTable)
    {
        var force = 'undefined' === typeof orderTable.dataset.peshToolsSess ||
                orderTable.dataset.peshToolsSess !== PeshTools.run.sess;

        /**
         * Идентификатор заказа.
         *
         * @type {Null|Number}
         */
        this.id = null;

        /**
         * Признак наличия заказа в списке.
         *
         * @type {Boolean}
         */
        this.listed = true;

        /**
         * Ссылка на HTML-элемент TABLE заказа.
         *
         * @type {HTMLElement}
         */
        this.$table = orderTable;

        /**
         * Ссылка на HTML-элемент TBODY таблицы заказа.
         *
         * @type {Null|HTMLElement}
         */
        this.$body = null;

        /**
         * Ссылка на HTML-элемент SPAN обратного отсчета времени забора заказа.
         *
         * @type {Null|HTMLElement}
         */
        this.$cd = null;

        /**
         * Ссылка на HTML-элемент A крестика сокрытия заказа.
         *
         * @type {Null|HTMLElement}
         */
        this.$cross = null;

        /**
         * Ссылка на HTML-элемент STRONG прогноза исходящего баланса.
         *
         * @type {Null|HTMLElement}
         */
        this.$closingBalance = null;

        /**
         * Ссылка на HTML-элемент SPAN прогноза реального исходящего баланса.
         *
         * @type {Null|HTMLElement}
         */
        this.$realClosingBalance = null;

        /**
         * Объявленный заработок курьера.
         *
         * @type {Number}
         */
        this.earning = 0;

        /**
         * Реальный заработок курьера.
         *
         * Объявленный заработок минус комиссия.
         *
         * @type {Number}
         */
        this.realEarning = 0;

        /**
         * Реальный заработок за каждый адрес доставки.
         *
         * Реальный заработок поделенный на количество адресов доставки.
         *
         * @type {Number}
         */
        this.earningPerDrop = 0;

        /**
         * Комиссия за взятие заказа.
         *
         * @type {Number}
         */
        this.commission = 0;

        /**
         * Процент комиссии относительно объявленного заработка курьера.
         *
         * @type {Number}
         */
        this.commissionRate = 0;

        /**
         * Сумма залога.
         *
         * @type {Number}
         */
        this.pledge = 0;

        /**
         * Полная сумма залога.
         *
         * Сумма залога плюс комиссия за взятие заказа.
         *
         * @type {Number}
         */
        this.fullPledge = 0;

        /**
         * Признак забора сегодня.
         *
         * @type {Boolean}
         */
        this.catchToday = false;

        /**
         * Признак забора завтра.
         *
         * @type {Boolean}
         */
        this.catchTomorrow = false;

        /**
         * Признак забора в другой день.
         *
         * @type {Boolean}
         */
        this.catchOther = false;

        /**
         * Список адресов доставки груза.
         *
         * @type {Object}
         */
        this.drops = {};

        /**
         * Общее число адресов доставки.
         *
         * @type {Number}
         */
        this.dropsOverall = 0;

        /**
         * Число адресов с доставкой сегодня.
         *
         * @type {Number}
         */
        this.dropsToday = 0;

        /**
         * Число адресов с доставкой завтра.
         *
         * @type {Number}
         */
        this.dropsTomorrow = 0;

        /**
         * Число адресов с доставкой в другие дни.
         *
         * @type {Number}
         */
        this.dropsOther = 0;

        /**
         * Признак доставки сегодня.
         *
         * @type {Boolean}
         */
        this.dropToday = false;

        /**
         * Признак доставки завтра.
         *
         * @type {Boolean}
         */
        this.dropTomorrow = false;

        /**
         * Признак доставки в другие дни.
         *
         * @type {Boolean}
         */
        this.dropOther = false;

        /**
         * Автозавершение заказа.
         *
         * @type {Boolean}
         */
        this.propAutocomplete = false;

        /**
         * Гонорар на баланс в Пешкариках.
         *
         * @type {Boolean}
         */
        this.propRecharge = false;

        /**
         * Выкуп товара.
         *
         * @type {Boolean}
         */
        this.propBuyout = false;

        /**
         * Доставка в аэропорт.
         *
         * @type {Boolean}
         */
        this.propAirport = false;

        /**
         * Аренда курьера.
         *
         * @type {Boolean}
         */
        this.propHooking = false;

        /**
         * Курьер на автомобиле.
         *
         * @type {Boolean}
         */
        this.propWagon = false;

        /**
         * Хрупкий груз.
         *
         * @type {Boolean}
         */
        this.propFragile = false;

        /**
         * Неудобный груз.
         *
         * @type {Boolean}
         */
        this.propOversized = false;

        /**
         * Дополнительное ожидание.
         *
         * @type {Boolean}
         */
        this.propWaiting = false;

        /**
         * Фото акта выполненных работ.
         *
         * @type {Boolean}
         */
        this.propPhotoOfCertificate = false;

        /**
         * Фото чека.
         *
         * @type {Boolean}
         */
        this.propPhotoOfCheck = false;

        /**
         * Фото груза.
         *
         * @type {Boolean}
         */
        this.propPhotoOfShipment = false;

        /**
         * Отправка почтой России.
         * 
         * @type {Boolean}
         */
        this.propPostOffice = false;

        /**
         * Минимальная дистанция от метро до точки забора/доставки.
         *
         * @type {Number}
         */
        this.minDistance = 999.0;

        /**
         * Максимальная дистанция от метро до точки забора/доставки.
         *
         * @type {Number}
         */
        this.maxDistance = 0.0;

        /**
         * Персональный заказ.
         * 
         * @type {Boolean}
         */
        this.propPersonal = false;

        /**
         * Вес груза в кг.
         *
         * @type {Number}
         */
        this.weight = 0;

        /**
         * Текст полей "откуда забрать", "куда доставить" и "что везем".
         *
         * @type {String}
         */
        this.lowerText = '';

        /**
         * Список фильтров, явно скрывающих заказ.
         * 
         * @type {Array}
         */
        this.whichExclude = [];

        /**
         * Список фильтров, допускающих заказ к отображению. Логика "ИЛИ".
         * 
         * @type {Array}
         */
        this.whichInclude = [];

        /**
         * Список фильтров, требующих заказ к отображению. Логика "И".
         * 
         * @type {Array}
         */
        this.whichRequire = [];


        /**
         * Очищает списки фильтров.
         * 
         * @return {Void}
         * @since   0.5.0   2017-01-20
         */
        this.resetWichArrays = function ()
        {
            this.whichExclude = [];
            this.whichInclude = [];
            this.whichRequire = [];
        };

        // this.resetWichArrays = function ()


        /**
         * Скрывает заказ из списка.
         * 
         * @since   0.5.0   2017-01-20
         * Перенесен из метода <code>PeshTools.embedded.fns.orderHide()</code>.
         */
        this.hide = function ()
        {
            if (!/peshToolsHide/.test(this.$table.className))
            {
                this.$table.className += ' peshToolsHide';
            }
        };

        // this.hide = function ()


        /**
         * Показывает заказ в списке.
         * 
         * @since   0.5.0   2017-01-20
         * Перенесен из метода <code>PeshTools.embedded.fns.orderShow()</code>.
         */
        this.show = function ()
        {
            if (/peshToolsHide/.test(this.$table.className))
            {
                this.$table.className = this.$table.className.replace(/\s*peshToolsHide\s*/, '');
            }
        };

        // this.show = function ()


        /**
         * Обновляет прогнозы по исходящим балансам.
         * 
         * @return {Void}
         * @since   0.4.0   2017-01-14
         */
        this.updateClosingBalance = function ()
        {
            var closingBalance = PeshTools.run.courierBalanceFull - this.fullPledge;
            var realClosingBalance = PeshTools.run.courierBalance - this.fullPledge;

            this.$closingBalance.innerHTML = closingBalance;
            this.$closingBalance.className = 'peshToolsClosingBalance' +
                    (0 < closingBalance ? 'Posi' : 'Nega') + 'tive';

            this.$realClosingBalance.innerHTML = realClosingBalance;
            this.$realClosingBalance.className = 'peshToolsClosingBalance' +
                    (0 < realClosingBalance ? 'Posi' : 'Nega') + 'tive';
        };

        // this.updateClosingBalance = function ()


        /*************************
         *
         * Инициализация объекта.
         *
         *************************/

        // Обрабатываем только ELEMENT_NODE
        if (!(orderTable instanceof HTMLElement))
        {
            return;
        }

        // Проверка классов, свойственных заказу.
        if (!/order(Block|Desc)/.test(orderTable.className))
        {
            // Пропускаем эту таблицу в будущем.
            orderTable.dataset.peshToolsSkip = true;

            return;
        }

        // Попытка разбора идентификатора заказа.
        var orderIdMatch = /order_table_(\d+)/.exec(orderTable.id);


        if (null !== orderIdMatch)
        {
            this.id = Number.parseInt(orderIdMatch[1]);
        } else
        {
            // Заказ без идентификатора? Может быть еще и арендой курьера.
            var orderFirstTd = orderTable.getElementsByTagName('td')[0];
            var tdMatch = /Заказ\s+(\d+).+?аренда курьера/.exec(orderFirstTd.innerText);

            if (!tdMatch)
            {
                // И не аренда...
                // Пропускаем эту таблицу в будущем.
                orderTable.dataset.peshToolsSkip = true;

                PeshToolsDbg && console.error('Not a valid order');
                return;
            }

            this.propHooking = true;
            this.id = Number.parseInt(tdMatch[1]);
        }

        // проверка необходимости обработки таблицы
        if (orderTable.dataset.peshToolsTag && !force)
        {
            // таблица не менялась
            return;
        }

        var orderBody = orderTable.getElementsByTagName('tbody')[0];
        this.$body = orderBody;

        var dropsBlock = null;
        var commissionBlock = null;
        var earningBlock = null;

        // Итерация строк таблицы заказа.
        for (var i in orderBody.childNodes)
        {
            if (!(orderBody.childNodes[i] instanceof HTMLElement))
            {
                continue;
            }

            var currentTr = orderBody.childNodes[i];
            var currentField = currentTr.getElementsByTagName('td')[0];
            var currentValue = currentTr.getElementsByTagName('td')[1];

            // Поиск признака персонального заказа.
            if (/персональный заказ/.test(currentField.innerText))
            {
                this.propPersonal = true;

                continue;
            }


            // Разбор точки забора груза.
            if ('Откуда забрать:' === currentField.innerText)
            {
                var catchDateMatch = /.*?\[.*?\(?(\d+) (.+?)\)? с (\d+).*? до (\d+)(:(\d+))?.*\].*?/.exec(currentValue.innerText);

                if (!catchDateMatch)
                {
                    continue;
                }

                var callDateMatch = [
                    catchDateMatch[0],
                    catchDateMatch[1],
                    catchDateMatch[2],
                    catchDateMatch[3],
                    '00',
                    '00'
                ];

                var catchDate = PeshTools.embedded.fns.dateParse(callDateMatch);

                this.catchYmd = PeshTools.embedded.fns.dateYmd(catchDate);
                this.catchToday = (this.catchYmd === PeshTools.run.todayYmd);
                this.catchTomorrow = (this.catchYmd === PeshTools.run.tomorrowYmd);
                this.catchOther = !(this.catchToday || this.catchTomorrow);

                this.lowerText += currentValue.innerText.toLowerCase() + "\n";

                var catchDistanceMatch = /^м\..*?(\d+\.\d)\s+км,/.exec(currentValue.innerText);

                if (!catchDistanceMatch)
                {
                    continue;
                }

                var catchDistance = Number.parseFloat(catchDistanceMatch[1]);

                this.minDistance = Math.min(this.minDistance, catchDistance);
                this.maxDistance = Math.max(this.maxDistance, catchDistance);

                var cdb = currentValue.getElementsByTagName('b')[0];

                if (cdb)
                {
                    this.$cd = cdb.parentNode;
                    this.$cd.className += ' peshToolsCountDown';
                }

                continue;
            }


            // Разбор точек доставки груза.
            if ('Куда доставить:' === currentField.innerText)
            {
                this.dropsOverall = currentValue.childElementCount;

                dropsBlock = currentValue;

                for (var j in currentValue.childNodes)
                {
                    var dropData = currentValue.childNodes[j].innerText;

                    var dropDateMatch = /.*?\[.*?\(?(\d+) (.+?)\)? с (\d+).*? до (\d+)(:(\d+))?.*\].*?/.exec(dropData);

                    if (!dropDateMatch)
                    {
                        continue;
                    }

                    var callDateMatch = [
                        dropDateMatch[0],
                        dropDateMatch[1],
                        dropDateMatch[2],
                        dropDateMatch[3],
                        '00',
                        '00'
                    ];

                    var dropDate = PeshTools.embedded.fns.dateParse(dropDateMatch);

                    var thisDropYmd = PeshTools.embedded.fns.dateYmd(dropDate);
                    var thisDropToday = (thisDropYmd === PeshTools.run.todayYmd);
                    var thisDropTomorrow = (thisDropYmd === PeshTools.run.tomorrowYmd);
                    var thisDropOther = !(thisDropToday || thisDropTomorrow);

                    this.dropsToday += (thisDropToday ? 1 : 0);
                    this.dropsTomorrow += (thisDropTomorrow ? 1 : 0);
                    this.dropsOther += (thisDropOther ? 1 : 0);

                    var dropDistanceMatch = /^м\..*?(\d+\.\d)\s+км,/i.exec(dropData);

                    if (!dropDistanceMatch)
                    {
                        continue;
                    }

                    var dropDistance = Number.parseFloat(dropDistanceMatch[1]);

                    this.minDistance = Math.min(this.minDistance, dropDistance);
                    this.maxDistance = Math.max(this.maxDistance, dropDistance);
                }

                this.dropToday = !!this.dropsToday;
                this.dropTomorrow = !!this.dropsTomorrow;
                this.dropOther = !!this.dropsOther;

                this.lowerText += currentValue.innerText.toLowerCase() + "\n";

                continue;
            }


            // Разбор информации о грузе.
            if ('Что везем:' === currentField.innerText)
            {
                this.lowerText += currentValue.innerText.toLowerCase() + "\n";

                continue;
            }


            // Разбор свойств заказа.
            if ('Обратите внимание:' === currentField.innerText)
            {
                if (/Сделать фото чека/.test(currentValue.innerText))
                {
                    this.propPhotoOfCheck = true;
                }

                if (/Сделать фото акта выполненных работ/.test(currentValue.innerText))
                {
                    this.propPhotoOfCertificate = true;
                }

                if (/Сделать фото товара/.test(currentValue.innerText))
                {
                    this.propPhotoOfShipment = true;
                }

                if (/Требуется доставка в аэропорт/.test(currentValue.innerText))
                {
                    this.propAirport = true;
                }

                if (/Нужен курьер на автомобиле/.test(currentValue.innerText))
                {
                    this.propWagon = true;
                }

                if (/Неудобный груз/.test(currentValue.innerText))
                {
                    this.propOversized = true;
                }

                if (/Ожидание примерки/.test(currentValue.innerText))
                {
                    this.propWaiting = true;
                }

                if (/Осторожно! Хрупкий груз/.test(currentValue.innerText))
                {
                    this.propFragile = true;
                }

                if (/Требуется выкуп товара/.test(currentValue.innerText))
                {
                    this.propBuyout = true;
                }

                if (/Отправка почтой России/.test(currentValue.innerText))
                {
                    this.propPostOffice = true;
                }

                this.lowerText += currentValue.innerText.toLowerCase() + "\n";

                continue;
            }


            // Разбор данных.
            if ('Данные:' === currentField.innerText)
            {
                var commissionData = /Комиссия:\s+(\d+)\s+руб./.exec(currentValue.innerText);
                this.commission = Number.parseInt(commissionData[1]);
                commissionBlock = currentValue;

                var pledgeData = /Залог:\s+(\d+)\s+руб./.exec(currentValue.innerText);
                this.pledge = Number.parseInt(pledgeData[1]);

                this.fullPledge = this.pledge + this.commission;

                var weightData = /Масса:\s+(\d+)\s+г./.exec(currentValue.innerText);
                if (weightData)
                {
                    this.weight = Number.parseFloat((weightData[1] / 1000).toFixed(3));
                }

                var rocket = currentValue.getElementsByClassName('fs1')[0];
                if (rocket && "Заказ автоматически завершится при введении кода, который знает получатель" === rocket.title)
                {
                    this.propAutocomplete = true;
                }

                continue;
            }


            // Разбор заработка.
            if ('Ваш заработок:' === currentField.innerText)
            {
                earningBlock = currentValue;

                var earningData = /(\d+)\s+руб./.exec(currentValue.innerText);

                this.earning = Number.parseInt(earningData[1]);
                this.realEarning = this.earning - this.commission;

                this.commissionRate = ((this.commission / this.earning) * 100).toFixed(0);
                this.earningPerDrop = (this.realEarning / this.dropsOverall).toFixed(0);

                if (/на баланс в Пешкариках/.test(currentValue.innerText))
                {
                    this.propRecharge = true;
                }

                continue;
            }
        }

        // for (var i in orderBody.childNodes)


        // Добавление экстраданных.

        if (dropsBlock)
        {
            // Для не "Аренды курьера" - количество адресов доставки.
            var dropsDiv = document.createElement('div');
            dropsDiv.id = 'peshToolsExtra' + this.id + 'Drops';
            dropsDiv.className = 'peshToolsDrops';
            dropsDiv.innerHTML = 'Итого адресов: <strong>' + this.dropsOverall + '</strong>';
            dropsBlock.appendChild(dropsDiv);
        }

        // Процент комиссии.
        var commissionSup = document.createElement('sup');
        commissionSup.id = 'peshToolsExtra' + this.id + 'Commission';
        commissionSup.className = 'peshToolsCommission';
        commissionSup.innerText = '{ ' + Math.round(this.commissionRate, 4) + '% }';
        commissionBlock.innerHTML = commissionBlock.innerHTML.replace(/(Комиссия.+?руб.)/, '$1' + commissionSup.outerHTML);

        // Математика залога. Заготовка.
        var fullPledgeMathSrc = document.createElement('span');
        fullPledgeMathSrc.id = 'peshToolsExtra' + this.id + 'FullPledgeMath';
        fullPledgeMathSrc.className = 'peshToolsExtraFullPledgeMath';
        commissionBlock.innerHTML = commissionBlock.innerHTML.replace(/(Комиссия.+?руб\..+?<\/sup>)/, '$1' + fullPledgeMathSrc.outerHTML);
        var fullPledgeMath = document.getElementById(fullPledgeMathSrc.id);

        // Математика залога. Полный залог.
        var fullPledgeSpan = document.createElement('span');
        fullPledgeSpan.id = 'peshToolsExtra' + this.id + 'FullPledge';
        fullPledgeSpan.className = 'peshToolsPledge';
        fullPledgeSpan.title = 'Сумма залога и комиссии';
        fullPledgeSpan.innerText = 'Σ=' + this.fullPledge + ', ';

        // Математика залога. Выходные балансы.
        var closingBalanceStrong = document.createElement('strong');
        closingBalanceStrong.id = 'peshToolsExtra' + this.id + 'ClosingBalance';
        closingBalanceStrong.className = 'peshToolsClosingBalance';
        closingBalanceStrong.title = 'Прогноз выходного баланса (с учетом статуса верификации курьера).';
        this.$closingBalance = closingBalanceStrong;

        var realClosingBalanceSpan = document.createElement('span');
        realClosingBalanceSpan.id = 'peshToolsExtra' + this.id + 'RealClosingBalance';
        realClosingBalanceSpan.className = 'peshToolsRealClosingBalance';
        realClosingBalanceSpan.title = 'Прогноз выходного баланса (того самого, что на вкладке написан)';
        this.$realClosingBalance = realClosingBalanceSpan;

        fullPledgeSpan.appendChild(closingBalanceStrong);
        fullPledgeSpan.appendChild(realClosingBalanceSpan);
        fullPledgeMath.appendChild(fullPledgeSpan);

        this.updateClosingBalance();

        if (!this.propHooking)
        {
            // Для не "Аренды курьера" - реальный заработок и реальный заработок на адрес доставки.
            var earningDiv = document.createElement('div');
            earningDiv.id = 'peshToolsExtra' + this.id + 'Eranings';
            earningDiv.className = 'peshToolsEarning';
            earningDiv.innerHTML = '<strong>' + this.realEarning + '</strong> <sub>(' + this.earningPerDrop + ')</sub>';
            earningBlock.appendChild(earningDiv);
        }

        // Кнопка безопасного сокрытия заказа.
        var td = orderBody.getElementsByTagName('td')[1];
        var div = document.createElement('div');
        div.id = 'peshToolsExtra' + this.id + 'SafeHideWrapper';
        div.className = 'peshToolsSafeHideWrapper';
        var btn = document.createElement('button');
        btn.id = 'peshToolsExtra' + this.id + 'SafeHide';
        btn.innerHTML = 'Ⓧ';
        btn.dataset.orderId = this.id;

        btn.addEventListener('click', PeshTools.embedded.fns.safeHideOrder_hnd);

        div.appendChild(btn);
        td.appendChild(div);

        this.$cross = td.getElementsByTagName('a')[0];


        // Пара отметок об успешной обработке таблицы заказа.
        this.$table.dataset.peshToolsTag = Math.random();
        this.$table.dataset.peshToolsOrderId = this.id;
        this.$table.dataset.peshToolsSess = PeshTools.run.sess;
    };

    // PeshTools.embedded.classes.order = function (orderTable)


    /**
     * Обработчик клика по кнопке безопасного сокрытия заказа.
     * 
     * @return {Void}
     * @since   0.5.0   2017-01-21
     */
    PeshTools.embedded.fns.safeHideOrder_hnd = function ()
    {
        var orderId = this.dataset.orderId;

        if ('undefined' === typeof PeshTools.run.orders[orderId])
        {
            return;
        }

        PeshTools.run.orders[orderId].$cross.click();
    };

    // PeshTools.embedded.fns.safeHideOrder_hnd = function ()


    /**
     * Открывает или закрывает Панель фильтров.
     *
     * @return {Void}
     */
    PeshTools.embedded.fns.togglePanelState = function ()
    {
        if ('collapsed' === PeshTools.run.$panel.className)
        {
            PeshTools.run.$panel.className = 'expanded';
            PeshTools.run.$panelStickerLogo.src = PeshToolsENV.extension.getURL('/img/peshtools.png');
        } else
        {
            PeshTools.run.$panel.className = 'collapsed';
            PeshTools.run.$panelStickerLogo.src = PeshToolsENV.extension.getURL('/img/peshtools-blue.png');
        }

        PeshTools.embedded.fns.sendMessageWrapper({
            method: 'ga.pageview',
            page: '/embedded#panel-' + PeshTools.run.$panel.className,
            referrer: document.location.href,
            title: document.title
        });
    };

    // PeshTools.embedded.fns.togglePanelState = function ()


    /**
     * Начальная загрузка: отрисовка интерфейса (в режиме встраиваемого сценария).
     *
     * @return {Void}
     */
    PeshTools.embedded.fns.bootstrapUIModeEmbedded = function ()
    {
        PeshTools.embedded.fns.sendMessageWrapper({
            method: 'ga.pageview',
            page: '/embedded',
            referrer: document.referrer,
            title: document.title
        });

        PeshTools.run.aliveIntervalId = window.setInterval(function () {
            PeshTools.embedded.fns.sendMessageWrapper({
                method: 'ga.pageview',
                nonInteraction: 1,
                page: '/embedded#alive+panel-' + PeshTools.run.$panel.className,
                referrer: document.location.href,
                title: document.title
            });
        }, 60000);

        var panel = document.createElement('div');
        panel.id = 'peshTools';
        panel.className = 'collapsed';
        PeshTools.run.$panel = panel;

        var panelSticker = document.createElement('div');
        panelSticker.id = 'peshToolsSticker';
        PeshTools.run.$panelSticker = panelSticker;

        var panelStickerLogo = document.createElement('img');
        panelStickerLogo.id = 'peshToolsStickerLogo';
        panelStickerLogo.src = PeshToolsENV.extension.getURL('/img/peshtools-blue.png');
        panelStickerLogo.addEventListener('click', PeshTools.embedded.fns.togglePanelState);
        PeshTools.run.$panelStickerLogo = panelStickerLogo;

        var panelStickerStat = document.createElement('div');
        panelStickerStat.id = 'peshToolsStickerStat';
        PeshTools.run.$panelStickerStat = panelStickerStat;

        var ordersVisible_cnt = document.createElement('span');
        ordersVisible_cnt.id = 'ordersVisible_cnt';
        ordersVisible_cnt.innerHTML = '∞';
        PeshTools.run.$.ordersVisible_cnt = ordersVisible_cnt;

        var panelStickerStatVisible = document.createElement('span');
        panelStickerStatVisible.id = 'peshToolsStickerStatVisible';
        panelStickerStatVisible.appendChild(ordersVisible_cnt);
        PeshTools.run.$panelStickerStatVisible = panelStickerStatVisible;

        var ordersOverall_cnt = document.createElement('span');
        ordersOverall_cnt.id = 'ordersOverall_cnt';
        ordersOverall_cnt.innerHTML = '∞';
        PeshTools.run.$.ordersOverall_cnt = ordersOverall_cnt;
        ordersOverall_cnt.addEventListener('click', function () {
            PeshTools.embedded.fns.scheduleUpdate(true);
        });

        var panelStickerStatOverall = document.createElement('span');
        panelStickerStatOverall.id = 'peshToolsStickerStatOverall';
        panelStickerStatOverall.appendChild(ordersOverall_cnt);
        PeshTools.run.$panelStickerStatOverall = panelStickerStatOverall;

        var panelFilters = document.createElement('div');
        panelFilters.id = 'peshToolsFilters';
        PeshTools.run.$panelFilters = panelFilters;

        var panelStickerCountdown = document.createElement('span');
        panelStickerCountdown.id = 'peshToolsStickerCountdown';
        panelStickerCountdown.innerHTML = '⌛';
        PeshTools.run.$panelStickerCountdown = panelStickerCountdown;

        panelStickerStat.appendChild(panelStickerStatVisible);
        panelStickerStat.appendChild(panelStickerStatOverall);
        panelSticker.appendChild(panelStickerLogo);
        panelSticker.appendChild(panelStickerStat);
        panelSticker.appendChild(panelStickerCountdown);
        panel.appendChild(panelSticker);
        panel.appendChild(panelFilters);
        PeshTools.run.$body.appendChild(panel);

        PeshTools.embedded.fns.bootstrapUIFilters();

        PeshTools.embedded.fns.updateUI();
        PeshTools.embedded.fns.updateCourierBalance();

        document.addEventListener('selectionchange', PeshTools.embedded.fns.onSelectionChange);
    };

    // PeshTools.embedded.fns.bootstrapUIModeEmbedded = function ()


    /**
     * Начальная загрузка: отрисовка интерфейса (в режиме страницы кофигурации).
     *
     * @return {Void}
     */
    PeshTools.embedded.fns.bootstrapUIModeOptions = function ()
    {
        PeshTools.embedded.fns.sendMessageWrapper({
            method: 'ga.pageview',
            page: '/options',
            referrer: document.referrer,
            title: 'PeshTools-Options'
        });

        var panel = document.createElement('div');
        panel.id = 'peshTools';
        panel.className = 'expanded options';
        PeshTools.run.$panel = panel;

        var panelSticker = document.createElement('div');
        panelSticker.id = 'peshToolsSticker';
        PeshTools.run.$panelSticker = panelSticker;

        var panelStickerLogo = document.createElement('img');
        panelStickerLogo.id = 'peshToolsStickerLogo';
        panelStickerLogo.src = PeshToolsENV.extension.getURL('/img/peshtools.png');
        PeshTools.run.$panelStickerLogo = panelStickerLogo;

        var panelStickerStat = document.createElement('div');
        panelStickerStat.id = 'peshToolsStickerStat';
        PeshTools.run.$panelStickerStat = panelStickerStat;

        var ordersVisible_cnt = document.createElement('span');
        ordersVisible_cnt.id = 'ordersVisible_cnt';
        ordersVisible_cnt.innerHTML = '∞';
        PeshTools.run.$.ordersVisible_cnt = ordersVisible_cnt;

        var panelStickerStatVisible = document.createElement('span');
        panelStickerStatVisible.id = 'peshToolsStickerStatVisible';
        panelStickerStatVisible.appendChild(ordersVisible_cnt);
        PeshTools.run.$panelStickerStatVisible = panelStickerStatVisible;

        var ordersOverall_cnt = document.createElement('span');
        ordersOverall_cnt.id = 'ordersOverall_cnt';
        ordersOverall_cnt.innerHTML = '∞';
        PeshTools.run.$.ordersOverall_cnt = ordersOverall_cnt;

        var panelStickerStatOverall = document.createElement('span');
        panelStickerStatOverall.id = 'peshToolsStickerStatOverall';
        panelStickerStatOverall.appendChild(ordersOverall_cnt);
        PeshTools.run.$panelStickerStatOverall = panelStickerStatOverall;

        var panelFilters = document.createElement('div');
        panelFilters.id = 'peshToolsFilters';
        PeshTools.run.$panelFilters = panelFilters;

        var panelStickerCountdown = document.createElement('span');
        panelStickerCountdown.id = 'peshToolsStickerCountdown';
        panelStickerCountdown.innerHTML = '⌛';
        PeshTools.run.$panelStickerCountdown = panelStickerCountdown;

        panelStickerStat.appendChild(panelStickerStatVisible);
        panelStickerStat.appendChild(panelStickerStatOverall);
        panelSticker.appendChild(panelStickerLogo);
        panelSticker.appendChild(panelStickerStat);
        panelSticker.appendChild(panelStickerCountdown);
        panel.appendChild(panelSticker);
        panel.appendChild(panelFilters);
        PeshTools.run.$body.appendChild(panel);

        PeshTools.embedded.fns.bootstrapUIFilters();

    };

    // PeshTools.embedded.fns.bootstrapUIModeOptions = function ()


    /**
     * Начальная загрузка. Отрисовка фильтров.
     */
    PeshTools.embedded.fns.bootstrapUIFilters = function ()
    {
        for (var c in PeshTools.run.skel.filtersLayout)
        {
            var div = document.createElement('div');
            div.className = 'column';

            for (var g in PeshTools.run.skel.filtersLayout[c])
            {
                if (!PeshTools.run.skel.filtersLayout[c].hasOwnProperty(g))
                {
                    continue;
                }

                var grp = PeshTools.run.skel.filtersLayout[c][g];

                var fs = document.createElement('fieldset');
                fs.id = g + '_fs';

                PeshTools.run.$[fs.id] = fs;

                var legend = document.createElement('legend');
                legend.innerHTML = grp.title;
                fs.appendChild(legend);
                div.appendChild(fs);

                if ('undefined' === typeof PeshTools.embedded.fns['bootstrapUIFiltersDraw' + grp.type])
                {
                    PeshToolsDbg && console.warn(g, grp, 'PeshTools.embedded.fns[bootstrapUIFiltersDraw' + grp.type + ']');
                    continue;
                }

                var elements = PeshTools.embedded.fns['bootstrapUIFiltersDraw' + grp.type](g, grp);

                for (var i in elements)
                {
                    fs.appendChild(elements[i]);
                }
            }

            PeshTools.run.$panelFilters.appendChild(div);
        }
    };

    // PeshTools.embedded.fns.bootstrapUIFilters = function ()


    /**
     * Начальная загрузка. Отрисовка фильтров. Четырехзначные фильтры.
     *
     * @param {String} g
     * @param {Object} grp
     * @returns {Array}
     */
    PeshTools.embedded.fns.bootstrapUIFiltersDrawQuadState = function (g, grp)
    {
        var elements = [];

        for (var f in grp.data)
        {
            if (!grp.data.hasOwnProperty(f))
            {
                continue;
            }

            PeshTools.run.QuadStateFilters.push(f);

            var dl = document.createElement('dl');
            var dt = document.createElement('dt');
            dt.innerHTML = grp.data[f];
            dl.appendChild(dt);

            PeshTools.run.skel.stats[f] = 0;

            var sub = document.createElement('sub');
            sub.id = f + '_cnt';
            sub.innerHTML = '∞';

            PeshTools.run.$[sub.id] = sub;

            dt.appendChild(sub);

            var dd = document.createElement('dd');

            for (var s in PeshTools.run.skel.filtersQuadStates)
            {
                if (!PeshTools.run.skel.filtersQuadStates.hasOwnProperty(s))
                {
                    continue;
                }

                var input = document.createElement('input');
                input.type = 'radio';
                input.name = f;
                input.id = f + s;
                input.value = s;
                input.addEventListener('change', PeshTools.embedded.fns.onQuadStateFilterChange);

                PeshTools.run.$[input.id] = input;

                if (PeshTools.run.filters[f] === s)
                {
                    input.checked = true;
                }

                var label = document.createElement('label');
                label.htmlFor = f + s;
                label.innerHTML = PeshTools.run.skel.filtersQuadStates[s].label;
                label.title = PeshTools.run.skel.filtersQuadStates[s].title;

                dd.appendChild(input);
                dd.appendChild(label);
            }

            dl.appendChild(dd);

            elements.push(dl);
        }

        return elements;
    };

    // PeshTools.embedded.fns.bootstrapUIFiltersDrawQuadState = function ()


    /**
     * Обработчик изменения значения четырехзначного фильтра.
     *
     * @return {Void}
     */
    PeshTools.embedded.fns.onQuadStateFilterChange = function ()
    {
        PeshToolsDbg && console.log(this);

        var m = /^(.+)(Require|Include|Bypass|Exclude)$/.exec(this.id);

        var filter = m[1];
        var value = m[2];

        PeshTools.run.filters[filter] = value;

        PeshToolsDbg && console.info(PeshTools.run.filters);

        PeshTools.embedded.fns.sendMessageWrapper({
            method: 'config.save',
            bank: 'filters',
            name: filter,
            value: value,
            scheduleUpdate: true,
            referrer: document.location.href,
            title: document.title
        });
    };

    // PeshTools.embedded.fns.onQuadStateFilterChange = function ()


    /**
     * Начальная загрузка. Отрисовка фильтров. Минимальная реальная оплата.
     *
     * @param {String} g
     * @param {Object} grp
     * @returns {Array}
     */
    PeshTools.embedded.fns.bootstrapUIFiltersDrawEarning = function (g, grp)
    {
        var elements = [];

        PeshTools.run.skel.stats['minRealEarning'] = 0;

        // apply
        var dl = document.createElement('dl');
        var dt = document.createElement('dt');
        dt.innerHTML = 'Показывать';

        var sub = document.createElement('sub');
        sub.id = 'minRealEarning_cnt';
        sub.innerHTML = '∞';

        PeshTools.run.$[sub.id] = sub;

        dt.appendChild(sub);
        dl.appendChild(dt);

        var dd = document.createElement('dd');
        var input = document.createElement('input');
        input.type = 'checkbox';
        input.name = 'minRealEarningApply';
        input.id = 'minRealEarningApply';
        input.value = 1;
        input.addEventListener('change', PeshTools.embedded.fns.onEarningChange);

        PeshTools.run.$[input.id] = input;

        if (PeshTools.run.filters[input.id])
        {
            input.checked = true;
        }

        var label = document.createElement('label');
        label.htmlFor = input.id;

        dd.appendChild(input);
        dd.appendChild(label);
        dl.appendChild(dd);

        elements.push(dl);

        // filter value
        var dl = document.createElement('dl');
        var dt = document.createElement('dt');
        dt.innerHTML = 'не менее (руб)';
        dl.appendChild(dt);

        var dd = document.createElement('dd');
        var input = document.createElement('input');
        input.type = 'number';
        input.name = 'minRealEarning';
        input.min = 0;
        input.max = 10000000;
        input.id = 'minRealEarning';
        input.value = PeshTools.run.filters[input.id];

        input.disabled = !PeshTools.run.filters['minRealEarningApply'];

        input.addEventListener('change', PeshTools.embedded.fns.onEarningChange);

        PeshTools.run.$[input.id] = input;

        dd.appendChild(input);
        dl.appendChild(dd);

        elements.push(dl);

        return elements;
    };

    // PeshTools.embedded.fns.bootstrapUIFiltersDrawEarning = function (g, grp)


    /**
     * Обработчик изменения значения и активности фильтра минимальной реальной оплаты.
     *
     * @return {Void}
     */
    PeshTools.embedded.fns.onEarningChange = function ()
    {
        PeshToolsDbg && console.log(this);

        var filter = this.id;
        var value = this.value;

        if ('minRealEarningApply' === this.id)
        {
            PeshTools.run.$.minRealEarning.disabled = !this.checked;
            value = !!this.checked;
        } else
        {
            value = Number.parseInt(value);
        }

        PeshTools.embedded.fns.sendMessageWrapper({
            method: 'config.save',
            bank: 'filters',
            name: filter,
            value: value,
            scheduleUpdate: true,
            referrer: document.location.href,
            title: document.title
        });
    };

    // PeshTools.embedded.fns.onEarningChange = function ()


    /**
     * Начальная загрузка. Отрисовка фильтров. Максимальный полный залог.
     *
     * @param {String} g
     * @param {Object} grp
     * @returns {Array}
     */
    PeshTools.embedded.fns.bootstrapUIFiltersDrawPledge = function (g, grp)
    {
        var elements = [];

        PeshTools.run.skel.stats['maxFullPledge'] = 0;

        // display math
        var dl = document.createElement('dl');
        var dt = document.createElement('dt');
        dt.innerHTML = 'Вывод прогноза';

        dl.appendChild(dt);

        var dd = document.createElement('dd');
        var input = document.createElement('input');
        input.type = 'checkbox';
        input.id = 'fullPledgeMathDisplay';
        input.name = input.id;
        input.value = 1;
        input.addEventListener('change', PeshTools.embedded.fns.onPledgeChange);

        PeshTools.run.$[input.id] = input;

        if (PeshTools.run.filters[input.id])
        {
            input.checked = true;
        }

        var label = document.createElement('label');
        label.htmlFor = input.id;

        dd.appendChild(input);
        dd.appendChild(label);
        dl.appendChild(dd);

        elements.push(dl);

        // apply
        var dl = document.createElement('dl');
        var dt = document.createElement('dt');
        dt.innerHTML = 'Прятать';

        var sub = document.createElement('sub');
        sub.id = 'maxFullPledge_cnt';
        sub.innerHTML = '∞';

        PeshTools.run.$[sub.id] = sub;

        dt.appendChild(sub);
        dl.appendChild(dt);

        var dd = document.createElement('dd');
        var input = document.createElement('input');
        input.type = 'checkbox';
        input.id = 'maxFullPledgeApply';
        input.name = input.id;
        input.value = 1;
        input.addEventListener('change', PeshTools.embedded.fns.onPledgeChange);

        PeshTools.run.$[input.id] = input;

        if (PeshTools.run.filters[input.id])
        {
            input.checked = true;
        }

        var label = document.createElement('label');
        label.htmlFor = input.id;

        dd.appendChild(input);
        dd.appendChild(label);
        dl.appendChild(dd);

        elements.push(dl);

        // filter value
        var dl = document.createElement('dl');
        var dt = document.createElement('dt');
        dt.innerHTML = 'залоги свыше (руб)';
        dl.appendChild(dt);

        var dd = document.createElement('dd');
        var input = document.createElement('input');
        input.type = 'number';
        input.id = 'maxFullPledge';
        input.name = input.id;
        input.min = 0;
        input.max = 10000000;
        input.value = PeshTools.run.filters[input.id];

        input.disabled = !PeshTools.run.filters['maxFullPledgeApply'];

        input.addEventListener('change', PeshTools.embedded.fns.onPledgeChange);

        PeshTools.run.$[input.id] = input;

        dd.appendChild(input);
        dl.appendChild(dd);

        elements.push(dl);

        // Временно отключаем отрисовку докидывания на баланс и множитель комиссии
        return elements;

        // recharge value
        var dl = document.createElement('dl');
        var dt = document.createElement('dt');
        dt.innerHTML = 'подкину';
        dl.appendChild(dt);

        var dd = document.createElement('dd');
        var input = document.createElement('input');
        input.type = 'number';
        input.id = 'maxFullPledgeRecharge';
        input.name = input.id;
        input.min = 0;
        input.max = 10000000;
        input.value = PeshTools.run.filters[input.id];

        input.disabled = !PeshTools.run.filters['maxFullPledgeApply'];

        input.addEventListener('change', PeshTools.embedded.fns.onPledgeChange);

        PeshTools.run.$[input.id] = input;

        dd.appendChild(input);
        dl.appendChild(dd);

        elements.push(dl);

        // commission multiplier
        var dl = document.createElement('dl');
        var dt = document.createElement('dt');
        dt.innerHTML = 'комиссия Х ';
        dl.appendChild(dt);

        var dd = document.createElement('dd');
        var input = document.createElement('input');
        input.type = 'number';
        input.id = 'maxFullPledgeCommission';
        input.name = input.id;
        input.min = 0;
        input.max = 3;
        input.step = 1;
        input.value = PeshTools.run.filters[input.id];

        input.disabled = !PeshTools.run.filters['maxFullPledgeApply'];

        input.addEventListener('change', PeshTools.embedded.fns.onPledgeChange);

        PeshTools.run.$[input.id] = input;

        dd.appendChild(input);
        dl.appendChild(dd);

        elements.push(dl);

        return elements;
    };

    // PeshTools.embedded.fns.bootstrapUIFiltersDrawPledge = function (g, grp)


    /**
     * Обработчик изменения значения и активности фильтра максимального полного залога.
     *
     * @return {Void}
     */
    PeshTools.embedded.fns.onPledgeChange = function ()
    {
        PeshToolsDbg && console.log(this);

        var filter = this.id;
        var value = this.value;

        if ('maxFullPledgeApply' === this.id)
        {
            PeshTools.run.$.maxFullPledge.disabled = !this.checked;
//            PeshTools.run.$.maxFullPledgeRecharge.disabled = !this.checked;
//            PeshTools.run.$.maxFullPledgeCommission.disabled = !this.checked;
            value = !!this.checked;
        } else if ('fullPledgeMathDisplay' === this.id)
        {
            value = !!this.checked;
        } else
        {
            value = Number.parseInt(value);
        }

        PeshTools.embedded.fns.sendMessageWrapper({
            method: 'config.save',
            bank: 'filters',
            name: filter,
            value: value,
            scheduleUpdate: true,
            referrer: document.location.href,
            title: document.title
        });
    };

    // PeshTools.embedded.fns.onPledgeChange = function ()


    /**
     * Начальная загрузка. Отрисовка фильтров. Максимальная дистанция.
     *
     * @param {String} g
     * @param {Object} grp
     * @returns {Array}
     */
    PeshTools.embedded.fns.bootstrapUIFiltersDrawDistance = function (g, grp)
    {
        var elements = [];

        PeshTools.run.skel.stats['maxDistance'] = 0;

        // apply
        var dl = document.createElement('dl');
        var dt = document.createElement('dt');
        dt.innerHTML = 'Не пойду';

        var sub = document.createElement('sub');
        sub.id = 'maxDistance_cnt';
        sub.innerHTML = '∞';

        PeshTools.run.$[sub.id] = sub;

        dt.appendChild(sub);
        dl.appendChild(dt);

        var dd = document.createElement('dd');
        var input = document.createElement('input');
        input.type = 'checkbox';
        input.id = 'maxDistanceApply';
        input.name = input.id;
        input.value = 1;
        input.addEventListener('change', PeshTools.embedded.fns.onDistanceChange);

        PeshTools.run.$[input.id] = input;

        if (PeshTools.run.filters[input.id])
        {
            input.checked = true;
        }

        var label = document.createElement('label');
        label.htmlFor = input.id;

        dd.appendChild(input);
        dd.appendChild(label);
        dl.appendChild(dd);

        elements.push(dl);

        // filter value
        var dl = document.createElement('dl');
        var dt = document.createElement('dt');
        dt.innerHTML = 'дальше (км)';
        dl.appendChild(dt);

        var dd = document.createElement('dd');
        var input = document.createElement('input');
        input.type = 'number';
        input.id = 'maxDistance';
        input.name = input.id;
        input.min = 0.0;
        input.max = 333.3;
        input.step = 0.1;
        input.value = PeshTools.run.filters[input.id];

        input.disabled = !PeshTools.run.filters['maxDistanceApply'];

        input.addEventListener('change', PeshTools.embedded.fns.onDistanceChange);

        PeshTools.run.$[input.id] = input;

        dd.appendChild(input);
        dl.appendChild(dd);

        elements.push(dl);

        return elements;
    };

    // PeshTools.embedded.fns.bootstrapUIFiltersDrawDistance = function (g, grp)


    /**
     * Обработчик изменения значения и активности фильтра максимальной дистанции.
     *
     * @return {Void}
     */
    PeshTools.embedded.fns.onDistanceChange = function ()
    {
        PeshToolsDbg && console.log(this);

        var filter = this.id;
        var value = this.value;

        if ('maxDistanceApply' === this.id)
        {
            PeshTools.run.$.maxDistance.disabled = !this.checked;
            value = !!this.checked;
        } else
        {
            value = Number.parseFloat(value);
        }

        PeshTools.embedded.fns.sendMessageWrapper({
            method: 'config.save',
            bank: 'filters',
            name: filter,
            value: value,
            scheduleUpdate: true,
            referrer: document.location.href,
            title: document.title
        });
    };

    // PeshTools.embedded.fns.onDistanceChange = function ()


    /**
     * Начальная загрузка. Отрисовка фильтров. Фильтр подстрок.
     *
     * @param {String} g
     * @param {Object} grp
     * @returns {Array}
     */
    PeshTools.embedded.fns.bootstrapUIFiltersDrawStrings = function (g, grp)
    {
        var elements = [];

        // apply
        var dl = document.createElement('dl');
        var dt = document.createElement('dt');
        dt.innerHTML = 'Активировать';

        dl.appendChild(dt);

        var dd = document.createElement('dd');
        var input = document.createElement('input');
        input.type = 'checkbox';
        input.id = 'execStrings';
        input.name = input.id;
        input.value = 1;
        input.addEventListener('change', PeshTools.embedded.fns.onStringsChange);

        PeshTools.run.$[input.id] = input;

        if (PeshTools.run.filters[input.id])
        {
            input.checked = true;
        }

        var label = document.createElement('label');
        label.htmlFor = input.id;

        dd.appendChild(input);
        dd.appendChild(label);
        dl.appendChild(dd);

        elements.push(dl);

        // add
        var dl = document.createElement('dl');
        var dd = document.createElement('dd');

        var input = document.createElement('input');
        input.type = 'text';
        input.id = 'newString';
        input.name = input.id;
        input.pattern = '.{3,}';
        input.style.textTransform = 'lowercase';
        input.placeholder = 'Новое слово';

        PeshTools.run.$[input.id] = input;

        var button = document.createElement('button');
        button.type = 'text';
        button.id = 'newStringAdd';
        button.name = button.id;
        button.innerHTML = '+';

        button.addEventListener('click', PeshTools.embedded.fns.onStringAddClick);

        PeshTools.run.$[button.id] = button;

        dd.appendChild(input);
        dd.appendChild(button);
        dl.appendChild(dd);

        elements.push(dl);

        for (var stringValue in PeshTools.run.strings)
        {
            if (!PeshTools.run.strings.hasOwnProperty(stringValue))
            {
                continue;
            }

            var stringRow = PeshTools.embedded.fns.bootstrapUIFiltersDrawStringsListItem(stringValue);
            elements.push(stringRow);
        }

        return elements;
    };

    // PeshTools.embedded.fns.bootstrapUIFiltersDrawStrings = function (g, grp)


    /**
     * Начальная загрузка. Отрисовка фильтров. Фильтр подстрок. Блок строки.
     *
     * @param {String} string
     * @returns {HTMLElement}
     */
    PeshTools.embedded.fns.bootstrapUIFiltersDrawStringsListItem = function (string)
    {
        PeshTools.run.skel.stats['string' + string] = 0;

        var dl = document.createElement('dl');
        dl.id = 'string' + string + '_dl';

        PeshTools.run.$[dl.id] = dl;

        var dt = document.createElement('dt');
        dt.innerText = string;

        var sub = document.createElement('sub');
        sub.id = 'string' + string + '_cnt';
        sub.innerHTML = '∞';

        PeshTools.run.$[sub.id] = sub;

        dt.appendChild(sub);
        dl.appendChild(dt);

        var dd = document.createElement('dd');

        for (var s in PeshTools.run.skel.filtersQuadStates)
        {
            var input = document.createElement('input');
            input.type = 'radio';
            input.name = 'string' + string;
            input.id = input.name + s;

            input.value = s;
            input.addEventListener('change', PeshTools.embedded.fns.onStringsChange);

            PeshTools.run.$[input.id] = input;

            if (s === PeshTools.run.strings[string])
            {
                input.checked = true;
            }

            var label = document.createElement('label');
            label.htmlFor = input.id;
            label.innerHTML = PeshTools.run.skel.filtersQuadStates[s].label;
            label.title = PeshTools.run.skel.filtersQuadStates[s].title;

            dd.appendChild(input);
            dd.appendChild(label);
        }

        var button = document.createElement('button');
        button.id = 'string' + string + 'Delete';
        button.name = button.id;
        button.innerText = 'Ⓧ';
        button.addEventListener('click', PeshTools.embedded.fns.onStringDelClick);
        button.dataset.value = string;

        PeshTools.run.$[button.id] = button;

        dd.appendChild(button);
        dl.appendChild(dd);

        return dl;
    };

    // PeshTools.embedded.fns.bootstrapUIFiltersDrawStringsListItem = function (string)


    /**
     * Обработчик изменений режима фильтрации для строк фильтра подстрок.
     *
     * @return {Void}
     */
    PeshTools.embedded.fns.onStringsChange = function ()
    {
        PeshToolsDbg && console.log(this);

        if ('execStrings' === this.id)
        {
            var value = this.checked;

            PeshTools.run.filters.execStrings = value;

            PeshTools.embedded.fns.sendMessageWrapper({
                method: 'config.save',
                bank: 'filters',
                name: 'execStrings',
                value: value,
                scheduleUpdate: true,
                referrer: document.location.href,
                title: document.title
            });

            return;
        }

        var m = /^string(.+)(Require|Include|Bypass|Exclude)$/.exec(this.id);

        var string = m[1];
        var value = this.value;

        PeshTools.run.strings[string] = value;

        PeshTools.embedded.fns.sendMessageWrapper({
            method: 'config.save',
            bank: 'strings',
            name: string,
            value: value,
            scheduleUpdate: true,
            referrer: document.location.href,
            title: document.title
        });
    };

    // PeshTools.embedded.fns.onStringsChange = function ()


    /**
     * Обработчик добавления строки в фильтре подстрок.
     *
     * @return {Void}
     */
    PeshTools.embedded.fns.onStringAddClick = function ()
    {
        var string = PeshTools.run.$.newString.value.toLowerCase().trim();

        PeshTools.run.$.newString.value = '';

        if ('' === string)
        {
            PeshToolsDbg && console.info('empty value');
            return;
        }

        if ('undefined' !== typeof PeshTools.run.strings[string])
        {
            PeshToolsDbg && console.info('duplicate value');
            return;
        }

        PeshTools.run.strings[string] = 'Bypass';

        var stringDl = PeshTools.embedded.fns.bootstrapUIFiltersDrawStringsListItem(string);
        PeshTools.run.$.strings_fs.appendChild(stringDl);

        PeshTools.embedded.fns.sendMessageWrapper({
            method: 'config.save',
            bank: 'strings',
            name: string,
            value: 'Bypass',
            scheduleUpdate: true,
            referrer: document.location.href,
            title: document.title
        });
    };

    // PeshTools.embedded.fns.onStringAddClick = function ()


    /**
     * Обработчик удаления строки в фильтре подстрок.
     *
     * @return {Void}
     */
    PeshTools.embedded.fns.onStringDelClick = function ()
    {
        PeshToolsDbg && console.log(this);

        var string = this.dataset.value;

        if (!confirm('Удалить строку "' + string + '"?'))
        {
            return;
        }

        delete PeshTools.run.strings[string];

        var dl = PeshTools.run.$['string' + string + '_dl'];

        dl.parentNode.removeChild(dl);

        delete PeshTools.run.$['string' + string + '_dl'];
        delete PeshTools.run.$['string' + string + '_cnt'];
        delete PeshTools.run.$['string' + string + 'Require'];
        delete PeshTools.run.$['string' + string + 'Bypass'];
        delete PeshTools.run.$['string' + string + 'Exclude'];
        delete PeshTools.run.$['string' + string + 'Delete'];

        PeshTools.embedded.fns.sendMessageWrapper({
            method: 'strings.delete',
            name: string,
            scheduleUpdate: true,
            referrer: document.location.href,
            title: document.title
        });
    };

    // PeshTools.embedded.fns.onStringDelClick = function ()


    /**
     * Начальная загрузка. Отрисовка фильтров. Фильтр максимального веса.
     *
     * @param {String} g
     * @param {Object} grp
     * @returns {Array}
     */
    PeshTools.embedded.fns.bootstrapUIFiltersDrawWeight = function (g, grp)
    {
        var elements = [];

        PeshTools.run.skel.stats['maxWeight'] = 0;

        // apply
        var dl = document.createElement('dl');
        var dt = document.createElement('dt');
        dt.innerHTML = 'Не подниму';

        var sub = document.createElement('sub');
        sub.id = 'maxWeight_cnt';
        sub.innerHTML = '∞';

        PeshTools.run.$[sub.id] = sub;

        dt.appendChild(sub);
        dl.appendChild(dt);

        var dd = document.createElement('dd');
        var input = document.createElement('input');
        input.type = 'checkbox';
        input.id = 'maxWeightApply';
        input.name = input.id;
        input.value = 1;
        input.addEventListener('change', PeshTools.embedded.fns.onWeightChange);

        PeshTools.run.$[input.id] = input;

        if (PeshTools.run.filters[input.id])
        {
            input.checked = true;
        }

        var label = document.createElement('label');
        label.htmlFor = input.id;

        dd.appendChild(input);
        dd.appendChild(label);
        dl.appendChild(dd);

        elements.push(dl);

        // filter value
        var dl = document.createElement('dl');
        var dt = document.createElement('dt');
        dt.innerHTML = 'тяжелее (кг)';
        dl.appendChild(dt);

        var dd = document.createElement('dd');
        var input = document.createElement('input');
        input.type = 'number';
        input.id = 'maxWeight';
        input.name = input.id;
        input.min = 0.0;
        input.max = 100.0;
        input.step = 0.1;
        input.value = PeshTools.run.filters[input.id];

        input.disabled = !PeshTools.run.filters['maxWeightApply'];

        input.addEventListener('change', PeshTools.embedded.fns.onWeightChange);

        PeshTools.run.$[input.id] = input;

        dd.appendChild(input);
        dl.appendChild(dd);

        elements.push(dl);

        return elements;
    };

    // PeshTools.embedded.fns.bootstrapUIFiltersDrawWeight = function (g, grp)


    /**
     * Обработчик изменения значения и активности фильтра максимального веса.
     *
     * @return {Void}
     */
    PeshTools.embedded.fns.onWeightChange = function ()
    {
        PeshToolsDbg && console.log(this);

        var filter = this.id;
        var value = this.value;

        if ('maxWeightApply' === this.id)
        {
            PeshTools.run.$.maxWeight.disabled = !this.checked;
            value = !!this.checked;
        } else
        {
            value = Number.parseFloat(value);
        }

        PeshTools.embedded.fns.sendMessageWrapper({
            method: 'config.save',
            bank: 'filters',
            name: filter,
            value: value,
            scheduleUpdate: true,
            referrer: document.location.href,
            title: document.title
        });
    };

    // PeshTools.embedded.fns.onWeightChange = function ()


    /**
     * Начальная загрузка. Отрисовка фильтров. Опции приложения.
     *
     * @param {String} g
     * @param {Object} grp
     * @returns {Array}
     */
    PeshTools.embedded.fns.bootstrapUIFiltersDrawOptions = function (g, grp)
    {
        var elements = [];

        for (var f in grp.data)
        {
            if (!grp.data.hasOwnProperty(f))
            {
                continue;
            }

            var dl = document.createElement('dl');
            var dt = document.createElement('dt');
            dt.innerHTML = grp.data[f];
            dl.appendChild(dt);

            var dd = document.createElement('dd');
            var input = document.createElement('input');

            if ('badgeBlinking' === f)
            {
                dl.id = 'peshToolsOptionBadgeBlinking_dl';

                input.type = 'radio';
                input.name = f;
                input.id = f + 'None';
                input.value = 'None';
                input.checked = input.value === PeshTools.run.config.badgeBlinking;
                input.addEventListener('change', PeshTools.embedded.fns.onBadgeBlinkingOptionChange);

                PeshTools.run.$[input.id] = input;

                var label = document.createElement('label');
                label.htmlFor = input.id;
                label.innerHTML = 'Нет';

                dd.appendChild(input);
                dd.appendChild(label);

                var input = document.createElement('input');
                input.type = 'radio';
                input.name = f;
                input.id = f + 'Pulse';
                input.value = 'Pulse';
                input.checked = input.value === PeshTools.run.config.badgeBlinking;
                input.addEventListener('change', PeshTools.embedded.fns.onBadgeBlinkingOptionChange);

                PeshTools.run.$[input.id] = input;

                var label = document.createElement('label');
                label.htmlFor = input.id;
                label.innerHTML = 'Пульс';

                dd.appendChild(input);
                dd.appendChild(label);

                var input = document.createElement('input');
                input.type = 'radio';
                input.name = f;
                input.id = f + 'Zebra';
                input.value = 'Zebra';
                input.checked = input.value === PeshTools.run.config.badgeBlinking;
                input.addEventListener('change', PeshTools.embedded.fns.onBadgeBlinkingOptionChange);

                PeshTools.run.$[input.id] = input;

                var label = document.createElement('label');
                label.htmlFor = input.id;
                label.innerHTML = 'Зебра';

                dd.appendChild(input);
                dd.appendChild(label);

                dl.appendChild(dd);

                elements.push(dl);

                continue;
            }

            // if ('badgeBlinking' === f)


            input.type = 'checkbox';
            input.name = f;
            input.id = f;
            input.value = 1;
            input.addEventListener('change', PeshTools.embedded.fns.onOptionChange);

            if ('selfDebug' === f && PeshTools.run.debugStripped)
            {
                dl.className += 'peshToolsOptionDisabled';
                input.disabled = true;
            }

            PeshTools.run.$[input.id] = input;

            var label = document.createElement('label');
            label.htmlFor = f;

            dd.appendChild(input);
            dd.appendChild(label);

            if (PeshTools.run.config[f])
            {
                input.checked = true;
            }

            dl.appendChild(dd);

            if ('sendStatistics' === f)
            {
                dl.id = 'peshToolsOptionSendStatistics_dl';

                var dd = document.createElement('dd');
                dd.id = f + 'Note';

                PeshTools.run.$[dd.id] = dd;

                dl.appendChild(dd);

                PeshTools.embedded.fns.updateSendStatisticsNote();

                var dd = document.createElement('dd');
                dd.id = f + 'Link';

                dd.innerHTML = [
                    'Подробнее про <a href="https://peshtools.ganzal.com#spying" ',
                    'title="PeshTools #Что утекает?" target="_blank">сбор статистики</a>'
                ].join('');

                PeshTools.run.$[dd.id] = dd;

                dl.appendChild(dd);
            }

            elements.push(dl);
        }

        return elements;
    };

    // PeshTools.embedded.fns.bootstrapUIFiltersDrawOptions = function (g, grp)


    /**
     * Обработчик изменения активности опций приложения.
     *
     * @return {Void}
     */
    PeshTools.embedded.fns.onOptionChange = function ()
    {
        PeshToolsDbg && console.log(this);

        var option = this.id;
        var value = this.checked;

        PeshTools.run.config[option] = value;

        if ('sendStatistics' === option)
        {
            PeshTools.embedded.fns.updateSendStatisticsNote();
        }

        PeshToolsDbg && console.warn(PeshTools.run.config);

        PeshTools.embedded.fns.sendMessageWrapper({
            method: 'config.save',
            bank: 'config',
            name: option,
            value: value,
            scheduleUpdate: true,
            referrer: document.location.href,
            title: document.title
        });
    };

    // PeshTools.embedded.fns.onOptionChange = function ()


    /**
     * Обработчик изменения значения опции badgeBlinking приложения.
     *
     * @return {Void}
     * @since   0.3.0   2017-01-13
     */
    PeshTools.embedded.fns.onBadgeBlinkingOptionChange = function ()
    {
        PeshToolsDbg && console.log(this);

        var option = this.name;
        var value = this.value;

        PeshTools.run.config[option] = value;

        PeshToolsDbg && console.warn(PeshTools.run.config);

        PeshTools.embedded.fns.sendMessageWrapper({
            method: 'config.save',
            bank: 'config',
            name: option,
            value: value,
            scheduleUpdate: true,
            referrer: document.location.href,
            title: document.title
        });
    };

    // PeshTools.embedded.fns.onBadgeBlinkingOptionChange = function ()


    /**
     * Обновляет текст и стиль заметки об опции отправки статистики.
     * 
     * @since   0.2.0   2017-01-10
     * @return {Void}
     */
    PeshTools.embedded.fns.updateSendStatisticsNote = function ()
    {
        var elem = PeshTools.run.$.sendStatisticsNote;
        var enabled = PeshTools.run.config.sendStatistics;

        elem.parentNode.className = (enabled ? 'en' : 'dis') + 'abled';
        elem.innerHTML = (enabled ?
                'Спасибо за доверие!' :
                'Буду очень признателен за активацию этой опции'
                );
    };

    // PeshTools.embedded.fns.updateSendStatisticsNote = function ()


    /**
     * Обёртка вокруг метода PeshToolsENV.runtime.sendMessage.
     * 
     * Выполняет метод, перехватывая возможное исключение.
     * Перехваченное исключение направляется в опциональный errorCallback.
     * 
     * @param {mixed} data
     * @param {undefined|Function} callback
     * @param {undefined|Function} errorCallback
     * @throws {mixed} 
     * @return void
     * @since   0.3.0   2017-01-12
     */
    PeshTools.embedded.fns.sendMessageWrapper = function (data, callback, errorCallback)
    {
        var args = Array.prototype.slice.call(arguments, 0, 2);

        try {
            PeshToolsENV.runtime.sendMessage.apply(null, args);
        } catch (e)
        {
            if ('undefined' !== typeof errorCallback)
            {
                errorCallback.apply(null, [{
                        error: e,
                        sourceData: data
                    }]);

                return;
            }

            throw e;
        }
    };

    // PeshTools.embedded.fns.sendMessageWrapper = function (data, callback, errorCallback)


    /**
     * Завершает сеанс встраиваемого сценария.
     * 
     * Удаляет все лишние данные со страницы и убивает переменные.
     * 
     * @returns {Void}
     * @since   0.3.0   2017-01-12
     */
    PeshTools.embedded.fns.shutdown = function ()
    {
        // Отменяем интервалы, которые доступны всегда.
        window.clearInterval(PeshTools.run.noopIntervalId);
        window.clearInterval(PeshTools.run.aliveIntervalId);

        // Удаляем слушателей событий.
        document.removeEventListener('selectionchange', PeshTools.embedded.fns.onSelectionChange);

        // Отменяем интервал тикера.
        if (PeshTools.run.ticksIntervalId)
        {
            window.clearInterval(PeshTools.run.ticksIntervalId);
        }

        // Удаляем панель.
        var panel = PeshTools.run.$panel;
        panel.parentNode.removeChild(panel);

        // Итерируем все элементы на странице...
        var elems = document.body.getElementsByTagName("*");

        for (var i in elems)
        {
            var elem = elems[i];

            if ('undefined' === typeof elems[i])
            {
                continue;
            }

            // Удаляем элемент, идентификатор которого начинается с peshTools.
            if (/^peshTools/.test(elem.id))
            {
                elem.parentNode.removeChild(elem);
                continue;
            }

            // Удаляем из списка классов элемента классы peshTools*.
            if (/peshTools/.test(elem.className))
            {
                elem.className = elem.className.replace(/\s*\b(peshTools.+?)\b\s*/g, ' ').replace(/\s+/g, ' ');
                if ('' === elem.className.replace(/\s+/, ''))
                {
                    elem.removeAttribute('class');
                }
            }

            for (var k in elem.dataset)
            {
                if (/^peshTools/.test(k))
                {
                    var attr = 'data-' + k.replace(/[A-Z]/g, function (match) {
                        return '-' + match.toLowerCase();
                    });

                    elem.removeAttribute(attr);
                }
            }
        }

        // Удаляем стили встраиваемого сценария.
        var css = PeshTools.run.$css;
        css.parentNode.removeChild(css);

        // Удаляем лишние классы у тега BODY.
        var body = document.body;
        body.className = body.className.replace(/\s*\b(peshTools.+?)\b\s*/g, ' ').replace(/\s+/g, ' ');
        if ('' === body.className.replace(/\s+/, ''))
        {
            body.removeAttribute('class');
        }

        // Заводим таймер самоуничтожения.
        window.setTimeout(function ()
        {
            delete PeshTools;
            delete PeshToolsENV;
            delete PeshToolsDbg;
        }, 0);
    };

    // PeshTools.embedded.fns.shutdown = function ()


    /**
     * Обработчик ошибки пинга фонового сценария.
     * 
     * Выполняем самоуничтожение из-за потеряни связи с фоновым сценарием.
     * 
     * @param {Object} data
     * @throws {mixed} 
     * @return {Void}
     * @since   0.3.0   2017-01-12
     */
    PeshTools.embedded.fns.noopPingErrorCallback = function (data)
    {
        PeshTools.embedded.fns.shutdown();
    };

    // PeshTools.embedded.fns.noopPingErrorCallback = function (data)


    /**
     * Сброс счетчика следующего обновления.
     *
     * @return {Void}
     */
    PeshTools.embedded.fns.resetCountdown = function ()
    {
        PeshTools.run.countdown = 5;
    };

    // PeshTools.embedded.fns.resetCountdown = function ()


    /**
     * Ежесекундный тик и периодический запуск обновления информации о заказах.
     *
     * @return {Void}
     */
    PeshTools.embedded.fns.tick = function ()
    {
        PeshToolsDbg && console.log('@ PeshTools.embedded.fns.tick()', PeshTools.run.countdown);

        if (!PeshTools.run.selfAutoupdate)
        {
            PeshTools.run.$panelStickerCountdown.innerHTML = '⌛';
            PeshTools.run.$panelStickerCountdown.className = 'hide';
            PeshTools.embedded.fns.scheduleUpdate(PeshTools.run.first);
            PeshTools.run.first = false;

            return;
        }

        if (0 > PeshTools.run.countdown)
        {
            PeshTools.run.$panelStickerCountdown.innerHTML = '⌛';

            return;
        } else if (0 === --PeshTools.run.countdown)
        {
            PeshTools.run.$panelStickerCountdown.innerHTML = '⌛';
            PeshTools.run.$panelStickerCountdown.className = '';
            PeshTools.embedded.fns.scheduleUpdate(PeshTools.run.first);
            PeshTools.run.first = false;
        } else if (0 < PeshTools.run.countdown)
        {
            PeshTools.run.$panelStickerCountdown.innerHTML = PeshTools.run.countdown;

            if (!PeshTools.run.config.showSelfCountdown)
            {
                PeshTools.run.$panelStickerCountdown.className = 'hide';
            }
        }
    };

    // PeshTools.embedded.fns.tick = function ()


    /**
     * Запускает таймер автообновления.
     * 
     * @return {Void}
     */
    PeshTools.embedded.fns.ticksStart = function ()
    {
        PeshToolsDbg && console.log('PeshTools.embedded.fns.ticksStart', PeshTools.run.ticksIntervalId);

        if (null !== PeshTools.run.ticksIntervalId)
        {
            return;
        }

        PeshTools.run.ticksIntervalId = window.setInterval(function () {
            PeshTools.embedded.fns.tick();
        }, 1000);
    };

    // PeshTools.embedded.fns.ticksStart = function ()


    /**
     * Останавливает таймер автообновления.
     * 
     * @return {Void}
     */
    PeshTools.embedded.fns.ticksStop = function ()
    {
        PeshToolsDbg && console.log('PeshTools.embedded.fns.ticksStop', PeshTools.run.ticksIntervalId);

        if (null === PeshTools.run.ticksIntervalId)
        {
            return;
        }

        window.clearInterval(PeshTools.run.ticksIntervalId);
        PeshTools.run.ticksIntervalId = null;

        PeshTools.run.$panelStickerCountdown.innerHTML = '⌛';
        PeshTools.run.$panelStickerCountdown.className = 'hide';
    };

    // PeshTools.embedded.fns.ticksStop = function ()


    /**
     * Обработчик выделения текста на странице.
     * 
     * Отправляет строку фоновому сценарию для подготовки контекстного меню.
     * 
     * @return {Void}
     * @since   0.4.0   2017-01-14
     */
    PeshTools.embedded.fns.onSelectionChange = function ()
    {
        var selection = window.getSelection().toString().trim().toLowerCase();
        var token = Math.random();

        PeshTools.run.stringsSelectionToken = token;

        window.setTimeout(function () {
            if (PeshTools.run.stringsSelectionToken !== token)
            {
                return;
            }

            PeshTools.embedded.fns.sendMessageWrapper({
                method: 'strings.selection',
                value: selection
            });
        }, 100);
    };

    // PeshTools.embedded.fns.onSelectionChange = function ()


    /**
     * Перезагружает страницу, если она поломалась.
     * 
     * @return {Boolean}
     * @since   0.4.0   2017-01-15
     */
    PeshTools.embedded.fns.detectBrokenPage = function ()
    {
        if (10 < document.body.getElementsByTagName("*").length)
        {
            return false;
        }

        PeshTools.embedded.fns.sendMessageWrapper({
            method: 'ga.pageview',
            page: '/embedded#reload',
            referrer: document.referrer,
            title: document.title
        });

        document.location.reload(true);

        return true;
    };

    // PeshTools.embedded.fns.detectBrokenPage = function ()


    /**
     * Начальная загрузка встраиваемого сценария.
     *
     * @return {Void}
     */
    PeshTools.embedded.fns.bootstrap = function ()
    {
        PeshTools.run = {};

        var dbgCnt = 0;
        var manifest = PeshToolsENV.runtime.getManifest();
        console.debug('PeshTools/Embedded [v%s]: Testing console.debug()... %d %d %d',
                (manifest.version_name ? manifest.version_name : manifest.version),
                dbgCnt++, dbgCnt++, dbgCnt++);
        PeshTools.run.debugStripped = (0 === dbgCnt);

        PeshTools.run.orders = {};
        PeshTools.run.filters = {};
        PeshTools.run.ticksIntervalId = null;
        PeshTools.run.aliveIntervalId = null;
        PeshTools.run.noopIntervalId = null;

        PeshTools.run.$ = {};

        PeshTools.run.skel = {};
        PeshTools.run.skel.stats = {
            ordersOverall: 0,
            ordersVisible: 0
        };

        PeshTools.run.QuadStateFilters = [];

        PeshTools.run.$head = document.getElementsByTagName("head")[0];
        PeshTools.run.$body = document.getElementsByTagName("body")[0];
        PeshTools.run.countdown = 1;
        PeshTools.run.first = true;

        PeshTools.run.courierBalance = 0;
        PeshTools.run.$courierBalanceNode = null;
        PeshTools.run.courierVerified = false;
        PeshTools.run.$courierVerifiedNode = null;

        PeshToolsDbg && console.info('PeshTools.run :', PeshTools.run);

        // регистрация обработчика сообщений от фонового скрипта
        PeshToolsENV.runtime.onMessage.addListener(PeshTools.embedded.fns.onmessage_hnd);

        // наши стили тоже сюда подтягиваем (вдруг заработают) 
        var embedded_css_href = PeshToolsENV.extension.getURL('/css/peshtools.embedded.css');
        var embedded_css_exists = false;
        var stylesheet_links = document.querySelectorAll('link[rel=stylesheet]');
        for (var i in stylesheet_links)
        {
            if (stylesheet_links[i].href !== embedded_css_href)
            {
                continue;
            }

            if (embedded_css_exists)
            {
                stylesheet_links[i].parentNode.removeChild(stylesheet_links[i]);
                continue;
            }

            PeshTools.run.$css = stylesheet_links[i];
            embedded_css_exists = true;
        }

        if (!embedded_css_exists)
        {
            var embedded_css = document.createElement("link");
            embedded_css.rel = "stylesheet";
            embedded_css.type = "text/css";
            embedded_css.href = PeshToolsENV.extension.getURL('/css/peshtools.embedded.css');

            PeshTools.run.$css = embedded_css;

            PeshTools.run.$head.appendChild(embedded_css);
        }

        var is_options_page = (document.location.href === PeshToolsENV.extension.getURL('/html/peshtools.options.html'));
        PeshTools.run.isOptionsPage = (function () {
            return function () {
                return is_options_page;
            };
        })();

        PeshTools.embedded.fns.sendMessageWrapper({
            method: 'skel.fetch'
        }, PeshTools.embedded.fns.bootstrapSkelProcessor);
    };

    // PeshTools.embedded.fns.bootstrap = function ()


    /**
     * Начальная загрузка встраиваемого сценария. Этап чтения скелета конфигурации.
     *
     * @param {Object} response
     */
    PeshTools.embedded.fns.bootstrapSkelProcessor = function (response)
    {
        for (var p in response.skel)
        {
            if (response.skel.hasOwnProperty(p))
            {
                PeshTools.run.skel[p] = response.skel[p];
            }
        }

        PeshTools.run.sess = response.sess;
        PeshTools.run.config = response.config;
        PeshTools.run.filters = response.filters;
        PeshTools.run.strings = response.strings;
        PeshTools.run.debug = response.config.selfDebug;
        PeshToolsDbg = response.config.selfDebug;
        PeshTools.run.selfAutoupdate = response.config.selfAutoupdate;

        if (PeshTools.run.isOptionsPage())
        {
            PeshTools.embedded.fns.bootstrapUIModeOptions();
        } else
        {
            PeshTools.embedded.fns.bootstrapUIModeEmbedded();
        }

        window.setTimeout(function ()
        {
            PeshTools.embedded.fns.tick();
        }, 0);

        if (PeshTools.run.config.selfAutoupdate)
        {
            window.setTimeout(function ()
            {
                PeshTools.embedded.fns.ticksStart();
            }, 0);
        }

        PeshTools.run.noopIntervalId = window.setInterval(function ()
        {
            PeshTools.embedded.fns.sendMessageWrapper({
                method: 'noop.ping'
            },
                    void 0,
                    PeshTools.embedded.fns.noopPingErrorCallback
                    );
        }, 2000);

        //window.setInterval(PeshTools.embedded.fns.tick, 1000);
    };

    // PeshTools.embedded.fns.bootstrapSkelProcessor = function (response)


})();


/**
 * Запуск встраиваемого сценария.
 * 
 * @return {Void}
 */
(function () {
    PeshTools.embedded.fns.bootstrap();
})();

// eof: /js/peshtools.embedded.js
