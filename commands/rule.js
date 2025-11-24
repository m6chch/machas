import { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    PermissionFlagsBits 
} from 'discord.js';

// ルールのテキストコンテンツ
const ruleContent = {
    section1Title: 'I. サーバー参加と認証について',
    section1Body: 
        '1. **認証の完了:** 指定された認証チャンネルで手続きを行い、認証ロールが付与されるまで、一般チャンネルへのアクセスは制限されます。\n' +
        '2. **ルールの確認と同意:** このルールは参加した時点で全て同意したものと見なします。変更があった場合は**お知らせチャンネル**で告知します。',

    section2Title: 'II. 基本的な禁止事項とマナー',
    section2Body:
        '1. **誹謗中傷・ハラスメントの禁止:** 特定の個人や団体に対する誹謗中傷、差別的発言、過度な個人攻撃は厳禁です。\n' +
        '2. **不適切なコンテンツの禁止:** わいせつ、グロテスク、暴力的な画像、動画、テキスト、法令違反の投稿は禁止します。\n' +
        '3. **荒らし行為の禁止:** 大量のメンション、無意味な連投など、サーバー環境を乱す行為は即時BANの対象となります。\n' +
        '4. **プライバシーの尊重:** 他人の**個人情報**を許可なく公開する行為は禁止します。',
        
    section3Title: 'III. 各チャンネル利用ガイドライン',
    section3Body:
        '1. **💬｜雑談｜:** 常識の範囲内で自由な会話を楽しんでください。過度な政治、宗教の話題は控えてください。\n' +
        '2. **📢｜自由販売｜:** メンバー間の取引は自由ですが、**トラブルについて管理者は一切責任を負いません**。\n' +
        '3. **🛒｜商品一覧｜:** サーバー主の公式販売専用です。メンバーの販売行為は禁止します。\n' +
        '4. **チケットシステムの利用:** **🎫｜チケット作成｜**は、お問い合わせ、サポート依頼、違反報告など、個別対応が必要な場合にのみ使用してください。',

    section4Title: 'IV. 罰則規定と緊急連絡先',
    section4Body:
        '1. **軽微な違反:** 注意、警告、一時的なタイムアウト（ミュート）\n' +
        '2. **悪質な違反:** キック（一時的な追放）、長期間のタイムアウト\n' +
        '3. **重大な違反:** 永続的なBAN（永久追放）\n\n' +
        '**緊急連絡先:** 違反報告や緊急対応が必要な場合は、**🎫｜チケット作成｜**チャンネルから報告してください。',
};


export default {
    // スラッシュコマンドの定義
    data: new SlashCommandBuilder()
        .setName('rule') 
        .setDescription('サーバーの利用規約（ルール）を現在のチャンネルに送信します。')
        // 管理者権限は必須ではありませんが、ルールの送信は管理者のみが行うことを想定します。
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator), 
        
    // コマンドが実行された時の処理
    async execute(interaction) {
        // コマンド実行中は即座に応答（Ephemeralではない）
        await interaction.deferReply({ ephemeral: false }); 

        const ruleEmbed = new EmbedBuilder()
            .setColor('#3498db') // 青色
            .setTitle('📜 Discordサーバー利用規約（RULES）')
            .setDescription('当サーバーの利用規約です。快適な交流のため、必ず全文を確認し遵守してください。')
            .setTimestamp()
            .setFooter({ text: '最終更新日：' + new Date().toLocaleDateString('ja-JP') });

        // ルールセクションをEmbedのフィールドとして追加
        ruleEmbed.addFields(
            { name: ruleContent.section1Title, value: ruleContent.section1Body },
            { name: ruleContent.section2Title, value: ruleContent.section2Body },
            { name: ruleContent.section3Title, value: ruleContent.section3Body },
            { name: ruleContent.section4Title, value: ruleContent.section4Body }
        );
        
        // 認証メッセージを送信
        await interaction.channel.send({
            content: '```ini\n[IMPORTANT] サーバーに参加したら、まずこのルールを確認してください。\n```',
            embeds: [ruleEmbed]
        });

        // コマンドの応答を編集（実行者への通知）
        await interaction.editReply({ 
            content: '✅ サーバー利用規約をチャンネルに送信しました。',
            ephemeral: true 
        });
    },
};
