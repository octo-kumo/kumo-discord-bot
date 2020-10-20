// Required dependencies
const Discord = require('discord.js');
const config = require('./commands/config.js').config;
// const coursemology = require('./coursemology.js');
const eco = require('./commands/eco.js');
const bilibili = require('./commands/bilibili.js');
const covid = require('./commands/covid.js');
const azurlane = require('./commands/azurlane.js');
const gomoku = require('./commands/gomoku.js');
const minecraft = require('./commands/minecraft.js');
const music = require('./commands/music.js');
const inspire = require('./commands/inspire.js');
const waifulabs = require('./commands/waifulabs.js');
const timetable = require('./commands/timetable.js');
const anime = require('./commands/anime.js');
const minesweeper = require('./commands/minesweeper.js');
const solve24 = require('./commands/solver24.js').solve24;
const game24 = require('./commands/24.js');

const db = require('./db');

// Constants
const PREFIX = process.env.PREFIX || "!";
const client = new Discord.Client();

// Embed Presets
const PING_EMBED = new Discord.RichEmbed().setTitle("Ping Results").setColor(0x21f8ff).addField("Latency", 0).addField("API Latency", 0);
const HELP_EMBED = new Discord.RichEmbed().setTitle("Help").setColor(0x21f8ff).setDescription("```\n" + Object.keys(config.HELP).join(" ") + "\n```").setFooter(`Get more help with \`${PREFIX}help [command]\``);
chainUpStdOut();
console.log('====== ZY Discord Bot Started! ======');

// coursemology.initiate();
client.on('ready', () => {
    console.log("=> Bot Running in " + client.guilds.keyArray().length + " servers!");
    client.guilds.get('665471208757657620').channels.get('665471209277882400').send("READY!");
    client.user.setPresence(config.PRESENCE).then(r => console.log("Presence Set!"));
    config.offset = 8 + new Date().getTimezoneOffset() / 60;
    config.HOOK = new Discord.WebhookClient('644427303719403521', process.env.HKTOKEN);
    config.HOOK2 = new Discord.WebhookClient('676309488021798912', process.env.HKTOKEN2);
    config.id = client.user.id;
    azurlane.init().then(r => console.log("Azurlane Init!"));
    bilibili.init().then(r => console.log("Bilibili Init!"));
    // coursemology.init();
    // setInterval(() => coursemology.update(config.DEFAULT_COURSE), 20000);
    const covidChannel = client.guilds.get('642273802520231936').channels.get('693051246885470209');
    if (!process.env.LOCAL) {
        covid.update(covidChannel);
        setInterval(() => covid.update(covidChannel), 60 * 60 * 1000);
    }
});

const OWO_24_MESSAGE_REGEX = /\*\*Ok <@!?\d+>, your numbers are: `(\d \d \d \d)` \*\*/g;

