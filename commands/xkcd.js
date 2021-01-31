const fetch = require("node-fetch");
const srcset = require('srcset');
const JSDOM = require("jsdom").JSDOM;
const Discord = require('discord.js');
exports.handleCommand = async function (args, msg, PREFIX) {
    let doc = new JSDOM(await fetch(args.length === 0 ? "https://c.xkcd.com/random/comic/" : "https://xkcd.com/" + args[0] + "/").then(res => res.text())).window.document;
    try {
        let url = doc.head.querySelector("[property='og:url'][content]").content;
        let img = doc.querySelector('#comic img');
        await msg.channel.send(new Discord.MessageEmbed()
            .setColor(0x44a0d1)
            .setURL(url)
            .setTitle(doc.head.querySelector("[property='og:title'][content]").content)
            .setImage('https:' + (img.getAttribute('srcset') ? srcset.parse(img.getAttribute('srcset')).sort((a, b) => b.density ? a.density ? b.density - a.density : -1 : 1)[0].url : img.getAttribute('src')))
            .setDescription(img.getAttribute('title'))
            .setFooter('Credits to xkcd • ' + url.replace(/^https:\/\/xkcd.com\/([^/]+)\/$/, '$1'))
        );
    } catch (e) {
        await msg.channel.send("Failed to get comics");
        console.log(e);
    }
}