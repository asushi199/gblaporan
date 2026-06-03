import {
  buildPromptPayload,
  buildQualityAdvice,
  buildSessionRanges,
  getReportSchema,
  normaliseSession,
  validateSessionBatch
} from "./report-generator.js";

const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

function getApiKey(settings, overrideKey) {
  return overrideKey || settings.apiKey || process.env.GEMINI_API_KEY || "";
}

export async function generateCounsellingReport({
  settings,
  payload,
  apiKeyOverride
}) {
  const apiKey = getApiKey(settings, apiKeyOverride);

  if (!apiKey) {
    throw new Error("API key Gemini belum ditetapkan.");
  }

  const ranges = buildSessionRanges(payload.sessionCount);
  const allSessions = [];
  const batchChecks = [];

  for (const range of ranges) {
    const promptPayload = buildPromptPayload({
      ...payload,
      currentRange: range,
      previousSessions: allSessions
    });
    const generated = await requestBatch({
      model: settings.model,
      apiKey,
      promptPayload,
      range
    });

    const normalised = generated.sessions.map(normaliseSession);
    const validation = validateSessionBatch({
      requestedRange: range,
      theoryMode: payload.theoryMode,
      sessions: normalised,
      sourceCaseDescription: payload.caseDescription
    });

    batchChecks.push({
      range,
      validation,
      advice: buildQualityAdvice(validation)
    });

    allSessions.push(...normalised);
  }

  const aggregateValidation = {
    ok: batchChecks.every((check) => check.validation.ok),
    issues: batchChecks.flatMap((check) => check.validation.issues),
    warnings: batchChecks.flatMap((check) => check.validation.warnings)
  };

  if (!aggregateValidation.ok) {
    const error = new Error(
      aggregateValidation.issues[0] ||
        "Respons model tidak menepati format laporan yang diperlukan."
    );
    error.validation = {
      ...aggregateValidation,
      advice: buildQualityAdvice(aggregateValidation),
      batches: batchChecks
    };
    throw error;
  }

  return {
    sessions: allSessions,
    quality: {
      ...aggregateValidation,
      advice: buildQualityAdvice(aggregateValidation),
      batches: batchChecks
    }
  };
}

async function requestBatch({ model, apiKey, promptPayload, range }) {
  const response = await fetch(`${API_BASE}/${model}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: promptPayload.systemInstruction }]
      },
      contents: [
        {
          role: "user",
          parts: [{ text: promptPayload.userPrompt }]
        }
      ],
      generationConfig: {
        temperature: 0.6,
        responseMimeType: "application/json",
        responseSchema: getReportSchema(range)
      }
    })
  });

  const body = await response.json();

  if (!response.ok) {
    throw new Error(body.error?.message || "Panggilan Gemini gagal.");
  }

  const text = body.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("Model tidak memulangkan kandungan yang boleh dibaca.");
  }

  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Model memulangkan JSON yang tidak sah.");
  }

  if (!parsed.sessions) {
    throw new Error("Respons model tidak mengandungi medan sessions.");
  }

  return parsed;
}
