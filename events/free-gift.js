import { 
    ActionRowBuilder, 
    EmbedBuilder, 
    StringSelectMenuBuilder
} from 'discord.js';

// ----------------------------------------------------
// ⚠️ 設定: ログとカウンタのチャンネルID (必要に応じて変更してください)
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
        if (!logChannel || logChannel.type !== 0) {
            console.error(`[FreeGift] ログチャンネルID ${LOG_CHANNEL_ID} が無効です。`);
            return;
        }

        const messages = await logChannel.messages.fetch({ limit: 10, after: '0' });
        const firstMessage = messages.last();

        let newCount = 1;

        if (firstMessage) {
            const match = firstMessage.content.match(/(\d+)/);
            let currentCount = match ? parseInt(match[1], 10) : 0;
            newCount = currentCount + 1;
            
            const updatedContent = firstMessage.content.replace(/(\d+)/, newCount.toString());
            await firstMessage.edit(updatedContent).catch(e => {
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


/**
 * free-gift関連のボタンやセレクトメニューのインタラクションを処理します。
 * @param {import('discord.js').Interaction} interaction - Discordのインタラクションオブジェクト
 * @param {import('discord.js').Client} client - Discordクライアントオブジェクト
 * @returns {boolean} - free-giftインタラクションが処理された場合は true、そうでなければ false
 */
export async function handleFreeGiftInteraction(interaction, client) {
    
    // -------------------------------------------------
    // free_gift_purchase ボタン処理 (セレクトメニュー表示)
    // -------------------------------------------------
    if (interaction.isButton() && interaction.customId === 'free_gift_purchase') {
        
        await interaction.deferReply({ ephemeral: true });

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

        await interaction.editReply({
            content: '⬇️ アイテムを選択してください。',
            components: [row],
            ephemeral: true
        });
        return true; // 処理完了
    } 
    
    // -------------------------------------------------
    // free_gift_select セレクトメニュー処理 (DM送信とログ)
    // -------------------------------------------------
    if (interaction.isStringSelectMenu() && interaction.customId === 'free_gift_select') {
        
        await interaction.deferReply({ ephemeral: true });

        const selectedValue = interaction.values[0];
        const selectedItem = items.find(item => item.value === selectedValue);

        if (!selectedItem) {
            await interaction.editReply('❌ 無効なアイテムが選択されました。');
            return true;
        }

        const user = interaction.user;

        try {
            // 1. ユーザーのDMにアイテムを送信
            const dmEmbed = new EmbedBuilder()
                .setColor('#f1c40f')
                .setTitle(`🎁 ${selectedItem.name} を受け取りました！`)
                .setDescription(`**${selectedItem.name}** のリンクは以下の通りです。リンク切れの場合は管理者に連絡してください。\n\n**ダウンロードリンク:** [${selectedItem.name}へのリンク](${selectedItem.url})`)
                .setTimestamp();
            
            await user.send({ embeds: [dmEmbed] });

            // 2. ログチャンネルのカウンタを更新し、詳細ログを送信
            await updateCounterAndLog(client, user, selectedItem.name);
            
            // 3. ユーザーに完了メッセージを送信
            await interaction.editReply({
                content: `✅ **${selectedItem.name}** をあなたのDMに送信しました。DMを確認してください。`,
                components: []
            });

        } catch (error) {
            console.error(`[FreeGift] DM送信またはログ記録エラー: ${error.message}`);
            await interaction.editReply('❌ DMの送信に失敗しました。（DMが閉じられている可能性があります。DM設定を確認してください。）');
        }
        return true; // 処理完了
    }
    
    // free-giftに関連しないインタラクションの場合は false を返す
    return false;
}
