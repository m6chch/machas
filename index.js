// dotenvとfs（ファイルシステム）をインポート
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http'; // Webサーバー機能用
import https from 'https'; // 24時間稼働用（自分へのPing送信）

// discord.jsから必要なクラスをインポート
import { 
    Client, 
    GatewayIntentBits, 
    Collection, 
    Events,
    // EmbedBuilder を追加 (もしEmbedを使うなら)
} from 'discord.js';

// ESモジュールの環境で__dirnameを再現
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 環境変数からトークンを取得
// 🚨 ここをRenderに設定した環境変数名に合わせる必要があります
const token = process.env.DISCORD_TOKEN; 
// RenderのURL (自分のサービスURL)
const MY_RENDER_URL = 'https://macha-9zsc.onrender.com';

// ----------------------------------------------------
// 💡 インテンツ (Intents) の設定
// ----------------------------------------------------
const client = new Client({
    intents: [
        // ギルド（サーバー）関連の基本インテンツ
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,          
        GatewayIntentBits.GuildBans,
        GatewayIntentBits.GuildEmojisAndStickers,
        GatewayIntentBits.GuildIntegrations,
        GatewayIntentBits.GuildWebhooks,
        GatewayIntentBits.GuildInvites,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences,        
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMessageTyping,
        GatewayIntentBits.GuildScheduledEvents,
        GatewayIntentBits.GuildModeration,
        
        // DM関連
        GatewayIntentBits.DirectMessages,
        GatewayIntentBits.DirectMessageReactions,
        GatewayIntentBits.DirectMessageTyping,

        // メッセージコンテンツ
        GatewayIntentBits.MessageContent
    ],
});

// コマンドを格納するためのCollectionを作成
client.commands = new Collection();

// ----------------------------------------------------
// ⚙️ イベントローダーの実装 (events/ ディレクトリ対応)
// ----------------------------------------------------

const eventsPath = path.join(__dirname, 'events');

if (fs.existsSync(eventsPath)) {
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        
        let eventModule;
        try {
            // 絶対パスとしてインポート
            eventModule = await import(`file://${filePath}`);
        } catch (e) {
            console.error(`[イベントローダー] ❌ ファイル ${file} のインポート中にエラーが発生しました:`, e.message);
            continue; // 次のファイルへスキップ
        }
        
        const event = eventModule.default;

        // 🚨 修正: event が undefined ではないか、必要なプロパティを持っているかを厳密にチェック
        if (event && event.name && typeof event.execute === 'function') {
            if (event.once) {
                client.once(event.name, (...args) => event.execute(...args, client));
            } else {
                client.on(event.name, (...args) => event.execute(...args, client));
            }
            console.log(`[イベントローダー] ✅ イベントファイル: ${file} (イベント名: ${event.name}) を読み込みました。`);      
        } else {
            // event.name が undefined だった場合にこの警告が出る
            console.warn(`[イベントローダー] ⚠️ ${file} は有効なイベント形式ではありません。スキップします。`);
        }
    }
    console.log(`---`);
    console.log(`✅ ${eventFiles.length} 件のイベントファイルの読み込みが完了しました。`);
} else {
    console.warn('⚠️ events/ ディレクトリが見つかりませんでした。イベントローダーをスキップします。');
}

// ----------------------------------------------------
// 🚀 コマンドローダーの実装 (commands/ ディレクトリ対応)
// ----------------------------------------------------

const commandsPath = path.join(__dirname, 'commands');

if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const commandModule = await import(`file://${filePath}`);
        const command = commandModule.default;

        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            console.log(`[コマンドローダー] ✅ コマンドファイル: ${file} (コマンド: /${command.data.name}) を読み込みました。`);
        } else {
            console.warn(`[コマンドローダー] ⚠️ ${filePath} には必要な "data" または "execute" プロパティがありません。`);
        }
    }
    console.log(`---`);
    console.log(`✅ ${commandFiles.length} 件のコマンドファイルの読み込みが完了しました。`);
} else {
    console.warn('⚠️ commands/ ディレクトリが見つかりませんでした。コマンドローダーをスキップします。');
}

// ----------------------------------------------------
// 🌐 24時間稼働のためのWebサーバー設定
// ----------------------------------------------------

const server = http.createServer((req, res) => {
    // 応答コード200 (OK) と簡単なテキストを返す
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Bot is running and responding to pings!\n');
});

// Renderが提供するPORT環境変数を使ってサーバーを起動
const PORT = process.env.PORT || 3000; 

server.listen(PORT, () => {
    console.log(`\n[Webサーバー] 🌐 Pingサーバーがポート ${PORT} で起動しました。`);
    
    // ⏰ サーバー起動後に自動Ping（Keep-Alive）を開始
    // Renderは15分でスリープするため、14分間隔でアクセスする
    const PING_INTERVAL_MS = 14 * 60 * 1000;
    
    // 初回Pingは少し遅延させて、Botの起動を優先
    setTimeout(() => {
        setInterval(() => {
            https.get(MY_RENDER_URL, (res) => {
                // Pingステータスログはコンソールを圧迫するため、簡潔に
            }).on('error', (err) => {
                console.error(`[Keep-Alive] Ping failed: ${err.message}`);
            });
        }, PING_INTERVAL_MS);
    }, 60000); // 1分後にPingを開始
    
    console.log(`[Keep-Alive] ⏰ ${PING_INTERVAL_MS / 60000}分間隔の自動Pingを開始しました: ${MY_RENDER_URL}`);
});


// ----------------------------------------------------
// 🔑 ログインと起動チェック
// ----------------------------------------------------

// 🚨 【重要】Botがオンラインになったことを確認するためのログ
client.once(Events.ClientReady, c => {
    console.log(`\n[Bot] ✅ ログイン成功! Logged in as ${c.user.tag} (${c.user.id})`);
    client.user.setActivity('代行業務', { type: 4 }); // Botのステータスを設定 (4=Custom Status)
});

// ログイン前にトークンの有効性を確認
if (!token) {
    console.error("\n[Bot] ❌ エラー: DISCORD_TOKEN が環境変数から読み取れませんでした。Renderの設定を確認してください。");
    // プロセスを終了
    process.exit(1); 
}

// ログイン実行
client.login(token);

// ログインエラー時に詳細な情報を出力
client.on('error', (error) => {
    console.error('Discordクライアントでエラーが発生しました:', error);
});
