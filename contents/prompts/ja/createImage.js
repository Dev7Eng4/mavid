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

export const promptToCreateThumbnailSukattoFulLText = (title, summary) => `
You are an expert Japanese YouTube visual editor specializing in "Sukatto" (Revenge/Satisfaction) thumbnails. Your goal is to maximize CTR by using long, narrative text lines that cover nearly 80% of the image, mimicking the viral "2ch/Net Story" style common in Japan.

Your task is to analyze the provided Title and Summary to automatically generate 5 LONG narrative lines in Japanese, then render them into a fixed-layout, photorealistic thumbnail.

INPUT:
- Title: ${title}
- Summary: ${summary}

--------------------------------------------------
CORE RULE (IDENTITY & STYLE):
1. PRESERVE THE PERSON: Use the EXACT person from the reference image.
   - Style: PHOTOREALISTIC / 8K DIGITAL PHOTOGRAPHY.
   - Placement: FAR RIGHT (occupying only 20-25% of the frame). 
   - Expression: Ensure the character shows a dramatic expression (e.g., extreme panic for the villain or a cold, victorious gaze for the hero).
2. BACKGROUND IMAGE (FIXED): A consistent [DARK GREY TO DEEP BLUE GRADIENT] or [DRAMATIC VIGNETTE WALL] to make the text blocks pop.

--------------------------------------------------
AUTO-CONTENT GENERATION (SUKATTO NARRATIVE LOGIC):
Based on the Title and Summary, generate 5 LONG, descriptive Japanese lines (approx. 14-20 characters per line):
- LINE 1: The "Status Quo/Setting" (e.g., The relationship or the villain's arrogance).
- LINE 2: The "Betrayal/Conflict" (e.g., The moment the wrongdoing is discovered).
- LINE 3: The "Evidence/Secret" (e.g., A shocking revelation or "The DNA results were...").
- LINE 4: The "Dialogue/Counterattack" (e.g., A direct quote of revenge in brackets 「 」).
- LINE 5: The "Sukatto Result" (e.g., The total destruction of the villain/The final karma).

--------------------------------------------------
FIXED 5-LINE VISUAL SYSTEM (MANDATORY COLORS & SPACING):
Render the long text lines into 5 vertical stacks that fill the screen from the FAR LEFT right up to the person on the right.

- LINE 1: [Text: Black] on [Zabuton: Bright Yellow]. (Top attention-grabber).
- LINE 2: [Text: White] on [Zabuton: Deep Crimson Red]. (The main drama/conflict).
- LINE 3: [Text: White] on [Zabuton: Solid Black]. (The dark secret/narrative).
- LINE 4: [Text: White] on [Zabuton: Royal Blue]. (The counterattack/action).
- LINE 5: [Text: Bright Yellow or Gold]. (The Victory). **NO ZABUTON/NO BACKGROUND BLOCK.** Render directly on the image background. Use a massive font size + thick black outline + outer white glow to make it the ultimate focal point.

TYPOGRAPHY RULES:
- Use ultra-heavy, condensed Japanese Gothic fonts (e.g., "M+ Fonts" or "Kinto Sans").
- Text must be MASSIVE, BOLD, and STRETCHED to occupy almost the entire left-to-center area.
- Line spacing must be tight (compact) to create the "Information-Overload" feel.

--------------------------------------------------
VISUAL IMPACT:
- Person: Sharp focus, studio lighting, looking directly at the "shuraba" (drama) happening in the text.
- Atmosphere: Intense, high-tension, and "must-click" energy.
- Quality: 8k resolution, ultra-sharp text rendering with zero artifacts.

--------------------------------------------------
NEGATIVE CONSTRAINTS:
- NO ANIME/MANGA style characters (keep it photorealistic).
- NO empty space or margins on the left.
- NO short lines; every line must be a long, narrative phrase.
- LINE 5 must have NO background color block.

--------------------------------------------------
OUTPUT:
A high-CTR Sukatto-style thumbnail. The real person is on the far right. The rest of the image (80%) is a dense "Wall of Text" with 5 long, vertically stacked narrative lines. Lines 1-4 have fixed color blocks (Yellow, Red, Black, Blue), and Line 5 is free-standing yellow text, all extending right up to the character silhouette.
`;

