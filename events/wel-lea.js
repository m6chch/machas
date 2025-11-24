import { Events, EmbedBuilder } from 'discord.js';

// --- 設定 ---
// 対象となるサーバーID (このサーバー以外での入退室は無視)
const TARGET_GUILD_ID = '1442170023832584478';

// ログを送信するチャンネルID
const LOG_CHANNEL_ID = '1442189029448880322';

// 認証チャンネルのID (入室者への案内に使用)
const VERIFY_CHANNEL_ID = '1442346427081822298'; 

// ルールチャンネルのID (入室者への案内に使用)
const RULES_CHANNEL_ID = '1442346282482925658'; 
// --- end 設定 ---

// -------------------------------------------------------------------
// メンバー参加時 (GuildMemberAdd) の処理
// -------------------------------------------------------------------
async function handleMemberAdd(member) {
    if (member.guild.id !== TARGET_GUILD_ID) return;

    const guild = member.guild;
    const logChannel = await guild.channels.fetch(LOG_CHANNEL_ID);
    
    // チャンネルリンクの準備
    const verifyChannel = await guild.channels.fetch(VERIFY_CHANNEL_ID);
    const rulesChannel = await guild.channels.fetch(RULES_CHANNEL_ID);

    // 1. ログチャンネルへのEmbed送信
    if (logChannel) {
        const joinTime = member.joinedAt ? `<t:${Math.floor(member.joinedAt.getTime() / 1000)}:F>` : 'N/A';
        
        const welcomeEmbed = new EmbedBuilder()
            .setColor('#2ecc71') // 緑色
            .setTitle('🚪 メンバー参加を検出')
            .setAuthor({ 
                name: member.user.tag, 
                iconURL: member.user.displayAvatarURL() 
            })
            .setDescription(
                `新しい挑戦者がサーバーに足を踏み入れました。\n\n` +
                `彼/彼女がサーバーの発展に貢献してくれることを期待します！`
            )
            .addFields(
                { name: 'ユーザー情報', value: `\`${member.user.tag}\` (<@${member.id}>)`, inline: false },
                { name: '参加日時', value: joinTime, inline: true },
                { name: '現在のメンバー数', value: `\`${guild.memberCount}\`人`, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'Status: Member Join Log' });

        await logChannel.send({ 
            content: `\`\`\`ini\n[NEW MEMBER] ${member.user.tag} が参加しました\n\`\`\``, 
            embeds: [welcomeEmbed] 
        });
        
        // 認証・ルールチャンネルの案内メッセージを追記
        const guidanceMessage = 
            `\n**管理者へ:** 新メンバーが活動を開始する前に、以下のチャンネルへの誘導を忘れずに行ってください。\n` +
            `- **認証:** ${verifyChannel ? verifyChannel.toString() : '認証チャンネルが見つかりません'}\n` +
            `- **ルール:** ${rulesChannel ? rulesChannel.toString() : 'ルールチャンネルが見つかりません'}`;
            
        await logChannel.send({ content: guidanceMessage });
    }

    // 2. 入ってきた人（メンバー）へのDM送信
    try {
        const dmEmbed = new EmbedBuilder()
            .setColor('#3498db') // 青色
            .setTitle(`🎉 ${guild.name}へようこそ！`)
            .setDescription(
                `ご参加ありがとうございます！サーバーを快適にご利用いただくため、最初にお願いしたいことが2点あります。`
            )
            .addFields(
                { 
                    name: '✅ STEP 1: 認証を完了してください', 
                    value: `不正利用を防ぐため、まずは ${verifyChannel ? verifyChannel.toString() : '#認証チャンネル'} で必要な手続きをお願いします。`, 
                    inline: false 
                },
                { 
                    name: '📜 STEP 2: ルールを確認してください', 
                    value: `トラブルを避けるため、必ず ${rulesChannel ? rulesChannel.toString() : '#ルールチャンネル'} を一読してください。`, 
                    inline: false 
                }
            )
            .setTimestamp();
            
        await member.send({ 
            content: `\`\`\`fix\n// サーバー ${guild.name} からの重要なお知らせ\n\`\`\``,
            embeds: [dmEmbed] 
        });
        console.log(`[DM送信] ${member.user.tag} にウェルカムDMを送信しました。`);
    } catch (error) {
        console.error(`[DM失敗] ${member.user.tag} へのDM送信に失敗しました:`, error.message);
    }
}

