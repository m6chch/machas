import { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    PermissionFlagsBits
    // InteractionType は不要なので削除
} from 'discord.js';

// 認証時に使用するカスタムID
const VERIFY_CUSTOM_ID = 'verify_button_click';

export default {
    // スラッシュコマンドの定義を修正
    data: new SlashCommandBuilder()
        .setName('verify') 
        .setDescription('認証用のEmbedメッセージとボタンを送信します。')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) 
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
        .addAttachmentOption(option => // 👈 添付ファイル（画像）オプションに変更
            option.setName('image_file')
                .setDescription('Embedに埋め込む画像ファイルを添付してください。')
                .setRequired(false)), 
        
    // コマンドが実行された時の処理
    async execute(interaction) {
        // コマンドオプションの取得
        await interaction.deferReply({ ephemeral: true }); // 処理に時間がかかる可能性があるので遅延応答

        const targetRole = interaction.options.getRole('role');
        const embedTitle = interaction.options.getString('title');
        const embedDescription = interaction.options.getString('description');
        const buttonLabel = interaction.options.getString('button_label');
        const imageFile = interaction.options.getAttachment('image_file'); // 👈 添付ファイルを取得
        
        // Embedの作成
        const verifyEmbed = new EmbedBuilder()
            .setColor('#f39c12') 
            .setTitle(embedTitle)
            .setDescription(embedDescription)
            .setTimestamp()
            .setFooter({ text: '認証システム | ロール付与後にアクセス可能になります' });
        
        // 添付ファイルが指定された場合
        if (imageFile) {
            // Embedのimageプロパティに、添付ファイルが送信された後にDiscordが生成するURLを設定
            verifyEmbed.setImage(imageFile.url); 
        }

        // 認証ボタンの作成（CustomIDは前回と同じ）
        const verifyButton = new ButtonBuilder()
            .setCustomId(`${VERIFY_CUSTOM_ID}_${targetRole.id}`) 
            .setLabel(buttonLabel)
            .setStyle(ButtonStyle.Success); 

        // アクション行（ボタンを格納するコンポーネント）の作成
        const actionRow = new ActionRowBuilder().addComponents(verifyButton);
        
        // 認証メッセージを送信
        // 添付ファイルがある場合は files 配列に含めて送信
        await interaction.channel.send({
            content: '```fix\n// --- メンバー認証エリア --- //\n```',
            embeds: [verifyEmbed],
            components: [actionRow]
        });

        // コマンドの応答を編集
        await interaction.editReply({ 
            content: `✅ 認証メッセージを送信しました。付与ロール: **${targetRole.name}**`,
            ephemeral: true 
        });
    },
};
