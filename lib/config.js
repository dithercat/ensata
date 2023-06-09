import { readFile, access, constants } from "fs/promises";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const path_config = resolve(root, "config.json");
const path_prompt = resolve(root, "prompt");
const path_prompt_local = resolve(root, "prompt.local");

// load config
var buff = await readFile(path_config);
export const config = Object.assign({
    char: "iris",
    introduction: "(thought: i am now online.) good {timeofday}. how may i be of service today?",
    inference: {
        driver: "basilisk",
        endpoint: "http://127.0.0.1:5000/basilisk/",
        secret: null
    },
    storage: {
        driver: "none"
    },
    // turn this on at your own risk
    dms: false
}, JSON.parse(buff.toString()));

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