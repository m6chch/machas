import { 
    ActionRowBuilder, 
    EmbedBuilder, 
    StringSelectMenuBuilder 
} from 'discord.js';

// ----------------------------------------------------
// ⚠️ 設定: ログとカウンタのチャンネルID
// ----------------------------------------------------
const LOG_CHANNEL_ID = '1448256554624094241';

// ----------------------------------------------------
// 💡 配布アイテムのデータ定義 (commands/free-gift.js と同じ内容)
// ----------------------------------------------------
const items = [
    { name: '１. 業者パック１', value: 'pack1', url: 'https://www.mediafire.com/file/dvt9wkt5iw60asg/coc.txt/file' },
    { name: '２. 業者パック２', value: 'pack2', url: 'https://www.mediafire.com/file/dvt9wkt5iw60asg/coc.txt/file' },
    { name: '３. スクリプトテンプレ', value: 'script_template', url: 'https://www.mediafire.com/file/x1vb011nuuz5z2k/%25E3%2583%86%25E3%2583%B3%E3%2583%97%E3%2583%AC.lua/file' },
    { name: '４. アニメ,映画見放題サイト', value: 'anime_site', url: 'https://9animetv.to/' },
    { name: '５. 漫画サイト（広告なし）', value: 'manga_site', url: 'https://mangarawplus.cv' }
];

// ----------------------------------------------------
// 🛠️ カウンタのメッセージを更新する処理 (非常に重要な箇所)
// ----------------------------------------------------
/**
 * ログチャンネルの最初のメッセージにある半角数字をインクリメントし、ログを追加します。
 * * @param {import('discord.js').Client} client Discordクライアント
 * @param {import('discord.js').User} user 配布を受け取ったユーザー
 * @param {string} itemName 配布アイテム名
 */
async function updateCounterAndLog(client, user, itemName) {
    try {
        // 外部から渡された client を使用
        const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
        if (!logChannel || logChannel.type !== 0) { // 0はGUILD_TEXT
            console.error(`[FreeGift] ログチャンネルID ${LOG_CHANNEL_ID} が無効またはテキストチャンネルではありません。`);
            return;
        }

        // 1. カウンタメッセージの処理（チャンネルの最初のメッセージ）
        const messages = await logChannel.messages.fetch({ limit: 10, after: '0' }); // チャンネルの最初のメッセージを取得
        const firstMessage = messages.last();

        let newCount = 1;

        if (firstMessage) {
            // 最初のメッセージの内容から半角数字を抽出
            const match = firstMessage.content.match(/(\d+)/);
            let currentCount = match ? parseInt(match[1], 10) : 0;
            newCount = currentCount + 1;
            
            // メッセージ内容を編集（Botが送信したメッセージであることを想定）
            const updatedContent = firstMessage.content.replace(/(\d+)/, newCount.toString());
            await firstMessage.edit(updatedContent).catch(e => {
                console.error("[FreeGift] カウンタメッセージの編集に失敗しました:", e.message);
            });
        } else {
            // 最初のメッセージがない場合、新規でカウンタメッセージを作成
            await logChannel.send(`**無料配布実績カウンター:** ${newCount}`).catch(e => {
                console.error("[FreeGift] 新規カウンタメッセージの送信に失敗しました:", e.message);
            });
        }
        
        // 2. 詳細な配布ログの送信
        const logEmbed = new EmbedBuilder()
            .setColor('#3498db') // 青
            .setTitle('📥 配布アイテム受取ログ')
            .setDescription(`**合計配布実績:** ${newCount} 件`)
            .addFields(
                { name: '👤 受け取ったユーザー', value: `${user.tag} (${user.id})`, inline: true },
                { name: '🎁 受け取ったアイテム', value: itemName, inline: true },
                { name: '🕒 時刻', value: new Date().toLocaleString('ja-JP'), inline: false }
            )
            .setTimestamp();

        // ログはEmbedと```（コードブロック）で囲んだテキストとして送信
        const logText = `\`\`\`diff\n+ ユーザー: ${user.tag}\n+ アイテム: ${itemName}\n+ 時刻: ${new Date().toLocaleString('ja-JP')}\n\`\`\``;

        await logChannel.send({
            content: logText,
            embeds: [logEmbed]
        }).catch(e => {
            console.error("[FreeGift] 詳細ログの送信に失敗しました:", e.message);
        });

    } catch (error) {
        console.error('[FreeGift] ログ/カウンタ処理中にエラーが発生しました:', error);
    }
}


export default {
    // 既存のinteractionCreate.jsから呼び出されることを想定
    // interaction と client (Botクライアント) を受け取るように修正
    async execute(interaction, client) {
        // 'free_gift_purchase'ボタンが押されたとき
        if (interaction.isButton() && interaction.customId === 'free_gift_purchase') {
            await interaction.deferReply({ ephemeral: true });

            // ------------------
            // セレクトメニューの作成
            // ------------------
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('free_gift_select') // カスタムIDを定義
                .setPlaceholder('受け取りたいアイテムを選択してください')
                .addOptions(
                    items.map(item => ({
                        label: item.name,
                        description: `${item.name}をDMで受け取ります`,
                        value: item.value,
                    }))
                );

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await interaction.editReply({
                content: '⬇️ アイテムを選択してください。',
                components: [row],
                ephemeral: true
            });
            return;
        }

        // 'free_gift_select'セレクトメニューが選択されたとき
        if (interaction.isStringSelectMenu() && interaction.customId === 'free_gift_select') {
            await interaction.deferReply({ ephemeral: true });

            const selectedValue = interaction.values[0];
            const selectedItem = items.find(item => item.value === selectedValue);

            if (!selectedItem) {
                await interaction.editReply('❌ 無効なアイテムが選択されました。');
                return;
            }

            const user = interaction.user;

            try {
                // ------------------
                // 1. ユーザーのDMにアイテムを送信
                // ------------------
                const dmEmbed = new EmbedBuilder()
                    .setColor('#f1c40f') // 黄色
                    .setTitle(`🎁 ${selectedItem.name} を受け取りました！`)
                    .setDescription(`**${selectedItem.name}** のリンクは以下の通りです。リンク切れの場合は管理者に連絡してください。\n\n**ダウンロードリンク:** [${selectedItem.name}へのリンク](${selectedItem.url})`)
                    .setTimestamp();
                
                await user.send({ embeds: [dmEmbed] });

                // ------------------
                // 2. ログチャンネルのカウンタを更新し、詳細ログを送信
                // ------------------
                // interaction.client の代わりに client を使用
                await updateCounterAndLog(client, user, selectedItem.name);
                
                // ------------------
                // 3. ユーザーに完了メッセージを送信
                // ------------------
                await interaction.editReply({
                    content: `✅ **${selectedItem.name}** をあなたのDMに送信しました。DMを確認してください。`,
                    components: []
                });

            } catch (error) {
                console.error(`[FreeGift] DM送信またはログ記録エラー: ${error.message}`);
                await interaction.editReply('❌ DMの送信に失敗しました。（DMが閉じられている可能性があります。DM設定を確認してください。）');
            }
            return;
        }
    }
};
