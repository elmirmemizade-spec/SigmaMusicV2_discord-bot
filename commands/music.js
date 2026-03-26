'use strict';

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const EMBED_COLOR = process.env.EMBED_COLOR || '#5865F2';

// ─────────── Yardımcı: kuyruk al veya hata ver ───────────
function getQueue(interaction) {
    const queue = interaction.client.queues.get(interaction.guild.id);
    if (!queue) {
        interaction.reply({ content: '❌ Şu an çalınan bir şarkı yok.', ephemeral: true });
        return null;
    }
    return queue;
}

// ──────────────────────────────────────────────────────────
//  /skip
// ──────────────────────────────────────────────────────────
const skip = {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Mevcut şarkıyı atla'),

    async execute(interaction) {
        const queue = getQueue(interaction);
        if (!queue) return;
        queue.skip();
        return interaction.reply({ content: '⏭ Şarkı atlandı.', ephemeral: false });
    },
};

// ──────────────────────────────────────────────────────────
//  /stop
// ──────────────────────────────────────────────────────────
const stop = {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Müziği durdur ve kanaldan ayrıl'),

    async execute(interaction) {
        const queue = getQueue(interaction);
        if (!queue) return;
        queue.destroy();
        return interaction.reply({ content: '⏹ Durduruldu, kanaldan ayrıldım.', ephemeral: false });
    },
};

// ──────────────────────────────────────────────────────────
//  /pause
// ──────────────────────────────────────────────────────────
const pause = {
    data: new SlashCommandBuilder()
        .setName('pause')
        .setDescription('Şarkıyı duraklat'),

    async execute(interaction) {
        const queue = getQueue(interaction);
        if (!queue) return;
        if (queue.isPaused()) return interaction.reply({ content: '⚠️ Zaten duraklatılmış.', ephemeral: true });
        queue.pause();
        return interaction.reply({ content: '⏸ Duraklatıldı.', ephemeral: false });
    },
};

// ──────────────────────────────────────────────────────────
//  /resume
// ──────────────────────────────────────────────────────────
const resume = {
    data: new SlashCommandBuilder()
        .setName('resume')
        .setDescription('Duraklatılmış şarkıya devam et'),

    async execute(interaction) {
        const queue = getQueue(interaction);
        if (!queue) return;
        if (!queue.isPaused()) return interaction.reply({ content: '⚠️ Şarkı zaten çalıyor.', ephemeral: true });
        queue.resume();
        return interaction.reply({ content: '▶ Devam ediyor.', ephemeral: false });
    },
};

// ──────────────────────────────────────────────────────────
//  /queue
// ──────────────────────────────────────────────────────────
const queue = {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Müzik kuyruğunu göster'),

    async execute(interaction) {
        const q = getQueue(interaction);
        if (!q) return;

        const lines = [];
        if (q.currentTrack) {
            lines.push(`**▶ Şu an:** [${q.currentTrack.title}](${q.currentTrack.url}) \`${q.currentTrack.duration}\``);
        }
        if (q.tracks.length === 0) {
            lines.push('\n*Kuyruk boş.*');
        } else {
            lines.push('');
            q.tracks.slice(0, 10).forEach((t, i) => {
                lines.push(`**${i + 1}.** [${t.title}](${t.url}) \`${t.duration}\``);
            });
            if (q.tracks.length > 10) {
                lines.push(`\n*...ve ${q.tracks.length - 10} şarkı daha.*`);
            }
        }

        const embed = new EmbedBuilder()
            .setColor(EMBED_COLOR)
            .setTitle('📋 Müzik Kuyruğu')
            .setDescription(lines.join('\n'))
            .setFooter({ text: `Toplam: ${q.tracks.length} şarkı | Ses: ${Math.round(q.volume * 100)}% | Döngü: ${q.loop ? 'Açık' : 'Kapalı'}` });

        return interaction.reply({ embeds: [embed] });
    },
};

