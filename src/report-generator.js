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
const SENSITIVE_INFERENCE_WORDS = [
  "seksual",
  "rogol",
  "dicabul",
  "penderaan",
  "hamil",
  "abdomen",
  "sentuhan tidak diingini"
];
const QUESTION_STARTERS = [
  "apakah",
  "bagaimana",
  "adakah",
  "mengapa",
  "kenapa",
  "siapakah",
  "bilakah"
];
const PROCESS_TITLE_WORDS = [
  "sesi kaunseling",
  "penerokaan awal",
  "meneroka isu",
  "isu rujukan",
  "latar belakang klien",
  "membina hubungan",
  "rapport building",
  "intervensi",
  "fasa "
];

export const AVAILABLE_MODELS = [
  "gemini-2.5-flash",
  "gemini-3.1-flash-lite",
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
  commonFields = null,
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
      "Medan theoryUsed mesti tepat sama ada 'REBT' atau 'WDEP' sahaja.",
      "Setiap sesi mesti menunjukkan kesinambungan yang logik daripada sesi sebelumnya.",
      "Jangan cipta diagnosis klinikal, latar belakang keluarga terperinci, atau fakta yang tiada dalam input.",
      "Jangan buat andaian sensitif tentang penderaan, seksualiti, kehamilan, kecederaan fizikal, atau isu perubatan jika perkara itu tidak disebut jelas dalam input.",
      "Perkara ialah tajuk atau rumusan utama perkara yang dibawa ke sesi. Tulis seperti contoh: 'Murid dirujuk kerana datang lewat ke sekolah.', 'Murid datang secara sukarela kerana bergaduh dengan kawannya.', atau 'Klien tidak lulus dalam Saringan Minda Sihat.' Jangan tulis nama proses seperti sesi kaunseling, meneroka isu rujukan, penerokaan awal, fasa, atau latar belakang klien.",
      "Persoalan merujuk kepada punca utama atau konflik dasar yang mengganggu emosi, pemikiran, atau tingkah laku klien.",
      "Persoalan mesti berupa satu kenyataan ringkas, bukan soalan, bukan senarai soalan, bukan teka-teki, dan bukan siasatan baru yang tiada dalam input.",
      "Jangan mulakan persoalan dengan Apakah, Bagaimana, Adakah, Mengapa, atau Kenapa.",
      "Jika isu sebenar belum jelas, persoalan mesti ditulis seperti 'Masih dalam fasa membina hubungan maka konflik sebenar masih perlu diterokai.' atau 'Fasa meneroka masalah masih dijalankan maka punca utama belum dikenal pasti.' Jika isu jelas, tulis satu konflik dasar berdasarkan REBT atau WDEP.",
      "Tindakan/Intervensi tidak perlu dijana.",
      "Huraian tindakan mesti ditulis sebagai 4 hingga 6 point form. Setiap point mesti bermula dengan '- GBK', '- Klien', atau '- Murid'. Jangan tulis perenggan panjang.",
      privacyRule,
      theoryRule
    ].join(" "),
    userPrompt: [
      `Kes murid dalam Bahasa Cina: ${caseDescription}`,
      `Jumlah sesi diminta: ${sessionCount}.`,
      `Fasa yang diliputi oleh keseluruhan set sesi ini: ${describePhases(phases)}.`,
      `Jana laporan untuk Sesi ${currentRange.startSession} hingga ${currentRange.endSession}.`,
      "Agihkan perkembangan sesi secara munasabah berdasarkan fasa yang dipilih. Jangan paksa satu batch kepada satu fasa tertentu kecuali maklumat kes benar-benar menuntut begitu.",
      commonFields
        ? `Gunakan commonFields ini secara tepat untuk semua sesi dalam batch ini: ${JSON.stringify(commonFields)}.`
        : "Jana commonFields.perkara dan commonFields.persoalan berdasarkan keseluruhan kes.",
      "Jana commonFields sekali sahaja untuk keseluruhan set sesi. commonFields.perkara dan commonFields.persoalan akan digunakan semula untuk semua sesi.",
      "Setiap sesi hanya perlu mengandungi sessionNumber, huraianBullets, theoryUsed, continuityNote.",
      "commonFields.perkara mesti merumuskan isu utama atau tujuan rujukan, bukan tajuk proses sesi.",
      "commonFields.persoalan mesti menjadi punca utama atau konflik dasar dalam bentuk ayat penyata.",
      "Contoh perkara yang baik: 'Murid dirujuk kerana guru bimbang tentang perubahan fizikal murid.'",
      "Contoh persoalan yang baik jika belum pasti: 'Masih dalam fasa membina hubungan maka konflik sebenar masih perlu diterokai.'",
      "Contoh persoalan yang baik jika isu jelas: 'Klien berasa tidak selesa apabila isu peribadi diberi perhatian oleh guru dan masih belum dapat menyatakan punca emosi dengan jelas.'",
      "Contoh yang dilarang: 'Meneroka Isu Rujukan dan Membina Hubungan' dan 'Apakah punca kebimbangan guru terhadap klien?'",
      "huraianBullets mesti mengandungi 4 hingga 6 ayat ringkas dan setiap ayat sudah tanpa simbol bullet tambahan.",
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
      commonFields: {
        type: "object",
        properties: {
          perkara: { type: "string" },
          persoalan: { type: "string" }
        },
        required: ["perkara", "persoalan"]
      },
      sessions: {
        type: "array",
        minItems: expectedCount,
        maxItems: expectedCount,
        items: {
          type: "object",
          properties: {
            sessionNumber: { type: "integer" },
            huraianBullets: {
              type: "array",
              minItems: 4,
              maxItems: 6,
              items: { type: "string" }
            },
            theoryUsed: {
              type: "string",
              enum: ["REBT", "WDEP"]
            },
            continuityNote: { type: "string" }
          },
          required: [
            "sessionNumber",
            "huraianBullets",
            "theoryUsed",
            "continuityNote"
          ]
        }
      }
    },
    required: ["commonFields", "sessions"]
  };
}

