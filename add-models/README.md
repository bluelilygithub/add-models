# LLM Connection Tester

A minimal Node.js app to test API key authentication with Anthropic, OpenAI, and Gemini LLMs. Designed for Railway deployment.

## Setup & Deployment (Railway)

1. **Deploy to Railway**
   - Create a new project on [Railway](https://railway.app/)
   - Connect your GitHub repo or upload this code

2. **Set Railway Variables**
   - Go to your Railway project > Variables
   - Add the following variables:
     - `ANTHROPIC_API_KEY` (your Anthropic API key)
     - `OPENAI_API_KEY` (your OpenAI API key)
     - `GEMINI_API_KEY` (your Google Gemini API key)

3. **Deploy**
   - Railway will auto-deploy on push or you can trigger a manual deploy

4. **Test LLM Connections**
   - Once deployed, open your app’s URL and visit `/test` (e.g., `https://your-app.up.railway.app/test`)
   - You’ll get a JSON response showing authentication status for each LLM:

```json
{
  "anthropic": { "success": true },
  "openai": { "success": false, "error": "Status 401" },
  "gemini": { "success": true }
}
```

- `success: true` means the API key is valid and Railway can connect.
- `success: false` with an error means the key is missing or invalid, or there’s a network issue.

## Notes
- No local testing is required—just deploy to Railway and use the `/test` endpoint.
- You can add or remove LLMs by editing `index.js`.
