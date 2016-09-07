/**
 */

'use strict';

$(function(){

    $.fn.rangepicker = function(options) {

        var self = this;
        var options = $.extend({

            datemin: '1 Jan 1995',
            datemax: '31 Dec 2050',
            mirror: true,
            months: 3,
            lastMonthDisplayed: undefined,
            onChange: function(){},
            onHide: function(){},
            onShow: function(){},
            onBeforeMonthChange: function(){},
            onMonthChange: function(){}

        }, options);

        var status = {
            lastMonthDisplayed: moment(options.lastMonthDisplayed)
        };

        var header, prev, next, headerText, content, months;
        var daysOfWeek = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];


        console.log('options', options);

        function createCalendarStructure() {
            prev = $('<span class="rp-prev"> < </span>');
            next = $('<span class="rp-next"> > </span>');
            months = $('<span class="rp-months"></span>');
            content = $('<div class="rp-content"></div>');

            content
                .append(prev)
                .append(months)
                .append(next);

            self
                .addClass('rangepicker')
                .append(header)
                .append(content);
        }

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
                        week.push(`<td class="rp-day rp-month-${monthNum} rp-date-${date}">${date}</td>`);
                    }
                }

                let weekRow = '<tr>' + week.join() + '</tr>';
                weeks.push(weekRow);
            }

            return weeks;
        }

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

        function removeMonth(position) {
            if (position === 'start') {
                months.find('.rp-month:first-child').remove();
            } else {
                months.find('.rp-month:last-child').remove();
            }
        }

        function addBindings() {
            next.click(moveForward);
            prev.click(moveBack);
        }

        function moveForward() {
            status.lastMonthDisplayed.add('month', 1);
            
            removeMonth('start');
            addMonth(status.lastMonthDisplayed.format('YYYY MM'), 'end');
        }

        function moveBack() {
            status.lastMonthDisplayed.subtract('month', 1);
            var firstMonthDisplayed = status.lastMonthDisplayed.clone().subtract('months', (options.months -1));

            removeMonth('end');
            addMonth(firstMonthDisplayed.format('YYYY MM'), 'start');
        }


        ///////////////// create basic structure and add some months
        createCalendarStructure();
        var date = status.lastMonthDisplayed.clone();
        for (var i=0; i < options.months; i++) {
            addMonth(date.format('YYYY MM'), 'start');
            date.subtract('month', 1);
        }
        //////////////// add bindings
        addBindings();

        //////////////// TODO:
        function calculateInterval(event) {}
        function calculateMirror() {}
        function highlightSelection() {}
    };

}());