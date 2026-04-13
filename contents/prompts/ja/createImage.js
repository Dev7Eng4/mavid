export const createPromptToCreateThumbnailFromImage = (title, summary) => `
Use the provided reference image strictly as the base image.

INPUT CONTENT:
Title: ${title}
Summary: ${summary}

GOAL:
Make minimal edits to the existing thumbnail to better match the story.

CRITICAL PRESERVATION (HIGHEST PRIORITY):
- Keep ALL characters exactly as they are.
- DO NOT remove any character.
- DO NOT add new characters.
- DO NOT change the number of people.
- Keep original positions of all characters.
- Keep the original composition and layout unchanged.

IDENTITY LOCK:
- Each character must remain exactly the same person.
- Do NOT change face shape, hairstyle, or identity.
- Do NOT redraw or replace any character.

ALLOWED EDITS (ONLY SMALL ADJUSTMENTS):
- Slightly adjust facial expressions (eyes, eyebrows, mouth)
- Add minor emotional effects (tears, sweat, anger marks)
- Slight color adjustments (lighting, contrast, tint)
- Enhance mood using overlays (red tone, dark shadows, glow)
- Slight emphasis (zoom-in feeling, but do not crop out characters)

STRICTLY FORBIDDEN:
- Removing or replacing characters
- Changing composition or layout
- Changing camera angle
- Redrawing the entire image
- Creating a new scene

TEXT:
- Add or update short Japanese 2ch-style text based on title and summary
- Keep it short (1–2 lines), dramatic and emotional
- Place text without covering important character faces

STYLE:
- Preserve original art style exactly
- Only enhance contrast and emotional impact

SAFETY:
- No real people
- No copyrighted characters
- No explicit or violent content

IMPORTANT:
This is a MINOR EDIT task, not a full redesign.
Preserve 90–95% of the original image.

OUTPUT:
- Same thumbnail with subtle emotional enhancements
- All characters intact
- Stronger emotional clarity
`;

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
