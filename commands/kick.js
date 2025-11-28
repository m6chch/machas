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
        const targetMember = interaction.options.getMember('target');
        const reason = interaction.options.getString('reason') || '理由なし';

        // Kick可能なメンバーかチェック
        if (!targetMember) {
            return interaction.reply({ content: 'このサーバーにいないユーザーはKickできません（Banを使用してください）。', ephemeral: true });
        }
        if (targetMember.id === interaction.client.user.id) {
            return interaction.reply({ content: 'Bot自身をKickすることはできません。', ephemeral: true });
        }
        if (targetMember.roles.highest.position >= interaction.member.roles.highest.position) {
            return interaction.reply({ content: 'そのユーザーはあなたより上位のロールを持っているため、Kickできません。', ephemeral: true });
        }
        if (!targetMember.kickable) {
            return interaction.reply({ content: 'BotがこのユーザーをKickする権限がありません。Botのロールがユーザーより上位にありません。', ephemeral: true });
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

        await interaction.reply({ 
            embeds: [confirmEmbed], 
            components: [row], 
            ephemeral: true 
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
            await interaction.editReply({ 
                content: '操作時間が経過したため、Kickをキャンセルしました。', 
                components: [], 
                embeds: [] 
            });
        }
    },
};
