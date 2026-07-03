/**
 * granite.js — IBM watsonx.ai Granite API wrapper
 *
 * Uses the REST API directly via axios so there is no additional SDK
 * dependency. All prompts are kept deterministic with low temperature
 * so the model returns consistent, structured output.
 *
 * Environment variables required:
 *   WATSONX_API_KEY   — IBM Cloud IAM API key
 *   WATSONX_PROJECT_ID — watsonx.ai project ID
 *   WATSONX_URL       — regional endpoint, e.g. https://us-south.ml.cloud.ibm.com
 */

const axios = require('axios');

const WATSONX_URL = process.env.WATSONX_URL || 'https://us-south.ml.cloud.ibm.com';
const PROJECT_ID = process.env.WATSONX_PROJECT_ID;
const API_KEY = process.env.WATSONX_API_KEY;

// Model to use — granite-13b-instruct-v2 is the flagship instruction-tuned model
const MODEL_ID = 'ibm/granite-13b-instruct-v2';

// IBM Cloud IAM token cache
let iamToken = null;
let iamTokenExpiry = 0;

/**
 * Fetches (and caches) an IBM Cloud IAM bearer token.
 * Tokens are valid for 1 hour; we refresh 5 minutes early.
 */
async function getIAMToken() {
  const now = Date.now();
  if (iamToken && now < iamTokenExpiry) return iamToken;

  const response = await axios.post(
    'https://iam.cloud.ibm.com/identity/token',
    new URLSearchParams({
      grant_type: 'urn:ibm:params:oauth:grant-type:apikey',
      apikey: API_KEY,
    }),
    { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
  );

  iamToken = response.data.access_token;
  // expires_in is in seconds; refresh 5 min early
  iamTokenExpiry = now + (response.data.expires_in - 300) * 1000;
  return iamToken;
}

/**
 * Core generation call to the watsonx.ai text generation endpoint.
 *
 * @param {string} prompt     - Full prompt string
 * @param {object} params     - Optional override generation parameters
 * @returns {string}          - Generated text (trimmed)
 */
async function generate(prompt, params = {}) {
  if (!API_KEY || !PROJECT_ID) {
    throw new Error('WATSONX_API_KEY and WATSONX_PROJECT_ID must be set in environment variables');
  }

  const token = await getIAMToken();

  const body = {
    model_id: MODEL_ID,
    input: prompt,
    project_id: PROJECT_ID,
    parameters: {
      decoding_method: 'greedy',
      max_new_tokens: params.max_new_tokens || 2048,
      min_new_tokens: 1,
      temperature: params.temperature || 0.3,
      repetition_penalty: 1.1,
      stop_sequences: params.stop_sequences || [],
    },
  };

  const response = await axios.post(
    `${WATSONX_URL}/ml/v1/text/generation?version=2023-05-29`,
    body,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    }
  );

  const result = response.data?.results?.[0]?.generated_text;
  if (!result) throw new Error('No text returned from watsonx.ai');
  return result.trim();
}

/**
 * Splits text into chunks that fit within the model's context window.
 * Granite-13b has a 4096-token context; we conservatively allow ~2500
 * words per chunk (roughly 3300 tokens) to leave room for the prompt.
 */
function chunkText(text, maxWords = 2500) {
  const words = text.split(/\s+/);
  const chunks = [];
  for (let i = 0; i < words.length; i += maxWords) {
    chunks.push(words.slice(i, i + maxWords).join(' '));
  }
  return chunks;
}

// ═══════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════

/**
 * formatText — Formats raw story text into proper novel structure.
 *
 * Applies: paragraph breaks, dialogue punctuation, grammar corrections,
 * and scene flow — without altering plot details or character names.
 *
 * For long texts the input is chunked and each chunk is formatted
 * independently, then the results are joined.
 *
 * @param {string} rawText
 * @param {string} criticismLevel  — 'light' | 'moderate' | 'detailed'
 * @returns {string} formattedText
 */
