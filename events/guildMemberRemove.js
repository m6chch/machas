// 必要なクラスをインポート (require -> import)
import { Events, EmbedBuilder } from 'discord.js';

// ターゲットサーバーIDとチャンネルID
// NOTE: 実際のサーバーID/チャンネルIDを安全に管理するために環境変数を使用することを推奨します。
const TARGET_GUILD_ID = '1448245012239356027'; // 対象サーバーID
const TARGET_CHANNEL_ID = '1448255290985414656'; // 送信先チャンネルID (参加時と同じチャンネルを想定)

// module.exports -> export default
export default {
    // イベント名を設定
    name: Events.GuildMemberRemove,
    // 一度だけ実行するかどうか
    once: false,
    /**
     * メンバーがサーバーを退出したときに実行されます。
     * @param {import('discord.js').GuildMember} member - 退出したメンバーオブジェクト
     */
    async execute(member) {
        // 対象外のサーバーIDの場合は処理を終了
        if (member.guild.id !== TARGET_GUILD_ID) {
            return;
        }

        // ギルド内のメンバー数を取得（ボットを含む）
        // NOTE: 退出処理が行われた直後のため、この時点での memberCount は退出後の人数です。
        const memberCount = member.guild.memberCount;

        // ターゲットチャンネルを取得
        const channel = member.guild.channels.cache.get(TARGET_CHANNEL_ID);

        // チャンネルが見つからない場合は終了
        if (!channel) {
            console.error(`Channel with ID ${TARGET_CHANNEL_ID} not found in guild ${TARGET_GUILD_ID}`);
            return;
        }

        // 埋め込みメッセージを作成
        const leaveEmbed = new EmbedBuilder()
            .setColor(0xFF0000) // 赤色
            .setTitle('メンバー退出')
            // ユーザー情報は member.user から取得
            .setDescription(`${member.user.tag} がサーバーを去りました。`)
            .addFields(
                { name: '現在のサーバー人数', value: `${memberCount}人`, inline: true },
                { name: 'ユーザーID', value: member.id, inline: false },
            )
            .setTimestamp()
            .setFooter({ text: 'またの参加をお待ちしております。' });

        try {
            // チャンネルに埋め込みメッセージを送信
            await channel.send({ embeds: [leaveEmbed] });
            console.log(`Sent leave message for ${member.user.tag}`);
        } catch (error) {
            console.error(`Could not send leave message to channel ${TARGET_CHANNEL_ID}:`, error);
        }
    },
};
