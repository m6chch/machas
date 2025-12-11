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

        // 過去のメッセージからBot自身のカウンタメッセージを探す
        const messages = await logChannel.messages.fetch({ limit: 10 });
        const counterMessage = messages.find(m => m.author.id === client.user.id && m.content.includes('無料配布実績カウンター'));

        let newCount = 1;

        if (counterMessage) {
            const match = counterMessage.content.match(/(\d+)/);
            let currentCount = match ? parseInt(match[1], 10) : 0;
            newCount = currentCount + 1;
            
            await counterMessage.edit(`**無料配布実績カウンター:** ${newCount}`).catch(e => console.error("カウンタ更新失敗:", e));
        } else {
            await logChannel.send(`**無料配布実績カウンター:** ${newCount}`).catch(e => console.error("カウンタ作成失敗:", e));
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

        await logChannel.send({ embeds: [logEmbed] }).catch(e => console.error("ログ送信失敗:", e));

    } catch (error) {
        console.error('[FreeGift] ログ処理エラー:', error);
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

            // 自分にしか見えないメニューを表示
            await interaction.reply({
                content: '⬇️ アイテムを選択してください。',
                components: [row],
                ephemeral: true
            });
            
            return true; // 処理したので true を返す

        } catch (error) {
            console.error('[FreeGift] ボタン処理エラー:', error);
            // エラー時も「処理しようとした」のでtrueを返して親側の重複実行を防ぐ
            return true;
        }
    }

    // =================================================
    // 2. メニューでアイテムが選択された時の処理
    // =================================================
    if (interaction.isStringSelectMenu() && interaction.customId === 'free_gift_select') {
        
        const selectedValue = interaction.values[0];
        const selectedItem = items.find(item => item.value === selectedValue);

        // 万が一アイテムが見つからない場合
        if (!selectedItem) {
            await interaction.reply({ content: '❌ 無効なアイテムです。', ephemeral: true });
            return true;
        }

        try {
            // 🔄 interaction.update を使用してローディング状態にする
            // これにより「インタラクションに失敗しました」を防ぐ
            await interaction.update({
                content: `🔄 **${selectedItem.name}** をDMに送信中...`,
                components: [] // メニューを消してスッキリさせる
            });

            const user = interaction.user;

            // --- DM送信処理 ---
            const dmEmbed = new EmbedBuilder()
                .setColor('#f1c40f')
                .setTitle(`🎁 ${selectedItem.name} を受け取りました！`)
                .setDescription(`以下のリンクからダウンロードまたはアクセスしてください。\n\n**🔗 リンク:** [こちらをクリック](${selectedItem.url})\n\n※リンク切れの場合は管理者へご連絡ください。`)
                .setTimestamp();
            
            await user.send({ embeds: [dmEmbed] });

            // --- ログ処理 (非同期で実行) ---
            // ユーザーを待たせないよう、awaitなしで裏で走らせる手もありますが、エラー検知のためawaitしておきます
            await updateCounterAndLog(client, user, selectedItem.name);
            
            // --- 完了メッセージ ---
            // updateしたメッセージをさらに編集して完了通知
            await interaction.editReply({
                content: `✅ **${selectedItem.name}** をDMに送信しました！\n(DMが届かない場合は、DM設定を許可にしてください)`,
                components: []
            });

        } catch (error) {
            console.error(`[FreeGift] 送信エラー: ${error.message}`);
            
            // ユーザーにエラーを通知
            // update/defer済みかどうかで分岐
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ 
                    content: '❌ DMの送信に失敗しました。\n・DMが閉じられていませんか？\n・サーバー設定で「メンバーからのDMを許可」にしてください。',
                    components: []
                }).catch(() => {});
            } else {
                await interaction.reply({ 
                    content: '❌ エラーが発生しました。', 
                    ephemeral: true 
                }).catch(() => {});
            }
        }
        
        return true; // 処理したので true を返す
    }

    // 関係ないインタラクションの場合は false を返す
    return false;
}
