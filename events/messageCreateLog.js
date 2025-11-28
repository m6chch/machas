import { Events, EmbedBuilder } from 'discord.js';

const TARGET_GUILD_ID = '1442170023832584478'; // 監視対象サーバー
const LOG_CHANNEL_ID = '1442348085253640394'; // ログ出力先

export default {
    name: Events.MessageCreate,
    once: false,
    
    async execute(message, client) {
        // Botのメッセージは無視
        if (message.author.bot) return;
        // DMは無視
        if (!message.guild) return;
        // 指定サーバー以外は無視
        if (message.guild.id !== TARGET_GUILD_ID) return;

        const logChannel = message.guild.channels.cache.get(LOG_CHANNEL_ID);
        if (!logChannel) return;

        // 内容がない（画像のみなど）場合はプレースホルダー
        const content = message.content || '(画像またはファイルのみ)';

        // 添付ファイルがある場合
        const attachments = message.attachments.size > 0 
            ? message.attachments.map(a => a.url).join('\n') 
            : 'なし';

        const embed = new EmbedBuilder()
            .setColor('#3498db') // 青
            .setTitle('📨 メッセージ送信')
            .setAuthor({ name: message.author.tag, iconURL: message.author.displayAvatarURL() })
            .addFields(
                { name: '投稿者', value: `<@${message.author.id}>`, inline: true },
                { name: 'チャンネル', value: `<#${message.channel.id}>`, inline: true },
                { name: '内容', value: content.length > 1024 ? content.substring(0, 1020) + '...' : content },
                { name: '添付ファイル', value: attachments }
            )
            .setTimestamp()
            .setFooter({ text: `Message ID: ${message.id}` });

        // ログ送信
        await logChannel.send({ embeds: [embed] });
    },
};
