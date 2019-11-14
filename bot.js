// Required dependencies
const Discord = require('discord.js');
const request = require('request');
const parse = require('node-html-parser').parse;

// Constants
const COURSES = [1706];
const PREFIX = process.env.PREFIX;
const USERTOKEN = process.env.CMTOKEN;
const HOOK_TOKEN = process.env.HKTOKEN;
const HOOK = new Discord.WebhookClient('644427303719403521', HOOK_TOKEN);
const client = new Discord.Client();
const JAR = request.jar();

// Field Variables
let query_base_url = "https://nushigh.coursemology.org";
let debug = false;
let leaderboard_feed_channel;
let leaderboard = {};

JAR.setCookie(request.cookie('remember_user_token=' + USERTOKEN), query_base_url);

// Embed Presets
const PING_EMBED = new Discord.RichEmbed().setTitle("Ping Results").setColor(0x21f8ff).addField("Latency", 0).addField("Discord API Latency", 0);
const HELP_EMBED = new Discord.RichEmbed().setTitle("Help").setColor(0x21f8ff)
    .addField(`${PREFIX}ping`, "Get the bot's ping")
    .addField(`${PREFIX}toggledebug`, "Toggle Debug Messages")
    .addField(`${PREFIX}coursemology`, `Access Coursemology.\nCorrect Usage: \`${PREFIX}coursemology (info|list|leaderboard) [args]\``);

console.log('====== ZY Discord Bot Started! ======');

client.on('ready', () => {
    console.log("=> Bot Running!");
    leaderboard_feed_channel = client.channels.get("644412450183053323");
    client.user.setPresence({
        game: {
            name: 'with the clouds. !help'
        },
        status: 'idle'
    });
    setInterval(updateLB, 10000);
});

client.on('message', async msg => {
    let startTime = Date.now();
    console.log(`=> Message "${msg.content}" received from ${msg.author.tag}.`);

    if (!msg.channel.type === "text") return;
    //if (!msg.guild) return;
    if (msg.content.indexOf(PREFIX) !== 0) return;
    console.log(`====== Message is a valid command.`);

    let args = msg.content.slice(1).trim().split(/ +/g);
    const command = args.shift().toLowerCase();
    console.log(`    running "${command}", args = [${args.join(", ")}]...`);

    if (command === "help") msg.channel.send(HELP_EMBED);
    if (command === "ping") {
        const m = await msg.channel.send("Ping?");
        PING_EMBED.fields[0].value = m.createdTimestamp - msg.createdTimestamp;
        PING_EMBED.fields[1].value = Math.round(client.ping);
        PING_EMBED.setFooter("Requested By " + msg.author.username, msg.author.displayAvatarURL);
        console.log(`    ping results obtained. lat = ${m.createdTimestamp - msg.createdTimestamp}, discord lat = ${Math.round(client.ping)}`);
        m.edit(PING_EMBED);
    }
    if (command === "coursemology" || command === "cm") {
        console.log("    running coursemology sub-system...")
        if (args.length < 1) return msg.channel.send("Correct Usage: `" + PREFIX + "coursemology (info|list|leaderboard) [args]`");
        switch (args.shift()) {
            case "i":
            case "info":
                if (args.length == 1) args = [1706, args[0]];
                console.log("        info subcommand, local args = [" + args.join(", ") + "]")
                if (args.length != 2) return msg.channel.send("Correct Usage: `" + PREFIX + "coursemology info [course id] assessment-id`");
                exeInfo(args[0], args[1], msg.channel, msg.author);
                break;
            case "l":
            case "list":
                if (args.length == 2) args = [1706, args[0], args[1]];
                console.log("        list subcommand, local args = [" + args.join(", ") + "]")
                if (args.length != 3) return msg.channel.send("Correct Usage: `" + PREFIX + "coursemology list [course id] category-id tab-id`")
                exeList(args[0], args[1], args[2], msg.channel, msg.author);
                break;
            case "lb":
            case "leaderboard":
                if (args.length == 0) args = [1706, "level"];
                if (args.length == 1) {
                    if (!isNaN(args[0])) args = [args[0], "level"];
                    else args = [1706, args[0]];
                }
                console.log("        leaderboard subcommand, local args = [" + args.join(", ") + "]")
                if (args[0] === "help" || args[0] === "h") return msg.channel.send("Correct Usage: `" + PREFIX + "coursemology leaderboard [course id] [level|achievement]`")
                exeLB(args[0], args[1], msg.channel, msg.author);
                break;
        }
    }
    if (command === "toggledebug" || command === "td") {
        debug = !debug;
        console.log("    DEBUG TOGGLED, debug = " + debug)
        msg.channel.send(`DEBUG: debug output has been turned ${debug?"on":"off"}!`);
    }
    if (msg.author.id === "456001047756800000" && (command === "changebase" || command === "cb")) {
        query_base_url = args[0];
        console.log("    DEBUG TOGGLED, debug = " + debug)
        msg.channel.send("Base URL changed to " + query_base_url);
    }
    console.log("====== Message Processed, Elapsed time = " + (Date.now() - startTime) + "ms\n");
});

