import { 
    Events, 
    EmbedBuilder 
} from 'discord.js';

// --- カスタムID定義（commands/embed.jsと同期） ---
const EMBED_MODAL_CUSTOM_ID = 'embed_form_modal';
const TITLE_INPUT_CUSTOM_ID = 'embed_title_input';
const DESCRIPTION_INPUT_CUSTOM_ID = 'embed_description_input';
// --------------------------------------------------------------------------

export default {
    // InteractionCreateイベントですが、モーダル処理に特化させます
    name: Events.InteractionCreate, 
    once: false,
    
    async execute(interaction, client) {
        
        // フォーム送信（モーダル）でなければ処理しない
        if (!interaction.isModalSubmit()) return;

        // 該当のEmbed作成フォームからの送信かチェック
        if (interaction.customId === EMBED_MODAL_CUSTOM_ID) {
            
            // Embed送信は時間がかかる可能性があるため遅延応答
            await interaction.deferReply({ ephemeral: true }); 

            try {
                // フォームから入力値を取得
                const title = interaction.fields.getTextInputValue(TITLE_INPUT_CUSTOM_ID);
                const description = interaction.fields.getTextInputValue(DESCRIPTION_INPUT_CUSTOM_ID);

                // Embedの作成
                const finalEmbed = new EmbedBuilder()
                    .setColor('#1abc9c') // ターコイズ色
                    .setTitle(title)
                    .setDescription(description)
                    .setAuthor({ 
                        name: interaction.user.tag, 
                        iconURL: interaction.user.displayAvatarURL() 
                    })
                    .setTimestamp()
                    .setFooter({ text: 'Embed Builder Command' });
                
                // 元のチャンネルにEmbedメッセージを送信
                await interaction.channel.send({
                    content: '```js\n// Administrator Message Broadcast\n```',
                    embeds: [finalEmbed]
                });

                // コマンドの応答を編集（実行者への通知）
                await interaction.editReply({ 
                    content: `✅ Embedメッセージをチャンネルに送信しました。`,
                    ephemeral: true 
                });

            } catch (error) {
                console.error('モーダル送信処理エラー:', error);
                await interaction.editReply({ 
                    content: '🚨 Embedの送信中にエラーが発生しました。', 
                    ephemeral: true 
                });
            }
        }
    },
};
