const settingsForm = document.querySelector("#settingsForm");
const accessForm = document.querySelector("#accessForm");
const generateForm = document.querySelector("#generateForm");
const settingsPanel = settingsForm.closest(".panel");
const generatePanel = generateForm.closest(".panel");
const modelSelect = document.querySelector("#modelSelect");
const apiKeyInput = document.querySelector("#apiKeyInput");
const accessPasswordInput = document.querySelector("#accessPasswordInput");
const accessStatus = document.querySelector("#accessStatus");
const theoryMode = document.querySelector("#theoryMode");
const privacyMode = document.querySelector("#privacyMode");
const modelBadge = document.querySelector("#modelBadge");
const apiStatus = document.querySelector("#apiStatus");
const results = document.querySelector("#results");
const qualityPanel = document.querySelector("#qualityPanel");
const sessionTemplate = document.querySelector("#sessionTemplate");
const generateButton = document.querySelector("#generateButton");
const privacyHint = document.querySelector("#privacyHint");
const serverKeyHint = document.querySelector("#serverKeyHint");
const sessionCountInput = document.querySelector("#sessionCount");
const phaseSelections = document.querySelector("#phaseSelections");
const phaseHelp = document.querySelector("#phaseHelp");
const historyPanel = document.querySelector("#historyPanel");
const historyList = document.querySelector("#historyList");
const refreshHistoryButton = document.querySelector("#refreshHistoryButton");

let availablePhases = [];
let accessPassword = window.localStorage.getItem("autoreportAccessPassword") || "";
let accessRequired = false;

boot();

async function boot() {
  await loadAccessState();
  accessForm.addEventListener("submit", handleAccessSubmit);
  settingsForm.addEventListener("submit", handleSaveSettings);
  generateForm.addEventListener("submit", handleGenerate);
  privacyMode.addEventListener("change", syncPrivacyHint);
  refreshHistoryButton.addEventListener("click", loadHistory);
  syncPrivacyHint();
}

async function loadAccessState() {
  const response = await fetch("/api/access");
  const data = await response.json();
  accessRequired = Boolean(data.accessRequired);
  accessForm.classList.toggle("hidden", !accessRequired);
  syncAccessLock(accessRequired && !accessPassword);

  if (!accessRequired || accessPassword) {
    try {
      await loadSettings();
      await loadHistory();
      syncAccessLock(false);
    } catch (error) {
      accessPassword = "";
      window.localStorage.removeItem("autoreportAccessPassword");
      accessStatus.textContent = error.message;
      accessStatus.classList.remove("hidden");
      syncAccessLock(true);
    }
  }
}

async function handleAccessSubmit(event) {
  event.preventDefault();
  accessPassword = accessPasswordInput.value.trim();
  window.localStorage.setItem("autoreportAccessPassword", accessPassword);
  accessStatus.classList.add("hidden");

  try {
    await loadSettings();
    await loadHistory();
    syncAccessLock(false);
  } catch (error) {
    accessStatus.textContent = error.message;
    accessStatus.classList.remove("hidden");
  }
}

function syncAccessLock(locked) {
  settingsPanel.classList.toggle("hidden", locked);
  generatePanel.classList.toggle("hidden", locked);
  historyPanel.classList.toggle("hidden", locked);
}

async function loadSettings() {
  const response = await fetch("/api/settings", {
    headers: accessHeaders()
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Akses tidak berjaya.");
  }

  modelSelect.innerHTML = data.availableModels
    .map((model) => `<option value="${model}">${model}</option>`)
    .join("");
  availablePhases = data.availablePhases || [];

  modelSelect.value = data.settings.model;
  theoryMode.value = data.settings.theoryMode;
  privacyMode.value = data.settings.privacyMode;
  modelBadge.textContent = data.settings.model;
  apiStatus.textContent = data.hasApiKey
    ? "API key sudah tersedia."
    : "API key belum disimpan.";
  renderPhaseOptions();
  syncApiKeyMode(data.apiKeyManagedByServer);
  syncPrivacyHint();
}

async function handleSaveSettings(event) {
  event.preventDefault();

  const response = await fetch("/api/settings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...accessHeaders()
    },
    body: JSON.stringify({
      model: modelSelect.value,
      apiKey: apiKeyInput.value,
      theoryMode: theoryMode.value,
      privacyMode: privacyMode.value
    })
  });

  const data = await response.json();

  if (!response.ok) {
    apiStatus.textContent = data.error || "Tetapan tidak dapat disimpan.";
    return;
  }

  modelBadge.textContent = data.settings.model;
  apiStatus.textContent = data.apiKeyManagedByServer
    ? "Tetapan disimpan. API key diurus oleh pelayan."
    : data.hasApiKey
      ? "Tetapan disimpan. API key tersedia."
      : "Tetapan disimpan, tetapi API key masih belum ada.";
  syncApiKeyMode(data.apiKeyManagedByServer);
  apiKeyInput.value = "";
}

