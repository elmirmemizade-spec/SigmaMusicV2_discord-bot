# 🎵 SigmaBotV2

Orijinal SigmaMusic botunun **optimize edilmiş, düşük kaynak tüketimli** versiyonu.  
Sadece müzik çalmaya odaklanır — şişirilmiş hiçbir özellik yoktur.

---

## ✨ Özellikler

- **YouTube** araması ve link desteği
- **Şarkı seçim menüsü** — `/play` yazdığında 5 sonuç listelenir, birini seçersin
- Sıra / kuyruk yönetimi
- Ses seviyesi, döngü, duraklat/devam
- Düşük RAM & CPU kullanımı (Sharding yok, gereksiz cache yok)
- Node.js 18+ ile çalışır (orijinal 24+ gerektiriyordu)

---

## 🚀 Kurulum

### 1. Gereksinimler
- Node.js 18 veya üstü
- `ffmpeg` (ffmpeg-static npm paketi otomatik yükler)

### 2. Kurulum adımları

```bash
# Bağımlılıkları yükle
npm install

# .env dosyasını oluştur
cp .env.example .env
```

### 3. `.env` dosyasını düzenle

```
DISCORD_TOKEN=bot_tokenini_buraya_yaz
CLIENT_ID=bot_client_id_buraya
GUILD_ID=sunucu_id_buraya  # hızlı test için, sonra silebilirsin
```

### 4. Discord Developer Portal'dan bot oluşturma
1. https://discord.com/developers/applications adresine git
2. New Application → isim ver → Bot sekmesi → Token kopyala
3. OAuth2 → URL Generator → `bot` + `applications.commands` seç
4. Bot Permissions: `Connect`, `Speak`, `Send Messages`, `Embed Links`
5. Oluşan linki tarayıcıda aç ve botu sunucuna ekle

### 5. Komutları kaydet

```bash
node deploy-commands.js
```

### 6. Botu başlat

```bash
npm start
# veya
node index.js
```

---

## 📋 Komutlar

| Komut | Açıklama |
|-------|----------|
| `/play <sorgu>` | YouTube'dan şarkı ara, seçim menüsünden seç |
| `/skip` | Sonraki şarkıya geç |
| `/stop` | Durdur ve kanaldan ayrıl |
| `/pause` | Duraklat |
| `/resume` | Devam et |
| `/loop` | Döngü aç/kapat |
| `/volume <1-100>` | Ses seviyesi ayarla |
| `/queue` | Kuyruğu göster |
| `/clear` | Kuyruğu temizle |
| `/nowplaying` | Şu an çalanı göster |
| `/help` | Komut listesi |

---

## ⚡ Düşük Sistem İpuçları

- `DEFAULT_VOLUME=60` olarak ayarla (daha az CPU)
- VPS'inde en az **256MB RAM** olsun
- Node.js versiyonunu `18.x LTS` kullan (en stabil)
- PM2 ile çalıştır: `npm i -g pm2 && pm2 start index.js --name sigma`

---

## 📁 Dosya Yapısı

```
SigmaBotV2/
├── index.js              # Ana giriş noktası
├── deploy-commands.js    # Slash komutları Discord'a kaydet
├── package.json
├── .env.example
├── commands/
│   ├── play.js           # /play + şarkı seçim menüsü
│   └── music.js          # diğer tüm komutlar
└── src/
    ├── MusicQueue.js     # Ses bağlantısı ve kuyruk mantığı
    └── YouTube.js        # YouTube arama yardımcısı
```

---

*SigmaBotV2 — orijinal SigmaMusic'ten ilham alınarak sıfırdan optimize edilmiştir.*
