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
const search_results = {};

exports.handleCommand = async (args, msg, prefix) => {
    console.log("running music sub-command");
    if (args.length === 0) return msg.channel.send("> **Ancient Magic** _are not for the eyes of mortals!_");
    switch (args.shift()) {
        case "p":
        case "play":
            await play(args, msg);
            break;
        case "im":
        case "import":
        case "playlist":
            await importList(args, msg);
            break;
        case "np":
        case "status":
            np(msg);
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
        case "shuffle":
        case "sf":
        case "shfl":
            shuffle(msg);
            break;
        case "loop":
            queues[msg.guild.id].looping = !queues[msg.guild.id].looping;
            msg.reply("Looping = `" + queues[msg.guild.id].looping + "`");
            break;
    }
    console.log("music sub-command finished");
}

async function play(args, msg) {
    if (args.length === 0) return resume(msg);

    const voiceChannel = msg.member.voiceChannel;
    if (!voiceChannel) return msg.reply('I don\'t see you');
    if (msg.client.voiceConnections.get(msg.guild.id) && msg.client.voiceConnections.get(msg.guild.id).channel.id !== voiceChannel.id) return msg.reply('I am busy, come to #' + msg.client.voiceConnections.get(msg.guild.id).channel.name);
    const permissions = voiceChannel.permissionsFor(msg.client.user);
    if (!permissions.has('CONNECT') || !permissions.has('SPEAK')) return msg.reply('Your room seems to be air tight.');

    let query = args.join(" ");
    if (isNaN(query)) {
        let songs = (await search(query)).slice(0, 5);
        if (songs.length > 1) {
            search_results[msg.guild.id] = songs;
            return msg.channel.send("Search Results for `" + query + "`\n```\n" + [...Array(songs.length).keys()].map(i => "#" + (i + 1) + ": " + songs[i].title + " " + songs[i].timestamp).join("\n") + "\n```");
        } else if (songs.length === 1) {
            playSong(voiceChannel, songs[0], msg);
        } else return msg.channel.send("No songs found");
    } else {
        if (!search_results[msg.guild.id]) return msg.reply("Erm, ok?");
        if (search_results[msg.guild.id].length === 0) return msg.reply("No search history")
        let target = parseInt(query) - 1;
        if (target < 0 || target >= search_results[msg.guild.id].length) {
            return msg.channel.send("Between 1 and " + search_results[msg.guild.id].length + " please.");
        }
        playSong(voiceChannel, search_results[msg.guild.id][target], msg);
        search_results[msg.guild.id] = null;
    }
}

async function playSong(voiceChannel, song, msg, suppress) {
    let queue = queues[msg.guild.id];
    if (!queue) {
        queues[msg.guild.id] = {
            textChannel: msg.channel,
            voiceChannel: voiceChannel,
            connection: await voiceChannel.join(),
            songs: [song],
            index: 0,
            playing: true,
            looping: false
        };
        await progressQueue(msg.guild);
    } else {
        if (!suppress) msg.channel.send("Song \"**" + song.title + "**\" has been added to the queue :notes:");
        if (!queue.connection) queue.connection = await voiceChannel.join();
        if (!queue.playing) queue.playing = true;
        queue.songs.push(song);
    }
}

async function importList(args, msg) {
    if (args.length === 0) return msg.reply("Looking for something?");

    const voiceChannel = msg.member.voiceChannel;
    if (!voiceChannel) return msg.reply('I don\'t see you');
    if (msg.client.voiceConnections.get(msg.guild.id) && msg.client.voiceConnections.get(msg.guild.id).channel.id !== voiceChannel.id) return msg.reply('I am busy, come to #' + msg.client.voiceConnections.get(msg.guild.id).channel.name);
    const permissions = voiceChannel.permissionsFor(msg.client.user);
    if (!permissions.has('CONNECT') || !permissions.has('SPEAK')) return msg.reply('Your room seems to be air tight.');

    let listId = args[0].replace(/.+[&?]list=([^&]+).*/i, '$1');
    if (!listId) return msg.reply("Use play list link plz");
    yts({
        listId: listId
    }, async function (err, r) {
        if (!r) msg.reply("Nothing received.");
        try {
            msg.channel.send("Importing《" + r.title + "》 by " + r.author.name + " of " + r.videoCount + " songs");
            r.items[0].infoNotLoaded = true;
            await playSong(voiceChannel, r.items[0], msg, true);
            let queue = queues[msg.guild.id];
            for (let i = 1; i < r.items.length; i++) {
                r.items[i].infoNotLoaded = true;
                queue.songs.push(r.items[i]);
            }
        } catch (err) {
        }
    });
}

