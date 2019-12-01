const Discord = require('discord.js');
const config = require('./config.js').config;
const SHIP_LIST = require('./ship_list.json');
const SHIPS = require('./ships.json');

const filter = (reaction, user) => ['⬅️', '❎', '➡️'].includes(reaction.emoji.name) && user.id !== config.id;
const filter2 = (reaction, user) => ['👕'].includes(reaction.emoji.name) && user.id !== config.id;

const COLOR = {
    "Normal": 0xdcdcdc,
    "Rare": 0xb0e0e6,
    "Elite": 0xdda0dd,
    "Super Rare": 0xeee8aa,
    "Ultra Rare": 0xeee8aa,
    "Priority": 0xeee8aa,
    "Unreleased": 0x000000,
    "Decisive": 0xffffff
};

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
                const ship = getShipByName(args.join(" "));
                let embed = new Discord.RichEmbed().setTitle(`**${ship.names[lang]}**`).setColor(COLOR[ship.rarity]).setThumbnail("https://images.weserv.nl/?url=" + ship.thumbnail).setImage("https://images.weserv.nl/?url=" + ship.skins[0].image).setURL(ship.wikiUrl);
                let stats = ship.stats["Level 120"];
                embed.addField("**ID**", (ship.id) ? ship.id : "**not yet decided**", true)
                    .addField("**Stars**", ship.stars.stars, true)
                    .addField("**Rarity**", "**" + ship.rarity + "**", true)
                    .addField("**Type**", ship.hullType, true)
                    .addField("**Class**", ship.class, true)
                    .addField("**Nationality**", ship.nationality, true);
                Object.keys(stats).forEach(key => {
                    if (stats[key] && stats[key] !== "0")
                        embed.addField(`**${key}**`, key === "Hunting range" ? "```" + stats[key].map(row => row.map(cell => cell ? cell : " ").join(" ")).join("\n") + "```" : stats[key], true);
                });
                if (ship.misc.artist) embed.addField("📝 Designed by", ship.misc.artist);
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
        const ship = getShipByName(newArgs[0]);
        let skin = ship.skins.filter(skin => skin.name.toUpperCase().includes(newArgs[1].toUpperCase()))[0];
        let embed = new Discord.RichEmbed().setTitle(`**${ship.names[lang]}** (${skin.name})`).setColor(COLOR[ship.rarity]).setThumbnail("https://images.weserv.nl/?url=" + skin.chibi).setURL(ship.wikiUrl);
        embed.addField("Avaliable Skins", ship.skins.map(lskin => lskin.name === skin.name ? "**" + lskin.name + "**" : lskin.name).join("\n"));
        embed.setImage("https://images.weserv.nl/?url=" + skin.image);
        msg.channel.send(embed).then(message => {
            if (ship.skins.length > 1) {
                message.react('⬅️').then(() => message.react('❎')).then(() => message.react('➡️'));
                MESSAGES[message.id] = {
                    name: ship.names[lang],
                    skins: ship.skins,
                    embed: embed,
                    currentSkin: ship.skins.findIndex(lskin => lskin.name === skin.name),
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
                            MESSAGES[r.message.id].embed.fields[0].value = MESSAGES[r.message.id].skins.map(lskin => lskin.name === currentSkin.name ? "**" + lskin.name + "**" : lskin.name).join("\n");
                            MESSAGES[r.message.id].embed.setTitle(`**${MESSAGES[r.message.id].name}** (${currentSkin.name})`).setThumbnail("https://images.weserv.nl/?url=" + currentSkin.chibi).setImage("https://images.weserv.nl/?url=" + currentSkin.image);
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
    return SHIP_LIST.find(ship => ship.name.toUpperCase() === name.toUpperCase());
}

function findShip(name) {
    return SHIP_LIST.find(ship => ship.name.toUpperCase().includes(name.toUpperCase()));
}

function getShipByName(name) {
    let cacheShip = findExactShip(name);
    if (!cacheShip) cacheShip = findShip(name);
    if (cacheShip) return SHIPS[cacheShip.id];
    else return null;
}
