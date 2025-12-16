import { Events } from 'discord.js';

// --- ターゲット設定 ---
// 応答対象のユーザーID
const TARGET_USER_ID = '460871806757240842';
// 応答が有効となるカテゴリID
const TARGET_CATEGORY_ID = '1448291116053954570';

// 'あ' の応答メッセージ
const RESPONSE_A = '引継ぎを行ってから実績記入を https://discord.com/channels/1448245012239356027/1448256554624094241 こちらにお願いします実績記入後次の依頼が詰まっている場合はアカウントが残っていても削除して次の依頼を開始するのでお気をつけください';

// 'い' の応答メッセージ
const RESPONSE_I = 'うえお';

export default {
    name: Events.MessageCreate,
    
    /**
     * 特定のユーザーが特定のカテゴリ内でメッセージを送信したときの自動応答
     * @param {import('discord.js').Message} message 
     */
    async execute(message) {
        // 1. Bot自身のメッセージは無視
        if (message.author.bot) return;

        // 2. ターゲットユーザーIDのチェック
        if (message.author.id !== TARGET_USER_ID) return;

        // 3. チャンネルがカテゴリ（parent）を持ち、テキストチャンネルであるかチェック (type 0 = GuildText)
        // また、DMなどで実行されていないかチェック
        if (!message.channel.parent || message.channel.type !== 0) return;

        // 4. ターゲットカテゴリIDのチェック
        if (message.channel.parent.id !== TARGET_CATEGORY_ID) return;

        // 5. メッセージ内容のチェック (前後の空白をトリムしてから比較)
        const content = message.content.trim();

        let replyMessage = null;

        if (content === 'あ') {
            replyMessage = RESPONSE_A;
        } else if (content === 'い') {
            replyMessage = RESPONSE_I;
        }

        // 応答が必要な場合、メッセージを送信
        if (replyMessage) {
            try {
                await message.channel.send(replyMessage);
                console.log(`[Macha Auto-Reply] ユーザー ${message.author.tag} のメッセージ: "${content}" に応答しました。`);
            } catch (error) {
                console.error('[Macha Auto-Reply] 応答メッセージの送信中にエラーが発生しました:', error);
            }
        }
    }
};
