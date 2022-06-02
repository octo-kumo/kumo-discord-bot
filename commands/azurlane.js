const Discord = require('discord.js');
const fetch = require('node-fetch');
const config = require('./config.js').config;
let SHIPS;
let CHAPTERS;
let MEMORIES;
const generateFilter = require('./generateFilter.js').generateFilter;

const ship_book_filter = (reaction, user) =>
    (['⬅️', '📊', '👕', '🖌️', '➡️', '❎'].includes(reaction.emoji.name) || "698441024644841543" === reaction.emoji.id) && user.id !== config.id;
const chapter_book_filter = (reaction, user) => ['⬅️', '➡️', '❎'].includes(reaction.emoji.name) && user.id !== config.id;
const memory_book_filter = (reaction, user) => ['❎', '⏬', '⏫', '🔼', '🔽', '🇨🇳', '🇯🇵', '🇬🇧'].includes(reaction.emoji.name) && user.id !== config.id;

const ship_book_anchors = {
    '📊': 'stats',
    'numba_wan': 'skills',
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
    "Normal": 0xFFFFFF,
    "Rare": 0x41D7FF,
    "Elite": 0xCC7BFF,
    "Super Rare": 0xFDC637,
    "Ultra Rare": 0xBD4000,
    "Priority": 0xBD4000,
    "Decisive": 0xBD4000,
    "Unreleased": 0x000000,
    "query": 0x4593d7
};
const TRANSLATION = {
    "Oil consumption": "Oil Usage",
    "Accuracy (Hit)": "Accuracy",
    "Anti-submarine warfare": "Anti-Sub"
};
const BOOKS = {};
exports.init = async function () {
    SHIPS = await fetch("https://raw.githubusercontent.com/AzurAPI/azurapi-js-setup/master/ships.json").then(res => res.json());
    CHAPTERS = await fetch("https://raw.githubusercontent.com/AzurAPI/azurapi-js-setup/master/chapters.json").then(res => res.json());
    MEMORIES = await fetch("https://raw.githubusercontent.com/AzurAPI/azurapi-js-setup/master/memories.json").then(res => res.json());
}
exports.handleCommand = async function (args, msg, PREFIX) {
    try {
        console.log("running azurlane sub-system...");
        if (args.length < 1) return msg.channel.send("Correct Usage: `" + PREFIX + "azurlane ship-name`");
        if (args[0] === "find") {
            args.shift();
            let filter = generateFilter(args.join(" "));
            let book = generateShipsBook(filter);
            msg.channel.send(book.pages[0]).then(message => {
                BOOKS[message.id] = book;
                message.react('⬅️').then(() => message.react('➡️')).then(() => message.react('❎'));
                message.createReactionCollector(ship_book_filter).on('collect', r => {
                    if (!r) return;
                    r.users.cache.keyArray().filter(k => k !== config.id).forEach(k => r.users.remove(k));
                    let name = r.emoji.name;
                    if (r.emoji.name === '❎') return message.delete();
                    let book = BOOKS[message.id];
                    if (name === "⬅️" || name === "➡️") {
                        let incre = name === "⬅️" ? -1 : 1;
                        if ((book.page >= book.pages.length && incre === 1) || (book.page <= 0 && incre === -1)) return;
                        message.edit(book.pages[book.page += incre]);
                    }
                });
            });
        } else if (['memory', 'm', 'mem', 'memories', 'ram'].includes(args[0])) {
            args.shift();
            let book = generateMemoryBook(args.join(" "), 'en');
            msg.channel.send(book.pages['en'].pages[0]).then(message => {
                BOOKS[message.id] = book;
                message
                    .react('⏫').then(() => message.react('🔼')).then(() => message.react('🔽')).then(() => message.react('⏬'))
                    .then(() => message.react('🇨🇳')).then(() => message.react('🇯🇵')).then(() => message.react('🇬🇧'))
                    .then(() => message.react('❎'));
                message.createReactionCollector(memory_book_filter).on('collect', r => {
                    if (!r) return;
                    r.users.cache.keyArray().filter(k => k !== config.id).forEach(k => r.users.remove(k));
                    let name = r.emoji.name;
                    if (r.emoji.name === '❎') return message.delete();
                    let book = BOOKS[message.id];
                    let langBook = book.pages[book.lang];
                    let oldLang = book.lang;
                    let oldPage = book.page;
                    if (name === '⏫') if (langBook.getChapter(book.page) > 0) book.page = langBook.getPage(langBook.getChapter(book.page) - 1);
                    else if (name === '🔼') if (book.page > 0) book.page -= 1;
                    else if (name === '🔽') if (book.page < langBook.pages.length - 1) book.page += 1;
                    else if (name === '⏬') if (langBook.getChapter(book.page) < langBook.length - 1) book.page = langBook.getPage(langBook.getChapter(book.page) + 1);
                    else if (name === '🇨🇳') book.lang = 'cn';
                    else if (name === '🇯🇵') book.lang = 'jp';
                    else if (name === '🇬🇧') book.lang = 'en';
                    if (oldLang !== book.lang || oldPage !== book.page) {
                        message.edit(book.pages[book.lang].pages[book.page]);
                        console.log('Page turning...');
                    }
                });
            });
        } else if (['map', 'chapter', 'c'].includes(args[0])) {
            let book = generateChapterBook(args.join(" ").replace(/[^0-9]/g, ''));
            if (!book) return msg.reply("Are you from the future?");
            msg.channel.send(book.pages[0]).then(message => {
                BOOKS[message.id] = book;
                message.react('⬅️').then(() => message.react('➡️')).then(() => message.react('❎'));
                message.createReactionCollector(chapter_book_filter).on('collect', r => {
                    if (!r) return;
                    r.users.cache.keyArray().filter(k => k !== config.id).forEach(k => r.users.remove(k));
                    let name = r.emoji.name;
                    console.log("Emoji Name = " + name);
                    if (r.emoji.name === '❎') return message.delete();
                    let book = BOOKS[message.id];
                    let incre = name === "⬅️" ? -1 : 1;
                    if ((book.page >= book.pages.length && incre === 1) || (book.page <= 0 && incre === -1)) return;
                    message.edit(book.pages[book.page += incre]).catch(e => {
                    });
                });
            }).catch(e => {
            });
        } else if (args[0] === "reload" && msg.author.id === "456001047756800000") {
            await exports.init();
            msg.reply("Azurlane Data has been reloaded!")
        } else if (args[0] === "json") {
            args.shift();
            const ship = getShipByName(args.join(" "));
            if (!ship) return null;
            await sendLongCode(msg.channel, JSON.stringify(ship, null, '\t'), "json");
        } else {
            let book = generateBook(args.join(" "));
            if (!book) return msg.reply("Is that a ship from another world?");
            msg.channel.send(book.pages[0]).then(message => {
                BOOKS[message.id] = book;
                message.react('⬅️').then(() => message.react('📊')).then(() => message.react('698441024644841543')).then(() => message.react('👕')).then(() => message.react('🖌️')).then(() => message.react('➡️')).then(() => message.react('❎'));
                message.createReactionCollector(ship_book_filter).on('collect', r => {
                    if (!r) return;
                    r.users.cache.keyArray().filter(k => k !== config.id).forEach(k => r.users.remove(k));
                    let name = r.emoji.name;
                    console.log("Emoji Name = " + name);
                    if (r.emoji.name === '❎') return message.delete();
                    let book = BOOKS[message.id];
                    if (name === "⬅️" || name === "➡️") {
                        let incre = name === "⬅️" ? -1 : 1;
                        if ((book.page >= book.pages.length && incre === 1) || (book.page <= 0 && incre === -1)) return;
                        message.edit(book.pages[book.page += incre]);
                    } else if (book.page !== (book.page = book.anchors[ship_book_anchors[name]] || 0)) message.edit(book.pages[book.page]);
                });
            });
        }
    } catch (err) {
        console.log(`ship subcommand, err code = ${err.statusCode}, err message = ${err.message}, args = ${args}`);
        console.log(err.stack);
        msg.channel.send("Error: " + err.message);
    }
}

