// 必要なクラスをインポート
const { Events, EmbedBuilder } = require('discord.js');

// ターゲットサーバーIDとチャンネルID
const TARGET_GUILD_ID = '1448245012239356027'; // 対象サーバーID
const TARGET_CHANNEL_ID = '1448255290985414656'; // 送信先チャンネルID

module.exports = {
    // イベント名を設定
    name: Events.GuildMemberRemove,
    // 一度だけ実行するかどうか
    once: false,
    /**
     * メンバーがサーバーから退出したときに実行されます。
     * @param {import('discord.js').GuildMember | import('discord.js').PartialGuildMember} member - 退出したメンバーオブジェクト
     */
    async execute(member) {
        // 対象外のサーバーIDの場合は処理を終了
        if (member.guild.id !== TARGET_GUILD_ID) {
            return;
        }

        // 退出時のメンバー数を取得（ただし、この時点ではまだ退出前のメンバー数が反映されている可能性があるため注意が必要）
        // 正確な退出後の人数を取得するには、ギルドから再度フェッチする必要がありますが、ここではシンプルに `memberCount` を使用します。
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
            .setDescription(`${member.user.tag}がサーバーから退出しました。`)
            // メンバーのメンションは、退室後は機能しないため、タグ名を表示
            .addFields(
                { name: '現在のサーバー人数', value: `${memberCount}人`, inline: true }
            )
            .setTimestamp()
            .setThumbnail(member.user.displayAvatarURL({ extension: 'png' }));

        try {
            // チャンネルに埋め込みメッセージを送信
            await channel.send({ embeds: [leaveEmbed] });
            console.log(`Sent leave message for ${member.user.tag}`);
        } catch (error) {
            console.error(`Could not send leave message to channel ${TARGET_CHANNEL_ID}:`, error);
        }
    },
};
