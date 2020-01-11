// Required dependencies
const Discord = require('discord.js');
const config = require('./config.js').config;
const coursemology = require('./coursemology.js');
const azurlane = require('./azurlane.js');
const music = require('./music.js');
const waifulabs = require('./waifulabs.js');

// Constants
const PREFIX = process.env.PREFIX || "!";
const client = new Discord.Client();

// Embed Presets
const PING_EMBED = new Discord.RichEmbed().setTitle("Ping Results").setColor(0x21f8ff).addField("Latency", 0).addField("Discord API Latency", 0);
const HELP_EMBED = new Discord.RichEmbed().setTitle("Help").setColor(0x21f8ff)
    .addField(`${PREFIX}ping`, "Get the bot's ping")
    .addField(`${PREFIX}azurlane [ship name]`, "Access data from Azur Lane")
    .addField(`${PREFIX}azurlane finds [name/? =/? data]+`, "Query for ships")
    .addField(`${PREFIX}coursemology`, `Access Coursemology.\nUsage: \`${PREFIX}coursemology (info|list|leaderboard|listusers|user) [args]\``)
    .addField(`${PREFIX}sleep`, "Tell you whether or not you should sleep.")

console.log('====== ZY Discord Bot Started! ======');

// coursemology.initiate();
client.on('ready', () => {
    console.log("=> Bot Running in " + client.guilds.keyArray().length + " servers!");
    client.guilds.get('665471208757657620').channels.get('665471209277882400').send("READY!");
    client.user.setPresence(config.PRESENCE);
    setInterval(coursemology.update, 60000);
    config.HOOK = new Discord.WebhookClient('644427303719403521', process.env.HKTOKEN);
    config.id = client.user.id;
});

client.on('message', async msg => {
    let startTime = Date.now();
    console.log(`=> Message "${msg.content}" received from ${msg.author.tag}.`);
    if (!msg.channel.type === "text") return;
    if (!msg.guild && msg.author.id !== "456001047756800000") return;
    if (msg.author.id === config.id) return;
    let matcher = msg.content.replace(/[^\w ]+/g, '').trim().toLowerCase()
    if (config.SIMPLE_REPLIES[matcher])
        return msg.channel.send(config.SIMPLE_REPLIES[matcher]);
    for (let key of Object.keys(config.CONTAINS_REPLIES))
        if (msg.content.includes(key)) return msg.channel.send(config.CONTAINS_REPLIES[key]);
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
    if (command === "azurlane" || command === "al" || command === "azur" || command === "az") azurlane.handleCommand(args, msg, PREFIX);
    if (command === "music" || command === "am" || command === "m" || command === "song" || command === "!play") music.handleCommand(args, msg, PREFIX);
    if (command === "waifulabs" || command === "wl" || command === "waifu") waifulabs.newBatch(msg);
    if (msg.author.id === "456001047756800000" && (command === "toggledebug" || command === "td")) {
        config.debug = !config.debug;
        console.log("DEBUG TOGGLED, debug = " + config.debug)
        msg.channel.send(`DEBUG: debug output has been turned ${config.debug?"on":"off"}!`);
    }
    if (command === "shouldisleep" || command === "sleep" || command === "sis" || command === "zzz") {
        var currentHour = (new Date().getHours() + 8) % 24;
        console.log("current hour = " + currentHour);
        if (currentHour < 6 || currentHour > 21) {
            let preset = config.SLEEP_MESSAGES[Math.floor(Math.random() * config.SLEEP_MESSAGES.length)];
            let embed = new Discord.RichEmbed().setTitle(preset.title.replace("${username}", msg.author.username)).setColor(0x21f8ff);
            embed.setDescription(preset.body.replace("${username}", msg.author.username));
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
    console.log("====== Message Processed, Elapsed time = " + (Date.now() - startTime) + "ms\n");
});

client.once('reconnecting', () => {
    console.log('Reconnecting!');
});
client.once('disconnect', () => {
    console.log('Disconnect!');
});

client.login(process.env.TOKEN);
