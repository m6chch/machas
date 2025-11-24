// events/verifyinteractionCreate.js
import { Events, InteractionType } from 'discord.js';

// 認証ボタンのカスタムID接頭辞
const VERIFY_CUSTOM_ID_PREFIX = 'verify_button_click_';

export default { // <-- export default でオブジェクトとしてエクスポート
    name: Events.InteractionCreate, // イベント名: 'interactionCreate'
    once: false,
    
    // index.jsのローダーからclientオブジェクトを受け取る
    async execute(interaction, client) { 
        
        // 1. スラッシュコマンドの処理 (index.jsと重複する場合は削除推奨)
        // ...
        
        // 2. 認証ボタンの処理 (index.jsから持ってくる場合)
        if (interaction.isButton()) {
            const customId = interaction.customId;

            if (customId.startsWith(VERIFY_CUSTOM_ID_PREFIX)) {
                // ... ボタン処理ロジック (clientを使ってロールなどを取得する) ...
                
                await interaction.deferReply({ ephemeral: true }); 
                
                try {
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

                    // ... ロール付与処理 ...
                    await member.roles.add(targetRole, '認証システムによるロール付与');

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
    },
};
