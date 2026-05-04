import fs from 'fs';
import path from 'path';
import { delay } from '../utils/dom.util.js';
import { flowSettings } from '../constants/index.js';
import { openFlowPage, attachImage, generateImage } from '../flow/browser.util.js';

const data = [
  {
    start_index: 1,
    end_index: 15,
    location_setting: 'Traditional Japanese living room — interior, morning',
    characters_in_scene: ['Protagonist Father', 'Daughter'],
    expression_used: {
      'Protagonist Father': 'neutral',
      Daughter: 'neutral',
    },
    scene_variables: {
      CHARACTER_POSITIONS:
        'Protagonist Father slumped on the left third of the sofa, Daughter standing on the right third looking toward the floor.',
      ACTION:
        'Masashi is staring blankly at his open palms, while Haruka stands perfectly still, clutching a worn teddy bear to her chest.',
      LIGHTING_MODIFIER: 'Soft window light from the left casting long, pale shadows; hazy dust motes visible in the air.',
      FOREGROUND_ELEMENT: 'A stack of unopened moving boxes in the bottom right corner, slightly out of focus.',
    },
    visual_description:
      "Establishes the current 'House Without a Sun' atmosphere. The scene captures the stagnant grief and the cluttered domestic space mentioned in the summary and early transcript.",
    final_prompt:
      "Japanese domestic realism, cinematic film still, warm amber lighting, muted teal accents, soft window light, shallow depth of field, 8k resolution, highly detailed textures, shot on Arri Alexa., A lived-in Japanese apartment interior. The living room is cluttered with moving boxes and child's toys. A traditional wooden dining table sits in the center. In the background, a small Buddhist altar (Butsudan) holds a framed funeral photograph of a woman with a black ribbon. Low morning sun streams through sheer white curtains, illuminating dust motes in the air. Tatami flooring meets dark wood accents., Japanese man, appears mid-30s, lean oval face, hooded dark eyes, tired features, thick furrowed brows, straight nose, thin lips, pale skin with dark circles, messy short black hair, slender frame, navy blue linen button-down shirt with rolled sleeves, charcoal chinos, silver wedding band on left hand, slight stubble. melancholic gaze, lips flat, slight tension in the brow, Japanese girl, 4 years old, round chubby face, large round eyes, small button nose, peach-toned skin, straight black hair with blunt bangs, petite child, yellow cotton shirt with white flowers, denim overalls, red sneakers, pink butterfly hair clip. vacant, wide-eyed stare, head tilted slightly, Protagonist Father slumped on the left third of the sofa, Daughter standing on the right third looking toward the floor., Masashi is staring blankly at his open palms, while Haruka stands perfectly still, clutching a worn teddy bear to her chest., Soft window light from the left casting long, pale shadows; hazy dust motes visible in the air., A stack of unopened moving boxes in the bottom right corner, slightly out of focus., rule of thirds composition, negative space on right third and bottom 20% for subtitles, deep focus f/8, 16:9 aspect ratio, 8K resolution, ultra-detailed textures, no text, no watermark, no cluttered center --ar 16:9",
    negative_prompt:
      'anime, manga, cartoon, 3D render, CGI, stylized, western features, blue eyes, blonde hair, messy cluttered foreground, text, watermark, logo, subtitles, blurry face, extra limbs, morphed fingers, studio lighting, neon lights, high saturation, modern minimalist western furniture, heavy makeup, wide eyes, caricature, distorted proportions, multiple people merged, floating objects., third person, background crowd, extra faces',
  },
  {
    start_index: 16,
    end_index: 26,
    location_setting: 'Genkan (Japanese entryway) — interior, bright morning',
    characters_in_scene: ['Protagonist Father'],
    expression_used: {
      'Protagonist Father': 'neutral',
    },
    scene_variables: {
      CHARACTER_POSITIONS: 'Protagonist Father standing on the right third, looking toward an open door (out of frame left).',
      ACTION:
        'Masashi is leaning against the wooden doorframe, one hand raised as if waving goodbye, a faint look of exhaustion on his face.',
      LIGHTING_MODIFIER: 'High-key morning sunlight flooding in from the left, overexposing the edge of the doorframe.',
      FOREGROUND_ELEMENT: "A pair of women's polished black shoes placed neatly on the stone floor, foreground left blur.",
    },
    visual_description:
      "A flashback sequence transitioning from the gloom to the 'last smile' memory. The lighting shifts to a brighter, though still melancholic, nostalgic tone.",
    final_prompt:
      "Japanese domestic realism, cinematic film still, warm amber lighting, muted teal accents, soft window light, shallow depth of field, 8k resolution, highly detailed textures, shot on Arri Alexa., A clean and bright Japanese genkan entryway. Polished dark wood floors meet a stone step-down area. Natural light pours in from an open door. The atmosphere is nostalgic and airy, contrasting with the present-day clutter., Japanese man, appears mid-30s, lean oval face, hooded dark eyes, tired features, thick furrowed brows, straight nose, thin lips, pale skin with dark circles, messy short black hair, slender frame, navy blue linen button-down shirt with rolled sleeves, charcoal chinos, silver wedding band on left hand, slight stubble. melancholic gaze, lips flat, slight tension in the brow, Protagonist Father standing on the right third, looking toward an open door (out of frame left)., Masashi is leaning against the wooden doorframe, one hand raised as if waving goodbye, a faint look of exhaustion on his face., High-key morning sunlight flooding in from the left, overexposing the edge of the doorframe., A pair of women's polished black shoes placed neatly on the stone floor, foreground left blur., rule of thirds composition, negative space on left third and bottom 20% for subtitles, deep focus f/8, 16:9 aspect ratio, 8K resolution, ultra-detailed textures, no text, no watermark, no cluttered center --ar 16:9",
    negative_prompt:
      'anime, manga, cartoon, 3D render, CGI, stylized, western features, blue eyes, blonde hair, messy cluttered foreground, text, watermark, logo, subtitles, blurry face, extra limbs, morphed fingers, studio lighting, neon lights, high saturation, modern minimalist western furniture, heavy makeup, wide eyes, caricature, distorted proportions, multiple people merged, floating objects., multiple people, crowd, background figures, previous location elements, cluttered living room',
  },
  {
    start_index: 27,
    end_index: 42,
    location_setting: 'Japanese Hospital Room — interior, sterile night',
    characters_in_scene: ['Protagonist Father', 'Daughter'],
    expression_used: {
      'Protagonist Father': 'sad_or_vulnerable',
      Daughter: 'sad_or_vulnerable',
    },
    scene_variables: {
      CHARACTER_POSITIONS: 'Protagonist Father kneeling on the left third by a hospital bed, Daughter lying in the bed on the right third.',
      ACTION:
        'Masashi is burying his face into the side of the white bedsheets, his shoulders hunched, while Haruka clutches her teddy bear, eyes red-rimmed.',
      LIGHTING_MODIFIER: 'Cool fluorescent overhead light, harsh clinical shadows, blue-tinted moonlight from a small window.',
      FOREGROUND_ELEMENT: 'An IV drip pole and clear tubing, sharp focus in the immediate left foreground.',
    },
    visual_description:
      "The climax of the chapter's emotional arc—the hospital scene where the weight of the accident and future guilt hits. Shift to a sterile, cold environment.",
    final_prompt:
      'Japanese domestic realism, cinematic film still, warm amber lighting, muted teal accents, soft window light, shallow depth of field, 8k resolution, highly detailed textures, shot on Arri Alexa., A sterile Japanese hospital room. White walls, a simple metal bed frame with white linens, and a small wooden bedside table. The room is dim, lit by a single clinical light. A sense of cold isolation pervades the space., Japanese man, appears mid-30s, lean oval face, hooded dark eyes, tired features, thick furrowed brows, straight nose, thin lips, pale skin with dark circles, messy short black hair, slender frame, navy blue linen button-down shirt with rolled sleeves, charcoal chinos, silver wedding band on left hand, slight stubble. eyes glistening with tears, mouth slightly open and trembling, head tilted down, Japanese girl, 4 years old, round chubby face, large round eyes, small button nose, peach-toned skin, straight black hair with blunt bangs, petite child, yellow cotton shirt with white flowers, denim overalls, red sneakers, pink butterfly hair clip. quivering lip, eyes filling with large tears, clutching teddy bear to face, Protagonist Father kneeling on the left third by a hospital bed, Daughter lying in the bed on the right third., Masashi is burying his face into the side of the white bedsheets, his shoulders hunched, while Haruka clutches her teddy bear, eyes red-rimmed., Cool fluorescent overhead light, harsh clinical shadows, blue-tinted moonlight from a small window., An IV drip pole and clear tubing, sharp focus in the immediate left foreground., rule of thirds composition, negative space on right third and bottom 20% for subtitles, deep focus f/8, 16:9 aspect ratio, 8K resolution, ultra-detailed textures, no text, no watermark, no cluttered center --ar 16:9',
    negative_prompt:
      'anime, manga, cartoon, 3D render, CGI, stylized, western features, blue eyes, blonde hair, messy cluttered foreground, text, watermark, logo, subtitles, blurry face, extra limbs, morphed fingers, studio lighting, neon lights, high saturation, modern minimalist western furniture, heavy makeup, wide eyes, caricature, distorted proportions, multiple people merged, floating objects., bright daylight, outdoor setting, overexposed highlights, lens flare, third person, background crowd, extra faces, previous location elements, genkan entryway',
  },
  {
    start_index: 43,
    end_index: 60,
    location_setting: 'Lived-in Japanese apartment interior — morning',
    characters_in_scene: ['Protagonist Father', 'Daughter'],
    expression_used: {
      'Protagonist Father': 'neutral',
      Daughter: 'neutral',
    },
    scene_variables: {
      CHARACTER_POSITIONS: 'Masashi kneeling on the right third of the frame, Haruka standing on the left third facing him.',
      ACTION:
        "Masashi is forcedly smiling while buttoning Haruka's yellow flower print shirt; Haruka is looking at him with a gentle, vacant gaze.",
      LIGHTING_MODIFIER: 'Natural morning window light from the left, soft hazy atmosphere with visible dust motes.',
      FOREGROUND_ELEMENT: 'An out-of-focus wooden chair leg in the bottom right foreground.',
    },
    visual_description:
      "Initial scene establishing the new daily routine. Inherits the apartment location from the previous chapter. The focus is on Masashi's 'awkward brightness' as he cares for Haruka in the morning light.",
    final_prompt:
      "Japanese domestic realism, cinematic film still, warm amber lighting, muted teal accents, soft window light, shallow depth of field, 8k resolution, highly detailed textures, shot on Arri Alexa., A lived-in Japanese apartment interior. The living room is cluttered with moving boxes and child's toys. A traditional wooden dining table sits in the center. In the background, a small Buddhist altar (Butsudan) holds a framed funeral photograph of a woman with a black ribbon. Low morning sun streams through sheer white curtains, illuminating dust motes in the air. Tatami flooring meets dark wood accents., Japanese man, appears mid-30s, lean oval face, hooded dark eyes, tired features, thick furrowed brows, straight nose, thin lips, pale skin with dark circles, messy short black hair, slender frame, navy blue linen button-down shirt with rolled sleeves, charcoal chinos, silver wedding band on left hand, slight stubble. melancholic gaze, lips flat, slight tension in the brow, Japanese girl, 4 years old, round chubby face, large round eyes, small button nose, peach-toned skin, straight black hair with blunt bangs, petite child, yellow cotton shirt with white flowers, denim overalls, red sneakers, pink butterfly hair clip. vacant, wide-eyed stare, head tilted slightly, Masashi kneeling on the right third of the frame, Haruka standing on the left third facing him., Masashi is forcedly smiling while buttoning Haruka's yellow flower print shirt; Haruka is looking at him with a gentle, vacant gaze., Natural morning window light from the left, soft hazy atmosphere with visible dust motes., An out-of-focus wooden chair leg in the bottom right foreground., rule of thirds composition, negative space on left third and bottom 20% for subtitles, deep focus f/8, 16:9 aspect ratio, 8K resolution, ultra-detailed textures, no text, no watermark, no cluttered center --ar 16:9",
    negative_prompt:
      'anime, manga, cartoon, 3D render, CGI, stylized, western features, blue eyes, blonde hair, messy cluttered foreground, text, watermark, logo, subtitles, blurry face, extra limbs, morphed fingers, studio lighting, neon lights, high saturation, modern minimalist western furniture, heavy makeup, wide eyes, caricature, distorted proportions, multiple people merged, floating objects., third person, background crowd, extra faces',
  },
  {
    start_index: 61,
    end_index: 68,
    location_setting: 'Traditional Japanese living room — late afternoon',
    characters_in_scene: ['Protagonist Father', 'Daughter'],
    expression_used: {
      'Protagonist Father': 'sad_or_vulnerable',
      Daughter: 'sad_or_vulnerable',
    },
    scene_variables: {
      CHARACTER_POSITIONS: 'Haruka seated on the floor in the right third, Masashi hunched over in front of her on the left third.',
      ACTION:
        'Haruka is looking down at her small interlaced fingers, lips quivering; Masashi is reaching out a hand toward her shoulder, his face filled with pained concern.',
      LIGHTING_MODIFIER: 'Low-angle warm afternoon light casting long, heavy shadows across the tatami mats.',
      FOREGROUND_ELEMENT: 'A worn teddy bear lying face down on the floor in the sharp foreground.',
    },
    visual_description:
      "Visual shift to the 'mystery' of the apology. The mood darkens as Haruka's behavior becomes concerning. The composition focuses on the physical distance and the emotional weight of her 'Gomen ne'.",
    final_prompt:
      "Japanese domestic realism, cinematic film still, warm amber lighting, muted teal accents, soft window light, shallow depth of field, 8k resolution, highly detailed textures, shot on Arri Alexa., A lived-in Japanese apartment interior. The living room is cluttered with moving boxes and child's toys. A traditional wooden dining table sits in the center. In the background, a small Buddhist altar (Butsudan) holds a framed funeral photograph of a woman with a black ribbon. Low morning sun streams through sheer white curtains, illuminating dust motes in the air. Tatami flooring meets dark wood accents., Japanese man, appears mid-30s, lean oval face, hooded dark eyes, tired features, thick furrowed brows, straight nose, thin lips, pale skin with dark circles, messy short black hair, slender frame, navy blue linen button-down shirt with rolled sleeves, charcoal chinos, silver wedding band on left hand, slight stubble. eyes glistening with tears, mouth slightly open and trembling, head tilted down, Japanese girl, 4 years old, round chubby face, large round eyes, small button nose, peach-toned skin, straight black hair with blunt bangs, petite child, yellow cotton shirt with white flowers, denim overalls, red sneakers, pink butterfly hair clip. quivering lip, eyes filling with large tears, clutching teddy bear to face, Haruka seated on the floor in the right third, Masashi hunched over in front of her on the left third., Haruka is looking down at her small interlaced fingers, lips quivering; Masashi is reaching out a hand toward her shoulder, his face filled with pained concern., Low-angle warm afternoon light casting long, heavy shadows across the tatami mats., A worn teddy bear lying face down on the floor in the sharp foreground., rule of thirds composition, negative space on right third and bottom 20% for subtitles, deep focus f/8, 16:9 aspect ratio, 8K resolution, ultra-detailed textures, no text, no watermark, no cluttered center --ar 16:9",
    negative_prompt:
      'anime, manga, cartoon, 3D render, CGI, stylized, western features, blue eyes, blonde hair, messy cluttered foreground, text, watermark, logo, subtitles, blurry face, extra limbs, morphed fingers, studio lighting, neon lights, high saturation, modern minimalist western furniture, heavy makeup, wide eyes, caricature, distorted proportions, multiple people merged, floating objects., third person, background crowd, extra faces',
  },
  {
    start_index: 69,
    end_index: 89,
    location_setting: 'Lived-in Japanese apartment interior — living room, morning',
    characters_in_scene: ['Protagonist Father', 'Daughter', 'Love Interest / Sister-in-Law'],
    expression_used: {
      'Protagonist Father': 'neutral',
      Daughter: 'neutral',
      'Love Interest / Sister-in-Law': 'neutral',
    },
    scene_variables: {
      CHARACTER_POSITIONS:
        'Yuriko standing on left third, Masashi standing on right third, Haruka positioned between them lower in the frame',
      ACTION: "Yuriko is gently patting Haruka's head while Masashi rubs the back of his neck with a faint, embarrassed smile",
      LIGHTING_MODIFIER: 'Soft morning light through sheer curtains, subtle tungsten warmth from a floor lamp',
      FOREGROUND_ELEMENT: 'A stacks of cardboard moving boxes in the bottom left corner, slightly blurred',
    },
    visual_description:
      'Initial reunion scene. Inherits the apartment setting from the previous chapter. The boundary is set by the introduction of Yuriko and the shift to a bittersweet but lighter mood compared to the previous somber ending.',
    final_prompt:
      "Japanese domestic realism, cinematic film still, warm amber lighting, muted teal accents, soft window light, shallow depth of field, 8k resolution, highly detailed textures, shot on Arri Alexa., A lived-in Japanese apartment interior. The living room is cluttered with moving boxes and child's toys. A traditional wooden dining table sits in the center. In the background, a small Buddhist altar (Butsudan) holds a framed funeral photograph of a woman with a black ribbon. Low morning sun streams through sheer white curtains, illuminating dust motes in the air. Tatami flooring meets dark wood accents., Japanese man, appears mid-30s, lean oval face, hooded dark eyes, tired features, thick furrowed brows, straight nose, thin lips, pale skin with dark circles, messy short black hair, slender frame, navy blue linen button-down shirt with rolled sleeves, charcoal chinos, silver wedding band on left hand, slight stubble. melancholic gaze, lips flat, slight tension in the brow, Japanese girl, 4 years old, round chubby face, large round eyes, small button nose, peach-toned skin, straight black hair with blunt bangs, petite child, yellow cotton shirt with white flowers, denim overalls, red sneakers, pink butterfly hair clip. vacant, wide-eyed stare, head tilted slightly, Japanese woman, appears late 30s, elegant diamond face, high cheekbones, large almond eyes, thin arched brows, slender nose, porcelain pale skin, long ebony hair in low ponytail, emaciated frame with visible collarbones, oversized cream cable knit sweater, olive green pleated skirt, jade stud earrings. composed, gentle half-smile that doesn't reach the eyes, Yuriko standing on left third, Masashi standing on right third, Haruka positioned between them lower in the frame, Yuriko is gently patting Haruka's head while Masashi rubs the back of his neck with a faint, embarrassed smile, Soft morning light through sheer curtains, subtle tungsten warmth from a floor lamp, A stacks of cardboard moving boxes in the bottom left corner, slightly blurred, rule of thirds composition, negative space on right third and bottom 20% for subtitles, deep focus f/8, 16:9 aspect ratio, 8K resolution, ultra-detailed textures, no text, no watermark, no cluttered center --ar 16:9",
    negative_prompt:
      'anime, manga, cartoon, 3D render, CGI, stylized, western features, blue eyes, blonde hair, messy cluttered foreground, text, watermark, logo, subtitles, blurry face, extra limbs, morphed fingers, studio lighting, neon lights, high saturation, modern minimalist western furniture, heavy makeup, wide eyes, caricature, distorted proportions, multiple people merged, floating objects.',
  },
  {
    start_index: 90,
    end_index: 122,
    location_setting: 'Lived-in Japanese apartment interior — dining area near the altar',
    characters_in_scene: ['Protagonist Father', 'Love Interest / Sister-in-Law'],
    expression_used: {
      'Protagonist Father': 'neutral',
      'Love Interest / Sister-in-Law': 'neutral',
    },
    scene_variables: {
      CHARACTER_POSITIONS: 'Masashi seated at the wooden table on right third, Yuriko standing near the Buddhist altar on left third',
      ACTION:
        'Masashi is looking at Yuriko with concern, Yuriko is looking at the funeral photo on the altar, her hand resting on the table edge',
      LIGHTING_MODIFIER: "Hazy atmospheric dust motes visible in the slanted morning light, emphasizing Yuriko's thin frame",
      FOREGROUND_ELEMENT: 'An out-of-focus ceramic teacup on the wooden table surface, bottom right',
    },
    visual_description:
      "Expository flashback and somber reflection. The visual focus shifts to the shared trauma of loss and Yuriko's physical decline (emaciation) near the altar of her late sister.",
    final_prompt:
      "Japanese domestic realism, cinematic film still, warm amber lighting, muted teal accents, soft window light, shallow depth of field, 8k resolution, highly detailed textures, shot on Arri Alexa., A lived-in Japanese apartment interior. The living room is cluttered with moving boxes and child's toys. A traditional wooden dining table sits in the center. In the background, a small Buddhist altar (Butsudan) holds a framed funeral photograph of a woman with a black ribbon. Low morning sun streams through sheer white curtains, illuminating dust motes in the air. Tatami flooring meets dark wood accents., Japanese man, appears mid-30s, lean oval face, hooded dark eyes, tired features, thick furrowed brows, straight nose, thin lips, pale skin with dark circles, messy short black hair, slender frame, navy blue linen button-down shirt with rolled sleeves, charcoal chinos, silver wedding band on left hand, slight stubble. melancholic gaze, lips flat, slight tension in the brow, Japanese woman, appears late 30s, elegant diamond face, high cheekbones, large almond eyes, thin arched brows, slender nose, porcelain pale skin, long ebony hair in low ponytail, emaciated frame with visible collarbones, oversized cream cable knit sweater, olive green pleated skirt, jade stud earrings. composed, gentle half-smile that doesn't reach the eyes, Masashi seated at the wooden table on right third, Yuriko standing near the Buddhist altar on left third, Masashi is looking at Yuriko with concern, Yuriko is looking at the funeral photo on the altar, her hand resting on the table edge, Hazy atmospheric dust motes visible in the slanted morning light, emphasizing Yuriko's thin frame, An out-of-focus ceramic teacup on the wooden table surface, bottom right, rule of thirds composition, negative space on left third and bottom 20% for subtitles, deep focus f/8, 16:9 aspect ratio, 8K resolution, ultra-detailed textures, no text, no watermark, no cluttered center --ar 16:9",
    negative_prompt:
      'anime, manga, cartoon, 3D render, CGI, stylized, western features, blue eyes, blonde hair, messy cluttered foreground, text, watermark, logo, subtitles, blurry face, extra limbs, morphed fingers, studio lighting, neon lights, high saturation, modern minimalist western furniture, heavy makeup, wide eyes, caricature, distorted proportions, multiple people merged, floating objects, third person, background crowd, extra faces',
  },
  {
    start_index: 123,
    end_index: 148,
    location_setting: 'Japanese apartment doorway leading to a sunny garden',
    characters_in_scene: ['Protagonist Father', 'Daughter', 'Love Interest / Sister-in-Law'],
    expression_used: {
      'Protagonist Father': 'sad_or_vulnerable',
      Daughter: 'neutral',
      'Love Interest / Sister-in-Law': 'neutral',
    },
    scene_variables: {
      CHARACTER_POSITIONS: 'Yuriko and Haruka on left third walking away, Masashi standing in the doorway on right third',
      ACTION:
        'Masashi is wiping his eyes with the back of his hand, while Yuriko leads Haruka by the hand toward a bright, out-of-focus garden',
      LIGHTING_MODIFIER: 'High contrast between the dim interior hallway and the bright, overexposed garden outside',
      FOREGROUND_ELEMENT: 'A pair of worn house slippers at the edge of the tatami mat, foreground right',
    },
    visual_description:
      'Final scene boundary. Significant shift as characters move toward the garden and Masashi breaks down in private. The composition emphasizes the physical separation to allow for his vulnerability.',
    final_prompt:
      "Japanese domestic realism, cinematic film still, warm amber lighting, muted teal accents, soft window light, shallow depth of field, 8k resolution, highly detailed textures, shot on Arri Alexa., A lived-in Japanese apartment interior. The living room is cluttered with moving boxes and child's toys. A traditional wooden dining table sits in the center. In the background, a small Buddhist altar (Butsudan) holds a framed funeral photograph of a woman with a black ribbon. Low morning sun streams through sheer white curtains, illuminating dust motes in the air. Tatami flooring meets dark wood accents., Japanese man, appears mid-30s, lean oval face, hooded dark eyes, tired features, thick furrowed brows, straight nose, thin lips, pale skin with dark circles, messy short black hair, slender frame, navy blue linen button-down shirt with rolled sleeves, charcoal chinos, silver wedding band on left hand, slight stubble. eyes glistening with tears, mouth slightly open and trembling, head tilted down, Japanese girl, 4 years old, round chubby face, large round eyes, small button nose, peach-toned skin, straight black hair with blunt bangs, petite child, yellow cotton shirt with white flowers, denim overalls, red sneakers, pink butterfly hair clip. vacant, wide-eyed stare, head tilted slightly, Japanese woman, appears late 30s, elegant diamond face, high cheekbones, large almond eyes, thin arched brows, slender nose, porcelain pale skin, long ebony hair in low ponytail, emaciated frame with some visible collarbones, oversized cream cable knit sweater, olive green pleated skirt, jade stud earrings. composed, gentle half-smile that doesn't reach the eyes, Yuriko and Haruka on left third walking away, Masashi standing in the doorway on right third, Masashi is wiping his eyes with the back of his hand, while Yuriko leads Haruka by the hand toward a bright, out-of-focus garden, High contrast between the dim interior hallway and the bright, overexposed garden outside, A pair of worn house slippers at the edge of the tatami mat, foreground right, rule of thirds composition, negative space on left third and bottom 20% for subtitles, deep focus f/8, 16:9 aspect ratio, 8K resolution, ultra-detailed textures, no text, no watermark, no cluttered center --ar 16:9",
    negative_prompt:
      'anime, manga, cartoon, 3D render, CGI, stylized, western features, blue eyes, blonde hair, messy cluttered foreground, text, watermark, logo, subtitles, blurry face, extra limbs, morphed fingers, studio lighting, neon lights, high saturation, modern minimalist western furniture, heavy makeup, wide eyes, caricature, distorted proportions, multiple people merged, floating objects.',
  },
  {
    start_index: 149,
    end_index: 165,
    location_setting: 'Traditional Japanese High School Archery Range — exterior, spring morning',
    characters_in_scene: ['Protagonist Father', 'Love Interest / Sister-in-Law'],
    expression_used: {
      'Protagonist Father': 'sad_or_vulnerable',
      'Love Interest / Sister-in-Law': 'neutral',
    },
    scene_variables: {
      CHARACTER_POSITIONS:
        'Masashi (as a teenager) kneeling on the right third of the frame, Yuriko (as a teenager) standing on the left third, leaning slightly toward him.',
      ACTION:
        'Masashi is clutching a wooden Japanese longbow (yumi) with trembling hands, looking up with tear-filled eyes. Yuriko is looking down at him with a gentle, encouraging half-smile, a white high school uniform ribbon fluttering in the wind.',
      LIGHTING_MODIFIER: 'Bright, overexposed spring sunlight, soft focus on cherry blossom petals (sakura) falling through the air.',
      FOREGROUND_ELEMENT: 'Pink cherry blossom petals in sharp focus in the bottom right corner, drifting across the frame.',
    },
    visual_description:
      'A flashback to high school. The scene boundary is defined by the shift to a youthful memory at the archery range (Kyudo-jo). The dominant visual is the soft, nostalgic interaction between a vulnerable teenage Mashi and a supportive Yuriko under the cherry blossoms.',
    final_prompt:
      "Japanese domestic realism, cinematic film still, warm amber lighting, muted teal accents, soft window light, shallow depth of field, 8k resolution, highly detailed textures, shot on Arri Alexa., An outdoor traditional Japanese high school archery range with a wooden floor and sand target area. In the background, large cherry blossom trees are in full bloom against a clear blue sky. The air is filled with falling pink petals. Japanese man, appears mid-30s, lean oval face, hooded dark eyes, tired features, thick furrowed brows, straight nose, thin lips, pale skin with dark circles, messy short black hair, slender frame, navy blue linen button-down shirt with rolled sleeves, charcoal chinos, silver wedding band on left hand, slight stubble., eyes glistening with tears, mouth slightly open and trembling, head tilted down, Japanese woman, appears late 30s, elegant diamond face, high cheekbones, large almond eyes, thin arched brows, slender nose, porcelain pale skin, long ebony hair in low ponytail, emaciated frame with visible collarbones, oversized cream cable knit sweater, olive green pleated skirt, jade stud earrings., composed, gentle half-smile that doesn't reach the eyes, Masashi (as a teenager) kneeling on the right third of the frame, Yuriko (as a teenager) standing on the left third, leaning slightly toward him., Masashi is clutching a wooden Japanese longbow (yumi) with trembling hands, looking up with tear-filled eyes. Yuriko is looking down at him with a gentle, encouraging half-smile, a white high school uniform ribbon fluttering in the wind., Bright, overexposed spring sunlight, soft focus on cherry blossom petals (sakura) falling through the air., Pink cherry blossom petals in sharp focus in the bottom right corner, drifting across the frame., rule of thirds composition, negative space on left third and bottom 20% for subtitles, deep focus f/8, 16:9 aspect ratio, 8K resolution, ultra-detailed textures, no text, no watermark, no cluttered center --ar 16:9",
    negative_prompt:
      'anime, manga, cartoon, 3D render, CGI, stylized, western features, blue eyes, blonde hair, messy cluttered foreground, text, watermark, logo, subtitles, blurry face, extra limbs, morphed fingers, studio lighting, neon lights, high saturation, modern minimalist western furniture, heavy makeup, wide eyes, caricature, distorted proportions, multiple people merged, floating objects., third person, background crowd, extra faces, previous location elements, sunny garden',
  },
  {
    start_index: 166,
    end_index: 178,
    location_setting: 'Traditional Japanese kitchen — interior, afternoon',
    characters_in_scene: ['Protagonist Father', 'Love Interest / Sister-in-Law'],
    expression_used: {
      'Protagonist Father': 'neutral',
      'Love Interest / Sister-in-Law': 'neutral',
    },
    scene_variables: {
      CHARACTER_POSITIONS: 'Masashi standing on the left third by the sink, Yuriko standing on the right third by the wooden dining table.',
      ACTION:
        'Masashi is drying a ceramic plate with a slow, mechanical motion. Yuriko is neatly stacking small mourning envelopes or papers on the table, her head bowed in quiet respect.',
      LIGHTING_MODIFIER: 'Hazy afternoon light through the window, long shadows stretching across the wooden floor, dust motes visible.',
      FOREGROUND_ELEMENT: 'A small ceramic incense burner with a thin trail of smoke on the table edge, foreground right.',
    },
    visual_description:
      'Return to the present day. The location shifts back to the domestic interior described in the summary. The tone shifts from the brightness of youth to the heavy, grounded reality of their shared grief and mutual support as widows.',
    final_prompt:
      "Japanese domestic realism, cinematic film still, warm amber lighting, muted teal accents, soft window light, shallow depth of field, 8k resolution, highly detailed textures, shot on Arri Alexa., A lived-in Japanese apartment interior. The living room is cluttered with moving boxes and child's toys. A traditional wooden dining table sits in the center. In the background, a small Buddhist altar (Butsudan) holds a framed funeral photograph of a woman with a black ribbon. Low morning sun streams through sheer white curtains, illuminating dust motes in the air. Tatami flooring meets dark wood accents., Japanese man, appears mid-30s, lean oval face, hooded dark eyes, tired features, thick furrowed brows, straight nose, thin lips, pale skin with dark circles, messy short black hair, slender frame, navy blue linen button-down shirt with rolled sleeves, charcoal chinos, silver wedding band on left hand, slight stubble., melancholic gaze, lips flat, slight tension in the brow, Japanese woman, appears late 30s, elegant diamond face, high cheekbones, large almond eyes, thin arched brows, slender nose, porcelain pale skin, long ebony hair in low ponytail, emaciated frame with visible collarbones, oversized cream cable knit sweater, olive green pleated skirt, jade stud earrings., composed, gentle half-smile that doesn't reach the eyes, Masashi standing on the left third by the sink, Yuriko standing on the right third by the wooden dining table., Masashi is drying a ceramic plate with a slow, mechanical motion. Yuriko is neatly stacking small mourning envelopes or papers on the table, her head bowed in quiet respect., Hazy afternoon light through the window, long shadows stretching across the wooden floor, dust motes visible., A small ceramic incense burner with a thin trail of smoke on the table edge, foreground right., rule of thirds composition, negative space on right third and bottom 20% for subtitles, deep focus f/8, 16:9 aspect ratio, 8K resolution, ultra-detailed textures, no text, no watermark, no cluttered center --ar 16:9",
    negative_prompt:
      'anime, manga, cartoon, 3D render, CGI, stylized, western features, blue eyes, blonde hair, messy cluttered foreground, text, watermark, logo, subtitles, blurry face, extra limbs, morphed fingers, studio lighting, neon lights, high saturation, modern minimalist western furniture, heavy makeup, wide eyes, caricature, distorted proportions, multiple people merged, floating objects., third person, background crowd, extra faces, previous location elements, archery range',
  },
  {
    start_index: 179,
    end_index: 204,
    location_setting: 'Lived-in Japanese apartment interior — morning',
    characters_in_scene: ['Protagonist Father'],
    expression_used: {
      'Protagonist Father': 'neutral',
    },
    scene_variables: {
      CHARACTER_POSITIONS: 'Masashi stands on the right third of the frame, facing toward the window.',
      ACTION:
        'Masashi is looking out through the sheer white curtains, his shoulders slightly hunched and hands deep in his chino pockets.',
      LIGHTING_MODIFIER: 'soft diffused window light from left, long shadow across floor',
      FOREGROUND_ELEMENT: 'a stack of cardboard moving boxes in the bottom right corner, slightly out of focus',
    },
    visual_description:
      "Initial scene establishing Mashi's isolation and contemplative state as he watches Yuriko and Haruka from inside the apartment before the father-in-law's arrival.",
    final_prompt:
      "Japanese domestic realism, cinematic film still, warm amber lighting, muted teal accents, soft window light, shallow depth of field, 8k resolution, highly detailed textures, shot on Arri Alexa., A lived-in Japanese apartment interior. The living room is cluttered with moving boxes and child's toys. A traditional wooden dining table sits in the center. In the background, a small Buddhist altar (Butsudan) holds a framed funeral photograph of a woman with a black ribbon. Low morning sun streams through sheer white curtains, illuminating dust motes in the air. Tatami flooring meets dark wood accents., Japanese man, appears mid-30s, lean oval face, hooded dark eyes, tired features, thick furrowed brows, straight nose, thin lips, pale skin with dark circles, messy short black hair, slender frame, navy blue linen button-down shirt with rolled sleeves, charcoal chinos, silver wedding band on left hand, slight stubble. melancholic gaze, lips flat, slight tension in the brow, Masashi stands on the right third of the frame, facing toward the window., Masashi is looking out through the sheer white curtains, his shoulders slightly hunched and hands deep in his chino pockets., soft diffused window light from left, long shadow across floor, a stack of cardboard moving boxes in the bottom right corner, slightly out of focus, rule of thirds composition, negative space on left third and bottom 20% for subtitles, deep focus f/8, 16:9 aspect ratio, 8K resolution, ultra-detailed textures, no text, no watermark, no cluttered center --ar 16:9",
    negative_prompt:
      'anime, manga, cartoon, 3D render, CGI, stylized, western features, blue eyes, blonde hair, messy cluttered foreground, text, watermark, logo, subtitles, blurry face, extra limbs, morphed fingers, studio lighting, neon lights, high saturation, modern minimalist western furniture, heavy makeup, wide eyes, caricature, distorted proportions, multiple people merged, floating objects, multiple people, crowd, background figures',
  },
  {
    start_index: 205,
    end_index: 226,
    location_setting: 'Traditional Japanese living room — interior, tense atmosphere',
    characters_in_scene: ['Protagonist Father'],
    expression_used: {
      'Protagonist Father': 'sad_or_vulnerable',
    },
    scene_variables: {
      CHARACTER_POSITIONS: 'Masashi is kneeling on the tatami on the left third of the frame, head bowed low.',
      ACTION: 'Masashi is gripping his own knees tightly with both hands, his body visibly trembling as he suppresses tears.',
      LIGHTING_MODIFIER: 'single overhead lamp, harsh downward shadows, no fill light',
      FOREGROUND_ELEMENT: 'the small Buddhist altar (Butsudan) with the funeral photo in sharp focus, foreground right',
    },
    visual_description:
      'The emotional climax and shift to heavy resentment; the father-in-law has left and Mashi is crushed by the psychological blow, alone with his guilt.',
    final_prompt:
      "Japanese domestic realism, cinematic film still, warm amber lighting, muted teal accents, soft window light, shallow depth of field, 8k resolution, highly detailed textures, shot on Arri Alexa., A lived-in Japanese apartment interior. The living room is cluttered with moving boxes and child's toys. A traditional wooden dining table sits in the center. In the background, a small Buddhist altar (Butsudan) holds a framed funeral photograph of a woman with a black ribbon. Low morning sun streams through sheer white curtains, illuminating dust motes in the air. Tatami flooring meets dark wood accents., Japanese man, appears mid-30s, lean oval face, hooded dark eyes, tired features, thick furrowed brows, straight nose, thin lips, pale skin with dark circles, messy short black hair, slender frame, navy blue linen button-down shirt with rolled sleeves, charcoal chinos, silver wedding band on left hand, slight stubble. eyes glistening with tears, mouth slightly open and trembling, head tilted down, Masashi is kneeling on the tatami on the left third of the frame, head bowed low., Masashi is gripping his own knees tightly with both hands, his body visibly trembling as he suppresses tears., single overhead lamp, harsh downward shadows, no fill light, the small Buddhist altar (Butsudan) with the funeral photo in sharp focus, foreground right, rule of thirds composition, negative space on right third and bottom 20% for subtitles, deep focus f/8, 16:9 aspect ratio, 8K resolution, ultra-detailed textures, no text, no watermark, no cluttered center --ar 16:9",
    negative_prompt:
      'anime, manga, cartoon, 3D render, CGI, stylized, western features, blue eyes, blonde hair, messy cluttered foreground, text, watermark, logo, subtitles, blurry face, extra limbs, morphed fingers, studio lighting, neon lights, high saturation, modern minimalist western furniture, heavy makeup, wide eyes, caricature, distorted proportions, multiple people merged, floating objects, calm expression, smiling face, relaxed posture, multiple people, crowd, background figures',
  },
  {
    start_index: 227,
    end_index: 245,
    location_setting: 'Traditional Japanese living room — interior, evening',
    characters_in_scene: ['Protagonist Father', 'Love Interest / Sister-in-Law'],
    expression_used: {
      'Protagonist Father': 'neutral',
      'Love Interest / Sister-in-Law': 'neutral',
    },
    scene_variables: {
      CHARACTER_POSITIONS: 'Yuriko seated on right third facing left, Masashi seated on left third facing right, looking startled.',
      ACTION:
        'Yuriko leans forward slightly with her hands clasped on her lap; Masashi sits frozen with his mouth slightly parted in surprise, holding a tea cup with both hands.',
      LIGHTING_MODIFIER: 'use lighting_setup from visual_style as-is, no modification needed',
      FOREGROUND_ELEMENT: 'A low wooden dining table in the center, a half-filled ceramic teacup in sharp foreground right.',
    },
    visual_description:
      "New scene due to location and character shift from previous chapter context. The scene establishes the shock of Yuriko's proposal in a quiet, domestic setting.",
    final_prompt:
      "Japanese domestic realism, cinematic film still, warm amber lighting, muted teal accents, soft window light, shallow depth of field, 8k resolution, highly detailed textures, shot on Arri Alexa., A lived-in Japanese apartment interior. The living room is cluttered with moving boxes and child's toys. A traditional wooden dining table sits in the center. In the background, a small Buddhist altar (Butsudan) holds a framed funeral photograph of a woman with a black ribbon. Low morning sun streams through sheer white curtains, illuminating dust motes in the air. Tatami flooring meets dark wood accents., Japanese man, appears mid-30s, lean oval face, hooded dark eyes, tired features, thick furrowed brows, straight nose, thin lips, pale skin with dark circles, messy short black hair, slender frame, navy blue linen button-down shirt with rolled sleeves, charcoal chinos, silver wedding band on left hand, slight stubble. melancholic gaze, lips flat, slight tension in the brow, Japanese woman, appears late 30s, elegant diamond face, high cheekbones, large almond eyes, thin arched brows, slender nose, porcelain pale skin, long ebony hair in low ponytail, emaciated frame with visible collarbones, oversized cream cable knit sweater, olive green pleated skirt, jade stud earrings. composed, gentle half-smile that doesn't reach the eyes, Yuriko seated on right third facing left, Masashi seated on left third facing right, looking startled., Yuriko leans forward slightly with her hands clasped on her lap; Masashi sits frozen with his mouth slightly parted in surprise, holding a tea cup with both hands., use lighting_setup from visual_style as-is, no modification needed, A low wooden dining table in the center, a half-filled ceramic teacup in sharp foreground right., rule of thirds composition, negative space on left third and bottom 20% for subtitles, deep focus f/8, 16:9 aspect ratio, 8K resolution, ultra-detailed textures, no text, no watermark, no cluttered center --ar 16:9",
    negative_prompt:
      'anime, manga, cartoon, 3D render, CGI, stylized, western features, blue eyes, blonde hair, messy cluttered foreground, text, watermark, logo, subtitles, blurry face, extra limbs, morphed fingers, studio lighting, neon lights, high saturation, modern minimalist western furniture, heavy makeup, wide eyes, caricature, distorted proportions, multiple people merged, floating objects., third person, background crowd, extra faces, previous location elements, carpenter workshop',
  },
  {
    start_index: 246,
    end_index: 262,
    location_setting: 'Traditional Japanese living room — interior, evening',
    characters_in_scene: ['Protagonist Father', 'Love Interest / Sister-in-Law', 'Daughter'],
    expression_used: {
      'Protagonist Father': 'neutral',
      'Love Interest / Sister-in-Law': 'neutral',
      Daughter: 'neutral',
    },
    scene_variables: {
      CHARACTER_POSITIONS: "Haruka standing in the right third, clinging to Yuriko's waist; Masashi watching them from the left third.",
      ACTION:
        "Haruka is looking up at Masashi with bright, pleading eyes while gripping the wool of Yuriko's sweater; Yuriko places a comforting hand on Haruka's head.",
      LIGHTING_MODIFIER: 'soft diffused window light from left, long shadow across floor',
      FOREGROUND_ELEMENT: 'A worn teddy bear on the tatami floor, foreground left.',
    },
    visual_description:
      'Context shift: Haruka enters the emotional dynamic, reframing the scene from a private adult conflict to a family-oriented hopeful resolution.',
    final_prompt:
      "Japanese domestic realism, cinematic film still, warm amber lighting, muted teal accents, soft window light, shallow depth of field, 8k resolution, highly detailed textures, shot on Arri Alexa., A lived-in Japanese apartment interior. The living room is cluttered with moving boxes and child's toys. A traditional wooden dining table sits in the center. In the background, a small Buddhist altar (Butsudan) holds a framed funeral photograph of a woman with a black ribbon. Low morning sun streams through sheer white curtains, illuminating dust motes in the air. Tatami flooring meets dark wood accents., Japanese man, appears mid-30s, lean oval face, hooded dark eyes, tired features, thick furrowed brows, straight nose, thin lips, pale skin with dark circles, messy short black hair, slender frame, navy blue linen button-down shirt with rolled sleeves, charcoal chinos, silver wedding band on left hand, slight stubble. melancholic gaze, lips flat, slight tension in the brow, Japanese woman, appears late 30s, elegant diamond face, high cheekbones, large almond eyes, thin arched brows, slender nose, porcelain pale skin, long ebony hair in low ponytail, emaciated frame with visible collarbones, oversized cream cable knit sweater, olive green pleated skirt, jade stud earrings. composed, gentle half-smile that doesn't reach the eyes, Japanese girl, 4 years old, round chubby face, large round eyes, small button nose, peach-toned skin, straight black hair with blunt bangs, petite child, yellow cotton shirt with white flowers, denim overalls, red sneakers, pink butterfly hair clip. vacant, wide-eyed stare, head tilted slightly, Haruka standing in the right third, clinging to Yuriko's waist; Masashi watching them from the left third., Haruka is looking up at Masashi with bright, pleading eyes while gripping the wool of Yuriko's sweater; Yuriko places a comforting hand on Haruka's head., soft diffused window light from left, long shadow across floor, A worn teddy bear on the tatami floor, foreground left., rule of thirds composition, negative space on left third and bottom 20% for subtitles, deep focus f/8, 16:9 aspect ratio, 8K resolution, ultra-detailed textures, no text, no watermark, no cluttered center --ar 16:9",
    negative_prompt:
      'anime, manga, cartoon, 3D render, CGI, stylized, western features, blue eyes, blonde hair, messy cluttered foreground, text, watermark, logo, subtitles, blurry face, extra limbs, morphed fingers, studio lighting, neon lights, high saturation, modern minimalist western furniture, heavy makeup, wide eyes, caricature, distorted proportions, multiple people merged, floating objects., background crowd, extra faces',
  },
  {
    start_index: 263,
    end_index: 278,
    location_setting: 'Traditional Japanese apartment entrance and living room — daytime',
    characters_in_scene: ['Protagonist Father', 'Love Interest / Sister-in-Law', 'Daughter'],
    expression_used: {
      'Protagonist Father': 'neutral',
      'Love Interest / Sister-in-Law': 'neutral',
      Daughter: 'neutral',
    },
    scene_variables: {
      CHARACTER_POSITIONS:
        'Yuriko stands on the left third near a single cardboard moving box, Haruka stands in the center-right looking up at her, Masashi stands on the right third slightly behind Haruka.',
      ACTION:
        'Yuriko is smiling gently and nodding to Haruka; Masashi is looking at a solitary moving box on the floor with a surprised tilt of his head; Haruka is beaming with her hands clasped.',
      LIGHTING_MODIFIER: 'Natural window light + warm domestic tungsten fill + hazy atmospheric dust motes',
      FOREGROUND_ELEMENT: 'a small, half-taped cardboard moving box on the wooden floor, sharp foreground',
    },
    visual_description:
      "Partitioned as the arrival/moving-in scene. It visually establishes the 'new light' through Yuriko's arrival with minimal belongings, shifting the environment from the previous chapter's static state to one of transition.",
    final_prompt:
      "Japanese domestic realism, cinematic film still, warm amber lighting, muted teal accents, soft window light, shallow depth of field, 8k resolution, highly detailed textures, shot on Arri Alexa., A lived-in Japanese apartment interior. The living room is cluttered with moving boxes and child's toys. A traditional wooden dining table sits in the center. In the background, a small Buddhist altar (Butsudan) holds a framed funeral photograph of a woman with a black ribbon. Low morning sun streams through sheer white curtains, illuminating dust motes in the air. Tatami flooring meets dark wood accents., Japanese man, appears mid-30s, lean oval face, hooded dark eyes, tired features, thick furrowed brows, straight nose, thin lips, pale skin with dark circles, messy short black hair, slender frame, navy blue linen button-down shirt with rolled sleeves, charcoal chinos, silver wedding band on left hand, slight stubble. melancholic gaze, lips flat, slight tension in the brow, Japanese woman, appears late 30s, elegant diamond face, high cheekbones, large almond eyes, thin arched brows, slender nose, porcelain pale skin, long ebony hair in low ponytail, emaciated frame with visible collarbones, oversized cream cable knit sweater, olive green pleated skirt, jade stud earrings. composed, gentle half-smile that doesn't reach the eyes, Japanese girl, 4 years old, round chubby face, large round eyes, small button nose, peach-toned skin, straight black hair with blunt bangs, petite child, yellow cotton shirt with white flowers, denim overalls, red sneakers, pink butterfly hair clip. vacant, wide-eyed stare, head tilted slightly, Yuriko stands on the left third near a single cardboard moving box, Haruka stands in the center-right looking up at her, Masashi stands on the right third slightly behind Haruka., Yuriko is smiling gently and nodding to Haruka; Masashi is looking at a solitary moving box on the floor with a surprised tilt of his head; Haruka is beaming with her hands clasped., Natural window light + warm domestic tungsten fill + hazy atmospheric dust motes, a small, half-taped cardboard moving box on the wooden floor, sharp foreground, rule of thirds composition, negative space on right third and bottom 20% for subtitles, deep focus f/8, 16:9 aspect ratio, 8K resolution, ultra-detailed textures, no text, no watermark, no cluttered center --ar 16:9",
    negative_prompt:
      'anime, manga, cartoon, 3D render, CGI, stylized, western features, blue eyes, blonde hair, messy cluttered foreground, text, watermark, logo, subtitles, blurry face, extra limbs, morphed fingers, studio lighting, neon lights, high saturation, modern minimalist western furniture, heavy makeup, wide eyes, caricature, distorted proportions, multiple people merged, floating objects, third person, background crowd, extra faces',
  },
  {
    start_index: 279,
    end_index: 300,
    location_setting: 'Traditional Japanese living room — interior, evening',
    characters_in_scene: ['Protagonist Father', 'Love Interest / Sister-in-Law', 'Daughter'],
    expression_used: {
      'Protagonist Father': 'sad_or_vulnerable',
      'Love Interest / Sister-in-Law': 'neutral',
      Daughter: 'sad_or_vulnerable',
    },
    scene_variables: {
      CHARACTER_POSITIONS:
        'Masashi sits slumped on the tatami floor on the left third, Haruka kneels beside him on the center-left, Yuriko sits at the dining table on the right third.',
      ACTION:
        "Masashi is covering his face with both hands, head bowed as he weeps; Haruka is gently stroking Masashi's forearm with a small hand; Yuriko is watching them with a soft, bittersweet smile.",
      LIGHTING_MODIFIER: 'soft diffused window light from left, long shadow across floor',
      FOREGROUND_ELEMENT: "a child's worn teddy bear lying on the tatami floor, foreground blur",
    },
    visual_description:
      "Partitioned as the major visual context shift from 'novelty' to 'emotional breakdown'. The scene captures the peak emotional release where the suppressed grief finally surfaces in a shared domestic moment.",
    final_prompt:
      "Japanese domestic realism, cinematic film still, warm amber lighting, muted teal accents, soft window light, shallow depth of field, 8k resolution, highly detailed textures, shot on Arri Alexa., A lived-in Japanese apartment interior. The living room is cluttered with moving boxes and child's toys. A traditional wooden dining table sits in the center. In the background, a small Buddhist altar (Butsudan) holds a framed funeral photograph of a woman with a black ribbon. Low morning sun streams through sheer white curtains, illuminating dust motes in the air. Tatami flooring meets dark wood accents., Japanese man, appears mid-30s, lean oval face, hooded dark eyes, tired features, thick furrowed brows, straight nose, thin lips, pale skin with dark circles, messy short black hair, slender frame, navy blue linen button-down shirt with rolled sleeves, charcoal chinos, silver wedding band on left hand, slight stubble. eyes glistening with tears, mouth slightly open and trembling, head tilted down, Japanese woman, appears late 30s, elegant diamond face, high cheekbones, large almond eyes, thin arched brows, slender nose, porcelain pale skin, long ebony hair in low ponytail, emaciated frame with visible collarbones, oversized cream cable knit sweater, olive green pleated skirt, jade stud earrings. composed, gentle half-smile that doesn't reach the eyes, Japanese girl, 4 years old, round chubby face, large round eyes, small button nose, peach-toned skin, straight black hair with blunt bangs, petite child, yellow cotton shirt with white flowers, denim overalls, red sneakers, pink butterfly hair clip. quivering lip, eyes filling with large tears, clutching teddy bear to face, Masashi sits slumped on the tatami floor on the left third, Haruka kneels beside him on the center-left, Yuriko sits at the dining table on the right third., Masashi is covering his face with both hands, head bowed as he weeps; Haruka is gently stroking Masashi's forearm with a small hand; Yuriko is watching them with a soft, bittersweet smile., soft diffused window light from left, long shadow across floor, a child's worn teddy bear lying on the tatami floor, foreground blur, rule of thirds composition, negative space on right third and bottom 20% for subtitles, deep focus f/8, 16:9 aspect ratio, 8K resolution, ultra-detailed textures, no text, no watermark, no cluttered center --ar 16:9",
    negative_prompt:
      'anime, manga, cartoon, 3D render, CGI, stylized, western features, blue eyes, blonde hair, messy cluttered foreground, text, watermark, logo, subtitles, blurry face, extra limbs, morphed fingers, studio lighting, neon lights, high saturation, modern minimalist western furniture, heavy makeup, wide eyes, caricature, distorted proportions, multiple people merged, floating objects, third person, background crowd, extra faces, calm expression, smiling face, relaxed posture',
  },
  {
    start_index: 301,
    end_index: 320,
    location_setting: 'Traditional Japanese apartment interior — living room, late afternoon',
    characters_in_scene: ['Protagonist Father', 'Love Interest / Sister-in-Law', 'Daughter'],
    expression_used: {
      'Protagonist Father': 'sad_or_vulnerable',
      'Love Interest / Sister-in-Law': 'neutral',
      Daughter: 'sad_or_vulnerable',
    },
    scene_variables: {
      CHARACTER_POSITIONS:
        'Protagonist Father seated on floor at right third, Love Interest / Sister-in-Law kneeling behind him on right third, Daughter clinging to his legs on right third',
      ACTION:
        'Masashi is sobbing into his hands with his head bowed low, Yuriko has her arms wrapped around his shoulders in a protective embrace, Haruka is hugging his knees tightly while looking up with a quivering lip',
      LIGHTING_MODIFIER: 'soft diffused window light from left, long shadow across floor, warm amber domestic glow',
      FOREGROUND_ELEMENT: 'a small worn teddy bear lying abandoned on the tatami floor, sharp foreground',
    },
    visual_description:
      'The entire chapter depicts a single, continuous emotional climax in one location. The scene captures the cathartic physical embrace of the three characters, inheriting the environment from the previous chapter as they are in the same living room setting.',
    final_prompt:
      "Japanese domestic realism, cinematic film still, warm amber lighting, muted teal accents, soft window light, shallow depth of field, 8k resolution, highly detailed textures, shot on Arri Alexa., A lived-in Japanese apartment interior. The living room is cluttered with moving boxes and child's toys. A traditional wooden dining table sits in the center. In the background, a small Buddhist altar (Butsudan) holds a framed funeral photograph of a woman with a black ribbon. Low morning sun streams through sheer white curtains, illuminating dust motes in the air. Tatami flooring meets dark wood accents., Japanese man, appears mid-30s, lean oval face, hooded dark eyes, tired features, thick furrowed brows, straight nose, thin lips, pale skin with dark circles, messy short black hair, slender frame, navy blue linen button-down shirt with rolled sleeves, charcoal chinos, silver wedding band on left hand, slight stubble. eyes glistening with tears, mouth slightly open and trembling, head tilted down, Japanese woman, appears late 30s, elegant diamond face, high cheekbones, large almond eyes, thin arched brows, slender nose, porcelain pale skin, long ebony hair in low ponytail, emaciated frame with visible collarbones, oversized cream cable knit sweater, olive green pleated skirt, jade stud earrings. composed, gentle half-smile that doesn't reach the eyes, Japanese girl, 4 years old, round chubby face, large round eyes, small button nose, peach-toned skin, straight black hair with blunt bangs, petite child, yellow cotton shirt with white flowers, denim overalls, red sneakers, pink butterfly hair clip. quivering lip, eyes filling with large tears, clutching teddy bear to face, Protagonist Father seated on floor at right third, Love Interest / Sister-in-Law kneeling behind him on right third, Daughter clinging to his legs on right third, Masashi is sobbing into his hands with his head bowed low, Yuriko has her arms wrapped around his shoulders in a protective embrace, Haruka is hugging his knees tightly while looking up with a quivering lip, soft diffused window light from left, long shadow across floor, warm amber domestic glow, a small worn teddy bear lying abandoned on the tatami floor, sharp foreground, rule of thirds composition, negative space on left third and bottom 20% for subtitles, deep focus f/8, 16:9 aspect ratio, 8K resolution, ultra-detailed textures, no text, no watermark, no cluttered center --ar 16:9",
    negative_prompt:
      'anime, manga, cartoon, 3D render, CGI, stylized, western features, blue eyes, blonde hair, messy cluttered foreground, text, watermark, logo, subtitles, blurry face, extra limbs, morphed fingers, studio lighting, neon lights, high saturation, modern minimalist western furniture, heavy makeup, wide eyes, caricature, distorted proportions, multiple people merged, floating objects.',
  },
  {
    start_index: 321,
    end_index: 340,
    location_setting: 'Traditional Japanese apartment — dining area, evening',
    characters_in_scene: ['Protagonist Father', 'Love Interest / Sister-in-Law', 'Daughter'],
    expression_used: {
      'Protagonist Father': 'neutral',
      'Love Interest / Sister-in-Law': 'neutral',
      Daughter: 'neutral',
    },
    scene_variables: {
      CHARACTER_POSITIONS:
        'Masashi seated at the right third of the table, Haruka seated next to him in the lower right, Yuriko seated on the left third of the frame across from them.',
      ACTION:
        "Masashi is ruffling Haruka's hair with his right hand while looking at Yuriko, a small tray of assorted sushi sits on the table. Yuriko is leaning forward slightly, resting her chin on her hand with a gentle half-smile. Haruka is reaching for a piece of cucumber sushi (kappa maki).",
      LIGHTING_MODIFIER:
        'Warm domestic tungsten fill, soft orange glow from a hanging lamp above the table, hazy atmospheric dust motes in the warm light.',
      FOREGROUND_ELEMENT: 'A plastic sushi take-out container with several pieces of sushi remaining, sharp focus in the foreground left.',
    },
    visual_description:
      'The scene remains in the domestic interior from the previous chapter but shifts the visual focus to the dining table for a shared meal. The boundary exists to capture the transition from grief to a heartwarming, determined family dinner. The dominant visual is the trio bonded over a meal, marking a moment of peace.',
    final_prompt:
      "Japanese domestic realism, cinematic film still, warm amber lighting, muted teal accents, soft window light, shallow depth of field, 8k resolution, highly detailed textures, shot on Arri Alexa., A lived-in Japanese apartment interior. The living room is cluttered with moving boxes and child's toys. A traditional wooden dining table sits in the center. In the background, a small Buddhist altar (Butsudan) holds a framed funeral photograph of a woman with a black ribbon. Low morning sun streams through sheer white curtains, illuminating dust motes in the air. Tatami flooring meets dark wood accents., Japanese man, appears mid-30s, lean oval face, hooded dark eyes, tired features, thick furrowed brows, straight nose, thin lips, pale skin with dark circles, messy short black hair, slender frame, navy blue linen button-down shirt with rolled sleeves, charcoal chinos, silver wedding band on left hand, slight stubble. melancholic gaze, lips flat, slight tension in the brow, Japanese woman, appears late 30s, elegant diamond face, high cheekbones, large almond eyes, thin arched brows, slender nose, porcelain pale skin, long ebony hair in low ponytail, emaciated frame with visible collarbones, oversized cream cable knit sweater, olive green pleated skirt, jade stud earrings. composed, gentle half-smile that doesn't reach the eyes, Japanese girl, 4 years old, round chubby face, large round eyes, small button nose, peach-toned skin, straight black hair with blunt bangs, petite child, yellow cotton shirt with white flowers, denim overalls, red sneakers, pink butterfly hair clip. vacant, wide-eyed stare, head tilted slightly, Masashi seated at the right third of the table, Haruka seated next to him in the lower right, Yuriko seated on the left third of the frame across from them., Masashi is ruffling Haruka's hair with his right hand while looking at Yuriko, a small tray of assorted sushi sits on the table. Yuriko is leaning forward slightly, resting her chin on her hand with a gentle half-smile. Haruka is reaching for a piece of cucumber sushi (kappa maki)., Warm domestic tungsten fill, soft orange glow from a hanging lamp above the table, hazy atmospheric dust motes in the warm light., A plastic sushi take-out container with several pieces of sushi remaining, sharp focus in the foreground left., rule of thirds composition, negative space on left third and bottom 20% for subtitles, deep focus f/8, 16:9 aspect ratio, 8K resolution, ultra-detailed textures, no text, no watermark, no cluttered center --ar 16:9",
    negative_prompt:
      'anime, manga, cartoon, 3D render, CGI, stylized, western features, blue eyes, blonde hair, messy cluttered foreground, text, watermark, logo, subtitles, blurry face, extra limbs, morphed fingers, studio lighting, neon lights, high saturation, modern minimalist western furniture, heavy makeup, wide eyes, caricature, distorted proportions, multiple people merged, floating objects., bright daylight, outdoor setting, overexposed highlights, lens flare',
  },
  {
    start_index: 341,
    end_index: 354,
    location_setting: 'Traditional Japanese living room and hallway — interior, night',
    characters_in_scene: ['Protagonist Father', 'Love Interest / Sister-in-Law'],
    expression_used: {
      'Protagonist Father': 'neutral',
      'Love Interest / Sister-in-Law': 'neutral',
    },
    scene_variables: {
      CHARACTER_POSITIONS: 'Masashi standing on the left third of the frame, Yuriko standing on the right third near a sliding door.',
      ACTION:
        'Masashi is rubbing the back of his neck with a slight, shy smile, looking toward Yuriko. Yuriko is holding a folded hand towel, leaning slightly toward the doorway as she prepares to leave the room.',
      LIGHTING_MODIFIER:
        'warm domestic tungsten fill, soft golden glow from a low-placed floor lamp, deep shadows in the corners of the room',
      FOREGROUND_ELEMENT: 'the corner of the wooden dining table with a single empty ceramic tea cup, foreground blur',
    },
    visual_description:
      'The scene continues in the same domestic setting but shifts to a late-night atmosphere after the child has been put to bed. The visual focus is on the quiet, lingering connection between the two adults in the dimly lit living space.',
    final_prompt:
      "Japanese domestic realism, cinematic film still, warm amber lighting, muted teal accents, soft window light, shallow depth of field, 8k resolution, highly detailed textures, shot on Arri Alexa., A lived-in Japanese apartment interior. The living room is cluttered with moving boxes and child's toys. A traditional wooden dining table sits in the center. In the background, a small Buddhist altar (Butsudan) holds a framed funeral photograph of a woman with a black ribbon. Low morning sun streams through sheer white curtains, illuminating dust motes in the air. Tatami flooring meets dark wood accents., Japanese man, appears mid-30s, lean oval face, hooded dark eyes, tired features, thick furrowed brows, straight nose, thin lips, pale skin with dark circles, messy short black hair, slender frame, navy blue linen button-down shirt with rolled sleeves, charcoal chinos, silver wedding band on left hand, slight stubble. melancholic gaze, lips flat, slight tension in the brow, Japanese woman, appears late 30s, elegant diamond face, high cheekbones, large almond eyes, thin arched brows, slender nose, porcelain pale skin, long ebony hair in low ponytail, emaciated frame with visible collarbones, oversized cream cable knit sweater, olive green pleated skirt, jade stud earrings. composed, gentle half-smile that doesn't reach the eyes, Masashi standing on the left third of the frame, Yuriko standing on the right third near a sliding door., Masashi is rubbing the back of his neck with a slight, shy smile, looking toward Yuriko. Yuriko is holding a folded hand towel, leaning slightly toward the doorway as she prepares to leave the room., warm domestic tungsten fill, soft golden glow from a low-placed floor lamp, deep shadows in the corners of the room, the corner of the wooden dining table with a single empty ceramic tea cup, foreground blur, rule of thirds composition, negative space on right third and bottom 20% for subtitles, deep focus f/8, 16:9 aspect ratio, 8K resolution, ultra-detailed textures, no text, no watermark, no cluttered center --ar 16:9",
    negative_prompt:
      'anime, manga, cartoon, 3D render, CGI, stylized, western features, blue eyes, blonde hair, messy cluttered foreground, text, watermark, logo, subtitles, blurry face, extra limbs, morphed fingers, studio lighting, neon lights, high saturation, modern minimalist western furniture, heavy makeup, wide eyes, caricature, distorted proportions, multiple people merged, floating objects., bright daylight, outdoor setting, overexposed highlights, lens flare, third person, background crowd, extra faces',
  },
  {
    start_index: 355,
    end_index: 359,
    location_setting: 'Lived-in Japanese apartment hallway — night',
    characters_in_scene: ['Protagonist Father'],
    expression_used: {
      'Protagonist Father': 'neutral',
    },
    scene_variables: {
      CHARACTER_POSITIONS:
        'Masashi standing on the right third of the frame, looking down a dark hallway toward a glowing doorway on the left.',
      ACTION: 'Masashi is walking slowly, one hand rubbing the back of his neck, head tilted as he looks toward the light.',
      LIGHTING_MODIFIER:
        'Low-light night interior, deep shadows in the hallway, harsh cool white light spilling from a doorway on the left.',
      FOREGROUND_ELEMENT: 'Out-of-focus edge of a dark wooden door frame in the sharp foreground right.',
    },
    visual_description:
      'Initial scene establishing the transition from sleep to the discovery. The visual boundary is the move from the dark hallway to the moment before entering the washroom.',
    final_prompt:
      "Japanese domestic realism, cinematic film still, warm amber lighting, muted teal accents, soft window light, shallow depth of field, 8k resolution, highly detailed textures, shot on Arri Alexa., A lived-in Japanese apartment interior. The living room is cluttered with moving boxes and child's toys. A traditional wooden dining table sits in the center. In the background, a small Buddhist altar (Butsudan) holds a framed funeral photograph of a woman with a black ribbon. Low morning sun streams through sheer white curtains, illuminating dust motes in the air. Tatami flooring meets dark wood accents., Japanese man, appears mid-30s, lean oval face, hooded dark eyes, tired features, thick furrowed brows, straight nose, thin lips, pale skin with dark circles, messy short black hair, slender frame, navy blue linen button-down shirt with rolled sleeves, charcoal chinos, silver wedding band on left hand, slight stubble. melancholic gaze, lips flat, slight tension in the brow, Masashi standing on the right third of the frame, looking down a dark hallway toward a glowing doorway on the left., Masashi is walking slowly, one hand rubbing the back of his neck, head tilted as he looks toward the light., Low-light night interior, deep shadows in the hallway, harsh cool white light spilling from a doorway on the left., Out-of-focus edge of a dark wooden door frame in the sharp foreground right., rule of thirds composition, negative space on left third and bottom 20% for subtitles, deep focus f/8, 16:9 aspect ratio, 8K resolution, ultra-detailed textures, no text, no watermark, no cluttered center --ar 16:9",
    negative_prompt:
      'anime, manga, cartoon, 3D render, CGI, stylized, western features, blue eyes, blonde hair, messy cluttered foreground, text, watermark, logo, subtitles, blurry face, extra limbs, morphed fingers, studio lighting, neon lights, high saturation, modern minimalist western furniture, heavy makeup, wide eyes, caricature, distorted proportions, multiple people merged, floating objects., bright daylight, outdoor setting, overexposed highlights, lens flare, multiple people, crowd, background figures',
  },
  {
    start_index: 360,
    end_index: 377,
    location_setting: 'Japanese washroom interior — interior night',
    characters_in_scene: ['Protagonist Father', 'Love Interest / Sister-in-Law'],
    expression_used: {
      'Protagonist Father': 'angry',
      'Love Interest / Sister-in-Law': 'sad_or_vulnerable',
    },
    scene_variables: {
      CHARACTER_POSITIONS: 'Yuriko standing on left third in profile, looking down; Masashi frozen in the doorway on the right third.',
      ACTION:
        'Yuriko is clutching a dark grey wool coat to her chest, trying to hide her tank-top-clad upper body where her ribs and skeletal collarbones are visible; Masashi is staring wide-eyed, jaw locked.',
      LIGHTING_MODIFIER: 'single overhead lamp, harsh downward shadows, no fill light, clinical cool fluorescent glow',
      FOREGROUND_ELEMENT: 'A chrome faucet and edge of a white ceramic sink, foreground blur left.',
    },
    visual_description:
      "The shocking reveal of Yuriko's physical state. The visual boundary is the physical opening of the door and the high-contrast lighting of the washroom revealing the emaciation.",
    final_prompt:
      "Japanese domestic realism, cinematic film still, warm amber lighting, muted teal accents, soft window light, shallow depth of field, 8k resolution, highly detailed textures, shot on Arri Alexa., A lived-in Japanese apartment interior. The living room is cluttered with moving boxes and child's toys. A traditional wooden dining table sits in the center. In the background, a small Buddhist altar (Butsudan) holds a framed funeral photograph of a woman with a black ribbon. Low morning sun streams through sheer white curtains, illuminating dust motes in the air. Tatami flooring meets dark wood accents., Japanese man, appears mid-30s, lean oval face, hooded dark eyes, tired features, thick furrowed brows, straight nose, thin lips, pale skin with dark circles, messy short black hair, slender frame, navy blue linen button-down shirt with rolled sleeves, charcoal chinos, silver wedding band on left hand, slight stubble. brows sharply furrowed, jaw locked, eyes wide with desperate intensity, Japanese woman, appears late 30s, elegant diamond face, high cheekbones, large almond eyes, thin arched brows, slender nose, porcelain pale skin, long ebony hair in low ponytail, emaciated frame with visible collarbones, oversized cream cable knit sweater, olive green pleated skirt, jade stud earrings. heavy weeping, face buried in hands, shoulders shaking, eyes red-rimmed, Yuriko standing on left third in profile, looking down; Masashi frozen in the doorway on the right third., Yuriko is clutching a dark grey wool coat to her chest, trying to hide her tank-top-clad upper body where her ribs and skeletal collarbones are visible; Masashi is staring wide-eyed, jaw locked., single overhead lamp, harsh downward shadows, no fill light, clinical cool fluorescent glow, A chrome faucet and edge of a white ceramic sink, foreground blur left., rule of thirds composition, negative space on right third and bottom 20% for subtitles, deep focus f/8, 16:9 aspect ratio, 8K resolution, ultra-detailed textures, no text, no watermark, no cluttered center --ar 16:9",
    negative_prompt:
      'anime, manga, cartoon, 3D render, CGI, stylized, western features, blue eyes, blonde hair, messy cluttered foreground, text, watermark, logo, subtitles, blurry face, extra limbs, morphed fingers, studio lighting, neon lights, high saturation, modern minimalist western furniture, heavy makeup, wide eyes, caricature, distorted proportions, multiple people merged, floating objects., calm expression, smiling face, relaxed posture, bright daylight, outdoor setting, overexposed highlights, lens flare, third person, background crowd, extra faces',
  },
  {
    start_index: 378,
    end_index: 384,
    location_setting: 'Japanese washroom interior — interior night',
    characters_in_scene: ['Protagonist Father', 'Love Interest / Sister-in-Law'],
    expression_used: {
      'Protagonist Father': 'sad_or_vulnerable',
      'Love Interest / Sister-in-Law': 'sad_or_vulnerable',
    },
    scene_variables: {
      CHARACTER_POSITIONS: 'Masashi in the center-left, Yuriko turning away toward the right third.',
      ACTION:
        "Masashi is gripping Yuriko's skeletal wrist with his hand, his eyes wide and glistening; Yuriko is pulling away, head bowed, face partially hidden by stray hair strands.",
      LIGHTING_MODIFIER: 'harsh downward shadows from above, cold tungsten fill, high contrast',
      FOREGROUND_ELEMENT: "Handheld shot feel, sharp focus on the silver wedding band on Masashi's hand as it grips the wrist.",
    },
    visual_description:
      'Physical confrontation shift. Masashi stops Yuriko from fleeing. The tactile horror of feeling her thin wrist reframes the scene from observation to physical intervention.',
    final_prompt:
      "Japanese domestic realism, cinematic film still, warm amber lighting, muted teal accents, soft window light, shallow depth of field, 8k resolution, highly detailed textures, shot on Arri Alexa., A lived-in Japanese apartment interior. The living room is cluttered with moving boxes and child's toys. A traditional wooden dining table sits in the center. In the background, a small Buddhist altar (Butsudan) holds a framed funeral photograph of a woman with a black ribbon. Low morning sun streams through sheer white curtains, illuminating dust motes in the air. Tatami flooring meets dark wood accents., Japanese man, appears mid-30s, lean oval face, hooded dark eyes, tired features, thick furrowed brows, straight nose, thin lips, pale skin with dark circles, messy short black hair, slender frame, navy blue linen button-down shirt with rolled sleeves, charcoal chinos, silver wedding band on left hand, slight stubble. eyes glistening with tears, mouth slightly open and trembling, head tilted down, Japanese woman, appears late 30s, elegant diamond face, high cheekbones, large almond eyes, thin arched brows, slender nose, porcelain pale skin, long ebony hair in low ponytail, emaciated frame with visible collarbones, oversized cream cable knit sweater, olive green pleated skirt, jade stud earrings. heavy weeping, face buried in hands, shoulders shaking, eyes red-rimmed, Masashi in the center-left, Yuriko turning away toward the right third., Masashi is gripping Yuriko's skeletal wrist with his hand, his eyes wide and glistening; Yuriko is pulling away, head bowed, face partially hidden by stray hair strands., harsh downward shadows from above, cold tungsten fill, high contrast, Handheld shot feel, sharp focus on the silver wedding band on Masashi's hand as it grips the wrist., rule of thirds composition, negative space on right third and bottom 20% for subtitles, deep focus f/8, 16:9 aspect ratio, 8K resolution, ultra-detailed textures, no text, no watermark, no cluttered center --ar 16:9",
    negative_prompt:
      'anime, manga, cartoon, 3D render, CGI, stylized, western features, blue eyes, blonde hair, messy cluttered foreground, text, watermark, logo, subtitles, blurry face, extra limbs, morphed fingers, studio lighting, neon lights, high saturation, modern minimalist western furniture, heavy makeup, wide eyes, caricature, distorted proportions, multiple people merged, floating objects., bright daylight, outdoor setting, overexposed highlights, lens flare, third person, background crowd, extra faces',
  },
  {
    start_index: 385,
    end_index: 395,
    location_setting: 'Traditional Japanese apartment interior — hallway to living room',
    characters_in_scene: ['Protagonist Father', 'Love Interest / Sister-in-Law'],
    expression_used: {
      'Protagonist Father': 'neutral',
      'Love Interest / Sister-in-Law': 'sad_or_vulnerable',
    },
    scene_variables: {
      CHARACTER_POSITIONS: 'Masashi standing on left third, Yuriko standing on right third with her back slightly to the camera',
      ACTION: "Masashi is gently holding Yuriko's wrist, leading her toward the light of the living room while she looks down at the floor",
      LIGHTING_MODIFIER: 'Dim hallway lighting, soft spill of warm light from the doorway ahead, long shadows',
      FOREGROUND_ELEMENT: 'blurred wooden door frame on the far left edge',
    },
    visual_description:
      'A transitional scene where Masashi moves Yuriko from the shock of the washroom discovery to the living room for a serious conversation. The movement establishes his protective role and her vulnerability.',
    final_prompt:
      "Japanese domestic realism, cinematic film still, warm amber lighting, muted teal accents, soft window light, shallow depth of field, 8k resolution, highly detailed textures, shot on Arri Alexa., A lived-in Japanese apartment interior. The living room is cluttered with moving boxes and child's toys. A traditional wooden dining table sits in the center. In the background, a small Buddhist altar (Butsudan) holds a framed funeral photograph of a woman with a black ribbon. Low morning sun streams through sheer white curtains, illuminating dust motes in the air. Tatami flooring meets dark wood accents., Japanese man, appears mid-30s, lean oval face, hooded dark eyes, tired features, thick furrowed brows, straight nose, thin lips, pale skin with dark circles, messy short black hair, slender frame, navy blue linen button-down shirt with rolled sleeves, charcoal chinos, silver wedding band on left hand, slight stubble. melancholic gaze, lips flat, slight tension in the brow, Japanese woman, appears late 30s, elegant diamond face, high cheekbones, large almond eyes, thin arched brows, slender nose, porcelain pale skin, long ebony hair in low ponytail, emaciated frame with visible collarbones, oversized cream cable knit sweater, olive green pleated skirt, jade stud earrings. heavy weeping, face buried in hands, shoulders shaking, eyes red-rimmed, Masashi standing on left third, Yuriko standing on right third with her back slightly to the camera, Masashi is gently holding Yuriko's wrist, leading her toward the light of the living room while she looks down at the floor, Dim hallway lighting, soft spill of warm light from the doorway ahead, long shadows, blurred wooden door frame on the far left edge, rule of thirds composition, negative space on right third and bottom 20% for subtitles, deep focus f/8, 16:9 aspect ratio, 8K resolution, ultra-detailed textures, no text, no watermark, no cluttered center --ar 16:9",
    negative_prompt:
      'anime, manga, cartoon, 3D render, CGI, stylized, western features, blue eyes, blonde hair, messy cluttered foreground, text, watermark, logo, subtitles, blurry face, extra limbs, morphed fingers, studio lighting, neon lights, high saturation, modern minimalist western furniture, heavy makeup, wide eyes, caricature, distorted proportions, multiple people merged, floating objects, previous location elements, washroom interior',
  },
  {
    start_index: 396,
    end_index: 426,
    location_setting: 'Traditional Japanese living room interior — night',
    characters_in_scene: ['Protagonist Father', 'Love Interest / Sister-in-Law'],
    expression_used: {
      'Protagonist Father': 'sad_or_vulnerable',
      'Love Interest / Sister-in-Law': 'sad_or_vulnerable',
    },
    scene_variables: {
      CHARACTER_POSITIONS: 'Yuriko seated on a sofa on left third, Masashi seated on a low chair on right third',
      ACTION:
        'Yuriko sits with her head bowed low, fingers interlocked and resting on her knees, Masashi leans forward with his elbows on his knees, listening with a pained expression',
      LIGHTING_MODIFIER:
        "soft domestic tungsten fill, low-key lighting, heavy shadows on Yuriko's face to emphasize her emaciated features",
      FOREGROUND_ELEMENT: 'a small ceramic teacup on a low wooden table, steam rising slightly, out-of-focus foreground',
    },
    visual_description:
      "The core emotional confession. The scene focuses on the heavy, exhausted honesty of Yuriko's plight. The atmosphere is thick with shared melancholy and the weight of the revealed debt.",
    final_prompt:
      "Japanese domestic realism, cinematic film still, warm amber lighting, muted teal accents, soft window light, shallow depth of field, 8k resolution, highly detailed textures, shot on Arri Alexa., A lived-in Japanese apartment interior. The living room is cluttered with moving boxes and child's toys. A traditional wooden dining table sits in the center. In the background, a small Buddhist altar (Butsudan) holds a framed funeral photograph of a woman with a black ribbon. Low morning sun streams through sheer white curtains, illuminating dust motes in the air. Tatami flooring meets dark wood accents., Japanese man, appears mid-30s, lean oval face, hooded dark eyes, tired features, thick furrowed brows, straight nose, thin lips, pale skin with dark circles, messy short black hair, slender frame, navy blue linen button-down shirt with rolled sleeves, charcoal chinos, silver wedding band on left hand, slight stubble. eyes glistening with tears, mouth slightly open and trembling, head tilted down, Japanese woman, appears late 30s, elegant diamond face, high cheekbones, large almond eyes, thin arched brows, slender nose, porcelain pale skin, long ebony hair in low ponytail, emaciated frame with visible collarbones, oversized cream cable knit sweater, olive green pleated skirt, jade stud earrings. heavy weeping, face buried in hands, shoulders shaking, eyes red-rimmed, Yuriko seated on a sofa on left third, Masashi seated on a low chair on right third, Yuriko sits with her head bowed low, fingers interlocked and resting on her knees, Masashi leans forward with his elbows on his knees, listening with a pained expression, soft domestic tungsten fill, low-key lighting, heavy shadows on Yuriko's face to emphasize her emaciated features, a small ceramic teacup on a low wooden table, steam rising slightly, out-of-focus foreground, rule of thirds composition, negative space on right third and bottom 20% for subtitles, deep focus f/8, 16:9 aspect ratio, 8K resolution, ultra-detailed textures, no text, no watermark, no cluttered center --ar 16:9",
    negative_prompt:
      'anime, manga, cartoon, 3D render, CGI, stylized, western features, blue eyes, blonde hair, messy cluttered foreground, text, watermark, logo, subtitles, blurry face, extra limbs, morphed fingers, studio lighting, neon lights, high saturation, modern minimalist western furniture, heavy makeup, wide eyes, caricature, distorted proportions, multiple people merged, floating objects, bright daylight, outdoor setting, overexposed highlights, lens flare, calm expression, smiling face, relaxed posture',
  },
  {
    start_index: 427,
    end_index: 441,
    location_setting: 'Traditional Japanese apartment living room — interior, evening',
    characters_in_scene: ['Protagonist Father', 'Love Interest / Sister-in-Law'],
    expression_used: {
      'Protagonist Father': 'sad_or_vulnerable',
      'Love Interest / Sister-in-Law': 'sad_or_vulnerable',
    },
    scene_variables: {
      CHARACTER_POSITIONS:
        'Yuriko sitting on the left third of the sofa, shoulders hunched and head low, Masashi sitting on the right third, leaning in toward her with a look of shock and concern.',
      ACTION:
        'Yuriko is gripping the edge of her oversized sweater with trembling hands, her head bowed as she speaks. Masashi is leaning forward, hands on his knees, staring at her as the truth about her sold home sinks in.',
      LIGHTING_MODIFIER:
        'Dim domestic tungsten light from a low lamp, casting long, soft shadows; dark teal evening light through the window glass.',
      FOREGROUND_ELEMENT:
        'A few small cardboard moving boxes stacked on the floor, sharp foreground right, adding to the feeling of displacement.',
    },
    visual_description:
      'This scene establishes the shocking revelation that Yuriko has lost her home. It maintains the environment from the previous chapter but shifts the visual context to the intense emotional confession and the visible evidence of her minimal belongings.',
    final_prompt:
      "Japanese domestic realism, cinematic film still, warm amber lighting, muted teal accents, soft window light, shallow depth of field, 8k resolution, highly detailed textures, shot on Arri Alexa., A lived-in Japanese apartment interior. The living room is cluttered with moving boxes and child's toys. A traditional wooden dining table sits in the center. In the background, a small Buddhist altar (Butsudan) holds a framed funeral photograph of a woman with a black ribbon. Low morning sun streams through sheer white curtains, illuminating dust motes in the air. Tatami flooring meets dark wood accents., Japanese man, appears mid-30s, lean oval face, hooded dark eyes, tired features, thick furrowed brows, straight nose, thin lips, pale skin with dark circles, messy short black hair, slender frame, navy blue linen button-down shirt with rolled sleeves, charcoal chinos, silver wedding band on left hand, slight stubble. eyes glistening with tears, mouth slightly open and trembling, head tilted down, Japanese woman, appears late 30s, elegant diamond face, high cheekbones, large almond eyes, thin arched brows, slender nose, porcelain pale skin, long ebony hair in low ponytail, emaciated frame with visible collarbones, oversized cream cable knit sweater, olive green pleated skirt, jade stud earrings. heavy weeping, face buried in hands, shoulders shaking, eyes red-rimmed, Yuriko sitting on the left third of the sofa, shoulders hunched and head low, Masashi sitting on the right third, leaning in toward her with a look of shock and concern., Yuriko is gripping the edge of her oversized sweater with trembling hands, her head bowed as she speaks. Masashi is leaning forward, hands on his knees, staring at her as the truth about her sold home sinks in., Dim domestic tungsten light from a low lamp, casting long, soft shadows; dark teal evening light through the window glass., A few small cardboard moving boxes stacked on the floor, sharp foreground right, adding to the feeling of displacement., rule of thirds composition, negative space on right third and bottom 20% for subtitles, deep focus f/8, 16:9 aspect ratio, 8K resolution, ultra-detailed textures, no text, no watermark, no cluttered center --ar 16:9",
    negative_prompt:
      'anime, manga, cartoon, 3D render, CGI, stylized, western features, blue eyes, blonde hair, messy cluttered foreground, text, watermark, logo, subtitles, blurry face, extra limbs, morphed fingers, studio lighting, neon lights, high saturation, modern minimalist western furniture, heavy makeup, wide eyes, caricature, distorted proportions, multiple people merged, floating objects., calm expression, smiling face, relaxed posture, bright daylight, outdoor setting, overexposed highlights, lens flare',
  },
  {
    start_index: 442,
    end_index: 469,
    location_setting: 'Traditional Japanese apartment living room — interior, late night',
    characters_in_scene: ['Protagonist Father', 'Love Interest / Sister-in-Law'],
    expression_used: {
      'Protagonist Father': 'sad_or_vulnerable',
      'Love Interest / Sister-in-Law': 'sad_or_vulnerable',
    },
    scene_variables: {
      CHARACTER_POSITIONS:
        'Masashi seated in the center-right third, Yuriko leaning against him with her face buried in his chest on the center-left third.',
      ACTION:
        "Masashi is gently placing his hand over Yuriko's thin, frail hand as she leans her head against his chest, her shoulders shaking with heavy sobs. Masashi has his other arm wrapped protectively around her shoulder.",
      LIGHTING_MODIFIER:
        'Single overhead lamp dimmed, harsh downward shadows mixed with soft warm fill, creating a sense of private sanctuary.',
      FOREGROUND_ELEMENT: 'An empty ceramic tea cup on a low wooden coffee table, out of focus in the bottom left third.',
    },
    visual_description:
      'The climax of the chapter where the physical distance between them closes. This scene captures the transition to physical contact and mutual reliance, marking a major visual and narrative context shift from conversation to physical protection.',
    final_prompt:
      "Japanese domestic realism, cinematic film still, warm amber lighting, muted teal accents, soft window light, shallow depth of field, 8k resolution, highly detailed textures, shot on Arri Alexa., A lived-in Japanese apartment interior. The living room is cluttered with moving boxes and child's toys. A traditional wooden dining table sits in the center. In the background, a small Buddhist altar (Butsudan) holds a framed funeral photograph of a woman with a black ribbon. Low morning sun streams through sheer white curtains, illuminating dust motes in the air. Tatami flooring meets dark wood accents., Japanese man, appears mid-30s, lean oval face, hooded dark eyes, tired features, thick furrowed brows, straight nose, thin lips, pale skin with dark circles, messy short black hair, slender frame, navy blue linen button-down shirt with rolled sleeves, charcoal chinos, silver wedding band on left hand, slight stubble. eyes glistening with tears, mouth slightly open and trembling, head tilted down, Japanese woman, appears late 30s, elegant diamond face, high cheekbones, large almond eyes, thin arched brows, slender nose, porcelain pale skin, long ebony hair in low ponytail, emaciated frame with prestigious collarbones, oversized cream cable knit sweater, olive green pleated skirt, jade stud earrings. heavy weeping, face buried in hands, shoulders shaking, eyes red-rimmed, Masashi seated in the center-right third, Yuriko leaning against him with her face buried in his chest on the center-left third., Masashi is gently placing his hand over Yuriko's thin, frail hand as she leans her head against his chest, her shoulders shaking with heavy sobs. Masashi has his other arm wrapped protectively around her shoulder., Single overhead lamp dimmed, harsh downward shadows mixed with soft warm fill, creating a sense of private sanctuary., An empty ceramic tea cup on a low wooden coffee table, out of focus in the bottom left third., rule of thirds composition, negative space on left third and bottom 20% for subtitles, deep focus f/8, 16:9 aspect ratio, 8K resolution, ultra-detailed textures, no text, no watermark, no cluttered center --ar 16:9",
    negative_prompt:
      'anime, manga, cartoon, 3D render, CGI, stylized, western features, blue eyes, blonde hair, messy cluttered foreground, text, watermark, logo, subtitles, blurry face, extra limbs, morphed fingers, studio lighting, neon lights, high saturation, modern minimalist western furniture, heavy makeup, wide eyes, caricature, distorted proportions, multiple people merged, floating objects., calm expression, smiling face, relaxed posture, bright daylight, outdoor setting, overexposed highlights, lens flare',
  },
  {
    start_index: 470,
    end_index: 494,
    location_setting: 'Traditional Japanese apartment dining area — interior, morning',
    characters_in_scene: ['Protagonist Father', 'Love Interest / Sister-in-Law', 'Daughter'],
    expression_used: {
      'Protagonist Father': 'neutral',
      'Love Interest / Sister-in-Law': 'neutral',
      Daughter: 'neutral',
    },
    scene_variables: {
      CHARACTER_POSITIONS:
        'Masashi and Haruka seated at the right third of the table, Yuriko standing at the left third near the kitchen counter.',
      ACTION:
        "Masashi and Haruka have their hands clasped together in a traditional 'itadakimasu' prayer gesture; Yuriko is leaning against the counter with a bright smile watching them.",
      LIGHTING_MODIFIER: 'High-key morning sunlight streaming through curtains, heavy lens flare, vibrant highlights',
      FOREGROUND_ELEMENT:
        'A spread of colorful Japanese breakfast dishes: grilled fish, miso soup, and tamagoyaki in sharp foreground focus.',
    },
    visual_description:
      "The scene marks a major visual context shift from the heavy emotional darkness of the previous chapter to a bright, vibrant morning. This is the central visual moment where the family unit is revitalized by Yuriko's cooking, using the breakfast table as the anchor for their new happiness.",
    final_prompt:
      "Japanese domestic realism, cinematic film still, warm amber lighting, muted teal accents, soft window light, shallow depth of field, 8k resolution, highly detailed textures, shot on Arri Alexa., A lived-in Japanese apartment interior. The living room is cluttered with moving boxes and child's toys. A traditional wooden dining table sits in the center. In the background, a small Buddhist altar (Butsudan) holds a framed funeral photograph of a woman with a black ribbon. Low morning sun streams through sheer white curtains, illuminating dust motes in the air. Tatami flooring meets dark wood accents., Japanese man, appears mid-30s, lean oval face, hooded dark eyes, tired features, thick furrowed brows, straight nose, thin lips, pale skin with dark circles, messy short black hair, slender frame, navy blue linen button-down shirt with rolled sleeves, charcoal chinos, silver wedding band on left hand, slight stubble. melancholic gaze, lips flat, slight tension in the brow, Japanese woman, appears late 30s, elegant diamond face, high cheekbones, large almond eyes, thin arched brows, slender nose, porcelain pale skin, long ebony hair in low ponytail, emaciated frame with visible collarbones, oversized cream cable knit sweater, olive green pleated skirt, jade stud earrings. composed, gentle half-smile that doesn't reach the eyes, Japanese girl, 4 years old, round chubby face, large round eyes, small button nose, peach-toned skin, straight black hair with blunt bangs, petite child, yellow cotton shirt with white flowers, denim overalls, red sneakers, pink butterfly hair clip. vacant, wide-eyed stare, head tilted slightly, Masashi and Haruka seated at the right third of the table, Yuriko standing at the left third near the kitchen counter., Masashi and Haruka have their hands clasped together in a traditional 'itadakimasu' prayer gesture; Yuriko is leaning against the counter with a bright smile watching them., High-key morning sunlight streaming through curtains, heavy lens flare, vibrant highlights, A spread of colorful Japanese breakfast dishes: grilled fish, miso soup, and tamagoyaki in sharp foreground focus., rule of thirds composition, negative space on left third and bottom 20% for subtitles, deep focus f/8, 16:9 aspect ratio, 8K resolution, ultra-detailed textures, no text, no watermark, no cluttered center --ar 16:9",
    negative_prompt:
      'anime, manga, cartoon, 3D render, CGI, stylized, western features, blue eyes, blonde hair, messy cluttered foreground, text, watermark, logo, subtitles, blurry face, extra limbs, morphed fingers, studio lighting, neon lights, high saturation, modern minimalist western furniture, heavy makeup, wide eyes, caricature, distorted proportions, multiple people merged, floating objects, third person, background crowd, extra faces',
  },
  {
    start_index: 495,
    end_index: 520,
    location_setting: 'Lived-in Japanese apartment — kitchen and dining area, late morning',
    characters_in_scene: ['Protagonist Father', 'Love Interest / Sister-in-Law'],
    expression_used: {
      'Protagonist Father': 'neutral',
      'Love Interest / Sister-in-Law': 'neutral',
    },
    scene_variables: {
      CHARACTER_POSITIONS:
        'Yuriko standing at the kitchen sink on the left third, Masashi standing by the dining table on the right third.',
      ACTION:
        'Yuriko is washing a ceramic plate with soapy hands, turning her head back toward Masashi. Masashi is holding a stack of used dishes, standing completely still and staring at her with wide eyes.',
      LIGHTING_MODIFIER:
        'Bright morning sun through sheer curtains, creating a soft glowing rim light on Yuriko’s silhouette; warm indoor tungsten fill.',
      FOREGROUND_ELEMENT: 'A wooden drying rack with wet glasses on the kitchen counter, sharp foreground focus.',
    },
    visual_description:
      'A single continuous scene in the kitchen where a practical conversation about work transitions into a moment of romantic realization. The visual boundary is maintained within the kitchen/dining area as the transcript focuses on their dialogue and the emotional shift during dishwashing.',
    final_prompt:
      "Japanese domestic realism, cinematic film still, warm amber lighting, muted teal accents, soft window light, shallow depth of field, 8k resolution, highly detailed textures, shot on Arri Alexa., A lived-in Japanese apartment interior. The living room is cluttered with moving boxes and child's toys. A traditional wooden dining table sits in the center. In the background, a small Buddhist altar (Butsudan) holds a framed funeral photograph of a woman with a black ribbon. Low morning sun streams through sheer white curtains, illuminating dust motes in the air. Tatami flooring meets dark wood accents., Japanese man, appears mid-30s, lean oval face, hooded dark eyes, tired features, thick furrowed brows, straight nose, thin lips, pale skin with dark circles, messy short black hair, slender frame, navy blue linen button-down shirt with rolled sleeves, charcoal chinos, silver wedding band on left hand, slight stubble. melancholic gaze, lips flat, slight tension in the brow, Japanese woman, appears late 30s, elegant diamond face, high cheekbones, large almond eyes, thin arched brows, slender nose, porcelain pale skin, long ebony hair in low ponytail, emaciated frame with visible collarbones, oversized cream cable knit sweater, olive green pleated skirt, jade stud earrings. composed, gentle half-smile that doesn't reach the eyes, Yuriko standing at the kitchen sink on the left third, Masashi standing by the dining table on the right third., Yuriko is washing a ceramic plate with soapy hands, turning her head back toward Masashi. Masashi is holding a stack of used dishes, standing completely still and staring at her with wide eyes., Bright morning sun through sheer curtains, creating a soft glowing rim light on Yuriko’s silhouette; warm indoor tungsten fill., A wooden drying rack with wet glasses on the kitchen counter, sharp foreground focus., rule of thirds composition, negative space on left third and bottom 20% for subtitles, deep focus f/8, 16:9 aspect ratio, 8K resolution, ultra-detailed textures, no text, no watermark, no cluttered center --ar 16:9",
    negative_prompt:
      'anime, manga, cartoon, 3D render, CGI, stylized, western features, blue eyes, blonde hair, messy cluttered foreground, text, watermark, logo, subtitles, blurry face, extra limbs, morphed fingers, studio lighting, neon lights, high saturation, modern minimalist western furniture, heavy makeup, wide eyes, caricature, distorted proportions, multiple people merged, floating objects., third person, background crowd, extra faces',
  },
  {
    start_index: 521,
    end_index: 531,
    location_setting: 'Traditional Japanese apartment — genkan (entranceway)',
    characters_in_scene: ['Protagonist Father', 'Daughter'],
    expression_used: {
      'Protagonist Father': 'neutral',
      Daughter: 'neutral',
    },
    scene_variables: {
      CHARACTER_POSITIONS: 'Masashi standing on left third near the door, Haruka standing on right third looking back toward the interior',
      ACTION:
        'Masashi is holding a small colorful backpack and reaching for the door handle, Haruka is waving her small hand back toward the unseen living room with a slightly tilted head',
      LIGHTING_MODIFIER: 'soft morning light from the open door creating a silhouette effect, cool shadows in the hallway',
      FOREGROUND_ELEMENT: 'a neat row of polished leather shoes and small red sneakers on the stone floor, foreground blur',
    },
    visual_description:
      "The scene marks a transition from the domestic interior to the outside world. The 'genkan' is a classic Japanese boundary. Haruka's apology at the door creates the first visual beat of mystery.",
    final_prompt:
      "Japanese domestic realism, cinematic film still, warm amber lighting, muted teal accents, soft window light, shallow depth of field, 8k resolution, highly detailed textures, shot on Arri Alexa., A lived-in Japanese apartment interior. The living room is cluttered with moving boxes and child's toys. A traditional wooden dining table sits in the center. In the background, a small Buddhist altar (Butsudan) holds a framed funeral photograph of a woman with a black ribbon. Low morning sun streams through sheer white curtains, illuminating dust motes in the air. Tatami flooring meets dark wood accents., Japanese man, appears mid-30s, lean oval face, hooded dark eyes, tired features, thick furrowed brows, straight nose, thin lips, pale skin with dark circles, messy short black hair, slender frame, navy blue linen button-down shirt with rolled sleeves, charcoal chinos, silver wedding band on left hand, slight stubble. melancholic gaze, lips flat, slight tension in the brow, Japanese girl, 4 years old, round chubby face, large round eyes, small button nose, peach-toned skin, straight black hair with blunt bangs, petite child, yellow cotton shirt with white flowers, denim overalls, red sneakers, pink butterfly hair clip. vacant, wide-eyed stare, head tilted slightly, Masashi standing on left third near the door, Haruka standing on right third looking back toward the interior, Masashi is holding a small colorful backpack and reaching for the door handle, Haruka is waving her small hand back toward the unseen living room with a slightly tilted head, soft morning light from the open door creating a silhouette effect, cool shadows in the hallway, a neat row of polished leather shoes and small red sneakers on the stone floor, foreground blur, rule of thirds composition, negative space on right third and bottom 20% for subtitles, deep focus f/8, 16:9 aspect ratio, 8K resolution, ultra-detailed textures, no text, no watermark, no cluttered center --ar 16:9",
    negative_prompt:
      'anime, manga, cartoon, 3D render, CGI, stylized, western features, blue eyes, blonde hair, messy cluttered foreground, text, watermark, logo, subtitles, blurry face, extra limbs, morphed fingers, studio lighting, neon lights, high saturation, modern minimalist western furniture, heavy makeup, wide eyes, caricature, distorted proportions, multiple people merged, floating objects, third person, background crowd, extra faces',
  },
  {
    start_index: 532,
    end_index: 567,
    location_setting: 'Interior of a car — roadside, morning',
    characters_in_scene: ['Protagonist Father', 'Daughter'],
    expression_used: {
      'Protagonist Father': 'sad_or_vulnerable',
      Daughter: 'sad_or_vulnerable',
    },
    scene_variables: {
      CHARACTER_POSITIONS: 'Masashi leaning into the right third of the frame, Haruka seated in a car seat on the left third',
      ACTION:
        "Masashi is pulling Haruka into a tight, protective embrace while still sitting in the driver's seat, Haruka is clutching a worn teddy bear to her chest with a quivering lip",
      LIGHTING_MODIFIER: 'Dappled sunlight through the car window, high contrast between bright exterior and somber interior car shadows',
      FOREGROUND_ELEMENT: 'the textured leather of the steering wheel in the lower right, sharp foreground detail',
    },
    visual_description:
      "The car is pulled to the side of the road, creating a private, enclosed space for the haunting revelation about Maiko. The focus is on the physical embrace and the emotional weight of the daughter's words.",
    final_prompt:
      "Japanese domestic realism, cinematic film still, warm amber lighting, muted teal accents, soft window light, shallow depth of field, 8k resolution, highly detailed textures, shot on Arri Alexa., A lived-in Japanese apartment interior. The living room is cluttered with moving boxes and child's toys. A traditional wooden dining table sits in the center. In the background, a small Buddhist altar (Butsudan) holds a framed funeral photograph of a woman with a black ribbon. Low morning sun streams through sheer white curtains, illuminating dust motes in the air. Tatami flooring meets dark wood accents., Japanese man, appears mid-30s, lean oval face, hooded dark eyes, tired features, thick furrowed brows, straight nose, thin lips, pale skin with dark circles, messy short black hair, slender frame, navy blue linen button-down shirt with rolled sleeves, charcoal chinos, silver wedding band on left hand, slight stubble. eyes glistening with tears, mouth slightly open and trembling, head tilted down, Japanese girl, 4 years old, round chubby face, large round eyes, small button nose, peach-toned skin, straight black hair with blunt bangs, petite child, yellow cotton shirt with white flowers, denim overalls, red sneakers, pink butterfly hair clip. quivering lip, eyes filling with large tears, clutching teddy bear to face, Masashi leaning into the right third of the frame, Haruka seated in a car seat on the left third, Masashi is pulling Haruka into a tight, protective embrace while still sitting in the driver's seat, Haruka is clutching a worn teddy bear to her chest with a quivering lip, Dappled sunlight through the car window, high contrast between bright exterior and somber interior car shadows, the textured leather of the steering wheel in the lower right, sharp foreground detail, rule of thirds composition, negative space on left third and bottom 20% for subtitles, deep focus f/8, 16:9 aspect ratio, 8K resolution, ultra-detailed textures, no text, no watermark, no cluttered center --ar 16:9",
    negative_prompt:
      'anime, manga, cartoon, 3D render, CGI, stylized, western features, blue eyes, blonde hair, messy cluttered foreground, text, watermark, logo, subtitles, blurry face, extra limbs, morphed fingers, studio lighting, neon lights, high saturation, modern minimalist western furniture, heavy makeup, wide eyes, caricature, distorted proportions, multiple people merged, floating objects, third person, background crowd, extra faces, previous location elements, apartment entranceway',
  },
  {
    start_index: 568,
    end_index: 571,
    location_setting: 'Japanese corporate office — interior, daytime',
    characters_in_scene: ['Protagonist Father'],
    expression_used: {
      'Protagonist Father': 'neutral',
    },
    scene_variables: {
      CHARACTER_POSITIONS: 'Masashi standing on the left third of the frame, facing a blurred silhouette of a manager on the right.',
      ACTION:
        'Masashi is gesturing emphatically with one hand while holding a leather briefcase in the other, speaking with visible earnestness.',
      LIGHTING_MODIFIER: 'hazy atmospheric dust motes, bright diffused morning light through office blinds, cool teal shadows.',
      FOREGROUND_ELEMENT: 'An out-of-focus office telephone and stacked documents on a desk, foreground right.',
    },
    visual_description:
      "New location shift from the previous chapter's roadside car interior to a professional office. Establishes the start of Masashi's effort to help Yuriko.",
    final_prompt:
      'Japanese domestic realism, cinematic film still, warm amber lighting, muted teal accents, soft window light, shallow depth of field, 8k resolution, highly detailed textures, shot on Arri Alexa., Japanese domestic realism interior office. The room features dark wood desks and organized paperwork. Large windows with blinds allow diffused morning light to stream through, illuminating dust motes in the air. Modern yet functional Japanese corporate aesthetic., Japanese man, appears mid-30s, lean oval face, hooded dark eyes, tired features, thick furrowed brows, straight nose, thin lips, pale skin with dark circles, messy short black hair, slender frame, navy blue linen button-down shirt with rolled sleeves, charcoal chinos, silver wedding band on left hand, slight stubble. melancholic gaze, lips flat, slight tension in the brow, Masashi standing on the left third of the frame, facing a blurred silhouette of a manager on the right., Masashi is gesturing emphatically with one hand while holding a leather briefcase in the other, speaking with visible earnestness., hazy atmospheric dust motes, bright diffused morning light through office blinds, cool teal shadows., An out-of-focus office telephone and stacked documents on a desk, foreground right., rule of thirds composition, negative space on right third and bottom 20% for subtitles, deep focus f/8, 16:9 aspect ratio, 8K resolution, ultra-detailed textures, no text, no watermark, no cluttered center --ar 16:9',
    negative_prompt:
      'anime, manga, cartoon, 3D render, CGI, stylized, western features, blue eyes, blonde hair, messy cluttered foreground, text, watermark, logo, subtitles, blurry face, extra limbs, morphed fingers, studio lighting, neon lights, high saturation, modern minimalist western furniture, heavy makeup, wide eyes, caricature, distorted proportions, multiple people merged, floating objects., multiple people, crowd, background figures, previous location elements, car interior, roadside',
  },
  {
    start_index: 572,
    end_index: 600,
    location_setting: 'Lived-in Japanese apartment interior — evening',
    characters_in_scene: ['Protagonist Father', 'Love Interest / Sister-in-Law'],
    expression_used: {
      'Protagonist Father': 'neutral',
      'Love Interest / Sister-in-Law': 'sad_or_vulnerable',
    },
    scene_variables: {
      CHARACTER_POSITIONS:
        'Masashi seated on the left third at the wooden dining table, Yuriko seated on the right third, slightly turned away.',
      ACTION:
        'Masashi leans forward, reaching out a hand toward the center of the table; Yuriko is looking down at her lap, her hands tightly clasped together, her posture rigid and tense.',
      LIGHTING_MODIFIER:
        'warm domestic tungsten fill, soft window light from the left fading into twilight, long shadows across the tatami.',
      FOREGROUND_ELEMENT: 'A half-filled ceramic teacup on the tatami floor, sharp foreground center.',
    },
    visual_description:
      "Location change from office to the domestic apartment. Major visual context shift from the positive news of a job interview to the heavy, tense atmosphere surrounding the mention of Yuriko's father.",
    final_prompt:
      "Japanese domestic realism, cinematic film still, warm amber lighting, muted teal accents, soft window light, shallow depth of field, 8k resolution, highly detailed textures, shot on Arri Alexa., A lived-in Japanese apartment interior. The living room is cluttered with moving boxes and child's toys. A traditional wooden dining table sits in the center. In the background, a small Buddhist altar (Butsudan) holds a framed funeral photograph of a woman with a black ribbon. Low morning sun streams through sheer white curtains, illuminating dust motes in the air. Tatami flooring meets dark wood accents., Japanese man, appears mid-30s, lean oval face, hooded dark eyes, tired features, thick furrowed brows, straight nose, thin lips, pale skin with dark circles, messy short black hair, slender frame, navy blue linen button-down shirt with rolled sleeves, charcoal chinos, silver wedding band on left hand, slight stubble. melancholic gaze, lips flat, slight tension in the brow, Japanese woman, appears late 30s, elegant diamond face, high cheekbones, large almond eyes, thin arched brows, slender nose, porcelain pale skin, long ebony hair in low ponytail, emaciated frame with visible collarbones, oversized cream cable knit sweater, olive green pleated skirt, jade stud earrings. heavy weeping, face buried in hands, shoulders shaking, eyes red-rimmed, Masashi seated on the left third at the wooden dining table, Yuriko seated on the right third, slightly turned away., Masashi leans forward, reaching out a hand toward the center of the table; Yuriko is looking down at her lap, her hands tightly clasped together, her posture rigid and tense., warm domestic tungsten fill, soft window light from the left fading into twilight, long shadows across the tatami., A half-filled ceramic teacup on the tatami floor, sharp foreground center., rule of thirds composition, negative space on left third and bottom 20% for subtitles, deep focus f/8, 16:9 aspect ratio, 8K resolution, ultra-detailed textures, no text, no watermark, no cluttered center --ar 16:9",
    negative_prompt:
      'anime, manga, cartoon, 3D render, CGI, stylized, western features, blue eyes, blonde hair, messy cluttered foreground, text, watermark, logo, subtitles, blurry face, extra limbs, morphed fingers, studio lighting, neon lights, high saturation, modern minimalist western furniture, heavy makeup, wide eyes, caricature, distorted proportions, multiple people merged, floating objects., calm expression, smiling face, relaxed posture, office setting, bright daylight',
  },
  {
    start_index: 601,
    end_index: 625,
    location_setting: 'Traditional Japanese living room — interior, late afternoon',
    characters_in_scene: ['Protagonist Father', 'Love Interest / Sister-in-Law'],
    expression_used: {
      'Protagonist Father': 'neutral',
      'Love Interest / Sister-in-Law': 'neutral',
    },
    scene_variables: {
      CHARACTER_POSITIONS:
        'Masashi standing tall on the left third of the frame, facing Yuriko; Yuriko seated on the right third of the frame, looking up at him.',
      ACTION:
        'Masashi is standing with his back straightened and a firm, steady gaze; Yuriko has her hands clasped tightly in her lap, watching him with a focused, expectant look.',
      LIGHTING_MODIFIER: 'Natural window light + warm domestic tungsten fill + hazy atmospheric dust motes',
      FOREGROUND_ELEMENT: 'a small ceramic teacup on the wooden table, sharp foreground focus',
    },
    visual_description:
      "The scene maintains a single location and time. The visual shift is from Masashi's previous hesitation to a firm, standing posture of determination. He is physically 'standing tall' as described in the summary to visually signal his new resolution to Yuriko.",
    final_prompt:
      "Japanese domestic realism, cinematic film still, warm amber lighting, muted teal accents, soft window light, shallow depth of field, 8k resolution, highly detailed textures, shot on Arri Alexa., A lived-in Japanese apartment interior. The living room is cluttered with moving boxes and child's toys. A traditional wooden dining table sits in the center. In the background, a small Buddhist altar (Butsudan) holds a framed funeral photograph of a woman with a black ribbon. Low morning sun streams through sheer white curtains, illuminating dust motes in the air. Tatami flooring meets dark wood accents., Japanese man, appears mid-30s, lean oval face, hooded dark eyes, tired features, thick furrowed brows, straight nose, thin lips, pale skin with dark circles, messy short black hair, slender frame, navy blue linen button-down shirt with rolled sleeves, charcoal chinos, silver wedding band on left hand, slight stubble. melancholic gaze, lips flat, slight tension in the brow, Japanese woman, appears late 30s, elegant diamond face, high cheekbones, large almond eyes, thin arched brows, slender nose, porcelain pale skin, long ebony hair in low ponytail, emaciated frame with visible collarbones, oversized cream cable knit sweater, olive green pleated skirt, jade stud earrings. composed, gentle half-smile that doesn't reach the eyes, Masashi standing tall on the left third of the frame, facing Yuriko; Yuriko seated on the right third of the frame, looking up at him., Masashi is standing with his back straightened and a firm, steady gaze; Yuriko has her hands clasped tightly in her lap, watching him with a focused, expectant look., Natural window light + warm domestic tungsten fill + hazy atmospheric dust motes, a small ceramic teacup on the wooden table, sharp foreground focus, rule of thirds composition, negative space on right third and bottom 20% for subtitles, deep focus f/8, 16:9 aspect ratio, 8K resolution, ultra-detailed textures, no text, no watermark, no cluttered center --ar 16:9",
    negative_prompt:
      'anime, manga, cartoon, 3D render, CGI, stylized, western features, blue eyes, blonde hair, messy cluttered foreground, text, watermark, logo, subtitles, blurry face, extra limbs, morphed fingers, studio lighting, neon lights, high saturation, modern minimalist western furniture, heavy makeup, wide eyes, caricature, distorted proportions, multiple people merged, floating objects., third person, background crowd, extra faces',
  },
  {
    start_index: 626,
    end_index: 645,
    location_setting: 'Traditional Japanese apartment living room — interior, evening',
    characters_in_scene: ['Protagonist Father', 'Love Interest / Sister-in-Law'],
    expression_used: {
      'Protagonist Father': 'neutral',
      'Love Interest / Sister-in-Law': 'neutral',
    },
    scene_variables: {
      CHARACTER_POSITIONS:
        'Yuriko standing on the left third, leaning forward toward Masashi, Masashi seated on the right third, looking up with a look of confused sadness.',
      ACTION:
        'Yuriko is stepping closer with eyes wide in disbelief, hands slightly raised. Masashi is sitting with his mouth slightly open, holding a hand to his chest as he recounts the memory of the graduation day.',
      LIGHTING_MODIFIER:
        'Natural domestic tungsten fill, soft window light from the right side, shadows beginning to lengthen across the tatami floor.',
      FOREGROUND_ELEMENT: 'An old, slightly yellowed high school photo album open on the wooden table, foreground blur.',
    },
    visual_description:
      'The scene continues in the apartment interior from the previous chapter. The visual boundary is set by the start of the conversation where the central misunderstanding is first mentioned. The mood is one of playful confusion and dawning shock.',
    final_prompt:
      "Japanese domestic realism, cinematic film still, warm amber lighting, muted teal accents, soft window light, shallow depth of field, 8k resolution, highly detailed textures, shot on Arri Alexa., A lived-in Japanese apartment interior. The living room is cluttered with moving boxes and child's toys. A traditional wooden dining table sits in the center. In the background, a small Buddhist altar (Butsudan) holds a framed funeral photograph of a woman with a black ribbon. Low morning sun streams through sheer white curtains, illuminating dust motes in the air. Tatami flooring meets dark wood accents., Japanese man, appears mid-30s, lean oval face, hooded dark eyes, tired features, thick furrowed brows, straight nose, thin lips, pale skin with dark circles, messy short black hair, slender frame, navy blue linen button-down shirt with rolled sleeves, charcoal chinos, silver wedding band on left hand, slight stubble. melancholic gaze, lips flat, slight tension in the brow, Japanese woman, appears late 30s, elegant diamond face, high cheekbones, large almond eyes, thin arched brows, slender nose, porcelain pale skin, long ebony hair in low ponytail, emaciated frame with visible collarbones, oversized cream cable knit sweater, olive green pleated skirt, jade stud earrings. composed, gentle half-smile that doesn't reach the eyes, Yuriko standing on the left third, leaning forward toward Masashi, Masashi seated on the right third, looking up with a look of confused sadness., Yuriko is stepping closer with eyes wide in disbelief, hands slightly raised. Masashi is sitting with his mouth slightly open, holding a hand to his chest as he recounts the memory of the graduation day., Natural domestic tungsten fill, soft window light from the right side, shadows beginning to lengthen across the tatami floor., An old, slightly yellowed high school photo album open on the wooden table, foreground blur., rule of thirds composition, negative space on left third and bottom 20% for subtitles, deep focus f/8, 16:9 aspect ratio, 8K resolution, ultra-detailed textures, no text, no watermark, no cluttered center --ar 16:9",
    negative_prompt:
      'anime, manga, cartoon, 3D render, CGI, stylized, western features, blue eyes, blonde hair, messy cluttered foreground, text, watermark, logo, subtitles, blurry face, extra limbs, morphed fingers, studio lighting, neon lights, high saturation, modern minimalist western furniture, heavy makeup, wide eyes, caricature, distorted proportions, multiple people merged, floating objects., third person, background crowd, extra faces',
  },
  {
    start_index: 646,
    end_index: 659,
    location_setting: 'Traditional Japanese apartment living room — interior, evening',
    characters_in_scene: ['Protagonist Father', 'Love Interest / Sister-in-Law'],
    expression_used: {
      'Protagonist Father': 'sad_or_vulnerable',
      'Love Interest / Sister-in-Law': 'sad_or_vulnerable',
    },
    scene_variables: {
      CHARACTER_POSITIONS:
        'Yuriko standing on the right third, head bowed deeply, face blushing red. Masashi standing on the left third, half-turned away, one hand nervously rubbing the back of his neck.',
      ACTION:
        'Yuriko is looking down at the floor, her cheeks flushed deep pink, fingers interlaced tightly in front of her. Masashi is blushing intensely, his gaze fixed on a point on the wall to avoid eye contact, breathing heavily.',
      LIGHTING_MODIFIER:
        'Warmer, more intense amber glow from the domestic lights, creating a high-contrast, intimate atmosphere that emphasizes their blushing faces.',
      FOREGROUND_ELEMENT: 'A glass of water with condensation beads sitting on the edge of the table, sharp foreground left.',
    },
    visual_description:
      'A major visual context shift occurs as the realization of mutual feelings hits. The tension escalates from dialogue to a visceral, awkward physical state. The blushing and diverted gazes represent the heart-pounding realization of a missed past.',
    final_prompt:
      "Japanese domestic realism, cinematic film still, warm amber lighting, muted teal accents, soft window light, shallow depth of field, 8k resolution, highly detailed textures, shot on Arri Alexa., A lived-in Japanese apartment interior. The living room is cluttered with moving boxes and child's toys. A traditional wooden dining table sits in the center. In the background, a small Buddhist altar (Butsudan) holds a framed funeral photograph of a woman with a black ribbon. Low morning sun streams through sheer white curtains, illuminating dust motes in the air. Tatami flooring meets dark wood accents., Japanese man, appears mid-30s, lean oval face, hooded dark eyes, tired features, thick furrowed brows, straight nose, thin lips, pale skin with dark circles, messy short black hair, slender frame, navy blue linen button-down shirt with rolled sleeves, charcoal chinos, silver wedding band on left hand, slight stubble. eyes glistening with tears, mouth slightly open and trembling, head tilted down, Japanese woman, appears late 30s, elegant diamond face, high cheekbones, large almond eyes, thin arched brows, slender nose, porcelain pale skin, long ebony hair in low ponytail, emaciated frame with visible collarbones, oversized cream cable knit sweater, olive green pleated skirt, jade stud earrings. heavy weeping, face buried in hands, shoulders shaking, eyes red-rimmed, Yuriko standing on the right third, head bowed deeply, face blushing red. Masashi standing on the left third, half-turned away, one hand nervously rubbing the back of his neck., Yuriko is looking down at the floor, her cheeks flushed deep pink, fingers interlaced tightly in front of her. Masashi is blushing intensely, his gaze fixed on a point on the wall to avoid eye contact, breathing heavily., Warmer, more intense amber glow from the domestic lights, creating a high-contrast, intimate atmosphere that emphasizes their blushing faces., A glass of water with condensation beads sitting on the edge of the table, sharp foreground left., rule of thirds composition, negative space on left third and bottom 20% for subtitles, deep focus f/8, 16:9 aspect ratio, 8K resolution, ultra-detailed textures, no text, no watermark, no cluttered center --ar 16:9",
    negative_prompt:
      'anime, manga, cartoon, 3D render, CGI, stylized, western features, blue eyes, blonde hair, messy cluttered foreground, text, watermark, logo, subtitles, blurry face, extra limbs, morphed fingers, studio lighting, neon lights, high saturation, modern minimalist western furniture, heavy makeup, wide eyes, caricature, distorted proportions, multiple people merged, floating objects., calm expression, smiling face, relaxed posture, third person, background crowd, extra faces',
  },
  {
    start_index: 660,
    end_index: 676,
    location_setting: 'Traditional Japanese living room — interior, late evening',
    characters_in_scene: ['Protagonist Father', 'Love Interest / Sister-in-Law'],
    expression_used: {
      'Protagonist Father': 'neutral',
      'Love Interest / Sister-in-Law': 'neutral',
    },
    scene_variables: {
      CHARACTER_POSITIONS:
        'Masashi seated on right third of the tatami floor, head turned away, Yuriko seated on left third, leaning forward slightly.',
      ACTION:
        'Masashi is gripping his own knee tightly, avoiding eye contact. Yuriko is gazing directly at him with a piercing, steady look.',
      LIGHTING_MODIFIER: 'soft diffused window light from left, long shadow across floor, warm tungsten glow from a corner lamp',
      FOREGROUND_ELEMENT: 'a half-filled ceramic teacup on the tatami floor, sharp foreground',
    },
    visual_description:
      "The scene continues from the previous domestic setting but the tone shifts to a heavy, vulnerable conversation. The visual boundary is defined by the direct emotional confrontation regarding the 'statute of limitations' on their past feelings.",
    final_prompt:
      "Japanese domestic realism, cinematic film still, warm amber lighting, muted teal accents, soft window light, shallow depth of field, 8k resolution, highly detailed textures, shot on Arri Alexa., A lived-in Japanese apartment interior. The living room is cluttered with moving boxes and child's toys. A traditional wooden dining table sits in the center. In the background, a small Buddhist altar (Butsudan) holds a framed funeral photograph of a woman with a black ribbon. Low morning sun streams through sheer white curtains, illuminating dust motes in the air. Tatami flooring meets dark wood accents., Japanese man, appears mid-30s, lean oval face, hooded dark eyes, tired features, thick furrowed brows, straight nose, thin lips, pale skin with dark circles, messy short black hair, slender frame, navy blue linen button-down shirt with rolled sleeves, charcoal chinos, silver wedding band on left hand, slight stubble. melancholic gaze, lips flat, slight tension in the brow, Japanese woman, appears late 30s, elegant diamond face, high cheekbones, large almond eyes, thin arched brows, slender nose, porcelain pale skin, long ebony hair in low ponytail, emaciated frame with visible collarbones, oversized cream cable knit sweater, olive green pleated skirt, jade stud earrings. composed, gentle half-smile that doesn't reach the eyes, Masashi seated on right third of the tatami floor, head turned away, Yuriko seated on left third, leaning forward slightly., Masashi is gripping his own knee tightly, avoiding eye contact. Yuriko is gazing directly at him with a piercing, steady look., soft diffused window light from left, long shadow across floor, warm tungsten glow from a corner lamp, a half-filled ceramic teacup on the tatami floor, sharp foreground, rule of thirds composition, negative space on left third and bottom 20% for subtitles, deep focus f/8, 16:9 aspect ratio, 8K resolution, ultra-detailed textures, no text, no watermark, no cluttered center --ar 16:9",
    negative_prompt:
      'anime, manga, cartoon, 3D render, CGI, stylized, western features, blue eyes, blonde hair, messy cluttered foreground, text, watermark, logo, subtitles, blurry face, extra limbs, morphed fingers, studio lighting, neon lights, high saturation, modern minimalist western furniture, heavy makeup, wide eyes, caricature, distorted proportions, multiple people merged, floating objects., third person, background crowd, extra faces',
  },
  {
    start_index: 677,
    end_index: 699,
    location_setting: 'Narrow apartment hallway — interior, dim lighting',
    characters_in_scene: ['Protagonist Father', 'Love Interest / Sister-in-Law'],
    expression_used: {
      'Protagonist Father': 'sad_or_vulnerable',
      'Love Interest / Sister-in-Law': 'neutral',
    },
    scene_variables: {
      CHARACTER_POSITIONS: 'Masashi walking away on the left third, back to the camera, Yuriko standing in a doorway on the right third.',
      ACTION:
        'Masashi is walking with shoulders hunched, hands shoved deep into his pockets. Yuriko is leaning against the doorframe, watching his retreat with a solemn, still posture.',
      LIGHTING_MODIFIER: 'single overhead lamp, harsh downward shadows, no fill light, dim hallway atmosphere',
      FOREGROUND_ELEMENT: 'a pair of worn house slippers at the edge of frame, foreground blur',
    },
    visual_description:
      'A major visual context shift from the living room to the narrow hallway, representing the growing distance and avoidance between the characters as the weekend approaches.',
    final_prompt:
      "Japanese domestic realism, cinematic film still, warm amber lighting, muted teal accents, soft window light, shallow depth of field, 8k resolution, highly detailed textures, shot on Arri Alexa., A narrow, dim Japanese apartment hallway with dark wood doors and cream-colored walls. The space is cramped and shadows are deep. In the distance, a small sliver of light comes from a partially open room. The air feels heavy and still., Japanese man, appears mid-30s, lean oval face, hooded dark eyes, tired features, thick furrowed brows, straight nose, thin lips, pale skin with dark circles, messy short black hair, slender frame, navy blue linen button-down shirt with rolled sleeves, charcoal chinos, silver wedding band on left hand, slight stubble. eyes glistening with tears, mouth slightly open and trembling, head tilted down, Japanese woman, appears late 30s, elegant diamond face, high cheekbones, large almond eyes, thin arched brows, slender nose, porcelain pale skin, long ebony hair in low ponytail, emaciated frame with visible collarbones, oversized cream cable knit sweater, olive green pleated skirt, jade stud earrings. composed, gentle half-smile that doesn't reach the eyes, Masashi walking away on the left third, back to the camera, Yuriko standing in a doorway on the right third., Masashi is walking with shoulders hunched, hands shoved deep into his pockets. Yuriko is leaning against the doorframe, watching his retreat with a solemn, still posture., single overhead lamp, harsh downward shadows, no fill light, dim hallway atmosphere, a pair of worn house slippers at the edge of frame, foreground blur, rule of thirds composition, negative space on right third and bottom 20% for subtitles, deep focus f/8, 16:9 aspect ratio, 8K resolution, ultra-detailed textures, no text, no watermark, no cluttered center --ar 16:9",
    negative_prompt:
      'anime, manga, cartoon, 3D render, CGI, stylized, western features, blue eyes, blonde hair, messy cluttered foreground, text, watermark, logo, subtitles, blurry face, extra limbs, morphed fingers, studio lighting, neon lights, high saturation, modern minimalist western furniture, heavy makeup, wide eyes, caricature, distorted proportions, multiple people merged, floating objects., calm expression, smiling face, relaxed posture, bright daylight, outdoor setting, third person, background crowd, extra faces, previous location elements, Traditional Japanese living room',
  },
  {
    start_index: 700,
    end_index: 714,
    location_setting: 'Traditional Japanese house entrance (Genkan) — interior, afternoon',
    characters_in_scene: ['Protagonist Father', 'Love Interest / Sister-in-Law', 'Daughter'],
    expression_used: {
      'Protagonist Father': 'neutral',
      'Love Interest / Sister-in-Law': 'neutral',
      Daughter: 'neutral',
    },
    scene_variables: {
      CHARACTER_POSITIONS:
        'Masashi and Yuriko standing on the right third of the frame near the wooden door, Haruka running toward the left third of the frame.',
      ACTION:
        'Masashi stands stiffly with his shoulders hunched, looking toward the interior. Haruka is mid-stride, reaching out her hands toward an unseen figure off-camera. Yuriko stands upright, hands clasped formally in front of her.',
      LIGHTING_MODIFIER: 'soft diffused window light from left, long shadow across floor',
      FOREGROUND_ELEMENT: "a pair of worn child's red sneakers on the stone floor, foreground blur",
    },
    visual_description:
      "The family arrives at the father-in-law's house. The scene captures the contrast between the adults' apprehension and the child's innocent excitement as she runs to greet her grandfather in the traditional entrance hall.",
    final_prompt:
      "Japanese domestic realism, cinematic film still, warm amber lighting, muted teal accents, soft window light, shallow depth of field, 8k resolution, highly detailed textures, shot on Arri Alexa., A traditional Japanese house entrance with dark wood paneling and stone flooring. Through the doorway, a glimpse of tatami rooms and paper sliding doors (shoji) is visible. Soft afternoon light filters through high windows, creating long shadows and illuminating drifting dust. The space feels old and imposing., Japanese man, appears mid-30s, lean oval face, hooded dark eyes, tired features, thick furrowed brows, straight nose, thin lips, pale skin with dark circles, messy short black hair, slender frame, navy blue linen button-down shirt with rolled sleeves, charcoal chinos, silver wedding band on left hand, slight stubble. melancholic gaze, lips flat, slight tension in the brow, Japanese woman, appears late 30s, elegant diamond face, high cheekbones, large almond eyes, thin arched brows, slender nose, porcelain pale skin, long ebony hair in low ponytail, emaciated frame with visible collarbones, oversized cream cable knit sweater, olive green pleated skirt, jade stud earrings. composed, gentle half-smile that doesn't reach the eyes, Japanese girl, 4 years old, round chubby face, large round eyes, small button nose, peach-toned skin, straight black hair with blunt bangs, petite child, yellow cotton shirt with white flowers, denim overalls, red sneakers, pink butterfly hair clip. vacant, wide-eyed stare, head tilted slightly, Masashi and Yuriko standing on the right third of the frame near the wooden door, Haruka running toward the left third of the frame., Masashi stands stiffly with his shoulders hunched, looking toward the interior. Haruka is mid-stride, reaching out her hands toward an unseen figure off-camera. Yuriko stands upright, hands clasped formally in front of her., soft diffused window light from left, long shadow across floor, a pair of worn child's red sneakers on the stone floor, foreground blur, rule of thirds composition, negative space on left third and bottom 20% for subtitles, deep focus f/8, 16:9 aspect ratio, 8K resolution, ultra-detailed textures, no text, no watermark, no cluttered center --ar 16:9",
    negative_prompt:
      'anime, manga, cartoon, 3D render, CGI, stylized, western features, blue eyes, blonde hair, messy cluttered foreground, text, watermark, logo, subtitles, blurry face, extra limbs, morphed fingers, studio lighting, neon lights, high saturation, modern minimalist western furniture, heavy makeup, wide eyes, caricature, distorted proportions, multiple people merged, floating objects., previous location elements, apartment interior',
  },
  {
    start_index: 715,
    end_index: 728,
    location_setting: 'Traditional Japanese hallway — interior, afternoon',
    characters_in_scene: ['Protagonist Father', 'Love Interest / Sister-in-Law'],
    expression_used: {
      'Protagonist Father': 'neutral',
      'Love Interest / Sister-in-Law': 'neutral',
    },
    scene_variables: {
      CHARACTER_POSITIONS:
        'Yuriko positioned on the left third of the frame, Masashi on the right third, both turned slightly toward each other.',
      ACTION:
        "Yuriko is touching Masashi's arm lightly, looking at him with a gentle smile. Masashi is taking a deep breath, his chest expanded, looking directly into Yuriko's eyes.",
      LIGHTING_MODIFIER: 'warm domestic tungsten fill from a side lamp, creating soft glows on their faces',
      FOREGROUND_ELEMENT: 'the corner of a dark wooden door frame, sharp foreground left',
    },
    visual_description:
      'A quiet, intimate moment in the hallway before they enter the main room. Yuriko encourages Masashi, and he resolves to be strong for her, marking a silent shift in their emotional bond.',
    final_prompt:
      "Japanese domestic realism, cinematic film still, warm amber lighting, muted teal accents, soft window light, shallow depth of field, 8k resolution, highly detailed textures, shot on Arri Alexa., A narrow, polished wooden hallway in a traditional Japanese home. Dark cedar pillars line the path. To one side, translucent shoji screens glow with filtered light. The atmosphere is quiet and heavy with history, the wood having a deep, aged patina., Japanese man, appears mid-30s, lean oval face, hooded dark eyes, tired features, thick furrowed brows, straight nose, thin lips, pale skin with dark circles, messy short black hair, slender frame, navy blue linen button-down shirt with rolled sleeves, charcoal chinos, silver wedding band on left hand, slight stubble. melancholic gaze, lips flat, slight tension in the brow, Japanese woman, appears late 30s, elegant diamond face, high cheekbones, large almond eyes, thin arched brows, slender nose, porcelain pale skin, long ebony hair in low ponytail, emaciated frame with visible collarbones, oversized cream cable knit sweater, olive green pleated skirt, jade stud earrings. composed, gentle half-smile that doesn't reach the eyes, Yuriko positioned on the left third of the frame, Masashi on the right third, both turned slightly toward each other., Yuriko is touching Masashi's arm lightly, looking at him with a gentle smile. Masashi is taking a deep breath, his chest expanded, looking directly into Yuriko's eyes., warm domestic tungsten fill from a side lamp, creating soft glows on their faces, the corner of a dark wooden door frame, sharp foreground left, rule of thirds composition, negative space on left third and bottom 20% for subtitles, deep focus f/8, 16:9 aspect ratio, 8K resolution, ultra-detailed textures, no text, no watermark, no cluttered center --ar 16:9",
    negative_prompt:
      'anime, manga, cartoon, 3D render, CGI, stylized, western features, blue eyes, blonde hair, messy cluttered foreground, text, watermark, logo, subtitles, blurry face, extra limbs, morphed fingers, studio lighting, neon lights, high saturation, modern minimalist western furniture, heavy makeup, wide eyes, caricature, distorted proportions, multiple people merged, floating objects., third person, background crowd, extra faces, previous location elements, apartment interior',
  },
  {
    start_index: 729,
    end_index: 739,
    location_setting: 'Traditional Japanese living room (Washitsu) — interior, afternoon',
    characters_in_scene: ['Protagonist Father', 'Love Interest / Sister-in-Law', 'Father-in-law'],
    expression_used: {
      'Protagonist Father': 'angry',
      'Love Interest / Sister-in-Law': 'neutral',
    },
    scene_variables: {
      CHARACTER_POSITIONS:
        'Elderly father-in-law sitting rigidly on the left third of the frame on a zabuton cushion. Masashi standing on the right third of the frame. Yuriko standing slightly behind and to the side of Masashi.',
      ACTION:
        'The father-in-law sits with his back perfectly straight, hands resting on his knees, staring with a piercing gaze. Masashi has his hands clenched into tight fists at his sides, his body vibrating with tension. Yuriko is looking down at the floor.',
      LIGHTING_MODIFIER: 'single overhead lamp, harsh downward shadows, no fill light',
      FOREGROUND_ELEMENT: 'a heavy cast-iron teapot on a low wooden table, foreground right blur',
    },
    visual_description:
      'The climax of the chapter where the tension peaks. The spatial arrangement emphasizes the power dynamic, with the patriarch seated in a position of authority and Masashi physically tensing up to withstand the atmospheric pressure of the room.',
    final_prompt:
      "Japanese domestic realism, cinematic film still, warm amber lighting, muted teal accents, soft window light, shallow depth of field, 8k resolution, highly detailed textures, shot on Arri Alexa., A formal Japanese tatami room (Washitsu). In the center of the room is a low lacquered table. In the alcove (Tokonoma), a hanging scroll and a simple flower arrangement are displayed. The walls are a muted earth-toned plaster. The air is still and heavy., Japanese man, appears mid-30s, lean oval face, hooded dark eyes, tired features, thick furrowed brows, straight nose, thin lips, pale skin with dark circles, messy short black hair, slender frame, navy blue linen button-down shirt with rolled sleeves, charcoal chinos, silver wedding band on left hand, slight stubble. brows sharply furrowed, jaw locked, eyes wide with desperate intensity, Japanese woman, appears late 30s, elegant diamond face, high cheekbones, large almond eyes, thin arched brows, slender nose, porcelain pale skin, long ebony hair in low ponytail, emaciated frame with visible collarbones, oversized cream cable knit sweater, olive green pleated skirt, jade stud earrings. composed, gentle half-smile that doesn't reach the eyes, An elderly Japanese man, age 62, large and broad-shouldered build, stern weathered face, deep wrinkles, short grey hair, wearing a traditional dark grey kimono. Piercing and intimidating gaze., Elderly father-in-law sitting rigidly on the left third of the frame on a zabuton cushion. Masashi standing on the right third of the frame. Yuriko standing slightly behind and to the side of Masashi., The father-in-law sits with his back perfectly straight, hands resting on his knees, staring with a piercing gaze. Masashi has his hands clenched into tight fists at his sides, his body vibrating with tension. Yuriko is looking down at the floor., single overhead lamp, harsh downward shadows, no fill light, a heavy cast-iron teapot on a low wooden table, foreground right blur, rule of thirds composition, negative space on left third and bottom 20% for subtitles, deep focus f/8, 16:9 aspect ratio, 8K resolution, ultra-detailed textures, no text, no watermark, no cluttered center --ar 16:9",
    negative_prompt:
      'anime, manga, cartoon, 3D render, CGI, stylized, western features, blue eyes, blonde hair, messy cluttered foreground, text, watermark, logo, subtitles, blurry face, extra limbs, morphed fingers, studio lighting, neon lights, high saturation, modern minimalist western furniture, heavy makeup, wide eyes, caricature, distorted proportions, multiple people merged, floating objects., calm expression, smiling face, relaxed posture, previous location elements, apartment interior',
  },
  {
    start_index: 740,
    end_index: 758,
    location_setting: 'Traditional Japanese house interior — tatami washitsu, afternoon',
    characters_in_scene: ['Protagonist Father', 'Love Interest / Sister-in-Law'],
    expression_used: {
      'Protagonist Father': 'neutral',
      'Love Interest / Sister-in-Law': 'neutral',
    },
    scene_variables: {
      CHARACTER_POSITIONS:
        'Yuriko seated on right third, hands folded in her lap, Masashi seated slightly behind her on the far right, Father-in-law (unseen or edge of frame) on the left third',
      ACTION: 'Yuriko is speaking earnestly with a steady gaze, while Masashi sits rigidly, listening to her proposal to live together',
      LIGHTING_MODIFIER: 'harsh afternoon sun cutting through the shoji screens, creating strong linear shadows across the tatami',
      FOREGROUND_ELEMENT: 'a low wooden tea table with three untouched ceramic cups, sharp focus on the table edge',
    },
    visual_description:
      "The scene continues from the previous chapter's location but shifts focus to Yuriko's active proposal. The tension remains high as the Father-in-law listens in silence before his outburst.",
    final_prompt:
      "Japanese domestic realism, cinematic film still, warm amber lighting, muted teal accents, soft window light, shallow depth of field, 8k resolution, highly detailed textures, shot on Arri Alexa., A lived-in Japanese apartment interior. The living room is cluttered with moving boxes and child's toys. A traditional wooden dining table sits in the center. In the background, a small Buddhist altar (Butsudan) holds a framed funeral photograph of a woman with a black ribbon. Low morning sun streams through sheer white curtains, illuminating dust motes in the air. Tatami flooring meets dark wood accents., Japanese man, appears mid-30s, lean oval face, hooded dark eyes, tired features, thick furrowed brows, straight nose, thin lips, pale skin with dark circles, messy short black hair, slender frame, navy blue linen button-down shirt with rolled sleeves, charcoal chinos, silver wedding band on left hand, slight stubble. melancholic gaze, lips flat, slight tension in the brow, Japanese woman, appears late 30s, elegant diamond face, high cheekbones, large almond eyes, thin arched brows, slender nose, porcelain pale skin, long ebony hair in low ponytail, emaciated frame with visible collarbones, oversized cream cable knit sweater, olive green pleated skirt, jade stud earrings. composed, gentle half-smile that doesn't reach the eyes, Yuriko seated on right third, hands folded in her lap, Masashi seated slightly behind her on the far right, Father-in-law (unseen or edge of frame) on the left third, Yuriko is speaking earnestly with a steady gaze, while Masashi sits rigidly, listening to her proposal to live together, harsh afternoon sun cutting through the shoji screens, creating strong linear shadows across the tatami, a low wooden tea table with three untouched ceramic cups, sharp focus on the table edge, rule of thirds composition, negative space on left third and bottom 20% for subtitles, deep focus f/8, 16:9 aspect ratio, 8K resolution, ultra-detailed textures, no text, no watermark, no cluttered center --ar 16:9",
    negative_prompt:
      'anime, manga, cartoon, 3D render, CGI, stylized, western features, blue eyes, blonde hair, messy cluttered foreground, text, watermark, logo, subtitles, blurry face, extra limbs, morphed fingers, studio lighting, neon lights, high saturation, modern minimalist western furniture, heavy makeup, wide eyes, caricature, distorted proportions, multiple people merged, floating objects, previous location elements, apartment interior',
  },
  {
    start_index: 759,
    end_index: 781,
    location_setting: 'Traditional Japanese house interior — tatami washitsu, late afternoon',
    characters_in_scene: ['Love Interest / Sister-in-Law'],
    expression_used: {
      'Love Interest / Sister-in-Law': 'sad_or_vulnerable',
    },
    scene_variables: {
      CHARACTER_POSITIONS: 'Yuriko kneeling on the right third of the tatami floor, head bowed slightly',
      ACTION:
        'Yuriko is wiping a tear from her cheek with the back of her hand, her shoulders trembling slightly as she realizes her father knew of her suffering',
      LIGHTING_MODIFIER: 'soft diffused window light from left, long shadow across floor, warm golden hour dust motes visible',
      FOREGROUND_ELEMENT: 'a partially visible heavy wooden pillar of the traditional house, out of focus on the far right',
    },
    visual_description:
      "The emotional climax of the chapter where the Father-in-law's harshness is revealed as protective love. The scene transitions to a focus on Yuriko's emotional release and relief.",
    final_prompt:
      "Japanese domestic realism, cinematic film still, warm amber lighting, muted teal accents, soft window light, shallow depth of field, 8k resolution, highly detailed textures, shot on Arri Alexa., A lived-in Japanese apartment interior. The living room is cluttered with moving boxes and child's toys. A traditional wooden dining table sits in the center. In the background, a small Buddhist altar (Butsudan) holds a framed funeral photograph of a woman with a black ribbon. Low morning sun streams through sheer white curtains, illuminating dust motes in the air. Tatami flooring meets dark wood accents., Japanese woman, appears late 30s, elegant diamond face, high cheekbones, large almond eyes, thin arched brows, slender nose, porcelain pale skin, long ebony hair in low ponytail, emaciated frame with visible collarbones, oversized cream cable knit sweater, olive green pleated skirt, jade stud earrings. heavy weeping, face buried in hands, shoulders shaking, eyes red-rimmed, Yuriko kneeling on the right third of the tatami floor, head bowed slightly, Yuriko is wiping a tear from her cheek with the back of her hand, her shoulders trembling slightly as she realizes her father knew of her suffering, soft diffused window light from left, long shadow across floor, warm golden hour dust motes visible, a partially visible heavy wooden pillar of the traditional house, out of focus on the far right, rule of thirds composition, negative space on left third and bottom 20% for subtitles, deep focus f/8, 16:9 aspect ratio, 8K resolution, ultra-detailed textures, no text, no watermark, no cluttered center --ar 16:9",
    negative_prompt:
      'anime, manga, cartoon, 3D render, CGI, stylized, western features, blue eyes, blonde hair, messy cluttered foreground, text, watermark, logo, subtitles, blurry face, extra limbs, morphed fingers, studio lighting, neon lights, high saturation, modern minimalist western furniture, heavy makeup, wide eyes, caricature, distorted proportions, multiple people merged, floating objects, calm expression, smiling face, relaxed posture, single character only',
  },
  {
    start_index: 782,
    end_index: 812,
    location_setting: 'Traditional Japanese living room — interior, evening',
    characters_in_scene: ['Protagonist Father', 'Love Interest / Sister-in-Law'],
    expression_used: {
      'Protagonist Father': 'angry',
      'Love Interest / Sister-in-Law': 'sad_or_vulnerable',
    },
    scene_variables: {
      CHARACTER_POSITIONS:
        'Masashi is bowed low on the tatami on the left third, eyes looking upward with desperate intensity; Yuriko is standing on the right third, trembling with her head bowed.',
      ACTION:
        'Masashi is pressing his palms firmly into the tatami mat in a formal dogeza position but keeping his head partially lifted to lock eyes with the unseen patriarch; Yuriko is clutching her oversized sweater at the elbows, her shoulders shaking.',
      LIGHTING_MODIFIER: 'single overhead lamp, harsh downward shadows, no fill light, high contrast creating a heavy atmosphere',
      FOREGROUND_ELEMENT: 'A spilled, overturned wooden coaster on the tatami, sharp foreground left.',
    },
    visual_description:
      "The scene continues in the same location as the previous chapter. The visual focus is on the explosive confrontation and Masashi's physical transition from submission to a desperate, unyielding stand. The lighting shifts to be harsher to reflect the 'Explosive' mood.",
    final_prompt:
      "Japanese domestic realism, cinematic film still, warm amber lighting, muted teal accents, soft window light, shallow depth of field, 8k resolution, highly detailed textures, shot on Arri Alexa., A lived-in Japanese apartment interior. The living room is cluttered with moving boxes and child's toys. A traditional wooden dining table sits in the center. In the background, a small Buddhist altar (Butsudan) holds a framed funeral photograph of a woman with a black ribbon. Low morning sun streams through sheer white curtains, illuminating dust motes in the air. Tatami flooring meets dark wood accents., Japanese man, appears mid-30s, lean oval face, hooded dark eyes, tired features, thick furrowed brows, straight nose, thin lips, pale skin with dark circles, messy short black hair, slender frame, navy blue linen button-down shirt with rolled sleeves, charcoal chinos, silver wedding band on left hand, slight stubble. brows sharply furrowed, jaw locked, eyes wide with desperate intensity, Japanese woman, appears late 30s, elegant diamond face, high cheekbones, large almond eyes, thin arched brows, slender nose, porcelain pale skin, long ebony hair in low ponytail, emaciated frame with visible collarbones, oversized cream cable knit sweater, olive green pleated skirt, jade stud earrings. heavy weeping, face buried in hands, shoulders shaking, eyes red-rimmed, Masashi is bowed low on the tatami on the left third, eyes looking upward with desperate intensity; Yuriko is standing on the right third, trembling with her head bowed., Masashi is pressing his palms firmly into the tatami mat in a formal dogeza position but keeping his head partially lifted to lock eyes with the unseen patriarch; Yuriko is clutching her oversized sweater at the elbows, her shoulders shaking., single overhead lamp, harsh downward shadows, no fill light, high contrast creating a heavy atmosphere, A spilled, overturned wooden coaster on the tatami, sharp foreground left., rule of thirds composition, negative space on right third and bottom 20% for subtitles, deep focus f/8, 16:9 aspect ratio, 8K resolution, ultra-detailed textures, no text, no watermark, no cluttered center --ar 16:9",
    negative_prompt:
      'anime, manga, cartoon, 3D render, CGI, stylized, western features, blue eyes, blonde hair, messy cluttered foreground, text, watermark, logo, subtitles, blurry face, extra limbs, morphed fingers, studio lighting, neon lights, high saturation, modern minimalist western furniture, heavy makeup, wide eyes, caricature, distorted proportions, multiple people merged, floating objects. calm expression, smiling face, relaxed posture, third person, background crowd, extra faces',
  },
  {
    start_index: 813,
    end_index: 833,
    location_setting: 'Traditional Japanese apartment living room — interior, evening',
    characters_in_scene: ['Protagonist Father', 'Daughter'],
    expression_used: {
      'Protagonist Father': 'sad_or_vulnerable',
      Daughter: 'neutral',
    },
    scene_variables: {
      CHARACTER_POSITIONS: 'Haruka standing on the left third facing right, Masashi seated on the right third looking toward her in shock.',
      ACTION:
        'Haruka is performing a formal deep bow (pekori) toward an off-screen figure, her small hands flat against her denim overalls. Masashi is sitting frozen on the tatami, a single tear track visible on his cheek as he watches her.',
      LIGHTING_MODIFIER: "Soft diffused window light from left, long shadow across floor, warm tungsten glow hitting Haruka's hair.",
      FOREGROUND_ELEMENT: 'A worn teddy bear lying on the tatami floor, foreground blur.',
    },
    visual_description:
      'Haruka enters the tense scene, breaking the silence. The visual focus is on her innocent plea and the emotional impact it has on Masashi, who sees the resemblance to his late wife. The location remains the same as the previous chapter.',
    final_prompt:
      "Japanese domestic realism, cinematic film still, warm amber lighting, muted teal accents, soft window light, shallow depth of field, 8k resolution, highly detailed textures, shot on Arri Alexa., A lived-in Japanese apartment interior. The living room is cluttered with moving boxes and child's toys. A traditional wooden dining table sits in the center. In the background, a small Buddhist altar (Butsudan) holds a framed funeral photograph of a woman with a black ribbon. Low morning sun streams through sheer white curtains, illuminating dust motes in the air. Tatami flooring meets dark wood accents., Japanese man, appears mid-30s, lean oval face, hooded dark eyes, tired features, thick furrowed brows, straight nose, thin lips, pale skin with dark circles, messy short black hair, slender frame, navy blue linen button-down shirt with rolled sleeves, charcoal chinos, silver wedding band on left hand, slight stubble. eyes glistening with tears, mouth slightly open and trembling, head tilted down, Japanese girl, 4 years old, round chubby face, large round eyes, small button nose, peach-toned skin, straight black hair with blunt bangs, petite child, yellow cotton shirt with white flowers, denim overalls, red sneakers, pink butterfly hair clip. vacant, wide-eyed stare, head tilted slightly, Haruka standing on the left third facing right, Masashi seated on the right third looking toward her in shock., Haruka is performing a formal deep bow (pekori) toward an off-screen figure, her small hands flat against her denim overalls. Masashi is sitting frozen on the tatami, a single tear track visible on his cheek as he watches her., Soft diffused window light from left, long shadow across floor, warm tungsten glow hitting Haruka's hair., A worn teddy bear lying on the tatami floor, foreground blur., rule of thirds composition, negative space on right third and bottom 20% for subtitles, deep focus f/8, 16:9 aspect ratio, 8K resolution, ultra-detailed textures, no text, no watermark, no cluttered center --ar 16:9",
    negative_prompt:
      'anime, manga, cartoon, 3D render, CGI, stylized, western features, blue eyes, blonde hair, messy cluttered foreground, text, watermark, logo, subtitles, blurry face, extra limbs, morphed fingers, studio lighting, neon lights, high saturation, modern minimalist western furniture, heavy makeup, wide eyes, caricature, distorted proportions, multiple people merged, floating objects., third person, background crowd, extra faces',
  },
  {
    start_index: 834,
    end_index: 859,
    location_setting: 'Traditional Japanese apartment living room — interior, evening',
    characters_in_scene: ['Protagonist Father', 'Love Interest / Sister-in-Law'],
    expression_used: {
      'Protagonist Father': 'sad_or_vulnerable',
      'Love Interest / Sister-in-Law': 'neutral',
    },
    scene_variables: {
      CHARACTER_POSITIONS:
        "Yuriko and Masashi standing together on the left third, bowing toward the right. The Father-in-law's back is on the right third.",
      ACTION:
        'Yuriko and Masashi are both bowing their heads deeply in gratitude. In the mid-ground, the elderly Father-in-law is walking away toward the door, his back turned to the camera, shoulders slightly relaxed.',
      LIGHTING_MODIFIER: 'Natural window light + warm domestic tungsten fill + hazy atmospheric dust motes',
      FOREGROUND_ELEMENT: 'A pair of worn house slippers at the edge of frame, foreground blur.',
    },
    visual_description:
      "The final resolution of the conflict. Yuriko joins Masashi in a plea for acceptance, which the Father-in-law grants before walking away. The visual emphasis is on the group's collective relief and the departing back of the patriarch.",
    final_prompt:
      "Japanese domestic realism, cinematic film still, warm amber lighting, muted teal accents, soft window light, shallow depth of field, 8k resolution, highly detailed textures, shot on Arri Alexa., A lived-in Japanese apartment interior. The living room is cluttered with moving boxes and child's toys. A traditional wooden dining table sits in the center. In the background, a small Buddhist altar (Butsudan) holds a framed funeral photograph of a woman with a black ribbon. Low morning sun streams through sheer white curtains, illuminating dust motes in the air. Tatami flooring meets dark wood accents., Japanese man, appears mid-30s, lean oval face, hooded dark eyes, tired features, thick furrowed brows, straight nose, thin lips, pale skin with dark circles, messy short black hair, slender frame, navy blue linen button-down shirt with rolled sleeves, charcoal chinos, silver wedding band on left hand, slight stubble. eyes glistening with tears, mouth slightly open and trembling, head tilted down, Japanese woman, appears late 30s, elegant diamond face, high cheekbones, large almond eyes, thin arched brows, slender nose, porcelain pale skin, long ebony hair in low ponytail, emaciated frame with visible collarbones, oversized cream cable knit sweater, olive green pleated skirt, jade stud earrings. composed, gentle half-smile that doesn't reach the eyes, Yuriko and Masashi standing together on the left third, bowing toward the right. The Father-in-law's back is on the right third., Yuriko and Masashi are both bowing their heads deeply in gratitude. In the mid-ground, the elderly Father-in-law is walking away toward the door, his back turned to the camera, shoulders slightly relaxed., Natural window light + warm domestic tungsten fill + hazy atmospheric dust motes, A pair of worn house slippers at the edge of frame, foreground blur., rule of thirds composition, negative space on right third and bottom 20% for subtitles, deep focus f/8, 16:9 aspect ratio, 8K resolution, ultra-detailed textures, no text, no watermark, no cluttered center --ar 16:9",
    negative_prompt:
      'anime, manga, cartoon, 3D render, CGI, stylized, western features, blue eyes, blonde hair, messy cluttered foreground, text, watermark, logo, subtitles, blurry face, extra limbs, morphed fingers, studio lighting, neon lights, high saturation, modern minimalist western furniture, heavy makeup, wide eyes, caricature, distorted proportions, multiple people merged, floating objects., third person, background crowd, extra faces',
  },
  {
    start_index: 860,
    end_index: 900,
    location_setting: 'Residential Japanese street — exterior, golden hour afternoon',
    characters_in_scene: ['Protagonist Father', 'Love Interest / Sister-in-Law', 'Daughter'],
    expression_used: {
      'Protagonist Father': 'sad_or_vulnerable',
      'Love Interest / Sister-in-Law': 'neutral',
      Daughter: 'neutral',
    },
    scene_variables: {
      CHARACTER_POSITIONS:
        'Masashi walking on the left third with Haruka on his back, Yuriko walking on the right third looking toward him.',
      ACTION:
        "Masashi is carrying a sleeping Haruka piggyback, tears streaming down his face. Yuriko is reaching out a hand toward Masashi's cheek with a soft, radiant smile.",
      LIGHTING_MODIFIER: "Low-angle golden hour sun creating a warm flare and long shadows, backlighting the characters' hair.",
      FOREGROUND_ELEMENT: 'A blur of blooming hydrangeas along the edge of the paved path, foreground left.',
    },
    visual_description:
      "The entire chapter takes place during a single continuous walk home from the father-in-law's house. The visual focus is the emotional resolution and mutual confession under the cinematic glow of the setting sun, ending on a hopeful note.",
    final_prompt:
      "Japanese domestic realism, cinematic film still, warm amber lighting, muted teal accents, soft window light, shallow depth of field, 8k resolution, highly detailed textures, shot on Arri Alexa., A sun-drenched residential Japanese street at golden hour. A narrow paved path is lined with traditional wooden fences and utility poles with tangled wires. The setting sun casts long, deep amber shadows across the asphalt. In the distance, low suburban rooftops meet a hazy orange sky. The air is warm and still., Japanese man, appears mid-30s, lean oval face, hooded dark eyes, tired features, thick furrowed brows, straight nose, thin lips, pale skin with dark circles, messy short black hair, slender frame, navy blue linen button-down shirt with rolled sleeves, charcoal chinos, silver wedding band on left hand, slight stubble. eyes glistening with tears, mouth slightly open and trembling, head tilted down, Japanese woman, appears late 30s, elegant diamond face, high cheekbones, large almond eyes, thin arched brows, slender nose, porcelain pale skin, long ebony hair in low ponytail, emaciated frame with visible collarbones, oversized cream cable knit sweater, olive green pleated skirt, jade stud earrings. composed, gentle half-smile that doesn't reach the eyes, Japanese girl, 4 years old, round chubby face, large round eyes, small button nose, peach-toned skin, straight black hair with blunt bangs, petite child, yellow cotton shirt with white flowers, denim overalls, red sneakers, pink butterfly hair clip. vacant, wide-eyed stare, head tilted slightly, Masashi walking on the left third with Haruka on his back, Yuriko walking on the right third looking toward him., Masashi is carrying a sleeping Haruka piggyback, tears streaming down his face. Yuriko is reaching out a hand toward Masashi's cheek with a soft, radiant smile., Low-angle golden hour sun creating a warm flare and long shadows, backlighting the characters' hair., A blur of blooming hydrangeas along the edge of the paved path, foreground left., rule of thirds composition, negative space on right third and bottom 20% for subtitles, deep focus f/8, 16:9 aspect ratio, 8K resolution, ultra-detailed textures, no text, no watermark, no cluttered center --ar 16:9",
    negative_prompt:
      "anime, manga, cartoon, 3D render, CGI, stylized, western features, blue eyes, blonde hair, messy cluttered foreground, text, watermark, logo, subtitles, blurry face, extra limbs, morphed fingers, studio lighting, neon lights, high saturation, modern minimalist western furniture, heavy makeup, wide eyes, caricature, distorted proportions, multiple people merged, floating objects., calm expression, smiling face, relaxed posture, previous location elements, Father-in-law's house",
  },
  {
    start_index: 901,
    end_index: 917,
    location_setting: 'Lived-in Japanese apartment interior — living room, night',
    characters_in_scene: ['Protagonist Father', 'Love Interest / Sister-in-Law', 'Daughter'],
    expression_used: {
      'Protagonist Father': 'neutral',
      'Love Interest / Sister-in-Law': 'neutral',
      Daughter: 'neutral',
    },
    scene_variables: {
      CHARACTER_POSITIONS:
        'Haruka seated at the center-right of the table, Masashi on the far right, Yuriko on the left third of the frame.',
      ACTION:
        'Haruka is leaning forward with a joyful smile, blowing out five glowing candles on a strawberry shortcake. Masashi and Yuriko are clapping and leaning toward her.',
      LIGHTING_MODIFIER:
        'Darkened room illuminated primarily by the warm, flickering orange glow of birthday candles on the cake, casting soft light on their faces.',
      FOREGROUND_ELEMENT: 'A colorful gift-wrapped box with a ribbon on the tatami floor, foreground left blur.',
    },
    visual_description:
      'The scene marks a significant time jump (1 year) and shift to a night celebration. It focuses on the peak of the birthday party joy before the mood shifts.',
    final_prompt:
      "Japanese domestic realism, cinematic film still, warm amber lighting, muted teal accents, soft window light, shallow depth of field, 8k resolution, highly detailed textures, shot on Arri Alexa., A lived-in Japanese apartment interior. The living room is cluttered with moving boxes and child's toys. A traditional wooden dining table sits in the center. In the background, a small Buddhist altar (Butsudan) holds a framed funeral photograph of a woman with a black ribbon. Low morning sun streams through sheer white curtains, illuminating dust motes in the air. Tatami flooring meets dark wood accents., Japanese man, appears mid-30s, lean oval face, hooded dark eyes, tired features, thick furrowed brows, straight nose, thin lips, pale skin with dark circles, messy short black hair, slender frame, navy blue linen button-down shirt with rolled sleeves, charcoal chinos, silver wedding band on left hand, slight stubble. melancholic gaze, lips flat, slight tension in the brow, Japanese woman, appears late 30s, elegant diamond face, high cheekbones, large almond eyes, thin arched brows, slender nose, porcelain pale skin, long ebony hair in low ponytail, emaciated frame with visible collarbones, oversized cream cable knit sweater, olive green pleated skirt, jade stud earrings. composed, gentle half-smile that doesn't reach the eyes, Japanese girl, 4 years old, round chubby face, large round eyes, small button nose, peach-toned skin, straight black hair with blunt bangs, petite child, yellow cotton shirt with white flowers, denim overalls, red sneakers, pink butterfly hair clip. vacant, wide-eyed stare, head tilted slightly, Haruka seated at the center-right of the table, Masashi on the far right, Yuriko on the left third of the frame., Haruka is leaning forward with a joyful smile, blowing out five glowing candles on a strawberry shortcake. Masashi and Yuriko are clapping and leaning toward her., Darkened room illuminated primarily by the warm, flickering orange glow of birthday candles on the cake, casting soft light on their faces., A colorful gift-wrapped box with a ribbon on the tatami floor, foreground left blur., rule of thirds composition, negative space on left third and bottom 20% for subtitles, deep focus f/8, 16:9 aspect ratio, 8K resolution, ultra-detailed textures, no text, no watermark, no cluttered center --ar 16:9",
    negative_prompt:
      'anime, manga, cartoon, 3D render, CGI, stylized, western features, blue eyes, blonde hair, messy cluttered foreground, text, watermark, logo, subtitles, blurry face, extra limbs, morphed fingers, studio lighting, neon lights, high saturation, modern minimalist western furniture, heavy makeup, wide eyes, caricature, distorted proportions, multiple people merged, floating objects, bright daylight, outdoor setting, overexposed highlights, lens flare',
  },
  {
    start_index: 918,
    end_index: 930,
    location_setting: 'Lived-in Japanese apartment interior — living room, night',
    characters_in_scene: ['Protagonist Father', 'Love Interest / Sister-in-Law', 'Daughter'],
    expression_used: {
      'Protagonist Father': 'neutral',
      'Love Interest / Sister-in-Law': 'neutral',
      Daughter: 'neutral',
    },
    scene_variables: {
      CHARACTER_POSITIONS:
        'Masashi stands on the right third reaching for a light switch, Yuriko sits frozen on the left third looking at him, Haruka looks up from the center.',
      ACTION:
        'Masashi has his hand on a wall-mounted light switch, his face filled with visible shock. Yuriko is looking at him with wide, stunned eyes. Haruka is looking up at them expectantly.',
      LIGHTING_MODIFIER:
        'A harsh transition as the overhead warm domestic tungsten fill light flickers on, chasing away the candlelight shadows.',
      FOREGROUND_ELEMENT: 'The birthday cake with smoking, extinguished candle wicks on the table, foreground center.',
    },
    visual_description:
      "A major visual context shift triggered by Haruka's startling wish. The lighting changes from intimate candlelight to bright interior light, reflecting the sudden exposure of hidden feelings.",
    final_prompt:
      "Japanese domestic realism, cinematic film still, warm amber lighting, muted teal accents, soft window light, shallow depth of field, 8k resolution, highly detailed textures, shot on Arri Alexa., A lived-in Japanese apartment interior. The living room is cluttered with moving boxes and child's toys. A traditional wooden dining table sits in the center. In the background, a small Buddhist altar (Butsudan) holds a framed funeral photograph of a woman with a black ribbon. Low morning sun streams through sheer white curtains, illuminating dust motes in the air. Tatami flooring meets dark wood accents., Japanese man, appears mid-30s, lean oval face, hooded dark eyes, tired features, thick furrowed brows, straight nose, thin lips, pale skin with dark circles, messy short black hair, slender frame, navy blue linen button-down shirt with rolled sleeves, charcoal chinos, silver wedding band on left hand, slight stubble. melancholic gaze, lips flat, slight tension in the brow, Japanese woman, appears late 30s, elegant diamond face, high cheekbones, large almond eyes, thin arched brows, slender nose, porcelain pale skin, long ebony hair in low ponytail, emaciated frame with visible collarbones, oversized cream cable knit sweater, olive green pleated skirt, jade stud earrings. composed, gentle half-smile that doesn't reach the eyes, Japanese girl, 4 years old, round chubby face, large round eyes, small button nose, peach-toned skin, straight black hair with blunt bangs, petite child, yellow cotton shirt with white flowers, denim overalls, red sneakers, pink butterfly hair clip. vacant, wide-eyed stare, head tilted slightly, Masashi stands on the right third reaching for a light switch, Yuriko sits frozen on the left third looking at him, Haruka looks up from the center., Masashi has his hand on a wall-mounted light switch, his face filled with visible shock. Yuriko is looking at him with wide, stunned eyes. Haruka is looking up at them expectantly., A harsh transition as the overhead warm domestic tungsten fill light flickers on, chasing away the candlelight shadows., The birthday cake with smoking, extinguished candle wicks on the table, foreground center., rule of thirds composition, negative space on left third and bottom 20% for subtitles, deep focus f/8, 16:9 aspect ratio, 8K resolution, ultra-detailed textures, no text, no watermark, no cluttered center --ar 16:9",
    negative_prompt:
      'anime, manga, cartoon, 3D render, CGI, stylized, western features, blue eyes, blonde hair, messy cluttered foreground, text, watermark, logo, subtitles, blurry face, extra limbs, morphed fingers, studio lighting, neon lights, high saturation, modern minimalist western furniture, heavy makeup, wide eyes, caricature, distorted proportions, multiple people merged, floating objects, previous location elements, outdoor path',
  },
  {
    start_index: 931,
    end_index: 957,
    location_setting: 'Traditional Japanese living room — interior, evening',
    characters_in_scene: ['Protagonist Father', 'Love Interest / Sister-in-Law', 'Daughter'],
    expression_used: {
      'Protagonist Father': 'sad_or_vulnerable',
      'Love Interest / Sister-in-Law': 'neutral',
      Daughter: 'sad_or_vulnerable',
    },
    scene_variables: {
      CHARACTER_POSITIONS:
        'Masashi seated on the left third of the tatami floor, Haruka standing in the center looking at him, Yuriko kneeling on the right third.',
      ACTION:
        'Masashi is holding a yellowed, wrinkled piece of paper with trembling fingers, staring at the writing; Haruka is looking up at him with a quivering lip; Yuriko is watching the letter with a composed but pained expression.',
      LIGHTING_MODIFIER: 'soft diffused window light from left, long shadow across floor, warm domestic tungsten fill',
      FOREGROUND_ELEMENT: 'Out-of-focus edge of a wooden tea tray on the tatami, foreground left.',
    },
    visual_description:
      'The revelation scene. The location continues from the previous chapter but the visual focus shifts to the physical prop of the letter. The mood is heavy with past secrets and childhood anxiety.',
    final_prompt:
      "Japanese domestic realism, cinematic film still, warm amber lighting, muted teal accents, soft window light, shallow depth of field, 8k resolution, highly detailed textures, shot on Arri Alexa., A lived-in Japanese apartment interior. The living room is cluttered with moving boxes and child's toys. A traditional wooden dining table sits in the center. In the background, a small Buddhist altar (Butsudan) holds a framed funeral photograph of a woman with a black ribbon. Low morning sun streams through sheer white curtains, illuminating dust motes in the air. Tatami flooring meets dark wood accents., Japanese man, appears mid-30s, lean oval face, hooded dark eyes, tired features, thick furrowed brows, straight nose, thin lips, pale skin with dark circles, messy short black hair, slender frame, navy blue linen button-down shirt with rolled sleeves, charcoal chinos, silver wedding band on left hand, slight stubble. eyes glistening with tears, mouth slightly open and trembling, head tilted down, Japanese woman, appears late 30s, elegant diamond face, high cheekbones, large almond eyes, thin arched brows, slender nose, porcelain pale skin, long ebony hair in low ponytail, emaciated frame with visible collarbones, oversized cream cable knit sweater, olive green pleated skirt, jade stud earrings. composed, gentle half-smile that doesn't reach the eyes, Japanese girl, 4 years old, round chubby face, large round eyes, small button nose, peach-toned skin, straight black hair with blunt bangs, petite child, yellow cotton shirt with white flowers, denim overalls, red sneakers, pink butterfly hair clip. quivering lip, eyes filling with large tears, clutching teddy bear to face, Masashi seated on the left third of the tatami floor, Haruka standing in the center looking at him, Yuriko kneeling on the right third., Masashi is holding a yellowed, wrinkled piece of paper with trembling fingers, staring at the writing; Haruka is looking up at him with a quivering lip; Yuriko is watching the letter with a composed but pained expression., soft diffused window light from left, long shadow across floor, warm domestic tungsten fill, Out-of-focus edge of a wooden tea tray on the tatami, foreground left., rule of thirds composition, negative space on right third and bottom 20% for subtitles, deep focus f/8, 16:9 aspect ratio, 8K resolution, ultra-detailed textures, no text, no watermark, no cluttered center --ar 16:9",
    negative_prompt:
      'anime, manga, cartoon, 3D render, CGI, stylized, western features, blue eyes, blonde hair, messy cluttered foreground, text, watermark, logo, subtitles, blurry face, extra limbs, morphed fingers, studio lighting, neon lights, high saturation, modern minimalist western furniture, heavy makeup, wide eyes, caricature, distorted proportions, multiple people merged, floating objects. bright daylight, outdoor setting, overexposed highlights, lens flare',
  },
  {
    start_index: 958,
    end_index: 967,
    location_setting: 'Traditional Japanese living room — interior, evening',
    characters_in_scene: ['Protagonist Father', 'Love Interest / Sister-in-Law', 'Daughter'],
    expression_used: {
      'Protagonist Father': 'neutral',
      'Love Interest / Sister-in-Law': 'neutral',
      Daughter: 'neutral',
    },
    scene_variables: {
      CHARACTER_POSITIONS: 'Yuriko on the right third, leaning toward the center; Haruka in the center; Masashi on the left third.',
      ACTION:
        "Yuriko is gently stroking Haruka's blunt bangs with a soft touch; Masashi is looking at them both with a calm, melancholic smile; Haruka has stopped crying and is looking at Yuriko with a vacant, wide-eyed stare of relief.",
      LIGHTING_MODIFIER: 'Natural window light + warm domestic tungsten fill + hazy atmospheric dust motes, golden hour glow',
      FOREGROUND_ELEMENT: "A pair of worn child's red sneakers at the edge of frame, foreground blur right.",
    },
    visual_description:
      "The relief and forgiveness scene. A major visual context shift from tension to reconciliation and physical affection. The lighting becomes warmer and more 'relieving'.",
    final_prompt:
      "Japanese domestic realism, cinematic film still, warm amber lighting, muted teal accents, soft window light, shallow depth of field, 8k resolution, highly detailed textures, shot on Arri Alexa., A lived-in Japanese apartment interior. The living room is cluttered with moving boxes and child's toys. A traditional wooden dining table sits in the center. In the background, a small Buddhist altar (Butsudan) holds a framed funeral photograph of a woman with a black ribbon. Low morning sun streams through sheer white curtains, illuminating dust motes in the air. Tatami flooring meets dark wood accents., Japanese man, appears mid-30s, lean oval face, hooded dark eyes, tired features, thick furrowed brows, straight nose, thin lips, pale skin with dark circles, messy short black hair, slender frame, navy blue linen button-down shirt with rolled sleeves, charcoal chinos, silver wedding band on left hand, slight stubble. melancholic gaze, lips flat, slight tension in the brow, Japanese woman, appears late 30s, elegant diamond face, high cheekbones, large almond eyes, thin arched brows, slender nose, porcelain pale skin, long ebony hair in low ponytail, emaciated frame with visible collarbones, oversized cream cable knit sweater, olive green pleated skirt, jade stud earrings. composed, gentle half-smile that doesn't reach the eyes, Japanese girl, 4 years old, round chubby face, large round eyes, small button nose, peach-toned skin, straight black hair with blunt bangs, petite child, yellow cotton shirt with white flowers, denim overalls, red sneakers, pink butterfly hair clip. vacant, wide-eyed stare, head tilted slightly, Yuriko on the right third, leaning toward the center; Haruka in the center; Masashi on the left third., Yuriko is gently stroking Haruka's blunt bangs with a soft touch; Masashi is looking at them both with a calm, melancholic smile; Haruka has stopped crying and is looking at Yuriko with a vacant, wide-eyed stare of relief., Natural window light + warm domestic tungsten fill + hazy atmospheric dust motes, golden hour glow, A pair of worn child's red sneakers at the edge of frame, foreground blur right., rule of thirds composition, negative space on left third and bottom 20% for subtitles, deep focus f/8, 16:9 aspect ratio, 8K resolution, ultra-detailed textures, no text, no watermark, no cluttered center --ar 16:9",
    negative_prompt:
      'anime, manga, cartoon, 3D render, CGI, stylized, western features, blue eyes, blonde hair, messy cluttered foreground, text, watermark, logo, subtitles, blurry face, extra limbs, morphed fingers, studio lighting, neon lights, high saturation, modern minimalist western furniture, heavy makeup, wide eyes, caricature, distorted proportions, multiple people merged, floating objects. bright daylight, outdoor setting, overexposed highlights, lens flare',
  },
  {
    start_index: 968,
    end_index: 988,
    location_setting: 'Traditional Japanese apartment living room — interior, night',
    characters_in_scene: ['Protagonist Father', 'Love Interest / Sister-in-Law'],
    expression_used: {
      'Protagonist Father': 'neutral',
      'Love Interest / Sister-in-Law': 'neutral',
    },
    scene_variables: {
      CHARACTER_POSITIONS:
        'Yuriko seated on the right third of the sofa, looking slightly upward into the distance; Masashi seated on a chair on the left third of the frame, leaning forward.',
      ACTION:
        'Yuriko is staring into the empty air as if seeing the past, her hands resting still on her knees. Masashi is listening intently, his body angled toward her with his hands clasped between his knees.',
      LIGHTING_MODIFIER: 'dim light from a single floor lamp, deep shadows in the corners, soft warm glow on faces',
      FOREGROUND_ELEMENT: 'a small ceramic tea cup on a low table, out of focus, foreground left',
    },
    visual_description:
      'The scene shifts to nighttime after Haruka has fallen asleep. The atmosphere is quiet and heavy with the weight of long-held secrets. Yuriko begins her revelation in a state of calm, melancholic reflection, visually detached from the present as she recounts the graduation day confrontation.',
    final_prompt:
      "Japanese domestic realism, cinematic film still, warm amber lighting, muted teal accents, soft window light, shallow depth of field, 8k resolution, highly detailed textures, shot on Arri Alexa., A lived-in Japanese apartment interior. The living room is cluttered with moving boxes and child's toys. A traditional wooden dining table sits in the center. In the background, a small Buddhist altar (Butsudan) holds a framed funeral photograph of a woman with a black ribbon. Low morning sun streams through sheer white curtains, illuminating dust motes in the air. Tatami flooring meets dark wood accents., Japanese man, appears mid-30s, lean oval face, hooded dark eyes, tired features, thick furrowed brows, straight nose, thin lips, pale skin with dark circles, messy short black hair, slender frame, navy blue linen button-down shirt with rolled sleeves, charcoal chinos, silver wedding band on left hand, slight stubble. melancholic gaze, lips flat, slight tension in the brow, Japanese woman, appears late 30s, elegant diamond face, high cheekbones, large almond eyes, thin arched brows, slender nose, porcelain pale skin, long ebony hair in low ponytail, emaciated frame with visible collarbones, oversized cream cable knit sweater, olive green pleated skirt, jade stud earrings. composed, gentle half-smile that doesn't reach the eyes, Yuriko seated on the right third of the sofa, looking slightly upward into the distance; Masashi seated on a chair on the left third of the frame, leaning forward., Yuriko is staring into the empty air as if seeing the past, her hands resting still on her knees. Masashi is listening intently, his body angled toward her with his hands clasped between his knees., dim light from a single floor lamp, deep shadows in the corners, soft warm glow on faces, a small ceramic tea cup on a low table, out of focus, foreground left, rule of thirds composition, negative space on left third and bottom 20% for subtitles, deep focus f/8, 16:9 aspect ratio, 8K resolution, ultra-detailed textures, no text, no watermark, no cluttered center --ar 16:9",
    negative_prompt:
      'anime, manga, cartoon, 3D render, CGI, stylized, western features, blue eyes, blonde hair, messy cluttered foreground, text, watermark, logo, subtitles, blurry face, extra limbs, morphed fingers, studio lighting, neon lights, high saturation, modern minimalist western furniture, heavy makeup, wide eyes, caricature, distorted proportions, multiple people merged, floating objects, bright daylight, outdoor setting, overexposed highlights, lens flare, third person, background crowd, extra faces',
  },
  {
    start_index: 989,
    end_index: 1003,
    location_setting: 'Traditional Japanese apartment living room — interior, night',
    characters_in_scene: ['Protagonist Father', 'Love Interest / Sister-in-Law'],
    expression_used: {
      'Protagonist Father': 'sad_or_vulnerable',
      'Love Interest / Sister-in-Law': 'sad_or_vulnerable',
    },
    scene_variables: {
      CHARACTER_POSITIONS:
        'Yuriko seated on the right third, hunched slightly forward; Masashi remains on the left third, reaching out a hand slightly toward her.',
      ACTION:
        "Tears are streaming down Yuriko's face, her shoulders are shaking as she speaks. Her hands are trembling, clutching her own sweater sleeves. Masashi has his mouth slightly open, eyes glistening with shared pain.",
      LIGHTING_MODIFIER: 'soft diffused light, long shadows stretching across the tatami, focus on the glint of tears',
      FOREGROUND_ELEMENT: 'the creased, yellowed high school letter resting on the table, sharp foreground focus',
    },
    visual_description:
      'The climax of the revelation. The visual state shifts from reflection to active grieving as Yuriko realizes the true cost of the sacrifice. The focus tightens on the emotional breakdown and the physical evidence of the past (the letter).',
    final_prompt:
      "Japanese domestic realism, cinematic film still, warm amber lighting, muted teal accents, soft window light, shallow depth of field, 8k resolution, highly detailed textures, shot on Arri Alexa., A lived-in Japanese apartment interior. The living room is cluttered with moving boxes and child's toys. A traditional wooden dining table sits in the center. In the background, a small Buddhist altar (Butsudan) holds a framed funeral photograph of a woman with a black ribbon. Low morning sun streams through sheer white curtains, illuminating dust motes in the air. Tatami flooring meets dark wood accents., Japanese man, appears mid-30s, lean oval face, hooded dark eyes, tired features, thick furrowed brows, straight nose, thin lips, pale skin with dark circles, messy short black hair, slender frame, navy blue linen button-down shirt with rolled sleeves, charcoal chinos, silver wedding band on left hand, slight stubble. eyes glistening with tears, mouth slightly open and trembling, head tilted down, Japanese woman, appears late 30s, elegant diamond face, high cheekbones, large almond eyes, thin arched brows, slender nose, porcelain pale skin, long ebony hair in low ponytail, emaciated frame with visible collarbones, oversized cream cable knit sweater, olive green pleated skirt, jade stud earrings. heavy weeping, face buried in hands, shoulders shaking, eyes red-rimmed, Yuriko seated on the right third, hunched slightly forward; Masashi remains on the left third, reaching out a hand slightly toward her., Tears are streaming down Yuriko's face, her shoulders are shaking as she speaks. Her hands are trembling, clutching her own sweater sleeves. Masashi has his mouth slightly open, eyes glistening with shared pain., soft diffused light, long shadows stretching across the tatami, focus on the glint of tears, the creased, yellowed high school letter resting on the table, sharp foreground focus, rule of thirds composition, negative space on left third and bottom 20% for subtitles, deep focus f/8, 16:9 aspect ratio, 8K resolution, ultra-detailed textures, no text, no watermark, no cluttered center --ar 16:9",
    negative_prompt:
      'anime, manga, cartoon, 3D render, CGI, stylized, western features, blue eyes, blonde hair, messy cluttered foreground, text, watermark, logo, subtitles, blurry face, extra limbs, morphed fingers, studio lighting, neon lights, high saturation, modern minimalist western furniture, heavy makeup, wide eyes, caricature, distorted proportions, multiple people merged, floating objects, bright daylight, outdoor setting, overexposed highlights, lens flare, third person, background crowd, extra faces',
  },
  {
    start_index: 1004,
    end_index: 1014,
    location_setting: 'Traditional Japanese apartment living room — interior, evening',
    characters_in_scene: ['Protagonist Father', 'Love Interest / Sister-in-Law'],
    expression_used: {
      'Protagonist Father': 'sad_or_vulnerable',
      'Love Interest / Sister-in-Law': 'sad_or_vulnerable',
    },
    scene_variables: {
      CHARACTER_POSITIONS: 'Masashi leaning forward on the right third, Yuriko seated on the left third of the sofa.',
      ACTION:
        "Masashi is tightly grasping both of Yuriko's hands within his own. Yuriko is nodding slowly, leaning her forehead toward his, both of them crying with expressions of profound relief.",
      LIGHTING_MODIFIER: 'soft diffused window light from left, long shadow across floor, warm amber glow from a single floor lamp',
      FOREGROUND_ELEMENT: 'a small, half-filled ceramic teacup on the low wooden table, sharp foreground blur',
    },
    visual_description:
      "The scene continues from the previous chapter's location. The visual focus is the physical connection of their hands and the intimate proximity as Masashi confesses and proposes. The lighting is warm and domestic, emphasizing the emotional breakthrough.",
    final_prompt:
      "Japanese domestic realism, cinematic film still, warm amber lighting, muted teal accents, soft window light, shallow depth of field, 8k resolution, highly detailed textures, shot on Arri Alexa., A lived-in Japanese apartment interior. The living room is cluttered with moving boxes and child's toys. A traditional wooden dining table sits in the center. In the background, a small Buddhist altar (Butsudan) holds a framed funeral photograph of a woman with a black ribbon. Low morning sun streams through sheer white curtains, illuminating dust motes in the air. Tatami flooring meets dark wood accents., Japanese man, appears mid-30s, lean oval face, hooded dark eyes, tired features, thick furrowed brows, straight nose, thin lips, pale skin with dark circles, messy short black hair, slender frame, navy blue linen button-down shirt with rolled sleeves, charcoal chinos, silver wedding band on left hand, slight stubble. eyes glistening with tears, mouth slightly open and trembling, head tilted down, Japanese woman, appears late 30s, elegant diamond face, high cheekbones, large almond eyes, thin arched brows, slender nose, porcelain pale skin, long ebony hair in low ponytail, emaciated frame with visible collarbones, oversized cream cable knit sweater, olive green pleated skirt, jade stud earrings. heavy weeping, face buried in hands, shoulders shaking, eyes red-rimmed, Masashi leaning forward on the right third, Yuriko seated on the left third of the sofa., Masashi is tightly grasping both of Yuriko's hands within his own. Yuriko is nodding slowly, leaning her forehead toward his, both of them crying with expressions of profound relief., soft diffused window light from left, long shadow across floor, warm amber glow from a single floor lamp, a small, half-filled ceramic teacup on the low wooden table, sharp foreground blur, rule of thirds composition, negative space on right third and bottom 20% for subtitles, deep focus f/8, 16:9 aspect ratio, 8K resolution, ultra-detailed textures, no text, no watermark, no cluttered center --ar 16:9",
    negative_prompt:
      'anime, manga, cartoon, 3D render, CGI, stylized, western features, blue eyes, blonde hair, messy cluttered foreground, text, watermark, logo, subtitles, blurry face, extra limbs, morphed fingers, studio lighting, neon lights, high saturation, modern minimalist western furniture, heavy makeup, wide eyes, caricature, distorted proportions, multiple people merged, floating objects., calm expression, smiling face, relaxed posture, bright daylight, outdoor setting, overexposed highlights, lens flare, third person, background crowd, extra faces',
  },
  {
    start_index: 1015,
    end_index: 1021,
    location_setting: 'Traditional Japanese apartment living room — interior, evening',
    characters_in_scene: ['Protagonist Father', 'Love Interest / Sister-in-Law'],
    expression_used: {
      'Protagonist Father': 'neutral',
      'Love Interest / Sister-in-Law': 'neutral',
    },
    scene_variables: {
      CHARACTER_POSITIONS: 'Masashi and Yuriko embracing on the left third, silhouettes against the soft light.',
      ACTION:
        "Masashi and Yuriko are in a quiet, protective embrace, heads resting on each other's shoulders, looking toward the distant background where a child's toy is visible. Their expressions are now calm and reflective.",
      LIGHTING_MODIFIER: 'Golden hour light casting long, warm shadows across the room, highlighting the dust motes in the air.',
      FOREGROUND_ELEMENT: 'the framed photograph of Maiko on the Butsudan altar, slightly out of focus in the foreground right',
    },
    visual_description:
      'A visual context shift to a calm, symbolic conclusion. The focus moves from the intense physical proposal to a quiet embrace that looks toward the future, incorporating the memory of the deceased sister in the foreground.',
    final_prompt:
      "Japanese domestic realism, cinematic film still, warm amber lighting, muted teal accents, soft window light, shallow depth of field, 8k resolution, highly detailed textures, shot on Arri Alexa., A lived-in Japanese apartment interior. The living room is cluttered with moving boxes and child's toys. A traditional wooden dining table sits in the center. In the background, a small Buddhist altar (Butsudan) holds a framed funeral photograph of a woman with a black ribbon. Low morning sun streams through sheer white curtains, illuminating dust motes in the air. Tatami flooring meets dark wood accents., Japanese man, appears mid-30s, lean oval face, hooded dark eyes, tired features, thick furrowed brows, straight nose, thin lips, pale skin with dark circles, messy short black hair, slender frame, navy blue linen button-down shirt with rolled sleeves, charcoal chinos, silver wedding band on left hand, slight stubble. melancholic gaze, lips flat, slight tension in the brow, Japanese woman, appears late 30s, elegant diamond face, high cheekbones, large almond eyes, thin arched brows, slender nose, porcelain pale skin, long ebony hair in low ponytail, emaciated frame with visible collarbones, oversized cream cable knit sweater, olive green pleated skirt, jade stud earrings. composed, gentle half-smile that doesn't reach the eyes, Masashi and Yuriko embracing on the left third, silhouettes against the soft light., Masashi and Yuriko are in a quiet, protective embrace, heads resting on each other's shoulders, looking toward the distant background where a child's toy is visible. Their expressions are now calm and reflective., Golden hour light casting long, warm shadows across the room, highlighting the dust motes in the air., the framed photograph of Maiko on the Butsudan altar, slightly out of focus in the foreground right, rule of thirds composition, negative space on right third and bottom 20% for subtitles, deep focus f/8, 16:9 aspect ratio, 8K resolution, ultra-detailed textures, no text, no watermark, no cluttered center --ar 16:9",
    negative_prompt:
      'anime, manga, cartoon, 3D render, CGI, stylized, western features, blue eyes, blonde hair, messy cluttered foreground, text, watermark, logo, subtitles, blurry face, extra limbs, morphed fingers, studio lighting, neon lights, high saturation, modern minimalist western furniture, heavy makeup, wide eyes, caricature, distorted proportions, multiple people merged, floating objects., third person, background crowd, extra faces',
  },
  {
    start_index: 1022,
    end_index: 1030,
    location_setting: 'Traditional Japanese park — exterior, soft golden hour',
    characters_in_scene: ['Protagonist Father', 'Love Interest / Sister-in-Law', 'Daughter'],
    expression_used: {
      'Protagonist Father': 'neutral',
      'Love Interest / Sister-in-Law': 'neutral',
      Daughter: 'neutral',
    },
    scene_variables: {
      CHARACTER_POSITIONS: 'Masashi and Yuriko walking on the right third, holding hands; Haruka running slightly ahead on the left third',
      ACTION:
        'The family is walking away from the camera into a soft sunset, blurred in the background to emphasize the closing of their story',
      LIGHTING_MODIFIER: 'hazy golden hour glow, backlighting the figures to create a soft rim light effect',
      FOREGROUND_ELEMENT: "a stylized graphic heart icon and 'Subscribe' button centered, sharp focus foreground",
    },
    visual_description:
      "The scene shifts from the intimate domestic setting to a broad, symbolic park setting to represent a 'happily ever after' and transition into the channel's call-to-action.",
    final_prompt:
      "Japanese domestic realism, cinematic film still, warm amber lighting, muted teal accents, soft window light, shallow depth of field, 8k resolution, highly detailed textures, shot on Arri Alexa., A serene Japanese public park at sunset. Tall cherry blossoms and manicured greenery under a hazy golden sky. A gravel path leads into the distance. The overall atmosphere is nostalgic and warm, mirroring the 'Koreeda' aesthetic of the domestic scenes but in an expansive outdoor setting., Japanese man, appears mid-30s, lean oval face, hooded dark eyes, tired features, thick furrowed brows, straight nose, thin lips, pale skin with dark circles, messy short black hair, slender frame, navy blue linen button-down shirt with rolled sleeves, charcoal chinos, silver wedding band on left hand, slight stubble. melancholic gaze, lips flat, slight tension in the brow, Japanese woman, appears late 30s, elegant diamond face, high cheekbones, large almond eyes, thin arched brows, slender nose, porcelain pale skin, long ebony hair in low ponytail, emaciated frame with visible collarbones, oversized cream cable knit sweater, olive green pleated skirt, jade stud earrings. composed, gentle half-smile that doesn't reach the eyes, Japanese girl, 4 years old, round chubby face, large round eyes, small button nose, peach-toned skin, straight black hair with blunt bangs, petite child, yellow cotton shirt with white flowers, denim overalls, red sneakers, pink butterfly hair clip. vacant, wide-eyed stare, head tilted slightly, Masashi and Yuriko walking on the right third, holding hands; Haruka running slightly ahead on the left third, The family is walking away from the camera into a soft sunset, blurred in the background to emphasize the closing of their story, hazy golden hour glow, backlighting the figures to create a soft rim light effect, a stylized graphic heart icon and 'Subscribe' button centered, sharp focus foreground, rule of thirds composition, negative space on left third and bottom 20% for subtitles, deep focus f/8, 16:9 aspect ratio, 8K resolution, ultra-detailed textures, no text, no watermark, no cluttered center --ar 16:9",
    negative_prompt:
      'anime, manga, cartoon, 3D render, CGI, stylized, western features, blue eyes, blonde hair, messy cluttered foreground, text, watermark, logo, subtitles, blurry face, extra limbs, morphed fingers, studio lighting, neon lights, high saturation, modern minimalist western furniture, heavy makeup, wide eyes, caricature, distorted proportions, multiple people merged, floating objects, previous location elements, Traditional Japanese kitchen',
  },
];

