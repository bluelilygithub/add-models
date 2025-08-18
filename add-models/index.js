const express = require('express');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// Helper functions to test each LLM
async function testAnthropic(apiKey) {
  if (!apiKey) return { success: false, error: 'No API key' };
  try {
    const res = await fetch('https://api.anthropic.com/v1/models', {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
    });
    if (res.ok) return { success: true };
    return { success: false, error: `Status ${res.status}` };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function testOpenAI(apiKey) {
  if (!apiKey) return { success: false, error: 'No API key' };
  try {
    const res = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });
    if (res.ok) return { success: true };
    return { success: false, error: `Status ${res.status}` };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

async function testGemini(apiKey) {
  if (!apiKey) return { success: false, error: 'No API key' };
  try {
    // Gemini (Google AI) uses a different endpoint and API key in query param
    const res = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`);
    if (res.ok) return { success: true };
    return { success: false, error: `Status ${res.status}` };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

app.get('/test', async (req, res) => {
  const results = await Promise.all([
    testAnthropic(process.env.ANTHROPIC_API_KEY),
    testOpenAI(process.env.OPENAI_API_KEY),
    testGemini(process.env.GEMINI_API_KEY),
  ]);
  res.json({
    anthropic: results[0],
    openai: results[1],
    gemini: results[2],
  });
});

app.get('/', (req, res) => {
  res.send('LLM Connection Tester is running. Use /test to check LLM API connections.');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
