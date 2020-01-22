const request = require('request');
const fs = require('fs');
const JSDOM = require('jsdom').JSDOM;
const config = require('./config.js').config;

let LABS = [];
let ASSIGNMENTS = [];
let PROJECTS = [];
let ACTIVITIES = [];

const headers = {
    "Cookie": "remember_user_token=" + process.env.CMTOKEN,
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36 Edge/12.246"
};

exports.update = (course) => {
    updateActivities(course);
}

async function updateActivities(course) {
    const NEW_ACTIVITIES = await loadActivities(course);
    if (ACTIVITIES.length === 0) {
        ACTIVITIES = NEW_ACTIVITIES;
        console.log("ACTIVITIES init: " + ACTIVITIES.length);
    } else {
        let diff = [];
        for (let i = 0; i < NEW_ACTIVITIES.length; i++) {
            if (ACTIVITIES[0] && NEW_ACTIVITIES[i].id === ACTIVITIES[0].id) break; // Done
            diff.push(NEW_ACTIVITIES[i]);
        }
        if (diff.length > 0) {
            let embeds = [];
            for (let i = diff.length - 1; i >= 0; i--) {
                let notification = diff[i];
                console.log("New Activity: " + notification.content);
                embeds.push({
                    color: 0x53bad1,
                    title: notification.content,
                    description: notification.links.map(link => `[${link.text}](${link.url})`).join("\n"),
                    footer: {
                        text: notification.timestamp
                    }
                });
            }
            config.HOOK.send({
                embeds: embeds
            });
            ACTIVITIES = NEW_ACTIVITIES;
        }
    }
    const preset = config.list_presets[course];
    const NEW_LABS = await loadAssessmentsList(course, preset.labs.cat, preset.labs.tab);
    const NEW_ASSIGNMENTS = await loadAssessmentsList(course, preset.assignments.cat, preset.assignments.tab);
    const NEW_PROJECTS = await loadAssessmentsList(course, preset.projects.cat, preset.projects.tab);
    if (LABS.length === 0 && ASSIGNMENTS.length === 0 && PROJECTS.length === 0) { // Init
        LABS = NEW_LABS;
        ASSIGNMENTS = NEW_ASSIGNMENTS;
        PROJECTS = NEW_PROJECTS;
    } else {
        diff = [];
        for (let i = 0; i < NEW_LABS.length; i++) {
            if (LABS[0] && NEW_LABS[i].id === LABS[0].id) break; // Done
            diff.push(NEW_LABS[i]);
        }
        for (let i = 0; i < NEW_ASSIGNMENTS.length; i++) {
            if (ASSIGNMENTS[0] && NEW_ASSIGNMENTS[i].id === ASSIGNMENTS[0].id) break; // Done
            diff.push(NEW_ASSIGNMENTS[i]);
        }
        for (let i = 0; i < NEW_PROJECTS.length; i++) {
            if (PROJECTS[0] && NEW_PROJECTS[i].id === PROJECTS[0].id) break; // Done
            diff.push(NEW_PROJECTS[i]);
        }
        if (diff.length > 0) {
            let embeds = [];
            for (let i = diff.length - 1; i >= 0; i--) {
                let lab = diff[i];
                console.log(JSON.stringify(lab));
                embeds.push({
                    color: 0x53bad1,
                    title: "**" + lab.name + "**",
                    description: lab.achievements ? "You need this for:\n" + lab.achievements.map(ach => `**[${ach.name}](${ach.url})** ${ach.description}`).join("\n") : "",
                    fields: [{
                        name: "Start At",
                        value: lab.startAt,
                        inline: true
                    }, {
                        name: "End At",
                        value: lab.endAt,
                        inline: true
                    }]
                });
            }
            config.HOOK.send({
                embeds: embeds
            });
            LABS = NEW_LABS;
            ASSIGNMENTS = NEW_ASSIGNMENTS;
            PROJECTS = NEW_PROJECTS;
        }
    }
}

function loadActivities(course) {
    course = encodeURIComponent(course);
    return new Promise((resolve, reject) => {
        request({
            url: `https://nushigh.coursemology.org/courses/${course}`,
            headers: headers
        }, (error, response, body) => {
            const doc = new JSDOM(body).window.document;
            const notifications = [];
            for (let notific of doc.querySelectorAll(".message-holder .notification")) {
                let time = notific.getElementsByClassName("timestamp")[0];
                notific.removeChild(time);
                notifications.push({
                    id: notific.id,
                    timestamp: time.textContent,
                    content: notific.textContent,
                    links: Array.from(notific.getElementsByTagName("a")).map(a => {
                        return {
                            text: a.textContent,
                            url: "https://nushigh.coursemology.org" + a.href
                        };
                    })
                });
            }
            resolve(notifications);
        }).on('response', response => {
            if (config.debug) console.log('response received ' + response.statusCode);
        }).on('data', data => {
            if (config.debug) console.log('data chunk received ' + data.length);
        }).on('error', error => {
            if (config.debug) console.log('error ' + error.message);
            reject(error);
        });
    });
}

function loadUsersList(course) {
    course = encodeURIComponent(course);
    return new Promise((resolve, reject) => {
        request({
            url: `https://nushigh.coursemology.org/courses/${course}/users`,
            headers: headers
        }, (error, response, body) => {
            const doc = new JSDOM(body).window.document;
            let users = [];
            for (let user of doc.getElementsByClassName("course_user")) {
                users.push({
                    id: user.id,
                    course: course,
                    icon: user.getElementsByTagName("img")[0].src,
                    username: user.getElementsByClassName("user-name")[0].textContent.trim()
                });
            }
            resolve(users);
        }).on('response', response => {
            if (config.debug) console.log('response received ' + response.statusCode);
        }).on('data', data => {
            if (config.debug) console.log('data chunk received ' + data.length);
        }).on('error', error => {
            if (config.debug) console.log('error ' + error.message);
            reject(error);
        });
    });
}

