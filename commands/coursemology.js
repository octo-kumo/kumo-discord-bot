const moment = require("moment");

const Discord = require('discord.js');
const {
    parseAssessment,
    init,
    update,
} = require('./coursemology_lib');
const config = require('./config.js').config;

const ids = [2080];
const COURSES = {};
const LAST_REMINDER = {};

exports.init = async () => {
    init(ids, COURSES).then(() => setInterval(checkUpdates, 1000 * 60)).then(() => checkUpdates());
};

function checkUpdates() {
    update(ids, COURSES).then(results => results.forEach(result => {
        if (result.new_items.length > 0) config.COURSEMOLOGY_HOOK.send({
            "username": "New Assessments",
            "embeds": result.new_items.map(i => newItemEmbed(i))
        });
        if (result.new_notice.length > 0) config.COURSEMOLOGY_HOOK.send({
            "username": "Notifications",
            "embeds": result.new_notice.sort((a, b) => a.time - b.time).map(i => newNoticeEmbed(i))
        });
        let now = moment() - 8 * 60 * 60 * 1000;
        ids.forEach(id => {
            let course = COURSES[id];
            let needRemind = [];
            for (const items of Object.values(course.items)) {
                for (const item of items) {
                    if (Math.abs(24 * 60 * 60 * 1000 - (item.endAt - now)) < 2000 * 60) {
                        if (LAST_REMINDER[item.id] && Math.abs(LAST_REMINDER[item.id] - now) < 4000 * 60) continue;
                        LAST_REMINDER[item.id] = now;
                        needRemind.push(item);
                    }
                }
            }
            if (needRemind.length > 0) config.COURSEMOLOGY_HOOK.send({
                "username": "Reminder",
                "embeds": needRemind.sort((a, b) => a.time - b.time).map(i => newRemindEmbed(i))
            });
        });
        if (config.COURSEMOLOGY_CHANNEL) config.COURSEMOLOGY_CHANNEL.messages.fetch().then(messages => remindDueDate(messages.filter(e => e.author.id === config.id && e.embeds.length > 0 && e.embeds[0].author.name === "Assessment Reminder").first(), config.COURSEMOLOGY_CHANNEL));
    }));
}

async function remindDueDate(msg, channel) {
    let needRemind = [];
    let now = moment();
    ids.forEach(id => Object.keys(COURSES[id].items).forEach(name => needRemind.push({
        name,
        items: COURSES[id].items[name].filter(item => item.endAt > now)
    })));
    if (needRemind.some(items => items.items.length > 0)) {
        if (msg) return await msg.edit(itemsEmbed(needRemind));
        else return await channel.send(itemsEmbed(needRemind));
    }
}

exports.handleCommand = async (args, msg, prefix) => {
    if (args.length === 0) return msg.reply("_Coursemology autograding is lagging..._");
    let json = false;
    if (json = args.includes("--json")) args.splice(args.indexOf('--json'), 1);
    console.log("coursemology sub-system; command:", args[0], ", args:", "\"" + args.slice(1).join("\", \"") + "\"");
    let command = args[0];
    switch (command) {
        case "l":
            for (const course of Object.values(COURSES)) {
                let embed = new Discord.MessageEmbed();
                embed.setAuthor(course.name);
                embed.setColor(0x00ffff);
                embed.addFields(Object.keys(course.items).map(type => ({
                    name: type,
                    value: course.items[type].map(item => `[${item.title}](${item.url})`).join("\n") || "*None*"
                })));
                msg.channel.send(embed);
            }
            break;
        default:
            let sendAssessment = (assessment) => {
                console.log("Sending assessment...");
                let json_text = JSON.stringify(assessment, null, 4);
                if (json) {
                    if (json_text.length > 2000 - 13) {
                        json_text = JSON.stringify(assessment);
                        if (json_text.length > 2000 - 13) msg.channel.send('_It is too long for discord to accept_');
                        else msg.channel.send('```json\n' + json_text + '\n```');
                    } else msg.channel.send('```json\n' + json_text + '\n```');
                } else msg.channel.send(generateAssessmentEmbed(assessment));
            }
            args = args.join(" ");
            for (const course of Object.values(COURSES)) {
                for (const items of Object.values(course.items)) {
                    for (const item of items) {
                        if (item.title.toUpperCase().includes(args.toUpperCase()) || item.id === args) {
                            sendAssessment(await parseAssessment(course.id, item.id));
                            return;
                        }
                    }
                }
            }
            msg.channel.send("Not found");
            break;
    }
}

