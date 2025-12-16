// 必要なクラスをインポート
const { Events, EmbedBuilder } = require('discord.js');

// ターゲットサーバーIDとチャンネルID
const TARGET_GUILD_ID = '1448245012239356027'; // 対象サーバーID
const TARGET_CHANNEL_ID = '1448255290985414656'; // 送信先チャンネルID

module.exports = {
    // イベント名を設定
    name: Events.GuildMemberAdd,
    // 一度だけ実行するかどうか
    once: false,
    /**
     * 新しいメンバーがサーバーに参加したときに実行されます。
     * @param {import('discord.js').GuildMember} member - 参加したメンバーオブジェクト
     */
    async execute(member) {
        // 対象外のサーバーIDの場合は処理を終了
        if (member.guild.id !== TARGET_GUILD_ID) {
            return;
        }

        // ギルド内のメンバー数を取得（ボットを含む）
        const memberCount = member.guild.memberCount;

        // ターゲットチャンネルを取得
        const channel = member.guild.channels.cache.get(TARGET_CHANNEL_ID);

        // チャンネルが見つからない場合は終了
        if (!channel) {
            console.error(`Channel with ID ${TARGET_CHANNEL_ID} not found in guild ${TARGET_GUILD_ID}`);
            return;
        }

        // 埋め込みメッセージを作成
        const welcomeEmbed = new EmbedBuilder()
            .setColor(0x00FF00) // 緑色
            .setTitle('新規メンバー参加！')
            .setDescription(`${member.user}（${member.user.tag}）がサーバーに参加しました！`)
            .addFields(
                { name: '現在のサーバー人数', value: `${memberCount}人`, inline: true }
            )
            .setTimestamp()
            .setThumbnail(member.user.displayAvatarURL({ extension: 'png' }));

        try {
            // チャンネルに埋め込みメッセージを送信
            await channel.send({ embeds: [welcomeEmbed] });
            console.log(`Sent welcome message for ${member.user.tag}`);
        } catch (error) {
            console.error(`Could not send welcome message to channel ${TARGET_CHANNEL_ID}:`, error);
        }
    },
};
