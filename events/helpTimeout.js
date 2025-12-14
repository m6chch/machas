import { Events, EmbedBuilder, time } from 'discord.js';

// --- 定数設定 ---
const TARGET_COMMAND = '!help';
const TIMEOUT_DURATION_MS = 60 * 60 * 1000; // 1時間 = 60分 * 60秒 * 1000ミリ秒
const ADMIN_USER_ID = '460871806757240842'; // 連絡先の管理者ID
const REASON = '禁止されているコマンドを使用しました。';
// ----------------

export default {
    name: Events.MessageCreate,
    once: false,

    /**
     * @param {import('discord.js').Message} message
     * @param {import('discord.js').Client} client
     */
    async execute(message, client) {

        // 1. Bot自身のメッセージは無視
        if (message.author.bot) return;

        // 2. コマンドチェック
        // 大文字・小文字を区別せず、メッセージ全体がターゲットコマンドと一致するかチェック
        if (message.content.trim().toLowerCase() !== TARGET_COMMAND) return;

        // 3. タイムアウト処理（ユーザーがサーバーメンバーであるか確認）
        const member = message.member;

        if (!member) {
            // DMやキャッシュ外のメッセージの場合、処理をスキップ
            return;
        }

        // Botにタイムアウトを実行する権限があるかチェック
        if (!member.manageable) {
            console.warn(`[Timeout] ⚠️ Botには ${member.user.tag} をタイムアウトする権限がありません。`);
            return;
        }

        try {
            // タイムアウト期限 (UNIXタイムスタンプ形式)
            const timeoutUntil = new Date(Date.now() + TIMEOUT_DURATION_MS);
            
            // ユーザーをタイムアウト
            await member.timeout(TIMEOUT_DURATION_MS, REASON);
            
            // タイムアウト完了通知メッセージ
            const responseEmbed = new EmbedBuilder()
                .setColor('#e74c3c')
                .setDescription(`🚫 **\`${TARGET_COMMAND}\` は使用禁止コマンドです。**\nあなたは1時間タイムアウトされました。`)
                .setFooter({ text: `解除予定: ${timeoutUntil.toLocaleTimeString()} (ローカル時刻)` });
            
            // ユーザーにチャンネルで通知
            await message.reply({ embeds: [responseEmbed] });

            // 4. 管理者へのDM通知
            await sendAdminNotification(client, member, timeoutUntil, message.channel, message.content);

        } catch (error) {
            console.error(`[Timeout Error] ${member.user.tag} のタイムアウト中にエラーが発生しました:`, error);
            
            // ユーザーに失敗を通知（一時的なメッセージ）
            message.channel.send({
                content: `🚨 ${member.user.tag} のタイムアウトに失敗しました。Botの権限を確認してください。`,
                ephemeral: true
            }).catch(() => {});
        }
    }
};

/**
 * 管理者ユーザーにDMで通知を送信する関数
 * @param {import('discord.js').Client} client
 * @param {import('discord.js').GuildMember} member - タイムアウトされたメンバー
 * @param {Date} timeoutUntil - タイムアウト解除日時
 * @param {import('discord.js').TextChannel} channel - コマンドが使用されたチャンネル
 * @param {string} commandUsed - 使用されたコマンド内容
 */
async function sendAdminNotification(client, member, timeoutUntil, channel, commandUsed) {
    try {
        const adminUser = await client.users.fetch(ADMIN_USER_ID);
        
        const notificationEmbed = new EmbedBuilder()
            .setColor('#f1c40f')
            .setTitle('⚠️ 禁止コマンド使用アラート')
            .addFields(
                { name: '👤 タイムアウトされたユーザー', value: `${member.user.tag} (${member.id})`, inline: false },
                { name: '📅 タイムアウト解除日時', value: time(timeoutUntil, 'F'), inline: false }, // Discord形式の時刻表示
                { name: '💬 使用されたチャンネル', value: `${channel.name} (${channel.id})`, inline: false },
                { name: '🚫 使用されたコマンド', value: `\`${commandUsed}\``, inline: false },
            )
            .setTimestamp();
            
        await adminUser.send({ embeds: [notificationEmbed] });
        
        console.log(`[Timeout] 管理者 ${adminUser.tag} にDMで通知しました。`);

    } catch (error) {
        console.error('[Timeout] 管理者へのDM通知中にエラーが発生しました:', error);
    }
}
