// Required dependencies
const Discord = require('discord.js');
const request = require('request');
const parse = require('node-html-parser').parse;
const config = require('./config.js').config;
const coursemology = require('./coursemology.js');

// Constants
const PREFIX = process.env.PREFIX;
const client = new Discord.Client();

// Embed Presets
const PING_EMBED = new Discord.RichEmbed().setTitle("Ping Results").setColor(0x21f8ff).addField("Latency", 0).addField("Discord API Latency", 0);
const HELP_EMBED = new Discord.RichEmbed().setTitle("Help").setColor(0x21f8ff)
    .addField(`${PREFIX}ping`, "Get the bot's ping")
    .addField(`${PREFIX}toggledebug`, "Toggle Debug Messages")
    .addField(`${PREFIX}coursemology`, `Access Coursemology.\nUsage: \`${PREFIX}coursemology (info|list|leaderboard|listusers|user) [args]\``);

console.log('====== ZY Discord Bot Started! ======');

client.on('ready', () => {
    console.log("=> Bot Running!");
    client.user.setPresence(config.PRESENCE);
    setInterval(coursemology.update, 10000);

    config.HOOK = new Discord.WebhookClient('644427303719403521', process.env.HKTOKEN);
    let jar = request.jar();
    jar.setCookie(request.cookie('remember_user_token=' + process.env.CMTOKEN), config.query_base_url);
    config.JAR = jar;
    config.id = client.user.id;
});

client.on('message', async msg => {
    let startTime = Date.now();
    console.log(`=> Message "${msg.content}" received from ${msg.author.tag}.`);
    if (!msg.channel.type === "text") return;
    if (!msg.guild) return;
    if (msg.content.indexOf(PREFIX) !== 0) return;
    console.log(`====== Message is a valid command.`);
    let args = msg.content.slice(1).trim().split(/ +/g);
    const command = args.shift().toLowerCase();
    console.log(`running "${command}", args = [${args.join(", ")}]...`);

    if (command === "help") msg.channel.send(HELP_EMBED);
    if (command === "ping") {
        const m = await msg.channel.send("Ping?");
        PING_EMBED.fields[0].value = m.createdTimestamp - msg.createdTimestamp;
        PING_EMBED.fields[1].value = Math.round(client.ping);
        PING_EMBED.setFooter("Requested By " + msg.author.username, msg.author.displayAvatarURL);
        console.log(` ping results obtained. lat = ${m.createdTimestamp - msg.createdTimestamp}, discord lat = ${Math.round(client.ping)}`);
        m.edit(PING_EMBED);
    }
    if (command === "coursemology" || command === "cm") coursemology.handleCommand(args, msg, PREFIX);
    if (command === "toggledebug" || command === "td") {
        config.debug = !config.debug;
        console.log("DEBUG TOGGLED, debug = " + config.debug)
        msg.channel.send(`DEBUG: debug output has been turned ${config.debug?"on":"off"}!`);
    }
    if (command === "shouldisleep" || command === "sleep" || command === "sis" || command === "zzz") {
        var currentHour = (new Date().getHours() + 8) % 24;
        console.log("current hour = " + currentHour);
        if (currentHour < 6 || currentHour > 21) {
            let embed = new Discord.RichEmbed().setTitle("You should go to **sleep**!").setColor(0x21f8ff);
            embed.setDescription("It is so late right now, better go and sleep **" + msg.author.username + "**");
            if (currentHour < 6 && currentHour > 2) embed.setThumbnail(config.SLEEP_LATE[Math.floor(Math.random() * config.SLEEP_LATE.length)]);
            else embed.setThumbnail(config.SLEEP_IMAGES[Math.floor(Math.random() * config.SLEEP_IMAGES.length)]);
            msg.channel.send(embed);
            console.log("told " + msg.author.username + " to to goto sleep");
        } else {
            let embed = new Discord.RichEmbed().setTitle("Get some **coffee**!").setColor(0x6f4e37);
            embed.setDescription("There is so much to do, better go get a cup of coffee **" + msg.author.username + "**");
            embed.setThumbnail("https://res.cloudinary.com/chatboxzy/image/upload/v1573747645/coffee.png");
            msg.channel.send(embed);
            console.log("told " + msg.author.username + " to not to goto sleep");
        }
    }
    if (msg.author.id === "456001047756800000" && (command === "changebase" || command === "cb")) {
        config.query_base_url = args[0];
        console.log("Base Changed, query_base_url = " + config.query_base_url)
        msg.channel.send("Base URL changed to " + config.query_base_url);
    }
    console.log("====== Message Processed, Elapsed time = " + (Date.now() - startTime) + "ms\n");
});



client.login(process.env.TOKEN);
