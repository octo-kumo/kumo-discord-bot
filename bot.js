// Required dependencies
const Discord = require('discord.js');
const request = require('request');
const parse = require('node-html-parser').parse;

// Constants
const NUMBER_OF_USER_PER_PAGE = 8;
const COURSES = [1706, 1389, 614, 1613];
const SLEEP_IMAGES = ["https://res.cloudinary.com/chatboxzy/image/upload/v1573747146/sleep_1.jpg", "https://res.cloudinary.com/chatboxzy/image/upload/v1573747147/sleep_2.jpg", "https://res.cloudinary.com/chatboxzy/image/upload/v1573747147/sleep_3.jpg", "https://res.cloudinary.com/chatboxzy/image/upload/v1573747147/sleep_4.jpg"];
const SLEEP_LATE = ["https://res.cloudinary.com/chatboxzy/image/upload/v1573747132/sleep_late.jpg"];
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
let USERS_CACHE = {};

JAR.setCookie(request.cookie('remember_user_token=' + USERTOKEN), query_base_url);

// Embed Presets
const PING_EMBED = new Discord.RichEmbed().setTitle("Ping Results").setColor(0x21f8ff).addField("Latency", 0).addField("Discord API Latency", 0);
const HELP_EMBED = new Discord.RichEmbed().setTitle("Help").setColor(0x21f8ff)
    .addField(`${PREFIX}ping`, "Get the bot's ping")
    .addField(`${PREFIX}toggledebug`, "Toggle Debug Messages")
    .addField(`${PREFIX}coursemology`, `Access Coursemology.\nUsage: \`${PREFIX}coursemology (info|list|leaderboard|user) [args]\``);

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
        console.log("running coursemology sub-system...");
        if (args.length < 1) return msg.channel.send("Correct Usage: `" + PREFIX + "coursemology (info|list|leaderboard|user) [args]`");
        let json = false;
        if (args[args.length - 1] === "--json") {
            args.pop();
            json = true;
        }
        switch (args.shift()) {
            case "i":
            case "info":
                if (args.length == 1) args = [1706, args[0]];
                console.log("info subcommand, local args = [" + args.join(", ") + "]")
                if (args.length != 2) return msg.channel.send("Correct Usage: `" + PREFIX + "coursemology info [course id] assessment-id`");
                exeInfo(args[0], args[1], json, msg.channel, msg.author);
                break;
            case "l":
            case "list":
                if (args.length == 2) args = [1706, args[0], args[1]];
                console.log("list subcommand, local args = [" + args.join(", ") + "]")
                if (args.length != 3) return msg.channel.send("Correct Usage: `" + PREFIX + "coursemology list [course id] category-id tab-id`")
                exeList(args[0], args[1], args[2], json, msg.channel, msg.author);
                break;
            case "lb":
            case "leaderboard":
                if (args.length == 0) args = [1706, "level"];
                if (args.length == 1) {
                    if (!isNaN(args[0])) args = [args[0], "level"];
                    else args = [1706, args[0]];
                }
                console.log("leaderboard subcommand, local args = [" + args.join(", ") + "]");
                if (args[0] === "help" || args[0] === "h") return msg.channel.send("Correct Usage: `" + PREFIX + "coursemology leaderboard [course id] [level|achievement]`")
                exeLB(args[0], args[1], json, msg.channel, msg.author);
                break;
            case "u":
            case "stalk":
            case "user":
                if (args.length == 0) {
                    console.log("user subcommand, no course, proceed to list all users...");
                    exeLU(1706, 1, json, msg.channel, msg.author);
                } else if (args.length == 1) {
                    console.log("user subcommand, only user provided, proceed to stalk that user...");
                    exeStalk(1706, args[0], json, msg.channel, msg.author);
                } else if (args.length == 2) {
                    if (args[0] === "list") {
                        console.log("user subcommand, course provided, requested list, proceed to list all users...");
                        exeLU(args[1], 1, json, msg.channel, msg.author);
                    } else {
                        console.log("user subcommand, all args provided, proceed to stalk that user...");
                        exeStalk(args[0], args[1], json, msg.channel, msg.author);
                    }
                } else if (args.length == 3 && args[0] === "list") {
                    console.log("user subcommand, course, page, provided, requested list, proceed to list all users...");
                    exeLU(args[1], args[2], json, msg.channel, msg.author);
                } else {
                    console.log("user subcommand, invalid args, proceed to warn the user...");
                    return msg.channel.send("Correct Usage: `" + PREFIX + "coursemology stalk [list] [course id] [user id]`");
                }
                break;
        }
    }
    if (command === "toggledebug" || command === "td") {
        debug = !debug;
        console.log("DEBUG TOGGLED, debug = " + debug)
        msg.channel.send(`DEBUG: debug output has been turned ${debug?"on":"off"}!`);
    }
    if (command === "shouldisleep" || command === "sleep" || command === "sis" || command === "zzz") {
        var currentHour = (new Date().getHours() + 8) % 24;
        console.log("current hour = " + currentHour);
        if (currentHour < 6 || currentHour > 21) {
            let embed = new Discord.RichEmbed().setTitle("You should go to **sleep**!").setColor(0x21f8ff);
            embed.setDescription("It is so late right now, better go and sleep **" + msg.author.username + "**");
            if (currentHour < 6 && currentHour > 2) embed.setThumbnail(SLEEP_LATE[Math.floor(Math.random() * SLEEP_LATE.length)]);
            else embed.setThumbnail(SLEEP_IMAGES[Math.floor(Math.random() * SLEEP_IMAGES.length)]);
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
        query_base_url = args[0];
        console.log("DEBUG TOGGLED, debug = " + debug)
        msg.channel.send("Base URL changed to " + query_base_url);
    }
    console.log("====== Message Processed, Elapsed time = " + (Date.now() - startTime) + "ms\n");
});

