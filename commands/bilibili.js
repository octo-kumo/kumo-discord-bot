const fetch = require("node-fetch");
const Discord = require('discord.js');
let DEFAULT_PICS = [];
exports.init = function () {
    return fetch("https://www.bilibili.com/activity/web/view/data/31").then(r => r.json()).then(json => DEFAULT_PICS = json.data.list);
}
exports.handleCommand = async function (args, msg, PREFIX) {
    let image = DEFAULT_PICS[Math.floor(DEFAULT_PICS.length * Math.random())];
    let url = image.data.img;
    if (!url.startsWith("http")) url = "https:" + url;
    await msg.channel.send(new Discord.RichEmbed().setColor(0x44a0d1).setImage(url));
}