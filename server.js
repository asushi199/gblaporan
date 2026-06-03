import fs from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  AVAILABLE_MODELS,
  AVAILABLE_PHASES,
  parsePhaseNumbers,
  validatePhaseSelections
} from "./src/report-generator.js";
import { generateCounsellingReport } from "./src/gemini-client.js";
import { readSettings, writeSettings } from "./src/settings-store.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, "public");
const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8"
};

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === "GET" && url.pathname === "/api/settings") {
      const settings = await readSettings();
      const hasEnvApiKey = Boolean(process.env.GEMINI_API_KEY);
      return sendJson(res, 200, {
        settings: {
          ...settings,
          apiKey: hasEnvApiKey ? "" : settings.apiKey ? "********" : ""
        },
        hasApiKey: Boolean(settings.apiKey || hasEnvApiKey),
        apiKeyManagedByServer: hasEnvApiKey,
        availableModels: AVAILABLE_MODELS,
        availablePhases: AVAILABLE_PHASES
      });
    }

    if (req.method === "POST" && url.pathname === "/api/settings") {
      const body = await readJson(req);
      const current = await readSettings();
      const hasEnvApiKey = Boolean(process.env.GEMINI_API_KEY);
      const nextSettings = await writeSettings({
        ...current,
        model: body.model || current.model,
        theoryMode: body.theoryMode || current.theoryMode,
        theoryPreference: body.theoryPreference || current.theoryPreference,
        privacyMode: body.privacyMode || current.privacyMode,
        apiKey:
          hasEnvApiKey
            ? current.apiKey
            :
          typeof body.apiKey === "string" && body.apiKey.trim()
            ? body.apiKey.trim()
            : current.apiKey
      });

      return sendJson(res, 200, {
        settings: {
          ...nextSettings,
          apiKey: hasEnvApiKey ? "" : nextSettings.apiKey ? "********" : ""
        },
        hasApiKey: Boolean(nextSettings.apiKey || hasEnvApiKey),
        apiKeyManagedByServer: hasEnvApiKey
      });
    }

    if (req.method === "GET" && url.pathname === "/health") {
      return sendJson(res, 200, {
        ok: true,
        hasApiKey: Boolean(process.env.GEMINI_API_KEY)
      });
    }

    if (req.method === "POST" && url.pathname === "/api/generate") {
      const body = await readJson(req);
      const settings = await readSettings();
      const caseDescription = String(body.caseDescription || "").trim();
      const sessionCount = Math.min(
        8,
        Math.max(1, Number(body.sessionCount || 1))
      );
      const phases = parsePhaseNumbers(body.phases);

      if (!caseDescription) {
        return sendJson(res, 400, {
          error: "Huraian kes tidak boleh kosong."
        });
      }

      const phaseValidation = validatePhaseSelections({ sessionCount, phases });
      if (!phaseValidation.ok) {
        return sendJson(res, 400, {
          error: phaseValidation.message
        });
      }

      const report = await generateCounsellingReport({
        settings: {
          ...settings,
          model: body.model || settings.model
        },
        apiKeyOverride: body.apiKey,
        payload: {
          caseDescription,
          sessionCount,
          phases,
          theoryMode: String(body.theoryMode || settings.theoryMode || "auto"),
          theoryPreference: String(
            body.theoryPreference || settings.theoryPreference || "REBT"
          ),
          privacyMode: String(
            body.privacyMode || settings.privacyMode || "anonymous"
          )
        }
      });

      return sendJson(res, 200, report);
    }

    await serveStatic(req, res, url.pathname);
  } catch (error) {
    sendJson(res, 500, {
      error: error.message || "Ralat pelayan."
    });
  }
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

async function serveStatic(req, res, pathname) {
  const safePath = pathname === "/" ? "/index.html" : pathname;
  const filePath = path.join(PUBLIC_DIR, safePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  const extension = path.extname(filePath);
  const type = MIME_TYPES[extension] || "text/plain; charset=utf-8";

  try {
    const content = await fs.readFile(filePath);
    res.writeHead(200, { "Content-Type": type });
    res.end(content);
  } catch (error) {
    if (error.code === "ENOENT") {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    throw error;
  }
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8"
  });
  res.end(JSON.stringify(payload));
}

async function readJson(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}