async function progressQueue(guild) {
    const queue = queues[guild.id];
    if (!queue) return;
    console.log("progressQueue()");
    let song = queue.songs[queue.index];
    if (!song) {
        if (queue.looping && queue.index !== 0) {
            console.log("Looping");
            queue.index = 0;
            await progressQueue(guild);
            return;
        } else {
            console.log("No more songs!");
            queue.textChannel.send("_Bye~_");
            queue.voiceChannel.leave();
            delete queues[guild.id];
            return;
        }
    }
    try {
        if (song.infoNotLoaded) song = queue.songs[0] = queues[guild.id].songs[0] = await getVideo(song.videoId);
        queue.textChannel.send("Playing **" + song.title + "** :notes:", genVideoEmbed(song));
        queue.connection.playStream(ytdl(song.url, ytdlOptions)).on('end', () => {
            queue.index++;
            progressQueue(guild);
        }).on('error', error => {
            console.error(error);
        });
    } catch (err) {
        console.log("\n\n", err, "\n\n");
    }
}

function getVideo(id) {
    return new Promise((resolve, reject) => {
        yts({
            videoId: id
        }, function (err, video) {
            if (err) reject(err);
            else resolve(video);
        });
    });
}

function list(msg) {
    let queue = queues[msg.guild.id];
    if (!queue) return msg.channel.send("_No Song No Life_");
    let embed = new Discord.RichEmbed();
    embed.setTitle("Queue");
    embed.setColor(0x99ccff);
    let finalText = [];
    let total = 0;
    for (let i = 0; i < queue.songs.length; i++) {
        total += queue.songs.seconds;
        if (i > 9) continue;
        finalText.push('#' + ((i + 1) + '').padStart(3, ' ') + " " + queue.songs[i].title + " (" + queue.songs[i].timestamp + ")");
    }
    if (queue.songs.length > 10) finalText.push("And " + (queue.songs.length - 10) + " more!");
    embed.setDescription("```\n" + finalText.join("\n") + "\n```");
    embed.setFooter("Total " + queue.songs.length + " songs");
    msg.channel.send(embed);
}

async function shuffle(msg) {
    let queue = queues[msg.guild.id];
    if (!queue) return msg.channel.send("_No Song No Life_");
    queue.songs = [queue.songs[0]].concat(shuffleArray(queue.songs.slice(1)));
    msg.channel.send("Shuffled!");
}

function shuffleArray(array) {
    let currentIndex = array.length,
        temporaryValue, randomIndex;
    while (0 !== currentIndex) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }
    return array;
}

function np(msg) {
    let queue = queues[msg.guild.id];
    if (!msg.member.voiceChannel) return msg.channel.send('You are not in a voice channel, lol');
    if (!queue) return msg.channel.send('Nothing is playing');
    console.log("Stream Time: " + queue.connection.dispatcher.time);
    return msg.channel.send(genVideoEmbed(queue.songs[0], queue.connection.dispatcher.time));
}

function skip(msg) {
    let queue = queues[msg.guild.id];
    if (!msg.member.voiceChannel) return msg.channel.send('You are not in a voice channel, lol');
    if (!queue) return msg.channel.send(':person_shrugging: There aren\'t any to begin with.');
    queue.connection.dispatcher.end();
}

function stop(msg) {
    let queue = queues[msg.guild.id];
    if (!queue) return msg.channel.send('Nothing yet');
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
    if (ytdl.validateURL(query) || ytdl.validateID(query)) return new Promise((resolve, reject) => {
        yts({
            pageStart: 1,
            pageEnd: 1,
            videoId: ytdl.getVideoID(query)
        }, function (err, video) {
            if (err) reject(err);
            else resolve([video]);
        });
    });
    else return new Promise((resolve, reject) => {
        yts(query, function (err, r) {
            if (err) reject(err);
            else resolve(r.videos);
        });
    });
}

function genVideoEmbed(video, playingTime) {
    console.log("genVideoEmbed()");
    const embed = new Discord.RichEmbed();
    embed.setTitle(video.title);
    embed.setDescription(video.description);
    embed.addField("Duration", (playingTime ? getTimeStamp(playingTime) + "/" : "") + video.timestamp, true);
    embed.addField("Views", nicelyFormatLargeNumber(video.views), true);
    embed.setURL(video.url);
    embed.setThumbnail(video.thumbnail);
    embed.setAuthor(video.author.name);
    embed.setColor(0xff0000);
    return embed;
}

function getTimeStamp(millis) {
    if (millis < 1) return "0:00";
    let totalSeconds = Math.round(millis / 1000);
    let totalMinutes = Math.floor(totalSeconds / 60);
    let totalHours = Math.floor(totalMinutes / 60);
    totalSeconds = totalSeconds % 60;
    totalMinutes = totalMinutes > 0 ? totalMinutes % 60 : 0;
    return (totalHours > 0 ? totalHours + ":" : "") + (totalMinutes + "").padStart(totalHours > 0 ? 2 : 1, '0') + ":" + (totalSeconds + "").padStart(2, '0');
}

const NUMBER_POSTFIXES = ['', 'k', 'm', 'g', 't', 'p', 'e', 'z', 'y'];

function nicelyFormatLargeNumber(number) {
    for (let i = 0; i < NUMBER_POSTFIXES.length; i++)
        if (number < Math.pow(10, i * 3 + 3)) return Math.floor(number / Math.pow(10, i * 3 - 1)) / 10 + NUMBER_POSTFIXES[i];
    return number;
}