export const promptToCreateThumbnailLove = (title, summary) => `
You are an expert Japanese YouTube visual editor specializing in "Information-Overload" thumbnails for the dating/romance niche. Your goal is to maximize CTR by using long, narrative text lines that cover nearly 80% of the image.

INPUT:
- Title: ${title} 
- Summary: ${summary} 

--------------------------------------------------
CORE RULE (IDENTITY & STYLE - CHARACTER VARIETY & CONTEXT):
1. THE PERSON: A unique young Japanese woman, early 20s. 
   - VARIETY STRATEGY: For every single generation, STERNLY RANDOMIZE features to avoid repetitive faces (e.g., facial structure, hairstyle, clothing).
   - CONTEXT ADAPTATION: The appearance and clothing **must directly match the story context** provided in the Title and Summary. 
     * **Example (Workplace):** The woman is an OL (Office Lady), mid-20s, with a round face, a high bun hairstyle with panic-induced strands loose. She is wearing professional OL attire: a white button-down shirt and a black business suit blazer. Expression: Shocked, eyes wide, hands over mouth. Holding an office mug tensely.
   - Style: PHOTOREALISTIC / 8K DIGITAL PHOTOGRAPHY / HIGH-QUALITY SKIN TEXTURE.
   - Placement: FAR RIGHT (occupying only 20% of the frame).

2. BACKGROUND (FIXED): [LINEAR GRADIENT BACKGROUND] featuring distinct diagonal transitions of light pink and soft rose tones. (A very subtle, blurred background detail related to the context, like a pantry corner, may be integrated).

--------------------------------------------------
AUTO-CONTENT GENERATION (LONG NARRATIVE LOGIC):
Based on the Title and Summary, generate 5 LONG, descriptive Japanese lines (approx. 12-18 characters per line):
- LINE 1: Character/Setting (Introduction).
- LINE 2: The Hook/Conflict (Something unexpected).
- LINE 3: Dialogue 「 」 (Internal thought or direct quote).
- LINE 4: The Twist/Action (Reaction to the event).
- LINE 5: The Climax/Question (High-CTR cliffhanger). (Ensure Line 5 is a dramatic, high-stakes question).

*Example Lines (Workplace):*
- LINE 1: 社内不倫が上司にバレた
- LINE 2: 给湯室での密会を見られる
- LINE 3: 「二人の関係を話せ」と迫られ
- LINE 4: 彼との未来、失いたくない
- LINE 5: 会社を辞める？彼と別れる？ (largest, glowing)

--------------------------------------------------
VISUAL SYSTEM (COLOR PALETTE - NO ZABUTON):
Render 5 vertical stacks of text. CRITICAL: NO BACKGROUND BLOCKS. Use thick outlines + drop shadows for maximum readability.

- LINE 1: [Text: WHITE]. Thick BLACK Outline.
- LINE 2: [Text: BRIGHT RED]. Thick WHITE Outline.
- LINE 3: [Text: VIBRANT YELLOW]. Thick BLACK Outline.
- LINE 4: [Text: WHITE]. Thick RED Outline.
- LINE 5: [Text: BRIGHT MAGENTA / VIBRANT PINK]. Thick WHITE Outline + Dark Pink Outer Glow. (Must be the largest line).

--------------------------------------------------
TYPOGRAPHY & SIZE RULES:
- Use heavy, condensed Japanese Gothic fonts (e.g., "M+ 1c" or "Notosans JP Bold").
- DYNAMIC SIZE: Text must be MASSIVE and STRETCHED to cover the left 80% of the image. 
- SIZE CONSTRAINT: If any line is too long, reduce that specific line's font size slightly to ensure it fits the width perfectly without overlapping the woman.
- Minimize vertical space between lines to create a "Wall of Text" effect.

--------------------------------------------------
NEGATIVE CONSTRAINTS:
- NO background blocks (Zabutons) behind any text.
- NO dull or dark colors (No Grey, No Navy, No Dark Purple).
- NO anime, NO 3D models, NO same-face syndrome across generations.
- NO empty spaces on the left side.

--------------------------------------------------
OUTPUT:
A high-CTR Japanese dating thumbnail. A different, unique real woman, matching the story context, is on the far right. The left 80% is a dense wall of 5 narrative lines (as generated for the context: "社内不倫が上司にバレた", "给湯室での密会を見られる", etc.) using the [White - Red - Yellow - White - Pink] hierarchy on a linear pink background.
`;

