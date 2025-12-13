import { Events } from 'discord.js';

// ----------------------------------------------------
// 🎯 定数設定 (ユーザー様のご要望に基づく)
// ----------------------------------------------------
// チャンネル名から数字を抽出・更新する対象のチャンネルID
const TARGET_CHANNEL_ID = '1448256554624094241';
// チャンネル名を変更できるのはこのユーザーのみ
const TARGET_USER_ID = '460871806757240842';
// 反応があった場合に処理を実行するカスタム絵文字ID
const TARGET_EMOJI_ID = '1449210258433249450';
// ----------------------------------------------------

export default {
    // リアクションが追加されたときに実行されるイベント
    name: Events.MessageReactionAdd,
    once: false,
    
    /**
     * リアクション追加イベントハンドラ
     * @param {import('discord.js').MessageReaction} reaction - メッセージリアクションオブジェクト
     * @param {import('discord.js').User} user - リアクションしたユーザー
     */
    async execute(reaction, user, client) {

        // 1. Partial（部分的な情報）の場合、完全な情報を取得する
        // Bot起動前に発生したイベントや、キャッシュ外のメッセージに対応
        if (reaction.partial) {
            try {
                await reaction.fetch();
            } catch (error) {
                // リアクションされたメッセージが削除されたなどのエラーは無視
                console.error('[実績管理] リアクション情報の取得中にエラーが発生しました:', error);
                return;
            }
        }
        
        // ユーザーもPartialの可能性があるため、Bot自身でないかチェック
        if (user.partial) {
            try {
                await user.fetch();
            } catch (error) {
                console.error('[実績管理] ユーザー情報の取得中にエラーが発生しました:', error);
                return;
            }
        }

        // Bot自身のリアクションは無視
        if (user.bot) return;

        const message = reaction.message;
        const channel = message.channel;

        // 2. 条件チェック
        
        // A. チャンネルIDのチェック
        if (channel.id !== TARGET_CHANNEL_ID) return;

        // B. ユーザーIDのチェック
        if (user.id !== TARGET_USER_ID) return;

        // C. 絵文字IDのチェック（カスタム絵文字である必要がある）
        // 指定されたIDはカスタム絵文字IDと想定
        if (reaction.emoji.id !== TARGET_EMOJI_ID) return;

        // 3. チャンネル名から数字を抽出して更新
        
        // チャンネル名が変更可能か確認
        if (channel.type !== 0) { // 0は GuildText (テキストチャンネル)
             console.log('[実績管理] ⚠️ 対象チャンネルはテキストチャンネルではありません。スキップします。');
             return;
        }

        // チャンネル名から末尾の数字を抽出するための正規表現
        // 例: '実績管理-123' -> 123
        const regex = /-(\d+)$/;
        const currentName = channel.name;
        const match = currentName.match(regex);

        if (match) {
            const currentNumber = parseInt(match[1], 10);
            const newNumber = currentNumber + 1;
            
            // チャンネル名のプレフィックス部分を取得
            const prefix = currentName.substring(0, match.index + 1); // 例: '実績管理-'

            const newChannelName = `${prefix}${newNumber}`;

            try {
                // チャンネル名の更新
                await channel.setName(newChannelName, `ユーザー ${user.tag} のリアクションにより実績値を1増加`);
                
                console.log(`[実績管理] ✅ チャンネル名が更新されました: ${currentName} -> ${newChannelName}`);
                
                // 成功したことをリアクションしたユーザーに通知（一時的なメッセージ）
                // チャンネルに書き込むとログが流れるため、今回はコンソールログのみとします。
                
            } catch (error) {
                console.error(`[実績管理] ❌ チャンネル名変更に失敗しました (権限不足など):`, error);
            }
        } else {
            console.log(`[実績管理] ⚠️ チャンネル名 '${currentName}' から末尾の数字を抽出できませんでした。スキップします。`);
        }
    },
};
