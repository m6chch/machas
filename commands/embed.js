import { 
    SlashCommandBuilder, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle, 
    ActionRowBuilder,
    PermissionFlagsBits 
} from 'discord.js';

// モーダルと入力フィールドのカスタムID
const EMBED_MODAL_CUSTOM_ID = 'embed_form_modal';
const TITLE_INPUT_CUSTOM_ID = 'embed_title_input';
const DESCRIPTION_INPUT_CUSTOM_ID = 'embed_description_input';

export default {
    data: new SlashCommandBuilder()
        .setName('embed') 
        .setDescription('タイトルと概要を入力して、Embedメッセージを送信します。')
        // 管理者権限を持つユーザーのみが使用できるように設定
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator), 
        
    async execute(interaction) {
        // 🚨 修正点はありません。showModal()はそれ自体が応答なので、deferReplyやreplyは不要です。

        // 1. モーダル (フォーム) の作成
        const modal = new ModalBuilder()
            .setCustomId(EMBED_MODAL_CUSTOM_ID)
            .setTitle('Embedメッセージ作成');

        // 2. テキスト入力フィールド (タイトル) の作成
        const titleInput = new TextInputBuilder()
            .setCustomId(TITLE_INPUT_CUSTOM_ID)
            .setLabel("Embedのタイトル")
            .setStyle(TextInputStyle.Short) // 短文用
            .setRequired(true)
            .setMaxLength(256)
            .setPlaceholder('例: 重要なアップデートのお知らせ');

        // 3. テキスト入力フィールド (概要) の作成
        const descriptionInput = new TextInputBuilder()
            .setCustomId(DESCRIPTION_INPUT_CUSTOM_ID)
            .setLabel("Embedの概要 (本文)")
            .setStyle(TextInputStyle.Paragraph) // 長文用
            .setRequired(true)
            .setPlaceholder('例: 〇〇サーバーとの連携を開始しました。');

        // 4. 入力フィールドを ActionRow に格納し、モーダルに追加
        const firstActionRow = new ActionRowBuilder().addComponents(titleInput);
        const secondActionRow = new ActionRowBuilder().addComponents(descriptionInput);

        modal.addComponents(firstActionRow, secondActionRow);

        // 5. ユーザーにモーダルを表示 (ここで応答と見なされる)
        await interaction.showModal(modal);
    },
};