client.on('message', async msg => {
    let startTime = Date.now();
    console.log(`=> Message "${msg.content.replace('\n', '\\n').substring(0, 80) + (msg.content.length > 80 ? "..." : "")}" received from ${msg.author.tag}.`);
    if (msg.channel.type !== "text") return;
    if (!msg.guild && msg.author.id !== "456001047756800000") return; // Direct message from myself only
    if (msg.author.id === config.id) return; // Dont respond to bot's own messages
    if (msg.channel.id === "720891248352952341" && !process.env.LOCAL) return; // skip if not testing locally

    let matcher = msg.content.replace(/[^\w ]+/g, '').trim().toLowerCase()
    if (msg.guild && msg.guild.id !== "642273802520231936" && Math.random() > .999) {
        if (config.SIMPLE_REPLIES[matcher])
            return msg.channel.send(config.SIMPLE_REPLIES[matcher]);
        for (let key of Object.keys(config.CONTAINS_REPLIES))
            if (msg.content.includes(key)) return msg.channel.send(config.CONTAINS_REPLIES[key]);
    }
    if (msg.author.id === "289066747443675143" && OWO_24_MESSAGE_REGEX.test(msg.content)) { // owo bot
        let processed = msg.content.replace(OWO_24_MESSAGE_REGEX, '$1');
        solve24(processed, client);
        console.log("Solving for 24 " + processed);
    }
    if (minesweeper.directControl(msg)) return; // ah yes first direct control command
    if (gomoku.directControl(msg)) return;
    if (await game24.directControl(msg)) return;
    if (msg.content.indexOf(PREFIX) !== 0) return;
    console.log(`====== Message is a valid command.`);
    let args = msg.content.slice(1).trim().split(/\s+/g);
    const command = args.shift().toLowerCase();
    console.log(`running "${command}", args = [${args.join(", ")}]...`);
    if (command === "help") {
        if (args.length === 0) await msg.channel.send(HELP_EMBED);
        else {
            args[0] = args[0].toLowerCase();
            if (config.HELP.hasOwnProperty(args[0])) await msg.channel.send("**Help for command `" + args[0] + "`**\n" + config.HELP[args[0]]);
            else await msg.channel.send("Is there help for command `" + args[0] + "`?\nNo, you are dumb.");
        }
    }
    if (command === "ping") {
        const m = await msg.channel.send("Ping?");
        PING_EMBED.fields[0].value = `${m.createdTimestamp - msg.createdTimestamp}ms`;
        PING_EMBED.fields[1].value = `${Math.round(client.ping)}ms`;
        PING_EMBED.setFooter("Requested By " + msg.author.username, msg.author.displayAvatarURL);
        console.log(` ping results obtained. lat = ${m.createdTimestamp - msg.createdTimestamp}, discord lat = ${Math.round(client.ping)}`);
        await m.edit(PING_EMBED);
    }

    // if (command === "coursemology" || command === "cm") coursemology.handleCommand(args, msg);
    if (command === "list-emotes" || command === "emotes") {
        await sendLongMessage(msg.channel, "**Emotes:**\n" + join(msg.guild.emojis.array().map(e => `<:${e.name}:${e.id}> \`:${e.name}:\``), [" ", " ", "\n"]));
    }
    if (command === "horny") {
        let words = ['no', 'stop', 'dude', 'literally', 'like', 'seriously', 'fuck'];
        shuffle(words);
        await msg.reply(words.join(' '));
    }
    if (command === "pop" || command === "bubble" || command === "bubbles" || command === "bubble-pop") {
        sendBubblePop(msg, args);
    }
    if (command === "anime" || command === "a") await anime.handleCommand(args, msg, PREFIX);
    if (command === "bilibili" || command === "b") await bilibili.handleCommand(args, msg, PREFIX);
    if (command === "ms" || command === "minesweeper") minesweeper.handleCommand(args, msg, PREFIX);
    if (command === "minecraft") minecraft.handleCommand(args, msg, PREFIX);
    if (command === "covid" || command === "coronavirus" || command === "corona" || command === "c") await covid.handleCommand(args, msg, PREFIX);
    if (command === "inspire") await inspire.handleCommand(args, msg, PREFIX);
    if (command === "azurlane" || command === "al" || command === "azur" || command === "az") await azurlane.handleCommand(args, msg, PREFIX);
    if (command === "music" || command === "am" || command === "m" || command === "song") await music.handleCommand(args, msg, PREFIX);
    if (command.startsWith("!")) {
        console.log("Double !!: end command = " + command.substring(1));
        await music.handleCommand([command.substring(1)].concat(args), msg, PREFIX);
    }
    if (command === "gomoku" || command === "g" || command === "tictactoe" || command === "ttt") gomoku.handleCommand(args, msg, PREFIX);
    if (command.startsWith("?")) {
        console.log("Chain !?: end command = " + command.substring(1));
        gomoku.handleCommand([command.substring(1)].concat(args), msg, PREFIX);
    }
    if (command === "24") game24.handleCommand(args, msg, PREFIX);
    if (command === "waifulabs") await waifulabs.newBatch(msg);
    if (command === "timetable" || command === "tt") timetable.handleCommand(args, msg, PREFIX);
    if (command === "sleep") {
        const currentHour = (new Date().getHours() + 8) % 24;
        console.log("current hour = " + currentHour);
        if (currentHour < 6 || currentHour > 21) {
            let preset = config.SLEEP_MESSAGES[Math.floor(Math.random() * config.SLEEP_MESSAGES.length)];
            let embed = new Discord.RichEmbed().setTitle(preset.title.replace("${username}", msg.author.username)).setColor(0x21f8ff);
            embed.setDescription(preset.body.replace("${username}", msg.author.username));
            if (currentHour < 6 && currentHour > 2) embed.setThumbnail(config.SLEEP_LATE[Math.floor(Math.random() * config.SLEEP_LATE.length)]);
            else embed.setThumbnail(config.SLEEP_IMAGES[Math.floor(Math.random() * config.SLEEP_IMAGES.length)]);
            await msg.channel.send(embed);
            console.log("told " + msg.author.username + " to to goto sleep");
        } else {
            let embed = new Discord.RichEmbed().setTitle("Get some **coffee**!").setColor(0x6f4e37);
            embed.setDescription("There is so much to do, better go get a cup of coffee **" + msg.author.username + "**");
            embed.setThumbnail("https://res.cloudinary.com/chatboxzy/image/upload/v1573747645/coffee.png");
            await msg.channel.send(embed);
            console.log("told " + msg.author.username + " to not to goto sleep");
        }
    }
    // ECO
    if (command === "daily") eco.daily(args, msg, PREFIX);
    if (command === "flip" || command === "coin" || command === "flipcoin") eco.flip_coin(!args, msg, PREFIX);
    if (command === "balance" || command === "bal") eco.balance(args, msg, PREFIX);


    if (command === "clear") msg.channel.bulkDelete(parseInt(args[0])).then(messages => msg.reply("Deleted " + messages.keyArray().length + " messages")).catch(console.error);
    if (msg.author.id === "456001047756800000" && command === "debug") {
        config.debug = !config.debug;
        console.log("DEBUG TOGGLED, debug = " + config.debug)
        await msg.channel.send(`DEBUG: debug output has been turned ${config.debug ? "on" : "off"}!`);
    }
    if (msg.author.id === "456001047756800000" && command === "restart") {
        console.log("Restarting program due to request from owner...");
        await msg.channel.send("Forcing a **Restart**...");
        process.exit(1);
    }
    console.log("====== Message Processed, Elapsed time = " + (Date.now() - startTime) + "ms\n");
});

