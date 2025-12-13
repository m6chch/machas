import { Events, EmbedBuilder } from 'discord.js';

// --- 定数設定 (neko.jsと同期) ---
const TARGET_CHANNEL_ID = '1449373757352181821';
const COMMAND_PREFIX = 'm!r';
const NSFW_TYPES = ['hentai', 'anal', '4k', 'ass', 'lewd', 'pgif']; 
const SFW_TYPES = ['neko', 'waifu', 'kitsune', 'thigh'];
// ----------------

// 日次ヘルプメッセージの管理用変数
// Botが再起動するとリセットされます
let lastHelpSentDay = null;

// --- 日次ヘルプメッセージ送信関数 ---
/**
 * 毎日一度、コマンドの使い方をチャンネルに送信します。
 * @param {import('discord.js').Client} client
 */
async function sendDailyHelp(client) {
    const now = new Date();
    // 実行環境のローカルタイムゾーンで日付を判定
    const today = now.toDateString(); 

    // 既に今日送信済みかチェック
    if (lastHelpSentDay === today) {
        return;
    }
    
    const channel = await client.channels.fetch(TARGET_CHANNEL_ID).catch(() => null);
    
    if (!channel) {
        console.error(`[Nekobot Help] ⚠️ ターゲットチャンネルID ${TARGET_CHANNEL_ID} が見つかりません。`);
        return;
    }

    // Discordのルールに従い、NSFWチャンネルでのみ実行を許可
    if (!channel.nsfw) {
        console.log(`[Nekobot Help] ⚠️ チャンネル ${channel.name} はNSFWではないため、ヘルプメッセージの送信をスキップしました。`);
        return; 
    }

    const helpEmbed = new EmbedBuilder()
        .setColor('#e74c3c') 
        .setTitle('🔞 NekoBot 画像コマンドの使い方')
        .setDescription(`**このチャンネルはNSFWに設定されているため、以下の画像コマンドが利用可能です。**\n\n画像を要求するには、以下のフォーマットでメッセージを送信してください。\n\`${COMMAND_PREFIX} [タイプ]\``)
        .addFields(
            { 
                name: '利用可能なNSFWタイプ', 
                value: `\`${NSFW_TYPES.join('`, `')}\``, 
                inline: false 
            },
            { 
                name: '利用可能なSFWタイプ (通常画像)', 
                value: `\`${SFW_TYPES.join('`, `')}\``, 
                inline: false 
            }
        )
        .setFooter({ text: 'このメッセージは24時間に一度自動送信されます。' })
        .setTimestamp();

    await channel.send({ embeds: [helpEmbed] }).catch(err => {
        console.error('[Nekobot Help] ヘルプメッセージの送信に失敗しました:', err);
    });

    lastHelpSentDay = today;
    console.log(`[Nekobot Help] ヘルプメッセージを送信しました。次回の送信は明日です。`);
}

export default {
    // Botの起動準備が完了したときに実行
    name: Events.ClientReady,
    once: true,
    
    /**
     * @param {import('discord.js').Client} client
     */
    async execute(client) {
        console.log('[Nekobot Help] 日次ヘルプメッセージのタイマーを開始します。');
        
        // 1. Bot起動時に一度実行
        await sendDailyHelp(client);

        // 2. その後、1時間ごと(3600000ms)に日付が変わったかチェック
        setInterval(() => {
            sendDailyHelp(client);
        }, 60 * 60 * 1000); // 1時間ごとにチェック
    }
};
