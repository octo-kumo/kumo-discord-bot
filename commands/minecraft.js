const minecraft = require('minecraft-api');
const Discord = require('discord.js');
const fetch = require('node-fetch');

exports.handleCommand = function (args, msg, PREFIX) {
    if (args.length < 1) return msg.reply(`Correct usage: \n\`${PREFIX}minecraft user? [user-name]\` check profile\n\`${PREFIX}minecraft server [ip]\` check server status`)
    switch (args[0]) {
        case 'server':
            args.shift();
            fetch("https://api.minetools.eu/ping/" + args.join(' ').replace('\:', '/'))
                .then(res => res.json())
                .then((response) => {
                    msg.channel.send(generateServerEmbed(response, msg, args.join(' ')));
                }).catch((error) => {
                msg.reply("Is the server dead?");
                console.error(error);
            });
            break;
        case 'user':
            args.shift();
        default:
            minecraft.uuidForName(args.join(' '))
                .then(uuid => fetch("https://api.minetools.eu/profile/" + uuid))
                .then(res => res.json())
                .then(profile => {
                    if (profile.decoded) {
                        let embed = new Discord.MessageEmbed();
                        embed.setColor(hashStringToColor(profile.decoded.profileId));
                        embed.setAuthor("User Info");
                        embed.setThumbnail(`https://minotar.net/helm/${profile.decoded.profileName}/256.png`);
                        embed.addField("Name", profile.decoded.profileName);
                        embed.addField("UUID", '`' + profile.decoded.profileId + '`');
                        msg.channel.send(embed);
                    } else msg.reply("Who is that?");
                });
    }
}

function generateServerEmbed(server, msg, address) {
    let embed = new Discord.MessageEmbed();
    embed.setTitle(address.toLowerCase());
    embed.addField("Ping", server.latency, true);
    embed.addField("Version", `${server.version.name} (${server.version.protocol})`, true);
    embed.addField("Players", `**${server.players.online} / ${server.players.max}**${server.players.sample.length > 0 ? `\n\`\`\`\n${server.players.sample.map(player => player.name).join("\n")}\n\`\`\`` : ''}`);
    embed.setDescription('```\n' + server.description.replace(/\u00a7./g, '').trimEnd() + '\n```');
    embed.setColor(hashStringToColor(address));
    embed.setFooter("Query by " + msg.author.tag, msg.author.avatarURL);
    embed.setThumbnail(server.favicon ? "https://api.minetools.eu/favicon/" + address.replace(':', '/') : "https://res.cloudinary.com/chatboxzy/image/upload/v1598103075/unknown_server.png");
    return embed;
}

function djb2(str) {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) hash = ((hash << 5) + hash) + str.charCodeAt(i);
    return hash;
}

function hashStringToColor(str) {
    const hash = djb2(str);
    return hash & 0xFFFFFF;
}