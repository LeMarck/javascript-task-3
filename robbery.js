'use strict';

/**
 * Сделано задание на звездочку
 * Реализовано оба метода и tryLater
 */
exports.isStar = true;

var WEEK = ['ПН', 'ВТ', 'СР'];
var HOUR = 60;
var DAY = 24 * HOUR;

var DateTime = function (time) {
    this._init(time);
};

Object.defineProperties(DateTime.prototype, {
    _init: {
        value: function (time) {
            var token = /^([А-Я]{2})?[ ]?(\d{2}):(\d{2})\+(\d{1,2})$/.exec(time);
            this.timezone = Number(token[4]);
            this._ticks = WEEK.indexOf(token[1] || 'ПН') * DAY +
                Number(token[2]) * HOUR + Number(token[3]);
        }
    },
    ticks: {
        get: function () {
            return this._ticks;
        },
        set: function (time) {
            this._ticks = time;
        }
    },
    setTimezone: {
        value: function (timezone) {
            this._ticks -= (this.timezone - timezone) * 60;
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
            this.start = new DateTime(workingHours.from);
            this.deadline = new DateTime(WEEK.slice(-1)[0].concat(workingHours.to));
            this.badTimes = this._notWorkingTime(workingHours)
                .concat(this._membersBisyHours(schedule))
                .sort(function (first, second) {
                    return first[0] > second[0];
                });
            this.times = [];
        }
    },
    _notWorkingTime: {
        value: function (workingHours) {
            var notWorkingTime = [];
            for (var index = 0; index < WEEK.length - 1; index++) {
                notWorkingTime.push([
                    new DateTime(WEEK[index].concat(workingHours.to)).ticks,
                    new DateTime(WEEK[index + 1].concat(workingHours.from)).ticks
                ]);
            }

            return notWorkingTime;
        }
    },
    _membersBisyHours: {
        value: function (schedule) {
            var timezone = this.deadline.timezone;
            var membersBisyHours = [];
            Object.keys(schedule)
                .forEach(function (name) {
                    schedule[name].forEach(function (interval) {
                        membersBisyHours.push([
                            new DateTime(interval.from).setTimezone(timezone).ticks,
                            new DateTime(interval.to).setTimezone(timezone).ticks
                        ]);
                    });
                });

            return membersBisyHours;
        }
    },
    _badIntervals: {
        value: function (start, end) {
            return this.badTimes.filter(function (interval) {
                return (interval[0] <= start && start < interval[1]) ||
                    (interval[0] < end && end <= interval[1]);
            });
        }
    },
    run: {
        value: function (duration) {
            while (this.start.ticks + duration < this.deadline.ticks) {
                var times = this._badIntervals(this.start.ticks, this.start.ticks + duration);
                if (times.length === 0) {
                    this.times.push(this.start.ticks);
                    this.start.ticks += 30;
                } else {
                    this.start.ticks = times.slice(-1)[0][1];
                }
            }
        }
    },
    hasNext: {
        get: function () {
            return this.times.length !== 0;
        }
    },
    next: {
        get: function () {
            return this.times.shift();
        }
    }
});

var convert = function (time, temp) {
    var day = WEEK[Math.floor(time / DAY)];
    var hour = Math.floor((time % DAY) / HOUR);
    hour = hour < 10 ? '0' + hour : hour;
    var minutes = (time % DAY) % HOUR;
    minutes = minutes < 10 ? '0' + minutes : minutes;

    return temp.replace('%DD', day)
        .replace('%HH', hour)
        .replace('%MM', minutes);
};

/**
 * @param {Object} schedule – Расписание Банды
 * @param {Number} duration - Время на ограбление в минутах
 * @param {Object} workingHours – Время работы банка
 * @param {String} workingHours.from – Время открытия, например, "10:00+5"
 * @param {String} workingHours.to – Время закрытия, например, "18:00+5"
 * @returns {Object}
 */
exports.getAppropriateMoment = function (schedule, duration, workingHours) {
    // console.info(schedule, duration, workingHours);
    var robbery = new Robbery(schedule, workingHours);
    robbery.run(duration);

    var time = robbery.next || null;

    return {

        /**
         * Найдено ли время
         * @returns {Boolean}
         */
        exists: function () {
            return time !== null;
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

            return convert(time, template);
        },

        /**
         * Попробовать найти часы для ограбления позже [*]
         * @star
         * @returns {Boolean}
         */
        tryLater: function () {
            var tryStatus = robbery.hasNext;
            time = robbery.next || time;

            return tryStatus;
        }
    };
};
