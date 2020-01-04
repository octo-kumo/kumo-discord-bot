const Discord = require('discord.js');
const config = require('./config.js').config;
const SHIPS = require('./ships.json');

const page_filter = (reaction, user) => ['⬅️', '📊', '🎉', '👕', '🖌️', '➡️', '❎'].includes(reaction.emoji.name) && user.id !== config.id;
const page_anchor_index = {
    '📊': 'stats',
    '🎉': 'skills',
    '👕': 'skins',
    '🖌️': 'gallery'
}
const statsLevels = {
    "level120": "Level 120",
    "level100": "Level 100",
    "baseStats": "Base",
    "level100Retrofit": "Level 100 Retrofit",
    "level120Retrofit": "Level 120 Retrofit"
}

const COLOR = {
    "Normal": 0xdcdcdc,
    "Rare": 0xb0e0e6,
    "Elite": 0xdda0dd,
    "Super Rare": 0xeee8aa,
    "Ultra Rare": 0xeee8aa,
    "Priority": 0xeee8aa,
    "Decisive": 0xeee8aa,
    "Unreleased": 0x000000
};
const TRANSLATION = {
    "Oil consumption": "Oil Usage",
    "Accuracy (Hit)": "Accuracy",
    "Anti-submarine warfare": "Anti-Sub"
};
const BOOKS = {};

exports.ships = SHIPS;
exports.handleCommnd = async function(args, msg, PREFIX) {
    console.log("running azurlane sub-system...");
    if (args.length < 1) return msg.channel.send("Correct Usage: `" + PREFIX + "azurlane ship-name`");
    try {
        let book = generateBook(args.join(" "));
        msg.channel.send(book.pages[0]).then(message => {
            BOOKS[message.id] = book;
            message.react('⬅️').then(() => message.react('📊')).then(() => message.react('🎉')).then(() => message.react('👕')).then(() => message.react('🖌️')).then(() => message.react('➡️')).then(() => message.react('❎'));
            message.createReactionCollector(page_filter).on('collect', r => {
                if (!r) return;
                r.remove(msg.author.id);
                let name = r.emoji.name;
                if (r.emoji.name === '❎') return message.delete();
                let book = BOOKS[message.id];
                if (name === "⬅️" || name === "➡️") {
                    let incre = name === "⬅️" ? -1 : 1;
                    if ((book.page >= book.pages.length && incre === 1) || (book.page <= 0 && incre === -1)) return;
                    message.edit(book.pages[book.page += incre]);
                } else if (book.page !== (book.page = book.anchors[page_anchor_index[name]] || 0)) message.edit(book.pages[book.page]);
            });
        });
    } catch (err) {
        console.log(`ship subcommand, err code = ${err.statusCode}, err message = ${err.message}, args = ${args}`);
        console.log(err.stack);
        msg.channel.send("Invalid ship name.");
    }
}
const STATS_NAME_TRANSLATION = {
    "baseStats": "Base",
    "level100": "Level 100",
    "level120": "Level 120",
    "level100Retrofit": "Level 100 Retrofit",
    "level120Retrofit": "Level 120 Retrofit"
}
const STATS_EMOJI_TRANSLATION = {
    "health": "<:iconduration:655290064104063029> Health",
    "armor": "<:iconarmor:655290056080359444> Armor",
    "reload": "<:iconrefill:655290076019818496> Reload",
    "luck": "<:iconluck:655290065223680020> Luck",
    "firepower": "<:iconfirepower:655290065282400256> Firepower",
    "torpedo": "<:icontorpedo:655290077408264192> Torpedo",
    "evasion": "<:iconevasion:655290064741335051> Evasion",
    "speed": "Speed",
    "antiair": "<:iconantiair:655289973485862912> Anti-Air",
    "aviation": "<:iconaviation:655290057938436137> Aviation",
    "oilConsumption": "<:iconconsumption:655290063692759052> Oil Usage",
    "accuracyHit": "Accuracy",
    "antisubmarineWarfare": "<:iconasw:655290057736978432> ASW",
    "oxygen": "<:iconoxygen:661814201903480842> Oxygen",
    "ammunition": "<:iconammunition:661814201345507349> Ammunition",
    "huntingRange": "<:iconhuntrange:661814201538576387> Hunting Range"
}
const SKIN_INFO_TRANSLATION = {
    "obtainedFrom": "From",
    "live2DModel": "Has Live2D Model",
    "eNClient": "EN Name",
    "cNClient": "CN Name",
    "jPClient": "JP Name",
    "cost": "<:ruby:655377729033732096> Cost"
}

