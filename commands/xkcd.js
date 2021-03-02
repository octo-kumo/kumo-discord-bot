const fetch = require("node-fetch");
const srcset = require('srcset');
const JSDOM = require("jsdom").JSDOM;
const config = require('./config.js').config;
const Discord = require('discord.js');
const filter = (reaction, user) => ['🔁', '❎'].includes(reaction.emoji.name) && user.id !== config.id;
exports.handleCommand = async function (args, msg, PREFIX) {
    try {
        let message = await msg.channel.send(await getComic(args));
        message.react('🔁').then(() => message.react('❎'));
        message.createReactionCollector(filter).on('collect', r => {
            if (!r) return;
            r.users.cache.keyArray().filter(k => k !== config.id).forEach(k => r.users.remove(k));
            if (r.emoji.name === '❎') return message.delete();
            getComic([]).then(c => {
                return message.edit(c);
            });
        });
    } catch (e) {
        await msg.channel.send("Failed to get comics");
        console.log(e);
    }
}

async function getComic(args) {
    let doc = new JSDOM(await fetch(args.length === 0 ? "https://c.xkcd.com/random/comic/" : "https://xkcd.com/" + args[0] + "/").then(res => res.text())).window.document;
    let url = doc.head.querySelector("[property='og:url'][content]").content;
    let img = doc.querySelector('#comic img');
    return new Discord.MessageEmbed()
        .setColor(0x44a0d1)
        .setURL(url)
        .setTitle(doc.head.querySelector("[property='og:title'][content]").content)
        .setImage('https:' + (img.getAttribute('srcset') ? srcset.parse(img.getAttribute('srcset')).sort((a, b) => b.density ? a.density ? b.density - a.density : -1 : 1)[0].url : img.getAttribute('src')))
        .setDescription(img.getAttribute('title'))
        .setFooter('Credits to xkcd • ' + url.replace(/^https:\/\/xkcd.com\/([^/]+)\/$/, '$1'));
}