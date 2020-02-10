const Discord = require('discord.js');
const config = require('./config.js').config;
const TIMETABLE = require('./timetable.json');

const WEEKDAYS = [
    'mon',
    'tue',
    'wed',
    'thu',
    'fri',
    'sat',
    'sun'
];

let lessonNow = [];
exports.update = () => {
    for (let i = 1; i <= 7; i++) {
        let newLesson = getLessonNow("M2040" + i);
        if (lessonNow[i] !== newLesson.subject) {
            lessonNow[i] = newLesson.subject;
            config.HOOK2.send("@" + "M2040" + i + ", its '" + lessonNow[i] + "' now!", getLessonEmbed(newLesson));
        }
    }
}

exports.handleCommand = (args, msg, PREFIX) => {
    if (args.length === 0) {
        msg.channel.send(getLessonEmbed(getLessonNow("M20403")));
    } else if (args.length === 1 && (/^((?:(?:M?)?20)?40\d)$/i).test(args[0])) {
        msg.channel.send(getLessonEmbed(getLessonNow(args[0])));
    } else if (args.length === 1) {
        if (args[0] === "now") msg.channel.send(getLessonEmbed(getLessonNow("M20403")));
        else if (args[0] === "next") msg.channel.send(getLessonEmbed(getLessonNext("M20403")));
        else msg.channel.send("Only 'now' or 'next' allowed");
    } else if (args.length === 2) {
        if (args[0] === "now") msg.channel.send(getLessonEmbed(getLessonNow(args[1])));
        else if (args[0] === "next") msg.channel.send(getLessonEmbed(getLessonNext(args[1])));
        else msg.channel.send("Only 'now' or 'next' allowed");
    } else msg.channel.send("_Perhaps you lost your magic._");
};

function getLessonNow(className) {
    let date = new Date();
    let offset = +8 + date.getTimezoneOffset() / 60;
    let now = new Date(date.getTime() + offset * 3600 * 1000);
    let hour = now.getHours();
    let minute = now.getMinutes();
    console.log("Hour", hour, "Minute", minute);
    return getLessonExact(className || "M20403", WEEKDAYS[now.getDay()], hour, minute);
}

function getLessonNext(className) {
    let date = new Date();
    let offset = +8 + date.getTimezoneOffset() / 60;
    let now = new Date(date.getTime() + offset * 3600 * 1000);
    let hour = now.getHours();
    let minute = now.getMinutes();
    let lesson = getLessonExact(className || "M20403", WEEKDAYS[now.getDay()], hour, minute);
    if ((typeof lesson) === "string") return "Nothing";
    return getLessonExact(className || "M20403", WEEKDAYS[now.getDay()], lesson.end.hour, lesson.end.minute);
}

function getLessonEmbed(lesson) {
    if ((typeof lesson) === "string") return lesson;
    return new Discord.RichEmbed().setColor(0x009a90).setTitle(lesson.subject).addField("Start", lesson.start.hour.toString().padStart(2, '0') + ":" + lesson.start.minute.toString().padStart(2, '0'), true).addField("End", lesson.end.hour.toString().padStart(2, '0') + ":" + lesson.end.minute.toString().padStart(2, '0'), true);
}

function getLessonExact(className, day, hour, min) {
    if (typeof className === "number") className = className.toString();
    for (let c of TIMETABLE) {
        if (c.name === className || c.name.substr(3) === className || c.name.substr(5) === className) {
            for (let lesson of c.lessons) {
                lesson.start = getHourAndMinute(lesson.timeStart);
                lesson.end = getHourAndMinute(lesson.timeEnd);
                if ((lesson.start.hour * 60 + lesson.start.minute) <= (hour * 60 + min) && (lesson.end.hour * 60 + lesson.end.minute) > (hour * 60 + min)) return lesson;
            }
            return "Free Period";
        }
    }
    return "No School";
}

function getHourAndMinute(str) {
    return {
        hour: parseInt(str.substr(0, str.length - 2)),
        minute: parseInt(str.substr(str.length - 2))
    };
}
