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
        .setName('kick')
        .setDescription('指定したメンバーをサーバーからKickします。')
        .addUserOption(option => 
            option.setName('target')
                .setDescription('Kickするメンバー')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('reason')
                .setDescription('Kickの理由')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers), // メンバーのKick権限が必要
    
    async execute(interaction) {
        // Discordの3秒応答制限を回避するため、まず処理中であることを応答します
        await interaction.deferReply({ ephemeral: true });

        const targetMember = interaction.options.getMember('target');
        const reason = interaction.options.getString('reason') || '理由なし';

        // ターゲットチェック
        if (!targetMember) {
            return interaction.editReply({ content: 'このサーバーにいないユーザーはKickできません（Banを使用してください）。' });
        }
        if (targetMember.id === interaction.client.user.id) {
            return interaction.editReply({ content: 'Bot自身をKickすることはできません。' });
        }
        if (targetMember.roles.highest.position >= interaction.member.roles.highest.position) {
            return interaction.editReply({ content: 'そのユーザーはあなたより上位のロールを持っているため、Kickできません。' });
        }
        if (!targetMember.kickable) {
            return interaction.editReply({ content: 'BotがこのユーザーをKickする権限がありません。Botのロールがユーザーより上位にありません。' });
        }

        // 確認Embedとボタン
        const confirmEmbed = new EmbedBuilder()
            .setColor('#e74c3c') // Red
            .setTitle('⚠️ Kickの確認')
            .setDescription(`**${targetMember.user.tag}** をサーバーからKickしますか？`)
            .addFields(
                { name: '対象ユーザー', value: `<@${targetMember.id}>`, inline: true },
                { name: '理由', value: reason, inline: true }
            )
            .setTimestamp();
        
        const confirmButton = new ButtonBuilder()
            .setCustomId('kick_confirm')
            .setLabel('Kickを実行')
            .setStyle(ButtonStyle.Danger);
        
        const cancelButton = new ButtonBuilder()
            .setCustomId('kick_cancel')
            .setLabel('キャンセル')
            .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

        await interaction.editReply({ 
            embeds: [confirmEmbed], 
            components: [row]
        });

        // 応答を待つ
        const filter = i => (i.customId === 'kick_confirm' || i.customId === 'kick_cancel') && i.user.id === interaction.user.id;
        
        try {
            const confirmation = await interaction.channel.awaitMessageComponent({ 
                filter, 
                time: 30000 
            });

            if (confirmation.customId === 'kick_confirm') {
                // Kick実行
                await targetMember.kick(reason);

                const successEmbed = new EmbedBuilder()
                    .setColor('#2ecc77') // Success Green
                    .setTitle('✅ Kick完了')
                    .setDescription(`<@${targetMember.id}> をサーバーからKickしました。`)
                    .addFields(
                        { name: '実行者', value: `<@${interaction.user.id}>`, inline: true },
                        { name: '理由', value: reason, inline: true }
                    )
                    .setTimestamp();

                await confirmation.update({ 
                    content: 'Kickが実行されました。', 
                    embeds: [successEmbed], 
                    components: [] 
                });

            } else {
                await confirmation.update({ 
                    content: 'Kick操作をキャンセルしました。', 
                    embeds: [], 
                    components: [] 
                });
            }

        } catch (e) {
            // タイムアウト後の再応答を防ぐ
             if (interaction.replied || interaction.deferred) {
                await interaction.editReply({ 
                    content: '操作時間が経過したため、Kickをキャンセルしました。', 
                    components: [], 
                    embeds: [] 
                }).catch(() => {});
            }
        }
    },
};
