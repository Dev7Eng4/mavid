export const NICHE_IDS = {
  JAPANESE_AUDIO_DRAMA: 'japanese_audio_drama',
  ELDERLY_HEALTH_JP: 'elderly_health_jp',
  ELDERLY_FINANCE_JP: 'elderly_finance_jp',
  ELDERLY_LIFESTYLE_JP: 'elderly_lifestyle_jp',
  GENERIC_JAPANESE_AUDIO: 'generic_japanese_audio',
};

export const NICHE_KEYWORDS = {
  japanese_audio_drama: [
    '不倫',
    '離婚',
    '嫁姑',
    '復讐',
    'スカッと',
    '浮気',
    '夫',
    '妻',
    '義母',
    '義父',
    '相続',
    '慰謝料',
    '裏切り',
    '修羅場',
    '絶縁',
    '職場いじめ',
  ],

  elderly_health_jp: [
    '高齢者',
    '健康',
    '血圧',
    '糖尿病',
    '認知症',
    '脳梗塞',
    '心筋梗塞',
    '食事',
    '運動',
    '睡眠',
    '長生き',
    '病気',
    '予防',
    '医師',
    '薬',
    '朝の習慣',
  ],

  elderly_finance_jp: [
    '年金',
    '老後資金',
    '貯金',
    '生活費',
    '節約',
    '老後破産',
    '介護費用',
    '相続税',
    '退職金',
    '定年',
    '家計',
    '詐欺',
    '保険',
    '税金',
    '預金',
  ],

  elderly_lifestyle_jp: [
    '老後',
    '一人暮らし',
    '孤独',
    '生きがい',
    '暮らし',
    '片付け',
    '夫婦',
    '散歩',
    '趣味',
    '定年後',
    'シニアライフ',
    '終活',
  ],
};

function selectNicheConfig({ userNiche, detectedNiche }) {
  const niche = userNiche || detectedNiche;

  switch (niche) {
    case 'drama':
    case 'japanese_audio_drama':
    case 'スカッと':
    case '不倫':
    case '離婚':
      return japaneseAudioDramaConfig;

    case 'elderly_health':
    case 'health_jp':
    case '健康':
    case '高齢者健康':
      return elderlyHealthJpConfig;

    case 'elderly_finance':
    case 'finance_jp':
    case '年金':
    case '老後資金':
      return elderlyFinanceJpConfig;

    case 'elderly_lifestyle':
    case '老後暮らし':
    case '一人暮らし':
      return elderlyLifestyleJpConfig;

    default:
      return japaneseAudioDramaConfig;
  }
}

function resolveNicheConfig({ userNicheHint, aiDetectedNiche, aiConfidence, defaultNiche = 'generic_japanese_audio' }) {
  if (userNicheHint) {
    return {
      selectedNiche: userNicheHint,
      source: 'user_hint',
      shouldWarnIfConflict: aiDetectedNiche && aiDetectedNiche !== userNicheHint,
    };
  }

  if (aiDetectedNiche && aiConfidence >= 0.7) {
    return {
      selectedNiche: aiDetectedNiche,
      source: 'ai_detection',
      shouldWarnIfConflict: false,
    };
  }

  return {
    selectedNiche: defaultNiche,
    source: 'default',
    shouldWarnIfConflict: false,
  };
}
