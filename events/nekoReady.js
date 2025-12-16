// 必要なクラスをインポート
const { Events, EmbedBuilder } = require('discord.js');

// --- 定数設定 (neko.jsと同期) ---
// BotがターゲットとするNSFWチャンネルID
const TARGET_CHANNEL_ID = '1449373757352181821';
// コマンドのプレフィックス
const COMMAND_PREFIX = 'm!r';
// NSFW画像タイプ
const NSFW_TYPES = ['hentai', 'anal', '4k', 'ass', 'lewd', 'pgif']; 
// SFW画像タイプ
const SFW_TYPES = ['neko', 'waifu', 'kitsune', 'thigh'];
// ----------------

// Botが以前送信したヘルプメッセージを識別するためのフッターテキストの一部
const HELP_FOOTER_TEXT_IDENTIFIER = 'このメッセージはコマンド実行時に再送信されます。';

/**
 * 過去にBotが送信したヘルプメッセージを検索し、削除します。
 * @param {import('discord.js').TextChannel} channel - 処理対象のチャンネル
 * @param {string} botId - BotのユーザーID
 */
async function deleteOldHelpMessage(channel, botId) {
    try {
        // チャンネル履歴から直近50件のメッセージを取得
        const messages = await channel.messages.fetch({ limit: 50 });
        
        // Botが送信し、かつヘルプメッセージとして識別できるメッセージを検索
        const oldHelpMessage = messages.find(msg => 
            msg.author.id === botId && 
            msg.embeds.length > 0 &&
            msg.embeds[0].footer?.text.includes(HELP_FOOTER_TEXT_IDENTIFIER)
        );

        if (oldHelpMessage) {
            await oldHelpMessage.delete();
            console.log(`[Nekobot Help] 🧹 古いヘルプメッセージ (ID: ${oldHelpMessage.id}) を削除しました。`);
        }
    } catch (error) {
        // 権限不足などでメッセージの削除に失敗した場合
        console.error('[Nekobot Help] ⚠️ 古いヘルプメッセージの削除に失敗しました:', error.message);
    }
}


// --- ヘルプメッセージ送信関数（コマンドトリガーに変更） ---
/**
 * コマンドが使用された直後にヘルプメッセージをチャンネルに送信します。
 * @param {import('discord.js').Message} message - 受信したメッセージオブジェクト
 */
async function sendHelpMessage(message) {
    const { client, channel, author } = message;

    // Discordのルールに従い、NSFWチャンネルでのみ実行を許可
    if (!channel.nsfw) {
        console.log(`[Nekobot Help] ⚠️ チャンネル ${channel.name} はNSFWではないため、ヘルプメッセージの送信をスキップしました。`);
        return; 
    }

    // 1. 以前のヘルプメッセージを削除
    await deleteOldHelpMessage(channel, client.user.id);

    // 2. 新しいヘルプメッセージを作成
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
        // 識別子を含んだフッター
        .setFooter({ text: HELP_FOOTER_TEXT_IDENTIFIER })
        .setTimestamp();

    // 3. チャンネルに埋め込みメッセージを送信
    await channel.send({ embeds: [helpEmbed] }).catch(err => {
        console.error('[Nekobot Help] ヘルプメッセージの送信に失敗しました:', err);
    });

    console.log(`[Nekobot Help] ヘルプメッセージを送信しました。トリガーユーザー: ${author.tag}`);
}

module.exports = {
    // ユーザーからのメッセージ受信時に実行
    name: Events.MessageCreate,
    once: false,
    
    /**
     * @param {import('discord.js').Message} message - 受信したメッセージオブジェクト
     */
    async execute(message) {
        // Bot自身のメッセージやDMは無視
        if (message.author.bot || !message.inGuild()) return;

        const content = message.content.trim();

        // ターゲットチャンネルでのみ処理を実行
        if (message.channelId !== TARGET_CHANNEL_ID) return;

        // コマンドプレフィックスで始まっているかチェック
        if (content.startsWith(COMMAND_PREFIX)) {
            // コマンドが使用された場合にヘルプメッセージを送信
            await sendHelpMessage(message);
        }
    }
};
