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

  // Claude: try all known models in order, use the first that works
  let claudeResponse = '';
  let claudeModel = '';
  let claudeTestedModels = [];
  let claudeErrors = [];
  const claudeKey = process.env.CLAUDE_API_KEY;
  const claudeModels = [
    'claude-sonnet-4-20250514',
    'claude-opus-4',
    'claude-3-5-sonnet-20241022',
    'claude-3-5-haiku-20241022'
  ];
  if (!claudeKey) {
    claudeResponse = 'No API key';
    claudeModel = 'None';
  } else {
    for (const model of claudeModels) {
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

app.get('/models', (req, res) => {
  res.send(`
    <h2>Test LLM Models</h2>
    <form method="POST" action="/test-models">
      <label>Gemini Models (one per line):</label><br>
      <textarea name="gemini_models" rows="3" style="width: 400px;">models/gemini-1.5-pro-002\nmodels/gemini-pro</textarea><br><br>
      <label>OpenAI Models (one per line):</label><br>
      <textarea name="openai_models" rows="4" style="width: 400px;">gpt-4o\ngpt-4-turbo\ngpt-4\ngpt-3.5-turbo</textarea><br><br>
      <label>Claude Models (one per line):</label><br>
      <textarea name="claude_models" rows="4" style="width: 400px;">claude-sonnet-4-20250514\nclaude-opus-4\nclaude-3-5-sonnet-20241022\nclaude-3-5-haiku-20241022</textarea><br><br>
      <button type="submit">Test Models</button>
    </form>
  `);
});

app.post('/test-models', async (req, res) => {
  const geminiKey = process.env.GEMINI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  const claudeKey = process.env.CLAUDE_API_KEY;
  // Split on newlines or commas, trim, and filter out empty
  const splitModels = str => str.split(/\r?\n|,/).map(m => m.trim()).filter(Boolean);
  const geminiModels = splitModels(req.body.gemini_models);
  const openaiModels = splitModels(req.body.openai_models);
  const claudeModels = splitModels(req.body.claude_models);

  // Test Gemini models
  let geminiResults = [];
  for (const model of geminiModels) {
    if (!geminiKey) {
      geminiResults.push({ model, success: false, error: 'No API key' });
      continue;
    }
    try {
      const geminiApi = `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${geminiKey}`;
      const geminiRes = await fetch(geminiApi, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Hi' }] }]
        })
      });
      if (geminiRes.ok) {
        geminiResults.push({ model, success: true });
      } else {
        const data = await geminiRes.json();
        geminiResults.push({ model, success: false, error: JSON.stringify(data) });
      }
    } catch (e) {
      geminiResults.push({ model, success: false, error: e.message });
    }
  }

  // Test OpenAI models
  let openaiResults = [];
  for (const model of openaiModels) {
    if (!openaiKey) {
      openaiResults.push({ model, success: false, error: 'No API key' });
      continue;
    }
    try {
      const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 5
        })
      });
      if (openaiRes.ok) {
        openaiResults.push({ model, success: true });
      } else {
        const data = await openaiRes.json();
        openaiResults.push({ model, success: false, error: JSON.stringify(data) });
      }
    } catch (e) {
      openaiResults.push({ model, success: false, error: e.message });
    }
  }

  // Test Claude models
  let claudeResults = [];
  for (const model of claudeModels) {
    if (!claudeKey) {
      claudeResults.push({ model, success: false, error: 'No API key' });
      continue;
    }
    try {
      const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': claudeKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: 5,
          messages: [{ role: 'user', content: 'Hi' }],
        })
      });
      if (claudeRes.ok) {
        claudeResults.push({ model, success: true });
      } else {
        const data = await claudeRes.json();
        claudeResults.push({ model, success: false, error: JSON.stringify(data) });
      }
    } catch (e) {
      claudeResults.push({ model, success: false, error: e.message });
    }
  }

  // Render results as a table
  function renderRow(results) {
    return results.map(r => `<tr><td>${r.model}</td><td style="text-align:center;">${r.success ? '✔️' : '❌'}</td><td>${r.error ? `<pre style='max-width:400px;overflow-x:auto;'>${r.error}</pre>` : ''}</td></tr>`).join('');
  }

  res.send(`
    <h2>Model Test Results</h2>
    <h3>Gemini</h3>
    <table border="1" cellpadding="5"><tr><th>Model</th><th>Result</th><th>Error</th></tr>${renderRow(geminiResults)}</table>
    <h3>OpenAI</h3>
    <table border="1" cellpadding="5"><tr><th>Model</th><th>Result</th><th>Error</th></tr>${renderRow(openaiResults)}</table>
    <h3>Claude</h3>
    <table border="1" cellpadding="5"><tr><th>Model</th><th>Result</th><th>Error</th></tr>${renderRow(claudeResults)}</table>
    <br><a href="/models">Test again</a>
  `);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
