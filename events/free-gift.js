import { 
    ActionRowBuilder, 
    EmbedBuilder, 
    StringSelectMenuBuilder 
} from 'discord.js';

// ----------------------------------------------------
// ⚠️ 設定: ログとカウンタのチャンネルID
// ----------------------------------------------------
// 【重要】
// 1. LOG_CHANNEL_ID: 詳細な配布ログをEmbedで送信するチャンネルのID
const LOG_CHANNEL_ID = '1448256554624094241'; 
// 2. COUNTER_CHANNEL_ID: チャンネル名自体に数字が含まれる、更新対象のチャンネルID
const COUNTER_CHANNEL_ID = '1448256554624094241'; 
// 例: COUNTER_CHANNEL_ID = '123456789012345678'; 
// ----------------------------------------------------


// 💡 配布アイテムのデータ定義 (省略。変更なし)
const items = [
    { name: '１. 業者パック１', value: 'pack1', url: 'https://www.mediafire.com/file/dvt9wkt5iw60asg/coc.txt/file' },
    { name: '２. 業者パック２', value: 'pack2', url: 'https://www.mediafire.com/file/dvt9wkt5iw60asg/coc.txt/file' },
    { name: '３. スクリプトテンプレ', value: 'script_template', url: 'https://www.mediafire.com/file/x1vb011nuuz5z2k/%25E3%2583%86%25E3%2583%B3%E3%2583%97%E3%2583%AC.lua/file' },
    { name: '４. アニメ,映画見放題サイト', value: 'anime_site', url: 'https://9animetv.to/' },
    { name: '５. 漫画サイト（広告なし）', value: 'manga_site', url: 'https://mangarawplus.cv' }
];

// ----------------------------------------------------
// 🛠️ チャンネル名のカウンタを更新し、ログを送信する処理 (大幅に修正)
// ----------------------------------------------------
async function updateCounterAndLog(client, user, itemName) {
    let newCount = 0;
    let baseChannelName = ''; // 例: '配布実績：'

    try {
        // 1. チャンネル名カウンタの更新処理
        const counterChannel = await client.channels.fetch(COUNTER_CHANNEL_ID);

        if (counterChannel) {
            const currentName = counterChannel.name;
            // 現在の名前に含まれる数字を抽出
            const match = currentName.match(/(\d+)/); 
            const currentCount = match ? parseInt(match[1], 10) : 0;
            newCount = currentCount + 1;

            // 数字以外の部分を抽出 (例: "配布実績-123" -> "配布実績-")
            baseChannelName = currentName.replace(match ? match[0] : '', '').trim();
            if (baseChannelName.endsWith('-') || baseChannelName.endsWith('：')) {
                 baseChannelName = baseChannelName.slice(0, -1);
            }
            if (baseChannelName === '') {
                baseChannelName = '配布実績：'; // 数字以外の部分がなかった場合のデフォルト名
            }

            const newName = `${baseChannelName} ${newCount}`;
            
            // チャンネル名を新しい名前に更新
            await counterChannel.setName(newName);
            
            console.log(`[FreeGift] チャンネル名が ${newName} に更新されました。`);
        } else {
             console.error(`[FreeGift] カウンタチャンネルID ${COUNTER_CHANNEL_ID} が無効です。チャンネル名更新をスキップします。`);
        }
        
    } catch (error) {
        // チャンネル名更新時のエラー (権限不足、レートリミットなど)
        console.error('[FreeGift] チャンネル名更新中にエラーが発生しました:', error);
    }
    
    // 2. 詳細ログのEmbed送信処理 (LOG_CHANNEL_IDへ)
    try {
        const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);

        if (logChannel) {
             const logEmbed = new EmbedBuilder()
                .setColor('#3498db')
                .setTitle('📥 配布アイテム受取ログ')
                // チャンネル名カウンタが更新できていれば、その数字を使う
                .setDescription(`**チャンネルカウンタ実績:** ${newCount} 件`) 
                .addFields(
                    { name: '👤 受け取ったユーザー', value: `${user.tag} (${user.id})`, inline: true },
                    { name: '🎁 受け取ったアイテム', value: itemName, inline: true },
                    { name: '🕒 時刻', value: new Date().toLocaleString('ja-JP'), inline: false }
                )
                .setTimestamp();

            await logChannel.send({ embeds: [logEmbed] });
        }
    } catch (error) {
         console.error('[FreeGift] 詳細ログの送信に失敗しました:', error);
    }
}


// ----------------------------------------------------
// 🚀 イベントハンドラの関数 (handleFreeGiftInteraction)
// ----------------------------------------------------
// ※ この部分は前回のコードとほぼ同じですが、updateCounterAndLogの引数を調整しています。

export async function handleFreeGiftInteraction(interaction, client) {
    
    // 省略 (ボタン・メニューの処理ロジックは前回通りで変更なし)
    // ... [ボタン処理: free_gift_purchase] ...
    if (interaction.isButton() && interaction.customId === 'free_gift_purchase') {
        // ... (省略: セレクトメニュー表示) ...
        try {
             const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('free_gift_select')
                .setPlaceholder('受け取りたいアイテムを選択してください')
                .addOptions(items.map(item => ({
                    label: item.name,
                    description: `${item.name}をDMで受け取ります`,
                    value: item.value,
                })));
            const row = new ActionRowBuilder().addComponents(selectMenu);
            await interaction.reply({ content: '⬇️ アイテムを選択してください。', components: [row], ephemeral: true });
            return true;
        } catch (error) {
            console.error('[FreeGift] ボタン処理エラー:', error);
            return true;
        }
    }

    // ... [セレクトメニュー処理: free_gift_select] ...
    if (interaction.isStringSelectMenu() && interaction.customId === 'free_gift_select') {
        const selectedValue = interaction.values[0];
        const selectedItem = items.find(item => item.value === selectedValue);

        if (!selectedItem) {
            await interaction.reply({ content: '❌ 無効なアイテムです。', ephemeral: true });
            return true;
        }

        try {
            await interaction.update({ content: `🔄 **${selectedItem.name}** をDMに送信中...`, components: [] });

            const user = interaction.user;

            // --- DM送信処理 ---
            const dmEmbed = new EmbedBuilder()
                .setColor('#f1c40f')
                .setTitle(`🎁 ${selectedItem.name} を受け取りました！`)
                .setDescription(`以下のリンクからダウンロードまたはアクセスしてください。\n\n**🔗 リンク:** [こちらをクリック](${selectedItem.url})`)
                .setTimestamp();
            
            await user.send({ embeds: [dmEmbed] });

            // --- チャンネル名カウンタ更新処理を実行 ---
            await updateCounterAndLog(client, user, selectedItem.name);
            
            // --- 完了メッセージ ---
            await interaction.editReply({
                content: `✅ **${selectedItem.name}** をDMに送信しました！`,
                components: []
            });

        } catch (error) {
            // ... (エラーハンドリングは省略。前回と同じ) ...
             console.error(`[FreeGift] 送信エラー: ${error.message}`);
             if (interaction.deferred || interaction.replied) {
                 await interaction.editReply({ content: '❌ DMの送信に失敗しました。', components: [] }).catch(() => {});
             } else {
                 await interaction.reply({ content: '❌ エラーが発生しました。', ephemeral: true }).catch(() => {});
             }
        }
        
        return true; 
    }

    return false;
}
