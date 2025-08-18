# LLM Connection Tester (Gemini Only)

A minimal Node.js app to test API key authentication with Google Gemini LLM. Designed for Railway deployment.

## Setup & Deployment (Railway)

1. **Deploy to Railway**
   - Create a new project on [Railway](https://railway.app/)
   - Connect your GitHub repo or upload this code

2. **Set Railway Variable**
   - Go to your Railway project > Variables
   - Add the following variable:
     - `GEMINI_API_KEY` (your Google Gemini API key)

3. **Deploy**
   - Railway will auto-deploy on push or you can trigger a manual deploy

4. **Test Gemini Connection**
   - Once deployed, open your app’s URL and visit `/test` (e.g., `https://your-app.up.railway.app/test`)
   - You’ll get a JSON response showing authentication status for Gemini:

```json
{
  "gemini": { "success": true }
}
```

- `success: true` means the API key is valid and Railway can connect.
- `success: false` with an error means the key is missing or invalid, or there’s a network issue.

## Notes
- No local testing is required—just deploy to Railway and use the `/test` endpoint.
- You can add other LLMs by editing `index.js` if needed.
