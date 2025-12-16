import { Events, EmbedBuilder } from 'discord.js';

// --- 定数設定 (neko.jsと同期) ---
const TARGET_CHANNEL_ID = '1449373757352181821';
const COMMAND_PREFIX = 'm!r';
const NSFW_TYPES = ['hentai', 'anal', '4k', 'ass', 'lewd', 'pgif']; 
const SFW_TYPES = ['neko', 'waifu', 'kitsune', 'thigh'];
// ----------------

// スケジューラーのタイマーIDを保持
let helpTimer = null;

/**
 * 次にメッセージを送信すべき時刻（00:00 または 12:00）を計算し、
 * 現在時刻からの遅延時間（ミリ秒）を返します。
 * @returns {{nextSendTime: Date, delay: number}}
 */
function getNextSendTimeAndDelay() {
    const now = new Date();
    let nextSendTime = new Date(now);

    // ターゲット時刻: 00:00 (深夜) と 12:00 (正午)
    const targetHours = [0, 12];
    let nextTargetHour = -1;

    // 現在時刻が12:00未満の場合、次のターゲットは12:00
    if (now.getHours() < 12) {
        nextTargetHour = 12;
    } else {
        // 現在時刻が12:00以降の場合、次のターゲットは翌日の00:00
        nextTargetHour = 0;
        nextSendTime.setDate(now.getDate() + 1); // 日付を翌日に設定
    }

    nextSendTime.setHours(nextTargetHour, 0, 0, 0); // 時刻を0分0秒0ミリ秒に設定

    // ただし、Botが起動した瞬間に既にターゲット時刻をわずかに過ぎていた場合
    // (例: 12:00:01に起動) は、次のターゲット（翌日の00:00）を設定し直す
    if (nextSendTime.getTime() <= now.getTime()) {
         // 日付をさらに翌日にするか、時間を12時間進める
         if (nextTargetHour === 12) {
             nextSendTime.setDate(now.getDate() + 1);
             nextSendTime.setHours(0, 0, 0, 0); // 翌日00:00
         } else { // nextTargetHour === 0 の場合
             nextSendTime.setDate(now.getDate());
             nextSendTime.setHours(12, 0, 0, 0); // 12:00 今日
         }
         // 上のロジックがgetNextSendTimeを常に未来に設定するため、この再計算は保険
         const delay = nextSendTime.getTime() - now.getTime();
         console.warn(`[Nekobot Help] ⚠️ スケジュールが過去であったため、次の送信時刻を調整しました。遅延: ${delay}ms`);
         return { nextSendTime, delay };
    }

    const delay = nextSendTime.getTime() - now.getTime();

    return { nextSendTime, delay };
}

// --- 時刻指定ヘルプメッセージ送信関数 ---
/**
 * ヘルプメッセージをチャンネルに送信します。
 * @param {import('discord.js').Client} client
 */
async function sendTimedHelp(client) {
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
        .setFooter({ text: 'このメッセージは毎日00:00と12:00に自動送信されます。' })
        .setTimestamp();

    await channel.send({ embeds: [helpEmbed] }).catch(err => {
        console.error('[Nekobot Help] ヘルプメッセージの送信に失敗しました:', err);
    });

    console.log(`[Nekobot Help] ヘルプメッセージを送信しました。次回の送信をスケジュールします。`);

    // メッセージ送信後、次回の送信を再スケジュール
    scheduleNextHelp(client);
}

/**
 * 次回のヘルプメッセージ送信をスケジュールします。
 * @param {import('discord.js').Client} client
 */
function scheduleNextHelp(client) {
    // 既存のタイマーがあればクリア
    if (helpTimer) {
        clearTimeout(helpTimer);
    }
    
    const { nextSendTime, delay } = getNextSendTimeAndDelay();

    // 次回送信までの遅延時間が長すぎる、または短すぎる場合のチェック（保険）
    if (delay <= 0) {
        console.error('[Nekobot Help] 🚨 遅延時間が無効です。スケジューリングを中止します。');
        return;
    }

    // 次回送信をスケジュール
    helpTimer = setTimeout(() => {
        sendTimedHelp(client);
    }, delay);

    console.log(`[Nekobot Help] 次回ヘルプメッセージの送信は ${nextSendTime.toLocaleString()} (ローカルタイムゾーン) にスケジュールされました。`);
}


export default {
    // Botの起動準備が完了したときに実行
    name: Events.ClientReady,
    once: true,
    
    /**
     * @param {import('discord.js').Client} client
     */
    async execute(client) {
        console.log('[Nekobot Help] 00:00と12:00に自動送信するタイマーを開始します。');
        
        // 最初のスケジュールを開始
        scheduleNextHelp(client);
    }
};
