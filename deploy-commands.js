'use strict';

require('dotenv').config();

const { REST, Routes } = require('discord.js');

const playCmd   = require('./commands/play');
const musicCmds = require('./commands/music');

const allCommands = [
    playCmd,
    ...Object.values(musicCmds),
].map(c => c.data.toJSON());

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
    const clientId = process.env.CLIENT_ID;
    const guildId  = process.env.GUILD_ID;

    if (!clientId) {
        console.error('❌ .env dosyasına CLIENT_ID ekle!');
        process.exit(1);
    }

    console.log(`🔄 ${allCommands.length} komut kaydediliyor...`);

    const route = guildId
        ? Routes.applicationGuildCommands(clientId, guildId)
        : Routes.applicationCommands(clientId);

    const data = await rest.put(route, { body: allCommands });

    console.log(`✅ ${data.length} komut başarıyla kaydedildi!`);
    if (!guildId) console.log('⚠️  Global komutlar Discord\'a yayılması ~1 saat sürebilir.');
})().catch(err => {
    console.error('❌ Komut kayıt hatası:', err);
    process.exit(1);
});
