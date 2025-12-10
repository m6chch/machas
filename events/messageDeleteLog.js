import { Events, EmbedBuilder, AuditLogEvent } from 'discord.js';

const TARGET_GUILD_ID = '1448245012239356027';
const LOG_CHANNEL_ID = '1448290741112803388';

export default {
    name: Events.MessageDelete,
    once: false,
    
    async execute(message, client) {
        if (!message.guild) return;
        if (message.guild.id !== TARGET_GUILD_ID) return;
        if (message.author?.bot) return; // Botの削除は無視（任意）

        const logChannel = message.guild.channels.cache.get(LOG_CHANNEL_ID);
        if (!logChannel) return;

        // メッセージがキャッシュにない場合（Bot起動前のメッセージなど）、詳細が取得できないことがあります
        const content = message.content || '（キャッシュ外、または内容なし）';
        
        // 添付ファイル
        const attachments = message.attachments?.size > 0 
            ? message.attachments.map(a => a.url).join('\n') 
            : 'なし';

        const embed = new EmbedBuilder()
            .setColor('#e74c3c') // 赤
            .setTitle('🗑️ メッセージ削除')
            .setDescription(`以下のメッセージが削除されました。`)
            .addFields(
                { name: '投稿者', value: message.author ? `<@${message.author.id}>` : '不明', inline: true },
                { name: 'チャンネル', value: `<#${message.channel.id}>`, inline: true },
                { name: '削除された内容', value: content.length > 1024 ? content.substring(0, 1020) + '...' : content },
                { name: '添付ファイル', value: attachments }
            )
            .setTimestamp()
            .setFooter({ text: `Message ID: ${message.id}` });

        await logChannel.send({ 
            content: '```diff\n- Message Deleted\n```',
            embeds: [embed] 
        });
    },
};
