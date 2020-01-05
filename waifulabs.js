const Discord = require('discord.js');
const request = require('request');
const config = require('./config.js').config;
var options = {
    method: 'POST',
    url: 'https://api.waifulabs.com/generate',
    body: '{"step": 0}'
};
const BOOK = {};
exports.newBatch = msg => {
    request(options, function(error, response, body) {
        if (error) return console.log(error);
        let girls = JSON.parse(body);
        for (let i = 0; i < girls.newGirls.length; i++) {
            const image = 'data:image/gif;base64,' + girls.newGirls[i].image;
            const attachment = new Discord.Attachment(new Buffer(image, 'base64'), 'image.png');
            let imageEmbed = new Discord.RichEmbed();
            imageEmbed.setTitle('Waifu #' + (i + 1))
                .attachFiles([attachment])
                .setImage('attachment://image.png');
            msg.channel.send()
        }
    });
};
