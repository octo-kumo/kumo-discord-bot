const fetch = require('node-fetch');
const Discord = require('discord.js');
const moment = require('moment');

let cacheDate = 0;
let cacheData = null;

exports.handleCommand = async (args, msg, PREFIX) => {
            console.log("Running COVID sub-system. args = " + args);
            if (args.length === 0) args = ['SINGAPORE'];
            const now = Date.now();
            if (now - cacheDate > 60000) { // 1 minute cache
                cacheDate = now;
                cacheData = await fetch('https://raw.githubusercontent.com/BlankerL/DXY-COVID-19-Data/master/json/DXYArea.json').then(res => res.json());
            }
            const region = args.join(" ").trim().toUpperCase();
            console.log("COVID: Requested region = " + region);
            let found = null;
            for (let r of cacheData.results) {
                if ((r.countryName && r.countryName.toUpperCase().includes(region)) ||
                    (r.countryEnglishName && r.countryEnglishName.toUpperCase().includes(region)) ||
                    (r.provinceName && r.provinceName.toUpperCase().includes(region)) ||
                    (r.provinceShortName && r.provinceShortName.toUpperCase().includes(region)) ||
                    (r.provinceEnglishName && r.provinceEnglishName.toUpperCase().includes(region))) {
                        found = r;
                        break;
                    }
                }
                regionFound(found, msg);
            };

            const regionFound = (r, msg) => {
                const embed = new Discord.RichEmbed();
                embed.setColor(0x0074D9);
                embed.setFooter("Query by " + msg.author.tag, msg.author.avatarURL);
                if (r) {
                    embed.setTitle(r.countryEnglishName + (r.countryEnglishName === r.provinceEnglishName ? "" : " (" + r.provinceEnglishName + ")"));
                    embed.addField("Active", r.currentConfirmedCount, true);
                    embed.addField("Total", r.confirmedCount, true);
                    embed.addField("Cured", r.curedCount, true);
                    embed.addField("Dead", r.deadCount, true);
                    embed.addField("Cured Rate", (r.curedCount === 0 ? 0 : Math.round(r.curedCount * 1000 / r.confirmedCount) / 10) + "%", true);
                    embed.addField("Death Rate", (r.deadCount === 0 ? 0 : Math.round(r.deadCount * 1000 / r.confirmedCount) / 10) + "%", true);
                } else {
                    embed.setTitle("Region not Found")
                        .setDescription("Maybe use the region's proper name?");
                }
                msg.channel.send(embed);
            };
