const APPROACH_VALUES = ["TIADA", "REBT", "WDEP", "REBT_WDEP"];
const ALLOWED_APPROACHES = new Set(APPROACH_VALUES);
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
const PHASE_ORDER = AVAILABLE_PHASES.map((phase) => phase.value);
const PHASE_WRITING_RULES = {
  fasa1:
    "Fasa Pra-Sesi hanya tulis persediaan sebelum sesi, sumber rujukan dan tujuan pemanggilan tanpa terus menganalisis punca.",
  fasa2:
    "Fasa Membina Hubungan hanya tulis bina hubungan, tujuan sesi, keselesaan klien dan perkongsian awal, dan jangan terus menulis penyelesaian.",
  fasa3:
    "Fasa Penerokaan Masalah tulis soalan terbuka serta penerokaan perasaan, pemikiran dan situasi.",
  fasa4:
    "Fasa Mengenal Pasti Masalah tulis masalah utama, kesan tingkah laku serta kaitan pemikiran, perasaan dan tingkah laku.",
  fasa5:
    "Fasa Pemilihan Strategi dan Tindakan tulis strategi, pilihan tindakan, latihan dan komitmen.",
  fasa6: "Fasa Penamatan dan Susulan tulis rumusan, penamatan dan susulan."
};
const PHASE_FALLBACK_CONTENT = {
  fasa1: {
    persoalan:
      "Sesi ini merupakan persediaan pra-sesi, maka isu sebenar klien belum diterokai dan akan dikenal pasti dalam sesi berikutnya.",
    huraian: [
      "GBK menyemak maklumat rujukan dan menyediakan persediaan sebelum sesi.",
      "GBK menetapkan tujuan pemanggilan klien secara ringkas dan neutral.",
      "GBK merancang pendekatan awal yang sesuai dengan keperluan klien.",
      "GBK bersedia untuk memulakan sesi pada pertemuan seterusnya."
    ]
  },
  fasa2: {
    persoalan:
      "Memandangkan sesi masih berada pada fasa membina hubungan, isu sebenar klien masih belum dapat dikenal pasti sepenuhnya dan perlu diterokai dalam sesi seterusnya.",
    huraian: [
      "GBK menyambut kehadiran klien dengan mesra dan membina hubungan awal.",
      "GBK menerangkan tujuan sesi supaya klien berasa lebih selesa.",
      "Klien diberi ruang untuk berkongsi perkara awal mengikut kesediaannya.",
      "GBK merumuskan perkongsian awal dan memaklumkan sesi akan diteruskan."
    ]
  },
  fasa3: {
    persoalan:
      "Isu klien sedang diterokai melalui soalan terbuka serta perkongsian perasaan, pemikiran dan situasi semasa.",
    huraian: [
      "GBK menggunakan soalan terbuka untuk meneroka situasi klien.",
      "GBK meneroka perasaan dan pemikiran klien berkaitan isu yang dikongsi.",
      "Klien berkongsi pengalaman dan situasi yang dialaminya.",
      "GBK merumuskan penerokaan awal dan meneruskan sesi seterusnya."
    ]
  },
  fasa4: {
    persoalan:
      "Masalah utama klien mula dikenal pasti berserta kesannya terhadap emosi, pemikiran dan tingkah laku.",
    huraian: [
      "GBK membantu klien mengenal pasti masalah utama yang dihadapi.",
      "GBK meneroka kesan masalah terhadap emosi dan tingkah laku klien.",
      "Klien mengaitkan pemikiran, perasaan dan tingkah lakunya dengan situasi.",
      "GBK merumuskan masalah utama sebagai fokus sesi berikutnya."
    ]
  },
  fasa5: {
    persoalan:
      "Klien meneliti strategi dan pilihan tindakan yang boleh diambil untuk menangani masalah yang telah dikenal pasti.",
    huraian: [
      "GBK membincangkan pilihan strategi bersama klien.",
      "GBK membimbing klien memilih tindakan yang sesuai dan boleh dilaksanakan.",
      "Klien menyatakan komitmen terhadap tindakan yang dipersetujui.",
      "GBK merumuskan pelan tindakan dan menetapkan langkah seterusnya."
    ]
  },
  fasa6: {
    persoalan:
      "Sesi menuju penamatan dengan rumusan kemajuan klien serta perancangan susulan yang bersesuaian.",
    huraian: [
      "GBK merumuskan kemajuan dan perubahan yang ditunjukkan klien.",
      "GBK bersama klien menilai pencapaian matlamat sesi.",
      "Klien menyatakan kesediaan untuk meneruskan tindakan secara sendiri.",
      "GBK menetapkan pelan susulan dan menamatkan sesi dengan sokongan."
    ]
  }
};

