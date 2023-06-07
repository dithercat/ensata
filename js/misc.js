export function cleanContentNoNick(str, channel) {
    return str.replaceAll(/<(@[!&]?|#)(\d{17,19})>/g, (match, type, id) => {
        switch (type) {
            case '@':
            case '@!': {
                const user = channel.client.users.cache.get(id);
                return user ? `@${user.username}` : match;
            }
            case '@&': {
                if (channel.type === ChannelType.DM) return match;
                const role = channel.guild.roles.cache.get(id);
                return role ? `@${role.name}` : match;
            }
            case '#': {
                const mentionedChannel = channel.client.channels.cache.get(id);
                return mentionedChannel ? `#${mentionedChannel.name}` : match;
            }
            default: {
                return match;
            }
        }
    });
}

export function fixName(str, from, to) {
    return str.replace(RegExp(`@${from}`, "g"), `@${to}`);;
}

export function timeOfDay() {
    const date = new Date();
    const hr = date.getHours();
    if (hr < 12) return "morning";
    if (hr < 12 + 6) return "afternoon";
    return "evening";
}