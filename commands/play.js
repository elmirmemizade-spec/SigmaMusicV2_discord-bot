'use strict';

const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ComponentType,
} = require('discord.js');
const { search } = require('../src/YouTube');
const MusicQueue = require('../src/MusicQueue');

const EMBED_COLOR = process.env.EMBED_COLOR || '#5865F2';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('YouTube\'dan şarkı çal')
        .addStringOption(opt =>
            opt.setName('sorgu')
                .setDescription('Şarkı adı veya YouTube linki')
                .setRequired(true)
        ),

    async execute(interaction) {
        const client = interaction.client;
        const member = interaction.member;
        const guild  = interaction.guild;

        // Ses kanalı kontrolü
        if (!member.voice.channel) {
            return interaction.reply({ content: '❌ Önce bir ses kanalına gir!', ephemeral: true });
        }

        await interaction.deferReply();

        const query = interaction.options.getString('sorgu');

        // ── YouTube arama ──
        let results;
        try {
            results = await search(query, member.user.tag);
        } catch (err) {
            return interaction.editReply(`❌ Arama başarısız: ${err.message}`);
        }

        // Doğrudan link verilmişse sonuç 1 tane olur → direk çal
        if (results.length === 1) {
            return await playTrack(interaction, results[0]);
        }

        // ── Seçim menüsü ──
        const options = results.slice(0, 5).map((v, i) => ({
            label: v.title.slice(0, 100),
            description: `⏱ ${v.duration}`,
            value: String(i),
        }));

        const embed = new EmbedBuilder()
            .setColor(EMBED_COLOR)
            .setTitle('🔎 Arama Sonuçları')
            .setDescription(
                results.slice(0, 5)
                    .map((v, i) => `**${i + 1}.** [${v.title}](${v.url}) \`${v.duration}\``)
                    .join('\n')
            )
            .setFooter({ text: 'Aşağıdan bir şarkı seçin (20 saniye)' });

        const row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('song_select')
                .setPlaceholder('🎵 Şarkı seçin...')
                .addOptions(options)
        );

        const msg = await interaction.editReply({ embeds: [embed], components: [row] });

        // Kullanıcı seçimini bekle
        const collector = msg.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            filter: i => i.user.id === interaction.user.id,
            time: 20_000,
            max: 1,
        });

        collector.on('collect', async i => {
            await i.deferUpdate();
            const chosen = results[parseInt(i.values[0])];
            await playTrack(interaction, chosen);
        });

        collector.on('end', (collected, reason) => {
            if (reason === 'time') {
                interaction.editReply({ content: '⏱ Süre doldu, seçim iptal.', embeds: [], components: [] }).catch(() => {});
            }
        });
    },
};

// ── Şarkıyı kuyruğa ekle / çalmaya başla ──
async function playTrack(interaction, track) {
    const client = interaction.client;
    const member = interaction.member;
    const guild  = interaction.guild;
    const voiceChannel = member.voice.channel;
    const textChannel  = interaction.channel;

    let queue = client.queues.get(guild.id);

    if (!queue) {
        queue = new MusicQueue(guild, voiceChannel, textChannel);
        client.queues.set(guild.id, queue);
        try {
            await queue.connect();
        } catch (err) {
            client.queues.delete(guild.id);
            return interaction.editReply(`❌ ${err.message}`);
        }
    } else {
        // Kanalı güncelle
        queue.voiceChannel  = voiceChannel;
        queue.textChannel   = textChannel;
    }

    await queue.addTrack(track);

    // Eğer zaten çalıyorsa "kuyruğa eklendi" mesajı göster
    if (queue.currentTrack && queue.currentTrack !== track) {
        const pos = queue.tracks.length;
        const embed = new EmbedBuilder()
            .setColor(EMBED_COLOR)
            .setDescription(`✅ **[${track.title}](${track.url})** kuyruğa eklendi. (Sıra: #${pos})`)
            .setThumbnail(track.thumbnail);
        await interaction.editReply({ embeds: [embed], components: [] });
    } else {
        // nowplaying mesajı MusicQueue tarafından atılır, sadece temizle
        await interaction.editReply({ content: '▶ Çalınıyor...', embeds: [], components: [] });
    }
}
