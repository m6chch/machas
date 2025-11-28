import { Events } from 'discord.js';

export default {
    // Discordからスラッシュコマンドやボタン操作など、すべてのインタラクションを受け取るイベント
    name: Events.InteractionCreate,
    once: false,

    async execute(interaction, client) {
        // スラッシュコマンド（チャット入力コマンド）ではない場合は無視して終了
        if (!interaction.isChatInputCommand()) {
            return;
        }

        // 実行しようとしているコマンド名を取得
        const command = client.commands.get(interaction.commandName);

        // Botが登録されていないコマンドを受け取った場合は警告して終了
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
            
            // ユーザーにエラーが発生したことをフィードバック
            // コマンドが既に応答されているか（deferReplyされているか）をチェック
            const errorMessage = 'コマンドの実行中にエラーが発生しました。開発者に報告してください。';

            if (interaction.deferred || interaction.replied) {
                // 既に defer または reply されている場合は編集でエラーを通知
                await interaction.editReply({ 
                    content: errorMessage, 
                    ephemeral: true 
                }).catch(() => {}); // エラー編集に失敗しても無視
            } else {
                // まだ応答がない場合は即座にエラーを通知
                await interaction.reply({ 
                    content: errorMessage, 
                    ephemeral: true 
                }).catch(() => {}); // エラー通知に失敗しても無視
            }
        }
    },
};