async function handleGenerate(event) {
  event.preventDefault();

  if (
    privacyMode.value === "named" &&
    !window.confirm(
      "Mod ini membenarkan nama sebenar dihantar ke API luar. Teruskan?"
    )
  ) {
    return;
  }

  setBusy(true);
  results.innerHTML = "";
  qualityPanel.classList.add("hidden");

  try {
    const formData = new FormData(generateForm);
    const payload = {
      caseDescription: formData.get("caseDescription"),
      sessionCount: Number(formData.get("sessionCount")),
      phases: getSelectedPhases(),
      model: modelSelect.value,
      theoryMode: theoryMode.value,
      theoryPreference: "REBT",
      privacyMode: privacyMode.value
    };

    const response = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...accessHeaders()
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      const error = new Error(data.error || "Gagal menjana laporan.");
      error.quality = data.quality || null;
      throw error;
    }

    renderQuality(data.quality);
    renderSessions(data.sessions);
    await loadHistory();
  } catch (error) {
    renderQuality(
      error.quality || {
        ok: false,
        issues: [error.message],
        warnings: [],
        advice: "Sila semak API key, model, atau cuba jana semula."
      }
    );
  } finally {
    setBusy(false);
  }
}

async function loadHistory() {
  const response = await fetch("/api/history", {
    headers: accessHeaders()
  });
  const data = await response.json();

  if (!response.ok) {
    historyPanel.classList.add("hidden");
    return;
  }

  renderHistory(data.entries || []);
}

function renderHistory(entries) {
  historyPanel.classList.remove("hidden");
  historyList.innerHTML = "";

  if (!entries.length) {
    historyList.innerHTML = `<p class="history-meta">Belum ada sejarah jana.</p>`;
    return;
  }

  entries.forEach((entry) => {
    const item = document.createElement("article");
    item.className = "history-item";
    item.innerHTML = `
      <div>
        <p><strong>${escapeHtml(entry.title || "Draf sesi kaunseling")}</strong></p>
        <p class="history-meta">${escapeHtml(formatHistoryDate(entry.createdAt))} | ${Number(entry.sessionCount || 0)} sesi</p>
      </div>
      <div class="history-actions">
        <button type="button" class="history-view">Lihat</button>
        <button type="button" class="history-delete secondary-button">Padam</button>
      </div>
    `;

    item.querySelector(".history-view").addEventListener("click", () => {
      renderQuality(entry.quality || {
        ok: true,
        issues: [],
        warnings: [],
        advice: "Draf dimuatkan daripada sejarah."
      });
      renderSessions(entry.sessions || []);
      window.scrollTo({ top: results.offsetTop - 16, behavior: "smooth" });
    });

    item.querySelector(".history-delete").addEventListener("click", async () => {
      if (!window.confirm("Padam sejarah jana ini?")) {
        return;
      }

      await fetch(`/api/history/${encodeURIComponent(entry.id)}`, {
        method: "DELETE",
        headers: accessHeaders()
      });
      await loadHistory();
    });

    historyList.appendChild(item);
  });
}

function renderQuality(quality) {
  qualityPanel.classList.remove("hidden");
  qualityPanel.className = `panel ${quality.ok ? "quality-ok" : "quality-warn"}`;

  const issueItems = (quality.issues || []).map((item) => `<li>${escapeHtml(item)}</li>`);
  const warningItems = (quality.warnings || []).map((item) => `<li>${escapeHtml(item)}</li>`);

  qualityPanel.innerHTML = `
    <h2>Semakan kualiti</h2>
    <p>${escapeHtml(quality.advice || "")}</p>
    ${issueItems.length ? `<ul class="quality-list">${issueItems.join("")}</ul>` : ""}
    ${warningItems.length ? `<ul class="quality-list">${warningItems.join("")}</ul>` : ""}
  `;
}