function generateShipsBook(filter) {
    let ships = [];
    for (let ship of SHIPS)
        if (filter(ship)) ships.push(ship);
    let targetEmbed = new Discord.MessageEmbed();
    let pages = [];
    if (ships.length === 0) {
        targetEmbed.setDescription("_No ship matches your query!_");
        pages.push(targetEmbed);
    }
    for (let i = 0; i < ships.length; i++) {
        targetEmbed.addField(`#${i + 1} **${ships[i].rarity}** _${ships[i].nationality}_`, `**${ships[i].names.code || ships[i].names.en}** (JP: ${ships[i].names.jp || "?"}, CN: ${ships[i].names.cn || "?"})`);
        if (i !== 0 && i % 8 === 0) {
            pages.push(targetEmbed);
            targetEmbed = new Discord.MessageEmbed();
        } else if (i === (ships.length - 1)) pages.push(targetEmbed);
    }
    for (let i = 0; i < pages.length; i++) {
        pages[i].setAuthor("Query Results").setColor(COLOR.query);
        let footer = "Page " + (i + 1) + "/" + pages.length + " • Total " + ships.length + " ships";
        pages[i].setFooter(footer);
    }
    return {
        page: 0,
        pages: pages
    };
}

function generateChapterBook(chapterIndex) {
    let chapter = CHAPTERS[chapterIndex];
    if (!chapter) return null;
    console.log("Chapter " + chapterIndex);
    console.log(chapter.names);
    let pages = [];
    for (let i = 0; i < 4; i++) {
        let map = chapter[i + 1];
        console.log(map);
        pages.push(generateMapPage(chapter, map));
    }
    for (let i = 0; i < pages.length; i++) {
        pages[i].setAuthor("#" + chapterIndex + " " + chapter.names.en + " (" + chapter.names.jp + ")").setColor(COLOR.query);
        let footer = "Map " + (i + 1) + "/" + pages.length;
        pages[i].setFooter(footer);
    }
    return {
        page: 0,
        pages: pages
    };
}

