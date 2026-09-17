# Xrypton Website (Vercel Deployment)

This is a static website with serverless API endpoints for the Xrypton Discord bot.

## Structure

```
website/
├── api/                    # Vercel serverless functions (Python)
│   ├── commands.py        # GET/POST /api/commands
│   ├── bot.py             # GET/POST /api/bot
│   └── status.py          # GET/POST /api/status
├── public/                 # Static HTML files
│   ├── index.html         # Home page
│   ├── commands.html      # Commands page with module pills
│   ├── bot.html           # Bot stats page
│   └── status.html        # System status page
├── static/
│   ├── css/style.css      # Shared styles
│   └── js/main.js         # Shared utilities
├── vercel.json            # Vercel configuration
└── data/                  # JSON data storage (created at runtime)
```

## Deployment to Vercel

1. Push this repository to GitHub
2. Import the project in Vercel
3. Configure the following:
   - **Framework Preset**: Other
   - **Root Directory**: `website` (if repo contains bot code too)
   - **Build Command**: (leave empty)
   - **Output Directory**: `public`
4. Add Environment Variables in Vercel:
   - `WEBSITE_API_KEY` - Secret key for bot authentication
5. Deploy

The API endpoints will be available at:
- `https://your-project.vercel.app/api/commands`
- `https://your-project.vercel.app/api/bot`
- `https://your-project.vercel.app/api/status`

## Bot Configuration

In your bot's `.env` (on Pterodactyl):

```env
WEBSITE_API_URL=https://your-project.vercel.app
WEBSITE_API_KEY=your_secret_api_key_here
```

The `WEBSITE_API_KEY` must match the one set in Vercel environment variables.

## Data Persistence

**Important**: Vercel's filesystem is ephemeral. The JSON files in `/data` will be reset on each deployment or function cold start.

For production, consider using:
- **Vercel KV** (Redis) - Native key-value store
- **PlanetScale** / **Neon** - Serverless MySQL/PostgreSQL
- **Upstash Redis** - HTTP-based Redis

To use Vercel KV, update the API files to use `@vercel/kv` instead of JSON files.

## Local Development

```bash
cd website
# Install Vercel CLI
npm i -g vercel
# Run locally
vercel dev
```

Or serve static files only:
```bash
cd website/public
python -m http.server 8000
```

## API Endpoints

### GET /api/commands
Returns all commands with module info.

### POST /api/commands
Accepts: `{"commands": [...], "updated_at": "ISO8601"}`
Bot sends its command list here.

### GET /api/bot
Returns bot statistics.

### POST /api/bot
Accepts bot stats payload.

### GET /api/status
Returns system status (RAM, CPU, command counts).

### POST /api/status
Accepts system status payload.