export function orderSelectedPhases(phases) {
  const selected = new Set(
    (Array.isArray(phases) ? phases : [])
      .map((phase) => String(phase).trim())
      .filter(Boolean)
  );
  return PHASE_ORDER.filter((value) => selected.has(value));
}

export function assignPhasesToSessions(sessionCount, phases) {
  const ordered = orderSelectedPhases(phases);
  const total = Math.max(1, Number(sessionCount) || 1);
  const assignments = [];

  for (let index = 0; index < total; index += 1) {
    const phaseIndex = ordered.length
      ? Math.min(ordered.length - 1, Math.floor((index * ordered.length) / total))
      : 0;
    assignments.push(ordered[phaseIndex] || null);
  }

  return assignments;
}

function phaseLabel(value) {
  return AVAILABLE_PHASES.find((item) => item.value === value)?.label || value;
}
const BANNED_THEORY_WORDS = [
  "CBT",
  "Gestalt",
  "psikoanalisis",
  "Person-Centered",
  "Solution Focused",
  "Narrative Therapy"
];
const BANNED_WORDS = [
  "nakal",
  "degil",
  "ganas",
  "bermasalah",
  "malas",
  "ADHD",
  "anxiety",
  "depression",
  "trauma",
  "hyperaktif"
];
const DIAGNOSIS_WORDS = [
  "diagnosis",
  "disahkan",
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
  stablePerkara = "",
  previousSessions = [],
  retryIssues = []
}) {
  const previousSummary = previousSessions.length
    ? previousSessions
        .map(
          (session) =>
            `Sesi ${session.sesi}: ${session.perkara || ""} ${
              session.persoalan || ""
            }`.trim()
        )
        .join("\n")
    : "Tiada sesi terdahulu.";

  const retryAdvice = retryIssues.length
    ? `Betulkan isu semakan ini dan jana semula JSON sahaja: ${retryIssues.join(" ")}`
    : "Tiada isu semakan terdahulu.";

  const theoryRule = buildTheoryRule(theoryMode, theoryPreference);

  const privacyRule =
    privacyMode === "named"
      ? "Nama sebenar dibenarkan jika diberi dalam input."
      : "Jangan gunakan nama sebenar murid. Gunakan 'klien' atau 'murid' sahaja.";

  const orderedPhases = orderSelectedPhases(phases);
  const sessionPhaseMap = assignPhasesToSessions(sessionCount, phases);
  const allowedPhaseLabels = orderedPhases.map(phaseLabel).join("; ");
  const rapportSelected = orderedPhases.includes("fasa2");

  const phaseWritingRules = orderedPhases
    .map((phase) => PHASE_WRITING_RULES[phase])
    .filter(Boolean);

  const rapportPlaceholderRule = rapportSelected
    ? [
        "Jika sesi masih pada Fasa Membina Hubungan atau isu belum diterokai dengan mendalam, Persoalan boleh ditulis: 'Memandangkan sesi masih berada pada fasa membina hubungan, isu sebenar klien masih belum dapat dikenal pasti sepenuhnya dan perlu diterokai dalam sesi seterusnya.'"
      ]
    : [
        "Fasa Membina Hubungan tidak dipilih, jadi jangan tulis ayat membina hubungan awal dan jangan gunakan ayat penanda 'masih berada pada fasa membina hubungan'."
      ];

  const batchPhaseLines = [];
  for (
    let sesi = currentRange.startSession;
    sesi <= currentRange.endSession;
    sesi += 1
  ) {
    const phaseValue = sessionPhaseMap[sesi - 1] || orderedPhases[0];
    batchPhaseLines.push(`Sesi ${sesi} = ${phaseLabel(phaseValue)}`);
  }

  return {
    systemInstruction: [
      "Anda ialah pembantu penulisan laporan kaunseling sekolah rendah.",
      "Tugas anda hanya menghasilkan valid JSON untuk medan perkara, persoalan, huraian_tindakan_intervensi dan teori bagi setiap sesi.",
      "Jangan hasilkan laporan penuh, HTML, markdown, jadual, ulasan tambahan, atau teks di luar JSON.",
      "Setiap sesi mesti mengandungi sesi, teori, perkara, persoalan, huraian_tindakan_intervensi.",
      "Medan teori ialah penanda pendekatan dalaman sahaja dan tidak dipaparkan kepada guru.",
      "Nilai teori mesti tepat sama ada 'TIADA', 'REBT', 'WDEP', atau 'REBT_WDEP' sahaja.",
      "Jika pendekatan tanpa teori khusus dipilih, jangan masukkan istilah teori dalam kandungan laporan.",
      "Jika pendekatan teori dipilih, hanya gunakan REBT atau Teori Realiti (WDEP). Jangan gunakan teori lain.",
      "Perkara hanya menulis sebab murid dirujuk atau dipanggil. Ia mesti pendek, neutral, tidak menganalisis punca, tidak menyebut teori, dan tidak menjadi tajuk proses sesi.",
      "Untuk beberapa sesi, Perkara mesti kekal stabil sebagai sebab asal rujukan atau panggilan kecuali input guru menyatakan sebab rujukan berubah dengan jelas.",
      "Persoalan merujuk kepada isu utama, konflik dasar atau punca yang mengganggu emosi, pemikiran atau tingkah laku klien. Ia adalah teras permasalahan yang dikenal pasti oleh kaunselor untuk diterokai atau diselesaikan bersama klien sepanjang sesi.",
      "Persoalan bukan ulangan Perkara, bukan soalan, bukan senarai soalan, bukan tuduhan, dan bukan label terhadap murid.",
      "Jika maklumat cukup jelas, tulis Persoalan sebagai core issue, konflik dasar atau sebab yang mempengaruhi emosi, pemikiran atau tingkah laku klien.",
      ...rapportPlaceholderRule,
      "Jika memilih REBT dan maklumat cukup, tulis dari sudut pemikiran tidak rasional, kepercayaan kurang rasional atau cara klien mentafsir situasi tanpa gaya buku teks.",
      "Jika memilih WDEP, tulis dari sudut kehendak, tingkah laku semasa, penilaian kendiri dan perancangan tindakan.",
      "Jangan cipta diagnosis klinikal, latar belakang keluarga terperinci, atau fakta yang tiada dalam input.",
      "Jangan buat andaian sensitif tentang penderaan, seksualiti, kehamilan, kecederaan fizikal, atau isu perubatan jika perkara itu tidak disebut jelas dalam input.",
      "Jangan gunakan perkataan nakal, degil, ganas, bermasalah, malas, ADHD, anxiety, depression, trauma, atau hyperaktif.",
      "Huraian Tindakan / Intervensi mesti menjadi array dengan 4 hingga 6 ayat ringkas.",
      "Setiap item huraian_tindakan_intervensi mesti bermula dengan 'GBK' atau 'Klien'.",
      "Tulis kandungan setiap sesi mengikut fasa yang ditetapkan untuk sesi itu sahaja, dan jangan meloncat ke fasa lain.",
      ...phaseWritingRules,
      "Gaya mesti neutral, rasmi, ringkas dan sesuai untuk laporan kaunseling sekolah rendah.",
      privacyRule,
      theoryRule
    ].join(" "),
    userPrompt: [
      `Kes murid dalam Bahasa Cina atau nota guru: ${caseDescription}`,
      `Jumlah sesi diminta: ${sessionCount}.`,
      `Guru hanya memilih fasa berikut untuk laporan ini: ${allowedPhaseLabels}. Jangan tulis kandungan bagi fasa lain, terutama fasa lebih awal yang tidak dipilih.`,
      `Setiap sesi dalam batch ini mesti ditulis TEPAT pada fasa yang ditetapkan: ${batchPhaseLines.join("; ")}.`,
      `Jana JSON untuk Sesi ${currentRange.startSession} hingga ${currentRange.endSession}.`,
      stablePerkara
        ? `Gunakan Perkara asal ini untuk sesi dalam batch ini kecuali input jelas memerlukan perubahan: ${stablePerkara}.`
        : "Tentukan Perkara asal sebagai sebab ringkas murid dirujuk atau dipanggil.",
      "Persoalan boleh berkembang mengikut fasa yang ditetapkan untuk setiap sesi, tetapi mesti kekal dalam fasa yang dipilih guru dan berdasarkan maklumat guru serta sesi terdahulu.",
      `Ringkasan sesi terdahulu:\n${previousSummary}`,
      `Semakan terdahulu:\n${retryAdvice}`,
      "Output mesti valid JSON tanpa HTML atau markdown.",
      'Format wajib: {"sessions":[{"sesi":1,"teori":"TIADA","perkara":"","persoalan":"","huraian_tindakan_intervensi":["GBK...","Klien...","GBK...","GBK..."]}]}'
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
            sesi: { type: "integer" },
            teori: {
              type: "string",
              enum: APPROACH_VALUES
            },
            perkara: { type: "string" },
            persoalan: { type: "string" },
            huraian_tindakan_intervensi: {
              type: "array",
              minItems: 4,
              maxItems: 6,
              items: { type: "string" }
            }
          },
          required: [
            "sesi",
            "teori",
            "perkara",
            "persoalan",
            "huraian_tindakan_intervensi"
          ]
        }
      }
    },
    required: ["sessions"]
  };
}

