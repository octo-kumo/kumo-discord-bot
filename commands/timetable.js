const fetch = require('node-fetch');
const config = require('./config.js').config;
const moment = require('moment-timezone');
let timetable;

const WEEKDAYS = [
    'Sunday',
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday'
];

const CLASS_NAME_REGEX = /^((M21)?[1-6]0)?[1-7]$/i;

exports.init = () => fetch('https://junron.dev/nushmeet/timetable.json').then(res => res.json()).then(json => timetable = json.data);
exports.handleCommand = (args, msg, PREFIX) => {
    let className = 'M21503', query = 'now', day;
    for (const arg of args) {
        if (CLASS_NAME_REGEX.test(arg)) className = fillClassName(arg);
        else if (['now', 'tmr', 'all', 'left'].includes(arg)) query = arg;
        else if (arg.length > 3 && WEEKDAYS.some(day => day.toLowerCase().startsWith(arg.toLowerCase()))) day = WEEKDAYS.findIndex(day => day.toLowerCase().startsWith(arg.toLowerCase()));
        else return msg.reply(`\`${PREFIX}timetable [class]? [now/tmr/all/left]? [weekday]?\`\nAny order is fine`);
    }
    if (query === 'now') msg.channel.send(getLessonsNow(className, day));
    else if (query === 'tmr') msg.channel.send(getLessonsTmr(className));
    else if (query === 'all') msg.channel.send(getLessonsAll(className, day));
    else if (query === 'left') msg.channel.send(getLessonsRemaining(className));
    else msg.channel.send("Welp you pro");
};

function fillClassName(name) {
    if (name.length === 1) return "M2150" + name;
    else if (name.length === 3) return "M21" + name;
    else return name.toUpperCase();
}

function getLessonsNow(className, day) {
    let now = moment().tz("Asia/Singapore");
    let query = getLessonsExact(className, WEEKDAYS[day === 0 ? day : day || now.day()], now.hour(), now.minute());
    if (!query) return 'Nothing';
    else if (typeof query === 'string') return query;
    if (!query.lesson) return 'Free period' + (query.next === -1 ? '' : '\nNext is **' + query.lessons[query.next].subject.join('/') + '**');
    let start = parseTime(query.lesson.start_time);
    let end = parseTime(query.lesson.end_time);
    return `${className} **${query.lesson.subject.join('/')}**\n${format(start)} → ${format(end)}\n` +
        `(${express(minutesToTime(diff(start, end)))}) Ends in ${express(minutesToTime(diff([now.hour(), now.minute()], end)))}\n` +
        `Next is **${query.lessons[query.index + 1] ? query.lessons[query.index + 1].subject.join('/') : 'Nothing'}**${day && day !== now.day() ? `\n*On ${WEEKDAYS[day]}` : ''}`;
}

function getLessonsOnDay(className, day, indicator) {
    let now = moment().tz("Asia/Singapore");
    let lessons = timetable[className][WEEKDAYS[day]];
    let tester = now.hour() * 100 + now.minute();
    let max = Math.max(5, Math.max.apply(null, lessons.map(lesson => lesson.subject.join('/').length)));
    return `**Lessons ${className}/${WEEKDAYS[day]}**\`\`\`\n${lessons.map((lesson, i) => `${(i + 1).toString().padStart(lessons.length.toString().length, ' ')}. ${lesson.subject.join('/').padStart(max, ' ')} ${format(parseTime(lesson.start_time))} → ${format(parseTime(lesson.end_time))}` +
        (indicator && lesson.start_time <= tester && lesson.end_time > tester ? ' ← ' + express(minutesToTime(diff([now.hour(), now.minute()], parseTime(lesson.end_time)))) : '')).join('\n')}\`\`\``;
}

function getLessonsRemaining(className) {
    let now = moment().tz("Asia/Singapore");
    let tester = now.hour() * 100 + now.minute();
    let lessons = timetable[className][WEEKDAYS[now.day()]].filter(lesson => lesson.end_time > tester);
    if (lessons.length === 0) return "Nothing lmao";
    let max = Math.max(5, Math.max.apply(null, lessons.map(lesson => lesson.subject.join('/').length)));
    return `**Lessons Remaining ${className}/${WEEKDAYS[now.day()]}**\`\`\`\n${lessons.map((lesson, i) => `${lesson.subject.join('/').padStart(max, ' ')} ${format(parseTime(lesson.start_time))} → ${format(parseTime(lesson.end_time))}` +
        (i === 0 ? ' ← ' + express(minutesToTime(diff([now.hour(), now.minute()], parseTime(lesson.end_time)))) : '')).join('\n')}\`\`\``;
}

function getLessonsAll(className, day) {
    return getLessonsOnDay(className, day === 0 ? day : day || moment().tz("Asia/Singapore").day(), true);
}

function getLessonsTmr(className) {
    let day = moment().tz("Asia/Singapore").day();
    if (day === 0 || day === 6 || day === 5) day = 1;
    else day++;
    return getLessonsOnDay(className, day, false);
}

function getLessonsExact(className, day, hour, min) {
    if (typeof className === "number") className = className.toString();
    if (!CLASS_NAME_REGEX.test(className)) return config.TIMETABLE_NON_EXIST[Math.random() * config.TIMETABLE_NON_EXIST.length];
    if (hour >= 22 || hour <= 5) return "Sleep Period";
    if (day === "Sunday" || day === "Saturday") return "Weekends";
    let lessons = timetable[className][day];
    if (!lessons) return null;
    let tester = hour * 100 + min;
    let index = lessons.findIndex(lesson => lesson.start_time <= tester && lesson.end_time > tester);
    let next = lessons.findIndex(lesson => lesson.start_time > tester);
    return {
        lessons,
        lesson: lessons[index],
        index,
        next
    };
}


function minutesToTime(min) {
    return [Math.floor(min / 60), min % 60];
}

function parseTime(number) {
    return [Math.floor(number / 100), number % 100]
}

function format(time) {
    return time[0].toString().padStart(2, '0') + ":" + time[1].toString().padStart(2, '0');
}

function express(time) {
    return (time[0] > 0 ? time[0] + "h " : '') + time[1] + "m";
}

function diff(timeA, timeB) {
    return Math.abs((timeA[0] - timeB[0]) * 60 + timeA[1] - timeB[1]);
}


// 8:04
// 7:48
