import { KEYS } from '../constants/keys.js';

export const uz = {
  [KEYS.WELCOME]: 'Assalomu alaykum! Xush kelibsiz.\n\nMen video, audio va ovozli xabarlarni matnga (Speech-to-Text) aylantirib beruvchi botman. Menga fayl yuboring!',
  [KEYS.CHOOSE_LANGUAGE]: 'Iltimos, o\'zingizga qulay tilni tanlang:',
  [KEYS.LANGUAGE_CHANGED]: 'Til muvaffaqiyatli o\'zgartirildi: 🇺🇿 O\'zbekcha',
  [KEYS.HELP_TITLE]: 'ℹ️ Botdan foydalanish bo\'yicha qo\'llanma',
  [KEYS.HELP_TEXT]: '📌 **Qanday ishlatiladi:**\n1. Menga video (MP4, WEBM), audio (MP3, M4A, WAV, OGG) yoki ovozli xabar yuboring.\n2. Men undagi nutqni Whisper AI orqali aniq matnga aylantirib beraman.\n\n⚠️ **Cheklovlar:**\n- Maksimal fayl hajmi: **19.5 MB**\n- Bir vaqtda faqat **1 ta fayl** qayta ishlanadi.\n- Agar matn juda uzun bo\'lsa, u qismlarga bo\'linib jo\'natiladi va to\'liq taymkodli .txt fayl taqdim etiladi.',

  [KEYS.BTN_CHANGE_LANGUAGE]: '🌐 Tilni o\'zgartirish',
  [KEYS.BTN_GUIDE]: '🎙 Transkripsiya qo\'llanmasi',
  [KEYS.BTN_LANG_UZ]: '🇺🇿 O\'zbekcha',
  [KEYS.BTN_LANG_RU]: '🇷🇺 Русский',
  [KEYS.BTN_LANG_EN]: '🇬🇧 English',

  [KEYS.MSG_PROCESSING]: '⏳ Fayl qabul qilindi. Nutq matnga aylantirilmoqda, iltimos kuting...',
  [KEYS.MSG_COMPLETED]: '✅ Transkripsiya muvaffaqiyatli yakunlandi:',
  [KEYS.MSG_ATTACHED_TXT]: '📄 Quyida barcha taymkodlar aks etgan to\'liq transkripsiya fayli ilova qilindi.',
  [KEYS.CHUNK_HEADER]: '[{current}/{total}]',

  [KEYS.ERROR_ALREADY_PROCESSING]: '⚠️ Oldingi faylingiz hali qayta ishlanmoqda. Yangi fayl yuborishdan avval iltimos uning yakunlanishini kuting.',
  [KEYS.ERROR_FILE_TOO_LARGE]: '❌ Fayl hajmi juda katta! Maksimal ruxsat etilgan hajm — 19.5 MB.',
  [KEYS.ERROR_NO_SPEECH_DETECTED]: '⚠️ Yuborilgan audio/videoda hech qanday nutq aniqlanmadi.',
  [KEYS.ERROR_UNSUPPORTED_FORMAT]: '❌ Ushbu format qo\'llab-quvvatlanmaydi. Iltimos, video yoki audio fayl yuboring.',
  [KEYS.ERROR_PROCESSING_FAILED]: '❌ Qayta ishlashda kutilmagan xatolik yuz berdi. Iltimos, birozdan so\'ng qayta urinib ko\'ring.',
  [KEYS.ERROR_FETCH_FILE_FAILED]: '❌ Faylni Telegram serveridan yuklab olishda xatolik yuz berdi.',
};
