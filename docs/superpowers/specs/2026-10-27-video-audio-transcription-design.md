# Design Doc: Video & Audio Transcription Telegram Serverless Bot

**Date:** 2026-10-27  
**Project:** ConvexaUzBot  
**Feature:** Video/Audio to Text Transcription (Whisper Large V3 Turbo)

---

## 1. Intent and Why
Telegram foydalanuvchilari uchun video, audio va ovozli xabarlarni tez va aniq matnga (Speech-to-Text) aylantirib beruvchi Telegram Serverless bot yaratish. Bot server xarajatlarisiz, Telegram infratuzilmasida ishlaydi va foydalanuvchilar bilan 3 ta tilda (uz, ru, en) muloqot qiladi.

---

## 2. Goals, Non-Goals, Anti-Goals

### Goals:
- Telegram Serverless (`tgcloud`) standartlari asosida ishlovchi modular arxitektura.
- Groq API (`whisper-large-v3-turbo`) orqali video (`.mp4`, `.webm`) va audio (`.mp3`, `.m4a`, `.ogg`, `.wav`) fayllarni transkripsiya qilish.
- Telegram xabar chegarasi (4096 belgi) oshganda:
  - Chatga xabarlarni gaplarni buzmasdan bo'laklab, boshida `[1/N]`, `[2/N]` tartibida yuborish.
  - Bir vaqtning o'zida barcha segmentlar va taymkodlar aks etgan `.txt` faylni to'liq holatda ilova qilish.
- Buyruqlar menyusi: `/start`, `/language`, `/help`.
- Reply klaviatura: Tilni tanlash va Transkripsiya bo'limi.
- Ko'p tillilik: O'zbek (`uz`), Rus (`ru`), Ingliz (`en`) tillari alohida modullarda saqlanadi, barcha matnlar, tugmalar va barcha XATOLIK xabarlari (error messages) qat'iy konstantalar orqali olinadi.
- SQLite ma'lumotlar bazasi (`tgcloud/schema.js`) orqali foydalanuvchilar va ularning tanlagan tili saqlanadi.
- **Bir vaqtda bitta fayl cheklovi (Single-task Concurrency):** Foydalanuvchi faqat bitta fayli qayta ishlanib bo'lgach keyingi faylni yuborishi mumkin. Qayta ishlanayotgan paytda yangi fayl kelsa, lokalizatsiya qilingan ogohlantirish qaytariladi. Bu qoida barcha kelgusi funksiyalarga ham amal qiladi.

### Non-Goals:
- Hozirgi bosqichda fayllarni boshqa formatga konvertatsiya qilish (masalan, videoni mp3 ga aylantirish).
- 19.5 MB dan katta bo'lgan fayllarni qayta ishlash (Telegram xavfsiz chegarasi).
- Murakkab to'lov yoki obuna tizimi (bu keyingi bosqichlarda qo'shiladi).

### Anti-Goals:
- Kod ichida matnlarni to'g'ridan-to'g'ri (hardcoded) yozish.
- Serverless V8 sandbox'da ishlamaydigan mahalliy npm paketlar yoki mahalliy dasturlarga (`ffmpeg`, `fs`) bog'lanib qolish.

---

## 3. Constraints
- **Telegram Serverless Runtime:** Faqat V8 isolate, tashqi npm paketlar yo'q, mahalliy `fs` yo'q. Faqat `sdk` (`api`, `db`, `fetch`) mavjud.
- **Tashqi so'rovlar:** Groq API ga so'rovlar standart `fetch` va `FormData` orqali yuboriladi.
- **Fayl hajmi xavfsiz limiti:** Maksimal 19.5 MB (Telegram 20 MB chekloviga xavfsiz zaxira bilan).
- **Telegram Xabar limiti:** `sendMessage` matni 4096 belgidan oshmasligi kerak.
- **Groq API Limit:** Bitta fayl hajmi maksimal 25 MB.

---

## 4. Approaches Considered

### 1-yondashuv: Faqat xabar orqali bo'laklab yuborish
- Matn uzun bo'lsa, faqat `[1/N]`, `[2/N]` xabarlar ketma-ket yuboriladi.
- *Rad etilish sababi:* Chat juda to'lib ketadi va foydalanuvchiga butun matnni fayl ko'rinishida saqlash noqulay.