function generateMapPage(chapter, map) {
    const embed = new Discord.MessageEmbed();
    embed.setTitle(`**${map.normal.code}** ${map.names.en} (${map.names.jp})`);
    embed.setDescription(map.normal.introduction);
    embed.addField("Unlock Req.", map.normal.unlockRequirements.text, true);
    embed.addField("Clear Rewards", map.normal.clearRewards.cube + "<:core:655377687875026974> " + map.normal.clearRewards.coin + "<:coin:700498633753231381> " + map.normal.clearRewards.oil + "<:oil:700498633296052276>", true);
    embed.addField("Enemy Level", "**Mob**: Lv." + map.normal.enemyLevel.mobLevel + "\n**Boss**: " + map.normal.enemyLevel.boss + " (Lv." + map.normal.enemyLevel.bossLevel + ")", true);
    embed.addField("Base XP", Object.keys(map.normal.baseXP).map(key => XP_NAME_TRANSLATION[key] + map.normal.baseXP[key] + (key === "mediumFleet" ? "\n" : "")).join(" "), true);
    embed.addField("Air Supremacy", "Min: " + map.normal.airSupremacy.actual + "\nSuggest: " + map.normal.airSupremacy.suggestedLv2 + "-" + map.normal.airSupremacy.suggestedLv1, true);
    embed.addField("Drops", map.normal.mapDrops.join("\n"), true);
    embed.addField("Stars", map.normal.starConditions.join("\n"), true);
    let eq = map.normal.equipmentBlueprintDrops.map(drop => drop.name + "(" + drop.tier + ")").join("\n");
    embed.addField("Equipments", eq || "*None*");
    embed.addField("Ship Drops", map.normal.shipDrops.map(ship => typeof (ship) === "string" ? ship : ship.name + " (" + ship.note + ")").join(", "));
    embed.setImage(map.normal.nodeMap.preview);
    return embed;
}

