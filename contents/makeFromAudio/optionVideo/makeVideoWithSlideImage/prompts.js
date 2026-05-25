export const promptSegmentTranscriptToVisualBeats = ({ previousNumberedTranscript = '', numberedTranscript }) => `
You are a Japanese senior finance video structure analyst.

Your task is to segment the CURRENT TRANSCRIPT into VISUAL BEATS for an educational YouTube video about elderly finance, pensions, retirement money, social security, savings, and senior life planning.

━━━━━━━━━━━━━━━━━━
INPUTS
━━━━━━━━━━━━━━━━━━

1. previousNumberedTranscript:
This is context from the previous transcript segment.
It is provided only so you can understand the flow, topic transition, and continuity.

2. numberedTranscript:
This is the current transcript segment you must process.
You must create visual beats only from this current segment.

━━━━━━━━━━━━━━━━━━
CRITICAL CONTEXT RULE
━━━━━━━━━━━━━━━━━━
previousNumberedTranscript is CONTEXT ONLY.

You may use previousNumberedTranscript to understand:
- what topic was being discussed before
- whether the current segment continues an earlier explanation
- whether the current segment starts a new topic
- whether a pronoun or phrase refers to something mentioned earlier

However:
- Do NOT create visual beats from previousNumberedTranscript.
- Do NOT include line IDs from previousNumberedTranscript in source_line_ids.
- source_line_ids must contain ONLY line IDs that appear in numberedTranscript.
- If the current segment continues an idea from the previous context, summarize the beat based on the current lines only, while using the previous context for interpretation.

━━━━━━━━━━━━━━━━━━
TASK
━━━━━━━━━━━━━━━━━━
Group numberedTranscript into visual beats.

A visual beat is a small content unit that can become one image scene.

For Japanese senior finance educational videos, create beats based on:
- hook / question
- problem explanation
- pension concept explanation
- early pension claiming explanation
- merit / demerit comparison
- age comparison
- money amount / pension amount explanation
- household budget explanation
- calendar / timing explanation
- tax / insurance / social security caution
- warning / risk
- practical advice
- conclusion / recap
- transition to next point

━━━━━━━━━━━━━━━━━━
SCENE DENSITY RULE
━━━━━━━━━━━━━━━━━━
Do NOT create too few beats.

Target:
- 1 visual beat should usually represent one clear visual idea.
- For dense financial explanation, split more frequently.
- Do not merge hook, concept, example, warning, and advice into one beat.
- A beat should usually contain 3–10 transcript lines.
- If the topic changes, start a new beat.
- If the speaker moves from problem → explanation → example → warning, split them into separate beats.
- If the current segment is short, still create at least one beat if there is meaningful content.

━━━━━━━━━━━━━━━━━━
BEAT TYPE OPTIONS
━━━━━━━━━━━━━━━━━━
Use one of these beat_type values:

- hook_problem
- concept_explanation
- pension_rule_explanation
- benefit_explanation
- demerit_explanation
- comparison
- example_case
- money_explanation
- age_timing_explanation
- household_budget
- warning
- practical_advice
- recap
- transition

━━━━━━━━━━━━━━━━━━
OUTPUT JSON ONLY
━━━━━━━━━━━━━━━━━━
Return valid JSON only.
Do not wrap in markdown code block.
Do not add explanation.
Do not add comments.

Schema:

{
  "beats": [
    {
      "beat_id": "B001",
      "source_line_ids": [1, 2, 3],
      "beat_type": "hook_problem | concept_explanation | pension_rule_explanation | benefit_explanation | demerit_explanation | comparison | example_case | money_explanation | age_timing_explanation | household_budget | warning | practical_advice | recap | transition",
      "core_message": "Japanese factual summary of this beat",
      "visual_direction": "English visual idea for image generation",
      "importance": "high | medium | low"
    }
  ]
}

━━━━━━━━━━━━━━━━━━
OUTPUT RULES
━━━━━━━━━━━━━━━━━━
- Output JSON only.
- Preserve source_line_ids exactly.
- source_line_ids must only use IDs from numberedTranscript.
- Do not use IDs from previousNumberedTranscript.
- Do not invent facts, numbers, laws, ages, pension amounts, or conclusions not present in the current transcript.
- core_message must be in Japanese.
- visual_direction must be in English.
- visual_direction must be imageable.
- Avoid vague visual directions such as "explain the concept".
- Prefer concrete visuals such as elderly Japanese couple, pension documents, calendar, yen symbols, balance scale, checklist, simple chart, public office consultation desk, bankbook, calculator.

━━━━━━━━━━━━━━━━━━
previousNumberedTranscript CONTEXT ONLY
━━━━━━━━━━━━━━━━━━
${previousNumberedTranscript || '(empty - this is the first segment)'}

━━━━━━━━━━━━━━━━━━
numberedTranscript TO PROCESS
━━━━━━━━━━━━━━━━━━
${numberedTranscript}
`;

