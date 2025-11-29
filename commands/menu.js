import { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    ComponentType, 
    time,
    PermissionsBitField
} from 'discord.js';

// ----------------------------------------------------
// ⚙️ メニュー項目の定義
// ----------------------------------------------------
const MENU_ITEMS = {
    // 1番目の選択肢: にゃんこ
    'nyanko': {
        title: '🐈 にゃんこ代行パネル',
        color: '#f1c40f', // 黄色
        description: '大人気のチート・代行メニューです。料金と詳細をご確認ください。',
        content: () => `
\`\`\`markdown
# 【にゃんこ大戦争】代行料金一覧

## 💰 メニュー 
- 猫缶: 48,000
- XP: 99,999,999
- NP: 9,999
- バトルアイテム: 999
- 猫ビタン: 999
- 城素材: 999
- キャッツアイ: 999
- マタタビ: 998
- リーダーシップ: 999
- にゃんチケ: 999
- レアチケ: 999
- プラチケ: 5
- レジェチケ: 3
- メインステージ 全クリア
- お宝 全解放
- 旧レジェンド 全クリア
- ガマトトレベル MAX
- ガマトト助手 レジェンド
- プレイ時間 変更
- 全キャラ開放
- 形態解放
- 全キャラレベルMAX
- 施設レベルMAX

## ✨ 全部200円セット (指定を除く)
- 上記各10円

## 👑 個別・指定メニュー (要見積もり)
以下のメニューは200円セットに含まれず、個別料金・お問い合わせが必要です。
- 指定キャラ開放
- 指定キャラ形態解放
\`\`\`
        `
    },
    // 2番目の選択肢: ぷにぷに
    'punipuni': {
        title: '👾 ぷにぷに代行メニュー',
        color: '#9b59b6', // 紫
        description: 'ぷにぷにに関する代行メニューです。',
        content: () => `
\`\`\`markdown
# 【妖怪ウォッチぷにぷに】代行料金一覧

## 💰 ワイポイント・強敵
- 強敵入手: 50円
- 10万ワイポ: 500円
- 20万ワイポ: 1,000円
- 30万ワイポ: 1,500円
- 40万ワイポ: 2,000円
- 50万ワイポ: 2,500円
- イベント終了まで継続代行: 3,000円

## 📚 秘伝書・スキル書
- 秘伝書カンスト: 500円
- スキル書カンスト: 1,000円
  (※スキル書カンストには秘伝書カンストも含まれます)
\`\`\`
        `
    }
};

export default {
    data: new SlashCommandBuilder()
        .setName('menu')
        .setDescription('セレクトメニューから選択した代行サービス情報をEmbedで表示します。')
        .setDefaultMemberPermissions(PermissionsBitField.Flags.SendMessages), 
    
    async execute(interaction, client) {
        // 処理中であることを応答（3秒ルール回避）
        await interaction.deferReply({ ephemeral: false }); // 全員に見えるように ephemeral: false

        // -----------------
        // 1. セレクトメニューの作成
        // -----------------
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('menu_selector')
            .setPlaceholder('表示したい代行メニューを選択してください...')
            .addOptions([
                {
                    label: 'にゃんこ大戦争',
                    description: '猫缶、XP、キャラ開放などの代行メニューを表示します。',
                    value: 'nyanko',
                    emoji: '🐈'
                },
                {
                    label: '妖怪ウォッチぷにぷに',
                    description: 'ワイポイント、強敵入手などの代行メニューを表示します。',
                    value: 'punipuni',
                    emoji: '👾'
                }
            ]);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        const initialEmbed = new EmbedBuilder()
            .setColor('#2ecc71') // Green
            .setTitle('📌 代行サービス メニュー')
            .setDescription('下のドロップダウンメニューから、ご希望のゲームを選択してください。');

        // 応答を編集してセレクトメニューを表示
        await interaction.editReply({ 
            embeds: [initialEmbed], 
            components: [row] 
        });

        // -----------------
        // 2. ユーザーの選択を待機
        // -----------------
        const filter = i => i.customId === 'menu_selector' && i.user.id === interaction.user.id;
        
        try {
            const collector = interaction.channel.createMessageComponentCollector({ 
                filter, 
                componentType: ComponentType.SelectMenu, 
                time: 60000 // 60秒でタイムアウト
            });

            collector.on('collect', async i => {
                const selectedValue = i.values[0];
                const item = MENU_ITEMS[selectedValue];
                
                if (!item) {
                    await i.update({ content: '無効なメニュー項目が選択されました。', components: [row] });
                    return;
                }

                // 選択されたメニューの内容を取得
                const contentText = item.content(interaction.guild, null, client);

                // 新しいEmbedの作成
                const resultEmbed = new EmbedBuilder()
                    .setColor(item.color)
                    .setTitle(item.title)
                    .setDescription(item.description)
                    .addFields({ 
                        name: '--- 料金・詳細情報 ---', 
                        value: contentText, 
                        inline: false 
                    })
                    .setTimestamp();
                
                // 元のセレクトメニューのメッセージを新しい内容で更新
                await i.update({
                    content: `**${item.title}** の情報を表示しました。再度選択することも可能です。`,
                    embeds: [resultEmbed],
                    components: [row] // 再度選択できるようにコンポーネントは維持
                });
            });

            collector.on('end', collected => {
                if (collected.size === 0) {
                     // タイムアウトした場合は、元のメッセージを編集（コンポーネントを削除）
                     interaction.editReply({
                         content: 'メニューの操作時間が経過しました。再度実行するには `/menu` を使用してください。',
                         components: [],
                         embeds: [initialEmbed]
                     }).catch(() => {});
                }
            });

        } catch (e) {
            console.error('メニュー操作エラー:', e);
            // 処理が失敗した場合の対応
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply({ 
                    content: 'メニューの処理中に予期せぬエラーが発生しました。',
                    components: [],
                    embeds: []
                }).catch(() => {});
            }
        }
    },
};
