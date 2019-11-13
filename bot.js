const Discord = require('discord.js');
const request = require('request');
const moment = require('moment');
const client = new Discord.Client();
const prefix = process.env.PREFIX;

const PING_EMBED = new Discord.RichEmbed().setTitle("機器雲的延時").setColor(0x21f8ff).addField("Latency", 0).addField("Discord API Latency", 0);

console.log('APP STARTING...');

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    console.log(`Bot has started, with ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} guilds.`);
    client.user.setPresence({
        game: {
            name: 'ZY\'s Bot'
        },
        status: 'idle'
    });
});

client.on('message', async msg => {
    if (!msg.channel.type === "text") return;
    if (!msg.guild) return;
    if (msg.content.indexOf(prefix) !== 0) return;
    const args = msg.content.slice(1).trim().split(/ +/g);
    const command = args.shift().toLowerCase();
    if (msg.channel.id === "642988383626592286" || msg.channel.id === "642993162943725568") {
        if (command === "ping") {
            msg.delete();
            console.log(`${msg.author.username} requested a ping!`);
            const m = await msg.channel.send("Ping?");
            PING_EMBED.fields[0].value = m.createdTimestamp - msg.createdTimestamp;
            PING_EMBED.fields[1].value = Math.round(client.ping);
            PING_EMBED.setFooter("Requested By " + msg.author.username, msg.author.displayAvatarURL);
            m.edit(PING_EMBED);
        }
        if (command === "test") {
            msg.channel.send("TESTING COMMAND.  Arguments: " + args.join(", "));
            console.log(`${msg.author.username} requested test!`);
            msg.delete();
        }
        if (command === "pokemon") {
            request("https://pokeapi.co/api/v2/" + encodeURIComponent(args.join(" ")), function(error, response, body) {
                console.log('error:', error); // Print the error if one occurred
                console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
                console.log('body:', body); // Print the HTML for the Google homepage.
            });
        }
    }
});

client.login(process.env.TOKEN);
