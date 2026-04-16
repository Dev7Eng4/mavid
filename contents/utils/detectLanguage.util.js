// const LANGUAGES = {
//   ja: 'Japanese',
//   ko: 'Korean',
//   en: 'English',
//   es: 'Spanish',
//   pt: 'Portuguese',
//   vi: 'Vietnamese',
// };

// export function getLanguageOptions() {
//   return Object.keys(LANGUAGES);
// }

// // Từ thường gặp đặc trưng của từng ngôn ngữ
// const SPANISH_MARKERS = new Set([
//   'el',
//   'la',
//   'los',
//   'las',
//   'un',
//   'una',
//   'unos',
//   'unas',
//   'que',
//   'de',
//   'en',
//   'y',
//   'es',
//   'por',
//   'con',
//   'para',
//   'no',
//   'su',
//   'al',
//   'del',
//   'le',
//   'se',
//   'lo',
//   'más',
// ]);

// const PORTUGUESE_MARKERS = new Set([
//   'o',
//   'a',
//   'os',
//   'as',
//   'um',
//   'uma',
//   'uns',
//   'umas',
//   'que',
//   'de',
//   'em',
//   'e',
//   'é',
//   'por',
//   'com',
//   'para',
//   'não',
//   'seu',
//   'ao',
//   'do',
//   'da',
//   'dos',
//   'das',
//   'se',
//   'ele',
//   'ela',
//   'eles',
//   'elas',
//   'também',
//   'mais',
// ]);

// // Đếm số từ đặc trưng xuất hiện trong danh sách từ
// function scoreLanguage(words, markers) {
//   return words.filter(w => markers.has(w)).length;
// }

// export function detectVideoLang(title) {
//   if (!title || typeof title !== 'string') return 'ja';

//   const t = title.trim();

//   // --- CJK ---
//   const hasKorean = /[\uAC00-\uD7AF\u3130-\u318F\u1100-\u11FF]/.test(t);
//   const hasHiragana = /[\u3040-\u309F]/.test(t);
//   const hasKatakana = /[\u30A0-\u30FF]/.test(t);
//   const hasJapanese = hasHiragana || hasKatakana;

//   if (hasKorean && !hasJapanese) return 'ko';
//   if (hasJapanese) return 'ja';

//   // --- Latin-script languages ---
//   // Loại bỏ số, khoảng trắng, ký tự đặc biệt để chỉ đếm chữ cái
//   const words = t.toLowerCase().match(/[a-záàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđ]+/g) || [];
//   if (words.length === 0) return 'en';

//   // Ký tự đặc trưng tiếng Việt (có dấu thanh điệu và chữ đặc biệt)
//   const vietnameseChars = /[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđ]/i;
//   // Ký tự đặc trưng tiếng Tây Ban Nha
//   const spanishChars = /[áéíóúüñ¡¿]/i;
//   // Ký tự đặc trưng tiếng Bồ Đào Nha
//   const portugueseChars = /[ãõâêôáéíóúàü]/i;

//   const hasVietnamese = vietnameseChars.test(t);
//   const hasSpanish = spanishChars.test(t);
//   const hasPortuguese = portugueseChars.test(t);

//   // Tiếng Việt có bộ dấu rất riêng biệt → ưu tiên detect trước
//   if (hasVietnamese) return 'vi';

//   // Phân biệt Spanish vs Portuguese bằng từ đặc trưng
//   if (hasSpanish || hasPortuguese) {
//     const spanishScore = scoreLanguage(words, SPANISH_MARKERS);
//     const portugueseScore = scoreLanguage(words, PORTUGUESE_MARKERS);
//     return spanishScore >= portugueseScore ? 'es' : 'pt';
//   }

//   return 'en';
// }

const LANGUAGES = {
  ja: 'Japanese',
  ko: 'Korean',
  en: 'English',
  es: 'Spanish',
  pt: 'Portuguese',
  vi: 'Vietnamese',
};

export function getLanguageOptions() {
  return Object.keys(LANGUAGES);
}

