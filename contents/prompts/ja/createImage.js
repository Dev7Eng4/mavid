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
