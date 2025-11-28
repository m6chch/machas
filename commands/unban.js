import { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    PermissionFlagsBits 
} from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('unban')
        .setDescription('指定したユーザーのBANを解除します。（ユーザーIDまたはタグ指定）')
        .addStringOption(option => 
            option.setName('target')
                .setDescription('BANを解除するユーザーIDまたはタグ (例: User#1234)')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('reason')
                .setDescription('BAN解除の理由')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers), // メンバーのBan権限が必要
    
    async execute(interaction) {
        // Discordの3秒応答制限を回避するため、まず処理中であることを応答します
        await interaction.deferReply({ ephemeral: true });

        const targetInput = interaction.options.getString('target');
        const reason = interaction.options.getString('reason') || '理由なし';
        const guild = interaction.guild;
        
        // ユーザーIDの正規表現
        const userIdMatch = targetInput.match(/\d{15,22}/);
        let targetId = userIdMatch ? userIdMatch[0] : null;

        if (!targetId) {
            return interaction.editReply({ content: '有効なユーザーIDまたはメンションを入力してください。' });
        }

        // BANリストからユーザーを検索
        let bannedUser;
        try {
            bannedUser = await guild.bans.fetch(targetId);
        } catch (error) {
            // BANされていない、またはIDが不正
            return interaction.editReply({ content: `ユーザーID **${targetId}** は現在BANされていません。` });
        }

        const targetUser = bannedUser.user;
        
        // 確認Embedとボタン
        const confirmEmbed = new EmbedBuilder()
            .setColor('#3498db') // Blue
            .setTitle('✅ BAN解除の確認')
            .setDescription(`ユーザー **${targetUser.tag}** のBANを解除しますか？`)
            .setThumbnail(targetUser.displayAvatarURL())
            .addFields(
                { name: '対象ユーザー', value: targetUser.tag, inline: true },
                { name: 'ユーザーID', value: targetId, inline: true },
                { name: '理由', value: reason, inline: false }
            )
            .setTimestamp();
        
        const confirmButton = new ButtonBuilder()
            .setCustomId('unban_confirm')
            .setLabel('BAN解除を実行')
            .setStyle(ButtonStyle.Success);
        
        const cancelButton = new ButtonBuilder()
            .setCustomId('unban_cancel')
            .setLabel('キャンセル')
            .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

        await interaction.editReply({ 
            embeds: [confirmEmbed], 
            components: [row]
        });

        // 応答を待つ
        const filter = i => (i.customId === 'unban_confirm' || i.customId === 'unban_cancel') && i.user.id === interaction.user.id;
        
        try {
            const confirmation = await interaction.channel.awaitMessageComponent({ 
                filter, 
                time: 30000 
            });

            if (confirmation.customId === 'unban_confirm') {
                // BAN解除実行
                await guild.bans.remove(targetId, reason);

                const successEmbed = new EmbedBuilder()
                    .setColor('#2ecc77') // Success Green
                    .setTitle('✅ BAN解除完了')
                    .setDescription(`ユーザー **${targetUser.tag}** (ID: ${targetId}) のBANを解除しました。`)
                    .addFields(
                        { name: '実行者', value: `<@${interaction.user.id}>`, inline: true },
                        { name: '理由', value: reason, inline: true }
                    )
                    .setTimestamp();

                await confirmation.update({ 
                    content: 'BANが解除されました。', 
                    embeds: [successEmbed], 
                    components: [] 
                });

            } else {
                await confirmation.update({ 
                    content: 'BAN解除操作をキャンセルしました。', 
                    embeds: [], 
                    components: [] 
                });
            }

        } catch (e) {
            // タイムアウト後の再応答を防ぐ
             if (interaction.replied || interaction.deferred) {
                await interaction.editReply({ 
                    content: '操作時間が経過したため、BAN解除をキャンセルしました。', 
                    components: [], 
                    embeds: [] 
                }).catch(() => {});
            }
        }
    },
};
