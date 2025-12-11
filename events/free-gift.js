import { 
    Events,
    ActionRowBuilder, 
    EmbedBuilder, 
    StringSelectMenuBuilder 
} from 'discord.js';

// ----------------------------------------------------
// ⚠️ 設定: ログとカウンタのチャンネルID
// ----------------------------------------------------
const LOG_CHANNEL_ID = '1448256554624094241';

// ----------------------------------------------------
// 💡 配布アイテムのデータ定義
// ----------------------------------------------------
const items = [
    { name: '１. 業者パック１', value: 'pack1', url: 'https://www.mediafire.com/file/dvt9wkt5iw60asg/coc.txt/file' },
    { name: '２. 業者パック２', value: 'pack2', url: 'https://www.mediafire.com/file/dvt9wkt5iw60asg/coc.txt/file' },
    { name: '３. スクリプトテンプレ', value: 'script_template', url: 'https://www.mediafire.com/file/x1vb011nuuz5z2k/%25E3%2583%86%25E3%2583%B3%E3%2583%97%E3%2583%AC.lua/file' },
    { name: '４. アニメ,映画見放題サイト', value: 'anime_site', url: 'https://9animetv.to/' },
    { name: '５. 漫画サイト（広告なし）', value: 'manga_site', url: 'https://mangarawplus.cv' }
];

// ----------------------------------------------------
// 🛠️ カウンタのメッセージを更新し、ログを送信する処理
// ----------------------------------------------------
async function updateCounterAndLog(client, user, itemName) {
    try {
        const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
        if (!logChannel) {
            console.error(`[FreeGift] ログチャンネルID ${LOG_CHANNEL_ID} が見つかりません。`);
            return;
        }

        // 過去のメッセージを取得してカウンタを探す
        const messages = await logChannel.messages.fetch({ limit: 10 });
        // ボット自身が送信した "無料配布実績カウンター" を含むメッセージを探す
        const counterMessage = messages.find(m => m.author.id === client.user.id && m.content.includes('無料配布実績カウンター'));

        let newCount = 1;

        if (counterMessage) {
            const match = counterMessage.content.match(/(\d+)/);
            let currentCount = match ? parseInt(match[1], 10) : 0;
            newCount = currentCount + 1;
            
            await counterMessage.edit(`**無料配布実績カウンター:** ${newCount}`).catch(e => {
                console.error("[FreeGift] カウンタメッセージの編集に失敗しました:", e.message);
            });
        } else {
            // カウンタメッセージがなければ新規作成
            await logChannel.send(`**無料配布実績カウンター:** ${newCount}`).catch(e => {
                console.error("[FreeGift] 新規カウンタメッセージの送信に失敗しました:", e.message);
            });
        }
        
        // 詳細ログのEmbed
        const logEmbed = new EmbedBuilder()
            .setColor('#3498db')
            .setTitle('📥 配布アイテム受取ログ')
            .setDescription(`**合計配布実績:** ${newCount} 件`)
            .addFields(
                { name: '👤 受け取ったユーザー', value: `${user.tag} (${user.id})`, inline: true },
                { name: '🎁 受け取ったアイテム', value: itemName, inline: true },
                { name: '🕒 時刻', value: new Date().toLocaleString('ja-JP'), inline: false }
            )
            .setTimestamp();

        // ログチャンネルに送信
        await logChannel.send({ embeds: [logEmbed] }).catch(e => {
            console.error("[FreeGift] 詳細ログの送信に失敗しました:", e.message);
        });

    } catch (error) {
        console.error('[FreeGift] ログ/カウンタ処理中にエラーが発生しました:', error);
    }
}

// ----------------------------------------------------
// 🚀 イベントハンドラのエクスポート
// ----------------------------------------------------
export default {
    name: Events.InteractionCreate,
    
    /**
     * @param {import('discord.js').Interaction} interaction 
     */
    async execute(interaction) {
        // このイベントファイルで処理すべきIDか確認する
        const isFreeGiftButton = interaction.isButton() && interaction.customId === 'free_gift_purchase';
        const isFreeGiftSelect = interaction.isStringSelectMenu() && interaction.customId === 'free_gift_select';

        // 対象外のインタラクションなら何もしない
        if (!isFreeGiftButton && !isFreeGiftSelect) return;

        const client = interaction.client;

        // =================================================
        // 1. 「無料ギフト購入」ボタンが押された時の処理
        // =================================================
        if (isFreeGiftButton) {
            try {
                // セレクトメニューの作成
                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('free_gift_select')
                    .setPlaceholder('受け取りたいアイテムを選択してください')
                    .addOptions(
                        items.map(item => ({
                            label: item.name,
                            description: `${item.name}をDMで受け取ります`,
                            value: item.value,
                        }))
                    );

                const row = new ActionRowBuilder().addComponents(selectMenu);

                // ボタンを押した人だけにメニューを表示 (ephemeral: true)
                await interaction.reply({
                    content: '⬇️ アイテムを選択してください。',
                    components: [row],
                    ephemeral: true
                });
            } catch (error) {
                console.error('[FreeGift] ボタン処理エラー:', error);
            }
        }

        // =================================================
        // 2. メニューでアイテムが選択された時の処理
        // =================================================
        if (isFreeGiftSelect) {
            const selectedValue = interaction.values[0];
            const selectedItem = items.find(item => item.value === selectedValue);

            if (!selectedItem) {
                await interaction.reply({ content: '❌ 無効なアイテムです。', ephemeral: true });
                return;
            }

            try {
                // ⚠️ ここが重要: replyではなくupdateを使うことで、
                // 「アイテムを選択してください」のメッセージを上書きし、読み込み完了状態にする
                await interaction.update({
                    content: `🔄 **${selectedItem.name}** をDMに送信中...`,
                    components: [] // メニューを消す
                });

                const user = interaction.user;

                // --- DM送信処理 ---
                const dmEmbed = new EmbedBuilder()
                    .setColor('#f1c40f')
                    .setTitle(`🎁 ${selectedItem.name} を受け取りました！`)
                    .setDescription(`以下のリンクからダウンロードまたはアクセスしてください。\n\n**🔗 リンク:** [こちらをクリック](${selectedItem.url})\n\n※リンク切れの場合は管理者へご連絡ください。`)
                    .setTimestamp();
                
                await user.send({ embeds: [dmEmbed] });

                // --- ログ処理 (非同期で実行し、ユーザーへのレスポンスを待たせない) ---
                updateCounterAndLog(client, user, selectedItem.name);
                
                // --- 完了メッセージ ---
                // updateしたメッセージをさらに編集して完了を通知
                await interaction.editReply({
                    content: `✅ **${selectedItem.name}** をDMに送信しました！\n(DMが届かない場合は、プライバシー設定で「サーバーメンバーからのDMを許可」にしてください)`,
                    components: []
                });

            } catch (error) {
                console.error(`[FreeGift] エラー: ${error.message}`);
                
                // DMが送れなかった場合などのエラーハンドリング
                // すでに update/defer しているかどうかで対応を変える
                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply({ 
                        content: '❌ DMの送信に失敗しました。\nDM設定が「許可」になっているか確認してください。',
                        components: []
                    }).catch(() => {});
                } else {
                    await interaction.reply({ 
                        content: '❌ エラーが発生しました。', 
                        ephemeral: true 
                    }).catch(() => {});
                }
            }
        }
    }
};