client.on('reconnecting', () => console.debug('Reconnecting!'));
client.on('disconnect', () => console.debug('Disconnect!'));
client.on('guildCreate', guild => console.debug("Joined " + guild.id));
client.on('error', error => console.log("Error Occured " + error.message))
client.login(process.env.TOKEN).then(() => console.log("Logged In"));

function chainUpStdOut() {
    const hook = new Discord.WebhookClient('670179846005063681', 'UckNPFVsz2nJ4bUAMtPMq_z0jFL0d66YNaq-C3OhhvXEDtid1hBj4tAOp5WVM9hFYYYn');
    let str = [];
    let callback = (s) => {
        str.push(s);
        if (s.endsWith('\n')) {
            hook.send("`[" + new Date().toISOString() + "] " + str.join("") + "`").catch(() => null);
            str = [];
        }
    };
    process.stdout.write = (write => function (string, encoding, fd) {
        write.apply(process.stdout, arguments)
        callback(string, encoding, fd)
    })(process.stdout.write);
}

function join(parts, separators) {
    let str = "";
    for (let i = 0; i < parts.length; i++) {
        str += parts[i] + separators[i % separators.length];
    }
    if (str.length > 0) str = str.substring(0, str.length - 1);
    return str;
}

async function sendLongMessage(channel, msg, objects) {
    objects = objects || [];
    let messages = [];
    let buffer = [];
    let size = 0;
    msg.split("\n").forEach(line => {
        if (size + line.length >= 2000) {
            size = 0;
            messages.push(buffer.join("\n"));
            buffer = [];
        }
        buffer.push(line);
        size += line.length + 1;
    })
    messages.push(buffer.join("\n"));
    for (let i = 0; i < messages.length; i++) {
        if (messages[i].length > 2000) console.log("Died\n" + messages[i]);
        if (objects[i]) await objects[i].edit(messages[i]);
        else objects.push(await channel.send(messages[i]));
    }
    return objects;
}

function sendBubblePop(msg, args) {
    return msg.channel.send("||pop||||pop||||pop||||pop||||pop||||pop||||pop||||pop||||pop||||pop||||pop||\n".repeat(args[0] && !isNaN(args[0]) ? Math.min(24, Math.max(1, parseInt(args[0]))) : 8) + `Have fun, ${msg.author.username}! (๑•̀ㅂ•́)و`);
}


function shuffle(array) {
    let currentIndex = array.length, temporaryValue, randomIndex;
    while (0 !== currentIndex) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return array;
}