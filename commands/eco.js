const Discord = require('discord.js');
const db = require("../db");

const round = (n, p) => parseFloat(String(n)).toFixed(p);
exports.flip_coin = function (args, msg, PREFIX) {
    db.User.findOne({id: msg.author.id}).then(user => {
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
    }); else db.User.findOne({id: msg.author.id}).then(user => {
        msg.reply("You have **$" + (user.credit || 0) + "**");
    });
}

exports.pay = function (args, msg, PREFIX) {

}

exports.daily = function (args, msg, PREFIX) {
    if (msg.author.id === "456001047756800000" && args[0] === "bypass") return db.User.findOne({id: msg.author.id}).then(user => {
        msg.reply("You have bypassed the timer");
        user.daily_last_claimed = 0;
        user.save();
    });
    if (args[0] === "count") {
        return db.User.findOne({id: msg.author.id}).then(user => {
            msg.reply("You have claimed **daily** " + user.daily_count + " times.");
        });
    } else if (msg.mentions.users.size > 0) {
        return db.User.findOne({id: msg.mentions.users.first().id}).then(user => {
            msg.reply(msg.mentions.users.first().username + " has claimed **daily** " + user.daily_count + " times.");
        });
    } else {
        return db.User.findOne({id: msg.author.id}).then(user => {
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