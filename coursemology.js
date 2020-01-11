const request = require('request');
const JSDOM = require('jsdom').JSDOM;
const config = require('./config.js').config;
const Discord = require('discord.js');

const filter = (reaction, user) => ['⬅️', '❎', '➡️'].includes(reaction.emoji.name) && user.id !== config.id;
const listData = {};

const headers = {
    "Cookie": "remember_user_token=" + process.env.CMTOKEN,
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.135 Safari/537.36 Edge/12.246"
};

exports.handleCommand = function(args, msg, PREFIX) {
    console.log("running coursemology sub-system...");
    if (args.length < 1) return msg.channel.send("Correct Usage: `" + PREFIX + "coursemology (info|list|leaderboard|listusers|user) [args]`");
    let json = false;
    if (args[args.length - 1] === "--json" || args[args.length - 1] === "-j") {
        args.pop();
        json = true;
    }
    switch (args.shift()) {
        case "i":
        case "info":
            if (args.length == 1) args = [config.DEFAULT_COURSE, args[0]];
            console.log("info subcommand, local args = [" + args.join(", ") + "]")
            if (args.length != 2) return msg.channel.send("Correct Usage: `" + PREFIX + "coursemology info [course id] assessment-id`");
            exeInfo(args[0], args[1], json, msg.channel, msg.author);
            break;
        case "l":
        case "list":
            if (args.length == 1) args = [config.DEFAULT_COURSE, args[0]];
            if (args.length == 2) {
                if (isNaN(args[1])) {
                    let course = config.list_presets[args[0]];
                    if (course) {
                        let preset = course[args[1]];
                        if (preset) args = [args[0], preset.cat, preset.tab];
                    }
                } else args = [config.DEFAULT_COURSE, args[0], args[1]];
            }
            console.log("list subcommand, local args = [" + args.join(", ") + "]")
            if (args.length != 3) return msg.channel.send("Correct Usage: `" + PREFIX + "coursemology list [course id] category-id tab-id`")
            exeList(args[0], args[1], args[2], json, msg.channel, msg.author);
            break;
        case "lb":
        case "leaderboard":
            if (args.length == 0) args = [config.DEFAULT_COURSE, "level"];
            if (args.length == 1) {
                if (!isNaN(args[0])) args = [args[0], "level"];
                else args = [config.DEFAULT_COURSE, args[0]];
            }
            console.log("leaderboard subcommand, local args = [" + args.join(", ") + "]");
            if (args[0] === "help" || args[0] === "h") return msg.channel.send("Correct Usage: `" + PREFIX + "coursemology leaderboard [course id] [level|achievement]`")
            exeLB(args[0], args[1], json, msg.channel, msg.author);
            break;
        case "listusers":
        case "lu":
        case "users":
            if (args.length == 0) {
                console.log("users subcommand, no course/filter, proceed to list users of DEFAULT_COURSE...");
                exeLU(config.DEFAULT_COURSE, 1, json, "", msg.channel, msg.author);
            } else if (args.length == 1) {
                if (args[0] === "help") return msg.channel.send("Correct Usage: `" + PREFIX + "coursemology listusers [course id] [page number]`");
                else if (args[0] === "--all" || args[0] === "-a") {
                    console.log("users subcommand, requested to include all courses, proceed to list users from courses [" + config.COURSES.join(", ") + "]...");
                    return config.COURSES.forEach(course => exeLU(course, 1, json, "", msg.channel, msg.author));
                } else if (isNaN(args[0])) {
                    console.log("users subcommand, filter provided, proceed to list users of filter \"" + args[0] + "\"...");
                    exeLU(config.DEFAULT_COURSE, 1, json, args[0], msg.channel, msg.author);
                } else {
                    console.log("users subcommand, course provided, proceed to list users of specified course #" + args[0] + "...");
                    exeLU(args[0], 1, json, "", msg.channel, msg.author);
                }
            } else if (args.length == 2) {
                if (isNaN(args[0])) {
                    if (args[0] === "--all" || args[0] === "-a") {
                        console.log("users subcommand, filter provided, requested to include all courses, proceed to list users from courses [" + config.COURSES.join(", ") + "] of filter \"" + args[1] + "\"...");
                        config.COURSES.forEach(course => exeLU(course, 1, json, args[1], msg.channel, msg.author));
                    } else {
                        let filter = args.join(" ");
                        console.log("users subcommand, filter provided, proceed to list users of filter \"" + filter + "\"...");
                        exeLU(config.DEFAULT_COURSE, 1, json, filter, msg.channel, msg.author);
                    }
                } else if (isNaN(args[1])) {
                    console.log("users subcommand, course and filter provided, proceed to list users of specified course #" + args[0] + " and filter \"" + args[1] + "\"...");
                    exeLU(args[0], 1, json, args[1], msg.channel, msg.author);
                } else {
                    console.log("users subcommand, course and page provided, proceed to list users of specified course #" + args[0] + " on page #" + args[1] + "...");
                    exeLU(args[0], args[1], json, "", msg.channel, msg.author);
                }
            } else {
                if (!isNaN(args[0]) && !isNaN(args[1])) {
                    console.log("users subcommand, course and page provided, even filter is provided, proceed to list users of specified course #" + args[0] + " on page #" + args[1] + "...");
                    exeLU(args[0], args[1], json, args.slice(2).join(" "), msg.channel, msg.author);
                } else if (!isNaN(args[0])) {
                    console.log("users subcommand, course and filter provided, proceed to list users of specified course #" + args[0] + " and filter \"" + args[1] + "\"...");
                    exeLU(args[0], 1, json, filter, msg.channel, msg.author);
                } else {
                    if (args[0] === "--all" || args[0] === "-a") {
                        let filter = args.slice(1).join(" ");
                        console.log("users subcommand, filter provided, requested to include all courses, proceed to list users from courses [" + config.COURSES.join(", ") + "] of filter \"" + filter + "\"...");
                        config.COURSES.forEach(course => exeLU(course, 1, json, args[1], msg.channel, msg.author));
                    } else {
                        let filter = args.join(" ");
                        console.log("users subcommand, filter provided, proceed to list users of filter \"" + filter + "\"...");
                        exeLU(config.DEFAULT_COURSE, 1, json, filter, msg.channel, msg.author);
                    }
                }
            }
            break;
        case "u":
        case "stalk":
        case "user":
            if (args.length == 1) {
                if (args[0] === "help") return msg.channel.send("Correct Usage: `" + PREFIX + "coursemology user [course id] [user id/name]`");
                console.log("user subcommand, only user provided, proceed to stalk that user...");
                exeStalk(config.DEFAULT_COURSE, args[0], json, msg.channel, msg.author);
            } else if (args.length == 2 && !isNaN(args[0])) {
                console.log("user subcommand, all args provided, proceed to stalk that user...");
                exeStalk(args[0], args[1], json, msg.channel, msg.author);
            } else {
                if (isNaN(args[0])) {
                    console.log("user subcommand, no course, contains longer name, proceed to join args and search for user");
                    exeStalk(config.DEFAULT_COURSE, args.join(" "), json, msg.channel, msg.author);
                } else {
                    console.log("user subcommand, course provided, contains longer name, proceed to join args and search for user");
                    exeStalk(args[0], args.slice(1).join(" "), json, msg.channel, msg.author);
                }
            }
            break;
        case "courses":
        case "cs":
        case "listcourse":
            let embed = new Discord.RichEmbed().setTitle("Avaliable Courses").setColor(0x21f8ff);
            for (let i = 0; i < config.COURSES.length; i++) embed.addField(config.COURSES[i], config.COURSE_NAMES[i]);
            embed.setFooter("Requested By " + msg.author.username, msg.author.displayAvatarURL);
            msg.channel.send(embed);
            break;
    }
}

