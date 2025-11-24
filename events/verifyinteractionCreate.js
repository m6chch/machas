// 認証ボタンのカスタムID接頭辞
const VERIFY_CUSTOM_ID_PREFIX = 'verify_button_click_';

// ----------------------------------------------------
// 🤝 スラッシュコマンドの実行イベント (その下に追記)
// ----------------------------------------------------
client.on(Events.InteractionCreate, async interaction => {
    // 1. スラッシュコマンドの処理 (既存)
    if (interaction.isChatInputCommand()) {
        // ... コマンド処理ロジック ...
        const command = client.commands.get(interaction.commandName);
        // ... (省略: 上記のコマンド実行ロジック) ...
    }
    
    // 2. 認証ボタンの処理 (新規追加)
    if (interaction.isButton()) {
        const customId = interaction.customId;

        // 認証ボタンかどうかのチェック
        if (customId.startsWith(VERIFY_CUSTOM_ID_PREFIX)) {
            // 即座に応答してタイムアウトを防ぐ
            await interaction.deferReply({ ephemeral: true }); 
            
            try {
                // カスタムIDからロールIDを抽出
                const roleId = customId.split('_').pop();
                const targetRole = interaction.guild.roles.cache.get(roleId);
                const member = interaction.member;

                if (!targetRole) {
                    await interaction.editReply({ 
                        content: '⛔ エラー: 付与対象のロールが見つかりませんでした。', 
                        ephemeral: true 
                    });
                    return;
                }

                // 既にロールを持っているかチェック
                if (member.roles.cache.has(roleId)) {
                    await interaction.editReply({ 
                        content: '✅ 既に認証済みです。', 
                        ephemeral: true 
                    });
                    return;
                }

                // ロールを付与
                await member.roles.add(targetRole, '認証システムによるロール付与');

                // 成功メッセージ
                await interaction.editReply({ 
                    content: `🎉 認証が完了し、ロール **${targetRole.name}** が付与されました！`, 
                    ephemeral: true 
                });

            } catch (error) {
                console.error('認証ボタン処理エラー:', error);
                await interaction.editReply({ 
                    content: '🚨 認証中にエラーが発生しました。権限設定を確認してください。', 
                    ephemeral: true 
                });
            }
        }
    }
});
