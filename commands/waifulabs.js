const Discord = require('discord.js');
const request = require('request');
const options = {
    method: 'POST',
    url: 'https://api.waifulabs.com/generate',
    body: '{"step": 0}'
};
const BOOK = {};
exports.newBatch = msg => {
    request(options, async (error, response, body) => {
        if (error) return console.log(error);
        let girls = JSON.parse(body);
        msg.channel.startTyping();
        for (let i = 0; i < girls.newGirls.length; i++) {
            const image = girls.newGirls[i].image;
            const attachment = new Discord.Attachment(Buffer.from(image, 'base64'), 'image.png');
            let imageEmbed = new Discord.RichEmbed();
            imageEmbed.setDescription('Waifu #' + (i + 1) + "\n```json\n" + JSON.stringify(girls.newGirls[i].seeds) + "\n```")
                .attachFile(attachment)
                .setThumbnail('attachment://image.png');
            await msg.channel.send(imageEmbed);
        }
        msg.channel.stopTyping();
    });
};
