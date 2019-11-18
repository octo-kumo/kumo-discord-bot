const {
    AzurLane,
    Category
} = require("azurlane");
const azurlane = new AzurLane();
const Discord = require('discord.js');
const config = require('./config.js').config;

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
                let embed = new Discord.RichEmbed().setTitle(ship.names[lang]);
                embed.setThumbnail(ship.thumbnail);
                embed.setURL(ship.wikiUrl);
                embed.addField("ID", ship.id, true)
                    .addField("**Stars**", ship.stars.value, true)
                    .addField("**Rarity**", ship.rarity, true)
                    .addField("**Type**", ship.hullType, true)
                    .addField("**Class**", ship.class, true)
                    .addField("**Nationalit**", ship.nationality, true)
                    .addField("Health", ship.stats.base[0].value)
                    .addField("Armor", ship.stats.base[1].value)
                    .addField("Reload", ship.stats.base[2].value)
                    .addField("Luck", ship.stats.base[3].value)
                    .addField("Firepower", ship.stats.base[4].value)
                    .addField("Evasion", ship.stats.base[6].value)
                    .addField("Anti-air", ship.stats.base[8].value)
                    .addField("Aviation", ship.stats.base[9].value)
                    .addField("Oil Usage", ship.stats.base[10].value)
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
