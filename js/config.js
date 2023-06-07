import fs from "fs/promises";
import path from "path";
import url from "url";

const root = path.resolve(path.dirname(url.fileURLToPath(import.meta.url)), "..");

const path_config = path.resolve(root, "config.json");
const path_prompt = path.resolve(root, "prompt");
const path_prompt_local = path.resolve(root, "prompt.local");

// load config
var buff = await fs.readFile(path_config);
export const config = Object.assign({
    char: "iris",
    introduction: "(thought: i am now online.) good {timeofday}. how may i be of service today?",
    inference: {
        driver: "basilisk",
        endpoint: "http://127.0.0.1:5000/basilisk/",
        secret: null
    }
}, JSON.parse(buff.toString()));

// load prompt
try {
    await fs.access(path_prompt_local, fs.constants.R_OK);
    buff = await fs.readFile(path_prompt_local);
}
catch (ex) {
    console.debug("using default prompt");
    buff = await fs.readFile(path_prompt);
}
export const prompt = buff.toString()
    // replace bos/eos
    .replace(/<s>/g, "\x02").replace(/<\/s>/g, "\x03");