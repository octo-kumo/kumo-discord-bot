const Discord = require('discord.js');
const request = require('request');
const fs = require('fs');
const JSDOM = require('jsdom').JSDOM;
const config = require('./config.js').config;

let LABS = [];
let ASSIGNMENTS = [];
let PROJECTS = [];
let ALL_ASSESSMENTS = [];
let ACTIVITIES = [];

const headers = {
    "Cookie": "remember_user_token=" + process.env.CMTOKEN,
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36 Edge/12.246"
};
exports.handleCommand = (args, msg, prefix) => {
    if (args.length === 0) return msg.reply("_Coursemology autograding is lagging..._");
    console.log("coursemology sub-system; command:", args[0], ", args:", "\"" + args.slice(1).join("\", \"") + "\"");
    switch (args.shift()) {
        case "lab":
        case "l":
        case "info":
        case "i":
        case "assessment":
        case "a":
            if (args.length === 0) return msg.reply("_Labs aren't showing..._");
            let sendAssessment = (assessment) => msg.channel.send({
                embed: generateAssessmentEmbed(assessment),
                files: assessment.files
            });
            if (args.length === 1) args = [config.DEFAULT_COURSE, args[0]];
            let found;
            if (isNaN(args[1]) && args[1].trim().length > 0) {
                for (let assessment of ALL_ASSESSMENTS) {
                    if (assessment.course === args[0] && assessment.name.toUpperCase().includes(args[1].toUpperCase())) {
                        found = assessment;
                        console.log("Found local cache for " + found.name);
                        break;
                    }
                }
            } else {
                for (let assessment of ALL_ASSESSMENTS) {
                    console.log(assessment.course, args[0], assessment.course === args[0]);
                    console.log(assessment.id.toString(10), args[1], assessment.id.toString(10) === args[1]);
                    if (assessment.course === args[0] && assessment.id.toString(10) === args[1]) {
                        found = assessment;
                        console.log("Found local cache for " + found.name);
                        break;
                    }
                }
            }
            if (!found) {
                loadAssessment(args[0], args[1])
                    .then(sendAssessment)
                    .catch(err => msg.reply("**ERROR, ERROR** _Recalibrating..._\n```console\n" + err.stack + "```"));
            } else sendAssessment(found);
            break;
    }
}
exports.update = (course) => {
    updateActivities(course);
    updateLabs(course);
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
                    fields: [{
                        name: "Links",
                        value: notification.links.map(link => `[${link.text}](${link.url})`).join(", ")
                    }],
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
}

