import test from "node:test";
import assert from "node:assert/strict";

import {
  buildSessionRanges,
  buildPromptPayload,
  getReportSchema,
  normaliseSession,
  parsePhaseNumbers,
  validatePhaseSelections,
  validateSessionBatch
} from "../src/report-generator.js";

test("buildSessionRanges splits long runs into two-session batches", () => {
  assert.deepEqual(buildSessionRanges(8), [
    { startSession: 1, endSession: 2 },
    { startSession: 3, endSession: 4 },
    { startSession: 5, endSession: 6 },
    { startSession: 7, endSession: 8 }
  ]);
});

test("buildSessionRanges keeps shorter requests compact", () => {
  assert.deepEqual(buildSessionRanges(5), [
    { startSession: 1, endSession: 2 },
    { startSession: 3, endSession: 4 },
    { startSession: 5, endSession: 5 }
  ]);
});

test("buildPromptPayload locks the prompt to REBT/WDEP and omits tindakan/intervensi", () => {
  const payload = buildPromptPayload({
    caseDescription: "学生因为和同学争吵而不想来学校。",
    sessionCount: 4,
    phases: ["fasa2", "fasa3"],
    theoryMode: "auto",
    theoryPreference: "REBT",
    privacyMode: "anonymous",
    currentRange: { startSession: 3, endSession: 4 },
    previousSessions: [
      {
        sessionNumber: 1,
        perkara: "Klien datang secara sukarela kerana kerap marah di dalam kelas."
      }
    ]
  });

  assert.match(payload.systemInstruction, /REBT/i);
  assert.match(payload.systemInstruction, /WDEP/i);
  assert.match(
    payload.systemInstruction,
    /Persoalan merujuk kepada punca utama atau konflik dasar/i
  );
  assert.match(
    payload.systemInstruction,
    /Perkara ialah tajuk atau rumusan utama perkara/i
  );
  assert.match(
    payload.systemInstruction,
    /Tindakan\/Intervensi tidak perlu dijana/i
  );
  assert.doesNotMatch(payload.systemInstruction, /Gestalt/i);
  assert.match(payload.userPrompt, /Sesi 3 hingga 4/i);
  assert.match(
    payload.userPrompt,
    /Fasa yang diliputi oleh keseluruhan set sesi ini: Fasa 2 - Membina Hubungan, Fasa 3 - Penerokaan Masalah/i
  );
  assert.doesNotMatch(payload.userPrompt, /tindakanIntervensi/i);
});

test("buildPromptPayload reuses common fields for later batches", () => {
  const payload = buildPromptPayload({
    caseDescription: "Murid dirujuk kerana guru bimbang tentang perubahan emosi murid.",
    sessionCount: 3,
    phases: ["fasa2", "fasa3"],
    theoryMode: "auto",
    theoryPreference: "REBT",
    privacyMode: "anonymous",
    currentRange: { startSession: 3, endSession: 3 },
    commonFields: {
      perkara: "Murid dirujuk kerana guru bimbang tentang perubahan emosi murid.",
      persoalan:
        "Masih dalam fasa membina hubungan maka konflik sebenar masih perlu diterokai."
    },
    previousSessions: []
  });

  assert.match(payload.userPrompt, /Gunakan commonFields ini secara tepat/i);
});

test("getReportSchema requires commonFields and per-session huraian only", () => {
  const schema = getReportSchema({ startSession: 1, endSession: 2 });
  const sessionRequired = schema.properties.sessions.items.required;

  assert.deepEqual(schema.required, ["commonFields", "sessions"]);
  assert.deepEqual(schema.properties.commonFields.required, ["perkara", "persoalan"]);
  assert.equal(sessionRequired.includes("perkara"), false);
  assert.equal(sessionRequired.includes("persoalan"), false);
  assert.equal(sessionRequired.includes("huraianBullets"), true);
});

