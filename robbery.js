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
    _toTime: {
        value: function (minutes) {
            return (minutes < 10 ? '0' : '') + minutes;
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
    },
    toString: {
        value: function () {
            var day = WEEK[Math.floor(this._minutes / DAY)];
            var hour = this._toTime(Math.floor((this._minutes % DAY) / HOUR));
            var minutes = this._toTime((this._minutes % DAY) % HOUR);

            return day + ' ' + hour + ':' + minutes + '+' + this.timezone;
        }
    }
});

var AppropriateMoment = function (schedule, duration, workingHours) {
    this._init(schedule, duration, workingHours);
};

Object.defineProperties(AppropriateMoment.prototype, {
    _init: {
        value: function (schedule, duration, workingHours) {
            this._workingHours = workingHours;
            this._schedule = schedule;
            this._robberyWeek = WEEK.slice(0, 3);
            this._start = new DateTime(workingHours.from);
            this._deadline = new DateTime(this._robberyWeek[2].concat(workingHours.to));
            this._duration = duration;
            this._badIntervals = this._notWorkingHours.concat(this._scheduleIntervals);
            this._exists = this._run();
        }
    },
    _notWorkingHours: {
        get: function () {
            var notWorkingTime = [];
            for (var index = 0; index < this._robberyWeek.length - 1; index++) {
                notWorkingTime.push([
                    new DateTime(WEEK[index].concat(this._workingHours.to)).minutes,
                    new DateTime(WEEK[index + 1].concat(this._workingHours.from)).minutes
                ]);
            }

            return notWorkingTime;
        }
    },
    _scheduleIntervals: {
        get: function () {
            var timezone = this._deadline.timezone;
            var schedule = this._schedule;
            var bisyTimes = [];
            Object.keys(schedule)
                .forEach(function (name) {
                    schedule[name].forEach(function (interval) {
                        var from = new DateTime(interval.from).setTimezone(timezone).minutes;
                        var to = new DateTime(interval.to).setTimezone(timezone).minutes;
                        from = from < to && from > 0 ? from : 0;
                        bisyTimes.push([from, to]);
                    });
                });

            return bisyTimes;
        }
    },
    _getBadIntervals: {
        value: function (start) {
            var end = start + this._duration;

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
    _run: {
        value: function () {
            while (this._start.minutes + this._duration <= this._deadline.minutes) {
                var badIntervals = this._getBadIntervals(this._start.minutes);
                if (badIntervals.length === 0) {
                    this._time = this._start.minutes;

                    return true;
                }
                this._start.minutes = Math.max.apply(Math, badIntervals);
            }
            this._start.minutes = this._time;

            return false;
        }
    },
    exists: {
        value: function () {

            return this._exists;
        }
    },
    format: {
        value: function (template) {
            if (isNaN(this._time)) {
                return '';
            }
            template = template.replace('%DD', '$1')
                .replace('%HH', '$2')
                .replace('%MM', '$3');

            return this._start.toString()
                .replace(DATE, template);
        }
    },
    tryLater: {
        value: function () {
            this._start.minutes += 30;

            return this._run();
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
    var robbery = new AppropriateMoment(schedule, duration, workingHours);

    return {

        /**
         * Найдено ли время
         * @returns {Boolean}
         */
        exists: function () {
            return robbery.exists();
        },

        /**
         * Возвращает отформатированную строку с часами для ограбления
         * Например,
         *   "Начинаем в %HH:%MM (%DD)" -> "Начинаем в 14:59 (СР)"
         * @param {String} template
         * @returns {String}
         */
        format: function (template) {
            return robbery.format(template);
        },

        /**
         * Попробовать найти часы для ограбления позже [*]
         * @star
         * @returns {Boolean}
         */
        tryLater: function () {
            return robbery.tryLater();
        }
    };
};
