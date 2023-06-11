import { Client, IntentsBitField, Partials } from "discord.js";

import { config } from "./config.js";

const discord = new Client({
    intents: new IntentsBitField().add([
        "Guilds",
        "GuildMessages",
        "MessageContent",
        "DirectMessages"
    ]),
    partials: [
        Partials.Channel
    ]
});

await discord.login(config.discord.token);

export default discord;