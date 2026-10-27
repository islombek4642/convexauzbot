# ConvexaUzBot - Project Guidelines & Rules

## 1. Loyiha Arxitekturasi (Telegram Serverless)
- Ushbu bot **Telegram Serverless** (`tgcloud`) infratuzilmasida ishlaydi.
- Tuzilma qat'iy ravishda Telegram Serverless standartlariga bo'ysunadi:
  - `tgcloud/handlers/` — har bir Telegram update turi uchun bitta fayl (masalan: `message.js`, `callback_query.js`).
  - `tgcloud/lib/` — umumiy modullar, yordamchi funksiyalar, servislar, lokalizatsiya va konstantalar. Subdirektoriyalarga ruxsat berilgan.
  - `tgcloud/schema.js` — ma'lumotlar bazasi sxemasi (`sdk/db`).
  - `tgcloud/endpoints/` — Mini App API chaqiruvlari (agar kerak bo'lsa).
- Muhit cheklovlari:
  - Runtime V8 sandbox bo'lib, tashqi npm paketlar va mahalliy fayl tizimi (`fs`, `child_process`, `ffmpeg`) mavjud emas.
  - Tashqi servislar bilan aloqa faqat `sdk` ning `fetch` API orqali amalga oshiriladi.

## 2. Dasturlash Prinsiplari
- **Modular Architecture & Separation of Concerns (SoC):** Har bir modul faqat bitta aniq vazifaga javob beradi (biznes logika, xabarlashuv, xalqaro tillar, API integratsiyasi ajratilgan bo'lishi shart).
- **DRY (Don't Repeat Yourself):** Takrorlanuvchi kodlar `tgcloud/lib/` ichidagi umumiy yordamchi funksiyalarga chiqariladi.
- **Bosqichma-bosqich ishlab chiqish:** Yangi funksiyalar birdaniga emas, bittalab ishlab chiqiladi va to'liq sinovdan o'tkazilgach keyingi funksiyaga o'tiladi.

## 3. Ko'p tillilik (Localization - i18n)
- Bot 3 ta tilda ishlaydi:
  - O'zbekcha (`uz`)
  - Ruscha (`ru`)
  - Inglizcha (`en`)
- Har bir til alohida faylda saqlanadi (`tgcloud/lib/i18n/uz.js`, `tgcloud/lib/i18n/ru.js`, `tgcloud/lib/i18n/en.js`).
- **Hardcoding qat'iyan taqiqlanadi!** Matnlar, tugma nomlari, komandalar, xabarlar va barcha **xatolik xabarlari (error messages)** faqat konstantalar orqali olinadi (`tgcloud/lib/constants/`).

## 4. Foydalanuvchi ma'lumotlari va sozlamalari
- Har bir foydalanuvchining tanlagan tili va holati (state) `schema.js` dagi SQLite bazasida saqlanadi.

## 5. Bir vaqtda bitta fayl qoidasi (Single-task Concurrency)
- Har bir foydalanuvchi bir vaqtning o'zida faqat bitta faylni qayta ishlashi mumkin.
- Agar foydalanuvchining fayli hali qayta ishlanayotgan bo'lsa (holati `processing`) va u yana yangi fayl yuborsa, bot yangi faylni qabul qilmaydi va foydalanuvchining tilida aniq ogohlantirish xabari beradi (masalan: *"Oldingi faylingiz hali qayta ishlanmoqda, iltimos kuting"*).
- Ushbu qoida hozirgi transkripsiya va keyinchalik qo'shiladigan barcha yangi funksiyalar (video to audio, format konvertatsiya va h.k.) uchun qat'iy majburiydir.
