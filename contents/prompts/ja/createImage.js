export const createPromptToCreateThumbnailOnlyTextFromImage = (title, summary) => `
Use the provided reference image as the base.

INPUT CONTENT:
Title: ${title}
Summary: ${summary}

GOAL:
Enhance the thumbnail to make it more dramatic and eye-catching.

CHARACTER SAFETY (IMPORTANT):
- If there are any people or characters in the image:
  - Keep ALL characters exactly as they are
  - Do NOT remove, replace, or redraw them
  - Only apply minor edits (expression, lighting, color)

IF NO CHARACTERS:
- You may freely enhance composition, lighting, and visual impact
- You may add dramatic effects while keeping the original theme

GENERAL RULES:
- Do not drastically change layout
- Do not create a completely new scene
- Keep the original structure recognizable

STYLE:
- Japanese 2ch-style dramatic thumbnail
- high contrast
- bold colors (red/yellow)
- strong emotional impact

TEXT:
- Add short Japanese 2ch-style text (1–2 lines)
- dramatic and attention-grabbing

OUTPUT:
- Enhanced version of the original image
- Preserving core elements and structure
`;

export const promptToCreateThumbnail = (title, summary) => `
You are an expert Japanese YouTube thumbnail designer and visual editor.

Your task is to CREATE A NEW THUMBNAIL by editing the provided reference image.

INPUT:
- Reference Image (attached)
- Title: ${title}
- Summary: ${summary}
--------------------------------------------------
CORE RULE (HIGHEST PRIORITY – MUST FOLLOW):

You MUST PRESERVE the EXACT SAME CHARACTERS from the reference image.

- Keep identical face identity, facial structure, hairstyle, hair color, outfit, and overall design.
- DO NOT redesign or reinterpret the characters.
- DO NOT change them into another person.
- DO NOT change art style of the characters.
- Treat the reference image as the ONLY source of truth.

If uncertain, COPY the character appearance from the reference image instead of generating new ones.

Allowed changes ONLY:
- facial expression (emotion)
- pose / body language
- position in the frame
- lighting / color / effects
- scene context (background)

--------------------------------------------------
ANTI-DRIFT CONSTRAINTS:

- Image-to-image transformation strength MUST be LOW (preserve identity strongly).
- Keep 90–100% visual similarity of characters.
- Do NOT add new main characters.
- Do NOT crop out important facial features.
- Avoid distortion, mutation, or style shift.

--------------------------------------------------
AUTO CONTENT UNDERSTANDING:

- Analyze Title + Summary to detect the content type automatically:
  (drama, betrayal, horror, romance, revenge, comedy, mystery, etc.)

- Select the MOST emotionally intense or curiosity-driven moment.

- Build the thumbnail around:
  → conflict
  → emotional peak
  → unexpected situation

--------------------------------------------------
EMOTION DESIGN (CRITICAL FOR CTR):

- Strong exaggerated expressions:
  shock, rage, fear, panic, crying, smug, guilt

- Eyes must be highly expressive and sharp
- Emotion must be readable at small thumbnail size

--------------------------------------------------
COMPOSITION (HIGH CTR):

- Focus on 1 main scene only
- Close-up or medium shot (faces clearly visible)
- Use asymmetric layout (one dominant subject, one reacting)
- Clear foreground vs background separation
- Avoid clutter

--------------------------------------------------
JAPANESE THUMBNAIL STYLE:

- Automatically adapt style based on content:
  - drama → cinematic / realistic
  - 2ch → manga/anime exaggerated
  - horror → dark, high contrast
  - romance → softer lighting

- Add short Japanese text (3–6 words max):
  - bold, large, readable on mobile
  - curiosity-driven, NOT full sentence

Examples:
「裏切り!?」
「何が起きた」
「衝撃の真実」
「まさか…」

--------------------------------------------------
VISUAL IMPACT:

- High contrast lighting
- Dramatic shadows / rim light
- Color storytelling:
  red = danger / betrayal
  blue = sadness
  yellow = shock

- Optional elements:
  phone, message bubble, broken objects, symbolic hints

--------------------------------------------------
QUALITY:

- ultra sharp
- high resolution
- cinematic lighting
- clear focal point
- optimized for small mobile view

--------------------------------------------------
NEGATIVE CONSTRAINTS:

- no new characters
- no face distortion
- no identity change
- no blurry image
- no low contrast
- no clutter
- no unreadable text
- no extreme violence or explicit content

--------------------------------------------------
OUTPUT:

A high-CTR Japanese-style YouTube thumbnail that:
- keeps EXACT SAME characters from the reference image
- reflects the story from title + summary
- maximizes curiosity and emotional impact
`;

