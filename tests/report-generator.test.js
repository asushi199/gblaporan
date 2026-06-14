import test from "node:test";
import assert from "node:assert/strict";

import {
  buildFallbackSession,
  buildPromptPayload,
  buildSessionRanges,
  getReportSchema,
  normaliseSession,
  parsePhaseNumbers,
  validatePhaseSelections,
  validateSessionBatch
} from "../src/report-generator.js";
import { generateCounsellingReport } from "../src/gemini-client.js";

function validSession(overrides = {}) {
  return {
    sesi: 1,
    teori: "REBT",
    perkara: "Murid dirujuk kerana bergaduh dengan rakan sekelas.",
    persoalan:
      "Klien masih sukar mentafsir teguran rakan secara rasional sehingga emosinya mudah terganggu.",
    huraian_tindakan_intervensi: [
      "GBK menyambut kehadiran klien dan menerangkan tujuan sesi.",
      "Klien berkongsi situasi awal berkaitan konflik dengan rakan.",
      "GBK menggunakan soalan terbuka untuk memahami perasaan klien.",
      "GBK merumuskan perkongsian awal klien secara ringkas."
    ],
    ...overrides
  };
}

test("buildSessionRanges splits long runs into two-session batches", () => {
  assert.deepEqual(buildSessionRanges(5), [
    { startSession: 1, endSession: 2 },
    { startSession: 3, endSession: 4 },
    { startSession: 5, endSession: 5 }
  ]);
});

test("buildPromptPayload asks for session JSON only and defines Persoalan clearly", () => {
  const payload = buildPromptPayload({
    caseDescription: "Murid sering bertengkar dengan rakan.",
    sessionCount: 3,
    phases: ["fasa2", "fasa3"],
    theoryMode: "auto",
    theoryPreference: "REBT",
    privacyMode: "anonymous",
    currentRange: { startSession: 1, endSession: 2 },
    previousSessions: []
  });

  assert.match(payload.systemInstruction, /valid JSON/i);
  assert.match(payload.systemInstruction, /perkara, persoalan, huraian_tindakan_intervensi/i);
  assert.match(payload.systemInstruction, /Persoalan merujuk kepada isu utama, konflik dasar atau punca/i);
  assert.match(payload.systemInstruction, /HTML, markdown/i);
  assert.match(payload.userPrompt, /"sessions"/i);
  assert.doesNotMatch(payload.userPrompt, /commonFields/i);
});

test("getReportSchema requires the final per-session contract", () => {
  const schema = getReportSchema({ startSession: 1, endSession: 2 });
  const session = schema.properties.sessions.items;

  assert.deepEqual(schema.required, ["sessions"]);
  assert.deepEqual(session.required, [
    "sesi",
    "teori",
    "perkara",
    "persoalan",
    "huraian_tindakan_intervensi"
  ]);
  assert.equal(
    session.properties.huraian_tindakan_intervensi.type,
    "array"
  );
  assert.equal(session.properties.huraian_tindakan_intervensi.minItems, 4);
  assert.equal(session.properties.huraian_tindakan_intervensi.maxItems, 6);
  assert.deepEqual(session.properties.teori.enum, [
    "TIADA",
    "REBT",
    "WDEP",
    "REBT_WDEP"
  ]);
});

test("normaliseSession accepts new JSON keys and keeps huraian as an array", () => {
  const session = normaliseSession(validSession());

  assert.equal(session.sesi, 1);
  assert.equal(session.sessionNumber, 1);
  assert.equal(session.teori, "REBT");
  assert.equal(session.theoryUsed, "REBT");
  assert.equal(session.huraian_tindakan_intervensi.length, 4);
  assert.equal(
    session.huraian_tindakan_intervensi[0],
    "GBK menyambut kehadiran klien dan menerangkan tujuan sesi."
  );
});

test("normaliseSession can use a stable Perkara fallback for later sessions", () => {
  const session = normaliseSession(
    validSession({
      sesi: 2,
      perkara: "Murid hadir semula untuk sesi susulan."
    }),
    {
      perkara: "Murid dirujuk kerana bergaduh dengan rakan sekelas."
    }
  );

  assert.equal(
    session.perkara,
    "Murid dirujuk kerana bergaduh dengan rakan sekelas."
  );
  assert.equal(session.sesi, 2);
});

test("buildFallbackSession returns safe early-phase content", () => {
  const session = buildFallbackSession(1, "TIADA");

  assert.equal(session.sesi, 1);
  assert.equal(session.teori, "TIADA");
  assert.match(session.persoalan, /fasa membina hubungan/i);
  assert.equal(session.huraian_tindakan_intervensi.length, 4);
});

