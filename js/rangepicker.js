'use strict';


import $ from 'jquery';
import jqueryui from 'jquery-ui';
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
            defaultStart: moment().subtract('days', 6).format('YYYY-MM-DD'),
            defaultEnd: moment().format('YYYY-MM-DD'),
            onChange: function(){},
            onHide: function(){},
            onShow: function(){},
            onMonthChange: function(){}

        }, options);

        var status = {
            lastMonthDisplayed: moment(options.lastMonthDisplayed),
            lastSelected: '',
            intervalStart: options.defaultStart || null,
            intervalEnd: options.defaultEnd || null,
            compareIntervalStart: null,
            compareIntervalEnd: null
        };

        var prev, next, content, months;
        var daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

        /**
         * Create basic DOM structure
         */
        function createCalendarStructure() {


            prev = $('<span class="rp-prev"> < </span>').addClass('clickable');
            next = $('<span class="rp-next"> > </span>').addClass('clickable');
            months = $('<span class="rp-months"></span>');
            content = $('<div class="rp-content"></div>');

            content
                .append(prev)
                .append(months)
                .append(next);

            if (self.is('input[type="text"]')){ // BIND TO INPUT AS POPUP
                let startFormatted = moment(options.defaultStart).format('MMM D, YYYY');
                let endFormatted = moment(options.defaultEnd).format('MMM D, YYYY');

                self
                    .addClass('rangepicker')
                    .attr('readonly', true)
                    .val(startFormatted + ' - ' + endFormatted)
                    .after(content);

                content
                    .addClass('rp-popup')
                    .hide();
                self.click(() => {
                    content.toggle();
                    if (content.is(':visible')){
                        options.onShow();
                    } else {
                        options.onHide();
                    }
                });

                // TODO: add a dropdown icon?
            } else { // INSERT INTO ELEMENT
                self
                    .addClass('rangepicker')
                    .append(content);
            }

            makeForm();
        }

        function makeForm() {
            var content = $('.rp-content');
            var form = $('<div class="rp-form"></div>');
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
            var dateRanges =
                $('<div>' +
                    '<select class="rp-daterange-preset">' +
                        dateRangesOptions +
                    '</select>' +
                '</div>');
            var dateFrom =
                $('<div class="date-input">' +
                    '<label for="rane-start">From</label>' +
                    '<input class="input-mini" type="date" name="range-start" value="">' +
                '</div>');
            var dateTo =
                $('<div class="date-input">' +
                    '<label for="range-to">To</label>' +
                    '<input class="input-mini" type="date" name="range-to" value="">' +
                '</div>');

            var applyBtn =
                $('<button class="applyBtn btn btn-small btn-sm btn-success">Apply</button>');

            var cancelBtn =
                $('<button class="cancelBtn btn btn-small btn-sm btn-default">Cancel</button>');

            form
                .append(dateRanges)
                .append(dateFrom)
                .append(dateTo)
                .append(applyBtn)
                .append(cancelBtn);

            content.append(form);
        }

        /**
         * Add event bindings
         */
        function addBindings() {
            next.click(moveForward);
            prev.click(moveBack);

            $('.rp-day').click(calculateInterval);

            $('.rp-daterange-preset').change(useDefinedInterval);
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

            //console.log('TABLE', table, weekHeaderRow, weekHeader);
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

        /**
         * Updates needed after view has been shifted
         */
        function updateDatesAfterCalendarShift() {
            $('.rp-day').unbind('click');
            $('.rp-day').click(calculateInterval);

            // TODO: display selection if it was out of sight
        }

        /**
         * Highlight everything between interval start & end
         */
        function highlightSelection() {
            $('.rp-selected-normal').removeClass('rp-selected-normal');
            $('.rp-day')
                .filter(function(){
                    var insideInterval = ((this.dataset.date > status.intervalStart) && (this.dataset.date < status.intervalEnd));
                    return insideInterval;
                })
                .addClass('rp-selected-normal');
        }

        /**
         * +1 month
         */
        function moveForward() {
            status.lastMonthDisplayed.add('month', 1);

            removeMonth('start');
            addMonth(status.lastMonthDisplayed.format('YYYY MM'), 'end');

            updateDatesAfterCalendarShift();
            options.onMonthChange();
        }

        /**
         * -1 month
         */
        function moveBack() {
            status.lastMonthDisplayed.subtract('month', 1);
            var firstMonthDisplayed = status.lastMonthDisplayed.clone().subtract('months', (options.months -1));

            removeMonth('end');
            addMonth(firstMonthDisplayed.format('YYYY MM'), 'start');

            updateDatesAfterCalendarShift();
            options.onMonthChange();
        }

        /**
         * Reset interval markers
         */
        function resetStates() {
            $('.rp-interval-start').removeClass('rp-interval-start');
            $('.rp-interval-end').removeClass('rp-interval-end');
            $('.rp-interval-oneday').removeClass('rp-interval-oneday');
        }

        /**
         * Decide which range was selected
         * @param event
         */
        function calculateInterval(event) {
            resetStates();
            var dateClicked = event.target.dataset.date;

            if (!status.lastSelected || status.lastSelected === 'second'){ // selected first date
                status.intervalStart = dateClicked;
                status.intervalEnd = dateClicked;
                status.lastSelected = 'first';
                $(event.target).addClass('rp-interval-oneday');
            } else {
                if (status.intervalStart < dateClicked){ // selected newer date as second
                    status.intervalEnd = dateClicked;
                    $(`.rp-day[data-date="${status.intervalStart}"]`).addClass('rp-interval-start');
                    $(event.target).addClass('rp-interval-end');
                } else { // selected older date as second
                    status.intervalStart = dateClicked;
                    $(`.rp-day[data-date="${status.intervalEnd}"]`).addClass('rp-interval-end');
                    $(event.target).addClass('rp-interval-start');
                }
                status.lastSelected = 'second';
            }

            calculateCompareMirror(); // or something else
            highlightSelection();
            intervalChanged();
        }

        /** 
         * Set some of pre-defined time intervals
         * @param event
         */
        function useDefinedInterval(event) {
            console.log('event', event);
            resetStates();
            var interval = $(event.currentTarget).find('option:selected').val();

            var start, end;
            switch (interval) {
                case 'today':
                    let today = moment().format('YYYY-MM-DD');
                    status.intervalStart = status.intervalEnd = today;
                    $(`.rp-day[data-date="${today}"]`).addClass('rp-interval-oneday');
                    break;
                case 'yesterday':
                    let yesterday = moment().subtract('day', 1).format('YYYY-MM-DD');
                    status.intervalStart = status.intervalEnd = yesterday;
                    $(`.rp-day[data-date="${yesterday}"]`).addClass('rp-interval-oneday');
                    break;
                case 'last7Days':
                    start = moment().subtract('day', 7).format('YYYY-MM-DD');
                    end = moment().subtract('day', 1).format('YYYY-MM-DD');
                    status.intervalStart = start;
                    status.intervalEnd = end;
                    $(`.rp-day[data-date="${start}"]`).addClass('rp-interval-start');
                    $(`.rp-day[data-date="${end}"]`).addClass('rp-interval-end');
                    break;
                case 'last30Days':
                    start = moment().subtract('day', 30).format('YYYY-MM-DD');
                    end = moment().subtract('day', 1).format('YYYY-MM-DD');
                    status.intervalStart = start;
                    status.intervalEnd = end;
                    $(`.rp-day[data-date="${start}"]`).addClass('rp-interval-start');
                    $(`.rp-day[data-date="${end}"]`).addClass('rp-interval-end');
                    break;
            }

            calculateCompareMirror();
            highlightSelection();
            intervalChanged();
        }

        /**
         * Highlight start, end and selection
         */
        function highlightInit() {
            $(`.rp-day[data-date="${status.intervalStart}"]`).addClass('rp-interval-start');
            $(`.rp-day[data-date="${status.intervalEnd}"]`).addClass('rp-interval-end');

            highlightSelection();
        }

        /**
         * Callback whenever interval or compare interval changed
         */
        function intervalChanged() {
            let startFormatted = moment(status.intervalStart).format('MMM D, YYYY');
            let endFormatted = moment(status.intervalEnd).format('MMM D, YYYY');

            if (self.is('input')){
                self.val(startFormatted + ' - ' + endFormatted);
            }

            options.onChange({
                intervalStart: status.intervalStart,
                intervalEnd: status.intervalEnd,
                compareIntervalStart: status.compareIntervalStart,
                compareIntervalEnd: status.compareIntervalEnd
            });
        }


        //////////////////// INITIATE //////////////////////
        createCalendarStructure();
        var date = status.lastMonthDisplayed.clone();
        for (var i=0; i < options.months; i++) {
            addMonth(date.format('YYYY MM'), 'start');
            date.subtract('month', 1);
        }
        addBindings();
        highlightInit();

        //////////////// TODO:
        function calculateCompareMirror() {} // this also needs to be visible on calendar
        function calculateCompareLastYear() {} // this won't be shown on calendar
        function calculateCompareCustom() {} // this needs to be able to override calculateInterval on click events
        // TODO: custom date ranges
        // TODO: what if this is applied on multiple elements

        return self;
    };

}(jQuery));
