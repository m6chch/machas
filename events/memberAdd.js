// events/memberAdd.js
import { Events, EmbedBuilder } from 'discord.js';

const TARGET_GUILD_ID = '1442170023832584478';
const LOG_CHANNEL_ID = '1442189029448880322';
const VERIFY_CHANNEL_ID = '1442346427081822298'; 
const RULES_CHANNEL_ID = '1442346282482925658'; 

export default {
    name: Events.GuildMemberAdd, // 参加イベント
    once: false,
    
    async execute(member) {
        if (member.guild.id !== TARGET_GUILD_ID) return;

        const guild = member.guild;
        const logChannel = await guild.channels.fetch(LOG_CHANNEL_ID).catch(() => null);
        const verifyChannel = await guild.channels.fetch(VERIFY_CHANNEL_ID).catch(() => null);
        const rulesChannel = await guild.channels.fetch(RULES_CHANNEL_ID).catch(() => null);

        // --- 1. ログチャンネルへのEmbed送信 ---
        if (logChannel) {
            const joinTime = member.joinedAt ? `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:F>` : 'N/A';
            
            const welcomeEmbed = new EmbedBuilder()
                .setColor('#2ecc71')
                .setTitle('🚪 メンバー参加を検出')
                .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL() })
                .setDescription(`新しい挑戦者がサーバーに足を踏み入れました。`)
                .addFields(
                    { name: 'ユーザー情報', value: `\`${member.user.tag}\` (<@${member.id}>)`, inline: false },
                    { name: '参加日時', value: joinTime, inline: true },
                    { name: '現在のメンバー数', value: `\`${guild.memberCount}\`人`, inline: true }
                )
                .setTimestamp()
                .setFooter({ text: 'Status: Member Join Log' });

            await logChannel.send({ 
                content: `\`\`\`ini\n[NEW MEMBER] ${member.user.tag} が参加しました\n\`\`\``, 
                embeds: [welcomeEmbed] 
            });
            
            // 案内メッセージを追記
            const guidanceMessage = 
                `\n**管理者へ:** 以下で認証・ルール確認を促してください。\n` +
                `- **認証:** ${verifyChannel ? verifyChannel.toString() : 'チャンネルなし'}\n` +
                `- **ルール:** ${rulesChannel ? rulesChannel.toString() : 'チャンネルなし'}`;
                
            await logChannel.send({ content: guidanceMessage });
        }

        // --- 2. 入ってきた人（メンバー）へのDM送信 ---
        try {
            const dmEmbed = new EmbedBuilder()
                .setColor('#3498db')
                .setTitle(`🎉 ${guild.name}へようこそ！`)
                .setDescription(`ご参加ありがとうございます！最初にお願いしたいことが2点あります。`)
                .addFields(
                    { 
                        name: '✅ STEP 1: 認証を完了してください', 
                        value: `まずは ${verifyChannel ? verifyChannel.toString() : '#認証チャンネル'} で手続きをお願いします。`, 
                        inline: false 
                    },
                    { 
                        name: '📜 STEP 2: ルールを確認してください', 
                        value: `必ず ${rulesChannel ? rulesChannel.toString() : '#ルールチャンネル'} を一読してください。`, 
                        inline: false 
                    }
                )
                .setTimestamp();
                
            await member.send({ 
                content: `\`\`\`fix\n// サーバー ${guild.name} からの重要なお知らせ\n\`\`\``,
                embeds: [dmEmbed] 
            });
        } catch (error) {
            console.error(`[DM失敗] ${member.user.tag} へのDM送信に失敗しました:`, error.message);
        }
    },
};
