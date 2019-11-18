<div align="center">
    <br />
    <p>
        <a href="https://discord.gg/p895czC">
            <img src="https://discordapp.com/api/guilds/240059867744698368/embed.png" alt="Discord server" />
        </a>
        <a href="https://www.npmjs.com/package/azurlane">
            <img src="https://img.shields.io/npm/v/azurlane.svg?maxAge=3600" alt="NPM version" />
        </a>
        <a href="https://www.npmjs.com/package/azurlane">
            <img src="https://img.shields.io/npm/dt/azurlane.svg?maxAge=3600" alt="NPM downloads" />
        </a>
        <a href="https://david-dm.org/KurozeroPB/azurlane">
            <img src="https://img.shields.io/david/kurozeropb/azurlane.svg?maxAge=3600" alt="Dependencies" />
        </a>
        <a href="https://www.patreon.com/Kurozero">
            <img src="https://img.shields.io/badge/donate-patreon-F96854.svg" alt="Patreon" />
        </a>
    </p>
    <p>
        <a href="https://nodei.co/npm/azurlane/">
            <img src="https://nodei.co/npm/azurlane.png?downloads=true&stars=true" alt="NPM info" />
        </a>
    </p>
</div>

# AzurLane
Api wrapper for my azur lane api

## Example
```js
const { AzurLane, Order } = require("azurlane");
const azurlane = new AzurLane();

async function main() {
    // Get specific ship by name, in this case "Akagi"
    const ship = await azurlane.getShipByName("Akagi");
    console.log(`${ship.names.en}'s rarity is ${ship.rarity}`); // IJN Akagi's rarity is Super Rare

    // Get an array of ships with rarity "Super Rare"
    const ships = await azurlane.getShips(Order.RARITY, "Super Rare");
    for (let i = 0; i < ships.length; i++) {
        console.log(`[${ships[i].id}] = ${ships[i].name}`); // [036] = San Diego
    }
}

// Also catches any api errors that might occur like 400, 429, 500 http errors
// Api errors extend the default error class, have a look at https://kurozeropb.github.io/AzurLane/classes/apierror.html for information
main().catch(console.error);
```

## Docs
- Module Docs: https://kurozeropb.github.io/AzurLane/
- Api Docs: https://kurozeropb.github.io/al-api/

I recommend looking at the api docs to see what data is returned before spamming the api with useless requests only to see what it actually returns.

## Support
![discord](https://discordapp.com/api/v6/guilds/240059867744698368/widget.png?style=banner2)