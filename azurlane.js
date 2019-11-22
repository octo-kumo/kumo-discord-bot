const request = require('request');
const JSDOM = require('jsdom').JSDOM;
const Discord = require('discord.js');
const config = require('./config.js').config;

const filter = (reaction, user) => ['⬅️', '❎', '➡️'].includes(reaction.emoji.name) && user.id !== config.id;
const filter2 = (reaction, user) => ['👕'].includes(reaction.emoji.name) && user.id !== config.id;
const headers = {
    'User-Agent': "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/68.0.3440.106 Safari/537.36"
};
const COLOR = {
    "Normal": 0xdcdcdc,
    "Rare": 0xb0e0e6,
    "Elite": 0xdda0dd,
    "Super Rare": 0xeee8aa,
    "Priority": 0xeee8aa,
    "Unreleased": 0x000000,
    "Decisive": 0xffffff
};
const SHIPS = [];
const SHIPS_CACHE = {};

const MESSAGES = {};
exports.ships = SHIPS;
exports.handleCommnd = async function(args, msg, PREFIX) {
    console.log("running azurlane sub-system...");
    if (args.length < 1) return msg.channel.send("Correct Usage: `" + PREFIX + "azurlane (ship|skin) [args]`");
    let lang = "en";
    if (["--en", "--jp", "--cn"].includes(args[args.length - 1])) {
        console.log("user specified language " + args[args.length - 1]);
        lang = args.pop().substring(2);
    }
    switch (args.shift()) {
        case "ship":
        case "s":
        case "info":
        case "i":
            try {
                console.log("Getting Ship " + args.join(" "));
                const ship = await getShipByName(args.join(" "));
                let embed = new Discord.RichEmbed().setTitle(`**${ship.names[lang]}**`).setColor(COLOR[ship.rarity]).setThumbnail(ship.thumbnail).setURL(ship.wikiUrl);
                let stats = ship.stats;
                embed.addField("**ID**", (ship.id) ? ship.id : "**not yet decided**", true)
                    .addField("**Stars**", ship.stars, true)
                    .addField("**Rarity**", "**" + ship.rarity + "**", true)
                    .addField("**Type**", ship.hullType, true)
                    .addField("**Class**", ship.class, true)
                    .addField("**Nationality**", ship.nationality, true)
                    .addField("❤️ Health", stats[0], true)
                    .addField("🛡 Armor", stats[1], true)
                    .addField("🔧 Reload", stats[2], true)
                    .addField("💚 Luck", stats[3], true)
                    .addField("⚔️ Firepower", stats[4], true)
                    .addField("🦋 Evasion", stats[6], true)
                    .addField("Speed", stats[7], true)
                    .addField("Anti-air", stats[8], true)
                    .addField("Aviation", stats[9], true)
                    .addField("Oil Usage", stats[10], true)
                    .addField("Accuracy", stats[11], true)
                    .addField("Anti-Submarine", stats[12], true)
                    .addField("📝 Designed by", ship.author);
                embed.setDescription("_All stats shown below are lv120 stats._");
                msg.channel.send(embed).then(message => {
                    message.react("👕");
                    message.createReactionCollector(filter2).on('collect', r => {
                        message.clearReactions();
                        exeSK([ship.names.en + "|Default"], msg, lang);
                    });
                });
            } catch (err) {
                console.log(`ship subcommand, err code = ${err.statusCode}, err message = ${err.message}, args = ${args}`);
                msg.channel.send("Invalid ship name.");
            }
            break;
        case "viewskin":
        case "skin":
        case "sk":
        case "vs":
            exeSK(args, msg, lang);
            break;
    }
}

async function exeSK(args, msg, lang) {
    if (args.length < 1) return msg.channel.send("Correct Usage: `" + PREFIX + "azurlane skin ship-name|skin-name`");
    try {
        let newArgs = args.join(" ").split(/ *\| */g);
        if (newArgs.length == 1) newArgs = [newArgs[0], "Default"];
        const ship = await getShipByName(newArgs[0]);
        let skin = ship.skins.filter(skin => skin.title.toUpperCase().includes(newArgs[1].toUpperCase()))[0];
        let embed = new Discord.RichEmbed().setTitle(`**${ship.names[lang]}** (${skin.title})`).setColor(COLOR[ship.rarity]).setThumbnail(skin.chibi).setURL(ship.wikiUrl);
        embed.addField("Avaliable Skins", ship.skins.map(lskin => lskin.title === skin.title ? "**" + lskin.title + "**" : lskin.title).join("\n"));
        embed.setImage(skin.image);
        msg.channel.send(embed).then(message => {
            if (ship.skins.length > 1) {
                message.react('⬅️').then(() => message.react('❎')).then(() => message.react('➡️'));
                MESSAGES[message.id] = {
                    name: ship.names[lang],
                    skins: ship.skins,
                    embed: embed,
                    currentSkin: ship.skins.findIndex(lskin => lskin.title === skin.title),
                    message: message
                };
                const collector = message.createReactionCollector(filter);
                collector.on('collect', r => {
                    console.log(`Collected ${r.emoji.name}`);
                    switch (r.emoji.name) {
                        case '❎':
                            r.message.delete();
                            delete MESSAGES[r.message.id];
                            break;
                        case '⬅️':
                        case '➡️':
                            message.reactions.forEach(reaction => reaction.users.filter(user => user.id !== config.id).forEach((id, user) => reaction.remove(user)));
                            let oldSkin = MESSAGES[r.message.id].currentSkin;
                            MESSAGES[r.message.id].currentSkin = Math.min(Math.max(MESSAGES[r.message.id].currentSkin + (r.emoji.name === '⬅️' ? -1 : 1), 0), MESSAGES[r.message.id].skins.length - 1);
                            if (oldSkin == MESSAGES[r.message.id].currentSkin) break;
                            let currentSkin = MESSAGES[r.message.id].skins[MESSAGES[r.message.id].currentSkin];
                            MESSAGES[r.message.id].embed.fields[0].value = MESSAGES[r.message.id].skins.map(lskin => lskin.title === currentSkin.title ? "**" + lskin.title + "**" : lskin.title).join("\n");
                            MESSAGES[r.message.id].embed.setTitle(`**${MESSAGES[r.message.id].name}** (${currentSkin.title})`).setThumbnail(currentSkin.chibi).setImage(currentSkin.image);
                            MESSAGES[r.message.id].message.edit(MESSAGES[r.message.id].embed);
                            break;
                    }
                });
                collector.on('end', r => {
                    message.delete();
                });
            }
        }); // Pages
    } catch (err) {
        console.log(`ship subcommand, err code = ${err.statusCode}, err message = ${err.message}, args = ${args}`);
        msg.channel.send("Invalid ship name/skin name.");
    }
}

