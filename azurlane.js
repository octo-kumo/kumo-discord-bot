const {
    AzurLane,
    Category
} = require("azurlane");
const azurlane = new AzurLane();
const Discord = require('discord.js');
const config = require('./config.js').config;

const COLOR = {
    "Normal": 0xdcdcdc,
    "Rare": 0xb0e0e6,
    "Elite": 0xdda0dd,
    "Super Rare": 0xeee8aa,
    "Priority": 0xeee8aa,
    "Unreleased": 0x000000,
    "Decisive": 0xffffff
};
const DATA = {};

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
                const ship = await azurlane.getShipByName(args.join(" "));
                let embed = new Discord.RichEmbed().setTitle(`**${ship.names[lang]}**`).setColor(COLOR[ship.rarity]).setThumbnail(ship.thumbnail).setURL(ship.wikiUrl);
                let stats = ship.stats.level120;
                embed.addField("**ID**", (ship.id) ? ship.id : "**not yet decided**", true)
                    .addField("**Stars**", ship.stars.value, true)
                    .addField("**Rarity**", ship.rarity, true)
                    .addField("**Type**", ship.hullType, true)
                    .addField("**Class**", ship.class, true)
                    .addField("**Nationality**", ship.nationality, true)
                    .addField("❤️ Health", stats[0].value, true)
                    .addField("🛡 Armor", stats[1].value, true)
                    .addField("🔧 Reload", stats[2].value, true)
                    .addField("💚 Luck", stats[3].value, true)
                    .addField("⚔️ Firepower", stats[4].value, true)
                    .addField("🦋 Evasion", stats[6].value, true)
                    .addField("🚀 Speed", stats[7].value, true)
                    .addField("✈️ Anti-air", stats[8].value, true)
                    .addField("☁️ Aviation", stats[9].value, true)
                    .addField("🛢️ Oil Usage", stats[10].value, true)
                    .addField("🎯 Accuracy", stats[11].value, true)
                    .addField("🌊 Anti-Submarine Warfare", stats[12].value)
                    .addField("📝 Designed by", ship.miscellaneous.artist.name)
                    .addField("📎 Avaliable Skins", ship.skins.map(skin => skin.title).join("\n"));
                embed.setDescription("_All stats shown below are lv120 stats._");
                msg.channel.send(embed);
            } catch (err) {
                console.log(`ship subcommand, err code = ${err.statusCode}, err message = ${err.message}, args = ${args}`);
                msg.channel.send("Invalid ship name.");
            }
            break;
        case "viewskin":
        case "skin":
        case "sk":
        case "vs":
            if (args.length < 1) return msg.channel.send("Correct Usage: `" + PREFIX + "azurlane skin ship-name|skin-name`");
            try {
                let newArgs = args.join(" ").split(/ *\| */g);
                if (newArgs.length == 1) newArgs = [newArgs[0], "Default"];
                const ship = await azurlane.getShipByName(newArgs[0]);
                let skin = ship.skins.filter(skin => skin.title.toUpperCase().includes(newArgs[1].toUpperCase()))[0];
                let embed = new Discord.RichEmbed().setTitle(`**${ship.names[lang]}** (${skin.title})`).setColor(COLOR[ship.rarity]).setThumbnail(skin.chibi).setURL(ship.wikiUrl);
                embed.addField("Avaliable Skins", ship.skins.map(lskin => lskin.title === skin.title ? "**" + lskin.title + "**" : lskin.title).join("\n"));
                embed.setImage(skin.image);
                msg.channel.send(embed);
            } catch (err) {
                console.log(`ship subcommand, err code = ${err.statusCode}, err message = ${err.message}, args = ${args}`);
                msg.channel.send("Invalid ship name/skin name.");
            }
            break;
    }
}
