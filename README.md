# Local Notes AI — QVAC Bounty

A tiny local-first note assistant powered by the QVAC SDK. It can summarize notes, extract actionable tasks, or rewrite notes. The AI inference happens on the same machine running this app.

## Why this demonstrates QVAC

- Uses `@qvac/sdk` directly.
- Loads the `LLAMA_3_2_1B_INST_Q4_0` model through QVAC's model registry.
- Runs completion locally with QVAC; there is no OpenAI/Anthropic/Gemini API key.
- Provides a simple browser UI backed by a local Node.js process.
- After the one-time model download, inference can run without a cloud AI service.

## Requirements

- Node.js 22+
- npm 10+
- A machine supported by QVAC/llama.cpp with enough RAM for the selected model

## Run

```bash
npm install
npm start
```

Open **http://localhost:3000**.

The first request downloads the model. Subsequent requests reuse the loaded model while the server is running.

## Project structure

```text
.
├── public/
│   └── index.html      # UI
├── qvac.config.json    # QVAC logging/download settings
├── server.js           # Local HTTP server + QVAC inference
├── package.json
├── LICENSE
└── README.md
```

## Privacy

The note is posted only to the local `/api/ask` endpoint. `server.js` sends that text to the QVAC completion function on the same machine. This project does not call a hosted AI inference API and does not require an API key.

## Bounty demo

1. Start the app.
2. Paste a note into the text box.
3. Click **Summarize** or **Extract tasks**.
4. Record the model download on first run and the generated result.
5. Publish this repository publicly with the Apache-2.0 license.
6. Post the repository on X and tag `@qvac`.

## License

Apache License 2.0. See `LICENSE`.
