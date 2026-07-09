export const prompt = () => `
Edit the provided old YouTube thumbnail.

Goal:
Create a new high-CTR Japanese YouTube thumbnail based on the old thumbnail.

You must preserve two things:

1. The text layer.
2. The core visual hook, emotional expression, and story tension from the old thumbnail.

Do not only create a beautiful new background. The new image must keep the same emotional impact and clickbait meaning as the old thumbnail.

Text preservation rules:

* Keep all visible text exactly unchanged.
* Keep the same Japanese characters, wording, punctuation, symbols, and line breaks.
* Keep the exact text position.
* Keep the exact text size.
* Keep the exact text color.
* Keep the exact font style as closely as possible.
* Keep the exact outline, stroke, shadow, glow, gradient, bevel, texture, and 3D effects as closely as possible.
* Do not add, remove, rewrite, translate, or correct any text.
* Treat the text layer as locked and immutable.

Core visual preservation rules:

* Identify the main emotional hook of the old thumbnail.
* Preserve the same character role, emotion, facial expression, body language, and story meaning.
* If a character looks evil, smug, shocked, crying, angry, scared, betrayed, or desperate in the old thumbnail, the new thumbnail must keep that same emotional intensity.
* If the old thumbnail shows a villain character laughing, smirking, mocking, or looking arrogant, the new thumbnail must keep that villainous expression clearly.
* If the old thumbnail shows a victim character shocked, crying, devastated, or betrayed, the new thumbnail must keep that emotional contrast clearly.
* Preserve the same power dynamic between characters.
* Preserve the same narrative tension and visual implication.
* Do not make dramatic characters look neutral, calm, friendly, normal, or emotionless.
* Do not reduce the intensity of the facial expressions.
* Do not change the story meaning of the thumbnail.

Background and scene redesign rules:

* Replace or redesign the background and non-essential visual elements.
* The new background must support the same story and emotion as the old thumbnail.
* Make the new background fresher, clearer, more dramatic, and more clickable.
* Use stronger lighting, contrast, depth, facial expression, and symbolic details.
* Keep the new scene relevant to the same niche and topic.
* Build the new background around the locked text layout.
* Do not disturb the text placement or readability.

Style preservation rules:

* Keep the same overall style category as the original thumbnail.
* If the original is anime style, keep anime style.
* If the original is cinematic/realistic, keep cinematic/realistic style.
* If the original is Japanese drama thumbnail style, keep Japanese drama thumbnail style.
* If the original is infographic/news style, keep infographic/news style.

For Japanese drama / cheating / revenge thumbnails:

* If the old thumbnail shows an unfaithful wife or villain woman smiling smugly, laughing arrogantly, or looking pleased after betrayal, the new thumbnail must show the same type of woman with a clearly smug, cruel, triumphant expression.
* Make her expression visually obvious: raised eyebrows, sharp smile, mocking eyes, confident posture, arrogant body language.
* Add supporting story cues only if they match the original: secret lover, smartphone message, luxury room, hotel-like background, divorce papers, shocked husband, betrayal atmosphere, dramatic lighting.
* Do not make her look kind, innocent, sad, neutral, or ordinary.

Output requirements:

* 16:9 aspect ratio.
* High-CTR Japanese YouTube thumbnail style.
* Large mobile-readable text.
* Strong emotional contrast.
* Clear story at a glance.
* No extra text.
* No missing text.
* No changed text.
* No repositioned text.
* No resized text.
* No recolored text.
* No distorted Japanese characters.
* No watermark.
* No logo.

Priority order:

1. Preserve the text exactly.
2. Preserve the core emotional hook and story meaning.
3. Improve the background and visual impact.
4. Increase CTR.

If there is any conflict, never sacrifice the text or the emotional hook.
`;