export const promptCreateSceneSpecsFromBeatsOld = beatsJson => `
You are a Japanese senior finance educational video scene designer.

Your task is to convert visual beats into image scene specifications.

━━━━━━━━━━━━━━━━━━
VISUAL STYLE BASE
━━━━━━━━━━━━━━━━━━
Japanese senior finance educational video, clean illustrated infographic style, soft anime-realistic, warm but serious, easy-to-understand pension explanation, 16:9 YouTube frame, large readable Japanese text, simple charts, elderly Japanese couple, financial documents, calendar, yen symbols, clean layout, professional TV program style, no clutter.

Negative:
no English text, no Chinese text, no Korean text, no watermark, no logo, no messy small text, no distorted hands, no horror, no photorealistic wrinkles exaggeration, no crowded background.

━━━━━━━━━━━━━━━━━━
TASK
━━━━━━━━━━━━━━━━━━
For each beat, create one image scene specification.

Each scene must:
- explain the beat visually
- use simple senior-friendly finance imagery
- include large readable Japanese text
- avoid clutter
- avoid too many labels
- avoid complex charts
- be suitable for 16:9 YouTube educational video

━━━━━━━━━━━━━━━━━━
ON-SCREEN TEXT RULES
━━━━━━━━━━━━━━━━━━
- Use Japanese only.
- Use 1 or 2 lines only.
- Each line should be short and readable.
- Preferred length: 6–14 Japanese characters per line.
- Maximum length: 18 Japanese characters per line.
- Do not use English.
- Do not use Chinese.
- Do not use Korean.
- Do not use tiny footnotes.
- Do not create complex paragraphs.
- Text should summarize the key idea of the scene.
- Text should be accurate to the source beat.
- Do not invent pension numbers, ages, laws, or outcomes unless they appear in the transcript.

Good examples:
["年金を60歳から", "受け取ると損？"]
["メリットも", "デメリットもある"]
["65歳まで待つ？", "60歳から受け取る？"]

Bad examples:
["繰上げ受給をすると毎月の年金額が減額される可能性があります"]
["Pension from 60?"]
["养老金说明"]

━━━━━━━━━━━━━━━━━━
SCENE DESIGN RULES
━━━━━━━━━━━━━━━━━━
Use common visual motifs:
- elderly Japanese couple
- pension documents
- calendar with age number
- yen symbols
- bankbook
- calculator
- simple bar chart
- simple line chart
- balance scale
- forked road
- checklist
- warning sign
- envelope
- public office consultation desk
- kitchen table
- TV-program style infographic panel

Avoid:
- too many people
- realistic dark drama
- horror mood
- tiny unreadable UI
- dense spreadsheets
- exaggerated wrinkles
- messy room
- complicated legal documents

━━━━━━━━━━━━━━━━━━
OUTPUT JSON ONLY
━━━━━━━━━━━━━━━━━━
Return valid JSON only.
Do not wrap in markdown code block.
Do not add explanation.
Do not add comments.

Schema:

{
  "scenes": [
    {
      "scene_id": "S001",
      "beat_id": "B001",
      "source_line_ids": [1, 2, 3],
      "scene_type": "hook_problem | concept_explanation | comparison | example_case | warning | practical_advice | recap | transition",
      "narrative_purpose": "English explanation of what this scene must communicate",
      "on_screen_text": [
        "Japanese line 1",
        "Japanese line 2"
      ],
      "main_visual": "English description of the main image",
      "supporting_elements": [
        "element 1",
        "element 2"
      ],
      "layout": "English layout instruction",
      "mood": "English mood instruction",
      "text_priority": "high | medium"
    }
  ]
}

Input beats JSON:
${beatsJson}
`;

