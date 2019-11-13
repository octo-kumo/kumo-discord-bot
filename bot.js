const Discord = require('discord.js');
const request = require('request');
const moment = require('moment');
const client = new Discord.Client();
const prefix = process.env.PREFIX;
const USERTOKEN = process.env.CMTOKEN;
const j = request.jar();
const cookie = request.cookie('remember_user_token=' + USERTOKEN);
j.setCookie(cookie, "https://nushigh.coursemology.org");

const PING_EMBED = new Discord.RichEmbed().setTitle("機器雲的延時").setColor(0x21f8ff).addField("Latency", 0).addField("Discord API Latency", 0);
const CM_QUERY_EMBED = new Discord.RichEmbed().setTitle("Coursemology Query").setDescription("Coursemology Query Details").setColor(0x00bcd4).addField("Course", "null").addField("Assessments", "null").addField("Submission", "null");

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
    console.log("Command " + command + " | Args [" + args.join(", ") + "] | Owner " + msg.author.username);
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
        if (command === "coursemology") {
            if (args.length != 3) return msg.channel.send("Please include 3 parameters!");
            for (var a = 0; a < 3; a++) CM_QUERY_EMBED.fields[a].value = args[a];
            msg.channel.send(CM_QUERY_EMBED);
            request({
                url: "https://nushigh.coursemology.org/courses/" + args[0] + "/assessments/" + args[1] + "/submissions/" + args[2] + "/edit?format=json",
                jar: j
            }, function(error, response, body) {
                console.log(body);
                if (error || response.statusCode == 404) {
                    msg.channel.send("Coursemology Query Failed!");
                } else {
                    body = body.JSON.parse(body);
                    let a = body.assessment;
                    let embed = new Discord.RichEmbed().setTitle(a.title);
                    embed.setDescription(a.description);
                    embed.addField("Auto Graded", a.autograded);
                    embed.addField("Skippable", a.skippable);
                    embed.addField("Password Protected", a.passwordProtected);
                    embed.addField("Number of Questions", a.questionIds.length);
                    for (var i = 0; i < a.files.length; i++) {
                        embed.attachFile(a.files[i].url);
                    }
                    embed.setFooter("Requested By " + msg.author.username, msg.author.displayAvatarURL);
                    msg.channel.send(embed);
                }
            });
        }
    }
});
client.login(process.env.TOKEN);
