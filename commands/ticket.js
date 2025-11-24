import { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle,
    PermissionFlagsBits 
} from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('ticket') 
        .setDescription('チケット作成用パネルを設置します（管理者のみ）。')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option => 
            option.setName('title')
                .setDescription('パネルのタイトル')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('description')
                .setDescription('パネルの概要（本文）')
                .setRequired(true))
        .addStringOption(option => 
            option.setName('button_label')
                .setDescription('ボタンの文字（例: 📩 お問い合わせ）')
                .setRequired(true))
        .addAttachmentOption(option => 
            option.setName('image_file')
                .setDescription('パネルに埋め込む画像')
                .setRequired(false)),

    async execute(interaction) {
        await interaction.deferReply({ ephemeral: true });

        const title = interaction.options.getString('title');
        const description = interaction.options.getString('description');
        const buttonLabel = interaction.options.getString('button_label');
        const imageFile = interaction.options.getAttachment('image_file');

        // パネルのEmbed作成
        const panelEmbed = new EmbedBuilder()
            .setColor('#2b2d31') // ダークグレー
            .setTitle(title)
            .setDescription(description)
            .setFooter({ text: 'Ticket Support System' });

        if (imageFile) {
            panelEmbed.setImage(imageFile.url);
        }

        // チケット作成ボタン
        const openButton = new ButtonBuilder()
            .setCustomId('ticket_create_btn') // イベントハンドラでこのIDを検知します
            .setLabel(buttonLabel)
            .setStyle(ButtonStyle.Primary)
            .setEmoji('📩');

        const row = new ActionRowBuilder().addComponents(openButton);

        // チャンネルに送信
        await interaction.channel.send({
            content: '```fix\n// --- サポートチケット受付 --- //\n```',
            embeds: [panelEmbed],
            components: [row]
        });

        await interaction.editReply({ content: '✅ チケットパネルを設置しました。' });
    },
};
