const gplay = require('google-play-scraper');
exports.init = async function (channel) {
    await update(channel);
    setInterval(() => update(channel), 3600000);
}

async function update(channel) {
    let data = await gplay.app({appId: 'com.miHoYo.GenshinImpact'});
    let pack = [data.score, data.ratings, data.reviews, ...Object.entries(data.histogram).sort((a, b) => a[0].localeCompare(b[0])).map(a => a[1]), data.maxInstalls];
    channel.send(JSON.stringify(pack));
}

const fetchAll = require('discord-fetch-all');
const Discord = require("discord.js");
const fs = require("fs");
const vega = require("vega");
let DATA = require("../output.json");
exports.collect = function () {
    return new Promise(resolve => {
        const client = new Discord.Client();
        client.on('ready', async () => {
            let channel = await client.channels.fetch('892795902186639460');
            const allMessages = await fetchAll.messages(channel, {
                reverseArray: true, // Reverse the returned array
                userOnly: false, // Only return messages by users
                botOnly: true, // Only return messages by bots
                pinnedOnly: false, // Only returned pinned messages
            });
            let l = allMessages.map(msg => ({
                id: msg.id,
                date: msg.createdTimestamp,
                data: JSON.parse(msg.content)
            }))
            console.log("Collected " + l.length + " data points");
            DATA = l;
            fs.writeFileSync("output.json", JSON.stringify(l));
            resolve();
        });
        client.login(process.env.TOKEN).then(() => console.log("Logged In"));
    })
}

function extractCount(DATA) {
    let final = [];
    for (let i = 0; i < 5; i++)
        DATA.forEach(p => {
            final.push({g: (i + 1) + "*", c: p.data[3 + i], d: p.date});
        })
    return final;
}

function extractRating(DATA) {
    let final = [];
    DATA.forEach(p => {
        final.push({c: p.data[0], d: p.date});
    })
    return final;
}

exports.draw = async function () {
    await drawComp();
    await drawRating();
    await drawComp(true);
    await drawRating(true);
    console.log("Fetched");
}

function drawComp(zh) {
    const GRAPH_SPECS = require(`../json/gplay-comp-chart${zh ? ".zh" : ""}.json`);
    GRAPH_SPECS.data[0].values = extractCount(DATA);
    GRAPH_SPECS.width = 1920;
    GRAPH_SPECS.height = 1080;
    const view = new vega.View(vega.parse(GRAPH_SPECS), {});
    return view.toCanvas().then(async function (canvas) {
        fs.writeFileSync(`composition${zh ? ".zh" : ""}.png`, await canvas.toBuffer("image/png"));
    }).catch(function (err) {
        console.error(err);
    });
}

function drawRating(zh) {
    const GRAPH_SPECS = require(`../json/gplay-rating-chart${zh ? ".zh" : ""}.json`);
    GRAPH_SPECS.data[0].values = extractRating(DATA);
    GRAPH_SPECS.width = 1920;
    GRAPH_SPECS.height = 1080;
    fs.writeFileSync("test.json", JSON.stringify(GRAPH_SPECS));
    const view = new vega.View(vega.parse(GRAPH_SPECS), {});
    return view.toCanvas().then(async function (canvas) {
        fs.writeFileSync(`rating${zh ? ".zh" : ""}.png`, await canvas.toBuffer("image/png"));
    }).catch(function (err) {
        console.error(err);
    });
}