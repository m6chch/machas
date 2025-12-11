import { Events } from 'discord.js';
// 🚨 free-giftのロジックは 'events/free-gift.js' に分離されました
import { handleFreeGiftInteraction } from '../events/free-gift.js';

export default {
    name: Events.InteractionCreate,
    once: false,

    async execute(interaction, client) {

        // ===============================================
        // A. ボタン/セレクトメニューなどのコンポーネント処理
        // ===============================================
        if (interaction.isButton() || interaction.isStringSelectMenu()) {
            
            // free-gift専用ハンドラに処理を委譲
            // customIdが 'free_gift_purchase' または 'free_gift_select' の場合は true を返す
            const handled = await handleFreeGiftInteraction(interaction, client);

            if (handled) {
                // free-giftインタラクションが処理された場合はここで終了
                return;
            }
            
            // ここに他のコンポーネントIDの処理を追加します
            // 例: if (interaction.customId.startsWith('verify_')) { ... }

            // 処理されない他のボタン/セレクトメニューは無視
            return;
        }

        // ===============================================
        // B. スラッシュコマンド（チャット入力コマンド）の処理
        // ===============================================
        if (!interaction.isChatInputCommand()) {
            // スラッシュコマンドでもコンポーネントでもない場合は無視
            return;
        }

        // 実行しようとしているコマンド名を取得
        const command = client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`[実行エラー] ${interaction.commandName} という名前のコマンドが見つかりませんでした。`);
            return;
        }

        try {
            // コマンドのexecute関数を実行
            await command.execute(interaction, client);
        } catch (error) {
            console.error(`[コマンド実行時エラー] /${interaction.commandName} の実行中にエラーが発生しました。`);
            console.error(error);
            
            const errorMessage = 'コマンドの実行中にエラーが発生しました。開発者に報告してください。';

            // 既に defer または reply されているかチェックし、適切な方法でエラーを通知
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ 
                    content: errorMessage, 
                    ephemeral: true 
                }).catch(() => {});
            } else {
                await interaction.reply({ 
                    content: errorMessage, 
                    ephemeral: true 
                }).catch(() => {});
            }
        }
    },
};
