export const promptDetectNicheAndSelectConfig = ({
  title = '',
  description = '',
  language = 'ja',
  audioDurationSeconds = 0,
  transcriptSamples = {
    beginning: '',
    middle: '',
    ending: '',
  },
  userNicheHint = '',
  userVisualStyleHint = '',
  availableNicheConfigs = [],
}) => `
You are a senior Japanese YouTube content pipeline strategist.

Your task is to analyze the given Japanese audio/video transcript samples and select the most appropriate pipeline niche config.

This is Step 0 of an automated video generation pipeline.

The final system will create:
- final summary
- YouTube metadata
- chapters
- visual bible
- character/persona design
- hero image prompt
- scene image prompts
- audio-image video

Therefore, your classification must optimize the downstream pipeline.

━━━━━━━━━━━━━━━━━━━━
INPUT
━━━━━━━━━━━━━━━━━━━━

Title:
${title || '(none)'}

Language:
${language}

User niche hint:
${userNicheHint || '(none)'}

User visual style hint:
${userVisualStyleHint || '(none)'}

Available niche configs:
${JSON.stringify(availableNicheConfigs, null, 2)}

Transcript samples:

[BEGINNING SAMPLE]
${transcriptSamples.beginning || '(empty)'}

[MIDDLE SAMPLE]
${transcriptSamples.middle || '(empty)'}

[ENDING SAMPLE]
${transcriptSamples.ending || '(empty)'}

━━━━━━━━━━━━━━━━━━━━
AVAILABLE NICHE DEFINITIONS
━━━━━━━━━━━━━━━━━━━━

You must choose ONE primary niche from the available niche configs.

Common niche meanings:

1. japanese_audio_drama
Use when the transcript is mainly a Japanese story/drama/narrative involving:
- betrayal
- divorce
- family conflict
- workplace conflict
- revenge
- inheritance conflict
- cheating
- emotional confrontation
- dramatic twist
- スカッとする話
- 修羅場
- 不倫
- 離婚
- 嫁姑
- 浮気
- 復讐

2. elderly_health_jp
Use when the transcript mainly teaches Japanese seniors about:
- health habits
- disease prevention
- blood pressure
- diabetes
- dementia prevention
- food
- walking
- sleep
- exercise
- warning signs
- daily habits after 60/70
- 長生き
- 高齢者の健康
- やってはいけない習慣
- 医師 advice style

3. elderly_finance_jp
Use when the transcript mainly discusses money for Japanese seniors:
- pension
- retirement savings
- living costs
- budgeting
- taxes
- insurance
- care costs
- scams
- retirement poverty
- 年金
- 老後資金
- 老後破産
- 貯金
- 節約
- 生活費
- 詐欺

4. elderly_lifestyle_jp
Use when the transcript mainly discusses senior daily life:
- living alone
- loneliness
- retirement lifestyle
- small habits
- peaceful life
- hobbies
- decluttering
- relationships after retirement
- 生きがい
- 一人暮らし
- 老後の暮らし
- 終活

5. generic_japanese_audio
Use only when:
- the transcript does not clearly fit the above niches
- the content is mixed and no single niche dominates
- the transcript sample is too limited to classify reliably

━━━━━━━━━━━━━━━━━━━━
CLASSIFICATION RULES
━━━━━━━━━━━━━━━━━━━━

1. Prioritize the actual transcript content over the title.
2. If user_niche_hint is provided and does not strongly conflict with the transcript, accept it.
3. If user_niche_hint conflicts with transcript, still report the conflict clearly.
4. Choose only ONE primary niche.
5. You may provide secondary niche candidates.
6. Do not over-classify as drama just because the content has emotional language.
7. Do not classify as elderly_health_jp unless the main focus is health education or senior health advice.
8. Do not classify as elderly_finance_jp unless money, pension, retirement funds, or living costs are central.
9. If confidence is below 0.7, choose generic_japanese_audio.
10. The output must be valid JSON only. No markdown. No explanation outside JSON.

━━━━━━━━━━━━━━━━━━━━
OUTPUT JSON FORMAT
━━━━━━━━━━━━━━━━━━━━

Return exactly this JSON structure:

{
  "detected_niche": "japanese_audio_drama | elderly_health_jp | elderly_finance_jp | elderly_lifestyle_jp | generic_japanese_audio",
  "content_mode": "story | educational_health | educational_finance | educational_lifestyle | general_audio",
  "pipeline_config_id": "",
  "confidence": 0.0,
  "is_user_hint_accepted": true,
  "user_hint_conflict": {
    "has_conflict": false,
    "reason": ""
  },
  "reason": "",
  "evidence": {
    "title_signals": [],
    "transcript_signals": [],
    "keyword_signals": [],
    "content_structure_signals": []
  },
  "secondary_niche_candidates": [
    {
      "niche": "",
      "confidence": 0.0,
      "reason": ""
    }
  ],
  "recommended_pipeline_behavior": {
    "chunk_analysis_schema": "",
    "chapter_strategy": "",
    "scene_strategy": "",
    "metadata_strategy": "",
    "visual_strategy": "",
    "character_required": false,
    "persona_required": false,
    "hero_image_required": true,
    "recommended_image_density": "low | normal | high"
  },
  "risk_flags": [],
  "notes_for_next_steps": []
}

━━━━━━━━━━━━━━━━━━━━
IMPORTANT OUTPUT RULES
━━━━━━━━━━━━━━━━━━━━

- Return valid JSON only.
- Do not wrap in markdown.
- Do not include comments.
- Do not include trailing commas.
- All keys must exist.
- If a field is unknown, use an empty string, empty array, or false.
`;
