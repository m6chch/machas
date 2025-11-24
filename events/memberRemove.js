// events/memberRemove.js
import { Events, EmbedBuilder } from 'discord.js';

const TARGET_GUILD_ID = '1442170023832584478';
const LOG_CHANNEL_ID = '1442189029448880322';

export default {
    name: Events.GuildMemberRemove, // 退出イベント
    once: false, 
    
    async execute(member) {
        if (member.guild.id !== TARGET_GUILD_ID) return;

        const guild = member.guild;
        const logChannel = await guild.channels.fetch(LOG_CHANNEL_ID).catch(() => null);

        if (logChannel) {
            const leaveTime = `<t:${Math.floor(Date.now() / 1000)}:F>`;

            const farewellEmbed = new EmbedBuilder()
                .setColor('#e74c3c')
                .setTitle('👋 メンバー退出を検出')
                .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL() })
                .setDescription(`一人のメンバーが静かに去っていきました。`)
                .addFields(
                    { name: 'ユーザー情報', value: `\`${member.user.tag}\` (<@${member.id}>)`, inline: false },
                    { name: '退出日時', value: leaveTime, inline: true },
                    { name: '現在のメンバー数', value: `\`${guild.memberCount}\`人`, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'Status: Member Leave Log' });

            await logChannel.send({ 
                content: `\`\`\`diff\n- [LEAVE MEMBER] ${member.user.tag} が退出しました\n\`\`\``, 
                embeds: [farewellEmbed] 
            });
        }
    },
};
