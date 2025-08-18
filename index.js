const express = require('express');
const fetch = require('node-fetch');

const app = express();
const PORT = process.env.PORT || 3000;

// Helper function to test Gemini
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
  const geminiResult = await testGemini(process.env.GEMINI_API_KEY);
  res.json({
    gemini: geminiResult,
  });
});

app.get('/', (req, res) => {
  res.send('LLM Connection Tester is running. Use /test to check Gemini API connection.');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
