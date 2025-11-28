import { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    PermissionFlagsBits 
} from 'discord.js';

// 🚨 注意: チャンネルリセット後に送信する画像のURLをここに設定してください。
// Design.pngをDiscordなどにアップロードして、直リンクURLを取得する必要があります。
const NUKE_IMAGE_URL = 'https://raw.githubusercontent.com/m6chch/machas/refs/heads/main/Design.png'; 
// ↑ 現在はプレースホルダー画像を使用しています。

export default {
    data: new SlashCommandBuilder()
        .setName('nuke')
        .setDescription('チャンネルを削除し、同じ設定で新しく作成し直します。（全メッセージ削除）')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels), // チャンネルの管理権限が必要
    
    async execute(interaction) {
        // Discordの3秒応答制限を回避するため、まず処理中であることを応答します
        await interaction.deferReply({ ephemeral: true });

        const oldChannel = interaction.channel;
        const guild = interaction.guild;

        // 確認Embed
        const confirmEmbed = new EmbedBuilder()
            .setColor('#e74c3c') // Red
            .setTitle('☢️ チャンネルリセット（NUKE）の最終確認')
            .setDescription(`**${oldChannel.name}** チャンネルを完全に削除し、新しく作り直します。**この操作は元に戻せません！**`)
            .addFields(
                { name: '対象チャンネル', value: `<#${oldChannel.id}>`, inline: true },
                { name: '操作内容', value: 'すべてのメッセージと設定がリセットされます。', inline: true }
            )
            .setFooter({ text: '本当に実行しますか？' })
            .setTimestamp();
        
        // 確認ボタン
        const confirmButton = new ButtonBuilder()
            .setCustomId('nuke_confirm')
            .setLabel('削除＆再作成を実行 (NUKE)')
            .setStyle(ButtonStyle.Danger);
        
        const cancelButton = new ButtonBuilder()
            .setCustomId('nuke_cancel')
            .setLabel('キャンセル')
            .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

        // 応答を編集して確認メッセージを表示
        await interaction.editReply({ 
            embeds: [confirmEmbed], 
            components: [row]
        });

        // 応答を待つ
        const filter = i => (i.customId === 'nuke_confirm' || i.customId === 'nuke_cancel') && i.user.id === interaction.user.id;
        
        try {
            const confirmation = await interaction.channel.awaitMessageComponent({ 
                filter, 
                time: 30000 
            });

            if (confirmation.customId === 'nuke_confirm') {
                // 実行中の処理をユーザーに一時的に通知
                await confirmation.update({ 
                    content: 'チャンネルリセットを実行中です... しばらくお待ちください。',
                    embeds: [],
                    components: [] 
                });

                // 1. チャンネルのプロパティを保存
                const channelData = {
                    name: oldChannel.name,
                    type: oldChannel.type,
                    topic: oldChannel.topic,
                    parent: oldChannel.parent,
                    position: oldChannel.position,
                    permissionOverwrites: oldChannel.permissionOverwrites.cache.map(overwrite => ({
                        id: overwrite.id,
                        allow: overwrite.allow.toArray(),
                        deny: overwrite.deny.toArray(),
                        type: overwrite.type,
                    })),
                };

                // 2. 元のチャンネルを削除
                await oldChannel.delete();

                // 3. 新しいチャンネルを作成
                const newChannel = await guild.channels.create({
                    name: channelData.name,
                    type: channelData.type,
                    topic: channelData.topic,
                    parent: channelData.parent,
                    position: channelData.position,
                    permissionOverwrites: channelData.permissionOverwrites,
                    reason: `Nukeコマンドによるチャンネルリセット by ${interaction.user.tag}`
                });

                // 4. 成功メッセージを新しいチャンネルに送信 (Design.png 埋め込み付き)
                const nukeEmbed = new EmbedBuilder()
                    .setColor('#2ecc71') // Success Green
                    .setTitle('💥 チャンネルリセット完了')
                    .setDescription('このチャンネルはリセットされ、すべてのメッセージが削除されました。')
                    .setImage(NUKE_IMAGE_URL) // Design.pngの代わりに、設定したURLの画像を使用
                    .addFields(
                        { name: '実行者', value: `<@${interaction.user.id}>`, inline: true },
                        { name: '元のチャンネル', value: `チャンネル名: ${channelData.name}`, inline: true }
                    )
                    .setTimestamp();
                
                await newChannel.send({ embeds: [nukeEmbed] });

            } else {
                await confirmation.update({ 
                    content: 'チャンネルリセット操作をキャンセルしました。', 
                    embeds: [], 
                    components: [] 
                });
            }

        } catch (e) {
            console.error('Nukeコマンド実行エラー:', e);
            // タイムアウト後の再応答を防ぐ
             if (interaction.deferred) {
                await interaction.editReply({ 
                    content: '操作中にエラーが発生するか、時間が経過したため、チャンネルリセットをキャンセルしました。', 
                    components: [], 
                    embeds: [] 
                }).catch(() => {});
            }
        }
    },
};
