const {
    URL,
    URLSearchParams
} = require('url');
const moment = require('moment');
const fetch = require('node-fetch');
const Discord = require('discord.js');

const API_URL = "https://api.jikan.moe/v3";
const SUPPORTED_TYPES = ["tv", "manga", "ova", "novel", "movie", "oneshot", "special", "doujin", "ona", "manhwa", "music", "manhua"];

function search(q, type = "anime", page = 1) {
    var url = new URL(API_URL + "/search/" + type);
    var params = {
        q: q && q.trim().length !== 0 ? q : undefined,
        page: page
    }
    url.search = new URLSearchParams(params).toString();
    return fetch(url).then(res => res.json());
}

function anime(id) {
    return fetch(API_URL + "/anime/" + id).then(res => res.json());
}

exports.handleCommand = (args, msg, prefix) => {
    if (args.length === 0) return msg.reply(`Correct Usage: \`${prefix}anime (action)? (type)? name?\`\nFor supported params: \`${prefix}anime types|actions\``);
    switch (args[0]) {
        case "search":
        case "s":
            args.shift();
            handleSearch(args, msg).then(e => msg.channel.send(e));
            break;
        case "actions":
            msg.channel.send("Supported Actions\n```search```");
            break;
        case "types":
            msg.channel.send("Supported Types\n```" + SUPPORTED_TYPES.join(" ") + "```");
            break;
        default:
            handleSearch(args, msg).then(e => msg.channel.send(e));
            break;
    }
};

const RESULT_CACHE = {};
const RESULT_CACHE_MESSAGE = {};
async function handleSearch(args, msg) {
    if (RESULT_CACHE_MESSAGE[msg.channel.id]) RESULT_CACHE_MESSAGE[msg.channel.id].delete();
    let results;
    if (SUPPORTED_TYPES.includes(args[0])) results = await search(args.slice(1).join(" "), args[0]);
    else if (isNaN(args[0])) results = await search(args.join(" "));
    else {
        results = RESULT_CACHE[msg.channel.id];
        msg.channel.send(sendAnime(await anime(results.results[parseInt(args[0]) - 1].mal_id)));
        return;
    }
    RESULT_CACHE[msg.channel.id] = results;
    RESULT_CACHE_MESSAGE[msg.channel.id] = await msg.channel.send(sendSearchResult(results.results));
}

function sendSearchResult(results) {
    const embed = new Discord.RichEmbed();
    embed.setTitle("Search Results");
    embed.setColor(0x007FFF);
    embed.setDescription(results.slice(0, 8).map((result, i) =>
        `**#${i+1} ${result.title}**`
        //+ `\n**[${result.rated}]** ${result.type} ${result.airing?"**Airing** ":""}: ${result.episodes} Episodes : \`${result.score}/10\``
    ).join("\n"));
    embed.setFooter("More details with `!anime [index]`");
    return embed;
}

function sendAnime(anime) {
    const embed = new Discord.RichEmbed();
    embed.setColor(0x007FFF);
    embed.setTitle(anime.title_japanese + '\n' + anime.title);
    embed.setURL(anime.url);
    embed.setThumbnail(anime.image_url);

    embed.addField("Rank", "**#" + anime.rank + "**", true);
    embed.addField("Type", anime.type + " **[" + anime.rating.substring(0, anime.rating.indexOf(" ")) + "]**", true);
    embed.addField("Score", anime.score + "/10", true);

    embed.addField("Favorites", anime.favorites, true);
    embed.addField("Members", anime.members, true);
    embed.addField("Popularity", anime.popularity, true);

    embed.addField("Status", anime.status, true);
    if (anime.episodes && anime.episodes > 1) embed.addField("Episodes", anime.episodes, true);
    let start = anime.aired.from ? moment(anime.aired.from).format("MMM YYYY") : null;
    let end = anime.aired.to ? moment(anime.aired.to).format("MMM YYYY") : null;
    embed.addField("Aired", start === end || (!end) ? start ? start : "Unknown" : start + " → " + end, true);

    embed.addField("Producers", anime.producers.map(producer => producer.name).join(", "))
    embed.addField("Studios", anime.studios.map(studio => studio.name).join("\n"));
    embed.addField("Genres", anime.genres.map(genre => genre.name).join(" "));

    embed.addField("OP", anime.opening_themes.join("\n"));
    embed.addField("ED", anime.ending_themes.join("\n"));

    embed.setDescription(truncate(anime.synopsis));
    return embed;
}

const truncate = (input) => input.length > 400 ? `${input.substring(0, 400)}...` : input;
