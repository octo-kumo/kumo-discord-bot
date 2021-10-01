const gRating = require('./commands/genshinRating');
gRating.collect().then(r => {
    console.log("Fetched");
    return gRating.draw();
}).then(r => console.log("All Done!"));