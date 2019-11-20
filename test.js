const azurlane = require("./azurlane.js");
azurlane.initiate().then(ships => azurlane.getShipByName("York")).then(ship => {
    console.log(JSON.stringify(ship));
});
