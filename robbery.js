'use strict';

/**
 * Сделано задание на звездочку
 * Реализовано оба метода и tryLater
 */
exports.isStar = true;

var WEEK = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];
var DATE = /^([А-Я]{2})?[ ]?(\d\d):(\d\d)\+(\d+)$/;
var HOUR = 60;
var DAY = 24 * HOUR;


var DateTime = function (time) {
    this._init(time);
};

Object.defineProperties(DateTime.prototype, {
    _init: {
        value: function (time) {
            var tokens = DATE.exec(time);
            this.timezone = Number(tokens[4]);
            this._minutes = WEEK.indexOf(tokens[1] || 'ПН') * DAY +
                Number(tokens[2]) * HOUR + Number(tokens[3]);
        }
    },
    minutes: {
        get: function () {
            return this._minutes;
        },
        set: function (minutes) {
            this._minutes = minutes;
        }
    },
    setTimezone: {
        value: function (timezone) {
            this._minutes -= (this.timezone - timezone) * HOUR;
            this.timezone = timezone;

            return this;
        }
    }
});

var AppropriateMoment = function (schedule, workingHours) {
    this._init(schedule, workingHours);
};

Object.defineProperties(AppropriateMoment.prototype, {
    _init: {
        value: function (schedule, workingHours) {
            this._robberyWeek = WEEK.slice(0, 3);
            this._start = new DateTime(workingHours.from);
            this._deadline = new DateTime(this._robberyWeek[2].concat(workingHours.to));
            this._badIntervals = this._getBankCloseIntervals(workingHours)
                .concat(this._getGangsBusyIntervals(schedule));
        }
    },
    _getBankCloseIntervals: {
        value: function (workingHours) {
            var notWorkingTime = [];
            for (var index = 0; index < this._robberyWeek.length - 1; index++) {
                notWorkingTime.push([
                    new DateTime(WEEK[index].concat(workingHours.to)).minutes,
                    new DateTime(WEEK[index + 1].concat(workingHours.from)).minutes
                ]);
            }

            return notWorkingTime;
        }
    },
    _getGangsBusyIntervals: {
        value: function (schedule) {
            var timezone = this._deadline.timezone;
            var busyTimes = [];
            Object.keys(schedule)
                .forEach(function (name) {
                    schedule[name].forEach(function (interval) {
                        var from = new DateTime(interval.from).setTimezone(timezone).minutes;
                        var to = new DateTime(interval.to).setTimezone(timezone).minutes;
                        from = from < to && from > 0 ? from : 0;
                        busyTimes.push([from, to]);
                    });
                });

            return busyTimes;
        }
    },
    _getBadIntervals: {
        value: function (start, duration) {
            var end = start + duration;

            return this._badIntervals
                .filter(function (interval) {
                    return (interval[0] <= start && start < interval[1]) ||
                        (interval[0] < end && end <= interval[1]) ||
                        (start < interval[0] && interval[1] < end);
                })
                .map(function (interval) {
                    return interval[1];
                });
        }
    },
    run: {
        value: function (duration) {
            var robberyMoments = [];
            while (this._start.minutes + duration <= this._deadline.minutes) {
                var badIntervals = this._getBadIntervals(this._start.minutes, duration);
                if (badIntervals.length === 0) {
                    robberyMoments.push(this._start.minutes);
                    this._start.minutes += 30;
                } else {
                    this._start.minutes = Math.max.apply(Math, badIntervals);
                }
            }

            return robberyMoments;
        }
    }
});

/**
 * @param {Object} schedule – Расписание Банды
 * @param {Number} duration - Время на ограбление в минутах
 * @param {Object} workingHours – Время работы банка
 * @param {String} workingHours.from – Время открытия, например, "10:00+5"
 * @param {String} workingHours.to – Время закрытия, например, "18:00+5"
 * @returns {Object}
 */
exports.getAppropriateMoment = function (schedule, duration, workingHours) {
    var robbery = new AppropriateMoment(schedule, workingHours);
    var robberyMoments = robbery.run(duration);
    var exists = robberyMoments.length !== 0;
    var time = robberyMoments.shift();

    return {

        /**
         * Найдено ли время
         * @returns {Boolean}
         */
        exists: function () {
            return exists;
        },

        /**
         * Возвращает отформатированную строку с часами для ограбления
         * Например,
         *   "Начинаем в %HH:%MM (%DD)" -> "Начинаем в 14:59 (СР)"
         * @param {String} template
         * @returns {String}
         */
        format: function (template) {
            if (!time) {
                return '';
            }
            var day = WEEK[Math.floor(time / DAY)];
            var hour = (Math.floor((time % DAY) / HOUR));
            var minutes = ((time % DAY) % HOUR);

            return template.replace('%DD', day)
                .replace('%HH', (hour < 10 ? '0' : '') + hour)
                .replace('%MM', (minutes < 10 ? '0' : '') + minutes);
        },

        /**
         * Попробовать найти часы для ограбления позже [*]
         * @star
         * @returns {Boolean}
         */
        tryLater: function () {
            var oldTime = time;
            time = robberyMoments.shift() || oldTime;

            return time !== oldTime;
        }
    };
};
