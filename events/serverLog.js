import { 
    Events, 
    EmbedBuilder, 
    AuditLogEvent, 
    PermissionFlagsBits 
} from 'discord.js';

const TARGET_GUILD_ID = '1448245012239356027'; // 監視対象サーバー
const SERVER_LOG_CHANNEL_ID = '1448290741112803388'; // サーバー操作ログチャンネル

// サーバーログ (チャンネル/ロール/BAN/KICK/INVITE) のためのイベントハンドラ
export default {
    name: Events.ClientReady, // Botが準備完了したときにリスナーを設定
    once: true,
    
    async execute(client) {
        // 対象ギルドを取得
        const guild = client.guilds.cache.get(TARGET_GUILD_ID);
        if (!guild) return console.error(`[ServerLog] ⚠️ サーバーID ${TARGET_GUILD_ID} が見つかりません。`);

        const logChannel = guild.channels.cache.get(SERVER_LOG_CHANNEL_ID);
        if (!logChannel) return console.error(`[ServerLog] ⚠️ ログチャンネルID ${SERVER_LOG_CHANNEL_ID} が見つかりません。`);

        console.log(`[ServerLog] ⚙️ サーバー操作ログのリスナーを設定中...`);

        // --- 1. チャンネル関連のイベントリスナー ---
        
        // チャンネル作成
        client.on(Events.ChannelCreate, async (channel) => {
            if (channel.guild.id !== TARGET_GUILD_ID) return;
            await logChannel.send({ embeds: [await createChannelLogEmbed(channel.guild, channel, AuditLogEvent.ChannelCreate)] });
        });

        // チャンネル削除
        client.on(Events.ChannelDelete, async (channel) => {
            if (channel.guild.id !== TARGET_GUILD_ID) return;
            await logChannel.send({ embeds: [await createChannelLogEmbed(channel.guild, channel, AuditLogEvent.ChannelDelete)] });
        });

        // チャンネル編集
        client.on(Events.ChannelUpdate, async (oldChannel, newChannel) => {
            if (newChannel.guild.id !== TARGET_GUILD_ID) return;
            // チャンネル名やトピックが変更された場合にのみログを送信
            if (oldChannel.name !== newChannel.name || oldChannel.topic !== newChannel.topic || oldChannel.parent?.id !== newChannel.parent?.id) {
                 await logChannel.send({ embeds: [await createChannelLogEmbed(newChannel.guild, newChannel, AuditLogEvent.ChannelUpdate, oldChannel)] });
            }
        });

        // --- 2. ロール関連のイベントリスナー ---

        // ロール作成
        client.on(Events.RoleCreate, async (role) => {
            if (role.guild.id !== TARGET_GUILD_ID) return;
            await logChannel.send({ embeds: [await createRoleLogEmbed(role.guild, role, AuditLogEvent.RoleCreate)] });
        });

        // ロール削除
        client.on(Events.RoleDelete, async (role) => {
            if (role.guild.id !== TARGET_GUILD_ID) return;
            await logChannel.send({ embeds: [await createRoleLogEmbed(role.guild, role, AuditLogEvent.RoleDelete)] });
        });

        // ロール編集
        client.on(Events.RoleUpdate, async (oldRole, newRole) => {
            if (newRole.guild.id !== TARGET_GUILD_ID) return;
            // ロール名、色、権限が変更された場合にのみログを送信
            if (oldRole.name !== newRole.name || oldRole.color !== newRole.color || oldRole.permissions.bitfield !== newRole.permissions.bitfield) {
                await logChannel.send({ embeds: [await createRoleLogEmbed(newRole.guild, newRole, AuditLogEvent.RoleUpdate, oldRole)] });
            }
        });
        
        // --- 3. その他の管理イベントリスナー ---

        // メンバーBAN
        client.on(Events.GuildBanAdd, async (ban) => {
            if (ban.guild.id !== TARGET_GUILD_ID) return;
            await logChannel.send({ embeds: [await createModerationLogEmbed(ban.guild, ban.user, AuditLogEvent.MemberBanAdd, ban.reason)] });
        });

        // メンバーUNBAN
        client.on(Events.GuildBanRemove, async (ban) => {
            if (ban.guild.id !== TARGET_GUILD_ID) return;
            await logChannel.send({ embeds: [await createModerationLogEmbed(ban.guild, ban.user, AuditLogEvent.MemberBanRemove)] });
        });
        
        // 招待リンク作成
        client.on(Events.InviteCreate, async (invite) => {
            if (invite.guild.id !== TARGET_GUILD_ID) return;
            await logChannel.send({ embeds: [await createInviteLogEmbed(invite.guild, invite)] });
        });
        
        // チャンネルとロールのログ埋め込み関数
        // ----------------------------------------------------

        /**
         * チャンネル関連のログEmbedを作成
         */
        async function createChannelLogEmbed(guild, channel, actionType, oldChannel = null) {
            const auditLogEntry = await fetchAuditLog(guild, actionType, channel.id);
            const executor = auditLogEntry?.executor;

            let title = '';
            let color = '';
            let description = '';
            
            switch (actionType) {
                case AuditLogEvent.ChannelCreate:
                    title = '🆕 チャンネル作成';
                    color = '#2ecc71'; // Green
                    description = `チャンネル ${channel.name} (<#${channel.id}>) が作成されました。`;
                    break;
                case AuditLogEvent.ChannelDelete:
                    title = '🗑️ チャンネル削除';
                    color = '#e74c3c'; // Red
                    description = `チャンネル **${channel.name}** (ID: ${channel.id}) が削除されました。`;
                    break;
                case AuditLogEvent.ChannelUpdate:
                    title = '📝 チャンネル編集';
                    color = '#f1c40f'; // Yellow
                    description = `チャンネル ${channel.name} (<#${channel.id}>) が編集されました。`;
                    
                    if (oldChannel.name !== channel.name) {
                        description += `\n- 名前: \`${oldChannel.name}\` -> \`${channel.name}\``;
                    }
                    if (oldChannel.topic !== channel.topic) {
                        description += `\n- トピックが更新されました。`;
                    }
                     if (oldChannel.parent?.id !== channel.parent?.id) {
                        description += `\n- カテゴリーが変更されました。`;
                    }
                    break;
            }

            return new EmbedBuilder()
                .setColor(color)
                .setTitle(title)
                .setDescription(description)
                .addFields(
                    { name: '実行者', value: executor ? `<@${executor.id}> (${executor.tag})` : '不明', inline: true },
                    { name: 'カテゴリー', value: channel.parent ? channel.parent.name : 'なし', inline: true }
                )
                .setTimestamp();
        }

        /**
         * ロール関連のログEmbedを作成
         */
        async function createRoleLogEmbed(guild, role, actionType, oldRole = null) {
            const auditLogEntry = await fetchAuditLog(guild, actionType, role.id);
            const executor = auditLogEntry?.executor;
            
            let title = '';
            let color = '';
            let description = '';

            switch (actionType) {
                case AuditLogEvent.RoleCreate:
                    title = '➕ ロール作成';
                    color = '#2ecc71';
                    description = `ロール ${role.name} (<@&${role.id}>) が作成されました。`;
                    break;
                case AuditLogEvent.RoleDelete:
                    title = '❌ ロール削除';
                    color = '#e74c3c';
                    description = `ロール **${role.name}** (ID: ${role.id}) が削除されました。`;
                    break;
                case AuditLogEvent.RoleUpdate:
                    title = '🔧 ロール編集';
                    color = '#f1c40f';
                    description = `ロール ${role.name} (<@&${role.id}>) が編集されました。`;
                    
                    if (oldRole.name !== role.name) {
                        description += `\n- 名前: \`${oldRole.name}\` -> \`${role.name}\``;
                    }
                    if (oldRole.color !== role.color) {
                        description += `\n- 色: \`${oldRole.hexColor}\` -> \`${role.hexColor}\``;
                    }
                    if (oldRole.permissions.bitfield !== role.permissions.bitfield) {
                        description += `\n- 権限が更新されました。`;
                    }
                    break;
            }

            return new EmbedBuilder()
                .setColor(color)
                .setTitle(title)
                .setDescription(description)
                .addFields(
                    { name: '実行者', value: executor ? `<@${executor.id}> (${executor.tag})` : '不明', inline: true },
                    { name: 'ID', value: role.id, inline: true }
                )
                .setTimestamp();
        }
        
        /**
         * モデレーション関連のログEmbedを作成 (BAN/UNBAN)
         */
        async function createModerationLogEmbed(guild, user, actionType, reason = '理由なし') {
            const auditLogEntry = await fetchAuditLog(guild, actionType, user.id);
            const executor = auditLogEntry?.executor;
            
            let title = '';
            let color = '';

            switch (actionType) {
                case AuditLogEvent.MemberBanAdd:
                    title = '🔨 ユーザーBAN';
                    color = '#c0392b'; // Dark Red
                    break;
                case AuditLogEvent.MemberBanRemove:
                    title = '🔓 ユーザーUNBAN';
                    color = '#2ecc71'; // Green
                    break;
                default:
                    return;
            }

            return new EmbedBuilder()
                .setColor(color)
                .setTitle(title)
                .setDescription(`ユーザー **${user.tag}** が操作されました。`)
                .addFields(
                    { name: '対象ユーザー', value: `<@${user.id}> (${user.tag})`, inline: false },
                    { name: '実行者', value: executor ? `<@${executor.id}> (${executor.tag})` : '不明', inline: true },
                    { name: '理由', value: reason || '理由なし', inline: true }
                )
                .setThumbnail(user.displayAvatarURL())
                .setTimestamp();
        }

        /**
         * 招待リンクのログEmbedを作成
         */
        async function createInviteLogEmbed(guild, invite) {
            const auditLogEntry = await fetchAuditLog(guild, AuditLogEvent.InviteCreate, invite.code);
            const executor = auditLogEntry?.executor || invite.inviter;

            const embed = new EmbedBuilder()
                .setColor('#9b59b6') // Purple
                .setTitle('🔗 招待リンク作成')
                .addFields(
                    { name: '作成者', value: executor ? `<@${executor.id}> (${executor.tag})` : '不明', inline: true },
                    { name: 'チャンネル', value: invite.channel ? `<#${invite.channel.id}>` : '不明', inline: true },
                    { name: 'リンク', value: `\`${invite.url}\``, inline: false },
                    { name: '有効期限', value: invite.maxAge === 0 ? '無期限' : `${invite.maxAge / 3600}時間`, inline: true },
                    { name: '最大使用回数', value: invite.maxUses === 0 ? '無制限' : `${invite.maxUses}回`, inline: true }
                )
                .setTimestamp();
            
            return embed;
        }

        /**
         * 監査ログから最新のエントリーを取得
         */
        async function fetchAuditLog(guild, type, targetId = null) {
            try {
                const logs = await guild.fetchAuditLogs({
                    type: type,
                    limit: 1,
                });
                const latestEntry = logs.entries.first();

                // ターゲットIDが一致するか確認（BAN/KICK/ロール付与などはtargetIdが重要）
                if (latestEntry && (!targetId || latestEntry.target.id === targetId)) {
                    return latestEntry;
                }
            } catch (error) {
                console.error(`[ServerLog] 監査ログの取得中にエラーが発生しました (${type}):`, error);
            }
            return null;
        }
    }
};
