const JSDOM = require('jsdom').JSDOM;
const fetch = require('node-fetch');
const FormData = require('form-data');
const turndown = require('turndown')();
const moment = require('moment');
const headers = {
    "Cookie": "remember_user_token=",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36 Edge/12.246"
};
const linkR = /^\/courses\/(?<course>\d+)\/assessments\?category=(?<cat>\d+)&tab=(?<tab>\d+)$/;

async function login() {
    const doc = new JSDOM(await fetch('https://nushigh.coursemology.org/users/sign_in').then(res => res.buffer())).window.document
    const token = doc.querySelector('meta[name="csrf-token"]').getAttribute('content')
    const formData = new FormData();
    formData.append('authenticity_token', token);
    formData.append('user[email]', 'h1710169@nushigh.edu.sg');
    formData.append('user[password]', process.env.CMPASS);
    formData.append('user[remember_me]', '1');
    formData.append('commit', 'Sign In');

    const res = await fetch('https://nushigh.coursemology.org/users/sign_in', {
        method: "POST",
        body: formData
    })
    headers.Cookie = res.headers.get('set-cookie').split(';')[0]
}

async function parseAssessment(course, id) {
    course = encodeURIComponent(course);
    if (isNaN(id) && id.startsWith("assessment_")) id = id.substring(11);
    let buf = await fetch(`https://nushigh.coursemology.org/courses/${course}/assessments/${id}`, {headers}).then(res => res.buffer());
    const doc = new JSDOM(buf).window.document;
    const data = doc.getElementById("assessment_" + id);
    let info = {};
    let fields = [];
    let table = data.getElementsByTagName("table")[0];
    for (let row of table.lastElementChild.children) {
        let data = row.lastElementChild.textContent.trim();
        if (!isNaN(data)) data = parseInt(data);
        info[camelize(row.firstElementChild.textContent)] = data;
        fields.push({
            value: data ? data : "-",
            name: row.firstElementChild.textContent.trim()
        });
    }
    let i = Array.from(data.children).indexOf(table) + 1;
    let mode = "";
    let achievements = [];
    let files = [];
    for (; i < data.children.length; i++) {
        let child = data.children[i];
        if (child.tagName === "H3") {
            if (child.textContent === "Finish to Unlock") mode = "achievement";
            if (child.textContent === "Files") mode = "files";
        } else if (mode === "files") {
            files.push({
                name: child.firstElementChild.textContent.trim(),
                url: "https://nushigh.coursemology.org" + child.firstElementChild.href
            });
        } else if (mode === "achievement") {
            achievements.push({
                id: child.id,
                url: "https://nushigh.coursemology.org" + child.firstElementChild.href,
                name: child.firstElementChild.textContent,
                description: child.lastChild.textContent.replace(/[\(\)]/g, '').trim()
            });
        }
    }
    let json = null;
    if (doc.querySelector(".page-header .btn-info") && doc.querySelector(".page-header .btn-info").textContent !== "Attempt") json = await (fetch("https://nushigh.coursemology.org" + doc.querySelector(".page-header .btn-info").href + "?format=json", {
        headers
    }).then(res => res.json()));
    return {
        url: `https://nushigh.coursemology.org/courses/${course}/assessments/${id}`,
        id: id,
        course: course,
        category: json ? json.assessment.categoryId : null,
        tab: json ? json.assessment.tabId : null,
        name: json ? json.assessment.title : doc.querySelector(".page-header").textContent,
        autograded: json ? json.assessment.autograded : null,
        // description: deepToString(new JSDOM(json.assessment.description).window.document.firstElementChild).trim(),
        markdown: json ? turndown.turndown(json.assessment.description) : null,
        questions: json ? json.questions.length : 0,
        // info: info,
        fields,
        achievements,
        files,
        unreleased: (!json)
    }
}