export const promptCreateSceneSpecsFromBeats = beatsJson => `
You are NOT an image generator.
You must NOT create, render, draw, search, or fetch any image.

You are a JSON scene-spec compiler for a video automation pipeline.

Your only task is to convert each input visual beat into a structured JSON scene specification.
The output will later be used by another step to write image-generation prompts.
You are not responsible for generating images.

━━━━━━━━━━━━━━━━━━
TASK DEFINITION
━━━━━━━━━━━━━━━━━━
Input:
- A JSON object containing visual beats.
- Each beat may include beat_id, source_line_ids, summary, key idea, or visual direction.

Output:
- A JSON object containing scene specifications.
- Each scene specification is metadata only.
- Each scene must describe what a future image should show.
- Do not create the image.
- Do not say that you cannot create images.
- Do not mention image creation availability, sign-in status, location, tools, or permissions.

For each beat, produce exactly one scene specification.

━━━━━━━━━━━━━━━━━━
VISUAL STYLE REFERENCE
━━━━━━━━━━━━━━━━━━
Use this style only as descriptive metadata inside scene fields:

Japanese senior finance educational video, clean illustrated infographic style, soft anime-realistic, warm but serious, easy-to-understand pension explanation, 16:9 YouTube frame, large readable Japanese text, simple charts, elderly Japanese couple, financial documents, calendar, yen symbols, clean layout, professional TV program style, no clutter.

Negative style constraints:
no English text, no Chinese text, no Korean text, no watermark, no logo, no messy small text, no distorted hands, no horror, no photorealistic wrinkles exaggeration, no crowded background.

━━━━━━━━━━━━━━━━━━
SCENE SPEC REQUIREMENTS
━━━━━━━━━━━━━━━━━━
Each scene specification must:
- communicate the source beat visually
- use simple senior-friendly finance imagery
- include only simple on-screen Japanese text
- avoid clutter
- avoid too many labels
- avoid complex charts
- be suitable for a 16:9 Japanese senior finance educational YouTube video
- stay accurate to the source beat
- avoid invented pension numbers, ages, laws, or outcomes unless they appear in the input beat

━━━━━━━━━━━━━━━━━━
ON-SCREEN TEXT RULES
━━━━━━━━━━━━━━━━━━
The on_screen_text field must follow these rules:

- Japanese only.
- 1 or 2 lines only.
- Each line should be short and readable.
- Preferred length: 6–14 Japanese characters per line.
- Maximum length: 18 Japanese characters per line.
- Do not use English.
- Do not use Chinese.
- Do not use Korean.
- Do not use tiny footnotes.
- Do not create complex paragraphs.
- Text should summarize the key idea of the scene.
- Text must be accurate to the source beat.
- Do not invent pension numbers, ages, laws, or outcomes unless they appear in the input beat.

Good examples:
["年金を60歳から", "受け取ると損？"]
["メリットも", "デメリットもある"]
["65歳まで待つ？", "60歳から受け取る？"]

Bad examples:
["繰上げ受給をすると毎月の年金額が減額される可能性があります"]
["Pension from 60?"]
["养老金说明"]

━━━━━━━━━━━━━━━━━━
VISUAL MOTIF RULES
━━━━━━━━━━━━━━━━━━
You may use common descriptive motifs such as:
- elderly Japanese couple
- pension documents
- calendar with age number
- yen symbols
- bankbook
- calculator
- simple bar chart
- simple line chart
- balance scale
- forked road
- checklist
- warning sign
- envelope
- public office consultation desk
- kitchen table
- TV-program style infographic panel

Avoid describing:
- too many people
- realistic dark drama
- horror mood
- tiny unreadable UI
- dense spreadsheets
- exaggerated wrinkles
- messy room
- complicated legal documents

━━━━━━━━━━━━━━━━━━
IMPORTANT ROUTING RULES
━━━━━━━━━━━━━━━━━━
This is a text-to-JSON transformation task.

Do not perform image generation.
Do not search for images.
Do not ask whether image generation is available.
Do not mention sign-in status.
Do not mention account, region, location, or tool limitations.
Do not apologize for being unable to create images.
Do not return conversational text.
Return only the requested JSON.

━━━━━━━━━━━━━━━━━━
OUTPUT JSON ONLY
━━━━━━━━━━━━━━━━━━
Return valid JSON only.
Do not wrap in markdown code block.
Do not add explanation.
Do not add comments.
Do not add text before or after the JSON.

Schema:

{
  "scenes": [
    {
      "scene_id": "S001",
      "beat_id": "B001",
      "source_line_ids": [1, 2, 3],
      "scene_type": "hook_problem | concept_explanation | comparison | example_case | warning | practical_advice | recap | transition",
      "narrative_purpose": "English explanation of what this scene specification must communicate",
      "on_screen_text": [
        "Japanese line 1",
        "Japanese line 2"
      ],
      "main_visual": "English metadata describing the main visual for a future image",
      "supporting_elements": [
        "English metadata element 1",
        "English metadata element 2"
      ],
      "layout": "English metadata describing the layout for a future 16:9 frame",
      "mood": "English metadata describing the mood",
      "text_priority": "high | medium"
    }
  ]
}

Input beats JSON:
${beatsJson}
`;

