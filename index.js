// dotenvとfs（ファイルシステム）をインポート
import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import http from 'http'; // Webサーバー機能用

// discord.jsから必要なクラスをインポート
import { 
    Client, 
    GatewayIntentBits, 
    Collection, 
    Events // Eventsをインポート
} from 'discord.js';

// ESモジュールの環境で__dirnameを再現
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 環境変数からトークンを取得
const token = process.env.DISCORD_TOKEN;

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
        const eventModule = await import(`file://${filePath}`);
        const event = eventModule.default;

        if (event.name) {
            if (event.once) {
                client.once(event.name, (...args) => event.execute(...args, client));
            } else {
                client.on(event.name, (...args) => event.execute(...args, client));
            }
            console.log(`[イベントローダー] ✅ イベントファイル: ${file} (イベント名: ${event.name}) を読み込みました。`); 
        } else {
            console.warn(`[イベントローダー] ⚠️ ${file} には必要な "name" プロパティがありません。`);
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
// 🤝 スラッシュコマンドの実行イベント
// ----------------------------------------------------
client.on(Events.InteractionCreate, async interaction => {
    // スラッシュコマンド以外は無視
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);

    if (!command) {
        console.error(`[実行エラー] ${interaction.commandName} というコマンドは見つかりませんでした。`);
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(`[実行時エラー] コマンド ${interaction.commandName} の実行中にエラーが発生しました。`, error);
        // エラー応答をユーザーに送信
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp({ content: 'コマンドの実行中にエラーが発生しました！', ephemeral: true });
        } else {
            await interaction.reply({ content: 'コマンドの実行中にエラーが発生しました！', ephemeral: true });
        }
    }
});


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
});

// ----------------------------------------------------
// 🔑 ログイン
// ----------------------------------------------------

client.login(token);

client.on('error', (error) => {
    console.error('Discordクライアントでエラーが発生しました:', error);
});
