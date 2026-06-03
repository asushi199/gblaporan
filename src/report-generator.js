const ALLOWED_THEORIES = new Set(["REBT", "WDEP"]);
export const AVAILABLE_PHASES = [
  { value: "fasa1", label: "Fasa 1 - Pra-Sesi" },
  { value: "fasa2", label: "Fasa 2 - Membina Hubungan" },
  { value: "fasa3", label: "Fasa 3 - Penerokaan Masalah" },
  { value: "fasa4", label: "Fasa 4 - Mengenal Pasti Masalah" },
  { value: "fasa5", label: "Fasa 5 - Pemilihan Strategi dan Tindakan" },
  { value: "fasa6", label: "Fasa 6 - Penamatan dan Susulan" }
];
const AVAILABLE_PHASE_VALUES = new Set(
  AVAILABLE_PHASES.map((phase) => phase.value)
);
const BANNED_THEORY_WORDS = [
  "CBT",
  "Gestalt",
  "psikoanalisis",
  "Person-Centered",
  "Solution Focused",
  "Narrative Therapy"
];
const DIAGNOSIS_WORDS = [
  "diagnosis",
  "disahkan",
  "ADHD",
  "autisme",
  "bipolar",
  "skizofrenia",
  "gangguan personaliti"
];

export const AVAILABLE_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-2.5-flash",
  "gemini-3.5-flash"
];

export function buildSessionRanges(sessionCount) {
  const ranges = [];

  for (let start = 1; start <= sessionCount; start += 2) {
    ranges.push({
      startSession: start,
      endSession: Math.min(start + 1, sessionCount)
    });
  }

  return ranges;
}

export function validatePhaseSelections({ sessionCount, phases }) {
  const cleanedPhases = Array.isArray(phases)
    ? phases.map((phase) => String(phase).trim()).filter(Boolean)
    : [];

  if (Number(sessionCount) < 1) {
    return {
      ok: false,
      message: "Bilangan sesi tidak sah."
    };
  }

  if (cleanedPhases.length < 1) {
    return {
      ok: false,
      message: "Pilih sekurang-kurangnya satu fasa."
    };
  }

  const invalidPhase = cleanedPhases.find(
    (phase) => !AVAILABLE_PHASE_VALUES.has(phase)
  );

  if (invalidPhase) {
    return {
      ok: false,
      message: `Fasa '${invalidPhase}' tidak disokong.`
    };
  }

  return {
    ok: true,
    message: ""
  };
}

export function parsePhaseNumbers(input) {
  if (Array.isArray(input)) {
    return input.map((value) => String(value).trim()).filter(Boolean);
  }

  return String(input || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => (value.startsWith("fasa") ? value : `fasa${value}`));
}