const XP_NAME_TRANSLATION = {
    "smallFleet": "<:small_fleet:700500409135136798>",
    "mediumFleet": "<:medium_fleet:700500409051250728>",
    "largeFleet": "<:large_fleet:700500409172754442>",
    "bossFleet": "<:boss_node:700500409168560229>",
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
    "accuracy": "Accuracy",
    "antisubmarineWarfare": "<:iconasw:655290057736978432> ASW",
    "oxygen": "<:iconoxygen:661814201903480842> Oxygen",
    "ammunition": "<:iconammunition:661814201345507349> Ammunition",
    "huntingRange": "<:iconhuntrange:661814201538576387> Hunting Range"
}
const SKIN_INFO_TRANSLATION = {
    "obtainedFrom": "From",
    "live2dModel": "Has Live2D Model",
    "enClient": "EN Name",
    "cnClient": "CN Name",
    "jpClient": "JP Name",
    "krClient": "KR Name",
    "cost": "<:ruby:655377729033732096> Cost"
}

function generateMemoryBook(name, lang) {
    let anchors = {};
    anchors.chapters = [];
    const memory = getMemoryByName(name);
    if (!memory) return null;
    return {
        page: 0,
        pages: {
            en: generateMemoryPages(memory, 'en'),
            cn: generateMemoryPages(memory, 'cn'),
            jp: generateMemoryPages(memory, 'jp'),
        },
        lang: lang
    };
}

function generateMemoryPages(memory, lang) {
    let pages = [];
    let anchors = []; //by chapter
    pages.push(new Discord.MessageEmbed().setTitle(memory.names[lang]).setImage(memory.thumbnail).setURL(memory.wikiUrl));
    for (let i = 0; i < memory.chapters.length; i++) {
        anchors.push(pages.length);
        pages.push(new Discord.MessageEmbed().setTitle("Chapter " + (i + 1)).setImage(memory.thumbnail).setDescription(memory.chapters[i].names[lang]));
        for (let j = 0; j < memory.chapters[i].lines.length; j++) {
            pages.push(new Discord.MessageEmbed()
                .setTitle(memory.chapters[i].lines[j].names[lang])
                .setImage(memory.chapters[i].lines[j].background ? memory.chapters[i].lines[j].background : memory.chapters[i].lines[j].bannerSrc)
                .setThumbnail(memory.chapters[i].lines[j].background ? memory.chapters[i].lines[j].bannerSrc : null)
                .setDescription(memory.chapters[i].lines[j].content[lang])
                .setFooter("Chapter " + (i + 1) + "/" + memory.chapters.length + " • Line " + (j + 1) + "/" + memory.chapters[i].lines.length));
        }
    }
    pages.forEach(page => page.setColor(0x007FFF));
    return {
        pages: pages,
        anchors: anchors,
        length: anchors.length,
        getChapter: (page) => {
            for (let i = 0; i < anchors.length; i++)
                if (anchors[i] > page) return i - 1;
            return anchors.length - 1;
        },
        getPage: (chapter) => anchors[chapter] || 0
    };
}

