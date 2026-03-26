'use strict';

const ytSearch = require('yt-search');
const ytdl = require('ytdl-core');

/**
 * Verilen sorgu için YouTube'da arama yapar.
 * @param {string} query - Şarkı adı veya YouTube URL'si
 * @returns {Promise<{title,url,duration,thumbnail,requestedBy}>}
 */
async function search(query, requestedBy = '') {
    // Doğrudan YouTube linki ise bilgilerini çek
    if (ytdl.validateURL(query)) {
        try {
            const info = await ytdl.getBasicInfo(query);
            const vid = info.videoDetails;
            return [{
                title:       vid.title,
                url:         vid.video_url,
                duration:    formatDuration(vid.lengthSeconds),
                thumbnail:   vid.thumbnails?.pop()?.url || '',
                requestedBy,
            }];
        } catch {
            throw new Error('Bu YouTube linki okunamadı.');
        }
    }

    // Metin araması
    const result = await ytSearch(query);
    const videos = result.videos.slice(0, 5); // ilk 5 sonucu döndür (seçim için)
    if (!videos.length) throw new Error('Hiç sonuç bulunamadı.');

    return videos.map(v => ({
        title:       v.title,
        url:         v.url,
        duration:    v.timestamp || '?',
        thumbnail:   v.thumbnail || '',
        requestedBy,
    }));
}

function formatDuration(secs) {
    const s = parseInt(secs, 10);
    if (isNaN(s)) return '?';
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
    return `${m}:${String(sec).padStart(2,'0')}`;
}

module.exports = { search };
