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
 * @version 0.1.0   2017-01-10
 * @date    2017-01-10
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
     * @return {Void}
     */
    PeshTools.embedded.fns.fetchRunDataRequest = function (forceUpdate)
    {
        PeshToolsENV.runtime.sendMessage({
            method: 'run.fetch',
            forceUpdate: forceUpdate,
            title: document.title
        }, PeshTools.embedded.fns.fetchRunDataResponseCallback);

    };

    // PeshTools.embedded.fns.fetchRunDataRequest = function (forceUpdate)


    /**
     * Обработчик ответа на запрос фильтров и конфигурации у фонового сценария.
     * 
     * @param {Object} response
     * @return {Void}
     */
    PeshTools.embedded.fns.fetchRunDataResponseCallback = function (response)
    {
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

        if (response.forceUpdate || response.config.selfAutoupdate)
        {
            return PeshTools.embedded.fns.update();
        }

        setTimeout(function ()
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
    PeshTools.embedded.fns.update = function ()
    {
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

        for (var f in PeshTools.run.QuadStateFilters)
        {
            var filter = PeshTools.run.QuadStateFilters[f];

            haveRequired |= ('Require' === PeshTools.run.filters[filter]);

            PeshToolsDbg && console.log(filter, PeshTools.run.filters[filter], haveRequired);
        }

        haveRequired |= PeshTools.run.filters.minRealEarningApply;
        PeshToolsDbg && console.log('minRealEarningApply', PeshTools.run.filters.minRealEarningApply, haveRequired);

        haveRequired |= PeshTools.run.filters.maxFullPledgeApply;
        PeshToolsDbg && console.log('maxFullPledgeApply', PeshTools.run.filters.maxFullPledgeApply, haveRequired);

        haveRequired |= PeshTools.run.filters.maxDistanceApply;
        PeshToolsDbg && console.log('maxDistanceApply', PeshTools.run.filters.maxDistanceApply, haveRequired);

        var haveRequiredStrings = false;
        for (var string in PeshTools.run.strings)
        {
            if (!PeshTools.run.strings.hasOwnProperty(string))
            {
                continue;
            }

            haveRequiredStrings |= ('Require' === PeshTools.run.strings[string]);
        }

        haveRequiredStrings &= PeshTools.run.filters.execStrings;
        haveRequired |= haveRequiredStrings;

        PeshToolsDbg && console.info('haveRequired', haveRequired);

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

            PeshToolsDbg && console.groupCollapsed(order.id);

            var showOrder = true;
            var hideOrder = false;

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

                        showOrder &= true;
                    } else if ('Exclude' === PeshTools.run.filters[filter])
                    {
                        PeshToolsDbg && console.info('Exclude by', filter);

                        hideOrder = true;
                        showOrder = false;
                    }
                } else if ('Require' === PeshTools.run.filters[filter])
                {
                    PeshToolsDbg && console.info('Exclude by required', filter);

                    hideOrder = true;
                    showOrder = false;
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
                    PeshTools.run.stats['string' + string]++;

                    if (!PeshTools.run.filters.execStrings)
                    {
                        continue;
                    }

                    if ('Require' === PeshTools.run.strings[string])
                    {
                        PeshToolsDbg && console.info('Require by', string);

                        showOrder &= true;
                    } else if ('Exclude' === PeshTools.run.strings[string])
                    {
                        PeshToolsDbg && console.info('Exclude by', string);

                        hideOrder = true;
                        showOrder = false;
                    }
                } else if ('Require' === PeshTools.run.strings[string])
                {
                    if (!PeshTools.run.filters.execStrings)
                    {
                        continue;
                    }

                    PeshToolsDbg && console.info('Exclude by required', string);

                    hideOrder = true;
                    showOrder = false;
                }
            }


            // Применение фильтра минимального реального заработка.
            if (order.realEarning >= PeshTools.run.filters.minRealEarning)
            {
                PeshTools.run.stats.minRealEarning++;

                if (PeshTools.run.filters.minRealEarningApply)
                {
                    PeshToolsDbg && console.info('Require by minRealEarning');
                    showOrder &= true;
                }
            } else
            {
                if (PeshTools.run.filters.minRealEarningApply)
                {
                    PeshToolsDbg && console.info('Exclude by minRealEarning');

                    hideOrder = true;
                    showOrder = false;
                }
            }


            // Применение фильтра максимального полного залога.
            if (order.fullPledge <= PeshTools.run.filters.maxFullPledge)
            {
                if (PeshTools.run.filters.maxFullPledgeApply)
                {
                    PeshToolsDbg && console.info('Require by maxFullPledge');
                    showOrder &= true;
                }
            } else
            {
                PeshTools.run.stats.maxFullPledge++;

                if (PeshTools.run.filters.maxFullPledgeApply)
                {
                    PeshToolsDbg && console.info('Exclude by maxFullPledge');

                    hideOrder = true;
                    showOrder = false;
                }
            }


            // Применение фильтра максимальной дистанции.
            if (order.maxDistance <= PeshTools.run.filters.maxDistance)
            {
                if (PeshTools.run.filters.maxDistanceApply)
                {
                    PeshToolsDbg && console.info('Require by maxDistance');
                    showOrder &= true;
                }
            } else
            {
                PeshTools.run.stats.maxDistance++;

                if (PeshTools.run.filters.maxDistanceApply)
                {
                    PeshToolsDbg && console.info('Exclude by maxDistance');

                    hideOrder = true;
                    showOrder = false;
                }
            }


            // Применение фильтра максимального веса.
            if (order.weight <= PeshTools.run.filters.maxWeight)
            {
                if (PeshTools.run.filters.maxWeightApply)
                {
                    PeshToolsDbg && console.info('Require by maxWeight');
                    showOrder &= true;
                }
            } else
            {
                PeshTools.run.stats.maxWeight++;

                if (PeshTools.run.filters.maxWeightApply)
                {
                    PeshToolsDbg && console.info('Exclude by maxWeight');

                    hideOrder = true;
                    showOrder = false;
                }
            }

            PeshToolsDbg && console.groupEnd(order.id);
            PeshToolsDbg && console.log(order.id, showOrder, hideOrder, haveRequired);
            PeshToolsDbg && console.info(order.id, 'hide?', hideOrder || (haveRequired && !showOrder));

            // Решение о видимости заказа в списке.
            if (hideOrder || (haveRequired && !showOrder))
            {
                if (!/peshToolsHide/.test(order.$table.className))
                {
                    PeshTools.embedded.fns.orderHide(order.$table);
                }
            } else
            {
                PeshTools.run.stats.ordersVisible++;

                if (/peshToolsHide/.test(order.$table.className))
                {
                    PeshTools.embedded.fns.orderShow(order.$table);
                }
            }
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

        // Сброс счетчика следующего обновления.
        setTimeout(function ()
        {
            PeshTools.embedded.fns.resetCountdown();
        }, 0);
    };

    // PeshTools.embedded.fns.update = function ()


    /**
     * Показывает заказ в списке.
     *
     * @param {HTMLElement} orderTable
     * @return {Void}
     */
    PeshTools.embedded.fns.orderShow = function (orderTable)
    {
        orderTable.className = orderTable.className.replace(/\s*peshToolsHide\s*/, '');
    };

    // PeshTools.embedded.fns.orderShow = function (orderTable)


    /**
     * Показывает заказ в списке (по идентификатору заказа).
     *
     * @param {Number} orderId
     * @return {Void}
     */
    PeshTools.embedded.fns.orderShowById = function (orderId)
    {
        if ('undefined' !== PeshTools.run.orders[orderId])
        {
            var orderTable = PeshTools.run.orders[orderId].$table;
            PeshTools.embedded.fns.orderShow(orderTable);
        }
    };

    // PeshTools.embedded.fns.orderShowById = function (orderId)


    /**
     * Скрывает заказ из списка.
     *
     * @param {HTMLElement} orderTable
     * @return {Void}
     */
    PeshTools.embedded.fns.orderHide = function (orderTable)
    {
        orderTable.className += ' peshToolsHide';
    };

    // PeshTools.embedded.fns.orderHide = function (orderTable)


    /**
     * Скрывает заказ из списка (по идентификатору заказа).
     *
     * @param {Number} orderId
     * @return {Void}
     */
    PeshTools.embedded.fns.orderHideById = function (orderId)
    {
        if ('undefined' !== PeshTools.run.orders[orderId])
        {
            var orderTable = PeshTools.run.orders[orderId].$table;
            PeshTools.embedded.fns.orderHide(orderTable);
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

            // Пропускаем таблицы с объявленным идентификатором заказа.
            if ('undefined' !== typeof table.dataset.peshToolsOrderId)
            {
                PeshToolsDbg && console.info(table.dataset.peshToolsOrderId);
                PeshToolsDbg && console.log(PeshTools.run.orders[table.dataset.peshToolsOrderId]);

                // Отметка заказа как представленного в списке.
                var order = PeshTools.run.orders[table.dataset.peshToolsOrderId];
                order.listed = true;

                return;
            }

            // Проверка метки пропуска таблицы.
            if ('undefined' !== typeof table.dataset.peshToolsSkip)
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
    };

    // PeshTools.embedded.fns.updateUI = function ()


    /**
     * Обработчик сообщений от фонового скрипта.
     * 
     * @param {Object} request
     * @returns {Void}
     */
    PeshTools.embedded.fns.onmessage_hnd = function (request)
    {
        PeshToolsDbg && console.info('@ PeshTools.embedded.fns.onmessage_hnd()', request);

        switch (request.method)
        {
            /**
             * Обновление информации о списке заказов.
             */
            case 'update.run':
                PeshTools.embedded.fns.fetchRunDataRequest(true);
                break;
        }
    };

    // PeshTools.embedded.fns.onmessage_hnd = function (request)


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
        if (orderTable.dataset.peshToolsTag)
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

                this.lowerText += currentValue.innerText.toLowerCase() + "\n";

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
                this.weight = Number.parseFloat((weightData[1] / 1000).toFixed(3));

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
            dropsDiv.className = 'peshToolsDrops';
            dropsDiv.innerHTML = 'Итого адресов: <strong>' + this.dropsOverall + '</strong>';
            dropsBlock.appendChild(dropsDiv);
        }

        // Процент комиссии.
        var commissionSup = document.createElement('sup');
        commissionSup.className = 'peshToolsCommission';
        commissionSup.innerText = '{ ' + Math.round(this.commissionRate, 4) + '% }';
        commissionBlock.innerHTML = commissionBlock.innerHTML.replace(/(Комиссия.+?руб.)/, '$1' + commissionSup.outerHTML);

        if (!this.propHooking)
        {
            // Для не "Аренды курьера" - реальный заработок и реальный заработок на адрес доставки.
            var earningDiv = document.createElement('div');
            earningDiv.className = 'peshToolsEarning';
            earningDiv.innerHTML = '<strong>' + this.realEarning + '</strong> <sub>(' + this.earningPerDrop + ')</sub>';
            earningBlock.appendChild(earningDiv);
        }

        // Пара отметок об успешной обработке таблицы заказа.
        this.$table.dataset.peshToolsTag = Math.random();
        this.$table.dataset.peshToolsOrderId = this.id;
    };

    // PeshTools.embedded.classes.order = function (orderTable)


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

        PeshToolsENV.runtime.sendMessage({
            method: 'ga.pageview',
            page: '/embedded#panel-' + PeshTools.run.$panel.className,
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
        PeshToolsENV.runtime.sendMessage({
            method: 'ga.pageview',
            page: '/embedded',
            title: document.title
        });
        
        window.setInterval(function () {
            PeshToolsENV.runtime.sendMessage({
                method: 'ga.pageview',
                page: '/embedded#alive+panel-' + PeshTools.run.$panel.className,
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
    };

    // PeshTools.embedded.fns.bootstrapUIModeEmbedded = function ()


    /**
     * Начальная загрузка: отрисовка интерфейса (в режиме страницы кофигурации).
     *
     * @return {Void}
     */
    PeshTools.embedded.fns.bootstrapUIModeOptions = function ()
    {
        PeshToolsENV.runtime.sendMessage({
            method: 'ga.pageview',
            page: '/options',
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

    // PeshTools.embedded.fns.bootstrapUIFilters = function ()


    /**
     * Обработчик изменения значения четырехзначного фильтра.
     *
     * @return {Void}
     */
    PeshTools.embedded.fns.onQuadStateFilterChange = function ()
    {
        PeshToolsDbg && console.log(this);

        var m = /^(.+)(Require|Highlight|Bypass|Exclude)$/.exec(this.id);

        var filter = m[1];
        var value = m[2];

        PeshTools.run.filters[filter] = value;

        PeshToolsDbg && console.info(PeshTools.run.filters);

        PeshToolsENV.runtime.sendMessage({
            method: 'config.save',
            bank: 'filters',
            name: filter,
            value: value,
            scheduleUpdate: true,
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

        PeshToolsENV.runtime.sendMessage({
            method: 'config.save',
            bank: 'filters',
            name: filter,
            value: value,
            scheduleUpdate: true,
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
        } else
        {
            value = Number.parseInt(value);
        }

        PeshToolsENV.runtime.sendMessage({
            method: 'config.save',
            bank: 'filters',
            name: filter,
            value: value,
            scheduleUpdate: true,
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

        PeshToolsENV.runtime.sendMessage({
            method: 'config.save',
            bank: 'filters',
            name: filter,
            value: value,
            scheduleUpdate: true,
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
        button.id = string + 'Delete';
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

            PeshToolsENV.runtime.sendMessage({
                method: 'config.save',
                bank: 'filters',
                name: 'execStrings',
                value: value,
                scheduleUpdate: true,
                title: document.title
            });

            return;
        }

        var m = /^string(.+)(Require|Highlight|Bypass|Exclude)$/.exec(this.id);

        var string = m[1];
        var value = this.value;

        PeshTools.run.strings[string] = value;

        PeshToolsENV.runtime.sendMessage({
            method: 'config.save',
            bank: 'strings',
            name: string,
            value: value,
            scheduleUpdate: true,
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

        PeshToolsENV.runtime.sendMessage({
            method: 'config.save',
            bank: 'strings',
            name: string,
            value: 'Bypass',
            scheduleUpdate: true,
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

        PeshToolsENV.runtime.sendMessage({
            method: 'strings.delete',
            name: string,
            scheduleUpdate: true,
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

        PeshToolsENV.runtime.sendMessage({
            method: 'config.save',
            bank: 'filters',
            name: filter,
            value: value,
            scheduleUpdate: true,
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

        PeshToolsDbg && console.warn(PeshTools.run.config);

        PeshToolsENV.runtime.sendMessage({
            method: 'config.save',
            bank: 'config',
            name: option,
            value: value,
            scheduleUpdate: true,
            title: document.title
        });
    };

    // PeshTools.embedded.fns.onOptionChange = function ()


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

        PeshTools.run.$panelStickerCountdown.innerHTML = '⌛';
        PeshTools.run.$panelStickerCountdown.className = 'hide';
    };

    // PeshTools.embedded.fns.ticksStop = function ()


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

        var searchCourierBalance = true;
        var searchCourierVerified = true;

        var aElements = document.getElementsByTagName('a');

        for (var i in aElements)
        {
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
                    PeshTools.run.courierVerified = true;
                }

                continue;
            }

            // http://peshkariki.ru/user/balance.html a.title
            // Ваш баланс: 0 руб.
            if (searchCourierBalance && 'http://peshkariki.ru/user/balance.html' === a.href)
            {
                var m = /Ваш баланс: (\d+) руб\./.exec(a.title);

                if (m)
                {
                    searchCourierBalance = false;

                    PeshTools.run.$courierBalanceNode = a;
                    PeshTools.run.courierBalance = Number.parseInt(m[1]);
                }

                continue;
            }
        }

        PeshTools.run.courierBalanceFull = PeshTools.run.courierBalance;
        if (PeshTools.run.courierVerified)
        {
            PeshTools.run.courierBalanceFull += 5000;
        }

        PeshToolsDbg && console.info('PeshTools.run :', PeshTools.run);

        // регистрация обработчика сообщений от фонового скрипта
        PeshToolsENV.runtime.onMessage.addListener(PeshTools.embedded.fns.onmessage_hnd);

        // наши стили тоже сюда подтягиваем (вдруг заработают) 
        var embedded_css = document.createElement("link");
        embedded_css.rel = "stylesheet";
        embedded_css.type = "text/css";
        embedded_css.href = PeshToolsENV.extension.getURL('/css/peshtools.embedded.css');

        PeshTools.run.$head.appendChild(embedded_css);

        PeshToolsENV.runtime.sendMessage({
            method: 'skel.fetch'
        }, PeshTools.embedded.fns.bootstrapSkelProcessor);
    };


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

        PeshTools.run.config = response.config;
        PeshTools.run.filters = response.filters;
        PeshTools.run.strings = response.strings;
        PeshTools.run.debug = response.config.selfDebug;
        PeshToolsDbg = response.config.selfDebug;
        PeshTools.run.selfAutoupdate = response.config.selfAutoupdate;

        if (document.location.href === PeshToolsENV.extension.getURL('/html/peshtools.options.html'))
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