function findExactShip(name) {
    return SHIPS.find(ship => ship.name.toUpperCase() === name.toUpperCase());
}

function findShip(name) {
    return SHIPS.find(ship => ship.name.toUpperCase().includes(name.toUpperCase()));
}

function getShipByName(name) {
    return new Promise((resolve, reject) => {
        let cacheShip = findExactShip(name);
        if (!cacheShip) cacheShip = findShip(name);
        if (cacheShip) {
            if (SHIPS_CACHE.hasOwnProperty(cacheShip.id)) {
                console.log("Found it in cache. Serving Cache Content");
                resolve(SHIPS_CACHE[cacheShip.id]);
                return;
            }
            request({
                url: "https://azurlane.koumakan.jp/" + cacheShip.name,
                headers: headers
            }, (error, res, body) => {
                if (error) reject(error);
                const doc = new JSDOM(body).window.document;
                const arts = doc.querySelector("#Art tbody").getElementsByTagName("a");
                const art_images = doc.querySelector("#Art tbody").getElementsByTagName("img");
                const tabs = doc.querySelectorAll(".azl_box_body .tabber .tabbertab");
                let ship = {
                    wikiUrl: "https://azurlane.koumakan.jp/" + cacheShip.name.replace(/ +/g, "_"),
                    id: cacheShip.id,
                    names: {
                        en: cacheShip.name,
                        cn: doc.querySelector('[lang="zh"]').textContent,
                        jp: doc.querySelector('[lang="ja"]').textContent,
                        kr: doc.querySelector('[lang="ko"]') ? doc.querySelector('[lang="ko"]').textContent : doc.querySelector('[lang="zh"]').textContent
                    },
                    thumbnail: "https://azurlane.koumakan.jp" + doc.querySelector("div:nth-child(1) div:nth-child(2) .image img").getAttribute("src"),
                    skins: tabs.length > 1 ? Array.from(tabs).map((skinTab, i) => {
                        return {
                            title: skinTab.getAttribute("title"),
                            image: "https://azurlane.koumakan.jp" + skinTab.getElementsByTagName("img")[0].getAttribute("src"),
                            chibi: arts[i * 2 + 1] ? arts[i * 2 + 1].getAttribute("href") : "http://azurlane.koumakan.jp/w/images/thumb/4/4e/Cross.png/18px-Cross.png"
                        };
                    }) : [{
                        title: "Default",
                        image: "https://azurlane.koumakan.jp" + tabs[0].getElementsByTagName("img")[0].getAttribute("src"),
                        chibi: "https://azurlane.koumakan.jp" + art_images[1].getAttribute("src")
                    }],
                    buildTime: doc.querySelector("tr:nth-child(1) > td:nth-child(2) > a").textContent,
                    rarity: cacheShip.rarity,
                    stars: doc.querySelector("div:nth-child(1) > div:nth-child(3) > .wikitable:nth-child(1) tr:nth-child(2) > td").textContent.trim(),
                    class: doc.querySelector("div:nth-child(3) > .wikitable tr:nth-child(3) > td:nth-child(2) > a").textContent,
                    nationality: cacheShip.nationality,
                    hullType: doc.querySelector(".wikitable tr:nth-child(3) a:nth-child(2)").textContent,
                    stats: Object.values(doc.querySelectorAll(".tabbertab:nth-child(1) > .wikitable tbody td")).map(cell => cell.textContent.trim()),
                    author: doc.querySelector(".nomobile:nth-child(1) tr:nth-child(2) a").textContent,
                };
                console.log(`Ship Loaded: ${JSON.stringify(ship)}`);
                SHIPS_CACHE[cacheShip.id] = ship;
                resolve(ship);
            });
        } else {
            reject(Error("There is no such ship."))
        };
    });
}

exports.getShipByName = getShipByName;
exports.initiate = function() {
    return new Promise((resolve, reject) => {
        request({
            url: "https://azurlane.koumakan.jp/List_of_Ships",
            headers: headers
        }, (error, res, body) => {
            const doc = new JSDOM(body).window.document;
            let table_ships = doc.querySelectorAll("#mw-content-text .mw-parser-output table tbody tr");
            table_ships.forEach(table_ship => {
                let columns = table_ship.childNodes;
                SHIPS.push({
                    id: columns[0].textContent,
                    name: columns[1].textContent,
                    rarity: columns[2].textContent,
                    type: columns[3].textContent,
                    nationality: columns[4].textContent
                });
            });
            console.log("Loaded " + SHIPS.length + " Ships");
            resolve(SHIPS);
        });
    });
}
