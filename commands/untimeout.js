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
        const targetMember = interaction.options.getMember('target');
        const reason = interaction.options.getString('reason') || '理由なし';

        // タイムアウト中かチェック
        if (!targetMember.communicationDisabledUntilTimestamp) {
            return interaction.reply({ content: `<@${targetMember.id}> は現在タイムアウトされていません。`, ephemeral: true });
        }

        // Bot自身の操作を防ぐ
        if (targetMember.id === interaction.client.user.id) {
            return interaction.reply({ content: 'Bot自身を操作することはできません。', ephemeral: true });
        }
        
        // 権限チェック
        if (targetMember.roles.highest.position >= interaction.member.roles.highest.position) {
            return interaction.reply({ content: 'そのユーザーはあなたより上位のロールを持っているため、タイムアウトを解除できません。', ephemeral: true });
        }
        if (!targetMember.manageable) {
            return interaction.reply({ content: 'Botがこのユーザーのタイムアウトを解除する権限がありません。Botのロールがユーザーより上位にありません。', ephemeral: true });
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

        await interaction.reply({ 
            embeds: [confirmEmbed], 
            components: [row], 
            ephemeral: true 
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
            await interaction.editReply({ 
                content: '操作時間が経過したため、タイムアウト解除をキャンセルしました。', 
                components: [], 
                embeds: [] 
            });
        }
    },
};
