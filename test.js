const {
    AzurLane,
    Category
} = require("azurlane");
const azurlane = new AzurLane();

async function main() {
    // Get specific ship by name, in this case "Akagi"
    const ship = await azurlane.getShipByName("hood");
    console.log(`${ship.names.en} = ${JSON.stringify(ship)}`); // IJN Akagi's rarity is Super Rare
    //
    // // Get an array of ships with rarity "Super Rare"
    // const ships = await azurlane.getShips(Category.RARITY, "Super Rare");
    // for (let i = 0; i < ships.length; i++) {
    //     console.log(`[${ships[i].id}] = ${ships[i].name}`); // [036] = San Diego
    // }
}

// Also catches any api errors that might occur like 400, 429, 500 http errors
// Api errors extend the default error class, have a look at https://kurozeropb.github.io/AzurLane/classes/apierror.html for information
main().catch(console.error);
