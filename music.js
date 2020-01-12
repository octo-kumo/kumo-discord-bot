const Discord = require('discord.js');
const config = require('./config.js').config;
const yts = require('yt-search');
const ytdl = require('ytdl-core');

const streamOptions = {
    volume: 1,
    bitrate: 'auto'
};
const ytdlOptions = {
    quality: 'highestaudio',
    filter: 'audioonly'
};
const queues = {};

exports.handleCommand = async (args, msg, prefix) => {
    console.log("running music sub-command");
    if (args.length === 0) return msg.channel.send("> **Ancient Magic** _are not for the eyes of mortals!_");
    switch (args.shift()) {
        case "play":
            await play(args, msg);
            break;
        case "skip":
            skip(msg);
            break;
        case "stop":
            stop(msg);
            break;
        case "pause":
            pause(msg);
            break;
        case "resume":
            resume(msg);
            break;
        case "queue":
        case "q":
        case "list":
            list(msg);
            break;
    }
    console.log("music sub-command finished");
}

async function play(args, msg) {
    if (args.length === 0)
        if (!queues[msg.guild.id]) return msg.reply('You command went straight through me');
        else return resume(msg);
    const voiceChannel = msg.member.voiceChannel;
    if (!voiceChannel) return msg.reply('I don\'t see you');
    if (msg.client.voiceConnections.get(msg.guild.id) && msg.client.voiceConnections.get(msg.guild.id).channel.id !== voiceChannel.id) return msg.reply('I am busy, come to #' + msg.client.voiceConnections.get(msg.guild.id).channel.name);
    const permissions = voiceChannel.permissionsFor(msg.client.user);
    if (!permissions.has('CONNECT') || !permissions.has('SPEAK')) return msg.reply('Your room seems to be air tight.');
    let queue = queues[msg.guild.id];
    let song = await search(args.join(" "));
    if (!queue) {
        queues[msg.guild.id] = queue = {
            textChannel: msg.channel,
            voiceChannel: voiceChannel,
            connection: await voiceChannel.join(),
            songs: [song],
            playing: true,
        };
        progressQueue(msg.guild, queue.songs[0]);
    } else {
        msg.channel.send("Song \"**" + song.title + "**\" has been added to the queue :notes:");
        if (!queue.connection) queue.connection = await voiceChannel.join();
        if (!queue.playing) queue.playing = true;
        queue.songs.push(song);
    }
    msg.channel.send(genVideoEmbed(song));
}

function progressQueue(guild, song) {
    const queue = queues[guild.id];
    console.log("progressQueue()");
    if (!song) {
        console.log("No more songs!");
        queue.textChannel.send("_Bye~_");
        queue.voiceChannel.leave();
        delete queues[guild.id];
        return;
    }
    queue.textChannel.send("Onto **" + song.title + "** :notes:");
    console.log('Playing ' + song.title);
    const dispatcher = queue.connection.playStream(ytdl(song.url, ytdlOptions)).on('end', () => {
        console.log('Music ended!');
        queue.songs.shift();
        progressQueue(guild, queue.songs[0]);
    }).on('error', error => {
        console.error(error);
    });
}

function list(msg) {
    let queue = queues[msg.guild.id];
    let embed = new Discord.RichEmbed();
    embed.setTitle("Queue");
    let finalText = [];
    for (let i = 0; i < queue.songs.length; i++) {
        finalText.push('#' + ((i + 1) + "").padStart(3, ' ') + " " + queue.songs[i].title + " (" + queue.songs[i].timestamp + ")");
    }
    embed.setDescription("```\n" + finalText.join("\n") + "\n```");
    embed.setFooter("Total " + queue.songs.length + " songs");
    msg.channel.send(embed);
}

function skip(msg) {
    let queue = queues[msg.guild.id];
    if (!msg.member.voiceChannel) return msg.channel.send('You are not in a voice channel, lol');
    if (!queue) return message.channel.send(':person_shrugging: There aren\'t any to begin with.');
    queue.connection.dispatcher.end();
}

function stop(msg) {
    let queue = queues[msg.guild.id];
    if (!msg.member.voiceChannel) return msg.channel.send('You are not in a voice channel, lol');
    queue.songs = [];
    queue.connection.dispatcher.end();
}

function pause(msg) {
    let queue = queues[msg.guild.id];
    if (!queue) return msg.channel.send('You are not in a voice channel, lol');
    queue.playing = false;
    queue.connection.dispatcher.pause();
}

function resume(msg) {
    let queue = queues[msg.guild.id];
    if (!queue) return msg.channel.send('You are not in a voice channel, lol');
    queue.playing = true;
    queue.connection.dispatcher.resume();
}

function search(query) {
    return new Promise((resolve, reject) => {
        yts(query, function(err, r) {
            if (err) reject(err);
            else resolve(r.videos[0]);
        });
    });
}

function genVideoEmbed(video) {
    const embed = new Discord.RichEmbed();
    embed.setTitle(video.title);
    embed.setDescription(video.description);
    embed.addField("Duration", video.timestamp, true);
    embed.addField("Views", nicelyFormatLargeNumber(video.views), true);
    embed.setURL(video.url);
    embed.setThumbnail(video.thumbnail);
    embed.setAuthor(video.author.name);
    embed.setColor(0xff0000);
    return embed;
}

const NUMBER_POSTFIXES = ['', 'k', 'm', 'g', 't', 'p', 'e', 'z', 'y'];

function nicelyFormatLargeNumber(number) {
    for (let i = 0; i < NUMBER_POSTFIXES.length; i++)
        if (number < Math.pow(10, i * 3 + 3)) return Math.floor(number / Math.pow(10, i * 3 - 1)) / 10 + NUMBER_POSTFIXES[i];
    return number;
}
