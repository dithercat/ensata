import {
    BasiliskDriver,
    TextgenDriver,
    OpenAIDriver,
    ServitorBridge,
    ServitorConversationWindowMemory,
    ServitorConversationVectorMemory,
    ServitorSimpleContextFormatter,
    ServitorPostgresVectorStoreDriver,
    ServitorEphemeralVectorStoreDriver
} from "@dithercat/servitor";

import { config, prompt } from "./config.js";

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
    case "openai":
        driver = new OpenAIDriver(
            config.inference.endpoint,
            config.inference.inferenceModel,
            config.inference.embeddingModel,
            config.inference.secret
        );
        embeddriver = driver;
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

const shortterm = new ServitorConversationWindowMemory(formatter, config.agent);

// init long-term memory if configured
const longterm = [];
if (embeddriver != null && storage != null) {
    const vector = new ServitorConversationVectorMemory(embeddriver, storage, formatter);
    longterm.push(vector);
}

export const bridge = new ServitorBridge({
    agent: config.agent,
    baseprompt: prompt,
    args: {
        max_new_tokens: 256,
        min_length: 4,
        stopping_strings: ["\n\n\n", "\n["]
    },
    driver,
    memory: { shortterm, longterm },
    formatter
});