import { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    PermissionFlagsBits 
} from 'discord.js';

// ----------------------------------------------------
// 💡 配布アイテムのデータ定義 (URLはここに定義されています)
// ----------------------------------------------------
const items = [
    { name: '１. 業者パック１', value: 'pack1', url: 'https://www.mediafire.com/file/dvt9wkt5iw60asg/coc.txt/file' },
    { name: '２. 業者パック２', value: 'pack2', url: 'https://www.mediafire.com/file/dvt9wkt5iw60asg/coc.txt/file' },
    { name: '３. スクリプトテンプレ', value: 'script_template', url: 'https://www.mediafire.com/file/x1vb011nuuz5z2k/%25E3%2583%2586%25E3%2583%B3%E3%2583%97%E3%83%AC.lua/file' },
    { name: '４. アニメ,映画見放題サイト', value: 'anime_site', url: 'https://9animetv.to/' },
    { name: '５. 漫画サイト（広告なし）', value: 'manga_site', url: 'https://mangarawplus.cv' }
];

export default {
    data: new SlashCommandBuilder()
        .setName('free-gift')
        .setDescription('無料配布パネル（自販機）をチャンネルに設置します。')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        // コマンド実行中は即座に応答（Ephemeralではない）
        await interaction.deferReply({ ephemeral: false });

        // ------------------
        // Embedの作成 (自販機パネル)
        // ------------------
        const embed = new EmbedBuilder()
            .setColor('#2ecc71') // 緑
            .setTitle('🛒 無料配布自販機パネル 🎁')
            .setDescription('下の「購入」ボタンを押して、無料配布アイテムをDMで受け取ってください。')
            .setTimestamp()
            .setFooter({ text: 'アイテムはDMでお届けします' });

        // アイテムリストをEmbedのフィールドに追加
        const itemDescriptions = items.map(item => `**${item.name}**`).join('\n');
        embed.addFields({ name: '✨ 配布中アイテムリスト ✨', value: itemDescriptions, inline: false });

        // ------------------
        // ボタンの作成
        // ------------------
        const purchaseButton = new ButtonBuilder()
            .setCustomId('free_gift_purchase') // カスタムIDを定義
            .setLabel('購入 (無料)')
            .setStyle(ButtonStyle.Success)
            .setEmoji('🛒');

        // アクション行に追加
        const actionRow = new ActionRowBuilder()
            .addComponents(purchaseButton);

        // チャンネルにEmbedとボタンを送信
        await interaction.channel.send({
            embeds: [embed],
            components: [actionRow]
        });

        // コマンドの応答を編集（実行者への通知）
        await interaction.editReply({
            content: '✅ 無料配布パネルの設置が完了しました。',
            ephemeral: true
        });
    },
};