export const promptCreateImagePromptsFromSceneSpecs1 = sceneSpecsJson => `
You are a professional prompt writer for Japanese senior finance educational YouTube images.

Your task is to convert each scene specification into a final image generation prompt.

━━━━━━━━━━━━━━━━━━
GLOBAL VISUAL STYLE
━━━━━━━━━━━━━━━━━━
Japanese senior finance educational video, clean illustrated infographic style, soft anime-realistic, warm but serious, easy-to-understand pension explanation, 16:9 YouTube frame, large readable Japanese text, simple charts, elderly Japanese couple, financial documents, calendar, yen symbols, clean layout, professional TV program style, no clutter.

━━━━━━━━━━━━━━━━━━
GLOBAL NEGATIVE
━━━━━━━━━━━━━━━━━━
no English text, no Chinese text, no Korean text, no watermark, no logo, no messy small text, no distorted hands, no horror, no photorealistic wrinkles exaggeration, no crowded background.

━━━━━━━━━━━━━━━━━━
PROMPT STRUCTURE
━━━━━━━━━━━━━━━━━━
Each prompt must follow this structure:

Create a 16:9 Japanese senior finance educational illustration.

Scene: ...

On-screen Japanese text, large and readable:
「...」
「...」

Visual style: ...

Layout: ...

Avoid: ...

━━━━━━━━━━━━━━━━━━
IMPORTANT TEXT RULES
━━━━━━━━━━━━━━━━━━
- The prompt must explicitly say: "On-screen Japanese text, large and readable".
- Include only the exact Japanese text from scene_specs.
- Do not add extra Japanese text.
- Do not add English labels inside the image.
- Do not add tiny explanatory captions.
- Avoid any small text in documents or charts.
- If documents appear, describe them as generic pension documents with no tiny readable text.

━━━━━━━━━━━━━━━━━━
IMAGE RULES
━━━━━━━━━━━━━━━━━━
- Make the image easy to understand in 1 second.
- Prefer 1 main idea per scene.
- Use large symbols: yen mark, calendar, pension envelope, balance scale, checklist, arrows.
- Use clean TV-program style composition.
- Keep background simple.
- Keep character count low: usually 1 elderly person or 1 elderly couple.
- Use warm but serious atmosphere.
- Do not make the characters look frightened, sick, or miserable.
- Avoid dramatic horror lighting.

━━━━━━━━━━━━━━━━━━
OUTPUT JSON ONLY
━━━━━━━━━━━━━━━━━━
Return valid JSON only.
Do not wrap in markdown code block.
Do not add explanation.
Do not add comments.

OUTPUT SCHEMA:
{
  "image_prompts": [
    {
      "scene_id": "S001",
      "source_line_ids": [1, 2, 3],
      "on_screen_text": [
        "Japanese line 1",
        "Japanese line 2"
      ],
      "image_prompt": "Final full prompt here"
    }
  ]
}

Scene specs JSON:
${sceneSpecsJson}
`;