export function buildPromptPayload({
  caseDescription,
  sessionCount,
  phases,
  theoryMode,
  theoryPreference,
  privacyMode,
  currentRange,
  previousSessions = []
}) {
  const previousSummary = previousSessions.length
    ? previousSessions
        .map(
          (session) =>
            `Sesi ${session.sessionNumber}: ${session.perkara || ""} ${
              session.persoalan || ""
            }`.trim()
        )
        .join("\n")
    : "Tiada sesi terdahulu.";

  const theoryRule =
    theoryMode === "rebt"
      ? "Gunakan REBT sahaja."
      : theoryMode === "wdep"
        ? "Gunakan Teori Realiti (WDEP) sahaja."
        : `Pilih hanya antara REBT atau Teori Realiti (WDEP). Utamakan ${theoryPreference || "REBT"} jika sesuai.`;

  const privacyRule =
    privacyMode === "named"
      ? "Nama sebenar dibenarkan jika diberi dalam input."
      : "Jangan gunakan nama sebenar murid. Gunakan 'klien' atau 'murid' sahaja.";

  return {
    systemInstruction: [
      "Anda ialah pembantu penulisan laporan kaunseling sekolah.",
      "Tulis dalam Bahasa Melayu rasmi, ringkas, profesional dan gaya point form seperti laporan guru kaunseling sekolah.",
      "Hanya gunakan teknik REBT dan Teori Realiti (WDEP). Jangan gunakan teori lain.",
      "Setiap sesi mesti menunjukkan kesinambungan yang logik daripada sesi sebelumnya.",
      "Jangan cipta diagnosis klinikal, latar belakang keluarga terperinci, atau fakta yang tiada dalam input.",
      "Jika isu sebenar belum jelas, nyatakan bahawa sesi masih dalam fasa membina hubungan atau fasa meneroka masalah.",
      "Huraian tindakan mesti ditulis dalam point form dan kebanyakannya bermula dengan 'GBK' atau 'Klien'.",
      privacyRule,
      theoryRule
    ].join(" "),
    userPrompt: [
      `Kes murid dalam Bahasa Cina: ${caseDescription}`,
      `Jumlah sesi diminta: ${sessionCount}.`,
      `Fasa yang diliputi oleh keseluruhan set sesi ini: ${describePhases(phases)}.`,
      `Jana laporan untuk Sesi ${currentRange.startSession} hingga ${currentRange.endSession}.`,
      "Agihkan perkembangan sesi secara munasabah berdasarkan fasa yang dipilih. Jangan paksa satu batch kepada satu fasa tertentu kecuali maklumat kes benar-benar menuntut begitu.",
      "Setiap sesi mesti mengandungi perkara, persoalan, tindakanIntervensi, huraianTindakanIntervensi, theoryUsed, continuityNote.",
      "Kesinambungan dengan sesi terdahulu mesti jelas dalam continuityNote dan dalam huraian jika sesi bukan sesi pertama.",
      `Ringkasan sesi terdahulu:\n${previousSummary}`
    ].join("\n\n")
  };
}

export function describePhases(phases) {
  return phases
    .map((phase) => AVAILABLE_PHASES.find((item) => item.value === phase)?.label || phase)
    .join(", ");
}

export function getReportSchema(range) {
  const expectedCount = range.endSession - range.startSession + 1;

  return {
    type: "object",
    properties: {
      sessions: {
        type: "array",
        minItems: expectedCount,
        maxItems: expectedCount,
        items: {
          type: "object",
          properties: {
            sessionNumber: { type: "integer" },
            perkara: { type: "string" },
            persoalan: { type: "string" },
            tindakanIntervensi: { type: "string" },
            huraianTindakanIntervensi: { type: "string" },
            theoryUsed: { type: "string" },
            continuityNote: { type: "string" }
          },
          required: [
            "sessionNumber",
            "perkara",
            "persoalan",
            "tindakanIntervensi",
            "huraianTindakanIntervensi",
            "theoryUsed",
            "continuityNote"
          ]
        }
      }
    },
    required: ["sessions"]
  };
}

export function normaliseSession(session) {
  return {
    sessionNumber: Number(session.sessionNumber),
    perkara: String(session.perkara || "").trim(),
    persoalan: String(session.persoalan || "").trim(),
    tindakanIntervensi: String(
      session.tindakanIntervensi || "Sesi kaunseling individu"
    ).trim(),
    huraianTindakanIntervensi: String(
      session.huraianTindakanIntervensi || ""
    ).trim(),
    theoryUsed: String(session.theoryUsed || "").trim().toUpperCase(),
    continuityNote: String(session.continuityNote || "").trim()
  };
}