export const promptToCreateThumbnailSukatto = (title, summary) => `
You are an expert Japanese YouTube thumbnail designer specializing in the "Sukatto" (cathartic revenge) and "2ch/5ch Story" niche. Your goal is to maximize CTR by creating high-tension, emotional, and text-heavy visuals.

Your task is to CREATE A NEW THUMBNAIL by editing the provided reference image.

INPUT:
- Reference Image: (Attached)
- Title: ${title}
- Summary: ${summary}

--------------------------------------------------
CORE RULE (HIGHEST PRIORITY):
You MUST PRESERVE the EXACT SAME CHARACTERS from the reference image.
- Keep identical face identity, facial structure, hairstyle, hair color, and outfit.
- DO NOT change the 2D Anime/Manga art style.
- Consistency is key: the characters must be recognizable as the same people from the video series.

--------------------------------------------------
ANTI-DRIFT CONSTRAINTS:
- Image-to-image transformation strength: LOW (95–100% visual similarity).
- Do NOT add new main characters.
- Do NOT crop out the dramatic facial expressions.

--------------------------------------------------
AUTO CONTENT UNDERSTANDING (SUKATTO SPECIALIZED):
- Analyze the Title + Summary to detect the "Zamaa" (Payback) or "Shuraba" (Conflict) moment.
- Identify the Villain (Antagonist) and the Hero (Protagonist).
- Focus the thumbnail on the peak moment of "Truth Revealed" or "Divine Punishment."

--------------------------------------------------
EMOTION DESIGN (THE "FACE FAULT" STYLE):
- The Villain: Exaggerated "Kao-gei" (facial performance). Eyes wide with terror, heavy sweating (manga style), mouth agape in shock. Use dark eye-shadowing to represent despair.
- The Protagonist: Cold, smug, or a satisfied smirk (Niyari). Sharp, confident eyes looking directly at the villain or the viewer.
- Use Manga symbols: Vein marks (anger), tear drops (despair), or glowing eyes (power).

--------------------------------------------------
COMPOSITION (SPLIT-SCREEN DYNAMICS):
- Use a "Split Composition" (Diagonal or Vertical).
- Side A (Despair): The villain's face in a dark, blue/purple tinted close-up.
- Side B (Victory): The protagonist's face or upper body in a bright, high-contrast spotlight.
- Background: Use "Speed Lines" or "Focus Lines" radiating from the center to create urgency.

--------------------------------------------------
JAPANESE THUMBNAIL STYLE:
- Typography: Bold, "Gothic" or "Display" fonts with 2-3 layers of thick strokes (Outline).
- Zabuton: Place text on high-contrast color blocks (Red, Black, or Yellow).
- Add Japanese Text (Choose the most fitting for CTR):
  - 「絶望の瞬間」 (Moment of Despair)
  - 「自業自得ｗ」 (You get what you deserve lol)
  - 「衝撃の結末」 (Shocking ending)
  - 「復讐開始」 (Revenge begins)
  - 「サヨナラ…」 (Goodbye...)
- Use Japanese symbols: 【 】, ！, ？, ｗ

--------------------------------------------------
VISUAL IMPACT:
- Color Palette: 
  - Red/Yellow = High energy / Warning / Success.
  - Black/Dark Purple = Evil / Betrayal / Sadness.
- Lighting: Dramatic rim lighting to make characters "pop" from the background.
- Props: Include symbolic items mentioned in the summary (e.g., Divorce papers, Smartphone with a secret message, a pile of cash, or a Tower Mansion silhouette).

--------------------------------------------------
QUALITY:
- Ultra-sharp 2D Anime rendering.
- High saturation and contrast for mobile readability.
- Clear focal point on the eyes and mouth of characters.

--------------------------------------------------
NEGATIVE CONSTRAINTS:
- No realistic/3D shift.
- No identity drift (must be the same characters).
- No unreadable or thin text.
- No calm or subtle expressions; must be EXTREME.

--------------------------------------------------
OUTPUT:
A high-CTR Japanese "Sukatto" style thumbnail that captures the exact moment the villain realizes they have lost, using aggressive Japanese typography and character-driven storytelling.
`;
