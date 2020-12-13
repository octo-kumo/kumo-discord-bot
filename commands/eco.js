const Discord = require('discord.js');
const db = require("../db");

const round = (n, p) => parseFloat(String(n)).toFixed(p);
exports.flip_coin = function (args, msg, PREFIX) {
    db.User.findOrCreate({id: msg.author.id}, function (err, user) {
        if (user.credit < 50) return msg.reply("A flip coin takes **$50**, and you don't have enough");
        if (Math.random() > 0.5) {
            user.credit += 50;
            msg.reply(`**HEADS** You won and received **$50**!`);
        } else {
            user.credit -= 50;
            msg.reply(`**TAILS** You lost and lost **$50**!`);
        }
        user.save();
    });
}

exports.balance = function (args, msg, PREFIX) {
    if (msg.mentions.users.size > 0) db.User.findOne({id: msg.mentions.users.first().id}).then(user => {
        msg.reply(msg.mentions.users.first().username + " has **$" + (user.credit || 0) + "**");
        if (!user.appeared_in.includes(msg.guild.id)) user.appeared_in.push(msg.guild.id);
    }); else db.User.findOrCreate({id: msg.author.id}, function (err, user) {
        msg.reply("You have **$" + (user.credit || 0) + "**");
        if (!user.appeared_in.includes(msg.guild.id)) user.appeared_in.push(msg.guild.id);
    });
}

exports.pay = function (args, msg, PREFIX) {
    if (msg.mentions.users.size > 0) {
        if (msg.mentions.users.first().id === msg.author.id) return msg.reply("You can't pay yourself!");
        let amm = args[args.length - 1];
        if (isNaN(amm)) return msg.reply("Please pay in numbers!");
        amm = parseFloat(parseFloat(amm).toFixed(2));
        if (amm <= 0) return msg.reply("Positive amount please");
        db.User.findOrCreate({id: msg.author.id}, function (err, fromUser) {
            if (fromUser.credit < amm) return msg.reply("You are too broke!");
            db.User.findOrCreate({id: msg.mentions.users.first().id}, function (err, toUser) {
                if (err) return msg.reply("Something wrong happened!");
                fromUser.credit -= amm;
                toUser.credit += amm;
                fromUser.save();
                toUser.save();
                msg.reply(`You have paid <@!${toUser.id}> $${amm}`);
            });
        });
    } else msg.reply(`You need to specify who to pay! \`${PREFIX}pay [user] [amount]\``);
}

const DUELS = {};
exports.duel = function (args, msg, PREFIX) {
    if (args.length === 0) {
        msg.reply(`How to duel \`${PREFIX}duel [user] [amount]\``);
    } else if (args[0] === "accept") {
        if (!DUELS[msg.author.id]) return msg.reply("You have no duels!");
        let last_duel = DUELS[msg.author.id].pop();
        if (!last_duel) return msg.reply("You have no challengers!");
        msg.reply("Accepting duel...");
        let amm = last_duel.amount;
        db.User.findOrCreate({id: msg.author.id}, function (err, userA) {
            if (userA.credit < amm) return msg.channel.send(`<@!${msg.author.id}> is too broke! Duel cancelled!`);
            db.User.findOrCreate({id: last_duel.challenger}, function (err, userB) {
                if (err) return msg.reply("Something wrong happened!");
                if (userB.credit < amm) return msg.channel.send(`<@!${last_duel.challenger}> is too broke! Duel cancelled!`);
                let winner;
                if (Math.random() < 0.5) {
                    userA.credit -= amm;
                    userB.credit += amm;
                    winner = userB.id;
                } else {
                    userA.credit += amm;
                    userB.credit -= amm;
                    winner = userA.id;
                }
                userA.save();
                userB.save();
                msg.channel.send(`<@!${winner}> has won the duel of $${amm}!`);
            });
        });
    } else if (msg.mentions.users.size > 0) {
        let other_guy_id = msg.mentions.users.first().id;
        if (other_guy_id === msg.author.id) return msg.reply("You can't duel yourself!");
        let amm = args[args.length - 1];
        if (isNaN(amm)) return msg.reply("Stack must be in numbers!");
        amm = Math.floor(parseFloat(amm));
        if (amm <= 0) return msg.reply("Positive amount please!");
        if (!DUELS[other_guy_id]) DUELS[other_guy_id] = [];
        DUELS[other_guy_id].push({
            challenger: msg.author.id,
            amount: amm
        });
        msg.channel.send(`${msg.author.username} has challenged <@!${other_guy_id}> to a duel of $${amm}!\nAccept by \`${PREFIX}duel accept\``);
    } else msg.reply(`You need to specify who to duel! \`${PREFIX}duel [user] [amount]\``);
}

exports.daily = function (args, msg, PREFIX) {
    if (msg.author.id === "456001047756800000" && args[0] === "bypass") return db.User.findOne({id: msg.author.id}).then(user => {
        msg.reply("You have bypassed the timer");
        user.daily_last_claimed = 0;
        user.save();
    });
    if (args[0] === "count") {
        return db.User.findOrCreate({id: msg.author.id}, function (err, user) {
            msg.reply("You have claimed **daily** " + user.daily_count + " times.");
        });
    } else if (msg.mentions.users.size > 0) {
        return db.User.findOne({id: msg.mentions.users.first().id}).then(user => {
            msg.reply(msg.mentions.users.first().username + " has claimed **daily** " + user.daily_count + " times.");
        });
    } else {
        return db.User.findOrCreate({id: msg.author.id}, function (err, user) {
            let diff = Date.now() - (user.daily_last_claimed || 0);
            if (diff < 86400000) return msg.reply("Please wait for `" + Math.floor((86400000 - diff) / 1000) + "s` before claiming daily again!");
            user.daily_count = (user.daily_count || 0) + 1;
            let credit = Math.random();
            if (credit < 0.7) {
                credit = 20;
                msg.reply("You received **$" + credit + "**");
            } else if (credit < 0.95) {
                credit = 50;
                msg.reply("**Nice!** You received **$" + credit + "**");
            } else {
                credit = 200;
                msg.reply("**Hooray! Jackpot!** You received **$" + credit + "**");
            }
            user.credit += credit;
            user.daily_last_claimed = Date.now();
            user.save();
        });
    }
}

exports.baltop = function (args, msg, PREFIX) {
    db.User.find({appeared_in: msg.guild.id}).limit(15).sort("-credit").exec((err, users) => {
        let embed = new Discord.RichEmbed();
        embed.setTitle("Balance Leaderboard");
        embed.setColor(0x00FFFF);
        embed.setDescription(users.map((user, i) => `\`#${i + 1}\` <@${user.id}>: **$${user.credit}**`).join("\n"));
        return msg.channel.send(embed);
    });
}