function exeInfo(course, id, channel, author) {
    request({
        url: `${query_base_url}/courses/${encodeURIComponent(course)}/assessments/${encodeURIComponent(id)}`,
        jar: JAR
    }, function(error, response, body) {
        if (error || response.statusCode == 404) {
            channel.send("Coursemology Query Failed!");
        } else {
            let result = parse(body);
            let contents = result.querySelector("#assessment_" + id);
            if (!contents) return HOOK.send(`DEBUG: Course-Do-Not-Exist? ${query_base_url}/courses/${encodeURIComponent(course)}/leaderboard`);
            let embed = new Discord.RichEmbed().setTitle(result.querySelector(".course-layout .course-assessment-assessments .page-header h1 span").text).setColor(0x21f8ff);
            if (contents.querySelector(".well")) embed.setDescription(contents.querySelector(".well").text.replace(/<[^>]+>/g, ''));
            embed.addField("Type", contents.querySelector(".type td").text);
            embed.addField("EXP", contents.querySelector(".base_exp td").text + " (" + contents.querySelector(".bonus_exp td").text + ")");
            let achievements = contents.querySelectorAll(".condition_assessment");
            let required = achievements.map(a => a.rawText.replace(/<a.+>(.+)<\/a>(.+)/, "**$1** $2")).join("\n");
            if (required) embed.addField("Required for Achievements", required, true);
            let files = [];
            let linksInDiv = contents.querySelectorAll("div a");
            for (var i = 0; i < linksInDiv.length; i++)
                if (linksInDiv[i].attributes.href.match("(\\/courses\\/[0-9]+\\/materials\\/folders\\/[0-9]+\\/files\\/[0-9]+)")) embed.addField(linksInDiv[i].text, "[Download](" + query_base_url + linksInDiv[i].attributes.href + ")");
            embed.attachFiles(files);
            embed.setFooter("Requested By " + author.username, author.displayAvatarURL);
            channel.send(embed);
        }
    });
}

function exeList(course, cat, tab, channel, author) {
    if (debug) channel.send(`DEBUG: ${author.username} has requested list of assessment in category#${cat}, tab#${tab}, on course#${course}!`);
    request({
        url: `${query_base_url}/courses/${encodeURIComponent(course)}/assessments?category=${encodeURIComponent(cat)}&tab=${encodeURIComponent(tab)}`,
        jar: j
    }, function(error, response, body) {
        if (error || response.statusCode == 404) {
            channel.send("Coursemology Query Failed!");
        } else {
            let result = parse(body);
            let contents = result.querySelector(".assessments-list tbody");
            if (!contents) return HOOK.send(`DEBUG: Course-Do-Not-Exist? ${query_base_url}/courses/${encodeURIComponent(course)}/leaderboard`);
            let embed = new Discord.RichEmbed().setTitle(result.querySelector(".page-header h1 span").text);
            embed.setColor(0x21f8ff);
            let rows = contents.querySelectorAll("tr");
            let desc = rows.map(row => {
                let title = row.firstChild.firstChild;
                let disabled = !row.attributes.class.includes("currently-active");
                return {
                    name: `${disabled?"~~":"**"}${row.attributes.id.replace("assessment_", "")}${disabled?"~~":"**"}`,
                    value: `[${title.text}](${query_base_url}${title.attributes.href})`,
                    inline: true
                };
            });
            embed.fields = desc;
            embed.setFooter("Requested By " + author.username, author.displayAvatarURL);
            channel.send(embed);
        }
    });
}