function generateBook(name) {
    let pages = [];
    let anchors = {};
    anchors.stats = 1;
    const ship = getShipByName(name);
    if (!ship) return null;
    pages.push(generateGenInfoPage(ship));
    pages.push(generateStatsPage(ship, "baseStats"));
    pages.push(generateStatsPage(ship, "level100"));
    pages.push(generateStatsPage(ship, "level120"));
    if (ship.retrofit) {
        pages.push(generateStatsPage(ship, "level100Retrofit"));
        pages.push(generateStatsPage(ship, "level120Retrofit"));
    }
    anchors.skills = pages.length;
    pages.push(generateSkillsPage(ship));
    anchors.skins = pages.length;
    for (let i = 0; i < ship.skins.length; i++) {
        const skinPage = new Discord.MessageEmbed();
        skinPage.setTitle("Skins (" + ship.skins[i].name + ")").setThumbnail(ship.skins[i].chibi).setImage(ship.skins[i].image);
        skinPage.setDescription(ship.skins.map(skin => skin.name === ship.skins[i].name ? `**${skin.name}**` : skin.name).join("\n"));
        for (let key of Object.keys(ship.skins[i].info))
            if (ship.skins[i].info[key]) skinPage.addField(SKIN_INFO_TRANSLATION[key], ship.skins[i].info[key], true);
        skinPage.setFooter("Skin #" + (i + 1));
        pages.push(skinPage);
    }
    anchors.gallery = pages.length;
    for (let i = 0; i < ship.gallery.length; i++) {
        const itemPage = new Discord.MessageEmbed();
        itemPage.setTitle("Gallery");
        itemPage.setDescription(ship.gallery[i].description);
        itemPage.setImage(ship.gallery[i].url);
        itemPage.setFooter("Item #" + (i + 1));
        pages.push(itemPage);
    }
    for (let i = 0; i < pages.length; i++) {
        pages[i].setAuthor(`${ship.names.code} (${ship.names.jp})`, ship.thumbnail, ship.wikiUrl).setColor(COLOR[ship.rarity]);
        if (!pages[i].thumbnail) pages[i].setThumbnail(ship.skins[0].chibi);
        let footer = "Page " + (i + 1) + "/" + pages.length + (pages[i].footer ? " • " + pages[i].footer.text : "");
        pages[i].setFooter(footer);
    }
    return {
        page: 0,
        pages: pages,
        anchors: anchors
    };
}

function creatSkillField(skill) {
    if (!skill) return {
        name: "\u200b",
        value: "\u200b"
    };
    return {
        name: skill.names.en + "\n" + skill.names.jp,
        value: skill.description
    };
}

function creatLimitField(index, limit) {
    if (!limit) return {
        name: "\u200b",
        value: "\u200b"
    };
    return {
        name: "Limit Break " + index,
        value: limit.join("\n")
    };
}

function createDevLevelField(level, buffs) {
    return {
        name: "Lv " + level,
        value: buffs.map(buff => {
            if (typeof buff === "object") return Object.keys(buff).map(sbuff => STATS_EMOJI_TRANSLATION[sbuff] + " " + buff[sbuff]).join(", ")
            else return buff;
        }).join("\n")
    };
}

function generateGenInfoPage(ship) {
    const generalInfo = new Discord.MessageEmbed(); // Page 1
    generalInfo.setTitle("General Info")
        .addField("Rarity", ship.rarity + " " + '★'.repeat(ship.stars))
        .addField("ID", ship.id, true)
        .addField("Nation", ship.nationality, true)
        .addField("Class", ship.class, true)
        .addField("Type", ship.hullType, true);
    if (ship.misc.artist) {
        generalInfo.addField("Artist",
            Object.keys(ship.misc.artist.urls).map(key => `[${key === 'Wiki' ? ship.misc.artist.name : key}](${ship.misc.artist.urls[key]})`)
                .join(' · '), true);
    }
    if (ship.misc.voice) generalInfo.addField("VA", `[${ship.misc.voice.name}](${ship.misc.voice.url})`, true);
    generalInfo.addField("Construction Time / Obtained From", ship.construction.constructionTime);
    return generalInfo;
}

