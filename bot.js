const Discord = require('discord.js');
const request = require('request');
const moment = require('moment');
const client = new Discord.Client();
const express = require('express')
var port = process.env.PORT || 3000;
const prefix = process.env.PREFIX;

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    console.log(`Bot has started, with ${client.users.size} users, in ${client.channels.size} channels of ${client.guilds.size} guilds.`);
    client.user.setPresence({
        game: {
            name: 'ZY\'s bot'
        },
        status: 'idle'
    }).then(console.log).catch(console.error);
});

client.on('message', async msg => {
    if (!msg.channel.type === "text") return;
    if (!msg.guild) return;
    if (msg.content.indexOf(prefix) !== 0) return;
    if (msg.author.id === "456001047756800000") {
        userCooldown.status[msg.author.id] = 0;
        userCooldown.playerinfo[msg.author.id] = 0;
    }
    const args = msg.content.slice(1).trim().split(/ +/g);
    const command = args.shift().toLowerCase();
    if (msg.channel.id === "642988383626592286" || msg.channel.id === "642993162943725568") {
        if (command === "test") {
            msg.channel.send("TESTING COMMAND.  Arguments: " + args.join(", "));
            console.log(`${msg.author.username} requested test!`);
            msg.delete();
        }
    }
});

client.login(process.env.TOKEN);
