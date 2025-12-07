import { Events, InteractionType, EmbedBuilder } from 'discord.js';

// 認証ボタンのカスタムID接頭辞
const VERIFY_CUSTOM_ID_PREFIX = 'verify_button_click_';

export default { // <-- export default でオブジェクトとしてエクスポート
    name: Events.InteractionCreate, // イベント名: 'interactionCreate'
    once: false,
    
    // index.jsのローダーからclientオブジェクトを受け取る
    async execute(interaction, client) { 
        
        // 1. 認証ボタンの処理
        if (interaction.isButton()) {
            const customId = interaction.customId;

            if (customId.startsWith(VERIFY_CUSTOM_ID_PREFIX)) {
                
                // 処理が3秒を超過する可能性に備え、まずdeferReplyで応答します
                // 🚨 Unknown Interaction対策: 既に応答済みでないか確認し、3秒ルール回避
                if (!interaction.deferred && !interaction.replied) {
                    try {
                        // ephemeral: true で、操作した本人にだけ見せる応答
                        await interaction.deferReply({ ephemeral: true }); 
                    } catch (e) {
                        // 3秒ルールを超過した場合は、この時点でInteractionが無効になっているため、処理を終了します。
                        console.error("deferReply中にエラーが発生しました。3秒ルールを超過した可能性があります。", e);
                        return;
                    }
                }

                const roleId = customId.split('_').pop();
                const member = interaction.member;

                try {
                    const targetRole = interaction.guild.roles.cache.get(roleId);

                    if (!targetRole) {
                        // エラー応答をEmbedに変更
                        const errorEmbed = new EmbedBuilder()
                            .setColor('#e74c3c') // 赤
                            .setTitle('⛔ 認証エラー')
                            .setDescription('付与対象のロールが見つかりませんでした。Botの設定を確認してください。')
                            .setTimestamp();
                        
                        // deferReply後のため editReply を使用
                        await interaction.editReply({ embeds: [errorEmbed], content: '', ephemeral: true });
                        return;
                    }
                    
                    // 既にロールを持っているか確認 (オプション: 必要であれば実装)
                    if (member.roles.cache.has(targetRole.id)) {
                        const infoEmbed = new EmbedBuilder()
                            .setColor('#3498db') // 青
                            .setTitle('ℹ️ 認証済み')
                            .setDescription(`あなたは既にロール ${targetRole.toString()} をお持ちです。`)
                            .setTimestamp();
                        
                        await interaction.editReply({ embeds: [infoEmbed], content: '', ephemeral: true });
                        return;
                    }


                    // ... ロール付与処理 ...
                    await member.roles.add(targetRole, '認証システムによるロール付与');

                    // 成功時の応答をEmbedに変更
                    const successEmbed = new EmbedBuilder()
                        .setColor('#2ecc71') // 緑
                        .setTitle('🎉 認証成功')
                        .setDescription(
                            `認証が完了しました！\n\n` +
                            `ロール **${targetRole.toString()}** が正常に付与されました。\n` +
                            `これでサーバー内のチャンネルを閲覧できます。`
                        )
                        .setTimestamp()
                        .setFooter({ text: 'ご利用ありがとうございます！' });
                    
                    // deferReplyで保留した応答をeditReplyで編集して送信
                    await interaction.editReply({ 
                        embeds: [successEmbed], 
                        content: '', // contentを空にする
                        ephemeral: true 
                    }).catch(e => console.error("editReply後のエラーキャッチ:", e));

                } catch (error) {
                    console.error('認証ボタン処理エラー:', error);
                    
                    // エラー時の応答をEmbedに変更
                    const systemErrorEmbed = new EmbedBuilder()
                        .setColor('#f39c12') // オレンジ
                        .setTitle('🚨 システムエラー')
                        .setDescription(
                            `認証中に予期せぬエラーが発生しました。\n` +
                            `Botの権限不足（Botのロールをメンバーのロールより上に配置してください）\n` +
                            `またはその他の設定エラーの可能性があります。`
                        )
                        .setTimestamp();
                        
                    // エラー発生時も editReply を使用し、.catch で Unknown interaction を避ける
                    if (interaction.deferred || interaction.replied) {
                         await interaction.editReply({ 
                            embeds: [systemErrorEmbed], 
                            content: '',
                            ephemeral: true 
                        }).catch(e => console.error("editReply後のエラーキャッチ:", e));
                    }
                }
            }
        }
    },
};