function exeInfo(course, id, json, channel, author) {
    request({
        url: `${config.query_base_url}/courses/${encodeURIComponent(course)}/assessments/${encodeURIComponent(id)}`,
        headers: headers
    }, function(error, response, body) {
        if (error || response.statusCode == 404) {
            channel.send("Coursemology Query Failed!");
        } else {
            let doc = new JSDOM(body).window.document;
            let contents = doc.querySelector("#assessment_" + id);
            if (!contents) return channel.send(`Query has failed as ${config.query_base_url}/courses/${encodeURIComponent(course)}/assessments/${encodeURIComponent(id)} is not valid!`);
            let achievements = {};
            contents.querySelectorAll(".condition_assessment").forEach(a => {
                achievements[a.id.substring(21)] = {
                    name: a.firstChild.textContent,
                    description: a.lastChild.textContent
                };
            });
            let object = {
                name: doc.querySelector(".course-layout .course-assessment-assessments .page-header h1 span").textContent,
                description: contents.querySelector(".well") ? contents.querySelector(".well").textContent : null,
                type: contents.querySelector(".type td").textContent,
                base_exp: contents.querySelector(".base_exp td").textContent,
                bonus_exp: contents.querySelector(".bonus_exp td").textContent,
                achievements: achievements
            };
            if (json) {
                channel.send("```json\n" + JSON.stringify(object) + "\n```");
            } else {
                let embed = new Discord.RichEmbed().setTitle(object.name).setColor(0x21f8ff);
                if (object.description) embed.setDescription(object.description);
                embed.addField("Type", object.type, true);
                embed.addField("EXP", `${object.base_exp} (${object.bonus_exp})`, true);
                if (Object.keys(object.achievements).length > 0) embed.addField("Required for Achievements", Object.keys(object.achievements).map(a => `**${object.achievements[a].name}** ${object.achievements[a].description}`).join("\n"));
                let linksInDiv = contents.querySelectorAll("div a");
                let files = [];
                for (var i = 0; i < linksInDiv.length; i++)
                    if (linksInDiv[i].href.match("(\\/courses\\/[0-9]+\\/materials\\/folders\\/[0-9]+\\/files\\/[0-9]+)")) files.push("[" + linksInDiv[i].textContent + "](" + config.query_base_url + linksInDiv[i].href + ")");
                embed.addField("Attached Files", files.join("\n"));
                embed.setFooter("Requested By " + author.username, author.displayAvatarURL);
                channel.send(embed);
            }
        }
    });
}

