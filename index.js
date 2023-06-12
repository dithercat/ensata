import Queue from "p-queue";

import { config } from "./lib/config.js";
import { bridge } from "./lib/llm.js";
import client from "./lib/client.js";
import { cleanContentNoNick, fixName } from "./lib/misc.js";

// ensures that messages are processed in order
const queue = new Queue({ concurrency: 1 });

async function handleMessage(msg) {
    var handle;
    try {
        const channel = await client.channels.fetch(msg.channel.id);
        const author = await client.users.fetch(msg.author);

        // only accept dms if enabled in config
        const isprivate = channel.isDMBased();
        if (isprivate && !config.discord.dms) { return; }

        // skip empty messages
        if (!msg.content.trim()) { return; }

        // get author name
        // use character name if composed by self
        const self = author.id === client.user.id;
        const friendlyname = self ? config.agent.name : author.username;

        // clean up content
        const content = fixName(cleanContentNoNick(msg.content, channel),
            client.user.username, config.agent.name);

        const line = {
            actor: { friendlyname, self },
            channel: {
                id: channel.id,
                friendlyname: channel.isDMBased() ? "direct" : channel.name,
                isprivate
            },
            message: {
                id: msg.id,
                content,
                tokens: [],
                tokens_raw: [],
                timestamp: new Date(msg.createdTimestamp).toISOString()
            }
        };

        // insert message into context buffer
        await bridge.save(line, true);

        // if mentioned, respond
        const mentioned = isprivate || msg.mentions.has(client.user);
        if (mentioned && msg.author.id !== client.user.id) {
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
            await bridge.save({
                actor: { friendlyname: config.agent.name, self: true },
                channel: line.channel,
                message: {
                    id: rep.id,
                    content: bridge.formatter.composeWithThought(content, thought),
                    tokens: result.message.tokens,
                    timestamp: new Date(msg.createdTimestamp).toISOString()
                }
            }, true);
        }
    }
    catch (ex) {
        clearTimeout(handle);
        console.error(ex);
    }
}

client.on("messageCreate", msg => queue.add(() => handleMessage(msg)));

client.on("ready", () => {
    console.debug("connected to discord");
});