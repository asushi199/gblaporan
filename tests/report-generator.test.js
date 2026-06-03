import test from "node:test";
import assert from "node:assert/strict";

import {
  buildSessionRanges,
  buildPromptPayload,
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

test("buildPromptPayload locks the prompt to REBT and WDEP only", () => {
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
  assert.doesNotMatch(payload.systemInstruction, /Gestalt/i);
  assert.match(payload.userPrompt, /Sesi 3 hingga 4/i);
  assert.match(
    payload.userPrompt,
    /Fasa yang diliputi oleh keseluruhan set sesi ini: Fasa 2 - Membina Hubungan, Fasa 3 - Penerokaan Masalah/i
  );
  assert.match(payload.userPrompt, /Agihkan perkembangan sesi secara munasabah/i);
  assert.match(payload.userPrompt, /kesinambungan/i);
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

test("validateSessionBatch accepts well-shaped point-form sessions", () => {
  const result = validateSessionBatch({
    requestedRange: { startSession: 1, endSession: 2 },
    theoryMode: "auto",
    sessions: [
      {
        sessionNumber: 1,
        perkara: "Murid datang secara sukarela kerana sering bergaduh dengan rakan.",
        persoalan: "Fasa membina hubungan dan penerokaan masalah masih dijalankan maka masalah sebenar belum diterokai sepenuhnya.",
        tindakanIntervensi: "Sesi kaunseling individu",
        huraianTindakanIntervensi:
          "- GBK menjemput klien hadir ke sesi.\n- Klien berkongsi situasi konflik yang dialami.\n- GBK menggunakan teknik REBT untuk mengenal pasti pemikiran tidak rasional.\n- Sesi dirumus dan ditangguhkan.",
        theoryUsed: "REBT",
        continuityNote: "Sesi pertama memfokuskan pembinaan hubungan."
      },
      {
        sessionNumber: 2,
        perkara: "Klien hadir semula untuk menyambung perbincangan tentang konflik dengan rakan.",
        persoalan: "Kepercayaan tidak rasional bahawa rakan mesti sentiasa memahami dirinya masih mempengaruhi emosi klien.",
        tindakanIntervensi: "Sesi kaunseling individu",
        huraianTindakanIntervensi:
          "- GBK menyemak perkembangan klien sejak sesi lepas.\n- Klien berkongsi bahawa dia masih mudah marah apabila diejek.\n- GBK menggunakan teknik WDEP untuk menilai tindakan semasa klien.\n- Sesi dirumus dan ditangguhkan.",
        theoryUsed: "WDEP",
        continuityNote: "Sesi ini menyambung isu kemarahan yang dibincang dalam sesi pertama."
      }
    ]
  });

  assert.equal(result.ok, true);
  assert.equal(result.issues.length, 0);
});

test("validateSessionBatch flags unsupported theories and weak formatting", () => {
  const result = validateSessionBatch({
    requestedRange: { startSession: 1, endSession: 1 },
    theoryMode: "auto",
    sessions: [
      {
        sessionNumber: 1,
        perkara: "",
        persoalan: "Klien berasa sedih.",
        tindakanIntervensi: "Sesi kaunseling individu",
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
});
