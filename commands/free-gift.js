import { SlashCommandBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, EmbedBuilder } from 'discord.js';

// free-giftロジックと同じアイテム定義を使用
const items = [
    { name: '１. 業者パック１', value: 'pack1', url: 'https://www.mediafire.com/file/dvt9wkt5iw60asg/coc.txt/file' },
    { name: '２. 業者パック２', value: 'pack2', url: 'https://www.mediafire.com/file/dvt9wkt5iw60asg/coc.txt/file' },
    { name: '３. スクリプトテンプレ', value: 'script_template', url: 'https://www.mediafire.com/file/x1vb011nuuz5z2k/%25E3%2583%86%25E3%2583%B3%E3%2583%97%E3%2583%AC.lua/file' },
    { name: '４. アニメ,映画見放題サイト', value: 'anime_site', url: 'https://9animetv.to/' },
    { name: '５. 漫画サイト（広告なし）', value: 'manga_site', url: 'https://mangarawplus.cv' }
];


export default {
    data: new SlashCommandBuilder()
        .setName('free-gift')
        .setDescription('無料配布アイテムの告知メッセージを投稿します。'),
        
    async execute(interaction, client) { 
        
        // 🚨 コマンド実行時のタイムアウト (Unknown interaction) を避けるため、
        // deferReply() を使わず、interaction.reply() で即座にメッセージを送信する
        
        const giftEmbed = new EmbedBuilder()
            .setColor('#2ecc71') // 緑色
            .setTitle('🎁 無料配布アイテムのご案内')
            .setDescription('以下のボタンからアイテムを受け取ることができます。\n\n**【配布アイテム一覧】**\n' + 
                            items.map(item => `**${item.name}**`).join('\n'))
            .addFields(
                { name: '受け取り方法', value: '下の「無料ギフト購入」ボタンを押して、表示されたメニューから選択してください。', inline: false }
            )
            .setTimestamp();
            
        const purchaseButton = new ButtonBuilder()
            .setCustomId('free_gift_purchase') // events/interactionCreate.jsで処理されるID
            .setLabel('無料ギフト購入')
            .setStyle(ButtonStyle.Success) // 緑色ボタン
            .setEmoji('🛒'); 

        const row = new ActionRowBuilder()
            .addComponents(purchaseButton);

        try {
            // interaction.reply()で即座に応答を返す
            await interaction.reply({
                embeds: [giftEmbed],
                components: [row],
            });
        } catch (error) {
            console.error('[FreeGiftCommand] コマンド実行中にエラーが発生しました:', error);
            // エラー処理は interactionCreate.js に任せる
        }
    }
};
