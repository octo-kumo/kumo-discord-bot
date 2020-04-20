const fetch = require('node-fetch');
const JSDOM = require('jsdom').JSDOM;
const Discord = require('discord.js');
const moment = require('moment');
const vega = require('vega');
const fs = require('fs');

let cacheDate = 0;
let cacheData = null;
let globalData = null;
let leaderBoard = null;

let cacheDateGoogle = 0;
let cacheDataGoogle = null;

let updatingMessage;

exports.update = async (channel) => {
    await refreshData();
    const region = "singapore";
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
    await refreshData();
    let region = args.join(" ").trim().toLowerCase();
    if (SHORT_NAMES[region]) region = SHORT_NAMES[region];
    if (region === "world" || region === "globe" || region === "global") {
        msg.channel.send(await generateRegionEmbed("The World", globalData, msg, true));
    } else {
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
    }
};

const SHORT_NAMES = {
    "uk": "united kingdom",
    "sg": "singapore"
}

const LONG_NAMES = {
    "United Kingdom": "UK"
}

async function generateRegionEmbed(location, region, msg, includeLeaderBoard) {
    const embed = new Discord.RichEmbed();
    embed.setColor(0x0074D9);
    if (msg) embed.setFooter("Query by " + msg.author.tag, msg.author.avatarURL);
    if (region) {
        let diff = 0;
        let today = null;
        let yesterday = null;
        while (!(today && yesterday)) {
            today = yesterday = null;
            let todayStr = moment().subtract(diff, 'days').format('YYYY-M-D');
            let yesterdayStr = moment().subtract(diff + 1, 'days').format('YYYY-M-D');
            for (let m of region) {
                if (!today && m.date === todayStr) today = m;
                else if (!yesterday && m.date === yesterdayStr) yesterday = m;
            }
            diff++;
        }
        if (today && yesterday) {
            let yesterdayActive = yesterday.confirmed - yesterday.deaths - yesterday.recovered;
            let todayActive = today.confirmed - today.deaths - today.recovered;
            let activeIncrease = todayActive - yesterdayActive;
            let confirmedIncrease = today.confirmed - yesterday.confirmed;
            let recoveredIncrease = today.recovered - yesterday.recovered;
            let deathIncrease = today.deaths - yesterday.deaths;

            embed.setTitle(location);
            embed.addField("Active", `**${numberWithSpace(todayActive)}** (${(activeIncrease<0?"":"+")+numberWithSpace(activeIncrease)})`, true);
            embed.addField("Total", `**${numberWithSpace(today.confirmed)}** (${(confirmedIncrease<0?"":"+")+numberWithSpace(confirmedIncrease)})`, true);
            embed.addField("Cured", `**${numberWithSpace(today.recovered)}** (${(recoveredIncrease<0?"":"+")+numberWithSpace(recoveredIncrease)})`, true);
            embed.addField("Dead", `**${numberWithSpace(today.deaths)}** (${(deathIncrease<0?"":"+")+numberWithSpace(deathIncrease)})`, true);
            embed.addField("Cured Rate", (today.recovered === 0 ? 0 : Math.round(today.recovered * 1000 / today.confirmed) / 10) + "%", true);
            embed.addField("Death Rate", (today.deaths === 0 ? 0 : Math.round(today.deaths * 1000 / today.confirmed) / 10) + "%", true);
            embed.attachFile(new Discord.Attachment(await drawGraph(location, region), "attachment.png"))
            embed.setImage("attachment://attachment.png")
            if (!msg) embed.setDescription("_This message is automatically updated every 1 hour_");
            else embed.setDescription("_Accurate as of_\n**" + moment(today.date, 'YYYY-M-D').format('D MMMM YYYY') + "**");
            if (includeLeaderBoard) {
                let desc = [];
                desc.push("#  " + "Region".padEnd(7, " ") + " " + "Cases".padStart(6, " ") + " " + "Dead".padStart(6, " ") + " " + "Heal".padStart(6, " "))
                for (let i = 0; i < 8; i++) {
                    desc.push(`#${(i+1)} ${(LONG_NAMES[leaderBoard[i].region]?LONG_NAMES[leaderBoard[i].region]:leaderBoard[i].region).padEnd(7," ")} ${formatNumber(leaderBoard[i].confirmed).padStart(6," ")} ${formatNumber(leaderBoard[i].deaths).padStart(6," ")} ${formatNumber(leaderBoard[i].recovered).padStart(6," ")}`);
                }
                embed.setDescription("Accurate as of **" + moment(today.date, 'YYYY-M-D').format('D MMMM YYYY') + "**\n" + "```" + desc.join("\n") + "```");
            }
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
    for (let i = 0; i < region.length; i++) {
        let day = region[i];
        if (day.confirmed === 0) continue;
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
        newDataArray.push({
            date: day.date.substring(5),
            value: i === 0 ? 0 : (day.confirmed - region[i - 1].confirmed),
            c: "New"
        });
    }
    return newDataArray;
}

async function refreshData() {
    const now = Date.now();
    if (now - cacheDate > 60000) { // 1 minute cache
        cacheDate = now;
        cacheData = await fetch('https://pomber.github.io/covid19/timeseries.json').then(res => res.json());
        let LATEST_DATA = await getLatestDataFromWikipedia();
        for (let data of LATEST_DATA) {
            if (!cacheData[data.country]) cacheData[data.country] = [];
            cacheData[data.country].push(data);
            delete data.country;
        }
        globalData = combineData();
        leaderBoard = compileLeaderboard();
    }
}

function combineData() {
    const global_data = {}; // days mapped by date
    const today = moment().format('YYYY-M-D');
    for (let key of Object.keys(cacheData)) {
        if (key === "World") continue;
        for (let day of cacheData[key]) {
            if (day.date === today) continue;
            if (!global_data[day.date]) {
                global_data[day.date] = {
                    confirmed: 0,
                    deaths: 0,
                    recovered: 0
                };
            }
            global_data[day.date].confirmed += day.confirmed;
            global_data[day.date].deaths += day.deaths;
            global_data[day.date].recovered += day.recovered;
        }
    }
    const global_array = [];
    for (let date of Object.keys(global_data)) {
        let day = global_data[date];
        global_array.push({
            date: date,
            confirmed: day.confirmed,
            deaths: day.deaths,
            recovered: day.recovered
        });
    }
    global_array.push(cacheData.World[0]);
    return global_array;
}

function compileLeaderboard() {
    let leaderBoard = [];
    for (let key of Object.keys(cacheData)) {
        if (key === "World") continue;
        let today = cacheData[key][cacheData[key].length - 1];
        leaderBoard.push({
            region: key,
            confirmed: today.confirmed,
            deaths: today.deaths,
            recovered: today.recovered
        });
    }
    leaderBoard.sort((a, b) => {
        if (a.confirmed < b.confirmed) return 1;
        else if (a.confirmed == b.confirmed) return 0;
        else return -1;
    });
    leaderBoard = leaderBoard.slice(0, 8);
    return leaderBoard;
}

function findWithDate(region, date) {
    for (let day of region) {
        if (day.date === date) return day;
    }
    return null;
}

const UNITS = ['k', 'm', 'b', 't', 'q', 'Q'];

function formatNumber(number) {
    if (number < 1000) return number.toString();
    let counter = 0;
    let base = 1000;
    while (number > 1000 * base) {
        base *= 1000;
        counter++;
    }
    return Number.parseFloat(number / base).toPrecision(4) + UNITS[counter];
}

function numberWithSpace(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

const WIKIPEDIA_TRANSLATION = {
    "United States": "US"
}

function getLatestDataFromWikipedia() {
    return fetch('https://en.wikipedia.org/wiki/Template:2019%E2%80%9320_coronavirus_pandemic_data')
        .then(res => res.text())
        .then(body => {
            const doc = new JSDOM(body).window.document;
            let rows = doc.querySelectorAll("#thetable tbody tr:not(.sortbottom)");
            let latestData = [];
            for (let row of rows) {
                if (row.classList.length !== 0) {
                    console.log("Skipping " + row.children[1].firstElementChild.textContent);
                    continue;
                }
                let totalRow = false;
                let countryName = row.children[1].firstElementChild.textContent.replace(/\s*\([^()]+\)\s*/g, '');
                if (WIKIPEDIA_TRANSLATION[countryName]) countryName = WIKIPEDIA_TRANSLATION[countryName];
                if (totalRow = row.firstElementChild.classList.contains("covid-total-row")) countryName = "World";

                let confirmedStr = row.children[2 - (totalRow ? 1 : 0)].textContent.replace(/[^\d]/g, '').trim();
                let deathsStr = row.children[3 - (totalRow ? 1 : 0)].textContent.replace(/[^\d]/g, '').trim();
                let recoveredStr = row.children[4 - (totalRow ? 1 : 0)].textContent.replace(/[^\d]/g, '').trim();
                let dayBefore = cacheData[countryName] ? cacheData[countryName][cacheData[countryName].length - 1] : {
                    date: moment().format('YYYY-M-D'),
                    confirmed: 0,
                    deaths: 0,
                    recovered: 0
                };
                latestData.push({
                    country: countryName,
                    date: moment().format('YYYY-M-D'),
                    confirmed: confirmedStr ? parseInt(confirmedStr) : dayBefore.confirmed,
                    deaths: deathsStr ? parseInt(deathsStr) : dayBefore.deaths,
                    recovered: recoveredStr ? parseInt(recoveredStr) : dayBefore.recovered
                });
            }
            return latestData;
        });
}