export const promptToCreateThumbnailLove1 = (title, summary) => `
You are an expert Japanese YouTube visual editor specializing in "Information-Overload" thumbnails for the dating/romance niche. Your goal is to maximize CTR by using long, narrative text lines that cover nearly 80% of the image.

INPUT:
- Reference Image: (Attached)
- Title: ${title}
- Summary: ${summary}

--------------------------------------------------
CORE RULE (IDENTITY & STYLE):
1. THE PERSON: A young Japanese woman, early 20s, wearing casual everyday clothes (simple sweater, blouse, or cardigan).
   - Style: PHOTOREALISTIC / 8K DIGITAL PHOTOGRAPHY.
   - Placement: FAR RIGHT (occupying only 20% of the frame).
   - Reaction: Subtle emotional expression (knowing smile, shocked eyes, or blushing).
2. BACKGROUND (FIXED): [LINEAR GRADIENT BACKGROUND] featuring distinct diagonal transitions of light pink and soft rose tones.

--------------------------------------------------
AUTO-CONTENT GENERATION (LONG NARRATIVE LOGIC):
Based on the Title and Summary, generate 5 LONG, descriptive Japanese lines (approx. 12-18 characters per line):
- LINE 1: Character/Setting (Introduction).
- LINE 2: The Hook/Conflict (Something unexpected).
- LINE 3: Dialogue 「 」 (Internal thought or direct quote).
- LINE 4: The Twist/Action (Reaction to the event).
- LINE 5: The Climax/Question (High-CTR cliffhanger).

--------------------------------------------------
VISUAL SYSTEM (COLOR PALETTE - NO ZABUTON):
Render 5 vertical stacks of text. CRITICAL: NO BACKGROUND BLOCKS. Use thick outlines + drop shadows for maximum readability.

- LINE 1: [Text: WHITE]. Thick BLACK Outline.
- LINE 2: [Text: BRIGHT RED]. Thick WHITE Outline.
- LINE 3: [Text: VIBRANT YELLOW]. Thick BLACK Outline.
- LINE 4: [Text: WHITE]. Thick RED Outline.
- LINE 5: [Text: BRIGHT MAGENTA / VIBRANT PINK]. Thick WHITE Outline + Dark Pink Outer Glow. (Must be the largest line).

--------------------------------------------------
TYPOGRAPHY & SIZE RULES:
- Use heavy, condensed Japanese Gothic fonts.
- DYNAMIC SIZE: Text must be MASSIVE and STRETCHED. 
- SIZE CONSTRAINT: If any line is too long and risks covering the woman or going off-frame, automatically reduce that specific line's font size slightly to ensure it fits the 80% width perfectly.
- Minimize vertical space between lines to create a "Wall of Text" effect.

--------------------------------------------------
NEGATIVE CONSTRAINTS:
- NO background blocks (Zabutons) behind any text.
- NO dull or dark colors (No Grey, No Navy, No Dark Purple).
- NO anime, NO 3D models, NO identity change.
- NO empty spaces on the left side.

--------------------------------------------------
OUTPUT:
A high-CTR Japanese dating thumbnail. The real woman is on the far right. The left 80% is a dense wall of 5 narrative lines using the [White - Red - Yellow - White - Pink] hierarchy on a linear pink background.
`;

export const promptToCreateFulLText = (title, summary) => `
You are an elite YouTube thumbnail designer specializing in EXTREME HIGH-CTR "100% TEXT ONLY" thumbnails (NO PERSON, NO SUBJECT).

Your goal is to create a dense, aggressive "Wall of Text" thumbnail that dominates the entire frame (95–100% text coverage), optimized for maximum curiosity and clicks across ALL niches.

--------------------------------------------------
INPUT:
- Title: ${title}
- Summary: ${summary}

--------------------------------------------------
CORE STYLE:
- NO human subjects
- NO faces
- NO objects as main focus
- NO background text blocks (NO colored rectangles)
- ONLY TEXT layered directly on background

Background:
- Dark gradient (black → deep blue / dark grey)
- Strong vignette
- Subtle texture/noise for depth

--------------------------------------------------
AUTO TEXT GENERATION:
Generate 5 LONG Japanese lines (16–24 characters each).

Structure:
- LINE 1: Hook / shocking premise
- LINE 2: Conflict / problem
- LINE 3: Hidden truth / reveal
- LINE 4: Statement or quote 「」
- LINE 5: Final trigger / result / twist

Rules:
- Must feel like a continuous escalating story
- Each line must be long (no short phrases)
- Avoid generic wording
- Adapt tone to niche (drama, finance, tech, self-help, news)

--------------------------------------------------
DYNAMIC COLOR SYSTEM (MANDATORY):

The AI must automatically choose a color palette based on the content niche and emotional tone.

STRICT RULES:

1. CONTRAST FIRST:
   - Text must ALWAYS be readable on small screens
   - High contrast vs background is mandatory

2. LIMITED PALETTE:
   - Use ONLY 3–4 main colors
   - Avoid random or rainbow colors

3. VISUAL HIERARCHY:
   - LINE 5 = brightest, most dominant color
   - LINE 1–4 = supporting colors

4. STROKE & GLOW (REQUIRED):
   - All text must have thick stroke (black or dark)
   - Add outer glow or shadow for separation

--------------------------------------------------
COLOR MOOD GUIDELINE:

- Drama:
  Red / Yellow / Black / White

- Finance:
  Gold / Green / Black / White

- Tech / AI:
  Cyan / Blue / Purple / Black

- Self-help:
  Yellow / White / Orange / Blue

- News:
  Red / White / Black

(Colors are NOT fixed — must adapt intelligently)

--------------------------------------------------
TYPOGRAPHY:
- Ultra bold Japanese Gothic font (condensed)
- Extremely large text
- Tight spacing (almost touching)
- Slight variation in size/angle allowed

--------------------------------------------------
DEPTH & LAYERING:
- Slight overlap between lines
- Use glow + shadow to create depth
- LINE 5 must be the closest visual layer
- Other lines slightly less dominant

--------------------------------------------------
COMPOSITION:
- Text fills 95–100% of the frame
- NO empty space
- Dense, aggressive layout
- Slight controlled chaos is allowed
- LINE 5 can overlap other lines

--------------------------------------------------
VISUAL QUALITY:
- Ultra sharp (8K feel)
- High contrast
- Clean edges (no blur on text)
- Readable at very small size

--------------------------------------------------
OUTPUT:
A fully text-based, high-energy YouTube thumbnail with NO background blocks, using dynamic color selection, strong typography, and dense composition to maximize CTR across any niche.
`;