export function normaliseSession(session, commonFields = {}) {
  const hasBulletArray = Array.isArray(session.huraianBullets);
  const bullets = hasBulletArray
    ? session.huraianBullets
        .map((item) => String(item || "").trim())
        .filter(Boolean)
        .map((item) => (item.startsWith("-") ? item : `- ${item}`))
    : [];

  return {
    sessionNumber: Number(session.sessionNumber),
    perkara: String(session.perkara || commonFields.perkara || "").trim(),
    persoalan: String(session.persoalan || commonFields.persoalan || "").trim(),
    huraianTindakanIntervensi: bullets.join("\n").trim(),
    hasBulletArray,
    theoryUsed: String(session.theoryUsed || "").trim().toUpperCase(),
    continuityNote: String(session.continuityNote || "").trim()
  };
}

export function validateSessionBatch({
  requestedRange,
  theoryMode,
  sessions,
  sourceCaseDescription = ""
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
      session.huraianTindakanIntervensi,
      session.continuityNote
    ].join(" ");

    if (session.sessionNumber !== expectedSessionNumber) {
      issues.push(`${label}: nombor sesi tidak tepat.`);
    }

    if (!session.perkara) {
      issues.push(`${label}: Perkara tidak diisi.`);
    }

    const perkaraLower = session.perkara.toLowerCase();
    const processTitleWord = PROCESS_TITLE_WORDS.find((word) =>
      perkaraLower.includes(word)
    );
    if (processTitleWord) {
      issues.push(
        `${label}: Perkara perlu menjadi tajuk isu utama, bukan proses sesi (${processTitleWord}).`
      );
    }

    if (session.perkara.length > 180) {
      issues.push(`${label}: Perkara terlalu panjang dan perlu diringkaskan.`);
    }

    if (!session.persoalan) {
      issues.push(`${label}: Persoalan tidak diisi.`);
    }

    if (/[?？]/.test(session.persoalan)) {
      issues.push(`${label}: Persoalan mesti ditulis sebagai kenyataan, bukan soalan.`);
    }

    const persoalanLower = session.persoalan.toLowerCase().trim();
    const questionStarter = QUESTION_STARTERS.find((starter) =>
      persoalanLower.startsWith(starter)
    );
    if (questionStarter) {
      issues.push(
        `${label}: Persoalan tidak boleh bermula dengan kata soal '${questionStarter}'.`
      );
    }

    const questionStarterCount = QUESTION_STARTERS.filter((starter) =>
      persoalanLower.includes(starter)
    ).length;
    if (questionStarterCount > 1) {
      issues.push(`${label}: Persoalan tidak boleh menjadi gabungan beberapa soalan.`);
    }

    if (session.persoalan.length > 260) {
      issues.push(`${label}: Persoalan terlalu panjang dan perlu diringkaskan.`);
    }

    if (!session.huraianTindakanIntervensi) {
      issues.push(`${label}: Huraian Tindakan/Intervensi tidak diisi.`);
    }

    if (!session.hasBulletArray) {
      issues.push(
        `${label}: Huraian mesti dijana sebagai bullet array, bukan perenggan biasa.`
      );
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

    const pointStarterLines = pointLines.filter((line) =>
      /^-\s*(GBK|Klien|Murid)\b/i.test(line)
    );
    if (pointStarterLines.length !== pointLines.length) {
      issues.push(
        `${label}: Setiap point huraian mesti bermula dengan GBK, Klien, atau Murid.`
      );
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

    const sensitiveWord = SENSITIVE_INFERENCE_WORDS.find((word) =>
      combinedText.toLowerCase().includes(word.toLowerCase()) &&
      !String(sourceCaseDescription).toLowerCase().includes(word.toLowerCase())
    );
    if (sensitiveWord) {
      issues.push(
        `${label}: mengandungi andaian sensitif yang tiada dalam input asal (${sensitiveWord}).`
      );
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
