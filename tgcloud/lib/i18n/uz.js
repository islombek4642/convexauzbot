import { KEYS } from '../constants/keys.js';

export const uz = {
  [KEYS.WELCOME]: 'Assalomu alaykum! Xush kelibsiz.\n\nConvexaUzBot — media va turli fayllar bilan ishlash uchun qulay yordamchingiz. Kerakli xizmatdan foydalanish uchun quyidagi menyudan foydalaning yoki fayl yuboring!',
  [KEYS.CHOOSE_LANGUAGE]: 'Iltimos, o\'zingizga qulay tilni tanlang:',
  [KEYS.LANGUAGE_CHANGED]: 'Til muvaffaqiyatli o\'zgartirildi: 🇺🇿 O\'zbekcha',
  [KEYS.HELP_TITLE]: 'ℹ️ Botdan foydalanish bo\'yicha qo\'llanma',
  [KEYS.HELP_TEXT]: 'ℹ️ <b>ConvexaUzBot bo\'yicha umumiy yordam:</b>\n\nBu bot media va turli xil fayllarni qayta ishlovchi ko\'p funksiyali yordamchingizdir.\n\n✨ <b>Mavjud xizmatlar:</b>\n1. <b>Ovozdan matnga (Speech-to-Text):</b> Video, audio va ovozli xabarlardagi nutqni aniq matnga aylantirish.\n<i>(Yangi qulay funksiyalar tez orada qo\'shiladi!)</i>\n\n📋 <b>Asosiy buyruqlar:</b>\n/start - Botni qayta ishga tushirish\n/language - Tilni o\'zgartirish\n/help - Umumiy yordam va ma\'lumot\n\n⚠️ <b>Umumiy qoida:</b>\nHar bir foydalanuvchi bir vaqtning o\'zida faqat <b>1 ta faylni</b> qayta ishlashi mumkin.',
  [KEYS.STT_GUIDE_TEXT]: '🎙 <b>Ovozdan matnga (Speech-to-Text) yo\'riqnomasi:</b>\n\n1. Menga video (MP4, WEBM), audio (MP3, M4A, WAV, OGG, FLAC) yoki ovozli xabar yuboring.\n2. Nutq tezkorlik bilan aniq matnga aylantiriladi.\n\n⚠️ <b>Texnik cheklovlar:</b>\n- Maksimal fayl hajmi: <b>19.5 MB</b>\n- Qisqa matnlar to\'g\'ridan-to\'g\'ri xabarda yuboriladi.\n- Uzun matnlar qismlarga bo\'linadi va to\'liq matn <b>.txt</b> fayl shaklida ilova qilinadi.',

  [KEYS.BTN_CHANGE_LANGUAGE]: '🌐 Tilni o\'zgartirish',
  [KEYS.BTN_GUIDE]: '🎙 Ovozdan matnga',
  [KEYS.BTN_LANG_UZ]: '🇺🇿 O\'zbekcha',
  [KEYS.BTN_LANG_RU]: '🇷🇺 Русский',
  [KEYS.BTN_LANG_EN]: '🇬🇧 English',

  [KEYS.MSG_PROCESSING]: '⏳ Fayl qabul qilindi. Nutq matnga aylantirilmoqda, iltimos kuting...',
  [KEYS.MSG_COMPLETED]: '✅ Transkripsiya muvaffaqiyatli yakunlandi:',
  [KEYS.MSG_ATTACHED_TXT]: '📄 Quyida to\'liq transkripsiya fayli ilova qilindi.',
  [KEYS.CHUNK_HEADER]: '[{current}/{total}]',

  [KEYS.ERROR_ALREADY_PROCESSING]: '⚠️ Oldingi faylingiz hali qayta ishlanmoqda. Yangi fayl yuborishdan avval iltimos uning yakunlanishini kuting.',
  [KEYS.ERROR_FILE_TOO_LARGE]: '❌ Fayl hajmi juda katta! Maksimal ruxsat etilgan hajm — 19.5 MB.',
  [KEYS.ERROR_NO_SPEECH_DETECTED]: '⚠️ Yuborilgan audio/videoda hech qanday nutq aniqlanmadi.',
  [KEYS.ERROR_UNSUPPORTED_FORMAT]: '❌ Ushbu format qo\'llab-quvvatlanmaydi. Iltimos, video yoki audio fayl yuboring.',
  [KEYS.ERROR_PROCESSING_FAILED]: '❌ Qayta ishlashda kutilmagan xatolik yuz berdi. Iltimos, birozdan so\'ng qayta urinib ko\'ring.',
  [KEYS.ERROR_FETCH_FILE_FAILED]: '❌ Faylni Telegram serveridan yuklab olishda xatolik yuz berdi.',
};