function generateBook(name) {
    let pages = [];
    let anchors = {};
    const ship = getShipByName(name);
    const generalInfo = new Discord.RichEmbed(); // Page 1
    generalInfo.setTitle("General Info")
        .addField("Rarity", ship.rarity + " " + ship.stars.stars)
        .addField("ID", ship.id, true)
        .addField("Class", ship.class, true)
        .addField("Type", ship.hullType);
    if (ship.misc.artist) generalInfo.addField("Artist", ship.misc.artist, true);
    if (ship.misc.web) generalInfo.addField("Web", ship.misc.web.name, true);
    if (ship.misc.pixiv) generalInfo.addField("Pixiv", ship.misc.pixiv.name, true);
    if (ship.misc.twitter) generalInfo.addField("Twitter", ship.misc.twitter.name, true);
    if (ship.misc.voice) generalInfo.addField("Voice Actress", ship.misc.voice.name, true);
    generalInfo.addField("Construction Time / Obtained From", ship.construction.constructionTime);
    pages.push(generalInfo);
    const stats = []; // Page 2-?
    anchors.stats = 1;
    pages.push(generateStatsPage(ship, "baseStats"));
    pages.push(generateStatsPage(ship, "level100"));
    pages.push(generateStatsPage(ship, "level120"));
    if (ship.retrofit) {
        pages.push(generateStatsPage(ship, "level100Retrofit"));
        pages.push(generateStatsPage(ship, "level120Retrofit"));
    }
    const skills_limits_eq = new Discord.RichEmbed(); // Page 3
    skills_limits_eq.setTitle("Equipment Slots / Skills / Limit Breaks")
        .addField("(1) " + ship.slots[1].type, ship.slots[1].minEfficiency ? ship.slots[1].minEfficiency + "% → " + ship.slots[1].maxEfficiency + "%" : "None", true)
        .addField("(2) " + ship.slots[2].type, ship.slots[2].minEfficiency + "% → " + ship.slots[2].maxEfficiency + "%", true)
        .addField("(3) " + ship.slots[3].type, ship.slots[3].minEfficiency + "% → " + ship.slots[3].maxEfficiency + "%", true);
    skills_limits_eq.addBlankField();
    for (skill of ship.skills) {
        let skill_field = generateSkillField(skill);
        skills_limits_eq.addField(skill_field.name, skill_field.value, true);
    }
    skills_limits_eq.addBlankField();
    if (ship.rarity === "Priority" || ship.rarity === "Decisive")
        for (level of Object.keys(ship.devLevels)) {
            let delv_field = generateDevLevel(level, ship.devLevels[level]);
            skills_limits_eq.addField(delv_field.name, delv_field.value, true);
        }
    else {
        for (let i = 0; i < ship.limitBreaks.length; i++) {
            let limit_field = generateLimitField(i + 1, ship.limitBreaks[i]);
            skills_limits_eq.addField(limit_field.name, limit_field.value, true);
        }
    }
    anchors.skills = pages.length;
    pages.push(skills_limits_eq);
    anchors.skins = pages.length;
    for (let i = 0; i < ship.skins.length; i++) {
        const skinPage = new Discord.RichEmbed();
        skinPage.setTitle("Skins (" + ship.skins[i].name + ")").setThumbnail(ship.skins[i].chibi).setImage(ship.skins[i].image);
        skinPage.setDescription(ship.skins.map(skin => skin.name === ship.skins[i].name ? `**${skin.name}**` : skin.name).join("\n"));
        for (let key of Object.keys(ship.skins[i].info)) skinPage.addField(SKIN_INFO_TRANSLATION[key], ship.skins[i].info[key], true);
        pages.push(skinPage);
    }
    anchors.gallery = pages.length;
    for (let item of ship.gallery) {
        const itemPage = new Discord.RichEmbed();
        itemPage.setTitle("Gallery");
        itemPage.setDescription(item.description);
        itemPage.setImage(item.url);
        pages.push(itemPage);
    }
    for (let i = 0; i < pages.length; i++) {
        pages[i].setAuthor(`${ship.names.code} (${ship.names.jp})`, ship.thumbnail, ship.wikiUrl).setColor(COLOR[ship.rarity]);
        if (!pages[i].thumbnail) pages[i].setThumbnail(ship.skins[0].chibi);
        pages[i].setFooter("Page " + (i + 1) + "/" + pages.length);
    }
    return {
        page: 0,
        pages: pages,
        anchors: anchors
    };
}

