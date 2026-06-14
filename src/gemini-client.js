import {
  buildFallbackSession,
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
  let stablePerkara = "";

  for (const range of ranges) {
    const generated = await requestValidBatch({
      settings,
      apiKey,
      payload,
      range,
      stablePerkara,
      previousSessions: allSessions
    });

    const normalised = normaliseGeneratedSessions(generated.sessions, stablePerkara);

    if (!stablePerkara && normalised[0]?.perkara) {
      stablePerkara = normalised[0].perkara;
    }

    batchChecks.push({
      range,
      validation: generated.validation,
      advice: buildQualityAdvice(generated.validation)
    });

    allSessions.push(...normalised);
  }

  const aggregateValidation = {
    ok: batchChecks.every((check) => check.validation.ok),
    issues: batchChecks.flatMap((check) => check.validation.issues),
    warnings: batchChecks.flatMap((check) => check.validation.warnings)
  };

  return {
    sessions: allSessions,
    quality: {
      ...aggregateValidation,
      advice: buildQualityAdvice(aggregateValidation),
      batches: batchChecks
    }
  };
}

async function requestValidBatch({
  settings,
  apiKey,
  payload,
  range,
  stablePerkara,
  previousSessions
}) {
  let lastGenerated = null;
  let lastValidation = null;
  let retryIssues = [];

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const promptPayload = buildPromptPayload({
      ...payload,
      currentRange: range,
      stablePerkara,
      previousSessions,
      retryIssues
    });
    let generated;
    try {
      generated = await requestBatch({
        model: settings.model,
        apiKey,
        promptPayload,
        range
      });
    } catch (error) {
      retryIssues = [error.message || "Respons model tidak sah."];
      lastValidation = {
        ok: false,
        issues: retryIssues,
        warnings: []
      };
      continue;
    }
    const normalised = normaliseGeneratedSessions(generated.sessions, stablePerkara);
    const validation = validateSessionBatch({
      requestedRange: range,
      theoryMode: payload.theoryMode,
      sessions: normalised,
      sourceCaseDescription: payload.caseDescription
    });

    lastGenerated = {
      sessions: normalised,
      validation
    };
    lastValidation = validation;

    if (validation.ok) {
      return lastGenerated;
    }

    if (!shouldRetryValidation(validation)) {
      return lastGenerated;
    }

    retryIssues = validation.issues;
  }

  const fallbackSessions = buildFallbackSessions({
    range,
    theoryMode: payload.theoryMode,
    theoryPreference: payload.theoryPreference,
    stablePerkara
  });
  const fallbackValidation = validateSessionBatch({
    requestedRange: range,
    theoryMode: payload.theoryMode,
    sessions: fallbackSessions,
    sourceCaseDescription: payload.caseDescription
  });

  if (lastGenerated?.sessions?.length) {
    return {
      sessions: lastGenerated.sessions,
      validation: lastValidation
    };
  }

  return {
    sessions: fallbackSessions,
    validation: fallbackValidation
  };
}

function shouldRetryValidation(validation) {
  return validation.issues.some((issue) =>
    /Bilangan sesi|nombor sesi|tidak diisi|mesti dijana sebagai array|4 hingga 6|teori mesti/i.test(
      issue
    )
  );
}

function buildFallbackSessions({
  range,
  theoryMode,
  theoryPreference,
  stablePerkara
}) {
  const teori = getFallbackTeori(theoryMode, theoryPreference);
  const sessions = [];

  for (let sesi = range.startSession; sesi <= range.endSession; sesi += 1) {
    sessions.push(buildFallbackSession(sesi, teori, stablePerkara));
  }

  return sessions;
}

function getFallbackTeori(theoryMode, theoryPreference) {
  if (theoryMode === "none") {
    return "TIADA";
  }

  if (theoryMode === "combined") {
    return "REBT_WDEP";
  }

  if (theoryMode === "wdep") {
    return "WDEP";
  }

  if (theoryMode === "rebt") {
    return "REBT";
  }

  return theoryPreference === "WDEP" ? "WDEP" : "REBT";
}

function normaliseGeneratedSessions(sessions, stablePerkara) {
  const firstPass = sessions.map((session) => normaliseSession(session));
  const perkara = stablePerkara || firstPass[0]?.perkara || "";

  return firstPass.map((session) =>
    normaliseSession(session, {
      perkara: session.sesi > 1 ? perkara : ""
    })
  );
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
        temperature: 0.5,
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

  if (!Array.isArray(parsed.sessions)) {
    throw new Error("Respons model tidak mengandungi medan sessions.");
  }

  return parsed;
}
