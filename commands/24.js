const solve24game = require('24game-solver');
const Discord = require('discord.js');
const stats = require("stats-lite");
const db = require("../db");
const GAMES = [];
const round = (n, p) => parseFloat(String(n)).toFixed(p);
exports.handleCommand = function (args, msg, PREFIX) {
    if (args.length === 0) {
        if (GAMES[msg.author.id] && Date.now() - GAMES[msg.author.id].start < 60000) return msg.reply("Chill... (game not deleted)");
        let game = GAMES[msg.author.id] = {
            digits: [0, 1, 2, 3].map(() => Math.floor(Math.random() * 9) + 1),
            start: Date.now()
        };
        msg.reply('Your numbers are `' + game.digits.map(i => String(i)).join(" ") + '`');
    } else if (["hard", "difficult", "full"].includes(args[0])) {
        if (GAMES[msg.author.id] && Date.now() - GAMES[msg.author.id].start < 60000) return msg.reply("Chill... (game not deleted)");
        let game = GAMES[msg.author.id] = {
            digits: [0, 1, 2, 3].map(() => Math.floor(Math.random() * 13) + 1),
            start: Date.now()
        };
        msg.reply('Your harder numbers are `' + game.digits.map(i => String(i)).join(" ") + '`');
    } else if (["48", "expert"].includes(args[0])) {
        if (GAMES[msg.author.id] && Date.now() - GAMES[msg.author.id].start < 60000) return msg.reply("Chill... (game not deleted)");
        let game = GAMES[msg.author.id] = {
            digits: [0, 1, 2, 3].map(() => Math.floor(Math.random() * 13) + 1),
            goal: 48,
            start: Date.now()
        };
        msg.reply('Your harder numbers are `' + game.digits.map(i => String(i)).join(" ") + '`, try to get **48**!');
    } else if (['impos', 'imposs', 'impossible'].includes(args[0])) {
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
    } else if (['profile'].includes(args[0])) {
        db.User.findOne({id: msg.author.id}).then(user => {
            if (!user) return msg.reply("You do not have a profile!");
            if (user.game24_history.length === 0) return msg.reply("You have not played any 24 games!");
            let embed = new Discord.RichEmbed();
            embed.setColor(0x00FFFF);
            embed.setTitle("24 Game Profile");
            embed.addField("Min", `${round(Math.min.apply(null, user.game24_history) / 1000, 2)}s`, true);
            embed.addField("Max", `${round(Math.max.apply(null, user.game24_history) / 1000, 2)}s`, true);
            embed.addField("Total", `${round(stats.sum(user.game24_history) / 1000, 2)}s`, true);
            embed.addField("Average", `${round(stats.mean(user.game24_history) / 1000, 2)}s`, true);
            embed.addField("Median", `${round(stats.median(user.game24_history) / 1000, 2)}s`, true);
            embed.addField("Mode", `${round(stats.mode(user.game24_history) / 1000, 2)}s`, true);
            embed.addField("σ (STDEV)", `${round(stats.stdev(user.game24_history) / 1000, 2)}s`, true);
            embed.setFooter("Profile of " + msg.author.tag, msg.author.avatarURL);
            return msg.channel.send(embed);
        });
    } else if (['leaderboard', 'lb'].includes(args[0])) {
        db.User.find({appeared_in: msg.guild.id}).limit(12).sort(args[1] === 'min' ? "game24_min" : "game24_average").exec((err, users) => {
            let embed = new Discord.RichEmbed();
            embed.setTitle("24 Game Leaderboard");
            embed.setColor(0x00FFFF);
            embed.setDescription(users.map((user, i) => `\`#${i + 1}\` <@${user.id}>: **${round(user[args[1] === 'min' ? "game24_min" : "game24_average"] / 1000, 2)}s**`).join("\n"));
            return msg.channel.send(embed);
        });
    }
}
const ANSWER_REGEX = /^[()+\-*%/\s]*\d+[()+\-*%/\s]+\d+[()+\-*%/\s]+\d+[()+\-*%/\s]+\d+[()+\-*%/\s]*$/;
exports.directControl = async function (msg) {
    let game = GAMES[msg.author.id];
    if (!game) return false;
    if (!ANSWER_REGEX.test(msg.content)) return;
    if (eval(msg.content) === (game.goal || 24) && arraysEqual(
        msg.content.replace(/[^\d]/g, '').split('').map(c => parseInt(c)).sort(),
        game.digits.join('').split('').map(c => parseInt(c)).sort()
    )) {
        let millis = Date.now() - game.start;
        msg.reply('You are **correct**! Time used = `' + (Math.floor(millis / 10) / 100) + 's`');
        db.User.findOrCreate({id: msg.author.id}, function (err, user) {
            if (!user.game24_history) user.game24_history = [];
            if (!user.appeared_in.includes(msg.guild.id)) user.appeared_in.push(msg.guild.id);
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