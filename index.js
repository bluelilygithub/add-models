const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/test', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.json({ gemini: { success: false, error: 'No API key' } });
  }
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`);
    if (response.ok) {
      res.json({ gemini: { success: true } });
    } else {
      res.json({ gemini: { success: false, error: `Status ${response.status}` } });
    }
  } catch (e) {
    res.json({ gemini: { success: false, error: e.message } });
  }
});

app.get('/', (req, res) => {
  res.send('Gemini Auth Test: use /test');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