const SPANISH_MARKERS = new Set([
  'el',
  'la',
  'los',
  'las',
  'un',
  'una',
  'unos',
  'unas',
  'que',
  'de',
  'en',
  'y',
  'es',
  'por',
  'con',
  'para',
  'no',
  'su',
  'al',
  'del',
  'le',
  'se',
  'lo',
  'más',
]);

const PORTUGUESE_MARKERS = new Set([
  'o',
  'a',
  'os',
  'as',
  'um',
  'uma',
  'uns',
  'umas',
  'que',
  'de',
  'em',
  'e',
  'é',
  'por',
  'com',
  'para',
  'não',
  'seu',
  'ao',
  'do',
  'da',
  'dos',
  'das',
  'se',
  'ele',
  'ela',
  'eles',
  'elas',
  'também',
  'mais',
]);

function scoreLanguage(words, markers) {
  return words.filter(w => markers.has(w)).length;
}

export function detectVideoLang(title) {
  // Thay đổi: Trả về 'en' thay vì 'ja' cho các case không xác định, vì 'en' hợp lý làm fallback toàn cầu hơn.
  if (!title || typeof title !== 'string') return 'en';

  const t = title.trim();

  // --- 1. CJK (Korean & Japanese) ---
  const hasKorean = /[\uAC00-\uD7AF\u3130-\u318F\u1100-\u11FF]/.test(t);
  const hasHiragana = /[\u3040-\u309F]/.test(t);
  const hasKatakana = /[\u30A0-\u30FF]/.test(t);
  const hasKanji = /[\u4E00-\u9FFF]/.test(t); // Bổ sung Kanji

  if (hasKorean) return 'ko';
  // Do hệ thống không có tiếng Trung (zh), nên cứ có Kanji/Hira/Kata thì là tiếng Nhật
  if (hasHiragana || hasKatakana || hasKanji) return 'ja';

  // --- 2. Latin-script Tokenization ---
  // Dùng \p{L} (Unicode property) để bắt toàn bộ "chữ cái" trên đời, bất kể dấu gì.
  const words = t.toLowerCase().match(/\p{L}+/gu) || [];
  if (words.length === 0) return 'en';

  // --- 3. Vietnamese (Exclusive Characters Only) ---
  // BỎ: á, à, é, è, í, ì, ó, ò, ú, ù, ý, ỳ (vì trùng ES/PT)
  // GIỮ: Các chữ có mũ (ăâđêôơư), hoặc có dấu hỏi/ngã/nặng đặc trưng.
  const vietnameseExclusiveChars = /[ăâđêôơưảãạẻẽẹỉĩịỏõọủũụỷỹỵắằẳẵặấầẩẫậếềểễệốồổỗộớờởỡợứừửữự]/i;
  if (vietnameseExclusiveChars.test(t)) return 'vi';

  // --- 4. Spanish vs Portuguese ---
  // Nhận diện nhanh qua ký tự độc quyền
  const spanishExclusive = /[ñ¡¿]/i;
  const portugueseExclusive = /[ãõçâêô]/i;

  if (spanishExclusive.test(t)) return 'es';
  if (portugueseExclusive.test(t)) return 'pt';

  // Nếu không có ký tự độc quyền, check ký tự chung và marker words
  const sharedIberianChars = /[áéíóúü]/i;
  const hasIberian = sharedIberianChars.test(t);

  const spanishScore = scoreLanguage(words, SPANISH_MARKERS);
  const portugueseScore = scoreLanguage(words, PORTUGUESE_MARKERS);

  // Nếu có dấu diacritic chung, hoặc có điểm marker > 0
  if (hasIberian || spanishScore > 0 || portugueseScore > 0) {
    return spanishScore >= portugueseScore ? 'es' : 'pt';
  }

  // --- 5. Fallback ---
  // Nếu có chữ Việt Nam nhưng không có dấu (viết không dấu), hoặc tiếng Anh
  return 'en';
}
