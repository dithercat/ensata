import format from "string-format";

import {
    BasiliskDriver, TextgenDriver,
    ServitorBridge,
    ServitorWindowMemory,
    ServitorSimpleContextFormatter,
    ServitorPostgresVectorStoreDriver,
    ServitorVectorMemory,
    ServitorEphemeralVectorStoreDriver
} from "@dithercat/servitor";

import { config, prompt } from "./config.js";
import { timeOfDay } from "./misc.js";

// init inference driver
var driver;
var embeddriver;
switch (config.inference.driver) {
    case "basilisk":
        driver = new BasiliskDriver(
            config.inference.endpoint,
            config.inference.secret
        );
        embeddriver = driver;
        break;
    case "textgen":
        driver = new TextgenDriver(
            config.inference.endpoint
        );
        break;
    default:
        throw new Error("unrecognized driver");
}

// init storage driver
var storage;
if (config.storage != null && config.storage.driver != null) {
    switch (config.storage.driver) {
        case "pgvector":
        case "postgres": {
            const dims = await embeddriver.dimensions();
            storage = new ServitorPostgresVectorStoreDriver(
                config.storage.endpoint,
                dims
            );
            await storage.init();
            break;
        }
        case "ram":
        case "temp":
        case "temporary":
        case "ephemeral": {
            storage = new ServitorEphemeralVectorStoreDriver();
            break;
        }
        case "none":
            break;
        default:
            throw new Error("unrecognized storage driver");
    }
}
if (storage != null && embeddriver == null) {
    throw new Error("sorry, long-term memory currently requires basilisk inference driver");
}

const formatter = new ServitorSimpleContextFormatter({
    name_capitalize: false,
    internal_monologue: true
});

// init short-term memory
class EnsataWindowMemory extends ServitorWindowMemory {
    _warmupChannel(ring) {
        ring.push({
            actor: {
                friendlyname: config.char,
                self: true
            },
            channel: null,
            message: {
                id: "intro",
                content: format(config.introduction, {
                    timeofday: timeOfDay()
                }),
                tokens: [],
                timestamp: new Date()
            }
        });
    }
}
const shortterm = new EnsataWindowMemory(formatter);

// init long-term memory if configured
const longterm = [];
if (embeddriver != null && storage != null) {
    const vector = new ServitorVectorMemory(embeddriver, storage, formatter);
    longterm.push(vector);
}

export const bridge = new ServitorBridge({
    char: config.char,
    prompt,
    args: {
        max_new_tokens: 256,
        min_length: 4,
        stopping_strings: ["\n\n", "\n["]
    },
    driver,
    memory: { shortterm, longterm },
    formatter
});