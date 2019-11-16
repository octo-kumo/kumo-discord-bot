const request = require('request');
const parse = require('node-html-parser').parse;
const config = require('./config.js').config;
const Discord = require('discord.js');

exports.exeInfo = function(course, id, json, channel, author) {
    request({
        url: `${config.query_base_url}/courses/${encodeURIComponent(course)}/assessments/${encodeURIComponent(id)}`,
        jar: config.JAR
    }, function(error, response, body) {
        if (error || response.statusCode == 404) {
            channel.send("Coursemology Query Failed!");
        } else {
            let result = parse(body);
            let contents = result.querySelector("#assessment_" + id);
            if (!contents) return channel.send(`Query has failed as ${config.query_base_url}/courses/${encodeURIComponent(course)}/assessments/${encodeURIComponent(id)} is not valid!`);
            let achievements = {};
            contents.querySelectorAll(".condition_assessment").forEach(a => {
                achievements[a.id.substring(21)] = {
                    name: a.firstChild.text,
                    description: a.lastChild.text
                };
            });
            let object = {
                name: result.querySelector(".course-layout .course-assessment-assessments .page-header h1 span").text,
                description: contents.querySelector(".well") ? contents.querySelector(".well").text : null,
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
                if (Object.keys(object.achievements).length > 0) embed.addField("Required for Achievements", Object.keys(object.achievements).map(a => `**${object.achievements[a].name}** ${object.achievements[a].description}`).join("\n"));
                let linksInDiv = contents.querySelectorAll("div a");
                let files = [];
                for (var i = 0; i < linksInDiv.length; i++)
                    if (linksInDiv[i].attributes.href.match("(\\/courses\\/[0-9]+\\/materials\\/folders\\/[0-9]+\\/files\\/[0-9]+)")) files.push("[" + linksInDiv[i].text + "](" + config.query_base_url + linksInDiv[i].attributes.href + ")");
                embed.addField("Attached Files", files.join("\n"));
                embed.setFooter("Requested By " + author.username, author.displayAvatarURL);
                channel.send(embed);
            }
        }
    });
}

exports.exeList = function(course, cat, tab, json, channel, author) {
    if (debug) channel.send(`DEBUG: ${author.username} has requested list of assessment in category#${cat}, tab#${tab}, on course#${course}!`);
    request({
        url: `${config.query_base_url}/courses/${encodeURIComponent(course)}/assessments?category=${encodeURIComponent(cat)}&tab=${encodeURIComponent(tab)}`,
        jar: config.JAR
    }, function(error, response, body) {
        if (error || response.statusCode == 404) {
            channel.send("Coursemology Query Failed!");
        } else {
            let result = parse(body);
            let contents = result.querySelector(".assessments-list tbody");
            if (!contents) return channel.send(`Query has failed as ${config.query_base_url}/courses/${encodeURIComponent(course)}/assessments?category=${encodeURIComponent(cat)}&tab=${encodeURIComponent(tab)} is not valid!`);
            let embed = new Discord.RichEmbed().setTitle(result.querySelector(".page-header h1 span").text).setColor(0x21f8ff);
            let rows = contents.querySelectorAll("tr");
            let desc = rows.map(row => {
                let title = row.firstChild.firstChild;
                let disabled = !row.attributes.class.includes("currently-active");
                return {
                    name: `${disabled?"~~":"**"}${row.attributes.id.replace("assessment_", "")}${disabled?"~~":"**"}`,
                    value: `[${title.text}](${config.query_base_url}${title.attributes.href})`,
                    inline: true
                };
            });
            embed.fields = desc;
            embed.setFooter("Requested By " + author.username, author.displayAvatarURL);
            channel.send(embed);
        }
    });
}

