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
        .setName('ban')
        .setDescription('指定したユーザーをサーバーからBANします。（ユーザー指定またはID指定）')
        .addStringOption(option => 
            option.setName('target')
                .setDescription('BANするユーザーのメンションまたはユーザーID')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('reason')
                .setDescription('BANの理由')
                .setRequired(false))
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers), // メンバーのBan権限が必要
    
    async execute(interaction) {
        // Discordの3秒応答制限を回避するため、まず処理中であることを応答します
        await interaction.deferReply({ ephemeral: true });

        const targetInput = interaction.options.getString('target');
        const reason = interaction.options.getString('reason') || '理由なし';

        // ユーザーIDの正規表現: 15桁から22桁の数字
        const userIdMatch = targetInput.match(/\d{15,22}/);
        let targetId = userIdMatch ? userIdMatch[0] : null;

        if (!targetId) {
             return interaction.editReply({ content: '有効なユーザーのメンションまたはユーザーIDを入力してください。' });
        }

        // 実行者自身のBANを防ぐ
        if (targetId === interaction.user.id) {
            return interaction.editReply({ content: '自分自身をBANすることはできません。' });
        }
        // Bot自身のBANを防ぐ
        if (targetId === interaction.client.user.id) {
            return interaction.editReply({ content: 'Bot自身をBANすることはできません。' });
        }

        const guild = interaction.guild;
        let targetUser = await interaction.client.users.fetch(targetId).catch(() => null);
        let targetMember = await guild.members.fetch(targetId).catch(() => null);
        
        if (!targetUser) {
             return interaction.editReply({ content: '指定されたIDのユーザーが見つかりません。' });
        }

        // メンバーとして存在する場合の権限チェック
        if (targetMember) {
            if (targetMember.roles.highest.position >= interaction.member.roles.highest.position) {
                return interaction.editReply({ content: 'そのユーザーはあなたより上位のロールを持っているため、BANできません。' });
            }
            if (!targetMember.bannable) {
                return interaction.editReply({ content: 'BotがこのユーザーをBANする権限がありません。Botのロールがユーザーより上位にありません。' });
            }
        }
        
        // 確認Embedとボタン
        const confirmEmbed = new EmbedBuilder()
            .setColor('#c0392b') // Dark Red
            .setTitle('🚨 BANの最終確認')
            .setDescription(`ユーザー **${targetUser.tag}** をサーバーからBANしますか？ この操作は永続的です。`)
            .setThumbnail(targetUser.displayAvatarURL())
            .addFields(
                { name: '対象ユーザー', value: targetUser.tag, inline: true },
                { name: 'ユーザーID', value: targetId, inline: true },
                { name: '理由', value: reason, inline: false }
            )
            .setTimestamp();
        
        const confirmButton = new ButtonBuilder()
            .setCustomId('ban_confirm')
            .setLabel('BANを実行')
            .setStyle(ButtonStyle.Danger);
        
        const cancelButton = new ButtonBuilder()
            .setCustomId('ban_cancel')
            .setLabel('キャンセル')
            .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

        await interaction.editReply({ 
            embeds: [confirmEmbed], 
            components: [row]
        });

        // 応答を待つ
        const filter = i => (i.customId === 'ban_confirm' || i.customId === 'ban_cancel') && i.user.id === interaction.user.id;
        
        try {
            const confirmation = await interaction.channel.awaitMessageComponent({ 
                filter, 
                time: 30000 
            });

            if (confirmation.customId === 'ban_confirm') {
                // BAN実行
                await guild.bans.create(targetId, { reason });

                const successEmbed = new EmbedBuilder()
                    .setColor('#2ecc77') // Success Green
                    .setTitle('✅ BAN完了')
                    .setDescription(`ユーザー **${targetUser.tag}** (ID: ${targetId}) をBANしました。`)
                    .addFields(
                        { name: '実行者', value: `<@${interaction.user.id}>`, inline: true },
                        { name: '理由', value: reason, inline: true }
                    )
                    .setTimestamp();

                await confirmation.update({ 
                    content: 'BANが実行されました。', 
                    embeds: [successEmbed], 
                    components: [] 
                });

            } else {
                await confirmation.update({ 
                    content: 'BAN操作をキャンセルしました。', 
                    embeds: [], 
                    components: [] 
                });
            }

        } catch (e) {
            // タイムアウト後の再応答を防ぐ
             if (interaction.replied || interaction.deferred) {
                await interaction.editReply({ 
                    content: '操作時間が経過したため、BANをキャンセルしました。', 
                    components: [], 
                    embeds: [] 
                }).catch(() => {});
            }
        }
    },
};
