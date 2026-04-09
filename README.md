# WorshipFlow AI

Dark-mode worship setlist builder with:

- manual song entry
- YouTube embed preview
- Grok-powered setlist generation
- Grok-powered draft lyrics and chords autofill

## Environment Variable

Set this in Vercel:

```bash
XAI_API_KEY=your_grok_api_key_here
```

Do not commit your real API key to GitHub.

## Local Files

- `index.html`
- `style.css`
- `app.js`
- `api/grok.mjs`

## Push To GitHub

Run these commands in this folder:

```bash
git init
git add .
git commit -m "Initial WorshipFlow AI prototype"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

If you already created the GitHub repo in the browser, use its HTTPS URL for `origin`.

## Deploy To Vercel

### Option 1: Vercel Dashboard

1. Push the project to GitHub.
2. Go to Vercel and click `Add New Project`.
3. Import your GitHub repo.
4. In project settings, add environment variable:
   `XAI_API_KEY`
5. Deploy.

### Option 2: Vercel CLI

```bash
npm i -g vercel
vercel
```

Then add the environment variable:

```bash
vercel env add XAI_API_KEY
```

Redeploy after adding env vars:

```bash
vercel --prod
```

## Test After Deploy

1. Open the deployed URL.
2. Create a setlist.
3. Try `AI Generate`.
4. Try `Add Song Manually` -> `Auto Fill with Grok`.

If Grok is not working, check:

- `XAI_API_KEY` is set in Vercel
- the deployment was redeployed after adding the env var
- your Grok key is valid
