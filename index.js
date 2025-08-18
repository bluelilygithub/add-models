const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/test', async (req, res) => {
  // Gemini test
  const geminiKey = process.env.GEMINI_API_KEY;
  let geminiResult;
  if (!geminiKey) {
    geminiResult = { success: false, error: 'No API key' };
  } else {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${geminiKey}`);
      if (response.ok) {
        geminiResult = { success: true };
      } else {
        geminiResult = { success: false, error: `Status ${response.status}` };
      }
    } catch (e) {
      geminiResult = { success: false, error: e.message };
    }
  }

  // OpenAI test
  const openaiKey = process.env.OPENAI_API_KEY;
  let openaiResult;
  if (!openaiKey) {
    openaiResult = { success: false, error: 'No API key' };
  } else {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
        },
      });
      if (response.ok) {
        openaiResult = { success: true };
      } else {
        openaiResult = { success: false, error: `Status ${response.status}` };
      }
    } catch (e) {
      openaiResult = { success: false, error: e.message };
    }
  }

  res.json({
    gemini: geminiResult,
    openai: openaiResult,
  });
});

app.get('/', (req, res) => {
  res.send('Gemini & OpenAI Auth Test: use /test');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
