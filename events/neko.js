import { Events, EmbedBuilder } from 'discord.js';

// --- 定数設定 ---
// 画像リクエストを受け付けるチャンネルID
const TARGET_CHANNEL_ID = '1449373757352181821';
// コマンドのプレフィックス
const COMMAND_PREFIX = 'm!r';

// NekoBot APIで利用可能なNSFW/SFWタイプ
// ユーザーのリクエスト（hentai, anal, 4k）に基づき、人気なものを追加
const NSFW_TYPES = ['hentai', 'anal', '4k', 'ass', 'lewd', 'pgif']; 
const SFW_TYPES = ['neko', 'waifu', 'kitsune', 'thigh'];
const ALL_TYPES = [...NSFW_TYPES, ...SFW_TYPES];
// ----------------

// --- API呼び出し関数 ---
/**
 * Nekobot APIから画像URLを取得します。
 * @param {string} type - 画像のタイプ
 * @returns {Promise<string|null>} 画像URL、または失敗した場合はnull
 */
async function fetchNekobotImage(type) {
    const url = `https://nekobot.xyz/api/image?type=${type}`;
    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.error(`[Nekobot API] HTTPエラー: ${response.status} (${url})`);
            return null;
        }
        const data = await response.json();
        
        if (data.success && data.message) {
            return data.message; // 画像URL
        }
        return null;

    } catch (error) {
        console.error(`[Nekobot API Error] Type: ${type}`, error);
        return null;
    }
}
// ----------------

export default {
    name: Events.MessageCreate,
    once: false,
    
    /**
     * @param {import('discord.js').Message} message
     * @param {import('discord.js').Client} client
     */
    async execute(message, client) {
        
        // 1. Botのメッセージ、または対象チャンネル以外からのメッセージは無視
        if (message.author.bot || message.channel.id !== TARGET_CHANNEL_ID) return;
        
        const content = message.content.trim().toLowerCase();
        
        // 2. コマンド形式チェック
        if (!content.startsWith(`${COMMAND_PREFIX} `)) return;

        const args = content.split(' ');
        const type = args[1]; // 例: 'hentai'

        // 3. 有効なタイプかチェック
        if (!type || !ALL_TYPES.includes(type)) {
            const invalidEmbed = new EmbedBuilder()
                .setColor('#f1c40f')
                .setDescription(`⚠️ 不正な画像タイプです。\n利用可能なタイプ: \`${ALL_TYPES.join('`, `')}\`\n例: \`${COMMAND_PREFIX} hentai\``);
            
            await message.reply({ embeds: [invalidEmbed] }).catch(() => {});
            return;
        }

        // 4. NSFWチャンネルでのみNSFWコンテンツを許可
        const isNSFW = NSFW_TYPES.includes(type);
        if (isNSFW && !message.channel.nsfw) {
            const nsfwEmbed = new EmbedBuilder()
                .setColor('#e74c3c')
                .setDescription('❌ **このチャンネルはNSFWに設定されていません。** NSFWコンテンツは送信できません。');
            
            await message.reply({ embeds: [nsfwEmbed] }).catch(() => {});
            return;
        }

        // 5. APIから画像を取得
        const imageUrl = await fetchNekobotImage(type);

        if (imageUrl) {
            // 6. Embedを作成し送信
            const imageEmbed = new EmbedBuilder()
                .setColor('#3498db')
                .setTitle(`🖼️ ${type.toUpperCase()} 画像リクエスト`)
                .setDescription(`リクエスト者: <@${message.author.id}>`)
                .setImage(imageUrl)
                .setFooter({ text: 'Provided by Nekobot API' })
                .setTimestamp();

            await message.channel.send({ embeds: [imageEmbed] }).catch(err => {
                 console.error('[Nekobot Command] 画像Embedの送信に失敗しました:', err);
            });
            
            // 7. コマンドメッセージを**削除しない**ように、処理を削除しました。
            // 以前のコード: await message.delete().catch(() => console.log('コマンドメッセージの削除に失敗しました。'));

        } else {
            // 画像取得失敗
            await message.reply({ content: '🚨 画像の取得に失敗しました。APIを確認してください。', ephemeral: true }).catch(() => {});
        }
    }
};
