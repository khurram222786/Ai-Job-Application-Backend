const dotenv = require('dotenv');
const fetch = require('node-fetch');

dotenv.config();

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
console.log(GEMINI_API_KEY)

if (!GEMINI_API_KEY) {
  throw new Error('GEMINI_API_KEY is not set in .env');
}

const callGemini = async (prompt, temperature = 0.7) => {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'Gemini API error');
    }

    return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response text.';
  } catch (error) {
    console.error('Gemini API error:', error.message);
    throw new Error(`Gemini API call failed: ${error.message}`);
  }
};

module.exports = { callGemini };
