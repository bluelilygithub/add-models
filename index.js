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

  // Claude (Anthropic) test - try all known models
  const claudeKey = process.env.CLAUDE_API_KEY;
  const claudeModels = [
    'claude-sonnet-4-20250514',
    'claude-opus-4',
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022'
  ];
  let claudeResults = [];
  if (!claudeKey) {
    claudeResults = [{ model: null, success: false, error: 'No API key' }];
  } else {
    for (const model of claudeModels) {
      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': claudeKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model,
            max_tokens: 10,
            messages: [{ role: 'user', content: 'Hi' }],
          })
        });
        if (response.ok) {
          claudeResults.push({ model, success: true });
        } else {
          const errorData = await response.json();
          claudeResults.push({ model, success: false, error: `Status ${response.status}: ${JSON.stringify(errorData)}` });
        }
      } catch (e) {
        claudeResults.push({ model, success: false, error: e.message });
      }
    }
  }

  res.json({
    gemini: geminiResult,
    openai: openaiResult,
    claude: claudeResults,
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

  // Gemini: fetch available models, use the first
  let geminiResponse = '';
  let geminiModel = '';
  try {
    const geminiKey = process.env.GEMINI_API_KEY;
    let modelList = await fetch(`https://generativelanguage.googleapis.com/v1/models?key=${geminiKey}`);
    let modelData = await modelList.json();
    geminiModel = modelData.models?.[0]?.name || 'models/gemini-pro';
    // Try v1 first, fallback to v1beta if needed
    let geminiApi = `https://generativelanguage.googleapis.com/v1beta/${geminiModel}:generateContent?key=${geminiKey}`;
    let geminiRes = await fetch(geminiApi, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: question }] }]
      })
    });
    let geminiData = await geminiRes.json();
    if (geminiData.candidates?.[0]?.content?.parts?.[0]?.text) {
      geminiResponse = geminiData.candidates[0].content.parts[0].text;
    } else {
      geminiResponse = JSON.stringify(geminiData);
    }
  } catch (e) {
    geminiResponse = 'Error: ' + e.message;
  }

  // OpenAI
  let openaiResponse = '';
  let openaiModel = 'gpt-3.5-turbo';
  try {
    const openaiKey = process.env.OPENAI_API_KEY;
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: openaiModel,
        messages: [{ role: 'user', content: question }],
      })
    });
    const openaiData = await openaiRes.json();
    if (openaiData.choices?.[0]?.message?.content) {
      openaiResponse = openaiData.choices[0].message.content;
    } else {
      openaiResponse = JSON.stringify(openaiData);
    }
  } catch (e) {
    openaiResponse = 'Error: ' + e.message;
  }

  // Claude: try preferred models in order, then fallback to first available
  let claudeResponse = '';
  let claudeModel = '';
  let claudeTestedModels = [];
  let claudeErrors = [];
  try {
    const claudeKey = process.env.CLAUDE_API_KEY;
    let modelList = await fetch('https://api.anthropic.com/v1/models', {
      headers: {
        'x-api-key': claudeKey,
        'anthropic-version': '2023-06-01',
      },
    });
    let modelData = await modelList.json();
    let availableModels = modelData.models?.map(m => m.id) || [];
    // Preferred models in order
    const preferredModels = [
      'claude-sonnet-4-20250514',
      'claude-opus-4',
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022'
    ];
    // Try preferred models first, then any available
    let modelsToTry = preferredModels.filter(m => availableModels.includes(m));
    if (modelsToTry.length === 0 && availableModels.length > 0) {
      modelsToTry = [availableModels[0]];
    }
    for (let model of modelsToTry) {
      claudeTestedModels.push(model);
      try {
        let claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': claudeKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model,
            max_tokens: 256,
            messages: [{ role: 'user', content: question }],
          })
        });
        let claudeData = await claudeRes.json();
        if (claudeData.content?.[0]?.text) {
          claudeResponse = claudeData.content[0].text;
          claudeModel = model;
          break;
        } else {
          claudeErrors.push({model, error: JSON.stringify(claudeData)});
        }
      } catch (e) {
        claudeErrors.push({model, error: e.message});
      }
    }
    if (!claudeResponse) {
      claudeResponse = 'All models failed. Errors: ' + JSON.stringify(claudeErrors);
      claudeModel = 'None worked';
    }
  } catch (e) {
    claudeResponse = 'Error: ' + e.message;
    claudeModel = 'Error fetching models';
  }

  res.send(`
    <h2>Question:</h2>
    <div>${question}</div>
    <h2>Gemini Response (Model: ${geminiModel}):</h2>
    <pre>${geminiResponse}</pre>
    <h2>OpenAI Response (Model: ${openaiModel}):</h2>
    <pre>${openaiResponse}</pre>
    <h2>Claude Response (Model: ${claudeModel}):</h2>
    <pre>${claudeResponse}</pre>
    <h3>Claude Models Tested:</h3>
    <pre>${JSON.stringify(claudeTestedModels, null, 2)}</pre>
    <br><a href="/">Ask another question</a>
  `);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