test("normaliseSession applies shared common fields to each session", () => {
  const session = normaliseSession(
    {
      sessionNumber: 1,
      huraianBullets: [
        "GBK menjemput klien hadir ke sesi.",
        "Klien berkongsi isu yang dialami.",
        "GBK membina hubungan dengan klien.",
        "GBK merumuskan sesi."
      ],
      theoryUsed: "REBT",
      continuityNote: "Sesi pertama memfokuskan pembinaan hubungan."
    },
    {
      perkara: "Murid dirujuk kerana guru bimbang tentang perubahan emosi murid.",
      persoalan:
        "Masih dalam fasa membina hubungan maka konflik sebenar masih perlu diterokai."
    }
  );

  assert.match(session.perkara, /Murid dirujuk/);
  assert.match(session.persoalan, /konflik sebenar/);
});

test("validatePhaseSelections requires at least one selected phase", () => {
  const result = validatePhaseSelections({
    sessionCount: 4,
    phases: []
  });

  assert.equal(result.ok, false);
  assert.match(result.message, /Pilih sekurang-kurangnya satu fasa/i);
});

test("validatePhaseSelections accepts multiple phases for the same generated set", () => {
  const result = validatePhaseSelections({
    sessionCount: 5,
    phases: ["fasa2", "fasa3"]
  });

  assert.equal(result.ok, true);
});

test("parsePhaseNumbers turns compact numeric input into phase ids", () => {
  assert.deepEqual(parsePhaseNumbers("2, 3,6"), ["fasa2", "fasa3", "fasa6"]);
});

test("validateSessionBatch accepts phase-based and theory-based persoalan", () => {
  const result = validateSessionBatch({
    requestedRange: { startSession: 1, endSession: 2 },
    theoryMode: "auto",
    sourceCaseDescription: "学生因为经常跟同学起冲突而来见辅导老师。",
    sessions: [
      {
        sessionNumber: 1,
        perkara: "Murid datang secara sukarela kerana sering bergaduh dengan rakan.",
        persoalan:
          "Masih dalam fasa membina hubungan maka masalah sebenar masih perlu diterokai.",
        huraianBullets: [
          "GBK menjemput klien hadir ke sesi.",
          "Klien berkongsi situasi konflik yang dialami.",
          "GBK membina hubungan dan memberi ruang kepada klien untuk bercerita.",
          "GBK merumuskan sesi dan menangguhkan pertemuan."
        ],
        theoryUsed: "REBT",
        continuityNote: "Sesi pertama memfokuskan pembinaan hubungan."
      },
      {
        sessionNumber: 2,
        perkara: "Klien hadir semula untuk menyambung perbincangan tentang konflik dengan rakan.",
        persoalan:
          "Kepercayaan tidak rasional bahawa rakan mesti sentiasa memahami dirinya masih mempengaruhi emosi klien.",
        huraianBullets: [
          "GBK menyemak perkembangan klien sejak sesi lepas.",
          "Klien berkongsi bahawa dia masih mudah marah apabila diejek.",
          "GBK menggunakan teknik WDEP untuk menilai tindakan semasa klien.",
          "GBK merumuskan sesi dan menangguhkan pertemuan."
        ],
        theoryUsed: "WDEP",
        continuityNote:
          "Sesi ini menyambung isu kemarahan yang dibincang dalam sesi pertama."
      }
    ]
  });

  assert.equal(result.ok, true);
  assert.equal(result.issues.length, 0);
});

test("validateSessionBatch flags unsupported theories and weak persoalan", () => {
  const result = validateSessionBatch({
    requestedRange: { startSession: 1, endSession: 1 },
    theoryMode: "auto",
    sourceCaseDescription: "学生感到伤心，不想来学校。",
    sessions: [
      {
        sessionNumber: 1,
        perkara: "",
        persoalan: "Adakah klien didera secara seksual?",
        huraianTindakanIntervensi: "GBK bercakap dengan klien.",
        theoryUsed: "CBT",
        continuityNote: ""
      }
    ]
  });

  assert.equal(result.ok, false);
  assert.match(result.issues.join(" "), /Perkara/i);
  assert.match(result.issues.join(" "), /CBT/i);
  assert.match(result.issues.join(" "), /point form/i);
  assert.match(result.issues.join(" "), /bukan soalan/i);
  assert.match(result.issues.join(" "), /andaian sensitif/i);
});

