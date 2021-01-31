const fetch = require("node-fetch");
const JSDOM = require("jsdom").JSDOM;
const Discord = require('discord.js');
exports.handleCommand = async function (args, msg, PREFIX) {
    let doc = new JSDOM(await fetch(args.length === 0 ? "https://c.xkcd.com/random/comic/" : "https://xkcd.com/" + args[0] + "/").then(res => res.text())).window.document;
    try {
        let url = doc.head.querySelector("[property='og:url'][content]").content;
        await msg.channel.send(new Discord.MessageEmbed()
            .setColor(0x44a0d1)
            .setURL(url)
            .setTitle(doc.head.querySelector("[property='og:title'][content]").content)
            .setImage(doc.head.querySelector("[property='og:image'][content]").content)
            .setDescription(doc.querySelector('#comic img').getAttribute('title'))
            .setFooter('All credits to https://xkcd.com • ' + url.replace(/^https:\/\/xkcd.com\/([^/]+)\/$/, '$1'))
        );
    } catch (e) {
        await msg.channel.send("Failed to get comics");
    }
}