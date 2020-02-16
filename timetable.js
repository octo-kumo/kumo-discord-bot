const Discord = require('discord.js');
const config = require('./config.js').config;
const TIMETABLE = require('./timetable.json');

const WEEKDAYS = [
    'sun',
    'mon',
    'tue',
    'wed',
    'thu',
    'fri',
    'sat'
];

const CLASSES = [
    'M20401',
    'M20402',
    'M20403',
    'M20404',
    'M20405',
    'M20406',
    'M20407'
];

let lessonNow = {};
let lessonDiff = {};
exports.update = () => {
    lessonDiff = {};
    for (let i = 1; i <= 7; i++) {
        let newLessons = getLessonsNow("M2040" + i);
        if ((typeof newLessons) === "string") {
            if (lessonNow[i] && lessonNow[i] !== newLessons) {
                lessonNow[i] = newLessons;
                if (lessonDiff[newLessons]) lessonDiff[newLessons].push("M2040" + i);
                else lessonDiff[newLessons] = ["M2040" + i];
            } else lessonNow[i] = newLessons;
        } else {
            let code = newLessons.map(l => l.subject).join(",");
            if (lessonNow[i] && lessonNow[i] !== code) {
                lessonNow[i] = code;
                for (let newLesson of newLessons) {
                    let lessonName = (typeof newLesson) === "object" ? newLesson.subject : newLesson;
                    if (lessonDiff[lessonName]) lessonDiff[lessonName].push("M2040" + i);
                    else lessonDiff[lessonName] = ["M2040" + i];
                }
            } else lessonNow[i] = code;
        }
    }
    for (let lessonName of Object.keys(lessonDiff)) config.HOOK2.send("@" + callClasses(lessonDiff[lessonName]) + ", its **" + lessonName + "** now!");
}

function callClasses(classList) {
    if (classList.length === 7) return "all classes";
    if (classList.length === 6)
        for (let i = 0; i < CLASSES.length; i++)
            if (!classList.includes(CLASSES[i])) return "all except " + CLASSES[i];
    return classList.join(", ");
}

exports.handleCommand = (args, msg, PREFIX) => {
    if (args.length === 0) {
        msg.channel.send(getLessonsEmbed(getLessonsNow("M20403")));
    } else if (args.length === 1 && CLASS_NAME_REGEX.test(args[0])) {
        msg.channel.send(getLessonsEmbed(getLessonsNow(args[0])));
    } else if (args.length === 1) {
        if (args[0] === "now") msg.channel.send(getLessonsEmbed(getLessonsNow("M20403")));
        else if (args[0] === "next") msg.channel.send(getLessonsEmbed(getLessonsNext("M20403")));
        else msg.channel.send("Only 'now' or 'next' allowed");
    } else if (args.length === 2) {
        if (args[0] === "now") msg.channel.send(getLessonsEmbed(getLessonsNow(args[1])));
        else if (args[0] === "next") msg.channel.send(getLessonsEmbed(getLessonsNext(args[1])));
        else msg.channel.send("Only 'now' or 'next' allowed");
    } else msg.channel.send("_Perhaps you lost your magic._");
};

function getLessonsNow(className) {
    let now = new Date(new Date().getTime() + config.offset * 3600 * 1000);
    let hour = now.getHours();
    let minute = now.getMinutes();
    return getLessonsExact(className || "M20403", WEEKDAYS[now.getDay()], hour, minute);
}

function getLessonsNext(className) {
    let now = new Date(new Date().getTime() + config.offset * 3600 * 1000);
    let hour = now.getHours();
    let minute = now.getMinutes();
    let lesson = getLessonsExact(className || "M20403", WEEKDAYS[now.getDay()], hour, minute);
    if (hour < 8) return getLessonsExact(className || "M20403", WEEKDAYS[now.getDay()], 8, 0);
    if (hour >= 18) return getLessonsExact(className || "M20403", WEEKDAYS[(now.getDay() + 1) % 7], 8, 0);
    if ((typeof lesson) === "string") return "Nothing";
    return getLessonsExact(className || "M20403", WEEKDAYS[now.getDay()], lesson[0].end.hour, lesson[0].end.minute);
}

function getLessonsEmbed(lessons) {
    if ((typeof lessons) === "string") return lessons;
    return new Discord.RichEmbed().setColor(0x009a90).setTitle(lessons.map(l => l.subject).join(" & "))
        .addField("Start", lessons.map(l => l.start.hour.toString().padStart(2, '0') + ":" + l.start.minute.toString().padStart(2, '0')).filter(onlyUnique).join(", "), true)
        .addField("End", lessons.map(l => l.end.hour.toString().padStart(2, '0') + ":" + l.end.minute.toString().padStart(2, '0')).filter(onlyUnique).join(", "), true);
}

function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
}

const CLASS_NAME_REGEX = /^(M?20)?40[1-7]$/i;

function getLessonsExact(className, day, hour, min) {
    if (typeof className === "number") className = className.toString();
    if (!CLASS_NAME_REGEX.test(className)) return "_Existential Crisis_: **YES**";
    if (hour >= 22 || hour <= 5) return "Sleep Period";
    if (day === "sun" || day === "sat") return "Weekends";
    for (let c of TIMETABLE) {
        if (c.name === className || c.name.substr(3) === className || c.name.substr(5) === className) {
            let lessons = [];
            for (let lesson of c.lessons) {
                lesson.start = getHourAndMinute(lesson.timeStart);
                lesson.end = getHourAndMinute(lesson.timeEnd);
                if (lesson.day === day && (lesson.start.hour * 60 + lesson.start.minute) <= (hour * 60 + min) && (lesson.end.hour * 60 + lesson.end.minute) > (hour * 60 + min)) lessons.push(lesson);
            }
            if (lessons.length === 0)
                return "Free Period";
            else return lessons;
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
