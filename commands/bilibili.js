const fetch = require("node-fetch");
const Discord = require('discord.js');
const config = require('./config.js').config;
let DEFAULT_PICS = [];
const filter = (reaction, user) => ['🔁', '❎'].includes(reaction.emoji.name) && user.id !== config.id;
exports.init = function () {
    return fetch("https://www.bilibili.com/activity/web/view/data/31").then(r => r.json()).then(json => DEFAULT_PICS = json.data.list);
}
exports.handleCommand = async function (args, msg, PREFIX) {
    let image = DEFAULT_PICS[Math.floor(DEFAULT_PICS.length * Math.random())];
    let url = image.data.img;
    if (!url.startsWith("http")) url = "https:" + url;
    let message = await msg.channel.send(new Discord.MessageEmbed().setColor(0x44a0d1).setImage(url));
    message.react('🔁').then(() => message.react('❎'));
    message.createReactionCollector(filter).on('collect', r => {
        if (!r) return;
        r.users.cache.keyArray().filter(k => k !== config.id).forEach(k => r.users.remove(k));
        if (r.emoji.name === '❎') return message.delete();
        image = DEFAULT_PICS[Math.floor(DEFAULT_PICS.length * Math.random())];
        url = image.data.img;
        if (!url.startsWith("http")) url = "https:" + url;
        message.edit(new Discord.MessageEmbed().setColor(0x44a0d1).setImage(url));
    });
}