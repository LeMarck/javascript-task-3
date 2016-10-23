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

/**
 * @param {Object} schedule – Расписание Банды
 * @param {Number} duration - Время на ограбление в минутах
 * @param {Object} workingHours – Время работы банка
 * @param {String} workingHours.from – Время открытия, например, "10:00+5"
 * @param {String} workingHours.to – Время закрытия, например, "18:00+5"
 */
var AppropriateMoment = function (schedule, duration, workingHours) {
    this._init(schedule, duration, workingHours);
};

Object.defineProperties(AppropriateMoment.prototype, {
    _init: {

        /**
         * @param {Object} schedule – Расписание Банды
         * @param {Number} duration - Время на ограбление в минутах
         * @param {Object} workingHours – Время работы банка
         * @param {String} workingHours.from – Время открытия, например, "10:00+5"
         * @param {String} workingHours.to – Время закрытия, например, "18:00+5"
         */
        value: function (schedule, duration, workingHours) {
            this._workingHours = workingHours;
            this._schedule = schedule;

            this._start = new DateTime(workingHours.from);
            this._deadline = new DateTime(WEEK.slice(-1)[0].concat(workingHours.to));
            this._duration = duration;
            this._badInterval = this.__workingHours.concat(this.__schedule);
            this._exists = this._run();
        }
    },
    __workingHours: {

        /**
         * Не рабочее время банка
         * @returns {Array}
         */
        get: function () {
            var notWorkingTime = [];
            for (var index = 0; index < WEEK.length - 1; index++) {
                notWorkingTime.push([
                    new DateTime(WEEK[index].concat(this._workingHours.to)).ticks,
                    new DateTime(WEEK[index + 1].concat(this._workingHours.from)).ticks
                ]);
            }

            return notWorkingTime;
        }
    },
    __schedule: {

        /**
         * Интервалы занятости грабителей
         * @returns {Array}
         */
        get: function () {
            var timezone = this._deadline.timezone;
            var schedule = this._schedule;
            var bisyTime = [];
            Object.keys(schedule)
                .forEach(function (name) {
                    schedule[name].forEach(function (interval) {
                        bisyTime.push([
                            new DateTime(interval.from).setTimezone(timezone).ticks,
                            new DateTime(interval.to).setTimezone(timezone).ticks
                        ]);
                    });
                });

            return bisyTime;
        }
    },
    _isBadInterval: {

        /**
         * Проверка предпологаемого времени
         * @param {Number} start
         * @returns {Array}
         */
        value: function (start) {
            var end = start + this._duration;

            return this._badInterval
                .filter(function (interval) {
                    return (interval[0] <= start && start < interval[1]) ||
                        (interval[0] < end && end <= interval[1]);
                })
                .map(function (interval) {
                    return interval[1];
                });
        }
    },
    _run: {

        /**
         * Ограбление
         * @returns {boolean}
         */
        value: function () {
            while (this._start.ticks + this._duration < this._deadline.ticks) {
                var times = this._isBadInterval(this._start.ticks);
                if (times.length === 0) {
                    this._time = this._start.ticks;

                    return true;
                }
                this._start.ticks = Math.max.apply(Math, times);
            }
            this._start.ticks = this._time;

            return false;
        }
    },
    exists: {

        /**
         * Найдено ли время
         * @returns {Boolean}
         */
        value: function () {
            return this._exists;
        }
    },
    format: {

        /**
         * Возвращает отформатированную строку с часами для ограбления
         * Например,
         *   "Начинаем в %HH:%MM (%DD)" -> "Начинаем в 14:59 (СР)"
         * @param {String} template
         * @returns {String}
         */
        value: function (template) {
            if (!this._time) {
                return '';
            }
            var day = WEEK[Math.floor(this._time / DAY)];
            var hour = Math.floor((this._time % DAY) / HOUR);
            hour = hour < 10 ? '0' + hour : hour;
            var minutes = (this._time % DAY) % HOUR;
            minutes = minutes < 10 ? '0' + minutes : minutes;

            return template.replace('%DD', day)
                .replace('%HH', hour)
                .replace('%MM', minutes);
        }
    },
    tryLater: {

        /**
         * Попробовать найти часы для ограбления позже [*]
         * @star
         * @returns {Boolean}
         */
        value: function () {
            this._start.ticks += 30;

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