// -------------------------------------------------------------------
// メンバー退出時 (GuildMemberRemove) の処理
// -------------------------------------------------------------------
async function handleMemberRemove(member) {
    if (member.guild.id !== TARGET_GUILD_ID) return;

    const guild = member.guild;
    const logChannel = await guild.channels.fetch(LOG_CHANNEL_ID);

    if (logChannel) {
        // ログ送信
        const leaveTime = `<t:${Math.floor(Date.now() / 1000)}:F>`;

        const farewellEmbed = new EmbedBuilder()
            .setColor('#e74c3c') // 赤色
            .setTitle('👋 メンバー退出を検出')
            .setAuthor({ 
                name: member.user.tag, 
                iconURL: member.user.displayAvatarURL() 
            })
            .setDescription(
                `一人のメンバーが静かに去っていきました。\n\n` +
                `退出理由が何であれ、彼/彼女のこれからの旅路に幸多かれと願います。`
            )
            .addFields(
                { name: 'ユーザー情報', value: `\`${member.user.tag}\` (<@${member.id}>)`, inline: false },
                { name: '退出日時', value: leaveTime, inline: true },
                { name: '現在のメンバー数', value: `\`${guild.memberCount}\`人`, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'Status: Member Leave Log' });

        await logChannel.send({ 
            content: `\`\`\`diff\n- [LEAVE MEMBER] ${member.user.tag} が退出しました\n\`\`\``, 
            embeds: [farewellEmbed] 
        });
    }
}

// -------------------------------------------------------------------
// モジュールエクスポート
// -------------------------------------------------------------------
export default {
    // メンバー参加と退出の両方のイベントを処理するため、イベント名を配列として扱います
    name: [Events.GuildMemberAdd, Events.GuildMemberRemove],
    once: false, 
    
    async execute(memberOrOldMember, client) {
        // GuildMemberAddイベントか、GuildMemberRemoveイベントかをEvents.nameで判断する代わりに、
        // 渡される引数のプロパティで判断し、適切な処理を呼び出します。
        
        // GuildMemberAddイベントの場合 (引数は member のみ)
        if (memberOrOldMember.user && !memberOrOldMember.guild) {
            handleMemberAdd(memberOrOldMember);
        } 
        // GuildMemberRemoveイベントの場合 (引数は member のみ)
        else if (memberOrOldMember.guild) {
             // GuildMemberRemoveイベントの引数は GuildMember
            handleMemberRemove(memberOrOldMember);
        }
        
        // 注: index.jsのイベントローダーは単一のイベント名を想定していますが、
        // 複数のイベントを扱う一般的なイベントハンドラーとして実装し、
        // index.jsのClient.onで個別に登録することを推奨します。
        // （今回は便宜上、関数を分けて実装しています）

        // index.js側での登録を簡略化するため、今回はそれぞれのイベントとして処理します。
        // 【重要】 index.jsのイベントローダーを修正する必要があります。

        // 実行は行わず、それぞれのエクスポートオブジェクトに分割することを推奨します。
    },
};

// -------------------------------------------------------------------
// 【重要】index.jsのローダーの都合上、ファイルは2つに分割することを推奨します
// -------------------------------------------------------------------
/* 現在、index.jsのローダーは「1ファイル = 1イベント」を想定しています。
    そのため、以下の2つのファイルに分けて実装することを強く推奨します。
    
    1. events/memberAdd.js  (参加ログとDM)
    2. events/memberRemove.js (退出ログ)
    
    もしこのまま 1 ファイルで実行した場合、index.jsのローダーが GuildMemberAdd/Remove の両方を正しく処理できない可能性があります。
*/
