import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  loadModel,
  completion,
  unloadModel,
  LLAMA_3_2_1B_INST_Q4_0
} from '@qvac/sdk';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
let modelId = null;
let loading = null;

async function getModel() {
  if (modelId) return modelId;
  if (loading) return loading;

  loading = loadModel({
    modelSrc: LLAMA_3_2_1B_INST_Q4_0,
    onProgress: (p) => {
      const percent = Number.isFinite(p?.percentage) ? p.percentage.toFixed(0) : '?';
      console.log(`QVAC model download: ${percent}%`);
    }
  }).then((id) => {
    modelId = id;
    return id;
  }).finally(() => {
    loading = null;
  });

  return loading;
}

function sendJson(res, status, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store'
  });
  res.end(body);
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
}

async function askQVAC(note, mode) {
  const id = await getModel();
  const task = mode === 'tasks'
    ? 'Extract the actionable tasks from this note. Return a short markdown checklist. If there are no tasks, say so.'
    : mode === 'rewrite'
      ? 'Rewrite this note to be clear, concise, and professional. Preserve all important facts. Return only the rewritten note.'
      : 'Summarize this note in 3-5 concise bullet points. Preserve important dates, names, numbers, and decisions.';

  const history = [{
    role: 'user',
    content: `${task}\n\nNOTE:\n${note}`
  }];

  const result = completion({ modelId: id, history, stream: true });
  let text = '';
  for await (const token of result.tokenStream) text += token;
  return text.trim();
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/') {
      const html = await readFile(join(__dirname, 'public', 'index.html'));
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(html);
    }

    if (req.method === 'GET' && req.url === '/api/status') {
      return sendJson(res, 200, { ok: true, modelLoaded: Boolean(modelId) });
    }

    if (req.method === 'POST' && req.url === '/api/ask') {
      const raw = await readBody(req);
      const { note, mode = 'summary' } = JSON.parse(raw || '{}');
      if (typeof note !== 'string' || note.trim().length < 3) {
        return sendJson(res, 400, { error: 'Enter a note with at least 3 characters.' });
      }
      if (!['summary', 'tasks', 'rewrite'].includes(mode)) {
        return sendJson(res, 400, { error: 'Unknown mode.' });
      }
      const answer = await askQVAC(note.trim(), mode);
      return sendJson(res, 200, { answer, onDevice: true });
    }

    res.writeHead(404);
    res.end('Not found');
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { error: error?.message || 'Something went wrong.' });
  }
});

async function shutdown() {
  server.close();
  if (modelId) {
    try { await unloadModel({ modelId }); } catch {}
  }
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

server.listen(PORT, () => {
  console.log(`\nLocal Notes AI → http://localhost:${PORT}`);
  console.log('AI inference runs locally through QVAC. No API key required.');
});