export const promptCreateImagePromptsFromSceneSpecsOld = sceneSpecsJson => `
You are NOT an image generator.
You must NOT create, render, draw, or describe that you are creating an image.

You are a professional IMAGE PROMPT WRITER.
Your only task is to convert each scene specification into a final text prompt that will later be sent to a separate image generation model.

You must output JSON only.

━━━━━━━━━━━━━━━━━━
TASK DEFINITION
━━━━━━━━━━━━━━━━━━
Input:
- A list of scene specifications.
- Each scene contains scene_id, source_line_ids, visual idea, and on-screen Japanese text.

Your task:
- For each scene, write ONE final image generation prompt as plain text.
- The prompt must instruct a future image generation model what image to create.
- Do not create the image yourself.
- Do not say "I created".
- Do not add any explanation outside JSON.

━━━━━━━━━━━━━━━━━━
GLOBAL VISUAL STYLE TO USE INSIDE EACH GENERATED PROMPT
━━━━━━━━━━━━━━━━━━
Japanese senior finance educational video, clean illustrated infographic style, soft anime-realistic, warm but serious, easy-to-understand pension explanation, 16:9 YouTube frame, large readable Japanese text, simple charts, elderly Japanese couple, financial documents, calendar, yen symbols, clean layout, professional TV program style, no clutter.

━━━━━━━━━━━━━━━━━━
GLOBAL NEGATIVE TO USE INSIDE EACH GENERATED PROMPT
━━━━━━━━━━━━━━━━━━
no English text, no Chinese text, no Korean text, no watermark, no logo, no messy small text, no distorted hands, no horror, no photorealistic wrinkles exaggeration, no crowded background.

━━━━━━━━━━━━━━━━━━
GENERATED IMAGE PROMPT FORMAT
━━━━━━━━━━━━━━━━━━
Each image_prompt value must be a single complete prompt string.

Each generated prompt must follow this exact internal structure:

Create a 16:9 Japanese senior finance educational illustration.

Scene: [describe the scene based only on the scene spec]

On-screen Japanese text, large and readable:
「[exact Japanese text line 1 from scene spec]」
「[exact Japanese text line 2 from scene spec if available]」

Visual style: [use the global visual style]

Layout: [clear layout instruction for this scene]

Avoid: [use the global negative rules]

━━━━━━━━━━━━━━━━━━
CRITICAL DISTINCTION
━━━━━━━━━━━━━━━━━━
You are only writing the text inside image_prompt.
You are not generating an image.
You are not calling an image model.
You are not producing visual output.
You are producing JSON data for a later image-generation step.

━━━━━━━━━━━━━━━━━━
IMPORTANT TEXT RULES
━━━━━━━━━━━━━━━━━━
- Each generated prompt must explicitly include this phrase:
  "On-screen Japanese text, large and readable"
- Include only the exact Japanese text from scene_specs.
- Do not invent additional Japanese text.
- Do not add English labels inside the image.
- Do not add tiny explanatory captions.
- Avoid any small text in documents or charts.
- If documents appear, describe them as generic pension documents with no tiny readable text.
- Preserve Japanese text exactly as provided.
- Do not translate Japanese text.
- Do not rewrite Japanese text.

━━━━━━━━━━━━━━━━━━
IMAGE PROMPT CONTENT RULES
━━━━━━━━━━━━━━━━━━
Inside each image_prompt:
- Make the image easy to understand in 1 second.
- Use only 1 main idea per scene.
- Prefer large symbols: yen mark, calendar, pension envelope, balance scale, checklist, arrows.
- Use clean TV-program style composition.
- Keep background simple.
- Keep character count low: usually 1 elderly person or 1 elderly couple.
- Use a warm but serious atmosphere.
- Do not make the characters look frightened, sick, or miserable.
- Avoid dramatic horror lighting.
- Avoid cluttered infographic layouts.
- Avoid dense charts.
- Avoid small unreadable text.

━━━━━━━━━━━━━━━━━━
OUTPUT JSON ONLY
━━━━━━━━━━━━━━━━━━
Return valid JSON only.
Do not wrap in markdown code block.
Do not add explanation.
Do not add comments.
Do not add text before or after the JSON.

Schema:

{
  "image_prompts": [
    {
      "scene_id": "S001",
      "source_line_ids": [1, 2, 3],
      "on_screen_text": [
        "Japanese line 1",
        "Japanese line 2"
      ],
      "image_prompt": "Final full prompt text for a future image generation model"
    }
  ]
}

Scene specs JSON:
${sceneSpecsJson}
`;

