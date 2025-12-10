import { 
    Events, 
    EmbedBuilder, 
    AuditLogEvent, 
    PermissionFlagsBits 
} from 'discord.js';

const TARGET_GUILD_ID = '1448245012239356027'; // 監視対象サーバー
const USER_LOG_CHANNEL_ID = '1448290741112803388'; // ユーザー操作ログチャンネル

// ユーザーログ (ロール付与/剥奪/TIMEOUT/KICK) のためのイベントハンドラ
export default {
    name: Events.ClientReady, // Botが準備完了したときにリスナーを設定
    once: true,
    
    async execute(client) {
        // 対象ギルドを取得
        const guild = client.guilds.cache.get(TARGET_GUILD_ID);
        if (!guild) return console.error(`[UserLog] ⚠️ サーバーID ${TARGET_GUILD_ID} が見つかりません。`);

        const logChannel = guild.channels.cache.get(USER_LOG_CHANNEL_ID);
        if (!logChannel) return console.error(`[UserLog] ⚠️ ログチャンネルID ${USER_LOG_CHANNEL_ID} が見つかりません。`);

        console.log(`[UserLog] ⚙️ ユーザー操作ログのリスナーを設定中...`);

        // --- 1. メンバーロール更新イベントリスナー ---
        
        client.on(Events.GuildMemberUpdate, async (oldMember, newMember) => {
            if (newMember.guild.id !== TARGET_GUILD_ID) return;

            // ロールの追加/削除を検出
            const addedRoles = newMember.roles.cache.filter(role => !oldMember.roles.cache.has(role.id));
            const removedRoles = oldMember.roles.cache.filter(role => !newMember.roles.cache.has(role.id));
            
            if (addedRoles.size > 0) {
                await logChannel.send({ embeds: [await createRoleChangeLogEmbed(guild, newMember.user, addedRoles, 'ADD')] });
            }
            if (removedRoles.size > 0) {
                await logChannel.send({ embeds: [await createRoleChangeLogEmbed(guild, newMember.user, removedRoles, 'REMOVE')] });
            }

            // タイムアウト (TIMEOUT/UNTIMEOUT) を検出
            const oldTimeout = oldMember.communicationDisabledUntilTimestamp;
            const newTimeout = newMember.communicationDisabledUntilTimestamp;
            
            if (oldTimeout !== newTimeout) {
                await logChannel.send({ embeds: [await createTimeoutLogEmbed(guild, newMember, oldTimeout, newTimeout)] });
            }
        });
        
        // --- 2. メンバーKICKイベントリスナー (監査ログ使用) ---

        // KICKイベントは AuditLogEvent.MemberKick を使用して検出
        // GuildMemberRemove イベントでは KICKとLEAVEの区別が難しいため、監査ログを頼る
        client.on(Events.GuildMemberRemove, async (member) => {
            if (member.guild.id !== TARGET_GUILD_ID) return;
            
            try {
                const auditLogEntry = await fetchAuditLog(member.guild, AuditLogEvent.MemberKick, member.user.id);
                
                // 監査ログがKICKで、かつ発生時間が非常に近い場合
                if (auditLogEntry && (Date.now() - auditLogEntry.createdTimestamp < 5000)) {
                    await logChannel.send({ embeds: [await createKickLogEmbed(member.guild, member.user, auditLogEntry)] });
                }
            } catch (error) {
                console.error(`[UserLog] KICK監査ログの取得中にエラーが発生しました:`, error);
            }
        });


        // メンバー操作のログ埋め込み関数
        // ----------------------------------------------------

        /**
         * ロール付与/剥奪のログEmbedを作成
         */
        async function createRoleChangeLogEmbed(guild, user, roles, action) {
            const actionType = action === 'ADD' ? AuditLogEvent.MemberRoleUpdate : AuditLogEvent.MemberRoleUpdate;
            const auditLogEntry = await fetchAuditLog(guild, actionType, user.id);
            const executor = auditLogEntry?.executor;
            
            const title = action === 'ADD' ? '🟢 ロール付与' : '🔴 ロール剥奪';
            const color = action === 'ADD' ? '#2ecc71' : '#e74c3c';

            return new EmbedBuilder()
                .setColor(color)
                .setTitle(title)
                .setDescription(`ユーザー **${user.tag}** のロールが更新されました。`)
                .addFields(
                    { name: '対象ユーザー', value: `<@${user.id}> (${user.tag})`, inline: false },
                    { name: '実行者', value: executor ? `<@${executor.id}> (${executor.tag})` : '不明', inline: true },
                    { name: 'ロール', value: roles.map(r => `<@&${r.id}>`).join(', '), inline: false }
                )
                .setTimestamp();
        }
        
        /**
         * KICKのログEmbedを作成
         */
        async function createKickLogEmbed(guild, user, auditLogEntry) {
            const executor = auditLogEntry.executor;
            const reason = auditLogEntry.reason || '理由なし';

            return new EmbedBuilder()
                .setColor('#e74c3c') // Red
                .setTitle('🥾 メンバーKICK')
                .setDescription(`ユーザー **${user.tag}** がサーバーからKickされました。`)
                .addFields(
                    { name: '対象ユーザー', value: `<@${user.id}> (${user.tag})`, inline: false },
                    { name: '実行者', value: executor ? `<@${executor.id}> (${executor.tag})` : '不明', inline: true },
                    { name: '理由', value: reason, inline: true }
                )
                .setTimestamp();
        }

        /**
         * タイムアウトのログEmbedを作成
         */
        async function createTimeoutLogEmbed(guild, member, oldTimeout, newTimeout) {
            const isTimeout = newTimeout !== null;
            const actionType = isTimeout ? AuditLogEvent.MemberUpdate : AuditLogEvent.MemberUpdate;
            const auditLogEntry = await fetchAuditLog(guild, actionType, member.user.id);
            const executor = auditLogEntry?.executor;
            const reason = auditLogEntry?.reason || '理由なし';
            
            const title = isTimeout ? '🛑 タイムアウト付与' : '✅ タイムアウト解除';
            const color = isTimeout ? '#f39c12' : '#3498db'; // Orange or Blue
            const until = isTimeout 
                ? `<t:${Math.floor(newTimeout / 1000)}:F>` 
                : '即時解除';

            return new EmbedBuilder()
                .setColor(color)
                .setTitle(title)
                .setDescription(`ユーザー **${member.user.tag}** にタイムアウト操作が行われました。`)
                .addFields(
                    { name: '対象ユーザー', value: `<@${member.user.id}> (${member.user.tag})`, inline: false },
                    { name: '実行者', value: executor ? `<@${executor.id}> (${executor.tag})` : '不明', inline: true },
                    { name: '解除時刻', value: until, inline: true },
                    { name: '理由', value: reason, inline: true }
                )
                .setTimestamp();
        }
        
        /**
         * 監査ログから最新のエントリーを取得
         */
        async function fetchAuditLog(guild, type, targetId = null) {
            try {
                // MemberUpdate (ロール/TIMEOUT) のログは数が多いため、直前の変更を正確に取得するのが難しい
                const logs = await guild.fetchAuditLogs({
                    type: type,
                    limit: 5, // 複数のログを取得
                });
                
                // ターゲットIDと最も時間の近いログエントリーを探す
                const latestEntry = logs.entries.find(entry => 
                    !targetId || entry.target.id === targetId
                );

                // ターゲットIDが一致し、かつ操作から5秒以内であるか確認
                if (latestEntry && (Date.now() - latestEntry.createdTimestamp < 5000)) {
                    return latestEntry;
                }

            } catch (error) {
                console.error(`[UserLog] 監査ログの取得中にエラーが発生しました (${type}):`, error);
            }
            return null;
        }
    }
};
