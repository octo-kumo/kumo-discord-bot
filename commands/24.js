const solve24game = require('./24-solver');
const Discord = require('discord.js');
const stats = require("stats-lite");
const db = require("../db");
const GAMES = {};
const round = (n, p) => parseFloat(String(n)).toFixed(p);

function getHardDigits(layer) {
    if (layer > 10000) return null;
    let digits = [0, 1, 2, 3].map(() => Math.floor(Math.random() * 13) + 1);
    let solution = solve24game.apply(null, digits);
    if (solution.length === 1) return digits;
    else return getHardDigits(layer++);
}

exports.handleCommand = function (args, msg, PREFIX) {
    if (args.length === 0) {
        if (GAMES[msg.author.id] && Date.now() - GAMES[msg.author.id].start < 60000) return msg.reply("Chill... (game not deleted)");
        let game = GAMES[msg.author.id] = {
            digits: [0, 1, 2, 3].map(() => Math.floor(Math.random() * 9) + 1),
            start: Date.now()
        };
        db.User.findOrCreate({id: msg.author.id}, (err, user) => {
            user.game24_total_play_count = (user.game24_total_play_count || 0) + 1;
            user.save();
        });
        msg.reply('Your numbers are `' + game.digits.map(i => String(i)).join(" ") + '`');
    } else if (["hard", "difficult", "full"].includes(args[0])) {
        if (GAMES[msg.author.id] && Date.now() - GAMES[msg.author.id].start < 60000) return msg.reply("Chill... (game not deleted)");
        let game = GAMES[msg.author.id] = {
            digits: [0, 1, 2, 3].map(() => Math.floor(Math.random() * 13) + 1),
            start: Date.now()
        };
        db.User.findOrCreate({id: msg.author.id}, (err, user) => {
            user.game24_total_play_count = (user.game24_total_play_count || 0) + 1;
            user.save();
        });
        msg.reply('Your harder numbers are `' + game.digits.map(i => String(i)).join(" ") + '`');
    } else if (["hardcore", "superhard"].includes(args[0])) {
        if (GAMES[msg.author.id] && Date.now() - GAMES[msg.author.id].start < 60000) return msg.reply("Chill... (game not deleted)");
        let hardDigits = getHardDigits(0);
        if (!hardDigits) return msg.reply("Took way too long trying to find hard digits, giving up...");
        let game = GAMES[msg.author.id] = {
            unrank: true,
            digits: hardDigits,
            start: Date.now()
        };
        msg.reply('**UNRANKED** Your hardcore numbers are `' + game.digits.map(i => String(i)).join(" ") + '` (Only 1 solution!)');
    } else if (!isNaN(args[0])) {
        if (GAMES[msg.author.id] && Date.now() - GAMES[msg.author.id].start < 60000) return msg.reply("Chill... (game not deleted)");
        let goal = parseInt(args[0]);
        if (goal < 1 || goal > 99) return msg.reply("Only 1-99 allowed!");
        let game = GAMES[msg.author.id] = {
            unrank: true,
            digits: [0, 1, 2, 3].map(() => Math.floor(Math.random() * 13) + 1),
            goal: goal,
            start: Date.now()
        };
        msg.reply('**UNRANKED** Your numbers are `' + game.digits.map(i => String(i)).join(" ") + '`, try to get **' + goal + '**!');
    } else if (['imp', 'impos', 'imposs', 'impossible'].includes(args[0])) {
        if (!GAMES[msg.author.id]) return msg.reply("You are not playing");
        let game = GAMES[msg.author.id];
        let solution = solve24game.apply(null, [...game.digits, (game.goal || 24)]);
        if (solution.length === 0) msg.reply('It is **impossible**!');
        else msg.reply('Sorry but one **possible** solution is `' + solution[0] + '`. Found ' + solution.length);
        delete GAMES[msg.author.id];
    } else if (['solve', 'whatis'].includes(args[0])) {
        if (GAMES[msg.author.id]) return msg.reply("You playing a game, **XXXXX**");
        args.shift();
        let showAll = false;
        if (args[0] === "all") {
            args.shift();
            showAll = true;
        }
        let solution = solve24game.apply(null, args);
        if (solution.length === 0) msg.reply('It is **impossible**!');
        else if (showAll) {
            msg.reply('Found ' + solution.length + ' solutions.\n```\n' + solution.join('\n') + '\n```');
        } else msg.reply('Found ' + solution.length + ', one solution is `' + solution[0] + '`');
    } else if (['solvable', 'pos'].includes(args[0])) {
        args.shift();
        let solution = solve24game.apply(null, args);
        if (solution.length === 0) msg.reply('It is **impossible**!');
        else msg.reply('It is **possible**!');
    } else if (['profile'].includes(args[0])) {
        let user_to_show = null;
        if (msg.mentions.users.size !== 0) user_to_show = msg.mentions.users.first();
        db.User.findOne({id: (user_to_show || msg.author).id}).then(user => {
            if (!user) return msg.reply((user_to_show ? "This person" : "You") + " do not have a profile!");
            if ((!user.game24_total_play_count) || user.game24_total_play_count < user.game24_history.length) {
                user.game24_total_play_count = user.game24_history ? user.game24_history.length : 0;
                user.save();
            }
            if (user.game24_total_play_count === 0) return msg.reply((user_to_show ? "This person" : "You") + " have not played any 24 games!");
            let embed = new Discord.MessageEmbed();
            embed.setColor(0x00FFFF);
            embed.setTitle("24 Game Profile");
            embed.addField("Accuracy", `${round(user.game24_history.length * 100 / user.game24_total_play_count, 3)}%`, true);
            embed.addField("Play Count", 'x' + user.game24_total_play_count, true);
            embed.addField("Min", `${round(Math.min.apply(null, user.game24_history) / 1000, 3)}s`, true);
            embed.addField("Max", `${round(Math.max.apply(null, user.game24_history) / 1000, 3)}s`, true);
            embed.addField("Total", `${round(stats.sum(user.game24_history) / 1000, 2)}s`, true);
            embed.addField("Average", `${round(stats.mean(user.game24_history) / 1000, 3)}s`, true);
            embed.addField("Median", `${round(stats.median(user.game24_history) / 1000, 3)}s`, true);
            embed.addField("Mode", `${round(stats.mode(user.game24_history) / 1000, 3)}s`, true);
            embed.addField("σ (STDEV)", `${round(stats.stdev(user.game24_history) / 1000, 3)}s`, true);
            embed.setFooter("Profile of " + (user_to_show || msg.author).tag, (user_to_show || msg.author).avatarURL({dynamic: true}));
            return msg.channel.send(embed);
        });
    } else if (['leaderboard', 'lb'].includes(args[0])) {
        let dict = {
            "min": "game24_min",
            "average": "game24_average",
            "count": "game24_total_play_count"
        };
        let key = dict[(args[1] || 'average').toLowerCase().trim()];
        if (!key) key = 'game24_average';
        if (key === "game24_total_play_count") {
            db.User.find({appeared_in: msg.guild.id}).limit(15).sort("-game24_total_play_count").exec((err, users) => {
                let embed = new Discord.MessageEmbed();
                embed.setTitle("24 Game Leaderboard");
                embed.setColor(0x00FFFF);
                embed.setDescription(users.map((user, i) => `\`#${i + 1}\` <@${user.id}>: **x${user[key]}**`).join("\n"));
                return msg.channel.send(embed);
            });
        } else {
            db.User.find({appeared_in: msg.guild.id}).limit(15).sort(key).exec((err, users) => {
                let embed = new Discord.MessageEmbed();
                embed.setTitle("24 Game Leaderboard");
                embed.setColor(0x00FFFF);
                embed.setDescription(users.map((user, i) => `\`#${i + 1}\` <@${user.id}>: **${round(user[key] / 1000, 3)}s**`).join("\n"));
                return msg.channel.send(embed);
            });
        }
    }
}
const ANSWER_REGEX = /^[()+\-*%/\s]*\d+[()+\-*%/\s]+\d+[()+\-*%/\s]+\d+[()+\-*%/\s]+\d+[()+\-*%/\s]*$/;
exports.directControl = async function (msg) {
    let game = GAMES[msg.author.id];
    if (!game) return false;
    if (!ANSWER_REGEX.test(msg.content)) return;
    if (parseFloat(eval(msg.content).toPrecision(5)) === (game.goal || 24) && arraysEqual(
        msg.content.replace(/[^\d]/g, '').split('').map(c => parseInt(c)).sort(),
        game.digits.join('').split('').map(c => parseInt(c)).sort()
    )) {
        let millis = Date.now() - game.start;
        let earning = Math.min(60, Math.max(0, (Math.floor(60 - millis / 1000))));
        msg.reply(`You are **correct**! Time used = \`${Math.floor(millis / 10) / 100}s\`${game.unrank || earning === 0 ? '' : `\nAnd you earned $${earning}`}`);
        if (!game.unrank) db.User.findOrCreate({id: msg.author.id}, function (err, user) {
            if (!user.game24_history) user.game24_history = [];
            if (!user.appeared_in.includes(msg.guild.id)) user.appeared_in.push(msg.guild.id);
            user.credit += earning;
            user.game24_history.push(millis);
            user.game24_average = stats.mean(user.game24_history);
            user.game24_min = Math.min.apply(null, user.game24_history);
            user.save();
        });
        delete GAMES[msg.author.id];
    } else {
        let solution = solve24game.apply(null, [...game.digits, (game.goal || 24)]);
        if (solution.length > 0) msg.reply('Sorry but you are **wrong**! One possible answer would be `' + solution[0] + '`. Found ' + solution.length);
        else msg.reply('Sorry but it is actually **impossible**!');
        delete GAMES[msg.author.id];
    }
    return true;
}

function arraysEqual(a, b) {
    if (a === b) return true;
    if (a == null || b == null) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; ++i) if (a[i] !== b[i]) return false;
    return true;
}
