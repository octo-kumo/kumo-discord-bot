const gplay = require('google-play-scraper');
exports.init = async function (channel) {
    await update(channel);
    setInterval(() => update(channel), 60000);
}

async function update(channel) {
    let data = await gplay.app({appId: 'com.miHoYo.GenshinImpact'});
    let pack = [data.score, data.ratings, data.reviews, ...Object.entries(data.histogram).sort((a, b) => a[0].localeCompare(b[0])).map(a => a[1])];
    channel.send(JSON.stringify(pack));
}