import { Events, EmbedBuilder, time } from 'discord.js';

// --- 定数設定 ---
const TARGET_COMMAND = '!help';
const TIMEOUT_DURATION_MS = 60 * 60 * 1000; // 1時間 = 60分 * 60秒 * 1000ミリ秒
const ADMIN_USER_ID = '460871806757240842'; // 連絡先の管理者ID
const TARGET_BOT_ID = '1307858589246951504'; // 削除対象のBotのID
const REASON = '禁止されているコマンドを使用しました。';
// ----------------

// 応答Botのメッセージを監視・削除するユーティリティ関数
function monitorAndDeleteBotReply(channel, authorMessageId, client) {
    // 1秒待機してからBotの応答メッセージを検索・削除する
    setTimeout(async () => {
        try {
            // チャンネルの直近100件のメッセージを取得
            const messages = await channel.messages.fetch({ limit: 100 });
            
            // ターゲットBotからの応答メッセージを検索
            const botReply = messages.find(m => 
                m.author.id === TARGET_BOT_ID && 
                m.reference?.messageId === authorMessageId // 参照元がユーザーのメッセージであることを確認 (確実にBot応答を狙う)
            );

            if (botReply) {
                await botReply.delete();
                console.log(`[Message Delete] ターゲットBot (${TARGET_BOT_ID}) の応答メッセージを削除しました。`);
            }
        } catch (error) {
            console.error('[Message Delete Error] ターゲットBotの応答メッセージの削除に失敗しました:', error);
        }
    }, 1000); // 1000ミリ秒 (1秒) 遅延
}

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
            // ただし、メッセージの削除は行います（下記参照）。
        }
        
        // 4. Bot応答メッセージの削除監視を開始（Bot応答が確定してから）
        // ターゲットBotが応答する可能性を考慮し、まず監視を開始します。
        monitorAndDeleteBotReply(message.channel, message.id, client);

        // 5. ユーザーコマンドメッセージを削除
        try {
            await message.delete();
            console.log(`[Message Delete] コマンドメッセージ (${TARGET_COMMAND}) を削除しました。`);
        } catch (error) {
            console.error('[Message Delete Error] コマンドメッセージの削除に失敗しました。', error);
        }

        // メンバー情報が取得できない（DMなど）場合は、タイムアウト処理はスキップ
        if (!member) return;
        
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
            
            // タイムアウト完了通知メッセージ (Ephemeralはメッセージを削除したため使えない)
            const responseEmbed = new EmbedBuilder()
                .setColor('#e74c3c')
                .setDescription(`🚫 **\`${TARGET_COMMAND}\` は使用禁止コマンドです。**\nあなたは1時間タイムアウトされました。`)
                .setFooter({ text: `解除予定: ${timeoutUntil.toLocaleTimeString()} (ローカル時刻)` });
            
            // ユーザーにチャンネルで通知
            // ユーザーが送信したコマンドを削除したため、新しいメッセージとして送信
            await message.channel.send({ content: `<@${member.id}>`, embeds: [responseEmbed] });

            // 6. 管理者へのDM通知
            await sendAdminNotification(client, member, timeoutUntil, message.channel, message.content);

        } catch (error) {
            console.error(`[Timeout Error] ${member.user.tag} のタイムアウト中にエラーが発生しました:`, error);
            
            // タイムアウト失敗を管理者に通知（DM通知関数内で処理）
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
    // タイムアウト処理が成功したかどうかにかかわらず、管理者に通知
    const isTimeoutSuccessful = member.communicationDisabledUntilTimestamp > Date.now();
    
    try {
        const adminUser = await client.users.fetch(ADMIN_USER_ID);
        
        const notificationEmbed = new EmbedBuilder()
            .setColor(isTimeoutSuccessful ? '#f1c40f' : '#e74c3c')
            .setTitle(isTimeoutSuccessful ? '⚠️ 禁止コマンド使用アラート' : '🚨 タイムアウト処理失敗アラート')
            .addFields(
                { name: '👤 ユーザー', value: `${member.user.tag} (${member.id})`, inline: false },
                { name: '💬 使用されたチャンネル', value: `${channel.name} (${channel.id})`, inline: false },
                { name: '🚫 使用されたコマンド', value: `\`${commandUsed}\``, inline: false },
            );
        
        if (isTimeoutSuccessful) {
            notificationEmbed.addFields({ name: '📅 タイムアウト解除日時', value: time(timeoutUntil, 'F'), inline: false });
        } else {
             notificationEmbed.addFields({ name: '❌ 処理状況', value: `**タイムアウトに失敗しました。Botの権限を確認してください。**`, inline: false });
        }

        notificationEmbed.setTimestamp();
            
        await adminUser.send({ embeds: [notificationEmbed] });
        
        console.log(`[Timeout] 管理者 ${adminUser.tag} にDMで通知しました。`);

    } catch (error) {
        console.error('[Timeout] 管理者へのDM通知中にエラーが発生しました:', error);
    }
}
