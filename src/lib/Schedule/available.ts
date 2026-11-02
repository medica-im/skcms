import type { DateTime } from "schema-dts";
import type { Schedule, DayOfWeek, ScheduleData, TimeInterval, PublicHolidays } from "./schedule.interface.ts";

export const schedules: Schedule = {
    'phoneAppointment': {
        0: null,
        1: [
            ['08:00:00', '12:00:00'],
            ["14:00:00", "16:00:00"]
        ],
        2: [
            ['08:00:00', '12:00:00'],
            ["14:00:00", "16:00:00"]
        ],
        3: [
            ['08:00:00', '12:00:00'],
            ["14:00:00", "16:00:00"]
        ],
        4: [
            ['08:00:00', '12:00:00'],
            ["14:00:00", "16:00:00"]
        ],
        5: [
            ['08:00:00', '12:00:00'],
            ["14:00:00", "16:00:00"]
        ],
        6: null,
        holidays: false,
    }
};

const secondsOfDay = (time: string) => {
    const [h, m, s] = time.split(':').map((part) => parseInt(part, 10));
    return h * 3600 + m * 60 + (s || 0);
};

export function validateTime(dateTime: Date, intervals: TimeInterval[]) {
    const now = dateTime.getHours() * 3600 + dateTime.getMinutes() * 60 + dateTime.getSeconds();
    return intervals.some(
        ([start, stop]) => secondsOfDay(start) <= now && now < secondsOfDay(stop)
    );
}

function isoDateString(dateTime: Date) {
    let yearNum = dateTime.getFullYear();
    let monthNum = dateTime.getMonth()+1;
    let dateNum = dateTime.getDate();
    const dateStr = (dateNum < 10) ? `0${dateNum}`: String(dateNum);
    const monthStr = (monthNum < 10) ? `0${monthNum}`: String(monthNum);
    return yearNum + '-' + monthStr + '-' + dateStr;
}

export function isDateHoly(dateTime: Date, holidays: PublicHolidays) {
    const isoDate = isoDateString(dateTime);
    return Object.keys(holidays).some((element) => element===isoDate)
};

export const isServiceAvailable = (name: string, dateTime: Date, holidays: PublicHolidays) => {
    let schedule = schedules[name];
    const day = dateTime.getDay();
    const intervals = schedule[day];
    if ( intervals == null ) return false;
    if ( isDateHoly(dateTime, holidays)) return false;
    return validateTime(dateTime, intervals);
};  