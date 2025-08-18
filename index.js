const express = require('express');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

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

  // Claude (Anthropic) test
  const claudeKey = process.env.CLAUDE_API_KEY;
  let claudeResult;
  if (!claudeKey) {
    claudeResult = { success: false, error: 'No API key' };
  } else {
    try {
      const response = await fetch('https://api.anthropic.com/v1/models', {
        headers: {
          'x-api-key': claudeKey,
          'anthropic-version': '2023-06-01',
        },
      });
      if (response.ok) {
        claudeResult = { success: true };
      } else {
        claudeResult = { success: false, error: `Status ${response.status}` };
      }
    } catch (e) {
      claudeResult = { success: false, error: e.message };
    }
  }

  res.json({
    gemini: geminiResult,
    openai: openaiResult,
    claude: claudeResult,
  });
});

app.get('/', (req, res) => {
  res.send(`
    <form method="POST" action="/ask">
      <label for="question">Ask a question:</label><br>
      <input type="text" id="question" name="question" style="width: 400px;" required><br><br>
      <button type="submit">Ask All LLMs</button>
    </form>
  `);
});

app.post('/ask', async (req, res) => {
  const question = req.body.question;
  // Gemini
  let geminiResponse = '';
  try {
    const geminiKey = process.env.GEMINI_API_KEY;
    const geminiApi = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=' + geminiKey;
    const geminiRes = await fetch(geminiApi, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: question }] }]
      })
    });
    const geminiData = await geminiRes.json();
    geminiResponse = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || JSON.stringify(geminiData);
  } catch (e) {
    geminiResponse = 'Error: ' + e.message;
  }

  // OpenAI
  let openaiResponse = '';
  try {
    const openaiKey = process.env.OPENAI_API_KEY;
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: question }],
      })
    });
    const openaiData = await openaiRes.json();
    openaiResponse = openaiData.choices?.[0]?.message?.content || JSON.stringify(openaiData);
  } catch (e) {
    openaiResponse = 'Error: ' + e.message;
  }

  // Claude
  let claudeResponse = '';
  try {
    const claudeKey = process.env.CLAUDE_API_KEY;
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': claudeKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-opus-20240229',
        max_tokens: 256,
        messages: [{ role: 'user', content: question }],
      })
    });
    const claudeData = await claudeRes.json();
    claudeResponse = claudeData.content?.[0]?.text || JSON.stringify(claudeData);
  } catch (e) {
    claudeResponse = 'Error: ' + e.message;
  }

  res.send(`
    <h2>Question:</h2>
    <div>${question}</div>
    <h2>Gemini Response:</h2>
    <pre>${geminiResponse}</pre>
    <h2>OpenAI Response:</h2>
    <pre>${openaiResponse}</pre>
    <h2>Claude Response:</h2>
    <pre>${claudeResponse}</pre>
    <br><a href="/">Ask another question</a>
  `);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