function generateSkillField(skill) {
    if (!skill) return {
        name: "\u200b",
        value: "\u200b"
    };
    return {
        name: skill.names.en + "\n" + skill.names.jp,
        value: skill.description
    };
}

function generateLimitField(index, limit) {
    if (!limit) return {
        name: "\u200b",
        value: "\u200b"
    };
    return {
        name: "Limit Break " + index,
        value: limit.join("\n")
    };
}

function generateDevLevel(level, buffs) {
    return {
        name: "Lv " + level,
        value: buffs.map(buff => {
            if (typeof buff === "object") return Object.keys(buff).map(sbuff => STATS_EMOJI_TRANSLATION[sbuff] + " " + buff[sbuff]).join(", ")
            else return buff;
        }).join("\n")
    };
}

function generateStatsPage(ship, key) {
    const statsPage = new Discord.RichEmbed();
    statsPage.setTitle(STATS_NAME_TRANSLATION[key] + " Stats")
    let names = "**";
    let values = "";
    for (let st in ship.stats[key]) {
        if (st === "huntingRange") continue;
        names = names + STATS_EMOJI_TRANSLATION[st] + "\n";
        values = values + ship.stats[key][st] + "\n";
    }
    statsPage.addField("Stat", names.trim() + "**", true);
    statsPage.addField("Value", values.trim(), true);
    if (ship.stats[key].huntingRange) {
        let range = "```\n";
        for (let row of ship.stats[key].huntingRange) {
            for (let col of row) range = range + " " + (col ? col : " ") + " ";
            range = range + "\n"
        }
        statsPage.addField(STATS_EMOJI_TRANSLATION["huntingRange"], range.trim() + "```");
    }
    return statsPage;
}

function getShipByName(name) {
    for (let ship of Object.values(SHIPS)) {
        if (ship.names.en && ship.names.en.toUpperCase() === name.toUpperCase()) return ship;
        if (ship.names.jp && ship.names.jp.toUpperCase() === name.toUpperCase()) return ship;
        if (ship.names.kr && ship.names.kr.toUpperCase() === name.toUpperCase()) return ship;
        if (ship.names.cn && ship.names.cn.toUpperCase() === name.toUpperCase()) return ship;
        if (ship.names.code && ship.names.code.toUpperCase() === name.toUpperCase()) return ship;
    }
    for (let ship of Object.values(SHIPS)) {
        if (ship.names.en && ship.names.en.toUpperCase().includes(name.toUpperCase())) return ship;
        if (ship.names.jp && ship.names.jp.toUpperCase().includes(name.toUpperCase())) return ship;
        if (ship.names.kr && ship.names.kr.toUpperCase().includes(name.toUpperCase())) return ship;
        if (ship.names.cn && ship.names.cn.toUpperCase().includes(name.toUpperCase())) return ship;
        if (ship.names.code && ship.names.code.toUpperCase().includes(name.toUpperCase())) return ship;
    }
    return null;
}

function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
}
