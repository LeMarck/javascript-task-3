'use strict';

/**
 * Сделано задание на звездочку
 * Реализовано оба метода и tryLater
 */
exports.isStar = true;

var WEEK = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];
var MOMENT_PATTERN = /^([А-Я]{2})?\s?(\d{2}):(\d{2})\+(\d{1,2})$/;
var HOUR = 60;
var DAY = 24 * HOUR;
var TIME_SHIFT = 30;


var Moment = function (time) {
    this._init(time);
};

Object.defineProperties(Moment.prototype, {
    _init: {
        value: function (time) {
            var tokens = MOMENT_PATTERN.exec(time);
            this.timezone = Number(tokens[4]);
            this.minutes = WEEK.indexOf(tokens[1] || 'ПН') * DAY +
                Number(tokens[2]) * HOUR + Number(tokens[3]);
        }
    },
    setTimezone: {
        value: function (timezone) {
            this.minutes -= (this.timezone - timezone) * HOUR;
            this.timezone = timezone;

            return this;
        }
    }
});

var Robbery = function (schedule, workingHours) {
    this._init(schedule, workingHours);
};

Object.defineProperties(Robbery.prototype, {
    _init: {
        value: function (schedule, workingHours) {
            this._robberyWeek = WEEK.slice(0, 3);
            this._start = new Moment(workingHours.from);
            this._deadline = new Moment(this._robberyWeek[2] + workingHours.to);
            this._badIntervals = this._getBadIntervals(schedule, workingHours);

        }
    },
    _getBadIntervals: {
        value: function (schedule, workingHours) {
            return this._getBankCloseIntervals(workingHours)
                .concat(this._getGangsBusyIntervals(schedule))
                .sort(function (first, second) {
                    return first[1] < second[1];
                });
        }
    },
    _getBankCloseIntervals: {
        value: function (workingHours) {
            var notWorkingTime = [];
            for (var index = 0; index < this._robberyWeek.length - 1; index++) {
                notWorkingTime.push([
                    new Moment(WEEK[index] + workingHours.to).minutes,
                    new Moment(WEEK[index + 1] + workingHours.from).minutes
                ]);
            }

            return notWorkingTime;
        }
    },
    _getGangsBusyIntervals: {
        value: function (schedule) {
            var timezone = this._deadline.timezone;
            var robbers = Object.keys(schedule);

            return robbers.reduce(function (res, name) {
                return res.concat(
                    schedule[name].reduce(function (acc, interval) {
                        var from = new Moment(interval.from).setTimezone(timezone).minutes;
                        var to = new Moment(interval.to).setTimezone(timezone).minutes;
                        from = from < to && from > 0 ? from : 0;
                        acc.push([from, to]);

                        return acc;
                    }, [])
                );
            }, []);
        }
    },
    _getIntersection: {
        value: function (start, end) {
            return this._badIntervals
                .filter(function (interval) {
                    return (interval[0] <= start && start < interval[1]) ||
                        (interval[0] < end && end <= interval[1]) ||
                        (start < interval[0] && interval[1] < end);
                });
        }
    },
    _timeShift: {
        value: function (start, duration) {
            var end = start + duration;

            return this._getIntersection(start, end)
                    .map(function (interval) {
                        return interval[1];
                    })[0] || start;
        }
    },
    getMoments: {
        value: function (duration) {
            var start = this._start.minutes;
            var robberyMoments = [];
            while (start + duration <= this._deadline.minutes) {
                var newStart = this._timeShift(start, duration);
                if (newStart === start) {
                    robberyMoments.push(start);
                    start += TIME_SHIFT;
                } else {
                    start = newStart;
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
    var robbery = new Robbery(schedule, workingHours);
    var robberyMoments = robbery.getMoments(duration);
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
            if (!exists) {
                return '';
            }
            var day = WEEK[Math.floor(time / DAY)];
            var hour = Math.floor((time % DAY) / HOUR);
            var minutes = (time % DAY) % HOUR;

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
