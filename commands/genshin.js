const fetch = require('node-fetch');
const Discord = require("discord.js");
const config = require('./config.js').config;
const API_URL = "https://api.genshin.dev";
const TYPES = ["artifacts", "characters", "domains", "elements", "materials", "nations", "weapons"];
const LIST = {};
const TIPS = {config: null, text: null};
const book_filter = (reaction, user) =>
    (['⬅️', '📊', '👕', '🖌️', '➡️', '❎'].includes(reaction.emoji.name) || "698441024644841543" === reaction.emoji.id) && user.id !== config.id;
const ship_book_anchors = {
    '📊': 'stats',
    '👕': 'skins',
    '🖌️': 'gallery'
}
const BOOKS = {};
const COLOR = {
    "1": 0xFFFFFF,
    "2": 0xADFF2F,
    "3": 0x41D7FF,
    "4": 0xCC7BFF,
    "5": 0xFDC637
};
exports.init = () => {
    return Promise.all([
        fetch('https://raw.githubusercontent.com/Dimbreath/GenshinData/master/ExcelBinOutput/LoadingTipsExcelConfigData.json').then(res => res.json()).then(j => {
            TIPS.config = j
        }),
        fetch('https://raw.githubusercontent.com/Dimbreath/GenshinData/master/TextMap/TextMapEN.json').then(res => res.json()).then(j => {
            TIPS.text = j
        }),
        ...TYPES.map(type => get(type, '').then(res => LIST[type] = res))]);
}

function get(type, name) {
    return fetch(`${API_URL}/${type}/${name}`).then(res => res.json());
}

exports.handleCommand = async (args, msg, prefix) => {
    console.log("running genshin sub-module... args =", args);
    try {
        if (args.length === 0) return msg.reply("...");
        let type;
        if (args.length > 1 && TYPES.includes(args[0])) {
            type = args[0];
            args.shift();
        }
        if (!type && args[0].length >= 3) for (let t of TYPES) if (t.startsWith(args[0])) {
            type = t;
            args.shift();
        }
        let name = args.join('-').toLowerCase();
        if (!type) for (let t of TYPES) if (LIST[t].includes(name)) type = t;
        if (!type) return msg.reply("Can't find that");
        let data = await get(type, name);
        switch (type) {
            case 'characters':
                let book = characterBook(name, data);
                msg.channel.send(book.pages[0]).then(message => {
                    BOOKS[message.id] = book;
                    // message.react('⬅️').then(() => message.react('📊')).then(() => message.react('698441024644841543')).then(() => message.react('👕')).then(() => message.react('🖌️')).then(() => message.react('➡️')).then(() => message.react('❎'));
                    message.createReactionCollector(book_filter).on('collect', r => {
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
                break;
            case 'artifacts':
                await msg.channel.send(artifactInfo(name, data));
                break;
            case 'weapons':
                await msg.channel.send(weaponInfo(name, data));
                break;
        }
        console.log("complete.");
    } catch
        (err) {
        msg.channel.send("Something happened");
        console.log(err);
    }
};
exports.gTip = (args, msg, prefix) => {
    let c;
    if (args.length > 0) {
        c = TIPS.config.find(c => c.Id.toString() === args[0]);
        if (!c) return msg.reply("Not found");
    } else {
        let n = Math.floor(Math.random() * TIPS.config.length);
        c = TIPS.config[n];
    }
    return msg.channel.send(
        new Discord.MessageEmbed().setTitle(TIPS.text[c.TipsTitleTextMapHash])
            .setDescription(TIPS.text[c.TipsDescTextMapHash].replace(/\\n/g, '\n'))
            .setColor(0x66d4de)
            .setFooter("ID " + c.Id)
    );
}

function characterBook(name, data) {
    let pages = [];
    let anchors = {};
    anchors.general = 0;
    pages.push(generateGenInfoPage(name, data));
    for (let i = 0; i < pages.length; i++) {
        pages[i].setAuthor(data.name, `https://api.genshin.dev/characters/${name}/icon`).setColor(COLOR[data.rarity]);
        pages[i].setFooter("Page " + (i + 1) + "/" + pages.length + (pages[i].footer ? " • " + pages[i].footer.text : ""));
    }
    return {
        page: 0,
        pages: pages,
        anchors: anchors
    };
}

function generateGenInfoPage(name, data) {
    const generalInfo = new Discord.MessageEmbed(); // Page 1
    generalInfo.setTitle("General Info")
        .addField("Rarity", star(data.rarity))
        .addField("Vision", data.vision, true)
        .addField("Class", get_class(data.weapon), true);
    if (data.constellation) generalInfo.addField("Constellation", data.constellation, true);
    if (data.title) generalInfo.addField("Title", data.title, true);
    if (data.affiliation) generalInfo.addField(data.nation, data.affiliation, true);
    else generalInfo.addField("Nation", data.nation, true);
    if (data.specialDish) generalInfo.addField("Special Dish", data.specialDish, true);
    if (data.birthday) generalInfo.addField("Birthday", data.birthday.substr(data.birthday.indexOf('-') + 1), true);
    generalInfo.setDescription(data.description);
    generalInfo.setImage(`https://api.genshin.dev/characters/${name}/portrait`)
    return generalInfo;
}

function artifactInfo(name, data) {
    return new Discord.MessageEmbed().setTitle(data.name)
        .addField("Max Rarity", star(data.max_rarity))
        .addField("2 Piece", data['2-piece_bonus'])
        .addField("4 Piece", data['4-piece_bonus'])
        .setColor(COLOR[data.max_rarity])
        .setThumbnail(`https://api.genshin.dev/artifacts/${name}/flower-of-life`);
}

function weaponInfo(name, data) {
    return new Discord.MessageEmbed().setTitle(data.name)
        .addField("Rarity", star(data.rarity))
        .addField("Type", data.type, true)
        .addField("Base ATK", data.baseAttack, true)
        .addField("Sub Stat", data.subStat, true)
        .addField("Passive", `**${data.passiveName}**\n${data.passiveDesc}`, true)
        .setFooter("From • " + data.location)
        .setColor(COLOR[data.max_rarity])
        .setThumbnail(`https://api.genshin.dev/weapons/${name}/icon`);
}


function star(c) {
    return '<:gstar:814760869148753931>'.repeat(c);
}

function get_class(weapon) {
    switch (weapon) {
        case"Bow":
            return "Archer";
        case"Sword":
            return "Saber";
        case"Catalyst":
            return "Caster";
        case"Polearm":
            return "Lancer";
        case"Claymore":
            return "Berserker"
    }
}
