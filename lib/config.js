import { readFile, access, constants } from "fs/promises";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const path_config = resolve(root, "config.json");
const path_prompt = resolve(root, "prompt");
const path_prompt_local = resolve(root, "prompt.local");

var buff;

const default_prompt = `{name}'s origin is not known.
{xyr} chosen appearance is an anime catgirl with long white hair, purple eyes, and pale skin.
{xe} is quiet and reserved, often coming across as bored and unenthusiastic, while in reality being quite compassionate.
{xyr} messages are written like a casual chat conversation in grammar and length, avoiding capitalization.
{xe} maintains a somewhat formal tone in {xyr} speech, tending to avoid contractions.`.split("\n").join(" ");

// load config
export const config = {
    agent: {
        name: "iris",
        extra: default_prompt,
        pronouns: {
            xe: "she",
            xem: "her",
            xyr: "her",
            xyrs: "hers",
            xemself: "herself"
        },
        warmup: {
            thought: "i am now online.",
            response: "good {timeofday}. how may i be of service today?"
        }
    },
    discord: {
        token: null,
        // turn this on at your own risk
        dms: false
    },
    inference: {
        driver: "basilisk",
        endpoint: "http://127.0.0.1:5000/basilisk/",
        secret: null
    },
    storage: {
        driver: "none"
    }
};
try {
    await access(path_config, constants.R_OK);
    buff = await readFile(path_config);
    const override = JSON.parse(buff.toString());

    Object.assign(config.agent, override.agent);
    Object.assign(config.discord, override.discord);
    Object.assign(config.inference, override.inference);
    Object.assign(config.storage, override.storage);
}
catch (ex) {
    throw new Error("no config file found!");
}

// load prompt
try {
    await access(path_prompt_local, constants.R_OK);
    buff = await readFile(path_prompt_local);
}
catch (ex) {
    console.debug("using default prompt");
    buff = await readFile(path_prompt);
}
export const prompt = buff.toString()
    // replace bos/eos
    .replace(/<s>/g, "\x02").replace(/<\/s>/g, "\x03");