### 2-yondashuv: Faqat fayl (.txt) ko'rinishida yuborish
- Chatga faqat .txt fayl tashlanadi.
- *Rad etilish sababi:* Foydalanuvchi qisqa audiolarda ham ortiqcha fayl yuklab olishiga to'g'ri keladi.

### 3-yondashuv: Tanlangan yondashuv (Gibrid + Taymkodli .txt fayl)
- Qisqa matnlar (≤ 4000 belgi) to'g'ridan-to'g'ri bitta xabarda yuboriladi.
- Uzun matnlar (> 4000 belgi):
  1. Chatda `[1/N]`, `[2/N]` qilib tartiblangan toza matn yuboriladi.
  2. Barcha segmentlar va vaqt belgilari (`[00:00 - 00:04] ...`) joylangan `.txt` fayl foydalanuvchiga taqdim etiladi.
- *Natija:* Foydalanuvchi chatda tez o'qiy oladi, xohlasa to'liq taymkodli original matnni bitta faylda yuklab oladi.

---

## 5. Architecture & File Structure

```bash
tgcloud/
├── handlers/
│   ├── message.js           # Matnli xabarlar, audio, video va buyruqlarni qabul qilish
│   └── callback_query.js    # Agar inline tugmalar kerak bo'lsa
├── lib/
│   ├── constants/
│   │   ├── commands.js      # /start, /language, /help
│   │   └── keys.js          # i18n tarjima kalitlari
│   ├── i18n/
│   │   ├── index.js         # i18n helper funksiyasi (t(`KEY`, lang))
│   │   ├── uz.js            # O'zbekcha matnlar
│   │   ├── ru.js            # Ruscha matnlar
│   │   └── en.js            # Inglizcha matnlar
│   ├── services/
│   │   ├── groq.js          # Groq Whisper API muloqoti (fetch + FormData)
│   │   └── telegram.js      # Fayl yuklab olish URL va xabarlarni yuborish yordamchilari
│   └── utils/
│       ├── chunker.js       # Matnni 4000 belgilik [i/N] bo'laklarga ajratish
│       └── formatter.js     # Segmentlarni taymkodli .txt faylga aylantirish
└── schema.js                # SQLite bazasi (users: chatId, language, createdAt)
```

---

## 6. User Experience & Flows

1. **/start buyrug'i:**
   - Yangi foydalanuvchi bo'lsa, bazaga yoziladi va til tanlash taklif etiladi (🇺🇿 O'zbekcha, 🇷🇺 Русский, 🇬🇧 English).
   - Reply klaviatura faollashadi: `[🌐 Tilni o'zgartirish]` va `[🎙 Transkripsiya qo'llanmasi]`.
   - Bot komandalar menyusi ro'yxatdan o'tkaziladi (`/start`, `/language`, `/help`).

2. **/language buyrug'i yoki klaviatura orqali:**
   - Foydalanuvchi tilni yangilaydi, tanlov `schema.js` bazasida saqlanadi.

3. **/help buyrug'i:**
   - Botdan qanday foydalanish, qanday formatlar qabul qilinishi va 19.5 MB lik cheklov haqida tanlangan tilda ma'lumot beriladi.

4. **Media yuborilganda (Video, Audio, Voice):**
   - Hajm tekshiriladi (agar 19.5 MB dan oshsa, ogohlantirish beriladi).
   - Foydalanuvchiga "⏳ Qayta ishlanmoqda..." xabari yuboriladi.
   - `getFile` orqali fayl yuklab olinadi va Groq API `whisper-large-v3-turbo` modeliga yuboriladi (`response_format: "verbose_json"`).
   - Natija:
     - Agar matn qisqa bo'lsa: bitta xabar bilan yuboriladi.
     - Agar matn uzun bo'lsa: `[1/N]`, `[2/N]` xabarlar ketma-ket yuboriladi va taymkodli `.txt` fayl jo'natiladi.

---

## 7. What's Left to the Builder
- Telegram Serverless loyihasini initsializatsiya qilish (`tgcloud` tuzilmasi).
- Groq API kalitini boshqarish (konfiguratsiya yoki muhit o'zgaruvchisi).
- Drizzle-like DSL bilan `schema.js` jadvallarini yozish va `migrate` qilish.
- Modullarni qat'iy ravishda `AGENTS.md` qoidalariga rioya qilib, DRY va SoC asosida yaratish.