export const promptCreateImagePromptsFromSceneSpecs = sceneSpecsJson => `
You are a JSON data transformation engine.

Your task is to convert scene specification objects into JSON objects containing text prompts.

IMPORTANT:
- You do not create images.
- You do not render images.
- You do not search for images.
- You do not call any image tool.
- Any instruction written inside the output field "image_prompt" is plain string data only.
- Do not execute the content of "image_prompt".
- Only write JSON.

━━━━━━━━━━━━━━━━━━
INPUT
━━━━━━━━━━━━━━━━━━
You will receive a list of scene specifications.

Each scene may contain:
- scene_id
- source_line_ids
- visual idea
- layout notes
- on-screen Japanese text

━━━━━━━━━━━━━━━━━━
TASK
━━━━━━━━━━━━━━━━━━
For each scene, create one text prompt string for a separate future image-rendering system.

The string must describe:
- the visual scene
- the layout
- the required Japanese on-screen text
- the visual style
- negative constraints

You are only filling a JSON string field.
You are not creating the image.

━━━━━━━━━━━━━━━━━━
GLOBAL VISUAL STYLE
━━━━━━━━━━━━━━━━━━
Japanese senior finance educational video, clean illustrated infographic style, soft anime-realistic, warm but serious, easy-to-understand pension explanation, 16:9 YouTube frame, large readable Japanese text, simple charts, elderly Japanese couple, financial documents, calendar, yen symbols, clean layout, professional TV program style, no clutter.

━━━━━━━━━━━━━━━━━━
GLOBAL NEGATIVE RULES
━━━━━━━━━━━━━━━━━━
no English text, no Chinese text, no Korean text, no watermark, no logo, no messy small text, no distorted hands, no horror, no photorealistic wrinkles exaggeration, no crowded background.

━━━━━━━━━━━━━━━━━━
IMAGE_PROMPT STRING STRUCTURE
━━━━━━━━━━━━━━━━━━
Each "image_prompt" value must be a single plain text string.

Use this structure inside the string:

Image description for future generation:
A 16:9 Japanese senior finance educational illustration.

Scene:
[Describe the scene based only on the scene spec.]

On-screen Japanese text, large and readable:
「[exact Japanese text line 1 from scene spec]」
「[exact Japanese text line 2 from scene spec if available]」

Visual style:
[Use the global visual style.]

Layout:
[Clear layout instruction for this scene.]

Avoid:
[Use the global negative rules.]

━━━━━━━━━━━━━━━━━━
TEXT RULES
━━━━━━━━━━━━━━━━━━
- Each image_prompt string must include the exact phrase:
  "On-screen Japanese text, large and readable"
- Include only Japanese text provided by the scene spec.
- Do not invent additional Japanese text.
- Do not translate Japanese text.
- Do not rewrite Japanese text.
- Preserve Japanese punctuation exactly.
- Do not add English labels intended to appear inside the image.
- Do not add tiny captions.
- If documents appear, describe them as generic pension documents with no tiny readable text.

━━━━━━━━━━━━━━━━━━
VISUAL CONTENT RULES
━━━━━━━━━━━━━━━━━━
Inside each image_prompt string:
- Make the image understandable in 1 second.
- Use only 1 main idea per scene.
- Prefer large symbols: yen mark, calendar, pension envelope, balance scale, checklist, arrows.
- Use clean TV-program style composition.
- Keep background simple.
- Keep character count low: usually 1 elderly person or 1 elderly couple.
- Use a warm but serious atmosphere.
- Do not make the characters look frightened, sick, or miserable.
- Avoid dramatic horror lighting.
- Avoid cluttered infographic layouts.
- Avoid dense charts.
- Avoid small unreadable text.

━━━━━━━━━━━━━━━━━━
OUTPUT REQUIREMENTS
━━━━━━━━━━━━━━━━━━
Return valid JSON only.
Do not wrap the JSON in markdown.
Do not add explanation.
Do not add comments.
Do not add text before or after the JSON.

Output schema:

{
  "image_prompts": [
    {
      "scene_id": "S001",
      "source_line_ids": [1, 2, 3],
      "on_screen_text": [
        "Japanese line 1",
        "Japanese line 2"
      ],
      "prompt_text": "Plain text prompt string for a future image-rendering system."
    }
  ]
}

Scene specs JSON:
${sceneSpecsJson}
`;