test("buildPromptPayload supports no-theory and combined approach modes", () => {
  const noTheory = buildPromptPayload({
    caseDescription: "Murid dipanggil kerana perubahan tingkah laku.",
    sessionCount: 1,
    phases: ["fasa2"],
    theoryMode: "none",
    theoryPreference: "REBT",
    privacyMode: "anonymous",
    currentRange: { startSession: 1, endSession: 1 },
    previousSessions: []
  });
  const combined = buildPromptPayload({
    caseDescription: "Murid dipanggil kerana perubahan tingkah laku.",
    sessionCount: 1,
    phases: ["fasa4"],
    theoryMode: "combined",
    theoryPreference: "REBT",
    privacyMode: "anonymous",
    currentRange: { startSession: 1, endSession: 1 },
    previousSessions: []
  });

  assert.match(noTheory.systemInstruction, /Tanpa teori khusus/i);
  assert.match(noTheory.systemInstruction, /teori mesti 'TIADA'/i);
  assert.match(combined.systemInstruction, /Gabungkan REBT dan WDEP/i);
  assert.match(combined.systemInstruction, /teori mesti 'REBT_WDEP'/i);
});

test("validatePhaseSelections accepts selected known phases", () => {
  const result = validatePhaseSelections({
    sessionCount: 4,
    phases: ["fasa2", "fasa3"]
  });

  assert.equal(result.ok, true);
});

test("parsePhaseNumbers turns compact numeric input into phase ids", () => {
  assert.deepEqual(parsePhaseNumbers("2, 3,6"), ["fasa2", "fasa3", "fasa6"]);
});

test("validateSessionBatch accepts phase-based and theory-based Persoalan", () => {
  const result = validateSessionBatch({
    requestedRange: { startSession: 1, endSession: 2 },
    theoryMode: "auto",
    sourceCaseDescription: "Murid sering bertengkar dengan rakan.",
    sessions: [
      validSession({
        persoalan:
          "Memandangkan sesi masih berada pada fasa membina hubungan, isu sebenar klien masih belum dapat dikenal pasti sepenuhnya dan perlu diterokai dalam sesi seterusnya."
      }),
      validSession({
        sesi: 2,
        teori: "WDEP",
        persoalan:
          "Klien masih menilai kehendak untuk diterima rakan melalui tingkah laku semasa yang kurang membantu hubungan sosialnya.",
        huraian_tindakan_intervensi: [
          "GBK menyemak semula perkongsian klien daripada sesi sebelumnya.",
          "Klien menerangkan kehendak untuk diterima oleh rakan sekelas.",
          "GBK meneroka tingkah laku semasa klien ketika berhadapan konflik.",
          "GBK membantu klien menilai kesan tingkah laku terhadap hubungan rakan."
        ]
      })
    ]
  });

  assert.equal(result.ok, true);
  assert.equal(result.issues.length, 0);
});

test("validateSessionBatch accepts no-theory and combined approach values", () => {
  const noTheory = validateSessionBatch({
    requestedRange: { startSession: 1, endSession: 1 },
    theoryMode: "none",
    sourceCaseDescription: "Murid dipanggil kerana perubahan tingkah laku.",
    sessions: [
      validSession({
        teori: "TIADA",
        persoalan:
          "Memandangkan sesi masih berada pada fasa membina hubungan, isu sebenar klien masih belum dapat dikenal pasti sepenuhnya dan perlu diterokai dalam sesi seterusnya."
      })
    ]
  });
  const combined = validateSessionBatch({
    requestedRange: { startSession: 1, endSession: 1 },
    theoryMode: "combined",
    sourceCaseDescription: "Murid sering bertengkar dengan rakan.",
    sessions: [
      validSession({
        teori: "REBT_WDEP",
        persoalan:
          "Klien masih mentafsir teguran rakan secara kurang rasional dan perlu menilai tingkah laku semasa yang menjejaskan hubungan sosialnya."
      })
    ]
  });

  assert.equal(noTheory.ok, true);
  assert.equal(combined.ok, true);
});