function exeInfo(course, id, json, channel, author) {
    request({
        url: `${query_base_url}/courses/${encodeURIComponent(course)}/assessments/${encodeURIComponent(id)}`,
        jar: JAR
    }, function(error, response, body) {
        if (error || response.statusCode == 404) {
            channel.send("Coursemology Query Failed!");
        } else {
            let result = parse(body);
            let contents = result.querySelector("#assessment_" + id);
            if (!contents) return channel.send(`Query has failed as ${query_base_url}/courses/${encodeURIComponent(course)}/assessments/${encodeURIComponent(id)} is not valid!`);
            let achievements = {};
            contents.querySelectorAll(".condition_assessment").forEach(a => {
                achievements[a.id.substring(21)] = {
                    name: a.firstChild.text,
                    description: a.lastChild.text
                };
            });
            let object = {
                name: result.querySelector(".course-layout .course-assessment-assessments .page-header h1 span").text,
                description: contents.querySelector(".well") ? contents.querySelector(".well").childNodes.map(p => p.text).join("\n") : null,
                type: contents.querySelector(".type td").text,
                base_exp: contents.querySelector(".base_exp td").text,
                bonus_exp: contents.querySelector(".bonus_exp td").text,
                achievements: achievements
            };
            if (json) {
                channel.send("```json\n" + JSON.stringify(object) + "\n```");
            } else {
                let embed = new Discord.RichEmbed().setTitle(object.name).setColor(0x21f8ff);
                if (object.description) embed.setDescription(object.description);
                embed.addField("Type", object.type, true);
                embed.addField("EXP", `${object.base_exp} (${object.bonus_exp})`, true);
                if (Object.keys(object.achievements).length > 0) embed.addField("Required for Achievements", Object.keys(object.achievements).map(a => `**${a.name}** ${a.description}`).join("\n"));
                let files = [];
                let linksInDiv = contents.querySelectorAll("div a");
                for (var i = 0; i < linksInDiv.length; i++)
                    if (linksInDiv[i].attributes.href.match("(\\/courses\\/[0-9]+\\/materials\\/folders\\/[0-9]+\\/files\\/[0-9]+)")) embed.addField(linksInDiv[i].text, "[Download](" + query_base_url + linksInDiv[i].attributes.href + ")");
                embed.attachFiles(files);
                embed.setFooter("Requested By " + author.username, author.displayAvatarURL);
                channel.send(embed);
            }
        }
    });
}

function exeList(course, cat, tab, json, channel, author) {
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
            if (!contents) return channel.send(`Query has failed as ${query_base_url}/courses/${encodeURIComponent(course)}/assessments?category=${encodeURIComponent(cat)}&tab=${encodeURIComponent(tab)} is not valid!`);
            let embed = new Discord.RichEmbed().setTitle(result.querySelector(".page-header h1 span").text).setColor(0x21f8ff);
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

function exeLB(course, type, json, channel, author) {
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
            console.log("Parsing Leaderboard...");
            let contents = parse(body).querySelector(".leaderboard-" + ["level", "achievement"][type] + " tbody");
            if (!contents) return channel.send(`Query has failed as ${query_base_url}/courses/${encodeURIComponent(course)}/leaderboard is not valid!`);
            let rows = contents.querySelectorAll("tr");
            let row1 = rows.shift();
            let embed = new Discord.RichEmbed().setTitle(`#1 ${row1.querySelector(".user-profile div a").text.trim()} _(${row1.querySelector(".user-profile").lastChild.text.trim()})_`).setColor(0x21f8ff);
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
            channel.send(embed.setFooter("Requested By " + author.username, author.displayAvatarURL));
        }
    });
}