function exeList(course, cat, tab, json, channel, author) {
    if (config.debug) channel.send(`DEBUG: ${author.username} has requested list of assessment in category#${cat}, tab#${tab}, on course#${course}!`);
    request({
        url: `${config.query_base_url}/courses/${encodeURIComponent(course)}/assessments?category=${encodeURIComponent(cat)}&tab=${encodeURIComponent(tab)}`,
        headers: headers
    }, function(error, response, body) {
        if (error || response.statusCode == 404) {
            channel.send("Coursemology Query Failed!");
        } else {
            let doc = new JSDOM(body).window.document
            let contents = doc.querySelector(".assessments-list tbody");
            if (!contents) return channel.send(`Query has failed as ${config.query_base_url}/courses/${encodeURIComponent(course)}/assessments?category=${encodeURIComponent(cat)}&tab=${encodeURIComponent(tab)} is not valid!`);
            let embed = new Discord.RichEmbed().setTitle(`${doc.querySelector(".page-header h1 span").textContent}${config.list_presets[course]?" ("+config.list_presets[course].name+")":""}`).setColor(0x21f8ff);
            let rows = contents.querySelectorAll("tr");
            let desc = Object.values(rows).map(row => {
                let title = row.firstChild.firstChild;
                let disabled = !row.className.includes("currently-active");
                return {
                    name: `${disabled?"~~":"**"}${row.id.replace("assessment_", "")}${disabled?"~~":"**"}`,
                    value: `[${title.textContent}](${config.query_base_url}${title.href})`,
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
        url: `${config.query_base_url}/courses/${encodeURIComponent(course)}/leaderboard`,
        headers: headers
    }, function(error, response, body) {
        if (error || response.statusCode == 404) {
            channel.send("Coursemology Query Failed!");
        } else {
            console.log("Parsing Leaderboard...");
            let contents = new JSDOM(body).window.document.querySelector(".leaderboard-" + ["level", "achievement"][type] + " tbody");
            if (!contents) return channel.send(`Query has failed as ${config.query_base_url}/courses/${encodeURIComponent(course)}/leaderboard is not valid!`);
            let rows = Array.from(contents.querySelectorAll("tr"));
            let row1 = rows.shift();
            let embed = new Discord.RichEmbed().setTitle(`#1 ${row1.querySelector(".user-profile div a").textContent.trim()}${type==0?" _("+row1.querySelector(".user-profile").lastChild.textContent.trim()+")_":""}`).setColor(0x21f8ff);
            embed.setURL(config.query_base_url + row1.querySelector(".user-profile div a").href)
            let thumbURL = row1.querySelector(".user-picture img").src;
            if (thumbURL.charAt(0) === "/") thumbURL = config.query_base_url + thumbURL;
            embed.setThumbnail(thumbURL);
            embed.setDescription(Object.values(rows).map(row => {
                console.log(`        #${row.firstChild.textContent.trim()} ${row.querySelector(".user-profile div a").textContent.trim()}`);
                return `#${row.firstChild.textContent.trim()} [${row.querySelector(".user-profile div a").textContent.trim()}](${config.query_base_url}${row.querySelector(".user-profile div a").href})${type==0?" _("+row.querySelector(".user-profile").lastChild.textContent.trim()+")_":""}`;
            }).join("\n"));
            channel.send(embed.setFooter("Requested By " + author.username, author.displayAvatarURL));
        }
    });
}

function exeLUField(course, users, page, keys) {
    let lines = [];
    if (page < 1 || page > Math.ceil(keys.length / config.NUMBER_OF_USER_PER_PAGE)) return `There are ${Math.ceil(keys.length / config.NUMBER_OF_USER_PER_PAGE)} pages, and you requested ${page}...`;
    console.log(`showing users from #${(page-1) * config.NUMBER_OF_USER_PER_PAGE} to #${Math.min(page * config.NUMBER_OF_USER_PER_PAGE, keys.length)}`);
    for (let i = (page - 1) * config.NUMBER_OF_USER_PER_PAGE; i < Math.min(page * config.NUMBER_OF_USER_PER_PAGE, keys.length); i++) {
        let key = keys[i];
        lines.push({
            name: key,
            value: `[${users[key].name}](${config.query_base_url}/courses/${encodeURIComponent(course)}/users/${encodeURIComponent(key)})`
        });
    }
    return lines;
}

function exeLU(course, page, json, nameFilter, channel, author) {
    let users = config.USERS_CACHE[course];
    if (isNaN(page) || !users) {
        console.log(`error, course = ${course}, page = ${page}, json = ${json}`);
        return channel.send("Course/Page not supported!");
    }
    if (nameFilter) users = filterObject(users, user => user.name.toUpperCase().includes(nameFilter.toUpperCase()));
    let keys = Object.keys(users);
    page = parseInt(page);
    let embed = new Discord.RichEmbed().setTitle(`Students of Course#${course}${Math.ceil(keys.length / config.NUMBER_OF_USER_PER_PAGE)>1?` (${page}/${Math.ceil(keys.length/config.NUMBER_OF_USER_PER_PAGE)})`:""}`).setColor(0x21f8ff);
    embed.fields = exeLUField(course, users, page, keys);
    embed.setFooter("Requested By " + author.username, author.displayAvatarURL);
    channel.send(embed).then(message => {
        if (Math.ceil(keys.length / config.NUMBER_OF_USER_PER_PAGE) > 1) message.react('⬅️').then(() => message.react('❎')).then(() => message.react('➡️')).then(() => {
            listData[message.id] = {
                course: course,
                users: users,
                page: page,
                message: message,
                embed: embed,
                maxPage: Math.ceil(keys.length / config.NUMBER_OF_USER_PER_PAGE)
            };
            const collector = message.createReactionCollector(filter, {
                time: 900000
            });
            collector.on('collect', r => {
                console.log(`Collected ${r.emoji.name}`);
                switch (r.emoji.name) {
                    case '❎':
                        r.message.delete();
                        delete listData[r.message.id];
                        break;
                    case '⬅️':
                    case '➡️':
                        message.reactions.forEach(reaction => reaction.users.filter(user => user.id !== config.id).forEach((id, user) => reaction.remove(user)));
                        let oldPage = listData[r.message.id].page;
                        listData[r.message.id].page = Math.min(Math.max(listData[r.message.id].page + (r.emoji.name === '⬅️' ? -1 : 1), 1), listData[r.message.id].maxPage);
                        if (oldPage == listData[r.message.id].page) break;
                        console.log(`Changing Page to ${listData[r.message.id].page}`);
                        listData[r.message.id].embed.fields = exeLUField(listData[r.message.id].course, listData[r.message.id].users, listData[r.message.id].page, Object.keys(listData[r.message.id].users));
                        listData[r.message.id].embed.title = `Students of Course#${listData[r.message.id].course} (${listData[r.message.id].page}/${listData[r.message.id].maxPage})`;
                        console.log(`Changing Title to ${listData[r.message.id].embed.title}`);
                        listData[r.message.id].message.edit(listData[r.message.id].embed);
                        break;
                }
            });
            collector.on('end', r => {
                message.delete();
            });
        });
    });
}

function exeStalk(course, user_id, json, channel, author) {
    if (isNaN(user_id)) {
        let users = config.USERS_CACHE[course];
        if (!users) return channel.send("Are you sure we have that course?");
        let limit = 3;
        Object.keys(users).forEach(key => {
            if (users[key].name.toUpperCase().includes(user_id.toUpperCase()) && limit > 0) {
                limit--;
                exeStalk(course, key, json, channel, author);
            }
        });
        if (limit == 3) return channel.send("Didnt find anyone with **" + user_id + "** in their name.");
    } else {
        request({
            url: `${config.query_base_url}/courses/${encodeURIComponent(course)}/users/${encodeURIComponent(user_id)}`,
            headers: headers
        }, function(error, response, body) {
            if (error || response.statusCode == 404) {
                console.log(`Failed ${course}, ${user_id}`);
                channel.send("Coursemology Query Failed!");
            } else {
                console.log("Parsing User Profile...");
                let contents = new JSDOM(body).window.document.querySelector(".course-users");
                if (!contents) return channel.send(`Query Failed! why are you even using this feature?`);
                let user_info = contents.querySelector(".row").lastChild;
                let name = user_info.querySelector("h2").textContent;
                let embed = new Discord.RichEmbed().setTitle("Profile of " + name).setColor(0x21f8ff);
                embed.setURL(`${config.query_base_url}/courses/${encodeURIComponent(course)}/users/${encodeURIComponent(user_id)}`);
                let image = contents.querySelector(".profile-box .image img").src;
                if (!image.endsWith("svg")) embed.setThumbnail(image);
                let finalText = [];
                for (let node of contents.lastChild.childNodes) finalText.push(node.querySelector("h6").textContent);
                embed.addField("ID", user_id, true).addField("Email", user_info.querySelector("p").textContent, true).addField(`Achievements (${contents.lastChild.childNodes.length})`, finalText.join(", "));
                channel.send(embed.setFooter("Requested By " + author.username, author.displayAvatarURL));
            }
        });
    }
}

//update functions
//TODO: to be expanded

function updateUsers(course) {
    console.log(`${config.query_base_url}/courses/${course}/users`);
    request({
        url: `${config.query_base_url}/courses/${course}/users`,
        headers: headers
    }, function(error, response, body) {
        if (error || response.statusCode == 404) {
            console.log("failed to query users (" + response.statusCode + "), error = " + JSON.stringify(error));
        } else {
            let contents = new JSDOM(body).window.document.querySelector(".course-users");
            if (!contents) return console.log("failed to query users, contents = null");
            let users = contents.querySelectorAll(".course_user");
            config.USERS_CACHE[course] = {};
            users.forEach(user => {
                config.USERS_CACHE[course][user.id.substring(12)] = {
                    name: user.querySelector(".user-name").textContent,
                    icon: user.querySelector(".profile-picture img").src
                };
            });
        }
    });
}

function updateLB(course) {
    request({
        url: `${config.query_base_url}/courses/${encodeURIComponent(course)}/leaderboard`,
        headers: headers
    }, function(error, response, body) {
        if (error || response.statusCode == 404) {
            if (config.debug) config.HOOK.send(`DEBUG: Failed to access ${config.query_base_url}/courses/${encodeURIComponent(course)}/leaderboard`);
        } else {
            let contents = new JSDOM(body).window.document.querySelector(".leaderboard-level tbody");
            if (!contents) return config.debug ? config.HOOK.send(`DEBUG: Course-Do-Not-Exist? ${config.query_base_url}/courses/${encodeURIComponent(course)}/leaderboard`) : "";
            let rows = contents.querySelectorAll("tr");
            let newLB = Object.values(rows).map(row => {
                return {
                    id: row.id.replace("course_user_", ""),
                    rank: row.firstChild.textContent,
                    name: row.querySelector(".user-profile div a").textContent,
                    image: `${config.query_base_url}${row.querySelector(".user-profile div a").href}`,
                    level: row.querySelector(".user-profile").lastChild.textContent
                };
            });
            if (config.debug) config.HOOK.send(`[Course#${course}] DEBUG: #1 on leaderboard is ${newLB[0].name}`);
            if (config.leaderboard[course]) {
                let oldLB = config.leaderboard[course];
                for (var a = 0; a < Math.min(newLB.length, oldLB.length); a++)
                    if (newLB[a].id !== oldLB[a].id)
                        if (a == 0)
                            config.HOOK.send(`[Course#${course}] **${newLB[a].name}** has taken the **#1** spot from **${oldLB[a].name}**!`);
                        else
                            config.HOOK.send(`[Course#${course}] **#${oldLB[a].rank} __${oldLB[a].name}__ :arrow_forward: __${newLB[a].name}__!`);
            }
            config.leaderboard[course] = newLB;
        }
    });
}

exports.update = function() {
    config.COURSES.forEach(course => {
        updateUsers(course);
        updateLB(course);
    });
}

function filterObject(obj, predicate) {
    var result = {};
    var key;
    for (key in obj) {
        if (obj.hasOwnProperty(key) && predicate(obj[key])) {
            result[key] = obj[key];
        }
    }
    return result;
}
