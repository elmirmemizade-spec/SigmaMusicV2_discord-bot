'use strict';

const {
    createAudioPlayer,
    createAudioResource,
    AudioPlayerStatus,
    VoiceConnectionStatus,
    entersState,
    StreamType,
    NoSubscriberBehavior,
} = require('@discordjs/voice');
const ytdl = require('ytdl-core');
const { EmbedBuilder } = require('discord.js');

const DEFAULT_VOLUME = parseFloat(process.env.DEFAULT_VOLUME || 80) / 100;
const EMBED_COLOR = process.env.EMBED_COLOR || '#5865F2';

class MusicQueue {
    constructor(guild, voiceChannel, textChannel) {
        this.guild = guild;
        this.voiceChannel = voiceChannel;
        this.textChannel = textChannel;

        this.tracks = [];          // Kuyruk listesi
        this.currentTrack = null;  // Çalan şarkı
        this.volume = DEFAULT_VOLUME;
        this.loop = false;
        this.nowPlayingMsg = null;

        this.connection = null;
        this.player = createAudioPlayer({
            behaviors: { noSubscriber: NoSubscriberBehavior.Pause },
        });

        this._bindEvents();
    }

    // ──────────────── Dahili event bağlantıları ──────────────────

    _bindEvents() {
        this.player.on(AudioPlayerStatus.Idle, () => this._onIdle());
        this.player.on('error', (err) => {
            console.error(`[Player Error] ${err.message}`);
            this._onIdle(); // hata olursa sonraki parçaya geç
        });
    }

    _onIdle() {
        if (this.loop && this.currentTrack) {
            // Aynı şarkıyı tekrar başa ekle
            this.tracks.unshift(this.currentTrack);
        }
        this.currentTrack = null;
        if (this.tracks.length > 0) {
            this.playNext();
        } else {
            this._sendEmbed('⏹ Kuyruk bitti. İyi dinlemeler!', null, true);
            // 3 dakika sonra kanaldan ayrıl
            this._leaveTimeout = setTimeout(() => this.destroy(), 3 * 60 * 1000);
        }
    }

    // ──────────────── Bağlantı kurma ──────────────────

    async connect() {
        const { joinVoiceChannel } = require('@discordjs/voice');
        this.connection = joinVoiceChannel({
            channelId: this.voiceChannel.id,
            guildId: this.guild.id,
            adapterCreator: this.guild.voiceAdapterCreator,
            selfDeaf: true,
        });

        try {
            await entersState(this.connection, VoiceConnectionStatus.Ready, 15_000);
        } catch {
            this.connection.destroy();
            throw new Error('Ses kanalına bağlanılamadı.');
        }

        this.connection.subscribe(this.player);

        this.connection.on(VoiceConnectionStatus.Disconnected, async () => {
            try {
                await Promise.race([
                    entersState(this.connection, VoiceConnectionStatus.Signalling, 5_000),
                    entersState(this.connection, VoiceConnectionStatus.Connecting, 5_000),
                ]);
            } catch {
                this.destroy();
            }
        });
    }

    // ──────────────── Çalma işlemleri ──────────────────

    async playNext() {
        if (this._leaveTimeout) clearTimeout(this._leaveTimeout);

        if (this.tracks.length === 0) return;

        this.currentTrack = this.tracks.shift();

        try {
            const stream = ytdl(this.currentTrack.url, {
                filter: 'audioonly',
                quality: 'lowestaudio', // düşük kaynak kullanımı
                highWaterMark: 1 << 22, // ~4MB buffer
                dlChunkSize: 0,
            });

            const resource = createAudioResource(stream, {
                inputType: StreamType.Arbitrary,
                inlineVolume: true,
            });
            resource.volume.setVolume(this.volume);

            this.player.play(resource);
            this._sendNowPlaying();
        } catch (err) {
            console.error(`[playNext Error] ${err.message}`);
            this._sendEmbed(`❌ Şarkı yüklenemedi: \`${this.currentTrack.title}\``, null, true);
            this._onIdle();
        }
    }

    async addTrack(track) {
        this.tracks.push(track);
        if (this.player.state.status === AudioPlayerStatus.Idle && !this.currentTrack) {
            await this.playNext();
        }
    }

    async addTracks(trackList) {
        this.tracks.push(...trackList);
        if (this.player.state.status === AudioPlayerStatus.Idle && !this.currentTrack) {
            await this.playNext();
        }
    }

    skip() {
        this.player.stop(); // onIdle tetiklenir, sonraki çalar
    }

    pause() {
        return this.player.pause();
    }

    resume() {
        return this.player.unpause();
    }

    setVolume(vol) {
        this.volume = vol / 100;
        if (this.player.state.resource?.volume) {
            this.player.state.resource.volume.setVolume(this.volume);
        }
    }

    setLoop(val) {
        this.loop = val;
    }

    clearQueue() {
        this.tracks = [];
    }

    isPlaying() {
        return this.player.state.status === AudioPlayerStatus.Playing;
    }

    isPaused() {
        return this.player.state.status === AudioPlayerStatus.Paused;
    }

    // ──────────────── Embed mesajları ──────────────────

    async _sendNowPlaying() {
        if (!this.textChannel || !this.currentTrack) return;

        // Eski mesajı sil
        if (this.nowPlayingMsg) {
            this.nowPlayingMsg.delete().catch(() => {});
            this.nowPlayingMsg = null;
        }

        const track = this.currentTrack;
        const embed = new EmbedBuilder()
            .setColor(EMBED_COLOR)
            .setAuthor({ name: '▶ Şu an çalıyor' })
            .setTitle(track.title)
            .setURL(track.url)
            .setThumbnail(track.thumbnail)
            .addFields(
                { name: '⏱ Süre',    value: track.duration || 'Bilinmiyor', inline: true },
                { name: '👤 İsteyen', value: track.requestedBy || 'Bilinmiyor', inline: true },
                { name: '🔊 Ses',    value: `${Math.round(this.volume * 100)}%`, inline: true },
                { name: '🔁 Döngü',  value: this.loop ? 'Açık' : 'Kapalı', inline: true },
                { name: '📋 Kuyrukta', value: `${this.tracks.length} şarkı`, inline: true },
            )
            .setFooter({ text: 'SigmaBotV2 • /help ile komutları gör' });

        try {
            this.nowPlayingMsg = await this.textChannel.send({ embeds: [embed] });
        } catch { /* kanal yazma izni yoksa es geç */ }
    }

    async _sendEmbed(description, title = null, plain = false) {
        if (!this.textChannel) return;
        const embed = new EmbedBuilder()
            .setColor(EMBED_COLOR)
            .setDescription(description);
        if (title) embed.setTitle(title);
        try {
            await this.textChannel.send({ embeds: [embed] });
        } catch { /* */ }
    }

    // ──────────────── Temizlik ──────────────────

    destroy() {
        if (this._leaveTimeout) clearTimeout(this._leaveTimeout);
        this.player.stop(true);
        if (this.connection) {
            try { this.connection.destroy(); } catch { /* */ }
        }
        if (this.nowPlayingMsg) {
            this.nowPlayingMsg.delete().catch(() => {});
            this.nowPlayingMsg = null;
        }
        // Guild map'ten sil (index.js içinde set edilir)
        if (this.guild?.client?.queues) {
            this.guild.client.queues.delete(this.guild.id);
        }
    }
}

module.exports = MusicQueue;
