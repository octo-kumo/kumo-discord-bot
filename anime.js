const {
    URL,
    URLSearchParams
} = require('url');
const moment = require('moment');
const fetch = require('node-fetch');
const Discord = require('discord.js');

const API_URL = "https://api.jikan.moe/v3";
const SUPPORTED_TYPES = ["tv", "manga", "ova", "novel", "movie", "oneshot", "special", "doujin", "ona", "manhwa", "music", "manhua"];

function search(q, type, page = 1) {
    console.log("search", `"${q}"`, type, page);
    var url = new URL(API_URL + "/search/" + (SUPPORTED_TYPES.indexOf(type) % 2 === 0 ? "anime" : "manga"));
    var params = {
        q: q && q.trim().length !== 0 ? q : undefined,
        type: type && type.trim().length !== 0 ? type : undefined,
        page: page
    }
    url.search = new URLSearchParams(params).toString();
    console.log("final url =", url.href);
    return fetch(url).then(res => res.json());
}

let last_req = 0;

function anime(id) {
    last_req = Date.now();
    return fetch(API_URL + "/anime/" + id).then(res => res.json());
}

function manga(id) {
    last_req = Date.now();
    return fetch(API_URL + "/manga/" + id).then(res => res.json());
}

exports.handleCommand = async (args, msg, prefix) => {
    if (args.length === 0) return msg.reply(`Correct Usage: \`${prefix}anime (action)? (type)? name?\`\nFor supported params: \`${prefix}anime types|actions\``);
    console.log("running anime sub-module... args =", args);
    try {
        switch (args[0]) {
            case "search":
            case "s":
                args.shift();
                await handleSearch(args, msg);
                break;
            case "actions":
                msg.channel.send("Supported Actions\n```search```");
                break;
            case "types":
                msg.channel.send("Supported Types\n```" + SUPPORTED_TYPES.join(" ") + "```");
                break;
            default:
                await handleSearch(args, msg);
                break;
        }
        console.log("complete.");
    } catch (err) {
        msg.channel.send("I went off into the abyss");
        console.log(err);
    }
};

const RESULT_CACHE = {};
const RESULT_CACHE_MESSAGE = {};
async function handleSearch(args, msg) {
    if (Date.now() - last_req < 2000) return msg.reply("Please wait " + (Date.now() - last_req) + "ms.");

    if (RESULT_CACHE_MESSAGE[msg.channel.id]) {
        await RESULT_CACHE_MESSAGE[msg.channel.id].delete();
        delete RESULT_CACHE_MESSAGE[msg.channel.id];
    }
    let results;
    if (SUPPORTED_TYPES.includes(args[0])) results = await search(args.slice(1).join(" "), args[0]);
    else if (isNaN(args[0]) || !RESULT_CACHE[msg.channel.id]) results = await search(args.join(" "));
    else {
        console.log("selecting anime from list");
        results = RESULT_CACHE[msg.channel.id];
        let result = results.results[parseInt(args[0]) - 1];
        if (result.type === "Anime") await msg.channel.send(sendAnime(await anime(result.mal_id)));
        else if (result.type === "Manga") await msg.channel.send(sendManga(await manga(result.mal_id)));
        else await msg.channel.send("_Not supported yet!_");
        return;
    }
    console.log("sending list");
    RESULT_CACHE[msg.channel.id] = results;
    RESULT_CACHE_MESSAGE[msg.channel.id] = await msg.channel.send(sendSearchResult(results.results));
}

function sendSearchResult(results) {
    const embed = new Discord.RichEmbed();
    embed.setTitle("Search Results");
    embed.setColor(0x007FFF);
    if (results && results.length > 0) embed.setDescription(results.slice(0, 8).map((result, i) =>
        `**#${i+1} ${result.title}**`
        //+ `\n**[${result.rated}]** ${result.type} ${result.airing?"**Airing** ":""}: ${result.episodes} Episodes : \`${result.score}/10\``
    ).join("\n"));
    else embed.setDescription("_No results found_");
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

function sendManga(manga) {
    const embed = new Discord.RichEmbed();
    embed.setColor(0x007FFF);
    embed.setTitle(manga.title_japanese + '\n' + manga.title);
    embed.setURL(manga.url);
    embed.setThumbnail(manga.image_url);

    embed.addField("Rank", "**#" + manga.rank + "**", true);
    embed.addField("Type", manga.type, true);
    embed.addField("Score", manga.score + "/10", true);

    embed.addField("Favorites", manga.favorites, true);
    embed.addField("Members", manga.members, true);
    embed.addField("Popularity", manga.popularity, true);

    embed.addField("Status", manga.status, true);
    if (manga.volumes && manga.volumes > 1) embed.addField("Volumes", manga.volumes, true);
    embed.addField("Chapters", manga.chapters || "Unknown", true);
    let start = manga.published.from ? moment(manga.published.from).format("MMM YYYY") : null;
    let end = manga.published.to ? moment(manga.published.to).format("MMM YYYY") : null;
    embed.addField("Published", start === end || (!end) ? start ? start : "Unknown" : start + " → " + end, true);

    embed.addField("Authors", manga.authors.map(author => author.name).join("\n"));
    embed.addField("Genres", manga.genres.map(genre => genre.name).join(" "));
    Object.keys(manga.related).forEach(key => {
        embed.addField(key, manga.related[key].map(obj => obj.url ? `[${obj.name}](${obj.url})` : obj.name));
    });
    embed.setDescription(truncate(manga.synopsis));
    return embed;
}

const truncate = (input) => input.length > 400 ? `${input.substring(0, 400)}...` : input;
