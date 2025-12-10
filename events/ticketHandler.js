import { 
    Events, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    ChannelType, 
    PermissionFlagsBits, 
    AttachmentBuilder,
    Collection 
} from 'discord.js';

// --- 設定ID ---
const CATEGORY_ID = '1448291116053954570'; // チケット作成先カテゴリー
const LOG_CHANNEL_ID = '1448290669465702534'; // ログ送信先チャンネル
const STAFF_ROLE_ID = '1448250761376170005'; // スタッフロールID

// --- クールタイム管理用 (Map) ---
// キー: チャンネルID, 値: 最後に呼び出した時間(timestamp)
const callCooldowns = new Collection();
const COOLDOWN_TIME = 3 * 60 * 60 * 1000; // 3時間 (ミリ秒)

export default {
    name: Events.InteractionCreate,
    once: false,

    async execute(interaction, client) {
        if (!interaction.isButton()) return;

        const { customId, guild, user, channel, member } = interaction;

        // ----------------------------------------------------
        // 1. チケット作成処理 (ticket_create_btn)
        // ----------------------------------------------------
        if (customId === 'ticket_create_btn') {
            await interaction.deferReply({ ephemeral: true });

            // カテゴリーの取得
            const category = guild.channels.cache.get(CATEGORY_ID);
            if (!category) {
                return interaction.editReply('❌ エラー: チケット用カテゴリーが見つかりません。設定を確認してください。');
            }

            // チャンネル作成
            try {
                const ticketChannel = await guild.channels.create({
                    name: `ticket-${user.username}`,
                    type: ChannelType.GuildText,
                    parent: CATEGORY_ID,
                    permissionOverwrites: [
                        {
                            id: guild.id, // 全員
                            deny: [PermissionFlagsBits.ViewChannel], // 見えないように
                        },
                        {
                            id: user.id, // 作成者
                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles],
                        },
                        {
                            id: STAFF_ROLE_ID, // スタッフ
                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages],
                        },
                        {
                            id: client.user.id, // BOT自身
                            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels],
                        }
                    ],
                });

                // チケット内への案内メッセージ作成
                const welcomeEmbed = new EmbedBuilder()
                    .setColor('#3498db')
                    .setTitle('🎫 お問い合わせありがとうございます')
                    .setDescription(
                        `担当スタッフが対応しますので、しばらくお待ちください。\n` +
                        `お問い合わせ内容を詳細に記入してお待ちください。\n\n` +
                        `**操作:**\n` +
                        `🗑️ **閉じる:** チケットを削除します（スタッフのみ）\n` +
                        `🔔 **呼び出し:** スタッフに通知を送ります（3時間に1回）`
                    )
                    .setTimestamp();

                // ボタン作成（削除 & 呼び出し）
                const controlButtons = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('ticket_close_btn')
                        .setLabel('削除する')
                        .setStyle(ButtonStyle.Danger) // 赤色
                        .setEmoji('🗑️'),
                    new ButtonBuilder()
                        .setCustomId('ticket_call_btn')
                        .setLabel('スタッフ呼び出し')
                        .setStyle(ButtonStyle.Success) // 緑色
                        .setEmoji('🔔')
                );

                // チケットチャンネルに送信
                await ticketChannel.send({
                    content: `<@&${STAFF_ROLE_ID}>`, // Embed外でメンション
                    embeds: [welcomeEmbed],
                    components: [controlButtons]
                });
                
                // コードブロックでの装飾メッセージも送信
                await ticketChannel.send('```fix\n// Staff Support Interface Loaded //\n```');

                // 作成完了通知（ユーザーへ）
                await interaction.editReply({ content: `✅ チケットを作成しました: ${ticketChannel}` });

                // --- ログ送信（開かれたとき） ---
                const logChannel = guild.channels.cache.get(LOG_CHANNEL_ID);
                if (logChannel) {
                    const openLogEmbed = new EmbedBuilder()
                        .setColor('#00ff00') // 緑
                        .setTitle('📂 チケットオープン')
                        .addFields(
                            { name: '実行者', value: `${user.tag} (<@${user.id}>)`, inline: true },
                            { name: 'チャンネル', value: `${ticketChannel.name}`, inline: true },
                            { name: '時刻', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
                        )
                        .setTimestamp();
                    await logChannel.send({ embeds: [openLogEmbed] });
                }

            } catch (error) {
                console.error(error);
                await interaction.editReply('❌ チケットの作成中にエラーが発生しました。');
            }
        }

        // ----------------------------------------------------
        // 2. チケット削除処理 (ticket_close_btn)
        // ----------------------------------------------------
        if (customId === 'ticket_close_btn') {
            await interaction.deferReply({ ephemeral: true });

            // 権限チェック (スタッフロールを持っているか)
            if (!member.roles.cache.has(STAFF_ROLE_ID)) {
                return interaction.editReply('⛔ このボタンはスタッフのみ実行可能です。');
            }

            // メッセージ履歴の取得（トランスクリプト用）
            // 最大100件まで取得して保存します
            const messages = await channel.messages.fetch({ limit: 100 });
            // メッセージを時系列（古い順）に並べ替え
            const sortedMessages = messages.reverse();

            // テキストデータの作成
            let transcriptText = `Transcript for ${channel.name}\nGenerated at: ${new Date().toLocaleString()}\n----------------------------------------\n\n`;
            
            sortedMessages.forEach(msg => {
                const time = msg.createdAt.toLocaleString();
                const author = msg.author.tag;
                const content = msg.content || '(画像・埋め込みコンテンツ)';
                transcriptText += `[${time}] ${author}: ${content}\n`;
            });

            // バッファに変換（ファイルとして送信するため）
            const buffer = Buffer.from(transcriptText, 'utf-8');
            const attachment = new AttachmentBuilder(buffer, { name: `transcript-${channel.name}.txt` });

            // --- ログ送信（閉じられたとき） ---
            const logChannel = guild.channels.cache.get(LOG_CHANNEL_ID);
            if (logChannel) {
                const closeLogEmbed = new EmbedBuilder()
                    .setColor('#ff0000') // 赤
                    .setTitle('🔒 チケットクローズ')
                    .setDescription(`チケットが削除され、ログが保存されました。`)
                    .addFields(
                        { name: '実行者（削除者）', value: `${user.tag}`, inline: true },
                        { name: 'チャンネル名', value: `${channel.name}`, inline: true },
                        { name: '時刻', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: false }
                    )
                    .setTimestamp();

                // ログチャンネルにEmbedとtxtファイルを送信
                await logChannel.send({ 
                    embeds: [closeLogEmbed], 
                    files: [attachment] 
                });
            }

            await interaction.editReply('✅ チケットを削除します（5秒後）...');
            
            // 5秒後にチャンネル削除
            setTimeout(() => {
                channel.delete().catch(console.error);
            }, 5000);
        }

        // ----------------------------------------------------
        // 3. スタッフ呼び出し処理 (ticket_call_btn)
        // ----------------------------------------------------
        if (customId === 'ticket_call_btn') {
            const now = Date.now();
            const lastCall = callCooldowns.get(channel.id);

            // クールタイムチェック
            if (lastCall && now < lastCall + COOLDOWN_TIME) {
                const remainingTime = lastCall + COOLDOWN_TIME - now;
                const hours = Math.floor(remainingTime / (1000 * 60 * 60));
                const minutes = Math.floor((remainingTime % (1000 * 60 * 60)) / (1000 * 60));

                const cooldownEmbed = new EmbedBuilder()
                    .setColor('#e67e22') // オレンジ
                    .setTitle('⏳ クールタイム中')
                    .setDescription(`スタッフ呼び出しは3時間に1回のみ可能です。\n残り時間: **${hours}時間 ${minutes}分**`)
                    .setTimestamp();

                return interaction.reply({ embeds: [cooldownEmbed], ephemeral: true });
            }

            // 呼び出し実行
            await interaction.deferReply({ ephemeral: true });

            // クールタイム設定
            callCooldowns.set(channel.id, now);

            // スタッフへのメンション送信
            await channel.send({
                content: `<@&${STAFF_ROLE_ID}> 🔔 **お客様がスタッフの対応を求めています！**`
            });

            await interaction.editReply('✅ スタッフを呼び出しました。お待ちください。');
        }
    },
};
