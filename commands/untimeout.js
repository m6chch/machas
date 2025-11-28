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
        .setName('untimeout')
        .setDescription('タイムアウト中のメンバーの制限を解除します。')
        .addUserOption(option => 
            option.setName('target')
                .setDescription('タイムアウトを解除するメンバー')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('reason')
                .setDescription('解除の理由')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers), // メンバーの管理権限が必要
    
    async execute(interaction) {
        // Discordの3秒応答制限を回避するため、まず処理中であることを応答します
        await interaction.deferReply({ ephemeral: true });

        const targetMember = interaction.options.getMember('target');
        const reason = interaction.options.getString('reason') || '理由なし';

        // ターゲットチェック
        if (!targetMember) {
            return interaction.editReply({ content: '指定されたユーザーはこのサーバーのメンバーではありません。' });
        }
        
        // タイムアウト中かチェック
        if (!targetMember.communicationDisabledUntilTimestamp) {
            return interaction.editReply({ content: `<@${targetMember.id}> は現在タイムアウトされていません。` });
        }

        // Bot自身の操作を防ぐ
        if (targetMember.id === interaction.client.user.id) {
            return interaction.editReply({ content: 'Bot自身を操作することはできません。' });
        }
        
        // 権限チェック
        if (targetMember.roles.highest.position >= interaction.member.roles.highest.position) {
            return interaction.editReply({ content: 'そのユーザーはあなたより上位のロールを持っているため、タイムアウトを解除できません。' });
        }
        if (!targetMember.manageable) {
            return interaction.editReply({ content: 'Botがこのユーザーのタイムアウトを解除する権限がありません。Botのロールがユーザーより上位にありません。' });
        }

        // 確認Embedとボタン
        const confirmEmbed = new EmbedBuilder()
            .setColor('#3498db') // Blue
            .setTitle('✅ タイムアウト解除の確認')
            .setDescription(`**${targetMember.user.tag}** のタイムアウトを解除しますか？`)
            .addFields(
                { name: '対象ユーザー', value: `<@${targetMember.id}>`, inline: true },
                { name: '理由', value: reason, inline: true }
            )
            .setTimestamp();
        
        const confirmButton = new ButtonBuilder()
            .setCustomId('untimeout_confirm')
            .setLabel('解除を実行')
            .setStyle(ButtonStyle.Success);
        
        const cancelButton = new ButtonBuilder()
            .setCustomId('untimeout_cancel')
            .setLabel('キャンセル')
            .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

        await interaction.editReply({ 
            embeds: [confirmEmbed], 
            components: [row]
        });

        // 応答を待つ
        const filter = i => (i.customId === 'untimeout_confirm' || i.customId === 'untimeout_cancel') && i.user.id === interaction.user.id;
        
        try {
            const confirmation = await interaction.channel.awaitMessageComponent({ 
                filter, 
                time: 30000 
            });

            if (confirmation.customId === 'untimeout_confirm') {
                // 解除実行
                await targetMember.timeout(null, reason); // nullを設定してタイムアウトを解除

                const successEmbed = new EmbedBuilder()
                    .setColor('#2ecc77') // Success Green
                    .setTitle('✅ タイムアウト解除完了')
                    .setDescription(`<@${targetMember.id}> のタイムアウトを解除しました。`)
                    .addFields(
                        { name: '実行者', value: `<@${interaction.user.id}>`, inline: true },
                        { name: '理由', value: reason, inline: true }
                    )
                    .setTimestamp();

                await confirmation.update({ 
                    content: 'タイムアウトが解除されました。', 
                    embeds: [successEmbed], 
                    components: [] 
                });

            } else {
                await confirmation.update({ 
                    content: 'タイムアウト解除操作をキャンセルしました。', 
                    embeds: [], 
                    components: [] 
                });
            }

        } catch (e) {
            // タイムアウト後の再応答を防ぐ
             if (interaction.replied || interaction.deferred) {
                await interaction.editReply({ 
                    content: '操作時間が経過したため、タイムアウト解除をキャンセルしました。', 
                    components: [], 
                    embeds: [] 
                }).catch(() => {});
            }
        }
    },
};
