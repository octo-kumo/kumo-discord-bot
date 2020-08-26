const Discord = require('discord.js');
const request = require('request');
const config = require('./config.js').config;
const options = {
    method: 'POST',
    url: 'https://api.waifulabs.com/generate',
    body: '{"step": 0}'
};
const book_filter = (reaction, user) => ['⬅️', '➡️', '❎'].includes(reaction.emoji.name) && user.id !== config.id;
const BOOKS = {};
exports.newBatch = msg => new Promise((resolve, reject) => {
    msg.channel.startTyping();
    request(options, (error, response, body) => {
        if (error) return reject(error);
        let girls = JSON.parse(body);
        let book = generateBook(girls.newGirls);
        sendBook(msg.channel, book).then(() => msg.channel.stopTyping());
    });
});

function sendBook(channel, book) {
    return channel.send(book.pages[book.page]).then(message => {
        BOOKS[message.id] = book;
        message.react('⬅️').then(() => message.react('➡️')).then(() => message.react('❎'));
        message.createReactionCollector(book_filter).on('collect', r => {
            if (!r) return;
            r.users.keyArray().filter(k => k !== config.id).forEach(k => r.remove(k));
            let name = r.emoji.name;
            if (r.emoji.name === '❎') return message.delete();
            let book = BOOKS[message.id];
            if (name === "⬅️" || name === "➡️") {
                let incre = name === "⬅️" ? -1 : 1;
                if ((book.page >= book.pages.length && incre === 1) || (book.page <= 0 && incre === -1)) return;
                book.page += incre;
                sendBook(channel, book, book.page);
                message.delete();
                delete BOOKS[message.id];
            }
        });
    });
}

function generateBook(girls) {
    let pages = [];
    for (let i = 0; i < 10; i++) {
        const image = girls[i].image;
        let attachment = new Discord.Attachment(Buffer.from(image, 'base64'), `image.png`);
        let imageEmbed = new Discord.RichEmbed();
        imageEmbed.setDescription('Waifu #' + (i + 1) + "\n```json\n" + JSON.stringify(girls[i].seeds) + "\n```")
            .setThumbnail(`attachment://image.png`);
        imageEmbed.attachFile(attachment);
        pages.push(imageEmbed);
    }
    return {
        pages: pages,
        page: 0
    };
}
