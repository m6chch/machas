import { Events, EmbedBuilder } from 'discord.js';

const TARGET_GUILD_ID = '1448245012239356027';
const LOG_CHANNEL_ID = '1448290741112803388';

export default {
    name: Events.MessageUpdate,
    once: false,
    
    async execute(oldMessage, newMessage, client) {
        if (!newMessage.guild) return;
        if (newMessage.guild.id !== TARGET_GUILD_ID) return;
        if (newMessage.author?.bot) return;

        // 内容が変わっていない場合（Embedの展開など）は無視
        if (oldMessage.content === newMessage.content) return;

        const logChannel = newMessage.guild.channels.cache.get(LOG_CHANNEL_ID);
        if (!logChannel) return;

        const oldContent = oldMessage.content || '（キャッシュ外、または内容なし）';
        const newContent = newMessage.content || '（内容なし）';

        const embed = new EmbedBuilder()
            .setColor('#f1c40f') // 黄色
            .setTitle('📝 メッセージ編集')
            .setAuthor({ name: newMessage.author.tag, iconURL: newMessage.author.displayAvatarURL() })
            .setDescription(`[メッセージへ移動](${newMessage.url})`)
            .addFields(
                { name: '投稿者', value: `<@${newMessage.author.id}>`, inline: true },
                { name: 'チャンネル', value: `<#${newMessage.channel.id}>`, inline: true },
                { name: '変更前', value: oldContent.length > 1024 ? oldContent.substring(0, 1020) + '...' : oldContent },
                { name: '変更後', value: newContent.length > 1024 ? newContent.substring(0, 1020) + '...' : newContent }
            )
            .setTimestamp()
            .setFooter({ text: `Message ID: ${newMessage.id}` });

        await logChannel.send({ 
            content: '```fix\n! Message Edited\n```',
            embeds: [embed] 
        });
    },
};
