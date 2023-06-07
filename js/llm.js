import format from "string-format";

import {
    BasiliskDriver,
    ServitorBridge,
    ServitorContextMemory,
    ServitorSimpleContextFormatter
} from "@dithercat/servitor";

import { config, prompt } from "./config.js";
import { timeOfDay } from "./misc.js";

var driver;
switch (config.inference.driver) {
    case "basilisk":
        driver = new BasiliskDriver(
            config.inference.endpoint,
            config.inference.secret
        );
        break;
    default:
        throw new Error("unrecognized driver");
}

const formatter = new ServitorSimpleContextFormatter({
    name_capitalize: false,
    internal_monologue: true
});

class EnsataContextMemory extends ServitorContextMemory {
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
const context = new EnsataContextMemory(formatter);

export const bridge = new ServitorBridge({
    char: config.char,
    prompt,
    args: {
        max_new_tokens: 256,
        min_length: 4,
        stopping_strings: ["\n\n"]
    },
    driver: { inference: driver },
    memory: { context },
    formatter
});