exports.exeLB = function(course, type, json, channel, author) {
    if (isNaN(type))
        if (isNaN(type) && type === "achievement") type = 1;
        else type = 0;
    request({
        url: `${config.query_base_url}/courses/${encodeURIComponent(course)}/leaderboard`,
        jar: config.JAR
    }, function(error, response, body) {
        if (error || response.statusCode == 404) {
            channel.send("Coursemology Query Failed!");
        } else {
            console.log("Parsing Leaderboard...");
            let contents = parse(body).querySelector(".leaderboard-" + ["level", "achievement"][type] + " tbody");
            if (!contents) return channel.send(`Query has failed as ${config.query_base_url}/courses/${encodeURIComponent(course)}/leaderboard is not valid!`);
            let rows = contents.querySelectorAll("tr");
            let row1 = rows.shift();
            let embed = new Discord.RichEmbed().setTitle(`#1 ${row1.querySelector(".user-profile div a").text.trim()}${type==0?" _("+row1.querySelector(".user-profile").lastChild.text.trim()+")_":""}`).setColor(0x21f8ff);
            embed.setURL(config.query_base_url + row1.querySelector(".user-profile div a").attributes.href)
            let thumbURL = row1.querySelector(".user-picture img").attributes.src;
            if (thumbURL.charAt(0) === "/") thumbURL = config.query_base_url + thumbURL;
            embed.setThumbnail(thumbURL);
            embed.setDescription(rows.map(row => {
                console.log(`        #${row.firstChild.text.trim()} ${row.querySelector(".user-profile div a").text.trim()}`);
                return `#${row.firstChild.text.trim()} [${row.querySelector(".user-profile div a").text.trim()}](${config.query_base_url}${row.querySelector(".user-profile div a").attributes.href})${type==0?" _("+row.querySelector(".user-profile").lastChild.text.trim()+")_":""}`;
            }).join("\n"));
            channel.send(embed.setFooter("Requested By " + author.username, author.displayAvatarURL));
        }
    });
}

exports.exeLU = function(course, page, json, channel, author) {
    let users = config.USERS_CACHE[course];
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

exports.exeStalk = function(course, user_id, json, channel, author) {
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
            jar: config.JAR
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
                embed.setURL(`${config.query_base_url}/courses/${encodeURIComponent(course)}/users/${encodeURIComponent(user_id)}`);
                let desc = `**Achievements (${contents.lastChild.childNodes.length}):**\n` + contents.lastChild.childNodes.map(ach => ach.querySelector("h6").text).join(", ");
                let image = contents.querySelector(".profile-box .image img").attributes.src;
                if (!image.endsWith("svg")) embed.setThumbnail(image);
                console.log("DESC = " + desc);
                embed.addField("Email", user_info.querySelector("p").text, true).addField("ID", user_id, true).setDescription(desc);
                channel.send(embed.setFooter("Requested By " + author.username, author.displayAvatarURL));
            }
        });
    }
}

//update functions
//TODO: to be expanded

exports.updateUsers = function(course) {
    request({
        url: `https://nushigh.coursemology.org/courses/${course}/users`,
        jar: config.JAR
    }, function(error, response, body) {
        if (error || response.statusCode == 404) {
            console.log("failed to query users (" + response.statusCode + "), error = " + JSON.stringify(error));
        } else {
            let contents = parse(body).querySelector(".course-users");
            if (!contents) return console.log("failed to query users, contents = null");
            let users = contents.querySelectorAll(".course_user");
            config.USERS_CACHE[course] = {};
            users.forEach(user => {
                config.USERS_CACHE[course][user.id.substring(12)] = {
                    name: user.querySelector(".user-name").text,
                    icon: user.querySelector(".profile-picture img").attributes.src
                };
            });
        }
    });
}

exports.updateLB = function() {
    config.COURSES.forEach(course => {
        updateUsers(course);
        request({
            url: `${config.query_base_url}/courses/${encodeURIComponent(course)}/leaderboard`,
            jar: config.JAR
        }, function(error, response, body) {
            if (error || response.statusCode == 404) {
                if (debug) config.HOOK.send(`DEBUG: Failed to access ${config.query_base_url}/courses/${encodeURIComponent(course)}/leaderboard`);
            } else {
                let contents = parse(body).querySelector(".leaderboard-level tbody");
                if (!contents) return config.HOOK.send(`DEBUG: Course-Do-Not-Exist? ${config.query_base_url}/courses/${encodeURIComponent(course)}/leaderboard`);
                let rows = contents.querySelectorAll("tr");
                let newLB = rows.map(row => {
                    return {
                        id: row.attributes.id.replace("course_user_", ""),
                        rank: row.firstChild.text,
                        name: row.querySelector(".user-profile div a").text,
                        image: `${config.query_base_url}${row.querySelector(".user-profile div a").attributes.href}`,
                        level: row.querySelector(".user-profile").lastChild.text
                    };
                });
                if (debug) config.HOOK.send(`[Course#${course}] DEBUG: #1 on leaderboard is ${newLB[0].name}`);
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
    });
}
