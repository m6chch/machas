import { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    ButtonStyle, 
    ButtonBuilder, 
    PermissionFlagsBits, 
    ComponentType 
} from 'discord.js';

// タイムアウト時間の定義
const TIMEOUT_OPTIONS = [
    { label: '60秒', value: '60000', emoji: '⏱️' },
    { label: '5分', value: '300000', emoji: '🕒' },
    { label: '10分', value: '600000', emoji: '🔟' },
    { label: '1時間', value: '3600000', emoji: '🕐' },
    { label: '1日', value: '86400000', emoji: '📅' },
    { label: '1週間', value: '604800000', emoji: '🗓️' },
    { label: '28日', value: '2419200000', emoji: '🛑' },
];

export default {
    data: new SlashCommandBuilder()
        .setName('timeout')
        .setDescription('指定したメンバーを一時的にタイムアウトさせます。')
        .addUserOption(option => 
            option.setName('target')
                .setDescription('タイムアウトするメンバー')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('reason')
                .setDescription('タイムアウトの理由')
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
        if (targetMember.id === interaction.client.user.id) {
            return interaction.editReply({ content: 'Bot自身をタイムアウトすることはできません。' });
        }

        // 権限チェック
        if (targetMember.roles.highest.position >= interaction.member.roles.highest.position) {
            return interaction.editReply({ content: 'そのユーザーはあなたより上位のロールを持っているため、タイムアウトできません。' });
        }
        if (!targetMember.manageable) {
            return interaction.editReply({ content: 'Botがこのユーザーをタイムアウトする権限がありません。Botのロールがユーザーより上位にありません。' });
        }

        // タイムアウト時間選択のセレクトメニュー
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('select_timeout_duration')
            .setPlaceholder('タイムアウト期間を選択...')
            .addOptions(TIMEOUT_OPTIONS.map(opt => ({
                label: opt.label,
                value: opt.value,
                emoji: opt.emoji
            })));

        const row = new ActionRowBuilder().addComponents(selectMenu);

        const embed = new EmbedBuilder()
            .setColor('#f39c12') // Orange
            .setTitle('🛑 タイムアウトの確認')
            .setDescription(`**${targetMember.user.tag}** をタイムアウトします。期間を選択してください。`)
            .addFields(
                { name: '対象ユーザー', value: `<@${targetMember.id}>`, inline: true },
                { name: '理由', value: reason, inline: true }
            )
            .setTimestamp();

        // deferReply後にeditReplyで実際のコンテンツを送信
        await interaction.editReply({ 
            embeds: [embed], 
            components: [row]
        });

        // コマンド実行者からの応答（セレクトメニューの選択）を待つ
        const filter = i => i.customId === 'select_timeout_duration' && i.user.id === interaction.user.id;
        try {
            const confirmation = await interaction.channel.awaitMessageComponent({ 
                filter, 
                componentType: ComponentType.SelectMenu, 
                time: 60000 // 60秒待機
            });

            const durationMs = parseInt(confirmation.values[0]);
            const durationLabel = TIMEOUT_OPTIONS.find(opt => opt.value === String(durationMs)).label;

            // 最終確認ボタン
            const confirmButton = new ButtonBuilder()
                .setCustomId('timeout_confirm')
                .setLabel(`${durationLabel} でタイムアウトを実行`)
                .setStyle(ButtonStyle.Danger);
            
            const cancelButton = new ButtonBuilder()
                .setCustomId('timeout_cancel')
                .setLabel('キャンセル')
                .setStyle(ButtonStyle.Secondary);

            const finalRow = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

            await confirmation.update({
                content: `期間: **${durationLabel}** を選択しました。この操作を実行しますか？`,
                embeds: [embed],
                components: [finalRow]
            });
            
            const finalFilter = i => (i.customId === 'timeout_confirm' || i.customId === 'timeout_cancel') && i.user.id === interaction.user.id;
            
            const finalConfirmation = await interaction.channel.awaitMessageComponent({
                filter: finalFilter,
                componentType: ComponentType.Button,
                time: 30000 // 30秒待機
            });

            if (finalConfirmation.customId === 'timeout_confirm') {
                // タイムアウト実行
                await targetMember.timeout(durationMs, reason);

                const successEmbed = new EmbedBuilder()
                    .setColor('#2ecc77') // Success Green
                    .setTitle('✅ タイムアウト完了')
                    .setDescription(`<@${targetMember.id}> を**${durationLabel}**タイムアウトしました。`)
                    .addFields(
                        { name: '実行者', value: `<@${interaction.user.id}>`, inline: true },
                        { name: '理由', value: reason, inline: true }
                    )
                    .setTimestamp();

                await finalConfirmation.update({ 
                    content: 'タイムアウトが実行されました。', 
                    embeds: [successEmbed], 
                    components: [] 
                });

            } else {
                await finalConfirmation.update({ 
                    content: 'タイムアウト操作をキャンセルしました。', 
                    embeds: [], 
                    components: [] 
                });
            }

        } catch (e) {
            // タイムアウト後の再応答を防ぐ
            if (interaction.replied || interaction.deferred) {
                await interaction.editReply({ 
                    content: '操作時間が経過したため、タイムアウトをキャンセルしました。', 
                    components: [], 
                    embeds: [] 
                }).catch(() => {});
            }
        }
    },
};