export function normaliseSession(session, stableFields = {}) {
  const huraianArray = Array.isArray(session.huraian_tindakan_intervensi)
    ? session.huraian_tindakan_intervensi
    : Array.isArray(session.huraianBullets)
      ? session.huraianBullets
      : null;
  const huraian = huraianArray
    ? huraianArray.map((item) => String(item || "").trim()).filter(Boolean)
    : coercePointFormLines(
        session.huraianTindakanIntervensi || session.huraian || ""
      );
  const sesi = Number(session.sesi || session.sessionNumber);
  const teori = String(session.teori || session.theoryUsed || "")
    .trim()
    .toUpperCase();

  return {
    sesi,
    sessionNumber: sesi,
    teori,
    theoryUsed: teori,
    perkara: String(stableFields.perkara || session.perkara || "").trim(),
    persoalan: String(session.persoalan || "").trim(),
    huraian_tindakan_intervensi: huraian,
    huraianTindakanIntervensi: huraian.join("\n").trim(),
    hasHuraianArray: Boolean(huraianArray),
    hasBulletArray: Boolean(huraianArray),
    continuityNote: String(session.continuityNote || "").trim()
  };
}

export function buildFallbackSession(
  sesi,
  teori = "REBT",
  stablePerkara = "",
  phase = "fasa2"
) {
  const content = PHASE_FALLBACK_CONTENT[phase] || PHASE_FALLBACK_CONTENT.fasa2;

  return {
    sesi,
    teori: ALLOWED_APPROACHES.has(teori) ? teori : "TIADA",
    perkara: stablePerkara || "Murid hadir berkaitan isu yang dikongsikan.",
    persoalan: content.persoalan,
    huraian_tindakan_intervensi: [...content.huraian]
  };
}

