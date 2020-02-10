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
        console.log(newLessons);
        if ((typeof newLessons) === "string") {
            if (lessonNow[i] && lessonNow[i] !== newLessons) {
                lessonNow[i] = newLessons;
                if (lessonDiff[newLessons]) lessonDiff[newLessons].push("M2040" + i);
                else lessonDiff[newLessons] = ["M2040" + i];
            } else lessonNow[i] = newLessons;
        } else {
            for (let newLesson of newLessons) {
                let lessonName = (typeof newLesson) === "object" ? newLesson.subject : newLesson;
                if (lessonNow[i] && lessonNow[i] !== lessonName) {
                    lessonNow[i] = lessonName;
                    if (lessonDiff[lessonName]) lessonDiff[lessonName].push("M2040" + i);
                    else lessonDiff[lessonName] = ["M2040" + i];
                } else lessonNow[i] = lessonName;
            }
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
    } else if (args.length === 1 && (/^((?:(?:M?)?20)?40\d)$/i).test(args[0])) {
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
    console.log("Hour", hour, "Minute", minute, 'Day', WEEKDAYS[now.getDay()]);
    return getLessonsExact(className || "M20403", WEEKDAYS[now.getDay()], hour, minute);
}

function getLessonsNext(className) {
    let now = new Date(new Date().getTime() + config.offset * 3600 * 1000);
    let hour = now.getHours();
    let minute = now.getMinutes();
    let lesson = getLessonExact(className || "M20403", WEEKDAYS[now.getDay()], hour, minute);
    if ((typeof lesson) === "string") return "Nothing";
    return getLessonExact(className || "M20403", WEEKDAYS[now.getDay()], lesson.end.hour, lesson.end.minute);
}

function getLessonsEmbed(lesson) {
    if ((typeof lesson) === "string") return lesson;
    return new Discord.RichEmbed().setColor(0x009a90).setTitle(lesson.map(l => l.subject).join(" & "))
        .addField("Start", lesson.map(l => l.start.hour.toString().padStart(2, '0') + ":" + l.start.minute.toString().padStart(2, '0')).filter(onlyUnique).join(", "), true)
        .addField("End", lesson.map(l => l.end.hour.toString().padStart(2, '0') + ":" + l.end.minute.toString().padStart(2, '0')).filter(onlyUnique).join(", "), true);
}

function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
}

function getLessonsExact(className, day, hour, min) {
    if (typeof className === "number") className = className.toString();
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