async function testGenerate() {
  const PROFILES = [1];
  let nextIndex = 0;

  async function worker(workerIndex) {
    const profileNum = PROFILES[workerIndex];
    let context, page;
    let pendingScenes = [];

    try {
      console.log(`[Profile ${profileNum}] Đang mở Flow Page...`);
      const flowRes = await openFlowPage({ profile: profileNum, projectId: flowSettings.FLOW_PROJECT_ID });
      context = flowRes.context;
      page = flowRes.page;

      await attachImage(page);

      // Lắng nghe response trả về từ Flow
      page.on('response', async res => {
        const isMatch = res
          .url()
          .includes(`https://aisandbox-pa.googleapis.com/v1/projects/${flowSettings.FLOW_PROJECT_ID}/flowMedia:batchGenerateImages`);
        if (isMatch) {
          if (res.status() === 403) {
            console.error(`❌ [Profile ${profileNum}] Lỗi 403: Không có quyền truy cập hoặc bị chặn!`);
            return;
          }
          if (res.status() === 400) {
            console.error(`❌ [Profile ${profileNum}] Lỗi 400: Vi phạm chính sách tạo ảnh`);
            // Vẫn pop queue để không bị lệch các ảnh sau
            pendingScenes.shift();
            return;
          }
          if (res.status() > 400) {
            console.error(`❌ [Profile ${profileNum}] Server trả lỗi: ${res.status()}`);
            pendingScenes.shift();
            return;
          }

          try {
            const data = await res.json();
            const imageUrl = data?.media?.[0]?.image?.generatedImage?.fifeUrl;
            const sceneName = pendingScenes.shift() || `unknown_${Date.now()}`;

            if (!imageUrl) {
              console.warn(`[Profile ${profileNum}] Không lấy được ảnh từ flow cho ${sceneName}`);
              return;
            }

            const imageData = await fetch(imageUrl);
            const imageBuffer = await imageData.arrayBuffer();
            const imageBase64 = Buffer.from(imageBuffer).toString('base64');

            const folder = path.join(process.cwd(), 'downloads', 'test_images');
            fs.mkdirSync(folder, { recursive: true });

            const base64OutputPath = path.join(folder, `${sceneName}.jpg`);
            fs.writeFileSync(base64OutputPath, imageBase64, 'base64');
            console.log(`🖼️ [Profile ${profileNum}] Đã lưu thành công ảnh: ${sceneName}.jpg`);
          } catch (e) {
            console.error(`❌ [Profile ${profileNum}] Lỗi khi tải/lưu ảnh:`, e.message);
          }
        }
      });
    } catch (error) {
      console.error(`❌ [Profile ${profileNum}] Lỗi khi khởi tạo Flow Page:`, error.message);
      return;
    }

    while (true) {
      const currentIndex = nextIndex++;
      if (currentIndex >= data.length) break;

      const item = data[currentIndex];
      const prompt = item.final_prompt;

      if (!prompt) {
        console.warn(`[Profile ${profileNum}] Bỏ qua item ${item.start_index} vì không có final_prompt.`);
        continue;
      }

      console.log(`[Profile ${profileNum}] Gửi prompt cho scene ${item.start_index}...`);

      try {
        pendingScenes.push(`scene_${item.start_index}`);
        await generateImage(page, prompt);
        console.log(`✅ [Profile ${profileNum}] Đã nhập xong prompt scene ${item.start_index}`);
        await delay(1000); // 1s delay
      } catch (error) {
        console.error(`❌ [Profile ${profileNum}] Lỗi khi gửi prompt cho scene ${item.start_index}:`, error.message);
        pendingScenes.pop(); // Revert queue if failed to send
      }
    }

    console.log(`[Profile ${profileNum}] Hoàn thành việc gửi prompt. Giữ trình duyệt mở để xử lý...`);
  }

  console.log(`Bắt đầu chạy test tạo ảnh với ${data.length} items sử dụng profile ${PROFILES.join(', ')}...`);
  await Promise.all(PROFILES.map((_, i) => worker(i)));
  console.log('🎉 Đã gửi toàn bộ prompt lên flow!');
}

testGenerate();
