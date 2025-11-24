import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('ping') 
        .setDescription('ボットの応答速度をテストし、結果を詳細に表示します。'),
        
    async execute(interaction) {
        // 応答までの時間を計算
        const apiLatency = Math.round(interaction.client.ws.ping);
        const processingLatency = Date.now() - interaction.createdTimestamp;

        const pingEmbed = new EmbedBuilder()
            .setColor('#2ecc71') // エメラルドグリーン
            .setTitle('📡 システム応答速度テスト')
            .setDescription('現在のボットのレイテンシ情報です。')
            .addFields(
                { name: '処理レイテンシ (ms)', value: `\`${processingLatency}\`ms`, inline: true },
                { name: 'APIレイテンシ (ms)', value: `\`${apiLatency}\`ms`, inline: true },
                { name: '\u200B', value: '\u200B', inline: true } // 空白
            )
            .setFooter({ text: 'Discord.js v14 稼働中' })
            .setTimestamp();
        
        await interaction.reply({ 
            content: '```js\n// PONG! 応答データを受信しました\n```', 
            embeds: [pingEmbed],
            ephemeral: true // 実行者のみに見えるメッセージ
        });
    },
};
