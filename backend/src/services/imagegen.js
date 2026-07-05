/**
 * imagegen.js — Hugging Face Inference API wrapper for storyboard image generation.
 *
 * Uses the free Hugging Face Inference API with the stabilityai/stable-diffusion-2
 * model (or a fast alternative). Images are returned as base64 data URIs so they
 * can be stored directly in the database without an external file store.
 *
 * Environment variable required:
 *   HUGGINGFACE_TOKEN — your HF token from https://huggingface.co/settings/tokens
 */

const axios = require('axios');

const HF_TOKEN = process.env.HUGGINGFACE_TOKEN;
const HF_MODEL = 'stabilityai/stable-diffusion-2';
const HF_API_URL = `https://api-inference.huggingface.co/models/${HF_MODEL}`;

// Max images per publish to stay within HF free-tier rate limits
const MAX_IMAGES = 5;

/**
 * Generates a single image from a text prompt.
 * Returns a base64 data URI string: "data:image/png;base64,..."
 *
 * @param {string} prompt
 * @returns {Promise<string>} base64 data URI
 */
async function generateImage(prompt) {
  if (!HF_TOKEN) {
    throw new Error('HUGGINGFACE_TOKEN is not set in environment variables');
  }

  const response = await axios.post(
    HF_API_URL,
    { inputs: prompt },
    {
      headers: {
        Authorization: `Bearer ${HF_TOKEN}`,
        'Content-Type': 'application/json',
      },
      responseType: 'arraybuffer',
      timeout: 60000, // HF cold-start can be slow on free tier
    }
  );

  const base64 = Buffer.from(response.data).toString('base64');
  return `data:image/png;base64,${base64}`;
}

/**
 * Builds a vivid, style-consistent image prompt from a plot point.
 * Adds artistic style cues to improve image quality on SD2.
 *
 * @param {object} plotPoint  — { title, description }
 * @param {string} genre      — e.g. "Fantasy"
 * @returns {string}
 */
function buildPrompt(plotPoint, genre = '') {
  const styleHint = {
    Fantasy:           'fantasy art, epic lighting, detailed illustration',
    'Science Fiction': 'sci-fi concept art, futuristic, cinematic lighting',
    Romance:           'soft painterly style, warm tones, emotional scene',
    Mystery:           'dark atmospheric, noir style, dramatic shadows',
    Thriller:          'tense cinematic still, dramatic lighting',
    Horror:            'dark horror art, eerie atmosphere, unsettling',
    'Literary Fiction':'painterly realism, muted tones, expressive',
    'Historical Fiction':'historical painting style, period-accurate detail',
    Adventure:         'adventure illustration, dynamic composition',
  }[genre] || 'detailed digital art, cinematic lighting';

  const subject = plotPoint.description
    ? `${plotPoint.title}: ${plotPoint.description}`
    : plotPoint.title;

  return `${subject}, ${styleHint}, high quality, 4k`;
}

/**
 * Generates storyboard images for up to MAX_IMAGES non-spoiler plot points.
 *
 * @param {Array}  plotPoints — array of plot_point rows from the database
 * @param {string} genre
 * @returns {Promise<Array<{ plotPointId, imageUrl, prompt }>>}
 */
async function generateStoryboardImages(plotPoints, genre = '') {
  // Only use non-spoiler plot points, up to MAX_IMAGES
  const eligible = plotPoints
    .filter(p => !p.is_spoiler)
    .slice(0, MAX_IMAGES);

  const results = [];

  for (const point of eligible) {
    const prompt = buildPrompt(point, genre);
    try {
      const imageUrl = await generateImage(prompt);
      results.push({ plotPointId: point.id, imageUrl, prompt });
    } catch (err) {
      // Log but don't fail the whole publish if one image fails
      console.error(`Image generation failed for plot point "${point.title}":`, err.message);
    }
  }

  return results;
}

module.exports = { generateStoryboardImages };