//ORDER = OLDEST (index 0) => NEWEST (index n)
async function updateLabs(course) {
    const preset = config.list_presets[course];
    const NEW_LABS = await loadAssessmentsList(course, preset.labs.cat, preset.labs.tab);
    const NEW_ASSIGNMENTS = await loadAssessmentsList(course, preset.assignments.cat, preset.assignments.tab);
    const NEW_PROJECTS = await loadAssessmentsList(course, preset.projects.cat, preset.projects.tab);
    if (LABS.length === 0 && ASSIGNMENTS.length === 0 && PROJECTS.length === 0) { // Init
        let download = async (NEW) => {
            let list = [];
            process.stdout.write('|');
            for (let i = 0; i < NEW.length; i++) {
                list.push(await loadAssessment(NEW[i].course, NEW[i].id));
                process.stdout.write('.');
            }
            process.stdout.write('| ');
            return list;
        };
        LABS = await download(NEW_LABS);
        console.log("LABS init: " + LABS.length);
        ASSIGNMENTS = await download(NEW_ASSIGNMENTS);
        console.log("ASSIGNMENTS init: " + ASSIGNMENTS.length);
        PROJECTS = await download(NEW_PROJECTS);
        console.log("PROJECTS init: " + PROJECTS.length);
        ALL_ASSESSMENTS = LABS.concat(ASSIGNMENTS).concat(PROJECTS);
    } else {
        let diff = [];
        let new_array = NEW_LABS;
        let old_array = LABS;
        let checkAndUpdate = async (NEW, OLD) => {
            for (let i = OLD.length; i < NEW.length; i++) {
                let assessment = await loadAssessment(NEW[i].course, NEW[i].id);
                OLD.push(assessment);
                diff.push(assessment);
                ALL_ASSESSMENTS.push(assessment);
            }
        };
        await checkAndUpdate(NEW_LABS, LABS);
        await checkAndUpdate(NEW_ASSIGNMENTS, ASSIGNMENTS);
        await checkAndUpdate(NEW_PROJECTS, PROJECTS);
        if (diff.length > 0) config.HOOK.send('@everyone **New Assessment(s)!**', {
            embeds: diff.map(generateAssessmentEmbed)
        });
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
    return new Promise((resolve, reject) => {
        course = encodeURIComponent(course);
        if (!category) category = config.list_presets[course].labs.cat;
        if (!tab) tab = config.list_presets[course].labs.tab;
        category = encodeURIComponent(category);
        tab = encodeURIComponent(tab);
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
            try {
                const doc = new JSDOM(body).window.document;
                const data = doc.getElementById("assessment_" + assessment_id);
                let info = {};
                let fields = [];
                let table = data.getElementsByTagName("table")[0];
                for (let row of table.lastElementChild.children) {
                    let data = row.lastElementChild.textContent.trim();
                    if (!isNaN(data)) data = parseInt(data);
                    info[camelize(row.firstElementChild.textContent)] = data;
                    fields.push({
                        value: data,
                        name: row.firstElementChild.textContent.trim(),
                        inline: true
                    });
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
                            attachment: "https://nushigh.coursemology.org" + child.firstElementChild.href
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
                    description: deepToString(data.getElementsByClassName("well")[0]).trim(),
                    markdown: deepToString(data.getElementsByClassName("well")[0], true).trim(),
                    info: info,
                    fields: fields,
                    achievements: achievements,
                    files: files
                };
                resolve(assessment);
            } catch (error) {
                console.log('error ' + error.message);
                reject(error);
            }
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

function generateAssessmentEmbed(assessment) {
    let basicInfo = new Discord.RichEmbed();
    basicInfo.setTitle(assessment.name);
    basicInfo.setDescription(assessment.markdown + assessment.achievements.length > 0 ? "\n**Achievements**:\n" + assessment.achievements.map(a => `**${a.name}** ${a.description}`).join("\n") : "");
    basicInfo.fields = assessment.fields;
    basicInfo.setFooter(config.list_presets[assessment.course].name + " • ID: " + assessment.id);
    basicInfo.setColor(0x00ffff);
    return basicInfo;
}

function camelize(str) {
    return str.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, (match, i) => {
        if (+match === 0) return "";
        return i == 0 ? match.toLowerCase() : match.toUpperCase();
    });
}

const BLOCK_TAGS = ['ADDRESS', 'ARTICLE', 'ASIDE', 'BLOCKQUOTE', 'CANVAS', 'DD', 'DIV', 'DL', 'DT', 'FIELDSET', 'FIGCAPTION', 'FIGURE', 'FOOTER', 'FORM', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'HEADER', 'HR', 'LI', 'MAIN', 'NAV', 'NOSCRIPT', 'OL', 'P', 'PRE', 'SECTION', 'TABLE', 'TFOOT', 'UL', 'VIDEO'];

const BOLD_TAGS = ['B', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'HEADER', 'MAIN'];
const ITALIC_TAGS = ['EM', 'SUB', 'SUP', 'A'];

function deepToString(element, markdown) {
    if (!element) return "";
    if (element.tagName === "H3" && element.textContent === "Description") return "";
    let str;
    if (element.childNodes.length > 1) {
        str = [];
        for (let node of element.childNodes) str.push(deepToString(node, markdown));
        return str.join("");
    } else if (element.childNodes.length === 1 && element.childNodes[0].nodeName === "#text") {
        str = deepToString(element.childNodes[0], markdown);
        if (markdown && BOLD_TAGS.includes(element.tagName)) str = "**" + str + "**";
        else if (markdown && ITALIC_TAGS.includes(element.tagName)) str = "_" + str + "_";
        if (markdown && element.tagName === "A") str = `[${str}](${element.href})`;
        if (markdown && element.tagName === "LI") str = " • " + str;
        if (BLOCK_TAGS.includes(element.tagName)) str = str + "\n";
    } else {
        if (element.textContent.trim().length === 0) str = "";
        else str = element.textContent.replace(/^\n+|\n+$/g, ' ').replace(/(\s){2,}/g, '$1');
    }
    return str;
}