// ──────────────────────────────────────────────────────────
//  /volume
// ──────────────────────────────────────────────────────────
const volume = {
    data: new SlashCommandBuilder()
        .setName('volume')
        .setDescription('Ses seviyesini ayarla (1-100)')
        .addIntegerOption(opt =>
            opt.setName('seviye')
                .setDescription('Ses seviyesi (1-100)')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(100)
        ),

    async execute(interaction) {
        const q = getQueue(interaction);
        if (!q) return;
        const level = interaction.options.getInteger('seviye');
        q.setVolume(level);
        return interaction.reply({ content: `🔊 Ses seviyesi **${level}%** olarak ayarlandı.`, ephemeral: false });
    },
};

// ──────────────────────────────────────────────────────────
//  /loop
// ──────────────────────────────────────────────────────────
const loop = {
    data: new SlashCommandBuilder()
        .setName('loop')
        .setDescription('Mevcut şarkı döngüsünü aç/kapat'),

    async execute(interaction) {
        const q = getQueue(interaction);
        if (!q) return;
        q.setLoop(!q.loop);
        return interaction.reply({ content: q.loop ? '🔁 Döngü **açıldı**.' : '➡ Döngü **kapatıldı**.', ephemeral: false });
    },
};

// ──────────────────────────────────────────────────────────
//  /nowplaying
// ──────────────────────────────────────────────────────────
const nowplaying = {
    data: new SlashCommandBuilder()
        .setName('nowplaying')
        .setDescription('Şu an çalan şarkıyı göster'),

    async execute(interaction) {
        const q = getQueue(interaction);
        if (!q) return;
        if (!q.currentTrack) return interaction.reply({ content: '❌ Şu an çalan bir şarkı yok.', ephemeral: true });

        const t = q.currentTrack;
        const embed = new EmbedBuilder()
            .setColor(EMBED_COLOR)
            .setAuthor({ name: '▶ Şu an çalıyor' })
            .setTitle(t.title)
            .setURL(t.url)
            .setThumbnail(t.thumbnail)
            .addFields(
                { name: '⏱ Süre',    value: t.duration || '?',           inline: true },
                { name: '👤 İsteyen', value: t.requestedBy || '?',        inline: true },
                { name: '🔊 Ses',    value: `${Math.round(q.volume*100)}%`, inline: true },
                { name: '🔁 Döngü',  value: q.loop ? 'Açık' : 'Kapalı',  inline: true },
                { name: '📋 Kuyruk', value: `${q.tracks.length} şarkı`,   inline: true },
            );

        return interaction.reply({ embeds: [embed] });
    },
};

// ──────────────────────────────────────────────────────────
//  /clear  (kuyruğu temizle)
// ──────────────────────────────────────────────────────────
const clear = {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Kuyruktaki tüm şarkıları temizle'),

    async execute(interaction) {
        const q = getQueue(interaction);
        if (!q) return;
        q.clearQueue();
        return interaction.reply({ content: '🗑 Kuyruk temizlendi.', ephemeral: false });
    },
};

// ──────────────────────────────────────────────────────────
//  /help
// ──────────────────────────────────────────────────────────
const help = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('SigmaBotV2 komutlarını listele'),

    async execute(interaction) {
        const embed = new EmbedBuilder()
            .setColor(EMBED_COLOR)
            .setTitle('🎵 SigmaBotV2 Komutları')
            .setDescription('Optimize edilmiş, hafif Discord müzik botu.')
            .addFields(
                {
                    name: '▶ Müzik',
                    value: [
                        '`/play <sorgu>` — YouTube\'dan şarkı ara ve çal',
                        '`/skip` — Sonraki şarkıya geç',
                        '`/stop` — Durdur ve kanaldan ayrıl',
                        '`/pause` — Duraklat',
                        '`/resume` — Devam et',
                        '`/loop` — Döngüyü aç/kapat',
                        '`/volume <1-100>` — Ses seviyesi',
                    ].join('\n'),
                },
                {
                    name: '📋 Kuyruk',
                    value: [
                        '`/queue` — Kuyruğu göster',
                        '`/clear` — Kuyruğu temizle',
                        '`/nowplaying` — Şu an çalanı göster',
                    ].join('\n'),
                },
            )
            .setFooter({ text: 'SigmaBotV2 • Hafif & Optimize' });

        return interaction.reply({ embeds: [embed] });
    },
};

module.exports = { skip, stop, pause, resume, queue, volume, loop, nowplaying, clear, help };
