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
        .setName('clear')
        .setDescription('指定した数のメッセージを削除します。（最大99件、14日以内のもの）')
        .addIntegerOption(option => 
            option.setName('amount')
                .setDescription('削除するメッセージの数 (1〜99)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(99))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages), // メッセージの管理権限が必要
    
    async execute(interaction) {
        // Discordの3秒応答制限を回避するため、まず処理中であることを応答します
        await interaction.deferReply({ ephemeral: true });

        const amount = interaction.options.getInteger('amount');
        const channel = interaction.channel;

        // 確認Embed
        const confirmEmbed = new EmbedBuilder()
            .setColor('#e67e22') // Orange
            .setTitle('🗑️ メッセージ一括削除の確認')
            .setDescription(`このチャンネルから**最新の ${amount} 件**のメッセージを削除しますか？`)
            .addFields(
                { name: 'チャンネル', value: `<#${channel.id}>`, inline: true },
                { name: '件数', value: `${amount} 件`, inline: true }
            )
            .setFooter({ text: '注意: 14日以上前のメッセージは削除できません。' })
            .setTimestamp();
        
        // 確認ボタン
        const confirmButton = new ButtonBuilder()
            .setCustomId('clear_confirm')
            .setLabel(`${amount} 件を削除`)
            .setStyle(ButtonStyle.Danger);
        
        const cancelButton = new ButtonBuilder()
            .setCustomId('clear_cancel')
            .setLabel('キャンセル')
            .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

        // 応答を編集して確認メッセージを表示
        await interaction.editReply({ 
            embeds: [confirmEmbed], 
            components: [row]
        });

        // 応答を待つ
        const filter = i => (i.customId === 'clear_confirm' || i.customId === 'clear_cancel') && i.user.id === interaction.user.id;
        
        try {
            const confirmation = await interaction.channel.awaitMessageComponent({ 
                filter, 
                time: 30000 
            });

            if (confirmation.customId === 'clear_confirm') {
                // 削除実行（指定件数+確認メッセージの分も削除するため+1）
                // 削除対象のメッセージを取得
                const messages = await channel.messages.fetch({ limit: amount + 1 });
                // 一括削除を実行
                const deletedMessages = await channel.bulkDelete(messages, true);

                const successEmbed = new EmbedBuilder()
                    .setColor('#2ecc71') // Success Green
                    .setTitle('✅ 削除完了')
                    .setDescription(`**${deletedMessages.size} 件**のメッセージを削除しました。`)
                    .addFields(
                        { name: '実行者', value: `<@${interaction.user.id}>`, inline: true },
                        { name: '件数', value: `${deletedMessages.size} 件`, inline: true }
                    )
                    .setTimestamp();

                // 成功メッセージを更新して、コンポーネントを削除
                await confirmation.update({ 
                    embeds: [successEmbed], 
                    components: [] 
                });

                // 成功メッセージを5秒後に自動削除（ephemeralではないため）
                // ただし、interaction.editReplyはephemeralなため、ここで追跡が難しい
                // ユーザーに成功メッセージが見えるよう、5秒後にeditReplyの内容を削除します。
                setTimeout(async () => {
                    await interaction.deleteReply().catch(() => {});
                }, 5000);


            } else {
                await confirmation.update({ 
                    content: 'メッセージ削除操作をキャンセルしました。', 
                    embeds: [], 
                    components: [] 
                });
            }

        } catch (e) {
            // タイムアウト後の再応答を防ぐ
             if (interaction.replied || interaction.deferred) {
                await interaction.editReply({ 
                    content: '操作時間が経過したため、メッセージ削除をキャンセルしました。', 
                    components: [], 
                    embeds: [] 
                }).catch(() => {});
            }
        }
    },
};
