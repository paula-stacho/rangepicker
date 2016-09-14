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
            onChange: function(){},
            onHide: function(){},
            onShow: function(){},
            onMonthChange: function(){}

        }, options);

        var status = {
            lastMonthDisplayed: moment(options.lastMonthDisplayed),
            lastSelected: '',
            lastSelectedCompare: '',
            intervalStart: options.defaultStart || null,
            intervalEnd: options.defaultEnd || null,
            compareIntervalStart: null,
            compareIntervalEnd: null
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

            prev = $('<span class="rp-prev"> < </span>').addClass('rp-clickable');
            next = $('<span class="rp-next"> > </span>').addClass('rp-clickable');
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
                if (content.is(':visible')){
                    options.onShow();
                } else {
                    options.onHide();
                }
            });

            makeForm();
            prepareOutputs();
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

            let startFormatted = moment(status.intervalStart).format('MMM D, YYYY');
            let endFormatted = moment(status.intervalEnd).format('MMM D, YYYY');
            var dateRanges =
                $(`<div>
                    <label for="rp-daterange-preset">Date range:</label>
                    <select id="rp-daterange-preset" class="rp-daterange-preset">
                        ${dateRangesOptions}
                    </select>
                </div>`);
            dateFrom =
                $('<div class="rp-date-input">' +
                    `<input class="rp-input-mini" type="date" name="range-start" value="${startFormatted}">` +
                '</div> - ');
            dateTo =
                $('<div class="rp-date-input">' +
                    `<input class="rp-input-mini" type="date" name="range-end" value="${endFormatted}">` +
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

            showCompare = $(' <input type="checkbox" class="rp-compare-switch">');
            compareRangeOptions = $(`<select id="rp-comparerange-preset" class="rp-comparerange-preset">
                ${compareDateRangesOptions}
                </select>`);
            var compareDateRanges =
                $(`<div>
                    <label for="rp-comparerange-preset">Compare to period:</label>  
                </div>`);
            compareDateRanges
                .prepend(showCompare)
                .append(compareRangeOptions);
            compareDateFrom =
                $('<div class="rp-date-input">' +
                    `<input class="rp-input-mini" type="date" name="compare-range-start" value="">` +
                    '</div> - ');
            compareDateTo =
                $('<div class="rp-date-input">' +
                    `<input class="rp-input-mini" type="date" name="compare-range-end" value="">` +
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
            var startFormatted = moment(options.defaultStart).format('MMM D, YYYY');
            var endFormatted = moment(options.defaultEnd).format('MMM D, YYYY');
            outputFrom = $(`<span class="rangepicker-from">${startFormatted}</span>`);
            outputTo = $(`<span class="rangepicker-to">${endFormatted}</span>`);
            var outputs = $('<div class="rangepicker-interval"> - </div>');
            outputs
                .prepend(outputFrom)
                .append(outputTo);

            outputCompareFrom = $(`<span class="rangepicker-compare-from"></span>`);
            outputCompareTo = $(`<span class="rangepicker-compare-to"></span>`);
            var outputsCompare = $('<div class="rangepicker-compare-interval"> - </div>');
            outputsCompare
                .prepend(outputCompareFrom)
                .append(outputCompareTo)
                .hide();

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
            var firstDay = moment(month + ' 01');
            var lastDay = moment(month + ' 01').endOf('month');
            var monthNum = firstDay.format('MM');
            var date;

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
                        week.push(`<td class="rp-day rp-month-${monthNum} rp-date-${date}" data-date="${dateFormatted}">${date}</td>`);
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
            var monthName = moment(month + ' 01').format('MMMM YYYY');
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
            dateFrom.find('input').on('change', changeInterval);
            dateTo.find('input').on('change', changeInterval);

            // compare input changes
            compareDateFrom.find('input').on('change', function(){
                return calculateCompareCustom('input');
            });
            compareDateTo.find('input').on('change', function(){
                return calculateCompareCustom('input');
            });

            // form controls
            form.find('.rp-daterange-preset').change(useDefinedInterval);
            showCompare.change(calculateCompare);
            compareRangeOptions.change(calculateCompare);
            controls.find('.rp-applyBtn').click(function(){
                applyChanges();
                content.hide();
            });
            controls.find('.rp-cancelBtn').click(function(){
                resetChanges();
                content.hide();
            });
        }

        /**
         * Wait for user input on base interval (calendar click)
         */
        function handpickInterval(){
            months.find('.rp-day').off('click');
            months.find('.rp-day').on('click', calculateInterval);
        }

        /**
         * Wait for user input on compare interval (calendar click)
         */
        function handpickCompareInterval(){
            months.find('.rp-day').off('click');
            months.find('.rp-day').on('click', function(event) {
                return calculateCompareCustom('click', event);
            });
        }

        /******************** ACTIONS ***********************/
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
                status.intervalStart = moment(target.val()).format('YYYY-MM-DD');
            } else if (target.attr('name') === 'range-end') {
                status.intervalEnd = moment(target.val()).format('YYYY-MM-DD');
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
            months.find(`.rp-day[data-date="${status.intervalStart}"]`).addClass('rp-interval-start');
            months.find(`.rp-day[data-date="${status.intervalEnd}"]`).addClass('rp-interval-end');

            highlightSelection();
        }

        /**
         * Set date range inputs
         */
        function setInputs() {
            let startFormatted = moment(status.intervalStart).format('MMM D, YYYY');
            let endFormatted = moment(status.intervalEnd).format('MMM D, YYYY');

            dateFrom.find('input').val(startFormatted);
            dateTo.find('input').val(endFormatted);
        }

        /**
         * Apply changes = update outputs
         */
        function applyChanges() {
            let startFormatted = moment(status.intervalStart).format('MMM D, YYYY');
            let endFormatted = moment(status.intervalEnd).format('MMM D, YYYY');
            outputFrom.html(startFormatted);
            outputTo.html(endFormatted);

            if (showCompare.prop('checked')){
                let startCompareFormatted = moment(status.compareIntervalStart).format('MMM D, YYYY');
                let endCompareFormatted = moment(status.compareIntervalEnd).format('MMM D, YYYY');
                outputCompareFrom.html(startCompareFormatted);
                outputCompareTo.html(endCompareFormatted);
                outputCompareFrom.parent().show();
            } else {
                status.compareIntervalStart = null;
                status.compareIntervalEnd = null;
                outputCompareFrom.parent().hide();
            }
        }

        /**
         * Reset changes - restore original values
         */
        function resetChanges() {
            status.intervalStart = moment( outputFrom.html() ).format('YYYY-MM-DD');
            status.intervalEnd = moment( outputTo.html() ).format('YYYY-MM-DD');

            status.compareIntervalStart = moment( outputCompareFrom.html() ).format('YYYY-MM-DD');
            status.compareIntervalEnd = moment( outputCompareTo.html() ).format('YYYY-MM-DD');

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
            let startFormatted = moment(status.compareIntervalStart).format('MMM D, YYYY');
            let endFormatted = moment(status.compareIntervalEnd).format('MMM D, YYYY');
            compareDateFrom.find('input').val(startFormatted);
            compareDateTo.find('input').val(endFormatted);
        }

        /***************** SELECTION DECISIONS *****************/
        /**
         * Decide which range was selected
         * @param event
         */
        function calculateInterval(event) {
            clearRangeDisplay();
            var dateClicked = event.target.dataset.date;

            if (!status.lastSelected || status.lastSelected === 'second'){ // selected first date
                status.intervalStart = dateClicked;
                status.intervalEnd = dateClicked;
                status.lastSelected = 'first';
            } else {
                if (status.intervalStart < dateClicked){ // selected newer date as second
                    status.intervalEnd = dateClicked;
                } else { // selected older date as second
                    status.intervalStart = dateClicked;
                }
                status.lastSelected = 'second';
            }

            highlightSelection();
            calculateCompare();
            setInputs();
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
                        prepareCompareCustom();
                        break;
                }
                compareDateFrom.show();
                compareDateTo.show();
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
            let date = moment(status.intervalStart);
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
            status.compareIntervalEnd = moment(status.intervalEnd).subtract('year', 1).format('YYYY-MM-DD');
            status.compareIntervalStart = moment(status.intervalStart).subtract('year', 1).format('YYYY-MM-DD');

            // show results
            clearCompareRangeDisplay();
            highlightCompareSelection();
            setCompareInputs();
        }

        /**
         * Custom compare calculate - requires user input
         */
        function calculateCompareCustom(type, event) {
            clearCompareRangeDisplay();
            if (type === 'input') { // input was changed
                status.compareIntervalStart = moment( compareDateFrom.find('input').val() ).format('YYYY-MM-DD');
                status.compareIntervalEnd = moment( compareDateTo.find('input').val() ).format('YYYY-MM-DD');
            } else if (type === 'click') {
                var dateClicked = event.target.dataset.date;

                if (!status.lastSelectedCompare || status.lastSelectedCompare === 'second'){ // selected first date
                    status.compareIntervalStart = dateClicked;
                    status.compareIntervalEnd = dateClicked;
                    status.lastSelectedCompare = 'first';
                    $(event.target).addClass('rp-compare-oneday');
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
                }
                // TODO: but check that the ranges don't overlap
            }

            highlightCompareSelection();
            setCompareInputs();
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

        //////////////// TODO:
        // TODO: what if this is applied on multiple elements
        // TODO: handle overlaps and bad inputs
        // TODO: highlight 'focus' on inputs
        // TODO: switch the triangle up/down
        // TODO: change next/prev icons
        // TODO: add option to check compare in the start and
        // TODO: check compare if compareInterval not empty on show
        // TODO: options on the position of popup

        return self;
    };

}(jQuery));
