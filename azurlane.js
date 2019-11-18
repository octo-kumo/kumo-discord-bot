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
    "Unreleased": 0x000000
}

exports.handleCommnd = async function(args, msg, PREFIX) {
    console.log("running azurlane sub-system...");
    if (args.length < 1) return msg.channel.send("Correct Usage: `" + PREFIX + "azurlane (ship|ships) [args]`");
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
                const ship = await azurlane.getShipByName(args.join(" "));
                let embed = new Discord.RichEmbed().setTitle(`**${ship.names[lang]}**`).setColor(COLOR[ship.rarity]).setThumbnail(ship.thumbnail).setURL(ship.wikiUrl);
                embed.addField("**ID**", ship.id, true)
                    .addField("**Stars**", ship.stars.value, true)
                    .addField("**Rarity**", ship.rarity, true)
                    .addField("**Type**", ship.hullType, true)
                    .addField("**Class**", ship.class, true)
                    .addField("**Nationality**", ship.nationality, true)
                    .addField("Health", ship.stats.base[0].value, true)
                    .addField("Armor", ship.stats.base[1].value, true)
                    .addField("Reload", ship.stats.base[2].value, true)
                    .addField("Luck", ship.stats.base[3].value, true)
                    .addField("Firepower", ship.stats.base[4].value, true)
                    .addField("Evasion", ship.stats.base[6].value, true)
                    .addField("Anti-air", ship.stats.base[8].value, true)
                    .addField("Aviation", ship.stats.base[9].value, true)
                    .addField("Oil Usage", ship.stats.base[10].value, true)
                    .addField("Designed by", ship.miscellaneous.artist.name)
                    .addField("Avaliable Skins", ship.skins.map(skin => skin.title).join("\n"));
                embed.setDescription("All stats shown are base stats");
                msg.channel.send(embed);
            } catch (err) {
                console.log(`ship subcommand, err code = ${err.statusCode}, args = ${args}`);
                msg.channel.send("Invalid ship name.");
            }
            break;
        case "ships":
        case "ss":
        case "ls":
        case "fs":
            break;
        case "viewskin":
        case "skin":
        case "sk":
        case "vs":
            break;
    }
}