export function validateSessionBatch({
  requestedRange,
  theoryMode,
  sessions
}) {
  const issues = [];
  const warnings = [];

  if (!Array.isArray(sessions) || sessions.length === 0) {
    return {
      ok: false,
      issues: ["Tiada sesi dijana oleh model."],
      warnings
    };
  }

  const expectedCount = requestedRange.endSession - requestedRange.startSession + 1;

  if (sessions.length !== expectedCount) {
    issues.push(
      `Bilangan sesi tidak sepadan. Dijangka ${expectedCount} tetapi diterima ${sessions.length}.`
    );
  }

  sessions.forEach((rawSession, index) => {
    const session = normaliseSession(rawSession);
    const expectedSessionNumber = requestedRange.startSession + index;
    const label = `Sesi ${expectedSessionNumber}`;
    const combinedText = [
      session.perkara,
      session.persoalan,
      session.tindakanIntervensi,
      session.huraianTindakanIntervensi,
      session.continuityNote
    ].join(" ");

    if (session.sessionNumber !== expectedSessionNumber) {
      issues.push(`${label}: nombor sesi tidak tepat.`);
    }

    if (!session.perkara) {
      issues.push(`${label}: Perkara tidak diisi.`);
    }

    if (!session.persoalan) {
      issues.push(`${label}: Persoalan tidak diisi.`);
    }

    if (!session.tindakanIntervensi) {
      issues.push(`${label}: Tindakan/Intervensi tidak diisi.`);
    }

    if (!session.huraianTindakanIntervensi) {
      issues.push(`${label}: Huraian Tindakan/Intervensi tidak diisi.`);
    }

    if (!ALLOWED_THEORIES.has(session.theoryUsed)) {
      issues.push(
        `${label}: theoryUsed mesti REBT atau WDEP, tetapi diterima '${session.theoryUsed || "kosong"}'.`
      );
    }

    if (theoryMode === "rebt" && session.theoryUsed !== "REBT") {
      issues.push(`${label}: teori selain REBT telah digunakan.`);
    }

    if (theoryMode === "wdep" && session.theoryUsed !== "WDEP") {
      issues.push(`${label}: teori selain WDEP telah digunakan.`);
    }

    const pointLines = session.huraianTindakanIntervensi
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    const pointLikeLines = pointLines.filter((line) => /^[-*]/.test(line));

    if (pointLines.length < 3 || pointLikeLines.length !== pointLines.length) {
      issues.push(`${label}: Huraian perlu ditulis sepenuhnya dalam point form.`);
    }

    if (expectedSessionNumber > 1 && !session.continuityNote) {
      issues.push(`${label}: continuityNote perlu diisi untuk kesinambungan sesi.`);
    }

    if (
      expectedSessionNumber > 1 &&
      session.continuityNote &&
      !/sesi|minggu lepas|perkembangan/i.test(session.continuityNote)
    ) {
      warnings.push(
        `${label}: continuityNote ada tetapi kesinambungan tidak begitu jelas.`
      );
    }

    const bannedTheory = BANNED_THEORY_WORDS.find((word) =>
      combinedText.toLowerCase().includes(word.toLowerCase())
    );

    if (bannedTheory) {
      issues.push(`${label}: mengandungi teori yang tidak dibenarkan (${bannedTheory}).`);
    }

    const diagnosisWord = DIAGNOSIS_WORDS.find((word) =>
      combinedText.toLowerCase().includes(word.toLowerCase())
    );

    if (diagnosisWord) {
      warnings.push(
        `${label}: semak semula frasa berkaitan diagnosis atau label klinikal (${diagnosisWord}).`
      );
    }

    if (!/(GBK|Klien|Murid)/i.test(session.huraianTindakanIntervensi)) {
      warnings.push(`${label}: gaya ayat mungkin kurang menyerupai contoh guru.`);
    }
  });

  return {
    ok: issues.length === 0,
    issues,
    warnings
  };
}

export function buildQualityAdvice(validation) {
  if (validation.ok && validation.warnings.length === 0) {
    return "Laporan nampak lengkap untuk disemak akhir oleh guru.";
  }

  if (!validation.ok) {
    return "Cadangan: jana semula atau tukar model sebelum digunakan.";
  }

  return "Cadangan: semak manual bahagian yang diberi amaran sebelum digunakan.";
}