test("validateSessionBatch rejects process-like perkara and question-list persoalan", () => {
  const result = validateSessionBatch({
    requestedRange: { startSession: 1, endSession: 1 },
    theoryMode: "auto",
    sourceCaseDescription: "Guru merujuk murid kerana kerap bergaduh dengan rakan.",
    sessions: [
      {
        sessionNumber: 1,
        perkara:
          "Sesi Kaunseling Individu: Penerokaan Awal Isu Rujukan dan Latar Belakang Klien",
        persoalan:
          "Apakah punca rujukan klien? Bagaimana situasi keluarga klien? Adakah klien memahami isu ini?",
        huraianBullets: [
          "GBK menjemput klien hadir ke sesi.",
          "Klien berkongsi situasi yang berlaku.",
          "GBK meneroka maklumat awal berkaitan isu rujukan.",
          "GBK merumuskan sesi dan menangguhkan pertemuan."
        ],
        theoryUsed: "REBT",
        continuityNote: "Sesi pertama memfokuskan pembinaan hubungan."
      }
    ]
  });

  assert.equal(result.ok, false);
  assert.match(result.issues.join(" "), /Perkara perlu menjadi tajuk isu utama/i);
  assert.match(result.issues.join(" "), /kata soal 'apakah'/i);
  assert.match(result.issues.join(" "), /gabungan beberapa soalan/i);
});

test("validateSessionBatch rejects vague process summaries and direct question persoalan", () => {
  const result = validateSessionBatch({
    requestedRange: { startSession: 1, endSession: 1 },
    theoryMode: "auto",
    sourceCaseDescription: "Guru merujuk murid kerana bimbang dengan perubahan fizikal murid.",
    sessions: [
      {
        sessionNumber: 1,
        perkara: "Meneroka Isu Rujukan dan Membina Hubungan",
        persoalan:
          "Apakah punca kebimbangan guru terhadap klien, dan bagaimana klien memahami situasi yang berlaku?",
        huraianBullets: [
          "GBK menjemput klien hadir ke sesi.",
          "Klien berkongsi keadaan yang dialami.",
          "GBK membina hubungan dengan klien.",
          "GBK merumuskan sesi dan menangguhkan pertemuan."
        ],
        theoryUsed: "REBT",
        continuityNote: "Sesi pertama memfokuskan pembinaan hubungan."
      }
    ]
  });

  assert.equal(result.ok, false);
  assert.match(result.issues.join(" "), /Perkara perlu menjadi tajuk isu utama/i);
  assert.match(result.issues.join(" "), /kata soal 'apakah'/i);
});

test("validateSessionBatch rejects sessions without bullet arrays", () => {
  const result = validateSessionBatch({
    requestedRange: { startSession: 1, endSession: 1 },
    theoryMode: "auto",
    sourceCaseDescription: "学生因为和同学冲突而来辅导。",
    sessions: [
      {
        sessionNumber: 1,
        perkara: "Murid hadir ke sesi secara sukarela.",
        persoalan:
          "Masih dalam fasa membina hubungan maka masalah sebenar masih perlu diterokai.",
        huraianTindakanIntervensi:
          "GBK membina hubungan dengan klien. Klien berkongsi situasi yang dialami.",
        theoryUsed: "REBT",
        continuityNote: "Sesi pertama memfokuskan pembinaan hubungan."
      }
    ]
  });

  assert.equal(result.ok, false);
  assert.match(result.issues.join(" "), /bullet array/i);
});
