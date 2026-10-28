/**
 * Comprehensive catalog of all 99 languages natively recognized by OpenAI Whisper
 * + Auto-detection (auto).
 */

export const POPULAR_STT_LANGUAGES = [
  { code: 'auto', name: 'Avto aniqlash', flag: '🌐' },
  { code: 'uz', name: "O'zbekcha", flag: '🇺🇿' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'kk', name: 'Қазақша', flag: '🇰🇿' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
];

export const OTHER_STT_LANGUAGES = [
  { code: 'af', name: 'Afrikaans', flag: '🇿🇦' },
  { code: 'sq', name: 'Shqip', flag: '🇦🇱' },
  { code: 'am', name: 'አማርኛ', flag: '🇪🇹' },
  { code: 'hy', name: 'Հայերեն', flag: '🇦🇲' },
  { code: 'as', name: 'অসমীয়া', flag: '🇮🇳' },
  { code: 'az', name: 'Azərbaycanca', flag: '🇦🇿' },
  { code: 'ba', name: 'Башҡортса', flag: '🇷🇺' },
  { code: 'eu', name: 'Euskara', flag: '🇪🇸' },
  { code: 'be', name: 'Беларуская', flag: '🇧🇾' },
  { code: 'bn', name: 'বাংলা', flag: '🇧🇩' },
  { code: 'bs', name: 'Bosanski', flag: '🇧🇦' },
  { code: 'br', name: 'Brezhoneg', flag: '🇫🇷' },
  { code: 'bg', name: 'Български', flag: '🇧🇬' },
  { code: 'my', name: 'ဗမာစာ', flag: '🇲🇲' },
  { code: 'ca', name: 'Català', flag: '🇪🇸' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'hr', name: 'Hrvatski', flag: '🇭🇷' },
  { code: 'cs', name: 'Čeština', flag: '🇨🇿' },
  { code: 'da', name: 'Dansk', flag: '🇩🇰' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
  { code: 'et', name: 'Eesti', flag: '🇪🇪' },
  { code: 'fo', name: 'Føroyskt', flag: '🇫🇴' },
  { code: 'fi', name: 'Suomi', flag: '🇫🇮' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'gl', name: 'Galego', flag: '🇪🇸' },
  { code: 'ka', name: 'ქართული', flag: '🇬🇪' },
  { code: 'el', name: 'Ελληνικά', flag: '🇬🇷' },
  { code: 'gu', name: 'ગુજરાતી', flag: '🇮🇳' },
  { code: 'ht', name: 'Kreyòl ayisyen', flag: '🇭🇹' },
  { code: 'ha', name: 'Hausa', flag: '🇳🇬' },
  { code: 'haw', name: 'Hawaiʻi', flag: '🇺🇸' },
  { code: 'he', name: 'עברית', flag: '🇮🇱' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
  { code: 'hu', name: 'Magyar', flag: '🇭🇺' },
  { code: 'is', name: 'Íslenska', flag: '🇮🇸' },
  { code: 'id', name: 'Bahasa Indonesia', flag: '🇮🇩' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'jv', name: 'Basa Jawa', flag: '🇮🇩' },
  { code: 'kn', name: 'ಕನ್ನಡ', flag: '🇮🇳' },
  { code: 'km', name: 'ភាសាខ្មែរ', flag: '🇰🇭' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'lo', name: 'ລາວ', flag: '🇱🇦' },
  { code: 'la', name: 'Latina', flag: '🇻🇦' },
  { code: 'lv', name: 'Latviešu', flag: '🇱🇻' },
  { code: 'ln', name: 'Lingála', flag: '🇨🇩' },
  { code: 'lt', name: 'Lietuvių', flag: '🇱🇹' },
  { code: 'lb', name: 'Lëtzebuergesch', flag: '🇱🇺' },
  { code: 'mk', name: 'Македонски', flag: '🇲🇰' },
  { code: 'mg', name: 'Malagasy', flag: '🇲🇬' },
  { code: 'ms', name: 'Bahasa Melayu', flag: '🇲🇾' },
  { code: 'ml', name: 'മലയാളം', flag: '🇮🇳' },
  { code: 'mt', name: 'Malti', flag: '🇲🇹' },
  { code: 'mi', name: 'Māori', flag: '🇳🇿' },
  { code: 'mr', name: 'मराठी', flag: '🇮🇳' },
  { code: 'mn', name: 'Монгол', flag: '🇲🇳' },
  { code: 'ne', name: 'नेपाली', flag: '🇳🇵' },
  { code: 'no', name: 'Norsk', flag: '🇳🇴' },
  { code: 'nn', name: 'Nynorsk', flag: '🇳🇴' },
  { code: 'oc', name: 'Occitan', flag: '🇫🇷' },
  { code: 'ps', name: 'پښتو', flag: '🇦🇫' },
  { code: 'fa', name: 'فارسی', flag: '🇮🇷' },
  { code: 'pl', name: 'Polski', flag: '🇵🇱' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'pa', name: 'ਪੰਜਾਬੀ', flag: '🇮🇳' },
  { code: 'ro', name: 'Română', flag: '🇷🇴' },
  { code: 'sa', name: 'संस्कृतम्', flag: '🇮🇳' },
  { code: 'sr', name: 'Српски', flag: '🇷🇸' },
  { code: 'sn', name: 'Shona', flag: '🇿🇼' },
  { code: 'sd', name: 'سنڌي', flag: '🇵🇰' },
  { code: 'si', name: 'සිංහල', flag: '🇱🇰' },
  { code: 'sk', name: 'Slovenčina', flag: '🇸🇰' },
  { code: 'sl', name: 'Slovenščina', flag: '🇸🇮' },
  { code: 'so', name: 'Soomaali', flag: '🇸🇴' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'su', name: 'Basa Sunda', flag: '🇮🇩' },
  { code: 'sw', name: 'Kiswahili', flag: '🇰🇪' },
  { code: 'sv', name: 'Svenska', flag: '🇸🇪' },
  { code: 'tl', name: 'Tagalog', flag: '🇵🇭' },
  { code: 'tg', name: 'Тоҷикӣ', flag: '🇹🇯' },
  { code: 'ta', name: 'தமிழ்', flag: '🇮🇳' },
  { code: 'tt', name: 'Татарча', flag: '🇷🇺' },
  { code: 'te', name: 'తెలుగు', flag: '🇮🇳' },
  { code: 'th', name: 'ไทย', flag: '🇹🇭' },
  { code: 'bo', name: 'བོད་སྐད་', flag: '🇨🇳' },
  { code: 'tk', name: 'Türkmençe', flag: '🇹🇲' },
  { code: 'uk', name: 'Українська', flag: '🇺🇦' },
  { code: 'ur', name: 'اردو', flag: '🇵🇰' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'cy', name: 'Cymraeg', flag: '🇬🇧' },
  { code: 'yi', name: 'ייִדיש', flag: '🇮🇱' },
  { code: 'yo', name: 'Yorùbá', flag: '🇳🇬' },
];

export const STT_LANGUAGES = [
  ...POPULAR_STT_LANGUAGES,
  ...OTHER_STT_LANGUAGES,
];

export const UZBEK_LATIN_PROMPT = "O'zbek tilidagi nutq, lotin alifbosi.";

export const STT_PAGE_SIZE = 8;
export const STT_TOTAL_PAGES = 1 + Math.ceil(OTHER_STT_LANGUAGES.length / STT_PAGE_SIZE);

/**
 * Returns the array of items for a given 1-based page number.
 * Page 1 returns the 8 popular languages.
 * Pages 2..13 partition the remaining languages.
 */
export function getSttPage(pageNumber = 1) {
  const page = Math.max(1, Math.min(pageNumber, STT_TOTAL_PAGES));

  if (page === 1) {
    return {
      page: 1,
      totalPages: STT_TOTAL_PAGES,
      items: POPULAR_STT_LANGUAGES,
    };
  }

  const offset = (page - 2) * STT_PAGE_SIZE;
  const items = OTHER_STT_LANGUAGES.slice(offset, offset + STT_PAGE_SIZE);

  return {
    page,
    totalPages: STT_TOTAL_PAGES,
    items,
  };
}
