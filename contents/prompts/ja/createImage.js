// import { THUMBNAIL_STYLE } from '../../constants/index.js';

// const prompt2chPeopleStyle = `
// Create a highly clickable Japanese 2ch-style YouTube thumbnail with a STRICT and CONSISTENT layout.

// === STYLE ===
// - Japanese 2ch / 5ch summary video style
// - Flat cartoon illustration (irasutoya-like)
// - Clean vector look, no detailed shading
// - Bold, simple, instantly readable at small size

// === CANVAS ===
// - Aspect ratio: 16:9
// - Resolution: 1280x720
// - Composition ratio:
//   - Text area: 65–70% (left and center)
//   - Character: 30–35% (right side only)

// === CHARACTER (MANDATORY EXAGGERATION) ===
// - One Japanese male character
// - Strong exaggerated facial expression (shock, anger, or excitement)
// - Wide open mouth, big eyes, expressive pose
// - Simple cartoon style (irasutoya-like)
// - Clear action pose (e.g., pointing, reacting, holding object)
// - Character MUST face toward the text

// === BACKGROUND ===
// - Bright outdoor or simple gradient background
// - Use blue sky or light color base
// - Add strong radial speed lines (white or light color) from center
// - No blur, no complex details

// === TEXT STRUCTURE (STRICT HIERARCHY) ===
// Divide text into EXACTLY 3 layers:

// 1) Top line (hook)
// - Medium size
// - Color: Yellow
// - Short phrase

// 2) Middle line (context)
// - Large size
// - Color: White
// - Slightly longer phrase

// 3) Bottom line (MAIN IMPACT)
// - Largest size
// - Color: Red
// - Most shocking / emotional phrase

// === TEXT STYLE ===
// - Heavy bold Japanese gothic font
// - Extremely thick black outline (mandatory)
// - Add white stroke outside black outline (double outline)
// - Tight letter spacing
// - Slight tilt or dynamic arrangement allowed
// - Ensure readability at very small size

// === EXTRA ELEMENTS (2ch AUTHENTICITY) ===
// - Add small forum-style text snippets:
//   - ID numbers
//   - timestamps
// - Place near text blocks as secondary detail

// === COLOR RULES (STRICT) ===
// - Main colors ONLY:
//   - Yellow (#FFD700)
//   - Red (#FF0000)
//   - White (#FFFFFF)
//   - Black outline
// - Background: blue or light tone
// - VERY HIGH CONTRAST required

// === MOOD & CTR OPTIMIZATION ===
// - Clickbait, dramatic, emotional
// - Emphasize curiosity, conflict, or surprise
// - Use visual tension between text and character
// - Avoid subtlety — everything must be bold and obvious

// === NEGATIVE RULES ===
// - No realistic faces
// - No soft colors or pastel tones
// - No thin fonts
// - No complex backgrounds
// - No multiple characters
// - No low contrast

// === OUTPUT GOAL ===
// A visually aggressive, highly readable, high-CTR Japanese 2ch-style thumbnail that looks consistent every time and stands out even at very small sizes.
// `;

// const styles = {
//   [THUMBNAIL_STYLE['2CH_PEOPLE_STYLE']]: prompt2chPeopleStyle,
// };

// export const createPromptToCreateThumbnail = (title, summary, style = THUMBNAIL_STYLE['2CH_PEOPLE_STYLE']) => `
// You are a professional YouTube thumbnail designer specialized in high CTR Japanese 2ch drama content.

// Your task is to automatically create a highly clickable thumbnail prompt.

// [STYLE]
// ${styles[style]}

// [INPUT]
// Title: ${title}
// Summary: ${summary}

// [TASK]
// - Analyze the story and identify the most dramatic moment
// - Identify the key conflict (who is right vs wrong)
// - Choose 1–2 main characters only
// - Decide their emotions (shock, anger, crying, smug, etc.)
// - Create a short Japanese text (3–6 characters) that maximizes curiosity and emotional impact

// [TEXT RULES]
// - Use very short Japanese phrases (3–6 characters)
// - Must trigger curiosity, anger, or shock
// - Examples tone: 「は？」「最低」「ざまぁ」「何それ」「嘘だろ」

// [VISUAL RULES]
// - Anime-style characters with exaggerated facial expressions
// - Strong contrast colors (red, yellow, black, white)
// - Clean composition (left vs right conflict or center focus)
// - Background should be simple and dramatic (gradient, blur, or abstract)
// - Add bold Japanese text with thick outline
// - Focus on emotional storytelling, instantly understandable

// [OUTPUT]
// Return ONLY a detailed image generation prompt in English.
// Include the Japanese text naturally inside the prompt (e.g., "with bold Japanese text saying 'ざまぁ'").
// Do NOT explain anything.
// `;

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