function renderSessions(sessions) {
  const fields = [
    ["Perkara", "perkara"],
    ["Persoalan", "persoalan"],
    ["Huraian Tindakan / Intervensi", "huraian_tindakan_intervensi", true]
  ];

  results.innerHTML = "";

  sessions.forEach((session) => {
    const fragment = sessionTemplate.content.cloneNode(true);
    const card = fragment.querySelector(".result-card");
    fragment.querySelector("h2").textContent = `Sesi ${session.sesi || session.sessionNumber}`;
    fragment.querySelector(".theory-tag").textContent = "Kandungan boleh diedit";

    const fieldList = fragment.querySelector(".field-list");
    fields.forEach(([label, key, isPointForm]) => {
      const value = isPointForm
        ? formatHuraian(session[key] || session.huraianTindakanIntervensi || "")
        : session[key] || "";
      const rows = isPointForm
        ? Math.max(6, value.split("\n").length)
        : 2;
      const field = document.createElement("section");
      field.className = "field";
      field.dataset.key = key;
      field.innerHTML = `
        <div class="field-top">
          <p class="field-name">${label}</p>
          <button class="field-copy" type="button">Salin</button>
        </div>
        <textarea class="field-value editable-field" rows="${rows}">${escapeHtml(value)}</textarea>
      `;

      field.querySelector(".field-copy").addEventListener("click", async () => {
        await navigator.clipboard.writeText(field.querySelector(".field-value").value);
      });

      fieldList.appendChild(field);
    });

    fragment.querySelector(".session-copy").addEventListener("click", async () => {
      await navigator.clipboard.writeText(formatSessionForCopy(card));
    });

    results.appendChild(fragment);
  });
}

function setBusy(busy) {
  generateButton.disabled = busy;
  generateButton.textContent = busy ? "Menjana..." : "Jana laporan";
}

sessionCountInput.addEventListener("input", renderPhaseOptions);

function renderPhaseOptions() {
  const sessionCount = Number(sessionCountInput.value || 1);
  const phaseLegend = availablePhases
    .map((phase) => `${phase.value.replace("fasa", "")}=${phase.label.replace(/^Fasa \d+ - /, "")}`)
    .join(" | ");
  const currentValues = getSelectedPhases();
  phaseSelections.innerHTML = "";
  phaseHelp.textContent = `Untuk ${sessionCount} sesi, pilih fasa yang terlibat. ${phaseLegend}`;

  availablePhases.forEach((phase, index) => {
    const wrapper = document.createElement("label");
    wrapper.className = "phase-row";

    const checked = currentValues.includes(phase.value);

    wrapper.innerHTML = `
      <input type="checkbox" value="${phase.value}" ${checked ? "checked" : ""} />
      <span>${phase.label}</span>
    `;
    phaseSelections.appendChild(wrapper);
  });
}

function getSelectedPhases() {
  return Array.from(
    phaseSelections.querySelectorAll('input[type="checkbox"]:checked')
  ).map((input) => input.value);
}

function syncPrivacyHint() {
  privacyHint.classList.toggle("hidden", privacyMode.value !== "named");
}

function syncApiKeyMode(apiKeyManagedByServer) {
  serverKeyHint.classList.toggle("hidden", !apiKeyManagedByServer);
  apiKeyInput.closest("label").classList.toggle("managed-field", apiKeyManagedByServer);
  apiKeyInput.disabled = apiKeyManagedByServer;
  apiKeyInput.placeholder = apiKeyManagedByServer
    ? "API key disediakan pada pelayan"
    : "Masukkan sekali, disimpan secara tempatan";
  apiStatus.textContent = apiKeyManagedByServer
    ? "API key sudah disediakan pada pelayan."
    : apiStatus.textContent;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function accessHeaders() {
  return accessRequired
    ? {
        "X-Access-Password": accessPassword
      }
    : {};
}

function formatHistoryDate(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString("ms-MY", {
    dateStyle: "short",
    timeStyle: "short"
  });
}

function toHuraianLines(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }

  return String(value || "")
    .replace(/\s+-\s+(?=(GBK|Klien|Murid)\b)/gi, "\n")
    .split("\n")
    .map((line) => line.trim().replace(/^[-*]\s*/, ""))
    .filter(Boolean);
}

function formatHuraian(value) {
  return toHuraianLines(value)
    .map((line) => `- ${line}`)
    .join("\n\n");
}

function getFieldValue(card, key) {
  return card.querySelector(`.field[data-key="${key}"] .field-value`)?.value || "";
}

function formatSessionForCopy(card) {
  return [
    card.querySelector("h2")?.textContent || "",
    "",
    "Perkara",
    getFieldValue(card, "perkara"),
    "",
    "Persoalan",
    getFieldValue(card, "persoalan"),
    "",
    "Huraian Tindakan / Intervensi",
    getFieldValue(card, "huraian_tindakan_intervensi")
  ].join("\n");
}