async function formatText(rawText, criticismLevel = 'moderate') {
  const depthInstruction = {
    light: 'Make only essential grammar and punctuation corrections. Preserve the author\'s voice closely.',
    moderate: 'Fix grammar, improve sentence flow, and format dialogue with correct punctuation. Keep the author\'s style.',
    detailed: 'Thoroughly reformat into professional novel structure: fix all grammar, rewrite awkward sentences for clarity, format all dialogue correctly, and improve paragraph pacing.',
  }[criticismLevel] || 'Fix grammar and format dialogue correctly.';

  const chunks = chunkText(rawText);
  const formattedChunks = [];

  for (const chunk of chunks) {
    const prompt = `You are a professional novel editor. Your task is to format the following story text.

Instructions:
- ${depthInstruction}
- Format dialogue with correct punctuation (e.g., "Hello," she said.)
- Ensure each new speaker starts a new paragraph
- Break up walls of text into readable paragraphs
- Do NOT change any character names, plot details, or story events
- Do NOT add new content or commentary
- Return ONLY the formatted text, nothing else

--- STORY TEXT ---
${chunk}
--- END ---

Formatted text:`;

    const result = await generate(prompt, { max_new_tokens: 2048 });
    formattedChunks.push(result);
  }

  return formattedChunks.join('\n\n');
}

/**
 * extractBibleData — Extracts characters, settings, and plot points from text.
 *
 * Returns a structured JSON object. If the model output is not valid JSON,
 * we attempt a best-effort parse and fall back to empty arrays.
 *
 * @param {string} rawText
 * @returns {{ characters: Array, settings: Array, plotPoints: Array }}
 */
async function extractBibleData(rawText) {
  // For extraction we only need the first ~2000 words to identify entities
  // (extracting from the full text risks exceeding token limits on the JSON output)
  const sample = chunkText(rawText, 2000)[0];

  const prompt = `You are a literary analysis assistant. Read the following story excerpt and extract structured data.

Return a JSON object with exactly this structure (no extra keys, no markdown fences):
{
  "characters": [
    { "name": "string", "role": "string", "traits": "string", "arc_notes": "string" }
  ],
  "settings": [
    { "name": "string", "description": "string", "time_period": "string" }
  ],
  "plotPoints": [
    { "title": "string", "description": "string", "is_spoiler": false }
  ]
}

Rules:
- Extract up to 10 characters, 5 settings, and 8 plot points
- For "traits" write a short comma-separated list (e.g. "brave, stubborn, loyal")
- For "arc_notes" write one sentence describing the character's journey if discernible
- For "time_period" write the historical era or "contemporary" if unclear
- Mark a plot point as is_spoiler: true only if it reveals a major twist or ending
- If a field cannot be determined, use an empty string ""
- Return ONLY the raw JSON object, no explanation, no markdown

--- STORY EXCERPT ---
${sample}
--- END ---

JSON:`;

  let raw = '';
  try {
    raw = await generate(prompt, { max_new_tokens: 1500, temperature: 0.1 });

    // Strip any accidental markdown fences the model may add
    raw = raw.replace(/```json|```/g, '').trim();

    // Find the outermost JSON object
    const start = raw.indexOf('{');
    const end = raw.lastIndexOf('}');
    if (start === -1 || end === -1) throw new Error('No JSON object found in response');

    const parsed = JSON.parse(raw.slice(start, end + 1));

    return {
      characters: Array.isArray(parsed.characters) ? parsed.characters : [],
      settings: Array.isArray(parsed.settings) ? parsed.settings : [],
      plotPoints: Array.isArray(parsed.plotPoints) ? parsed.plotPoints : [],
    };
  } catch (err) {
    console.error('extractBibleData parse error:', err.message);
    console.error('Raw model output was:', raw);
    // Return empty arrays so the caller can still proceed
    return { characters: [], settings: [], plotPoints: [] };
  }
}

module.exports = { formatText, extractBibleData };
