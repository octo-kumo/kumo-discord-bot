const Discord = require('discord.js');
const config = require('./config.js').config;
const SHIPS = require('./ships.json');

const page_filter = (reaction, user) => ['⬅️', '❎', '➡️'].includes(reaction.emoji.name) && user.id !== config.id;
const page_increments = {
    '⬅️': -1,
    '➡️': 1
};
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
        let pages = generatePages(args.join(" "));
        msg.channel.send(pages[0]).then(message => {
            BOOKS[message.id] = {
                pages: pages,
                page: 0
            };
            message.react('⬅️').then(() => message.react('❎')).then(() => message.react('➡️'));
            message.createReactionCollector(page_filter).on('collect', r => {
                if (!r) return;
                r.remove(msg.author.id);
                let incre = page_increments[r.emoji.name];
                if (r.emoji.name === '❎') return message.delete();
                let book = BOOKS[message.id];
                if ((book.page >= book.pages.length && incre === 1) || (book.page <= 0 && incre === -1)) return;
                message.edit(book.pages[book.page += incre]);
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

function generatePages(name) {
    let pages = [];
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
    if (ship.misc.voice) generalInfo.addField("Voice Actress", ship.misc.voice.name);
    pages.push(generalInfo);
    const stats = []; // Page 2-?
    pages.push(generateStatsPage(ship, "baseStats"));
    pages.push(generateStatsPage(ship, "level100"));
    pages.push(generateStatsPage(ship, "level120"));
    if (ship.retrofit) {
        pages.push(generateStatsPage(ship, "level100Retrofit"));
        pages.push(generateStatsPage(ship, "level120Retrofit"));
    }

    const skills_limits_eq = new Discord.RichEmbed(); // Page 3
    skills_limits_eq.setTitle("Equipment Slots / Skills / Limit Breaks")
        .addField("(1) " + ship.slots[1].type, ship.slots[1].minEfficiency ? ship.slots[1].minEfficiency + "% → " + ship.slots[1].maxEfficiency + "%" : "", true)
        .addField("(2) " + ship.slots[2].type, ship.slots[2].minEfficiency + "% → " + ship.slots[2].maxEfficiency + "%", true)
        .addField("(3) " + ship.slots[3].type, ship.slots[3].minEfficiency + "% → " + ship.slots[3].maxEfficiency + "%", true);
    skills_limits_eq.addBlankField();
    console.log(ship.skills['1']);
    skills_limits_eq.addField(ship.skills['1'].names.en + "\n" + ship.skills['1'].names.jp, ship.skills['1'].description, true);
    if (ship.skills['2']) skills_limits_eq.addField(ship.skills['2'].names.en + "\n" + ship.skills['2'].names.jp, ship.skills['2'].description, true);
    else skills_limits_eq.addBlankField(true);
    if (ship.skills['3']) skills_limits_eq.addField(ship.skills['3'].names.en + "\n" + ship.skills['3'].names.jp, ship.skills['3'].description, true);
    else skills_limits_eq.addBlankField(true);
    skills_limits_eq.addBlankField();
    skills_limits_eq.addField("Limit Break 1", ship.limitBreaks[1].join("\n"), true);
    skills_limits_eq.addField("Limit Break 2", ship.limitBreaks[2].join("\n"), true);
    skills_limits_eq.addField("Limit Break 3", ship.limitBreaks[3].join("\n"), true);
    pages.push(skills_limits_eq);
    const construction = new Discord.RichEmbed(); // Page 4
    construction.setTitle("Construction");
    pages.push(construction);
    for (let i = 0; i < pages.length; i++) {
        pages[i].setAuthor(`${ship.names.code} (${ship.names.jp})`, ship.thumbnail, ship.wikiUrl)
            .setColor(COLOR[ship.rarity])
            .setThumbnail(ship.skins[0].chibi);
        pages[i].setFooter("Page " + (i + 1) + "/" + pages.length);
    }
    return pages;
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