function coercePointFormLines(value) {
  const text = String(value || "")
    .replace(/\s*-\s+(?=(GBK|Klien)\b)/gi, "\n")
    .replace(/\.\s*(?=(GBK|Klien)\b)/g, ".\n");

  return text
    .split("\n")
    .map((line) => line.trim().replace(/^[-*]\s*/, ""))
    .filter(Boolean);
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
      session.huraian_tindakan_intervensi.join(" ")
    ].join(" ");

    if (session.sesi !== expectedSessionNumber) {
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
        `${label}: Perkara perlu menjadi sebab rujukan ringkas, bukan proses sesi (${processTitleWord}).`
      );
    }

    if (session.perkara.length > 160) {
      issues.push(`${label}: Perkara terlalu panjang dan perlu diringkaskan.`);
    }

    if (!session.persoalan) {
      issues.push(`${label}: Persoalan tidak diisi.`);
    }

    if (/[?锛焆]/.test(session.persoalan)) {
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

    if (normaliseComparableText(session.persoalan) === normaliseComparableText(session.perkara)) {
      issues.push(`${label}: Persoalan tidak boleh mengulang Perkara.`);
    }

    if (session.persoalan.length > 320) {
      issues.push(`${label}: Persoalan terlalu panjang dan perlu diringkaskan.`);
    }

    if (!session.hasHuraianArray) {
      issues.push(`${label}: huraian_tindakan_intervensi mesti dijana sebagai array.`);
    }

    const huraianCount = session.huraian_tindakan_intervensi.length;
    if (huraianCount < 4 || huraianCount > 6) {
      issues.push(
        `${label}: huraian_tindakan_intervensi mesti mempunyai 4 hingga 6 item.`
      );
    }

    const invalidStarter = session.huraian_tindakan_intervensi.find(
      (line) => !/^(GBK|Klien)\b/i.test(line)
    );
    if (invalidStarter) {
      issues.push(
        `${label}: Setiap huraian mesti bermula dengan GBK atau Klien.`
      );
    }

    if (!ALLOWED_APPROACHES.has(session.teori)) {
      issues.push(
        `${label}: teori mesti TIADA, REBT, WDEP atau REBT_WDEP, tetapi diterima '${session.teori || "kosong"}'.`
      );
    }

    if (theoryMode === "rebt" && session.teori !== "REBT") {
      issues.push(`${label}: teori selain REBT telah digunakan.`);
    }

    if (theoryMode === "wdep" && session.teori !== "WDEP") {
      issues.push(`${label}: teori selain WDEP telah digunakan.`);
    }

    if (normaliseTheoryMode(theoryMode) === "none" && session.teori !== "TIADA") {
      issues.push(`${label}: pendekatan tanpa teori khusus mesti menggunakan teori TIADA.`);
    }

    if (theoryMode === "combined" && session.teori !== "REBT_WDEP") {
      issues.push(`${label}: pendekatan gabungan mesti menggunakan teori REBT_WDEP.`);
    }

    const bannedTheory = BANNED_THEORY_WORDS.find((word) =>
      combinedText.toLowerCase().includes(word.toLowerCase())
    );
    if (bannedTheory) {
      issues.push(`${label}: mengandungi teori yang tidak dibenarkan (${bannedTheory}).`);
    }

    const bannedWord = BANNED_WORDS.find((word) =>
      combinedText.toLowerCase().includes(word.toLowerCase())
    );
    if (bannedWord) {
      issues.push(`${label}: mengandungi perkataan yang tidak dibenarkan (${bannedWord}).`);
    }

    if (/<\/?[a-z][\s\S]*>/i.test(combinedText)) {
      issues.push(`${label}: tidak boleh mengandungi HTML.`);
    }

    if (/(^|\s)(#{1,6}\s|\*\*|__|```|\|)/m.test(combinedText)) {
      issues.push(`${label}: tidak boleh mengandungi markdown.`);
    }

    const diagnosisWord = DIAGNOSIS_WORDS.find((word) =>
      combinedText.toLowerCase().includes(word.toLowerCase())
    );
    if (diagnosisWord) {
      warnings.push(
        `${label}: semak semula frasa berkaitan diagnosis atau label klinikal (${diagnosisWord}).`
      );
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

function buildTheoryRule(theoryMode, theoryPreference) {
  const mode = normaliseTheoryMode(theoryMode);

  if (mode === "rebt") {
    return "Pendekatan dipilih: REBT sahaja. Medan teori mesti 'REBT'.";
  }

  if (mode === "wdep") {
    return "Pendekatan dipilih: Teori Realiti (WDEP) sahaja. Medan teori mesti 'WDEP'.";
  }

  if (mode === "combined") {
    return "Pendekatan dipilih: Gabungkan REBT dan WDEP secara ringkas jika sesuai. Medan teori mesti 'REBT_WDEP'. Jangan tulis gaya buku teks.";
  }

  if (mode === "auto") {
    return `Pendekatan dipilih: pilih sama ada REBT atau WDEP jika benar-benar membantu. Utamakan ${theoryPreference || "REBT"} jika sesuai.`;
  }

  return "Pendekatan dipilih: Tanpa teori khusus. Medan teori mesti 'TIADA'. Tulis secara umum sebagai laporan kaunseling sekolah tanpa menyebut REBT, WDEP, pemikiran tidak rasional, kehendak, atau istilah teori.";
}

function normaliseTheoryMode(theoryMode) {
  return String(theoryMode || "none").toLowerCase();
}

function normaliseComparableText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildQualityAdvice(validation) {
  if (validation.ok && validation.warnings.length === 0) {
    return "Draf medan sesi lengkap untuk disemak akhir oleh guru.";
  }

  if (!validation.ok) {
    return "Draf dipaparkan untuk semakan. Sila baiki bahagian yang diberi tanda sebelum digunakan.";
  }

  return "Cadangan: semak manual bahagian yang diberi amaran sebelum digunakan.";
}