test("validateSessionBatch rejects repeated Perkara/Persoalan, banned words, HTML and markdown", () => {
  const result = validateSessionBatch({
    requestedRange: { startSession: 1, endSession: 1 },
    theoryMode: "auto",
    sourceCaseDescription: "Guru merujuk murid kerana kerap tidak hadir.",
    sessions: [
      validSession({
        perkara: "Murid dirujuk kerana kerap tidak hadir ke sekolah.",
        persoalan: "Murid dirujuk kerana kerap tidak hadir ke sekolah.",
        huraian_tindakan_intervensi: [
          "GBK membina hubungan dengan klien.",
          "Klien berkongsi bahawa dia malas dan bermasalah hadir ke sekolah.",
          "GBK meneroka keadaan klien. <b>HTML</b>",
          "**GBK merumuskan sesi bersama klien.**"
        ]
      })
    ]
  });

  assert.equal(result.ok, false);
  assert.match(result.issues.join(" "), /Persoalan tidak boleh mengulang Perkara/i);
  assert.match(result.issues.join(" "), /bermasalah/i);
  assert.match(result.issues.join(" "), /HTML/i);
  assert.match(result.issues.join(" "), /markdown/i);
});

test("validateSessionBatch rejects non-array or wrong-sized huraian", () => {
  const result = validateSessionBatch({
    requestedRange: { startSession: 1, endSession: 1 },
    theoryMode: "auto",
    sourceCaseDescription: "Murid dipanggil kerana perubahan tingkah laku.",
    sessions: [
      validSession({
        huraian_tindakan_intervensi:
          "GBK membina hubungan. Klien berkongsi keadaan awal."
      })
    ]
  });

  assert.equal(result.ok, false);
  assert.match(result.issues.join(" "), /array/i);
  assert.match(result.issues.join(" "), /4 hingga 6/i);
});

test("generateCounsellingReport retries once after structural validation failure", async () => {
  const originalFetch = globalThis.fetch;
  const responses = [
    {
      sessions: [
        validSession({
          huraian_tindakan_intervensi: ["GBK membina hubungan dengan klien."]
        })
      ]
    },
    {
      sessions: [validSession()]
    }
  ];
  let callCount = 0;

  globalThis.fetch = async () => {
    const body = responses[callCount++];
    return new Response(
      JSON.stringify({
        candidates: [
          {
            content: {
              parts: [{ text: JSON.stringify(body) }]
            }
          }
        ]
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  };

  try {
    const result = await generateCounsellingReport({
      settings: {
        model: "gemini-2.5-flash",
        apiKey: "test-key"
      },
      payload: {
        caseDescription: "Murid sering bertengkar dengan rakan.",
        sessionCount: 1,
        phases: ["fasa2"],
        theoryMode: "auto",
        theoryPreference: "REBT",
        privacyMode: "anonymous"
      }
    });

    assert.equal(callCount, 2);
    assert.equal(result.quality.ok, true);
    assert.equal(result.sessions[0].sesi, 1);
    assert.equal(result.sessions[0].huraian_tindakan_intervensi.length, 4);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("generateCounsellingReport retries once after invalid JSON", async () => {
  const originalFetch = globalThis.fetch;
  let callCount = 0;

  globalThis.fetch = async () => {
    callCount += 1;
    const text = callCount === 1 ? "{not-json" : JSON.stringify({ sessions: [validSession()] });

    return new Response(
      JSON.stringify({
        candidates: [
          {
            content: {
              parts: [{ text }]
            }
          }
        ]
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  };

  try {
    const result = await generateCounsellingReport({
      settings: {
        model: "gemini-2.5-flash",
        apiKey: "test-key"
      },
      payload: {
        caseDescription: "Murid sering bertengkar dengan rakan.",
        sessionCount: 1,
        phases: ["fasa2"],
        theoryMode: "auto",
        theoryPreference: "REBT",
        privacyMode: "anonymous"
      }
    });

    assert.equal(callCount, 2);
    assert.equal(result.quality.ok, true);
    assert.equal(result.sessions[0].perkara, validSession().perkara);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("generateCounsellingReport does not retry for editable content quality issues", async () => {
  const originalFetch = globalThis.fetch;
  let callCount = 0;

  globalThis.fetch = async () => {
    callCount += 1;
    return new Response(
      JSON.stringify({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    sessions: [
                      validSession({
                        perkara: "Murid dirujuk kerana kerap tidak hadir ke sekolah.",
                        persoalan: "Murid dirujuk kerana kerap tidak hadir ke sekolah."
                      })
                    ]
                  })
                }
              ]
            }
          }
        ]
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  };

  try {
    const result = await generateCounsellingReport({
      settings: {
        model: "gemini-2.5-flash",
        apiKey: "test-key"
      },
      payload: {
        caseDescription: "Guru merujuk murid kerana kerap tidak hadir.",
        sessionCount: 1,
        phases: ["fasa2"],
        theoryMode: "auto",
        theoryPreference: "REBT",
        privacyMode: "anonymous"
      }
    });

    assert.equal(callCount, 1);
    assert.equal(result.quality.ok, false);
    assert.match(result.quality.issues.join(" "), /Persoalan tidak boleh mengulang Perkara/i);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
