import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { REST, Routes } from 'discord.js';

// ESモジュールの環境で__dirnameを再現
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 環境変数からトークンとクライアントID（ボットID）を取得
const token = process.env.DISCORD_TOKEN;
// 環境変数からクライアントIDも取得できるように.envに追記することを推奨
const clientId = process.env.CLIENT_ID; 

if (!clientId || !token) {
    console.error("⛔ 環境変数 CLIENT_ID または DISCORD_TOKEN が設定されていません。");
    process.exit(1);
}

const commands = [];
const commandsPath = path.join(__dirname, 'commands');

// commandsフォルダからコマンドファイルを読み込む
if (fs.existsSync(commandsPath)) {
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    
    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        try {
            // コマンドファイル（モジュール）を動的にインポート
            const commandModule = await import(`file://${filePath}`);
            const command = commandModule.default;
            
            if ('data' in command && 'execute' in command) {
                // コマンドデータ（JSON形式）を配列に追加
                commands.push(command.data.toJSON());
                console.log(`[デプロイ] ✅ コマンドデータ ${command.data.name} を収集しました。`);
            } else {
                console.warn(`[デプロイ] ⚠️ ${filePath} は必要な "data" または "execute" プロパティがありません。`);
            }
        } catch (error) {
            console.error(`[デプロイ] ❌ ファイル ${filePath} の読み込み中にエラーが発生しました:`, error);
        }
    }
}

// RESTモジュールでDiscord APIに接続
const rest = new REST().setToken(token);

// ----------------------------------------------------
// 🚀 コマンドの登録を実行
// ----------------------------------------------------

(async () => {
    try {
        console.log(`\n---`);
        console.log(`🚀 ${commands.length} 個のアプリケーションコマンドを登録中です...`);

        // グローバルにコマンドを登録
        const data = await rest.put(
            Routes.applicationCommands(clientId), // 全サーバー共通のグローバルコマンドとして登録
            { body: commands },
        );

        console.log(`✅ ${data.length} 個のアプリケーションコマンドの登録が完了しました！`);
    } catch (error) {
        console.error('❌ コマンドの登録中にエラーが発生しました:', error);
    }
})();