function loadUser(course, user_id) {
    course = encodeURIComponent(course);
    if (isNaN(user_id) && user_id.startsWith("course_user_")) user_id = user_id.substring(12);
    return new Promise((resolve, reject) => {
        request({
            url: `https://nushigh.coursemology.org/courses/${course}/users/${user_id}`,
            headers: headers
        }, (error, response, body) => {
            const doc = new JSDOM(body).window.document;
            let achievements = [];
            for (let achievement of doc.getElementsByClassName("achievement")) {
                achievements.push({
                    id: achievement.id,
                    icon: achievement.getElementsByTagName("img")[0].src,
                    name: achievement.lastElementChild.lastElementChild.textContent
                });
            }
            let user = {
                id: user_id,
                course: course,
                icon: doc.querySelector(".profile-box img").src,
                username: doc.querySelector("h2:nth-child(1)").textContent,
                email: doc.querySelector("p:nth-child(2)").textContent,
                role: doc.querySelector("p:nth-child(3)").textContent.replace("Role:", '').trim(),
                achievements: achievements
            };
            resolve(user);
        }).on('response', response => {
            if (config.debug) console.log('response received ' + response.statusCode);
        }).on('data', data => {
            if (config.debug) console.log('data chunk received ' + data.length);
        }).on('error', error => {
            if (config.debug) console.log('error ' + error.message);
            reject(error);
        });
    });
}

function loadAssessmentsList(course, category, tab) {
    course = encodeURIComponent(course);
    category = encodeURIComponent(category);
    tab = encodeURIComponent(tab);
    return new Promise((resolve, reject) => {
        request({
            url: `https://nushigh.coursemology.org/courses/${course}/assessments?category=${category}&tab=${tab}`,
            headers: headers
        }, (error, response, body) => {
            const doc = new JSDOM(body).window.document;
            let children = doc.querySelector(".assessments-list tbody").children;
            let assessments = [];
            for (let child of children) {
                let achievements = [];
                if (child.querySelector(".table-requirement-for"))
                    for (let ach of child.querySelector(".table-requirement-for").children) achievements.push(ach.href.replace(/.+\/\d+\/achievements\/(\d+)/g, '$1'));
                assessments.push({
                    id: child.id,
                    name: child.firstElementChild.textContent,
                    active: child.classList.contains("currently-active"),
                    achievements: achievements,
                    baseExp: child.querySelector(".table-base-exp") ? parseInt(child.querySelector(".table-base-exp").textContent) : undefined,
                    timeBonusExp: child.querySelector(".table-time-bonus-exp") ? parseInt(child.querySelector(".table-time-bonus-exp").textContent) : undefined,
                    startAt: child.querySelector(".table-start-at") ? child.querySelector(".table-start-at").textContent.trim() : undefined,
                    endAt: child.querySelector(".table-end-at") ? child.querySelector(".table-end-at").textContent.trim() : undefined,
                    bonusCutOff: child.querySelector(".table-bonus-cut-off") ? child.querySelector(".table-bonus-cut-off").textContent.trim() : undefined,
                    course: course,
                    category: category,
                    tab: tab
                });
            }
            resolve(assessments);
        }).on('response', response => {
            if (config.debug) console.log('response received ' + response.statusCode);
        }).on('data', data => {
            if (config.debug) console.log('data chunk received ' + data.length);
        }).on('error', error => {
            if (config.debug) console.log('error ' + error.message);
            reject(error);
        });
    });
}

function loadAssessment(course, assessment_id) {
    course = encodeURIComponent(course);
    if (isNaN(assessment_id) && assessment_id.startsWith("assessment_")) assessment_id = assessment_id.substring(11);
    return new Promise((resolve, reject) => {
        request({
            url: `https://nushigh.coursemology.org/courses/${course}/assessments/${assessment_id}`,
            headers: headers
        }, (error, response, body) => {
            const doc = new JSDOM(body).window.document;
            const data = doc.getElementById("assessment_" + assessment_id);
            let description = [];
            let info = {};
            if (data.getElementsByClassName("well")[0])
                for (let node of data.getElementsByClassName("well")[0].children) {
                    if (node.tagName === "H3") continue;
                    else description.push(node.textContent);
                }
            let table = data.getElementsByTagName("table")[0];
            for (let row of table.lastElementChild.children) {
                let data = row.lastElementChild.textContent.trim();
                if (!isNaN(data)) data = parseInt(data);
                info[camelize(row.firstElementChild.textContent)] = data;
            }
            // Files/Achievements
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
            const assessment = {
                id: assessment_id,
                course: course,
                name: doc.querySelector(".page-header span").textContent,
                description: description.join("\n"),
                info: info,
                achievements: achievements,
                files: files
            };
            resolve(assessment);
        }).on('response', response => {
            if (config.debug) console.log('response received ' + response.statusCode);
        }).on('data', data => {
            if (config.debug) console.log('data chunk received ' + data.length);
        }).on('error', error => {
            if (config.debug) console.log('error ' + error.message);
            reject(error);
        });
    });
}

function camelize(str) {
    return str.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, (match, i) => {
        if (+match === 0) return "";
        return i == 0 ? match.toLowerCase() : match.toUpperCase();
    });
}
