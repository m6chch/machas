import { Events, EmbedBuilder } from 'discord.js';

const LOG_CHANNEL_ID = '1442349331813498881'; // 指定されたチャンネルID

export default {
    name: Events.ClientReady, // イベント名: 'clientReady' (ボット起動完了時)
    once: true, // このイベントは一度だけ実行
    
    async execute(client) {
        console.log(`[イベント] ${client.user.tag} が正常に起動しました。`);

        try {
            const logChannel = await client.channels.fetch(LOG_CHANNEL_ID);
            
            if (logChannel) {
                // 豪華な埋め込みメッセージを作成
                const readyEmbed = new EmbedBuilder()
                    .setColor('#00ff00') // 緑色（成功）
                    .setTitle('🚀 BOT SYSTEM ONLINE')
                    .setAuthor({ 
                        name: client.user.tag, 
                        iconURL: client.user.displayAvatarURL() 
                    })
                    .setDescription(
                        `全てのモジュールと連携が完了し、システムが正常に起動しました。`
                    )
                    .addFields(
                        { name: 'クライアントID', value: `\`${client.user.id}\``, inline: true },
                        { name: '稼働サーバー数', value: `\`${client.guilds.cache.size}\``, inline: true },
                        { name: 'DJS Ver', value: `\`${client.options.version}\``, inline: true },
                    )
                    .setTimestamp() // 現在時刻をフッターに
                    .setFooter({ text: 'Status: Operational | イベントファイルからの起動' });
                
                // ログチャンネルに送信
                await logChannel.send({ 
                    content: '```ini\n[INFO] Bot Startup Initiated: Ready for operations\n```', // 上部に目立つメッセージ
                    embeds: [readyEmbed] 
                });

            } else {
                console.warn(`[警告] ログチャンネルID ${LOG_CHANNEL_ID} が見つかりません。起動ログの送信に失敗しました。`);
            }
        } catch (error) {
            console.error('起動ログの送信中にエラーが発生しました:', error);
        }
    },
};