async function getListing(name, course, category, tab) {
    let buf = await fetch(`https://nushigh.coursemology.org/courses/${course}/assessments?category=${category}&tab=${tab}`, {headers}).then(res => res.buffer());
    let doc = new JSDOM(buf).window.document;
    let body = doc.getElementById("full-sidebar").nextElementSibling;
    let heads = Array.from(body.querySelectorAll("table>thead th")).map(e => camelize(e.textContent)).filter(e => Boolean(e));
    let items = Array.from(body.querySelectorAll("table>tbody tr")).map(row => {
        let item = {id: row.id, type: name};
        Array.from(row.children).forEach((e, i) => {
            if (heads[i]) {
                let data = e.textContent.trim();
                if (moment(data).isValid()) data = moment(data).year(moment().year()) - 8 * 60 * 60 * 1000;
                item[heads[i]] = data;
            }
            if (i === 0) item.url = "https://nushigh.coursemology.org" + e.firstElementChild.href;
        })
        return item;
    });
    if (body.querySelector('.nav.nav-tabs')) {
        let elem = Array.from(body.querySelector('.nav.nav-tabs').querySelectorAll('li'));
        let i = elem.findIndex(e => e.classList.contains('active'));
        let allItems = {};
        let n = elem[i].textContent;
        items.forEach(i => i.type = n);
        allItems[n] = items;
        if (elem[i + 1]) {
            let groups = linkR.exec(elem[i + 1].querySelector('a').href).groups;
            let otherItems = await getListing(name, groups.course, groups.cat, groups.tab);
            allItems = {
                ...otherItems,
                ...allItems
            }
        }
        return allItems;
    }
    let l = {};
    l[name] = items;
    return l;
}

async function parseCourse(course) {
    console.log("Course", course);
    let buf = await fetch(`https://nushigh.coursemology.org/courses/${course}`, {headers}).then(res => res.buffer());
    let doc = new JSDOM(buf).window.document;
    let notifications = Array.from(doc.querySelector(".course.page-header>.message-holder").children).map(l => {
        let time = l.querySelector(".clearfix.timestamp");
        time.remove();
        return {
            id: l.id,
            text: turndown.turndown(l.innerHTML).replace(/\/courses/g, 'https://nushigh.coursemology.org/courses'),
            time: +moment(time.textContent, "MMMM D, YYYY HH:mm") - 8 * 60 * 60 * 1000
        };
    });
    let mapping = Array.from(doc.getElementById("course-navigation-sidebar").querySelectorAll("li>a")).map(l => {
        let name = l.childNodes[1].textContent;
        if (["Tutorials", "Assignments", "Assessments"].includes(name)) {
            let results = linkR.exec(l.href);
            return {
                name,
                course: results.groups.course,
                cat: results.groups.cat,
                tab: results.groups.tab,
            }
        }
    }).filter(e => Boolean(e));
    let items = {};
    (await Promise.all(mapping.map(l => getListing(l.name, l.course, l.cat, l.tab)))).forEach(e => items = {...items, ...e});
    return {
        id: course,
        name: doc.getElementById("course_" + course).firstElementChild.textContent,
        notifications,
        items: items
    }
}

function init(ids, courses) {
    return Promise.all(ids.map(async id => courses[id] = await parseCourse(id)));
}

function update(ids, courses) {
    return Promise.all(ids.map(async id => {
        let ol = courses[id];
        let nl = await parseCourse(id);
        let new_notice = nl.notifications.filter(e => !ol.notifications.find(e1 => e1.id === e.id));
        let new_items = [];
        for (let key of Object.keys(nl.items)) {
            if (!ol.items[key]) new_items.push(...nl.items[key]);
            new_items.push(...(nl.items[key].filter(e => !(ol.items[key] && ol.items[key].find(e1 => e1.id === e.id)))));
        }
        courses[id] = nl;
        return {
            id,
            new_notice,
            new_items
        }
    }));
}

function camelize(str) {
    return str.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, function (match, index) {
        if (+match === 0) return ""; // or if (/\s+/.test(match)) for white spaces
        return index === 0 ? match.toLowerCase() : match.toUpperCase();
    });
}

module.exports = {
    login,
    parseAssessment,
    parseCourse,
    init,
    update,
}
