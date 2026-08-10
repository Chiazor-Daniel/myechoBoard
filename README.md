# myechoBoard

A local, handwritten AI canvas. Draw equations, diagrams, and notes, then ask an AI to answer, explain, continue, or plot right on the page.

## What you need

- [Node.js](https://nodejs.org/) 20.3 or newer
- An AI backend: **Ollama** (free, local), **Anthropic**, or **OpenAI**

## Quick start

```bash
git clone https://github.com/Chiazor-Daniel/myechoBoard.git
cd myechoBoard
npm install
```

Then pick an AI provider and start the server.

### Option 1 – Ollama (local, free)

1. Install [Ollama](https://ollama.com/) and pull a vision model. The app has been tested with `kimi-k2.7-code:cloud`:

   ```bash
   ollama pull kimi-k2.7-code:cloud
   ```

2. Create `~/.penecho/config.env` with:

   ```env
   AI_PROVIDER=ollama
   OLLAMA_HOST=http://localhost:11434
   OLLAMA_MODEL=kimi-k2.7-code:cloud
   PENECHO_AI_IMAGE_FORMAT=png
   PORT=3888
   HOST=0.0.0.0
   ```

3. Start the server:

   ```bash
   npm start
   ```

   Or, directly:

   ```bash
   node server.js
   ```

### Option 2 – Anthropic API

1. Get an API key from [console.anthropic.com](https://console.anthropic.com/).

2. Create `~/.penecho/config.env` with:

   ```env
   AI_PROVIDER=api
   AI_API_FORMAT=anthropic
   AI_API_URL=https://api.anthropic.com/v1
   AI_API_MODEL=claude-3-5-sonnet-20241022
   AI_API_KEY=your_anthropic_api_key
   PENECHO_AI_IMAGE_FORMAT=png
   PORT=3888
   HOST=0.0.0.0
   ```

3. Start the server:

   ```bash
   npm start
   ```

### Option 3 – OpenAI API

1. Get an API key from [platform.openai.com](https://platform.openai.com/).

2. Create `~/.penecho/config.env` with:

   ```env
   AI_PROVIDER=api
   AI_API_FORMAT=openai
   AI_API_URL=https://api.openai.com/v1
   AI_API_MODEL=gpt-4o
   AI_API_KEY=your_openai_api_key
   PENECHO_AI_IMAGE_FORMAT=png
   PORT=3888
   HOST=0.0.0.0
   ```

3. Start the server:

   ```bash
   npm start
   ```

## How the app picks a provider

The server reads `AI_PROVIDER` first. Its value decides which backend is used:

| `AI_PROVIDER` | Backend | Required variables |
|---|---|---|
| `ollama` | Local Ollama server | `OLLAMA_HOST`, `OLLAMA_MODEL` |
| `api` + `AI_API_FORMAT=anthropic` | Anthropic API | `AI_API_URL`, `AI_API_MODEL`, `AI_API_KEY` |
| `api` + `AI_API_FORMAT=openai` | OpenAI-compatible API | `AI_API_URL`, `AI_API_MODEL`, `AI_API_KEY` |

The configuration file is `~/.penecho/config.env` by default. You can use a different file:

```bash
npm start -- --config ./my-config.env
```

Environment variables and command-line flags take precedence over values in the config file.

## Open the canvas

Once the server is running, open [http://localhost:3888](http://localhost:3888).

On first load the browser may ask you to set a six-digit access code (or continue without one). This protects local-network access; it is not a password for the AI backend.

## Useful settings

| Variable | What it does | Default |
|---|---|---|
| `AI_PROVIDER` | Which AI backend to use | none |
| `AI_API_FORMAT` | `openai` or `anthropic` when `AI_PROVIDER=api` | `openai` |
| `AI_API_MODEL` / `OLLAMA_MODEL` | Model name | none |
| `AI_API_URL` / `OLLAMA_HOST` | Endpoint URL | none / `http://localhost:11434` |
| `AI_API_KEY` | API key (not needed for local Ollama) | none |
| `AI_TIMEOUT_SECONDS` | Max seconds to wait for an AI response | `180` |
| `PENECHO_AI_IMAGE_FORMAT` | `png` or `webp` sent to the model | `png` |
| `AUTO_AI_DELAY_SECONDS` | Seconds of idle time before auto AI triggers | `5` |
| `HOST` / `PORT` | Server bind address and port | `0.0.0.0:3888` |

## Development

Rebuild the bundled client after changing source files in `src/client/app/`:

```bash
npm run build:client
```

Run the test suite:

```bash
npm run check
```

## License

This project is open source under [GNU AGPL v3.0 only](LICENSE).
