import assert from "assert";
import AzurLane from "../../lib";

describe("AzurLane", function() {
    const azurlane = new AzurLane();
    assert(azurlane instanceof AzurLane, "azurlane did not construct properly");

    describe("#getShipByName()", function() {
        it("should resolve to an object", async function() {
            const data = await azurlane.getShipByName("Akagi");
            assert.strictEqual(typeof data, "object", "ship did not resolved to an object");
        });
    });

    describe("#getBuildInfo()", function() {
        it("should resolve to an object", async function() {
            const data = await azurlane.getBuildInfo("00:24:00");
            assert.strictEqual(typeof data, "object", "buildInfo did not resolved to an object");
        });
    });
});
