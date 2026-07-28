/**
 * imagegen.js — Storyboard image generation for CanonVault.
 *
 * Uses Pollinations.ai — a free, no-API-key image generation service.
 * Images are fetched via a simple HTTPS GET request and returned as
 * base64 data URIs for storage in the database.
 *
 * No environment variables required for image generation.
 * Pollinations.ai is free to use without authentication.
 * API docs: https://pollinations.ai
 */

const https = require('https');

// Max images per publish to stay within reasonable generation time
const MAX_IMAGES = 5;

// Image dimensions
const IMG_WIDTH  = 512;
const IMG_HEIGHT = 512;

/**
 * Generates a single image from a text prompt using Pollinations.ai.
 * Returns a base64 data URI string: "data:image/jpeg;base64,..."
 *
 * @param {string} prompt
 * @param {number} [redirectsLeft=5]  — internal redirect guard
 * @returns {Promise<string>} base64 data URI
 */
function generateImage(prompt, redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    const encoded = encodeURIComponent(prompt);
    const url = `https://image.pollinations.ai/prompt/${encoded}?width=${IMG_WIDTH}&height=${IMG_HEIGHT}&nologo=true`;

    const req = https.get(url, { timeout: 90000 }, (res) => {
      // Follow redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        if (redirectsLeft <= 0) {
          return reject(new Error('Too many redirects from Pollinations.ai'));
        }
        // Re-use the same function but with the redirect target directly
        const redirectUrl = res.headers.location;
        fetchUrl(redirectUrl, redirectsLeft - 1).then(resolve).catch(reject);
        return;
      }

      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`Pollinations.ai returned HTTP ${res.statusCode}`));
      }

      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        const base64 = buffer.toString('base64');
        resolve(`data:image/jpeg;base64,${base64}`);
      });
      res.on('error', reject);
    });

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Pollinations.ai request timed out after 90 seconds'));
    });
    req.on('error', reject);
  });
}

/**
 * Internal helper that fetches an arbitrary HTTPS URL (used for redirect following).
 *
 * @param {string} url
 * @param {number} redirectsLeft
 * @returns {Promise<string>} base64 data URI
 */
function fetchUrl(url, redirectsLeft) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { timeout: 90000 }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume();
        if (redirectsLeft <= 0) return reject(new Error('Too many redirects'));
        return fetchUrl(res.headers.location, redirectsLeft - 1).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      const chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        resolve(`data:image/jpeg;base64,${Buffer.concat(chunks).toString('base64')}`);
      });
      res.on('error', reject);
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('Timed out')); });
    req.on('error', reject);
  });
}

/**
 * Builds a vivid, style-consistent image prompt from a plot point.
 *
 * @param {object} plotPoint  — { title, description }
 * @param {string} genre      — e.g. "Fantasy"
 * @returns {string}
 */
function buildPrompt(plotPoint, genre = '') {
  const styleHint = {
    Fantasy:             'fantasy art, epic lighting, detailed illustration',
    'Science Fiction':   'sci-fi concept art, futuristic, cinematic lighting',
    Romance:             'soft painterly style, warm tones, emotional scene',
    Mystery:             'dark atmospheric, noir style, dramatic shadows',
    Thriller:            'tense cinematic still, dramatic lighting',
    Horror:              'dark horror art, eerie atmosphere, unsettling',
    'Literary Fiction':  'painterly realism, muted tones, expressive',
    'Historical Fiction':'historical painting style, period-accurate detail',
    Adventure:           'adventure illustration, dynamic composition',
  }[genre] || 'detailed digital art, cinematic lighting';

  const subject = plotPoint.description
    ? `${plotPoint.title}: ${plotPoint.description}`
    : plotPoint.title;

  return `${subject}, ${styleHint}, high quality`;
}

/**
 * Generates storyboard images for up to MAX_IMAGES non-spoiler plot points.
 *
 * @param {Array}  plotPoints — array of plot_point rows from the database
 * @param {string} genre
 * @returns {Promise<Array<{ plotPointId, imageUrl, prompt }>>}
 */
async function generateStoryboardImages(plotPoints, genre = '') {
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
      console.error(`Image generation failed for plot point "${point.title}":`, err.message);
    }
  }

  return results;
}

module.exports = { generateStoryboardImages };
