const fetch = require('node-fetch');
const Discord = require('discord.js');
const moment = require('moment');
const vega = require('vega');
const fs = require('fs');

let cacheDate = 0;
let cacheData = null;

let cacheDateGoogle = 0;
let cacheDataGoogle = null;

let updatingMessage;

exports.update = async (channel) => {
    const now = Date.now();
    const region = "singapore";
    if (now - cacheDate > 60000) { // 1 minute cache
        cacheDate = now;
        cacheData = await fetch('https://pomber.github.io/covid19/timeseries.json').then(res => res.json());
    }
    let found = null;
    let location = null;
    for (let key of Object.keys(cacheData)) {
        if (key.toLowerCase().includes(region)) {
            found = cacheData[key];
            location = key;
            break;
        }
    }
    if (!updatingMessage || updatingMessage.deleted) updatingMessage = await channel.send(await generateRegionEmbed(location, found));
    else updatingMessage.edit(await generateRegionEmbed(location, found));
};

exports.handleCommand = async (args, msg, PREFIX) => {
    console.log("Running COVID sub-system. args = " + args);
    if (args.length === 0) args = ['SINGAPORE'];
    const now = Date.now();
    if (now - cacheDate > 60000) { // 1 minute cache
        cacheDate = now;
        cacheData = await fetch('https://pomber.github.io/covid19/timeseries.json').then(res => res.json());
    }
    const region = args.join(" ").trim().toLowerCase();
    console.log("COVID: Requested region = " + region);
    let found = null;
    let location = null;
    for (let key of Object.keys(cacheData)) {
        if (key.toLowerCase() === region) {
            found = cacheData[key];
            location = key;
            break;
        }
    }
    if (!found)
        for (let key of Object.keys(cacheData)) {
            if (key.toLowerCase().includes(region)) {
                found = cacheData[key];
                location = key;
                break;
            }
        }
    msg.channel.send(await generateRegionEmbed(location, found, msg));
};

const generateRegionEmbed = async (location, region, msg) => {
    const embed = new Discord.RichEmbed();
    embed.setColor(0x0074D9);
    if (msg) embed.setFooter("Query by " + msg.author.tag, msg.author.avatarURL);
    if (region) {
        let todayStr = moment().subtract(1, 'days').format('YYYY-M-D');
        let yesterdayStr = moment().subtract(2, 'days').format('YYYY-M-D');
        let today = null;
        let yesterday = null;
        for (let m of region) {
            if (!today && m.date === todayStr) today = m;
            else if (!yesterday && m.date === yesterdayStr) yesterday = m;
        }
        console.log("Today", today, "Yesterday", yesterday);
        if (today && yesterday) {
            let yesterdayActive = yesterday.confirmed - yesterday.deaths - yesterday.recovered;
            let todayActive = today.confirmed - today.deaths - today.recovered;
            let activeIncrease = todayActive - yesterdayActive;
            let confirmedIncrease = today.confirmed - yesterday.confirmed;
            let recoveredIncrease = today.recovered - yesterday.recovered;
            let deathIncrease = today.deaths - yesterday.deaths;

            embed.setTitle(location);
            embed.addField("Active", `**${todayActive}** ${(activeIncrease<0?"":"+")+activeIncrease}`, true);
            embed.addField("Total", `**${today.confirmed}** ${(confirmedIncrease<0?"":"+")+confirmedIncrease}`, true);
            embed.addField("Cured", `**${today.recovered}** ${(recoveredIncrease<0?"":"+")+recoveredIncrease}`, true);
            embed.addField("Dead", `**${today.deaths}** ${(deathIncrease<0?"":"+")+deathIncrease}`, true);
            embed.addField("Cured Rate", (today.recovered === 0 ? 0 : Math.round(today.recovered * 1000 / today.confirmed) / 10) + "%", true);
            embed.addField("Death Rate", (today.deaths === 0 ? 0 : Math.round(today.deaths * 1000 / today.confirmed) / 10) + "%", true);
            embed.attachFile(new Discord.Attachment(await drawGraph(location, region), "attachment.png"))
            embed.setImage("attachment://attachment.png")
            if (!msg) embed.setDescription("_This message is automatically updated every 1 hour_");
        } else {
            embed.setTitle("Waiting for Data")
                .setDescription("Newest data is yet to be released");
        }
    } else {
        embed.setTitle("Region not Found")
            .setDescription("Maybe use the region's proper name?");
    }
    return embed;
};

function drawGraph(location, region) {
    return new Promise((resolve, reject) => {
        const spec = JSON.parse(fs.readFileSync("line-chart.json"));
        spec.data[0].values = convertToData(region);
        spec.title.text = spec.title.text.replace("${{REGION_NAME}}", location);
        spec.title.subtitle = spec.title.subtitle.replace("${{REGION_NAME}}", location);
        var view = new vega.View(vega.parse(spec), {
            renderer: 'none'
        });
        view.toCanvas().then(function(canvas) {
            resolve(canvas.toBuffer("image/png"));
        }).catch(function(err) {
            console.error(err);
            reject(err);
        });
    });
}

function convertToData(region) {
    let newDataArray = [];
    for (let day of region) {
        newDataArray.push({
            date: day.date.substring(5),
            value: day.confirmed,
            c: "Confirmed"
        });
        newDataArray.push({
            date: day.date.substring(5),
            value: day.confirmed - day.deaths - day.recovered,
            c: "Active"
        });
        newDataArray.push({
            date: day.date.substring(5),
            value: day.deaths,
            c: "Deaths"
        });
        newDataArray.push({
            date: day.date.substring(5),
            value: day.recovered,
            c: "Recovered"
        });
    }
    return newDataArray;
}