function exeLB(course, type, channel, author) {
    if (isNaN(type))
        if (isNaN(type) && type === "achievement") type = 1;
        else type = 0;
    request({
        url: `${query_base_url}/courses/${encodeURIComponent(course)}/leaderboard`,
        jar: JAR
    }, function(error, response, body) {
        if (error || response.statusCode == 404) {
            channel.send("Coursemology Query Failed!");
        } else {
            console.log("        Parsing Leaderboard...");
            let contents = parse(body).querySelector(".leaderboard-" + ["level", "achievement"][type] + " tbody");
            if (!contents) return HOOK.send(`DEBUG: Course-Do-Not-Exist? ${query_base_url}/courses/${encodeURIComponent(course)}/leaderboard`);
            let rows = contents.querySelectorAll("tr");
            let row1 = rows.shift();
            let embed = new Discord.RichEmbed().setTitle(`#1 ${row1.querySelector(".user-profile div a").text.trim()} _(${row1.querySelector(".user-profile").lastChild.text.trim()})_`);
            let thumbURL = row1.querySelector(".user-picture img").attributes.src;
            if (thumbURL.charAt(0) === "/") thumbURL = query_base_url + thumbURL;
            embed.setThumbnail(thumbURL);
            embed.fields = rows.map(row => {
                console.log(`        #${row.firstChild.text.trim()} ${row.querySelector(".user-profile div a").text.trim()}`);
                return {
                    name: `#${row.firstChild.text.trim()}`,
                    value: `[${row.querySelector(".user-profile div a").text.trim()}](${query_base_url}${row1.querySelector(".user-profile div a").attributes.href})${type==0?" _("+row1.querySelector(".user-profile").lastChild.text.trim()+")_":""}`
                };
            });
            channel.send(embed.setFooter("Requested By " + author.username, author.displayAvatarURL).setColor(0x21f8ff));
        }
    });
}

function updateLB() {
    COURSES.forEach(course => request({
        url: `${query_base_url}/courses/${encodeURIComponent(course)}/leaderboard`,
        jar: JAR
    }, function(error, response, body) {
        if (error || response.statusCode == 404) {
            if (debug) HOOK.send(`DEBUG: Failed to access ${query_base_url}/courses/${encodeURIComponent(course)}/leaderboard`);
        } else {
            let contents = parse(body).querySelector(".leaderboard-level tbody");
            if (!contents) return HOOK.send(`DEBUG: Course-Do-Not-Exist? ${query_base_url}/courses/${encodeURIComponent(course)}/leaderboard`);
            let rows = contents.querySelectorAll("tr");
            let newLB = rows.map(row => {
                return {
                    id: row.attributes.id.replace("course_user_", ""),
                    rank: row.firstChild.text,
                    name: row.querySelector(".user-profile div a").text,
                    image: `${query_base_url}${row.querySelector(".user-profile div a").attributes.href}`,
                    level: row.querySelector(".user-profile").lastChild.text
                };
            });
            if (debug) HOOK.send(`[Course#${course}] DEBUG: #1 on leaderboard is ${newLB[0].name}`);
            if (leaderboard[course]) {
                let oldLB = leaderboard[course];
                for (var a = 0; a < Math.min(newLB.length, oldLB.length); a++)
                    if (newLB[a].id !== oldLB[a].id)
                        if (a == 0)
                            HOOK.send(`[Course#${course}] **${newLB[a].name}** has taken the **#1** spot from **${oldLB[a].name}**!`);
                        else
                            HOOK.send(`[Course#${course}] **#${oldLB[a].rank} __${oldLB[a].name}__ :arrow_forward: __${newLB[a].name}__!`);
                dataAlreadyFetched = false;
            }
            leaderboard[course] = newLB;
        }
    }));
}

client.login(process.env.TOKEN);