function generateAssessmentEmbed(assessment) {
    let basicInfo = new Discord.MessageEmbed();
    basicInfo.setTitle(assessment.name);
    basicInfo.setURL(assessment.url);
    basicInfo.setFooter(COURSES[assessment.course].name + " • ID: " + assessment.id);
    basicInfo.setColor(0x00ffff);
    for (let field of assessment.fields) basicInfo.addField(field.name, field.value, true);
    basicInfo.addField("Auto Graded", assessment.autograded ? "Yes" : "Manual", true);
    basicInfo.addField("Number of Questions", assessment.questions, true);
    if (assessment.files.length > 0) basicInfo.addField("Files", assessment.files.map(file => `[${file.name}](${file.url})`).join(", "));
    if (assessment.achievements.length > 0) basicInfo.addField("Achievements", assessment.achievements.map(achievement => `**${achievement.name}** ${achievement.description}`).join("\n"));
    basicInfo.addField("Attempt", `[Click Me to Attempt](https://nushigh.coursemology.org/courses/${assessment.course}/assessments/${assessment.id}/submissions)`)
    if (assessment.unreleased) {
        basicInfo.setDescription("_This is an unreleased assessment_");
        return basicInfo;
    }
    basicInfo.setDescription(assessment.markdown + (assessment.achievements.length > 0 ? "\n**Achievements**:\n" + assessment.achievements.map(a => `**${a.name}** ${a.description}`).join("\n") : ""));
    return basicInfo;
}

function newItemEmbed(item) {
    let basicInfo = new Discord.MessageEmbed();
    basicInfo.setAuthor(item.title, null, item.url);
    basicInfo.setColor(0x00ffff);
    if (item.endAt) {
        basicInfo.setTimestamp(item.endAt);
        basicInfo.setFooter("Due");
    }
    return basicInfo;
}

function newNoticeEmbed(item) {
    let basicInfo = new Discord.MessageEmbed();
    basicInfo.setDescription(item.text);
    basicInfo.setColor(0x00ffff);
    basicInfo.setTimestamp(item.time);
    return basicInfo;
}

function newRemindEmbed(item) {
    let basicInfo = new Discord.MessageEmbed();
    basicInfo.setAuthor(item.title, null, item.url);
    basicInfo.setColor(0x00ffff);
    basicInfo.setDescription("Due in 1 day")
    basicInfo.setTimestamp(item.endAt);
    return basicInfo;
}

function itemsEmbed(items) {
    let basicInfo = new Discord.MessageEmbed();
    basicInfo.setAuthor("Assessment Reminder");
    basicInfo.setColor(0x00ffff);
    let now = moment() - 8 * 60 * 60 * 1000;
    basicInfo.setDescription(
        items.map(l => l.items.length === 0 ? '' : `**${l.name}**\n${l.items.sort((a, b) => a.endAt - b.endAt).map(i => `[${i.title}](${i.url}): **${formatDiff(i.endAt - now)}**`).join("\n")}`).join("\n")
    );
    basicInfo.setTimestamp(+now);
    return basicInfo;
}

let minDuration = [1000, 60 * 1000, 60 * 60 * 1000, 24 * 60 * 60 * 1000];
let durationName = ['sec', 'min', 'hour', 'day'];

function formatDiff(amount) {
    for (let i = 0; i < durationName.length; i++) {
        if (minDuration[i] < amount && (!minDuration[i + 1] || minDuration[i + 1] > amount)) {
            let amm = Math.floor(amount / minDuration[i]);
            let text = amm + " " + durationName[i] + (amm > 1 ? 's' : '');
            if (i !== 0) {
                amm = Math.floor((amount % minDuration[i]) / minDuration[i - 1]);
                text = text + " " + amm + " " + durationName[i - 1] + (amm > 1 ? 's' : '');
            }
            return text;
        }
    }
    return amount + " ms";
}