function generateStatsPage(ship, key) {
    const statsPage = new Discord.MessageEmbed();
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

function generateSkillsPage(ship) {
    const skills_limits_eq = new Discord.MessageEmbed(); // Page 3
    skills_limits_eq.setTitle("Equipment Slots / Skills / Limit Breaks");
    skills_limits_eq.addField("> **Equipment Slots**\n" + "(1) " + ship.slots[0].type, ship.slots[0].minEfficiency ? ship.slots[0].minEfficiency + "% → " + ship.slots[0].maxEfficiency + "%" : "None", true)
        .addField("(2) " + ship.slots[1].type, ship.slots[1].minEfficiency + "% → " + ship.slots[1].maxEfficiency + "%", true)
        .addField("(3) " + ship.slots[2].type, ship.slots[2].minEfficiency + "% → " + ship.slots[2].maxEfficiency + "%", true);
    for (let i = 0; i < ship.skills.length; i++) {
        let skill = ship.skills[i];
        let skill_field = creatSkillField(skill);
        skills_limits_eq.addField((i === 0 ? "> **Skills**\n" : "") + skill_field.name, skill_field.value, ship.skills.length - 1 !== i);
    }
    if (ship.rarity === "Priority" || ship.rarity === "Decisive") {
        let keys = Object.keys(ship.devLevels);
        for (let i = 0; i < keys.length; i++) {
            let level = keys[i];
            let delv_field = createDevLevelField(level, ship.devLevels[level]);
            skills_limits_eq.addField((i === 0 ? "> **Development Levels**\n" : "") + delv_field.name, delv_field.value, keys.length - 1 !== i);
        }
    } else {
        for (let i = 0; i < ship.limitBreaks.length; i++) {
            let limit_field = creatLimitField(i + 1, ship.limitBreaks[i]);
            skills_limits_eq.addField((i === 0 ? "> **Limit Breaks**\n" : "") + limit_field.name, limit_field.value, ship.limitBreaks.length - 1 !== i);
        }
    }
    return skills_limits_eq;
}

function getShipByName(name) {
    for (let ship of SHIPS) {
        if (ship.id && ship.id.toUpperCase() === name.toUpperCase()) return ship;
        if (ship.names.en && normalize(ship.names.en.toUpperCase()) === normalize(name.toUpperCase())) return ship;
        if (ship.names.jp && normalize(ship.names.jp.toUpperCase()) === normalize(name.toUpperCase())) return ship;
        if (ship.names.kr && normalize(ship.names.kr.toUpperCase()) === normalize(name.toUpperCase())) return ship;
        if (ship.names.cn && normalize(ship.names.cn.toUpperCase()) === normalize(name.toUpperCase())) return ship;
        if (ship.names.code && normalize(ship.names.code.toUpperCase()) === normalize(name.toUpperCase())) return ship;
    }
    for (let ship of SHIPS) {
        if (ship.names.en && normalize(ship.names.en.toUpperCase()).includes(normalize(name.toUpperCase()))) return ship;
        if (ship.names.jp && normalize(ship.names.jp.toUpperCase()).includes(normalize(name.toUpperCase()))) return ship;
        if (ship.names.kr && normalize(ship.names.kr.toUpperCase()).includes(normalize(name.toUpperCase()))) return ship;
        if (ship.names.cn && normalize(ship.names.cn.toUpperCase()).includes(normalize(name.toUpperCase()))) return ship;
        if (ship.names.code && normalize(ship.names.code.toUpperCase()).includes(normalize(name.toUpperCase()))) return ship;
    }
    return null;
}

async function sendLongCode(channel, code, tag) {
    let buffer = [];
    let messages = [];
    let size = 0;
    code.split("\n").forEach(line => {
        if (size + line.length >= 2000 - 8 - tag.length) {
            size = 0;
            messages.push("```" + tag + "\n" + buffer.join("\n") + "\n```");
            buffer = [];
        }
        buffer.push(line);
        size += line.length + 1;
    });
    messages.push("```" + tag + "\n" + buffer.join("\n") + "\n```");
    for (let i = 0; i < messages.length; i++) {
        await channel.send(messages[i]);
    }
}

const combining = /[\u0300-\u036F]/g;

function normalize(string) {
    return string.normalize('NFKD').replace(combining, '');
}

function getMemoryByName(name) {
    for (let memory of Object.values(MEMORIES)) {
        if (memory.names.en && memory.names.en.toUpperCase() === name.toUpperCase()) return memory;
        if (memory.names.jp && memory.names.jp.toUpperCase() === name.toUpperCase()) return memory;
        if (memory.names.cn && memory.names.cn.toUpperCase() === name.toUpperCase()) return memory;
    }
    for (let memory of Object.values(MEMORIES)) {
        if (memory.names.en && memory.names.en.toUpperCase().includes(name.toUpperCase())) return memory;
        if (memory.names.jp && memory.names.jp.toUpperCase().includes(name.toUpperCase())) return memory;
        if (memory.names.cn && memory.names.cn.toUpperCase().includes(name.toUpperCase())) return memory;
    }
    return null;
}