function exeLU(course, page, json, channel, author) {
    let users = USERS_CACHE[course];
    if (isNaN(page) || !users) return channel.send("Course/Page not supported!");
    page = parseInt(page);
    let keys = Object.keys(users);
    let lines = [];
    if (page < 1 || page > Math.ceil(keys.length / NUMBER_OF_USER_PER_PAGE)) return channel.send(`There are ${Math.ceil(keys.length / NUMBER_OF_USER_PER_PAGE)} pages, and you requested ${page}...`);
    let embed = new Discord.RichEmbed().setTitle(`Students of Course#${course} (${page}/${Math.ceil(keys.length/NUMBER_OF_USER_PER_PAGE)})`).setColor(0x21f8ff);
    console.log(`showing users from #${(page-1) * NUMBER_OF_USER_PER_PAGE} to #${Math.min(page * NUMBER_OF_USER_PER_PAGE, keys.length)}`);
    for (let i = (page - 1) * NUMBER_OF_USER_PER_PAGE; i < Math.min(page * NUMBER_OF_USER_PER_PAGE, keys.length); i++) {
        let key = keys[i];
        lines.push({
            name: key,
            value: users[key].name
        });
    }
    embed.fields = lines;
    embed.setFooter("Requested By " + author.username, author.displayAvatarURL);
    channel.send(embed);
}

function exeStalk(course, user_id, json, channel, author) {
    if (isNaN(user_id)) {
        let users = USERS_CACHE[course];
        let limit = 3;
        Object.keys(users).forEach(key => {
            if (users[key].name.toUpperCase().includes(user_id.toUpperCase()) && limit >= 0) {
                limit--;
                exeStalk(course, key, channel, author);
            }
        });
        if (limit == 3) return channel.send("Didnt find anyone with **" + user_id + "** in their name.");
    } else {
        request({
            url: `${query_base_url}/courses/${encodeURIComponent(course)}/users/${encodeURIComponent(user_id)}`,
            jar: JAR
        }, function(error, response, body) {
            if (error || response.statusCode == 404) {
                console.log(`Failed ${course}, ${user_id}`);
                channel.send("Coursemology Query Failed!");
            } else {
                console.log("Parsing User Profile...");
                let contents = parse(body).querySelector(".course-users");
                if (!contents) return channel.send(`Query Failed! why are you even using this feature?`);
                let user_info = contents.querySelector(".row").lastChild;
                let name = user_info.querySelector("h2").text;
                let embed = new Discord.RichEmbed().setTitle("Profile of " + name).setColor(0x21f8ff);
                embed.addField("Email", user_info.querySelector("p").text).setThumbnail(contents.querySelector(".profile-box .image img").attributes.src)
                    .setDescription(`Achievements (${contents.lastChild.childNodes.length}):\n` + contents.lastChild.childNodes.map(ach => `[${ach.querySelector("h6").text}](${query_base_url}${ach.firstChild.attributes.href})`).join(", "));
                channel.send(embed.setFooter("Requested By " + author.username, author.displayAvatarURL));
            }
        });
    }
}

//update functions
//TODO: to be expanded

function updateUsers(course) {
    request({
        url: `https://nushigh.coursemology.org/courses/${course}/users`,
        jar: JAR
    }, function(error, response, body) {
        if (error || response.statusCode == 404) {
            channel.send("Coursemology Query Failed!");
        } else {
            let contents = parse(body).querySelector(".course-users");
            if (!contents) return channel.send(`Query has failed as ${query_base_url}/courses/${encodeURIComponent(course)}/leaderboard is not valid!`);
            let users = contents.querySelectorAll(".course_user");
            USERS_CACHE[course] = {};
            users.forEach(user => {
                USERS_CACHE[course][user.id.substring(12)] = {
                    name: user.querySelector(".user-name").text,
                    icon: user.querySelector(".profile-picture img").attributes.src
                };
            });
        }
    });
}

function updateLB() {
    COURSES.forEach(course => {
        updateUsers(course);
        request({
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
        });
    });
}

client.login(process.env.TOKEN);
