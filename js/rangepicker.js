'use strict';

import moment from 'moment';

(function($){

    $.fn.rangepicker = function(options) {

        var self = this;

        options = $.extend({

            datemin: '1995-01-01',
            datemax: '2050-12-01',
            mirror: true,
            months: 3,
            lastMonthDisplayed: undefined,
            defaultStart: moment().subtract(6, 'days').format('YYYY-MM-DD'),
            defaultEnd: moment().format('YYYY-MM-DD'),
            defaultCompareStart: null,
            defaultCompareEnd: null,
            defaultCompareType: 'custom',
            futureEnabled: true,
            maxDate: null,
            minDate: null,
            onChange: function(){},
            onHide: function(){},
            onShow: function(){},
            onMonthChange: function(){}

        }, options);

        options.maxDateMoment = (options.maxDate) ? moment(new Date(options.maxDate)) : null;
        options.minDateMoment = (options.minDate) ? moment(new Date(options.minDate)) : null;

        var status = {
            lastMonthDisplayed: moment(options.lastMonthDisplayed),
            lastSelected: '',
            lastSelectedCompare: '',
            intervalStart: moment(new Date(options.defaultStart)).format('YYYY-MM-DD') || null,
            intervalEnd:  moment(new Date(options.defaultEnd)).format('YYYY-MM-DD') || null,
            compareIntervalStart:  moment(options.defaultCompareStart).format('YYYY-MM-DD') || null,
            compareIntervalEnd:  moment(options.defaultCompareEnd).format('YYYY-MM-DD') || null
        };

        var outputFrom, outputTo, outputCompareFrom, outputCompareTo;
        var prev, next, content, months, form;
        var dateFrom, dateTo, compareDateFrom, compareDateTo, showCompare, compareRangeOptions, controls;
        var daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

        /********************* STRUCTURE **********************/
        /**
         * Create basic DOM structure
         */
        function createCalendarStructure() {

            prev = $('<span class="rp-prev"> ◂ </span>').addClass('rp-clickable');
            next = $('<span class="rp-next"> ▸ </span>').addClass('rp-clickable');
            months = $('<span class="rp-months"></span>');
            content = $('<div class="rp-content"></div>');

            content
                .append(prev)
                .append(months)
                .append(next);

            self
                .addClass('rangepicker')
                .append(content);

            content
                .addClass('rp-popup')
                .click(function(event){
                    event.stopPropagation();
                })
                .hide();

            self.click(function(){
                content.toggle();
                self.toggleClass('open');
                if (content.is(':visible')){
                    options.onShow();
                } else {
                    options.onHide();
                }
            });

            makeForm();
        }

        /**
         * Create form on the side
         */
        function makeForm() {
            form = $('<div class="rp-form"></div>');

            ///// Date Range
            var dateRangesOptions = [
                [ 'custom', 'Custom' ],
                [ 'today', 'Today' ],
                [ 'yesterday', 'Yesterday' ],
                [ 'last7Days', 'Last 7 days' ],
                [ 'last30Days', 'Last 30 days' ]
            ].reduce((list, next) => {
                list = list + `<option value="${next[0]}">${next[1]}</option>`;
                return list;
            }, '');

            var startFormatted = moment(status.intervalStart, 'YYYY-MM-DD').format('MMM D, YYYY');
            var endFormatted = moment(status.intervalEnd, 'YYYY-MM-DD').format('MMM D, YYYY');
            var dateRanges =
                $(`<div class="rp-daterange-preset-container">
                    <label for="rp-daterange-preset">Date range:</label>
                    <select id="rp-daterange-preset" class="rp-daterange-preset">
                        ${dateRangesOptions}
                    </select>
                </div>`);
            dateFrom =
                $('<div class="rp-date-input">' +
                    `<input class="rp-input-mini rp-input-interval focus" type="date" name="range-start" value="${startFormatted}">` +
                '</div> - ');
            dateTo =
                $('<div class="rp-date-input">' +
                    `<input class="rp-input-mini rp-input-interval" type="date" name="range-end" value="${endFormatted}">` +
                '</div>');

            ///// Compare date range
            var compareDateRangesOptions = [
                [ 'mirror', 'Previous' ],
                [ 'lastYear', 'Previous year' ],
                [ 'custom', 'Custom' ]
            ].reduce((list, next) => {
                list = list + `<option value="${next[0]}">${next[1]}</option>`;
                return list;
            }, '');

            var compareStartFormatted = '';
            var compareEndFormatted = '';
            showCompare = $(' <input type="checkbox" class="rp-compare-switch">');
            compareRangeOptions = $(`<select id="rp-comparerange-preset" class="rp-comparerange-preset">
                ${compareDateRangesOptions}
                </select>`);
            if (status.compareIntervalStart && status.compareIntervalEnd) {
                compareStartFormatted = moment(status.compareIntervalStart, 'YYYY-MM-DD').format('MMM D, YYYY');
                compareEndFormatted = moment(status.compareIntervalEnd, 'YYYY-MM-DD').format('MMM D, YYYY');
                showCompare.prop('checked', true);
                compareRangeOptions.val(options.defaultCompareType);
            } else if (options.defaultCompareType) {
                showCompare.prop('checked', true);
                compareRangeOptions.val(options.defaultCompareType);
            }
            var compareDateRanges =
                $(`<div class="rp-comparerange-preset-container">
                    <label for="rp-comparerange-preset">Compare to period:</label>  
                </div>`);
            compareDateRanges
                .prepend(showCompare)
                .append(compareRangeOptions);
            compareDateFrom =
                $('<div class="rp-date-input">' +
                    `<input class="rp-input-mini rp-input-compare" type="date" name="compare-range-start" value="${compareStartFormatted}">` +
                    '</div> - ');
            compareDateTo =
                $('<div class="rp-date-input">' +
                    `<input class="rp-input-mini rp-input-compare" type="date" name="compare-range-end" value="${compareEndFormatted}">` +
                    '</div>');

            controls = $('<div>');
            var applyBtn =
                $('<button class="rp-btn rp-applyBtn">Apply</button>');
            var cancelBtn =
                $('<button class="rp-btn rp-cancelBtn">Cancel</button>');
            controls
                .append(applyBtn)
                .append(cancelBtn);

            form
                .append(dateRanges)
                .append(dateFrom)
                .append(dateTo)
                .append(compareDateRanges)
                .append(compareDateFrom)
                .append(compareDateTo)
                .append(controls);

            content.append(form);
        }

        /**
         * Prepare output structure
         */
        function prepareOutputs() {
            var startFormatted = moment(status.intervalStart, 'YYYY-MM-DD').format('MMM D, YYYY');
            var endFormatted = moment(status.intervalEnd, 'YYYY-MM-DD').format('MMM D, YYYY');
            outputFrom = $(`<span class="rangepicker-from">${startFormatted}</span>`);
            outputTo = $(`<span class="rangepicker-to">${endFormatted}</span>`);
            var outputs = $('<div class="rangepicker-interval"> - </div>');
            outputs
                .prepend(outputFrom)
                .append(outputTo);

            var compareStartFormatted, compareEndFormatted;
            if (status.compareIntervalStart && status.compareIntervalEnd) {
                compareStartFormatted = moment(status.compareIntervalStart, 'YYYY-MM-DD').format('MMM D, YYYY');
                compareEndFormatted = moment(status.compareIntervalEnd, 'YYYY-MM-DD').format('MMM D, YYYY');
            }
            outputCompareFrom = $(`<span class="rangepicker-compare-from">${compareStartFormatted}</span>`);
            outputCompareTo = $(`<span class="rangepicker-compare-to">${compareEndFormatted}</span>`);
            var outputsCompare = $('<div class="rangepicker-compare-interval"> - </div>');
            outputsCompare
                .prepend(outputCompareFrom)
                .append(outputCompareTo);
            if (!status.compareIntervalStart || !status.compareIntervalEnd){
                outputsCompare.hide();
            }

            self
                .append(outputs)
                .append(outputsCompare);
        }

        /**
         * Calculate week days of the month
         * @param month
         * @returns {Array}
         */
        function prepareWeeks(month) {
            var weeks = [];
            var firstDay = moment(month + ' 01', 'YYYY MM DD');
            var lastDay = moment(month + ' 01', 'YYYY MM DD').endOf('month');
            var monthNum = firstDay.format('MM');
            var date;
            var todayMoment = moment();

            for (let i = 0; i < 6; i++) { // six weeks
                let week = [];

                for (let j = 0; j < 7; j++){ // seven days
                    if ((i === 0) && (j < firstDay.day())){ // blank slots at the beginning
                        week.push('<td></td>');
                    } else if (date && ((date + 1) > lastDay.date())) { // and at the end
                        week.push('<td></td>');
                    } else {
                        if (!date){
                            date = 1;
                        } else {
                            date++;
                        }
                        let dateFormatted = firstDay.format('YYYY-MM') + '-' + ((date > 9) ? date : ('0' + date));
                        let selectable = 'rp-selectable';
                        let dateMoment = moment(dateFormatted, 'YYYY-MM-DD');

                        if ((!options.futureEnabled && dateMoment.isAfter(todayMoment, 'day'))
                            || (options.maxDateMoment && dateMoment.isAfter(options.maxDateMoment, 'day'))
                            || (options.minDateMoment && dateMoment.isBefore(options.minDateMoment, 'day')) ){
                            selectable = 'rp-not-selectable';
                        }
                        week.push(`<td class="rp-day rp-month-${monthNum} rp-date-${date} ${selectable}" data-date="${dateFormatted}">${date}</td>`);
                    }
                }

                let weekRow = '<tr>' + week.join() + '</tr>';
                weeks.push(weekRow);
            }

            return weeks;
        }

        /**
         * Add month view to calendar
         * @param month
         * @param position
         */
        function addMonth(month, position) {
            var monthName = moment(month + ' 01', 'YYYY MM DD').format('MMMM YYYY');
            var monthNameContainer = $(`<span class="rp-month-name">${monthName}</span>`);

            // add names of days
            var weekHeader = daysOfWeek.map((day) => {
                return `<th class="rp-day-name">${day}</th>`;
            }).join();
            var weekHeaderRow = '<tr>' + weekHeader + '</tr>';
            // add days
            var weeks = prepareWeeks(month);
            // join in table
            var table = $('<table class="rp-days-table"></table>');
            table.append($(weekHeaderRow));
            for (let week of weeks) {
                table.append($(week));
            }

            var monthContainer = $('<div class="rp-month"></div>');
            monthContainer.append(monthNameContainer);
            monthContainer.append(table);

            if (position === 'start'){
                months.prepend(monthContainer);
            } else {
                months.append(monthContainer);
            }
        }

        /**
         * Remove month from the calendar
         * @param position
         */
        function removeMonth(position) {
            if (position === 'start') {
                months.find('.rp-month:first-child').remove();
            } else {
                months.find('.rp-month:last-child').remove();
            }
        }

        /********************* CONTROLS **********************/
        /**
         * Add event bindings
         */
        function addBindings() {
            // move month view
            next.click(moveForward);
            prev.click(moveBack);

            // picking dates in calendar
            handpickInterval();
            dateFrom.find('input').on('focus', handpickInterval);
            dateTo.find('input').on('focus', handpickInterval);
            compareDateFrom.find('input').on('focus', handpickCompareInterval);
            compareDateTo.find('input').on('focus', handpickCompareInterval);

            // daterange input changes
            dateFrom.find('input')
                .on('change', changeInterval)
                .on('focus', (e) => { addFocus($(e.currentTarget)); });
            dateTo.find('input')
                .on('change', changeInterval)
                .on('focus', (e) => { addFocus($(e.currentTarget)); });

            // compare input changes
            compareDateFrom.find('input')
                .on('change', () => { calculateCompareCustom('input'); })
                .on('focus', (e) => { addFocus($(e.currentTarget)); });
            compareDateTo.find('input')
                .on('change', () => { calculateCompareCustom('input'); })
                .on('focus', (e) => { addFocus($(e.currentTarget)); });

            // form controls
            form.find('.rp-daterange-preset').on('change', useDefinedInterval);
            showCompare
                .on('change', () => { calculateCompare(); });
            compareRangeOptions
                .on('change', () => { calculateCompare(); });
            controls.find('.rp-applyBtn').click(function(){
                applyChanges();
                content.hide();
            });
            controls.find('.rp-cancelBtn').click(function(){
                resetChanges();
                content.hide();
            });

            form.find('.rp-daterange-preset-container')
                .on('click', function() {
                    addFocus(dateFrom.find('input'));
                    handpickInterval();
                });
            form.find('.rp-comparerange-preset-container')
                .on('click', function(event) {
                    var target = $(event.target);
                    if (!target.hasClass('rp-compare-switch') || target.prop('checked')){
                        addFocus(compareDateFrom.find('input'));
                        handpickCompareInterval();
                    } else {
                        addFocus(dateFrom.find('input'));
                        handpickInterval();
                    }
                    if (!target.hasClass('rp-compare-switch') && !showCompare.prop('checked')) {
                        showCompare.prop('checked', true);
                        calculateCompare();
                    }
                });
        }

        /**
         * Wait for user input on base interval (calendar click)
         */
        function handpickInterval(){
            status.lastSelected = null;

            months.find('.rp-day').off('click');
            months.find('.rp-day').on('click', calculateInterval);
        }

        /**
         * Wait for user input on compare interval (calendar click)
         */
        function handpickCompareInterval(){
            status.lastSelectedCompare = null;

            months.find('.rp-day').off('click');
            months.find('.rp-day').on('click', function(event) {
                return calculateCompareCustom('click', event);
            });
        }

        /******************** ACTIONS ***********************/
        /**
         * Add focus class to input (&siblings)
         */
        function addFocus(elem) {
            form.find('.focus').removeClass('focus');
            elem.addClass('focus');
        }

        /**
         * Highlight everything between interval start & end
         */
        function highlightSelection() {
            // paint start-end
            if (status.intervalEnd === status.intervalStart) {
                months.find(`.rp-day[data-date="${status.intervalStart}"]`).addClass('rp-interval-oneday');
            } else {
                months.find(`.rp-day[data-date="${status.intervalEnd}"]`).addClass('rp-interval-end');
                months.find(`.rp-day[data-date="${status.intervalStart}"]`).addClass('rp-interval-start');
            }

            // rest of the selection
            months.find('.rp-selected-normal').removeClass('rp-selected-normal');
            months.find('.rp-day')
                .filter(function(){
                    var insideInterval = ((this.dataset.date > status.intervalStart) && (this.dataset.date < status.intervalEnd));
                    return insideInterval;
                })
                .addClass('rp-selected-normal');
        }

        /**
         * Highlight everything between compare interval start & end
         */
        function highlightCompareSelection() {
            // paint start-end
            if (status.compareIntervalEnd === status.compareIntervalStart) {
                months.find(`.rp-day[data-date="${status.compareIntervalStart}"]`).addClass('rp-compare-oneday');
            } else {
                months.find(`.rp-day[data-date="${status.compareIntervalEnd}"]`).addClass('rp-compare-end');
                months.find(`.rp-day[data-date="${status.compareIntervalStart}"]`).addClass('rp-compare-start');
            }

            // rest of the selection
            months.find('.rp-selected-compare').removeClass('rp-selected-compare');
            months.find('.rp-day')
                .filter(function(){
                    var insideCompareInterval = ((this.dataset.date > status.compareIntervalStart) && (this.dataset.date < status.compareIntervalEnd));
                    return insideCompareInterval;
                })
                .addClass('rp-selected-compare');
        }

        /**
         * +1 month
         */
        function moveForward() {
            status.lastMonthDisplayed.add(1, 'month');

            removeMonth('start');
            addMonth(status.lastMonthDisplayed.format('YYYY MM'), 'end');

            updateDatesAfterCalendarShift();
            options.onMonthChange();
        }

        /**
         * -1 month
         */
        function moveBack() {
            status.lastMonthDisplayed.subtract(1, 'month');
            var firstMonthDisplayed = status.lastMonthDisplayed.clone().subtract((options.months -1), 'months');

            removeMonth('end');
            addMonth(firstMonthDisplayed.format('YYYY MM'), 'start');

            updateDatesAfterCalendarShift();
            options.onMonthChange();
        }

        /**
         * Updates needed after view has been shifted
         */
        function updateDatesAfterCalendarShift() {
            months.find('.rp-day').off('click');
            months.find('.rp-day').on('click', calculateInterval);

            highlightSelection();
            highlightCompareSelection();
        }

        /**
         * Reset interval markers
         */
        function clearRangeDisplay() {
            months.find('.rp-interval-start').removeClass('rp-interval-start');
            months.find('.rp-interval-end').removeClass('rp-interval-end');
            months.find('.rp-interval-oneday').removeClass('rp-interval-oneday');
        }

        /**
         * Set some of pre-defined time intervals
         * @param event
         */
        function useDefinedInterval(event) {
           clearRangeDisplay();
            var interval = $(event.currentTarget).find('option:selected').val();

            var start, end;
            switch (interval) {
                case 'today':
                    let today = moment().format('YYYY-MM-DD');
                    status.intervalStart = status.intervalEnd = today;
                    $(`.rp-day[data-date="${today}"]`).addClass('rp-interval-oneday');
                    break;
                case 'yesterday':
                    let yesterday = moment().subtract(1, 'day').format('YYYY-MM-DD');
                    status.intervalStart = status.intervalEnd = yesterday;
                    $(`.rp-day[data-date="${yesterday}"]`).addClass('rp-interval-oneday');
                    break;
                case 'last7Days':
                    start = moment().subtract(7, 'day').format('YYYY-MM-DD');
                    end = moment().subtract(1, 'day').format('YYYY-MM-DD');
                    status.intervalStart = start;
                    status.intervalEnd = end;
                    $(`.rp-day[data-date="${start}"]`).addClass('rp-interval-start');
                    $(`.rp-day[data-date="${end}"]`).addClass('rp-interval-end');
                    break;
                case 'last30Days':
                    start = moment().subtract(30, 'day').format('YYYY-MM-DD');
                    end = moment().subtract(1, 'day').format('YYYY-MM-DD');
                    status.intervalStart = start;
                    status.intervalEnd = end;
                    $(`.rp-day[data-date="${start}"]`).addClass('rp-interval-start');
                    $(`.rp-day[data-date="${end}"]`).addClass('rp-interval-end');
                    break;
            }

            calculateCompare();
            highlightSelection();
            setInputs();
        }

        /**
         * Change interval based on input
         * @param event
         */
        function changeInterval(event) {
           clearRangeDisplay();
            var target = $(event.currentTarget);
            if (target.attr('name') === 'range-start'){
                status.intervalStart = moment(new Date( target.val() )).format('YYYY-MM-DD');
            } else if (target.attr('name') === 'range-end') {
                status.intervalEnd = moment(new Date( target.val() )).format('YYYY-MM-DD');
            }
            $(`.rp-day[data-date="${status.intervalStart}"]`).addClass('rp-interval-start');
            $(`.rp-day[data-date="${status.intervalEnd}"]`).addClass('rp-interval-end');

            calculateCompare();
            highlightSelection();
            setInputs();

            // TODO: handle wrong input
        }

        /**
         * Highlight start, end and selection
         */
        function highlightInit() {
            highlightSelection();

            if (status.compareIntervalStart && status.compareIntervalEnd) {
                highlightCompareSelection();
            }
        }

        /**
         * Set date range inputs
         */
        function setInputs() {
            let startFormatted = moment(status.intervalStart, 'YYYY-MM-DD').format('MMM D, YYYY');
            let endFormatted = moment(status.intervalEnd, 'YYYY-MM-DD').format('MMM D, YYYY');

            dateFrom.find('input').val(startFormatted);
            dateTo.find('input').val(endFormatted);
        }

        /**
         * Apply changes = update outputs
         */
        function applyChanges() {
            let startFormatted = moment(status.intervalStart, 'YYYY-MM-DD').format('MMM D, YYYY');
            let endFormatted = moment(status.intervalEnd, 'YYYY-MM-DD').format('MMM D, YYYY');
            outputFrom.html(startFormatted);
            outputTo.html(endFormatted);

            if (showCompare.prop('checked')){
                let startCompareFormatted = moment(status.compareIntervalStart, 'YYYY-MM-DD').format('MMM D, YYYY');
                let endCompareFormatted = moment(status.compareIntervalEnd, 'YYYY-MM-DD').format('MMM D, YYYY');
                outputCompareFrom.html(startCompareFormatted);
                outputCompareTo.html(endCompareFormatted);
                outputCompareFrom.parent().show();
            } else {
                status.compareIntervalStart = null;
                status.compareIntervalEnd = null;
                outputCompareFrom.parent().hide();
            }

            options.onChange({
                intervalStart: status.intervalStart,
                intervalEnd: status.intervalEnd,
                compareIntervalStart: status.compareIntervalStart,
                compareIntervalEnd: status.compareIntervalEnd
            });
        }

        /**
         * Reset changes - restore original values
         */
        function resetChanges() {
            status.intervalStart = moment( new Date( outputFrom.html() ) ).format('YYYY-MM-DD');
            status.intervalEnd = moment( outputTo.html() ).format('YYYY-MM-DD');

            status.compareIntervalStart = moment( new Date( outputCompareFrom.html() ) ).format('YYYY-MM-DD');
            status.compareIntervalEnd = moment( new Date( outputCompareTo.html() ) ).format('YYYY-MM-DD');

            setInputs();
            setCompareInputs();
            if (!status.compareIntervalEnd || !status.compareIntervalEnd){
                showCompare.prop('checked', false);
                compareDateFrom.hide();
                compareDateTo.hide();
            }

            clearRangeDisplay();
            highlightSelection();
            clearCompareRangeDisplay();
            highlightCompareSelection();
        }

        /**
         * Prepare custom compare range selection
         */
        function prepareCompareCustom() {
            compareDateFrom.find('input').focus();
            handpickCompareInterval();
        }

        /**
         * Clear out compare range
         */
        function clearCompareRangeDisplay() {
            $('.rp-compare-start').removeClass('rp-compare-start');
            $('.rp-compare-end').removeClass('rp-compare-end');
            $('.rp-compare-oneday').removeClass('rp-compare-oneday');
            $('.rp-selected-compare').removeClass('rp-selected-compare');
        }

        /**
         * Set value of compare inputs
         */
        function setCompareInputs() {
            let startFormatted = moment(status.compareIntervalStart, 'YYYY-MM-DD').format('MMM D, YYYY');
            let endFormatted = moment(status.compareIntervalEnd, 'YYYY-MM-DD').format('MMM D, YYYY');
            compareDateFrom.find('input').val(startFormatted);
            compareDateTo.find('input').val(endFormatted);
        }

        /***************** SELECTION DECISIONS *****************/
        /**
         * Decide which range was selected
         * @param event
         */
        function calculateInterval(event) {
            if ($(event.currentTarget).hasClass('rp-selectable')){
                clearRangeDisplay();
                var dateClicked = event.target.dataset.date;

                if (!status.lastSelected || status.lastSelected === 'second'){ // selected first date
                    status.intervalStart = dateClicked;
                    status.intervalEnd = dateClicked;
                    status.lastSelected = 'first';
                    addFocus(dateTo.find('input'));
                } else {
                    if (status.intervalStart < dateClicked){ // selected newer date as second
                        status.intervalEnd = dateClicked;
                    } else { // selected older date as second
                        status.intervalStart = dateClicked;
                    }
                    status.lastSelected = 'second';
                    addFocus(dateFrom.find('input'));
                }

                highlightSelection();
                calculateCompare();
                setInputs();
            }
        }

        /**
         * Initiate compare interval creation - or not
         */
        function calculateCompare() {
            if (showCompare.prop('checked')){
                highlightCompareSelection();
                switch(compareRangeOptions.find('option:selected').val()) {
                    case 'mirror':
                        calculateCompareMirror();
                        break;
                    case 'lastYear':
                        calculateCompareLastYear();
                        break;
                    case 'custom':
                        calculateCompareCustom();
                        break;
                }
                compareDateFrom.css('display','inline');
                compareDateTo.css('display','inline');
            } else {
                clearCompareRangeDisplay();
                compareDateFrom.hide();
                compareDateTo.hide();
            }
        }

        /**
         * Set compare interval - type mirror
         * Show on calendar
         */
        function calculateCompareMirror() {
            // calculate
            let date = moment(status.intervalStart, 'YYYY-MM-DD');
            let length = Math.abs( date.diff(status.intervalEnd, 'days') );
            status.compareIntervalEnd = date.subtract(1, 'days').format('YYYY-MM-DD');
            status.compareIntervalStart = date.subtract(length, 'days').format('YYYY-MM-DD');

            // reset
            $('.rp-compare-start').removeClass('rp-compare-start');
            $('.rp-compare-end').removeClass('rp-compare-end');
            $('.rp-compare-oneday').removeClass('rp-compare-oneday');

            // show results
            clearCompareRangeDisplay();
            highlightCompareSelection();
            setCompareInputs();
        }

        /**
         * Set compare interval - to same days a year ago
         * Clear calendar
         */
        function calculateCompareLastYear() {
            // calculate
            status.compareIntervalEnd = moment(status.intervalEnd, 'YYYY-MM-DD').subtract('year', 1).format('YYYY-MM-DD');
            status.compareIntervalStart = moment(status.intervalStart, 'YYYY-MM-DD').subtract('year', 1).format('YYYY-MM-DD');

            // show results
            clearCompareRangeDisplay();
            highlightCompareSelection();
            setCompareInputs();
        }

        /**
         * Custom compare calculate - requires user input
         */
        function calculateCompareCustom(type, event) {
            if (compareRangeOptions.find('options:selected').val() !== 'custom'){
                compareRangeOptions.val('custom');
            }

            if (type === 'input' || $(event.currentTarget).hasClass('rp-selectable')) {
                clearCompareRangeDisplay();
                if (type === 'input') { // input was changed
                    status.compareIntervalStart = moment( new Date(compareDateFrom.find('input').val() ) ).format('YYYY-MM-DD');
                    status.compareIntervalEnd = moment( new Date(compareDateTo.find('input').val() ) ).format('YYYY-MM-DD');
                } else if (type === 'click') {
                    var dateClicked = event.target.dataset.date;

                    if (!status.lastSelectedCompare || status.lastSelectedCompare === 'second'){ // selected first date
                        status.compareIntervalStart = dateClicked;
                        status.compareIntervalEnd = dateClicked;
                        status.lastSelectedCompare = 'first';
                        $(event.target).addClass('rp-compare-oneday');
                        addFocus(compareDateTo.find('input'));
                    } else {
                        if (status.compareIntervalStart < dateClicked){ // selected newer date as second
                            status.compareIntervalEnd = dateClicked;
                            $(`.rp-day[data-date="${status.compareIntervalStart}"]`).addClass('rp-compare-start');
                            $(event.target).addClass('rp-compare-end');
                        } else { // selected older date as second
                            status.compareIntervalStart = dateClicked;
                            $(`.rp-day[data-date="${status.compareIntervalEnd}"]`).addClass('rp-compare-end');
                            $(event.target).addClass('rp-compare-start');
                        }
                        status.lastSelectedCompare = 'second';
                        addFocus(compareDateFrom.find('input'));
                    }
                    // TODO: but check that the ranges don't overlap
                }

                highlightCompareSelection();
                setCompareInputs();
            }
        }

        //////////////////// INITIATE //////////////////////
        createCalendarStructure();
        var date = status.lastMonthDisplayed.clone();
        for (var i=0; i < options.months; i++) {
            addMonth(date.format('YYYY MM'), 'start');
            date.subtract(1, 'month');
        }
        addBindings();
        highlightInit();
        calculateCompare();
        prepareOutputs();

        //////////////// TODO:
        // TODO: what if this is applied on multiple elements
        // TODO: handle overlaps and bad inputs
        // TODO: change next/prev icons
        // TODO: options on the position of popup

        return self;
    };

}(jQuery));
