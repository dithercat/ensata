import client from "./client.js";
import { config } from "./config.js";
import { bridge } from "./llm.js";
import { cleanContentNoNick, fixName } from "./misc.js";

client.on("messageCreate", async msg => {
    var handle;
    try {
        const channel = await client.channels.fetch(msg.channel.id);
        const author = await client.users.fetch(msg.author);

        // skip empty messages
        if (!msg.content.trim()) { return; }

        // get author name
        // use character name if composed by self
        const self = author.id === client.user.id;
        const friendlyname = self ? config.char : author.username;

        // clean up content
        const content = fixName(cleanContentNoNick(msg.content, channel),
            client.user.username, config.char);

        const line = {
            actor: { friendlyname, self },
            channel: {
                id: channel.id,
                friendlyname: channel.name,
                isprivate: channel.isDMBased()
            },
            message: {
                id: msg.id,
                content,
                tokens: [],
                timestamp: msg.createdTimestamp
            }
        };

        // insert message into context buffer
        await bridge.remember(line);

        // if mentioned, respond
        if (msg.mentions.has(client.user) && msg.author.id !== client.user.id) {
            // ensure inference service is reachable
            if (!await bridge.inference.ping()) {
                await msg.reply("error: cant reach inference service");
                return;
            }

            // start typing
            await msg.channel.sendTyping();
            handle = setInterval(() => msg.channel.sendTyping(), 2000);

            // do inference
            const result = await bridge.infer(line);
            const { content, thought } = bridge.formatter.cleanInference(result.message.content);

            console.debug("thought: " + thought);

            // stop typing and send message
            clearTimeout(handle);
            const rep = await msg.reply(content);
            await bridge.remember({
                actor: { friendlyname: config.char, self: true },
                channel: line.channel,
                message: {
                    id: rep.id,
                    content,
                    tokens: result.message.tokens,
                    timestamp: rep.createdTimestamp
                }
            });
        }
    }
    catch (ex) {
        clearTimeout(handle);
        console.error(ex);
    }
});

client.on("ready", () => {
    console.debug("connected to discord");
});