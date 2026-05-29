import { PROFILES_LOGIN } from '../constants/playwright-profile.js';
import { createBatchMedia } from '../flow/createMediaWithTool.js';
import { FLOW_DOWNLOADS_DIR } from '../flow/paths.util.js';

export async function main() {
  const imageScenePrompts = [
    {
      scene_id: 'S001',
      source_beat_id: 'VB_001_001',
      source_line_ids: [1, 2, 3, 4, 5, 6, 7],
      start_line_id: 1,
      end_line_id: 7,
      aspect_ratio: '16:9',
      image_type: 'scene_image',
      expected_text_ja: ['繰下げ受給の罠', '知らないと損するデメリット', '要注意！'],
      final_prompt:
        'Create one single 16:9 image for a Japanese senior educational YouTube video in a soft anime-realistic illustration style with a clean TV information-program look. Layout is a structured left text and right character composition. On the right, an ordinary Japanese man around 65 years old with a clean look, wearing glasses and a comfortable cardigan, looks surprised and slightly troubled while looking down at a pension document. Next to him is a large floating yellow question mark icon and a soft red warning badge icon. On the left side, there is a clear, clean background space where large, bold, high-contrast Japanese text is rendered directly inside the image. The text must read exactly: 「繰下げ受給の罠」 as the main headline, 「知らないと損するデメリット」 as the sub-text, and 「要注意！」 inside the warning badge graphic. The overall mood is calm but attention-grabbing and trustworthy, using a warm beige base with yellow highlights. The text must be extremely senior-readable, clean, and optimized for mobile viewing with no extra characters or small labels.',
      negative_prompt:
        'no English text, no Chinese text, no Korean text, no watermark, no logo, no tiny text, no unreadable characters, no messy small labels, no cluttered chart, no distorted hands, no horror, no exaggerated wrinkles, no real government seal, no cluttered background, no specific pension amounts, no scary or extreme expressions',
      quality_checklist: [
        'Matches left_text_right_character layout with correct text alignment.',
        'Renders exact Japanese text strings with high contrast.',
        'Depicts the character with a relatable, non-exaggerated concerned expression.',
        'Contains no English text, financial numbers, or real government seals.',
      ],
    },
    {
      scene_id: 'S002',
      source_beat_id: 'VB_001_002',
      source_line_ids: [8, 9, 10, 11, 12],
      start_line_id: 8,
      end_line_id: 12,
      aspect_ratio: '16:9',
      image_type: 'scene_image',
      expected_text_ja: ['年金増額の落とし穴', '医療費・介護費が高額に！？', '負担増の恐れ'],
      final_prompt:
        'Create one single 16:9 image for a Japanese senior educational YouTube video, featuring a clean infographic composition in a soft anime-realistic infographic style. No human characters are present. The background is a clean, subtle abstract design with soft blue and grey tones. The central focus is a prominent information board styled as a soft red and white warning card. Inside this card layout, simple and clear graphic elements are displayed: a stylized medical clinic building icon, a nursing care/home care heart icon, and a yen symbol icon with an upward arrow pointing from a pension bag toward the care icons, visually connecting higher pension income to increased out-of-pocket expenses. Render the specified Japanese text directly inside the image using large, extra-bold, senior-readable fonts with high contrast. The main headline must read exactly 「年金増額の落とし穴」, the sub-text must read exactly 「医療費・介護費が高額に！？」, and the badge text inside a soft red caution card accent must read exactly 「負担増の恐れ」. The presentation must be objective, professional, and entirely free of tiny cluttered text or complex tables.',
      negative_prompt:
        'no English text, no Chinese text, no Korean text, no watermark, no logo, no tiny text, no unreadable characters, no messy small labels, no cluttered chart, no distorted hands, no horror, no exaggerated wrinkles, no complex legal tables, no fake official logos, no specific insurance premium percentages, no hospital names, no scary skull or hazard symbols',
      quality_checklist: [
        'Presents information using a clear warning_card infographic layout.',
        'Renders exact Japanese text strings without adding extra characters.',
        'Maintains a professional and serious tone without scary symbols.',
        'Contains no characters, ensuring visual variety from the previous scene.',
      ],
    },
    {
      scene_id: 'S003',
      source_beat_id: 'VB_001_003',
      source_line_ids: [13, 14, 15, 16, 17, 18],
      start_line_id: 13,
      end_line_id: 18,
      aspect_ratio: '16:9',
      image_type: 'scene_image',
      expected_text_ja: ['教えてくれない裏側', '知れば怖くない！', '正しい理解'],
      final_prompt:
        'Create one single 16:9 image for a Japanese senior educational YouTube video in a soft anime-realistic illustration style. The layout uses a left text and right character composition to balance previous scenes. On the right side, a friendly and reassuring elderly Japanese woman stands smiling as a reliable guide. She is around 60-65 years old with short neat hair, wearing an elegant green blouse, looking like a trusted advisor. The background is a bright, clean, heavily out-of-focus modern consultation room. Next to her on the left is a clean white presentation board framing the text area. Large, bold, senior-readable Japanese text with high contrast must be rendered directly on this presentation board. The text must read exactly: 「教えてくれない裏側」 as the main headline, 「知れば怖くない！」 as the sub-text, and 「正しい理解」 inside a badge graphic accompanied by a simple checkmark icon and a lightbulb icon. The overall mood is calm, educational, and highly reassuring, featuring light green accents and warm beige tones, completely free of clutter.',
      negative_prompt:
        'no English text, no Chinese text, no Korean text, no watermark, no logo, no tiny text, no unreadable characters, no messy small labels, no cluttered chart, no distorted hands, no horror, no exaggerated wrinkles, no real government office or town hall building logos, no complex documents',
      quality_checklist: [
        'Positions the female character on the right side for balance.',
        'Renders the exact Japanese text overlay on the presentation board.',
        'Conveys a warm, trustworthy, and encouraging mood.',
        'Excludes all government logos and small cluttered text details.',
      ],
    },
    {
      scene_id: 'S004',
      source_beat_id: 'VB_001_004',
      source_line_ids: [19, 20, 21, 22, 23, 24, 25, 26],
      start_line_id: 19,
      end_line_id: 26,
      aspect_ratio: '16:9',
      image_type: 'scene_image',
      expected_text_ja: ['損をしない最重要点', '単身・ご夫婦 どちらも必見', '後半で解説'],
      final_prompt:
        'Create one single 16:9 image for a Japanese senior educational YouTube video, mimicking a professional Japanese TV information-program summary slide. The scene features a clean, symmetrical announcement board layout set against an elegant corporate blue background with soft, subtle geometric patterns. In the center, a highly visible, shiny golden key or star icon represents the most crucial takeaway point, accompanied by simple, generic stylized line icons of a single senior person and an elderly couple in the background. Render large, extra-bold, high-contrast clean typography directly inside the image, perfectly centered to convey authority. The text must read exactly: 「損をしない最重要点」 as the main headline, 「単身・ご夫婦 どちらも必見」 as the sub-text, and 「後半で解説」 inside an attention-grabbing badge graphic with a gentle yellow highlight. The composition must be completely clean, premium, and structured for senior viewing on small screens with absolutely no small text or clickable banners.',
      negative_prompt:
        'no English text, no Chinese text, no Korean text, no watermark, no logo, no tiny text, no unreadable characters, no messy small labels, no cluttered chart, no distorted hands, no horror, no exaggerated wrinkles, no tiny footnotes, no invented tips, no urgent or scary clickable banners',
      quality_checklist: [
        'Utilizes a professional, centered summary_board layout.',
        'Renders exact Japanese text strings in extra-bold, clean typography.',
        'Employs a premium corporate blue background with yellow highlights.',
        'Does not invent tips, pension amounts, or include any English text.',
      ],
    },
    {
      scene_id: 'S005',
      source_beat_id: 'VB_001_005',
      source_line_ids: [34, 35, 36, 37, 38, 39, 40],
      start_line_id: 34,
      end_line_id: 40,
      aspect_ratio: '16:9',
      image_type: 'scene_image',
      expected_text_ja: ['原則は65歳受給開始', '繰下げ：66歳〜75歳まで', '選べる選択肢'],
      final_prompt:
        "Create one single 16:9 image for a Japanese senior educational YouTube video in a clean infographic composition with soft anime elements. The scene is a beautifully simplified, polished horizontal age timeline chart running from left to right, set against a comfortable, soft warm-beige background. The timeline has a clear base node marker at '65歳' highlighted as the standard starting point, and a clean, colored directional block or extended arrow spanning clearly from '66歳' to '75歳' to show flexibility. Simple stylized calendar and clock icons are placed near the nodes. Large, bold, high-contrast Japanese text blocks must be rendered directly above the timeline markers. The headline text must read exactly 「原則は65歳受給開始」, the sub-text must read exactly 「繰下げ：66歳〜75歳まで」, and a badge text with a gentle yellow accent must read exactly 「選べる選択肢」. The chart must be clear, minimal, and structural without any intricate grids, financial numbers, or small text details.",
      negative_prompt:
        'no English text, no Chinese text, no Korean text, no watermark, no logo, no tiny text, no unreadable characters, no messy small labels, no distorted hands, no horror, no exaggerated wrinkles, no complex chart, no unverified law changes, no extraneous text details below age labels, no financial numbers',
      quality_checklist: [
        'Presents a clear horizontal age timeline chart flowing left-to-right.',
        'Renders exact Japanese text strings for headings and timeline markers.',
        'Maintains a soft warm-beige base color with simple blue and yellow highlights.',
        'Excludes complex gridlines, small labels, and financial numbers.',
      ],
    },
    {
      scene_id: 'S006',
      source_beat_id: 'VB_001_006',
      source_line_ids: [41, 42, 43, 44, 45, 46, 47],
      start_line_id: 41,
      end_line_id: 47,
      aspect_ratio: '16:9',
      image_type: 'scene_image',
      expected_text_ja: ['1ヶ月遅らせる：+0.7%', '1年間遅らせる：+8.4%増', '増額率の基本'],
      final_prompt:
        "Create one single 16:9 image for a Japanese senior educational YouTube video in a soft anime-realistic infographic style. The layout is a document explanation layout with a straight-on display view. The background is a soft cream-colored texture styled slightly like an elegant, clear official notice document paper. The main subject is a simplified data presentation board with two distinct vertically stacked rows displaying clear numerical legibility for older eyes. Inside this infographic, render the exact large bold Japanese text with high contrast: the headline row 「1ヶ月遅らせる：+0.7%」, the sub-text row 「1年間遅らせる：+8.4%増」, and a badge element with the text 「増額率の基本」. The percentage numbers '+0.7%' and '+8.4%' must be formatted to stand out significantly larger than the surrounding text, using a bright, warm yellow highlight color. Supporting elements include a gold yen coin emblem with a plus sign next to the percentage numbers, and an upward green trend emblem. No characters are present. The composition must be modern, neat, clear, logical, and senior-friendly, avoiding clutter, small fine print, and spreadsheet gridlines.",
      negative_prompt:
        'no English text, no Chinese text, no Korean text, no watermark, no logo, no tiny text, no unreadable characters, no messy small labels, no cluttered chart, no distorted hands, no horror, no exaggerated wrinkles, no fake government logo, no real government seal, no complex legal table, no spreadsheet gridlines, no small footnotes, no complex math formulas',
      quality_checklist: [
        'Includes exact Japanese text for headline, sub_text, and badge_text.',
        'The layout is a document explanation with a straight-on view on a cream base.',
        'The percentages +0.7% and +8.4% are highlighted and made significantly larger.',
        'Contains supporting elements like the gold yen coin and upward green trend emblem.',
        'Excludes characters, complex formulas, and fake government logos.',
      ],
    },
    {
      scene_id: 'S007',
      source_beat_id: 'VB_001_007',
      source_line_ids: [48, 49, 50],
      start_line_id: 48,
      end_line_id: 50,
      aspect_ratio: '16:9',
      image_type: 'scene_image',
      expected_text_ja: ['通常より8.4%増額', 'この増額は一生涯続く！', '66歳受給の例'],
      final_prompt:
        'Create one single 16:9 image for a Japanese senior educational YouTube video in a soft anime-realistic illustration style. The layout type is left text, right character. On the right side of the screen, a medium close-up shot shows a happy Japanese senior man, around 66 years old, with a vibrant expression, silver hair, and looking confidently forward with relief, wearing a clean light-blue casual shirt. He looks healthy and full of life. The background is a warm, pleasant sunny outdoor terrace, softly blurred. In the sky space, an enduring pathway graphic motif is subtly stylized. Render the exact large bold Japanese text directly in the image with clear shadows or backdrops on the left side to ensure perfect legibility: headline 「通常より8.4%増額」, sub-text 「この増額は一生涯続く！」, and badge text 「66歳受給の例」. Supporting elements include a yen icon with a shield representing permanency and a small sparkle icon. The mood is optimistic, calm, and educational.',
      negative_prompt:
        'no English text, no Chinese text, no Korean text, no watermark, no logo, no tiny text, no unreadable characters, no messy small labels, no cluttered chart, no distorted hands, no horror, no exaggerated wrinkles, no unverified law change, no specific total payout sums, no fake insurance company cards',
      quality_checklist: [
        'Includes exact Japanese text for headline, sub_text, and badge_text.',
        'Character is placed on the right, text is placed on the left.',
        'Character matches details: 66 years old Japanese man, silver hair, light-blue shirt, happy expression.',
        'Background is a softly blurred warm sunny terrace.',
        'Excludes specific total payout numbers and fake insurance cards.',
      ],
    },
    {
      scene_id: 'S008',
      source_beat_id: 'VB_001_008',
      source_line_ids: [51, 52, 53, 54, 55, 56, 57],
      start_line_id: 51,
      end_line_id: 57,
      aspect_ratio: '16:9',
      image_type: 'scene_image',
      expected_text_ja: ['老齢基礎年金（満額）', '65歳受給：年額79.5万円', '2023年度の例'],
      final_prompt:
        'Create one single 16:9 image for a Japanese senior educational YouTube video combining a clean TV slide presentation layout with a soft infographic design. The layout is a document explanation layout with a modern, sophisticated corporate blue background featuring elegant line overlays. On the lower right, there is a beautifully placed clean, simplified vector illustration of an open document folder and a generic official-looking pension statement summary card, without any real or fake government stamps. The document is shown in a slightly angled isometric perspective, but the main text overlays are flat to ensure maximum readability for senior viewers. Directly render the exact large, bold Japanese text with high contrast over the top and left areas: headline 「老齢基礎年金（満額）」, sub-text 「65歳受給：年額79.5万円」, and badge text 「2023年度の例」. A highlighted box cleanly frames the key amount section on the card. Supporting icons include a document paper icon, a folder icon, and a yen sign. No characters are present.',
      negative_prompt:
        'no English text, no Chinese text, no Korean text, no watermark, no logo, no tiny text, no unreadable characters, no messy small labels, no cluttered chart, no distorted hands, no horror, no exaggerated wrinkles, no real government seal, no fake Japanese Ministry logos, no additional untranscribed numbers, no tiny footnote text',
      quality_checklist: [
        'Includes exact Japanese text for headline, sub_text, and badge_text.',
        'Background is corporate blue with line overlays.',
        'Document asset is placed on the lower right, text overlays top and left.',
        'No characters are included in the scene.',
        'Excludes real government seals, fake ministry logos, and untranscribed numbers.',
      ],
    },
    {
      scene_id: 'S009',
      source_beat_id: 'VB_001_009',
      source_line_ids: [58, 59, 60, 61, 62],
      start_line_id: 58,
      end_line_id: 62,
      aspect_ratio: '16:9',
      image_type: 'scene_image',
      expected_text_ja: ['70歳まで5年間延ばすと', '0.7%×60ヶ月＝42%増', '増額の計算'],
      final_prompt:
        "Create one single 16:9 image for a Japanese senior educational YouTube video in a highly scannable infographic layout. The layout is a simple chart slide with a frontal view. The background is a professional, clear soft blue whiteboard texture. The main subject is a crisp, clean educational math equation layout formatted step-by-step like a television program explainer, flowing horizontally across the screen center with large spacing between elements. A simple block diagram links a multi-page calendar icon representing 5 years to a block representing 60 months, leading to the final outcome. Render the exact large, bold Japanese text with high contrast for senior viewers with weak eyesight: headline 「70歳まで5年間延ばすと」, sub-text 「0.7%×60ヶ月＝42%増」, and badge text 「増額の計算」. The numbers '5', '60', and '42%' must stand out clearly, with a prominent bright yellow highlight wrapping around the final '42%' text block. Supporting elements include a mathematical multiplication symbol indicator and a calculation percentage graphic icon. No characters are present.",
      negative_prompt:
        'no English text, no Chinese text, no Korean text, no watermark, no logo, no tiny text, no unreadable characters, no messy small labels, no cluttered chart, no distorted hands, no horror, no exaggerated wrinkles, no complex legal tables, no calculators with random numbers, no small fine print',
      quality_checklist: [
        'Includes exact Japanese text for headline, sub_text, and badge_text.',
        'The background is a soft blue whiteboard/chalkboard texture.',
        'The math equation flows horizontally with large spacing.',
        "The numbers '5', '60', and '42%' stand out with a yellow highlight on '42%'.",
        'Excludes calculators, legal tables, and fine print.',
      ],
    },
  ];

  const convertedImagePrompts = imageScenePrompts.map(ip => ({
    name: `${ip.start_line_id}-${ip.end_line_id}`,
    prompt: ip.final_prompt,
  }));

  const totalBatches = PROFILES_LOGIN.length;
  const itemsPerBatch = Math.ceil(convertedImagePrompts.length / totalBatches);

  const batches = Array.from({ length: totalBatches }, (_, i) =>
    convertedImagePrompts.slice(i * itemsPerBatch, (i + 1) * itemsPerBatch),
  );

  const activeConcurrency = Math.min(PROFILES_LOGIN.length, convertedImagePrompts.length);
  let nextBatchIndex = 0;

  async function workerProfile(workerIndex) {
    const profile = PROFILES_LOGIN[workerIndex];

    while (true) {
      const i = nextBatchIndex++;
      if (i >= totalBatches) break;

      const batch = batches[i];
      if (!batch.length) continue;

      const batchIndex = i + 1;
      console.log(
        `[generate-images] batch ${batchIndex}/${totalBatches} — ${batch.length} ảnh (profile ${profile})`,
      );

      await createBatchMedia({
        prompts: { visuals: batch },
        pathSave: FLOW_DOWNLOADS_DIR,
        profile,
      });
    }
  }

  await Promise.all(Array.from({ length: activeConcurrency }, (_, w) => workerProfile(w)));
  console.log('[generate-images] Hoàn tất tất cả batch');
}

main();
