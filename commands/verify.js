import { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    PermissionFlagsBits,
    InteractionType
} from 'discord.js';

// 認証時に使用するカスタムID
const VERIFY_CUSTOM_ID = 'verify_button_click';

export default {
    // スラッシュコマンドの定義
    data: new SlashCommandBuilder()
        .setName('verify') 
        .setDescription('認証用のEmbedメッセージとボタンを送信します。')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) // 管理者権限が必要
        .addRoleOption(option => 
            option.setName('role')
                .setDescription('認証完了後に付与するロールを選択してください。')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('title')
                .setDescription('Embedのタイトルを入力してください。')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('description')
                .setDescription('Embedの概要（本文）を入力してください。')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('button_label')
                .setDescription('ボタンに表示するテキストを入力してください。（例: ✅ 認証する）')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('image_url')
                .setDescription('Embedに埋め込む画像のURLを入力してください。（端末アップロード画像を推奨）')
                .setRequired(false)), // 画像はオプションとする
        
    // コマンドが実行された時の処理
    async execute(interaction) {
        // コマンドオプションの取得
        const targetRole = interaction.options.getRole('role');
        const embedTitle = interaction.options.getString('title');
        const embedDescription = interaction.options.getString('description');
        const buttonLabel = interaction.options.getString('button_label');
        const imageUrl = interaction.options.getString('image_url');
        
        // Embedの作成
        const verifyEmbed = new EmbedBuilder()
            .setColor('#f39c12') // オレンジ色（注意喚起）
            .setTitle(embedTitle)
            .setDescription(embedDescription)
            .setTimestamp()
            .setFooter({ text: '認証システム | ロール付与後にアクセス可能になります' });
        
        if (imageUrl) {
            verifyEmbed.setImage(imageUrl); // 画像URLを埋め込む
        }

        // 認証ボタンの作成
        const verifyButton = new ButtonBuilder()
            .setCustomId(`${VERIFY_CUSTOM_ID}_${targetRole.id}`) // カスタムIDにロールIDを付与して識別
            .setLabel(buttonLabel)
            .setStyle(ButtonStyle.Success); // 緑色のボタン

        // アクション行（ボタンを格納するコンポーネント）の作成
        const actionRow = new ActionRowBuilder().addComponents(verifyButton);
        
        // 認証メッセージを送信
        await interaction.channel.send({
            content: '```fix\n// --- メンバー認証エリア --- //\n```',
            embeds: [verifyEmbed],
            components: [actionRow]
        });

        // コマンドの応答（実行者のみに見える）
        await interaction.reply({ 
            content: `✅ 認証メッセージを送信しました。付与ロール: **${targetRole.name}**`,
            ephemeral: true 
        });
    },
};
