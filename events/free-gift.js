import { 
    ActionRowBuilder, 
    EmbedBuilder, 
    StringSelectMenuBuilder 
} from 'discord.js';

// ----------------------------------------------------
// ⚠️ 設定: ログとカウンタのチャンネルID
// ----------------------------------------------------
// 【重要】ご自身の環境に合わせてIDを設定してください
// 1. LOG_CHANNEL_ID: 詳細な配布ログをEmbedで送信するチャンネルのID
const LOG_CHANNEL_ID = '1448256554624094241'; 
// 2. COUNTER_CHANNEL_ID: チャンネル名自体に数字が含まれる、更新対象のチャンネルID
const COUNTER_CHANNEL_ID = '1448256554624094241'; 
// ----------------------------------------------------


// 💡 配布アイテムのデータ定義 (commands/free-gift.js と共通)
const items = [
    { name: '１. 業者パック１', value: 'pack1', url: 'https://www.mediafire.com/file/dvt9wkt5iw60asg/coc.txt/file' },
    { name: '２. 業者パック２', value: 'pack2', url: 'https://www.mediafire.com/file/dvt9wkt5iw60asg/coc.txt/file' },
    { name: '３. スクリプトテンプレ', value: 'script_template', url: 'https://www.mediafire.com/file/x1vb011nuuz5z2k/%25E3%2583%86%25E3%2583%B3%E3%2583%97%E3%2583%AC.lua/file' },
    { name: '４. アニメ,映画見放題サイト', value: 'anime_site', url: 'https://9animetv.to/' },
    { name: '５. 漫画サイト（広告なし）', value: 'manga_site', url: 'https://mangarawplus.cv' }
];

// ----------------------------------------------------
// 🛠️ チャンネル名のカウンタを更新し、ログを送信する処理
// ----------------------------------------------------
async function updateCounterAndLog(client, user, itemName) {
    let newCount = 0;
    
    try {
        // 1. チャンネル名カウンタの更新処理
        const counterChannel = await client.channels.fetch(COUNTER_CHANNEL_ID);

        if (counterChannel) {
            const currentName = counterChannel.name;
            // 現在の名前に含まれる数字を抽出
            const match = currentName.match(/(\d+)/); 
            const currentCount = match ? parseInt(match[1], 10) : 0;
            newCount = currentCount + 1;

            // 数字以外の部分を抽出（例: "配布実績：123" -> "配布実績："）
            let baseChannelName = currentName.replace(match ? match[0] : '', '').trim();
            // 抽出後の名前に接尾辞がないか確認
            if (baseChannelName.endsWith('-') || baseChannelName.endsWith('：')) {
                 // 末尾の記号は残す
            } else if (baseChannelName === '') {
                baseChannelName = '配布実績：'; // 数字以外の部分がなかった場合のデフォルト名
            } else {
                 baseChannelName += '：'; // 例: "実績" -> "実績："
            }
            
            const newName = `${baseChannelName}${newCount}`;
            
            // チャンネル名を新しい名前に更新
            await counterChannel.setName(newName);
            
            console.log(`[FreeGift] チャンネル名が ${newName} に更新されました。`);
        } else {
             console.error(`[FreeGift] カウンタチャンネルID ${COUNTER_CHANNEL_ID} が無効です。チャンネル名更新をスキップします。`);
        }
        
    } catch (error) {
        // チャンネル名更新時のエラー (権限不足、レートリミットなど)
        console.error('[FreeGift] チャンネル名更新中にエラーが発生しました:', error.message);
    }
    
    // 2. 詳細ログのEmbed送信処理 (LOG_CHANNEL_IDへ)
    try {
        const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);

        if (logChannel) {
             const logEmbed = new EmbedBuilder()
                .setColor('#3498db')
                .setTitle('📥 配布アイテム受取ログ')
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
         console.error('[FreeGift] 詳細ログの送信に失敗しました:', error.message);
    }
}


/**
 * free-gift関連のインタラクションを一括処理する関数
 * @param {import('discord.js').Interaction} interaction 
 * @param {import('discord.js').Client} client 
 * @returns {Promise<boolean>} 処理した場合はtrue、関係ないIDならfalse
 */
export async function handleFreeGiftInteraction(interaction, client) {
    
    // =================================================
    // 1. 「無料ギフト購入」ボタンが押された時の処理
    // =================================================
    if (interaction.isButton() && interaction.customId === 'free_gift_purchase') {
        
        // 🚨 修正点: Unknown interactionを避けるため、まず deferReply を実行
        await interaction.deferReply({ ephemeral: true });
        
        try {
            // セレクトメニューの作成
            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('free_gift_select')
                .setPlaceholder('受け取りたいアイテムを選択してください')
                .addOptions(items.map(item => ({
                    label: item.name,
                    description: `${item.name}をDMで受け取ります`,
                    value: item.value,
                })));

            const row = new ActionRowBuilder().addComponents(selectMenu);

            // deferReply への応答として editReply を使用
            await interaction.editReply({
                content: '⬇️ アイテムを選択してください。',
                components: [row],
            });
            
            return true; 

        } catch (error) {
            console.error('[FreeGift] ボタン処理エラー:', error.message);
            // 処理を試みたので true を返す
            return true;
        }
    }

    // =================================================
    // 2. メニューでアイテムが選択された時の処理
    // =================================================
    if (interaction.isStringSelectMenu() && interaction.customId === 'free_gift_select') {
        
        const selectedValue = interaction.values[0];
        const selectedItem = items.find(item => item.value === selectedValue);

        if (!selectedItem) {
            // セレクトメニュー自体は ephemeral なので update で応答
            await interaction.update({ content: '❌ 無効なアイテムが選択されました。', components: [] });
            return true;
        }

        try {
            // 🔄 interaction.update を使用して既存のメニューメッセージをローディング表示に上書き
            await interaction.update({ 
                content: `🔄 **${selectedItem.name}** をDMに送信中...`, 
                components: [] 
            });

            const user = interaction.user;

            // --- DM送信処理 ---
            const dmEmbed = new EmbedBuilder()
                .setColor('#f1c40f')
                .setTitle(`🎁 ${selectedItem.name} を受け取りました！`)
                .setDescription(`以下のリンクからダウンロードまたはアクセスしてください。\n\n**🔗 リンク:** [こちらをクリック](${selectedItem.url})\n\n※リンク切れの場合は管理者へご連絡ください。`)
                .setTimestamp();
            
            await user.send({ embeds: [dmEmbed] });

            // --- チャンネル名カウンタ更新と詳細ログ送信処理を実行 ---
            await updateCounterAndLog(client, user, selectedItem.name);
            
            // --- 完了メッセージ ---
            // updateしたメッセージをさらに編集して完了通知
            await interaction.editReply({
                content: `✅ **${selectedItem.name}** をDMに送信しました！\n(DMが届かない場合は、DM設定を許可にしてください)`,
                components: []
            });

        } catch (error) {
             console.error(`[FreeGift] 送信エラー: ${error.message}`);
             
             // ユーザーにエラーを通知 (DM失敗など)
             if (interaction.deferred || interaction.replied) {
                 await interaction.editReply({ 
                     content: '❌ DMの送信または処理に失敗しました。', 
                     components: [] 
                 }).catch(() => {});
             } else {
                 await interaction.reply({ 
                     content: '❌ エラーが発生しました。', 
                     ephemeral: true 
                 }).catch(() => {});
             }
        }
        
        return true; 
    }

    // 関係ないインタラクションの場合は false を返す
    return false;
}
