'use strict';

require('dotenv').config();

const { Client, GatewayIntentBits, Collection, Events, ActivityType } = require('discord.js');

// ── Komutları yükle ──────────────────────────────────────
const playCmd  = require('./commands/play');
const musicCmds = require('./commands/music');

const commands = new Collection();
commands.set('play', playCmd);
for (const [name, cmd] of Object.entries(musicCmds)) {
    commands.set(name, cmd);
}

// ── Client ───────────────────────────────────────────────
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
    ],
    // Hafıza tasarrufu: gereksiz cache'leri kapat
    makeCache: () => new Collection(),
    rest: { timeout: 15000 },
});

// Guild başına bir kuyruk tut
client.queues = new Collection();

// ── Hazır ────────────────────────────────────────────────
client.once(Events.ClientReady, () => {
    console.log(`✅ ${client.user.tag} olarak giriş yapıldı.`);
    client.user.setActivity('🎵 /play', { type: ActivityType.Listening });
});

// ── Slash komut işleyici ─────────────────────────────────
client.on(Events.InteractionCreate, async interaction => {
    if (!interaction.isChatInputCommand()) return;

    const command = commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction);
    } catch (err) {
        console.error(`[Command Error] /${interaction.commandName}:`, err.message);
        const msg = { content: `❌ Bir hata oluştu: \`${err.message}\``, ephemeral: true };
        try {
            if (interaction.deferred) await interaction.editReply(msg);
            else if (!interaction.replied) await interaction.reply(msg);
        } catch { /* */ }
    }
});

// ── Hata yakalama (bot çökmesini önle) ──────────────────
process.on('unhandledRejection', err => {
    console.error('[Unhandled Rejection]', err?.message || err);
});
process.on('uncaughtException', err => {
    console.error('[Uncaught Exception]', err?.message || err);
});

// ── Başlat ───────────────────────────────────────────────
const token = process.env.DISCORD_TOKEN;
if (!token || token === 'YOUR_BOT_TOKEN_HERE') {
    console.error('❌ .env dosyasına DISCORD_TOKEN eklemeyi unutma!');
    process.exit(1);
}

client.login(token);
