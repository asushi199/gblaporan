const settingsForm = document.querySelector("#settingsForm");
const generateForm = document.querySelector("#generateForm");
const modelSelect = document.querySelector("#modelSelect");
const apiKeyInput = document.querySelector("#apiKeyInput");
const theoryMode = document.querySelector("#theoryMode");
const theoryPreference = document.querySelector("#theoryPreference");
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

let availablePhases = [];

boot();

async function boot() {
  await loadSettings();
  settingsForm.addEventListener("submit", handleSaveSettings);
  generateForm.addEventListener("submit", handleGenerate);
  privacyMode.addEventListener("change", syncPrivacyHint);
  syncPrivacyHint();
}

async function loadSettings() {
  const response = await fetch("/api/settings");
  const data = await response.json();

  modelSelect.innerHTML = data.availableModels
    .map((model) => `<option value="${model}">${model}</option>`)
    .join("");
  availablePhases = data.availablePhases || [];

  modelSelect.value = data.settings.model;
  theoryMode.value = data.settings.theoryMode;
  theoryPreference.value = data.settings.theoryPreference;
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
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: modelSelect.value,
      apiKey: apiKeyInput.value,
      theoryMode: theoryMode.value,
      theoryPreference: theoryPreference.value,
      privacyMode: privacyMode.value
    })
  });

  const data = await response.json();
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
      theoryPreference: theoryPreference.value,
      privacyMode: privacyMode.value
    };

    const response = await fetch("/api/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
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
    ["Huraian Tindakan / Intervensi", "huraianTindakanIntervensi"]
  ];

  results.innerHTML = "";

  sessions.forEach((session) => {
    const fragment = sessionTemplate.content.cloneNode(true);
    fragment.querySelector("h2").textContent = `Sesi ${session.sessionNumber}`;
    fragment.querySelector(".theory-tag").textContent = session.theoryUsed;

    const fieldList = fragment.querySelector(".field-list");
    fields.forEach(([label, key]) => {
      const field = document.createElement("section");
      field.className = "field";
      field.innerHTML = `
        <div class="field-top">
          <p class="field-name">${label}</p>
          <button class="field-copy" type="button">Salin</button>
        </div>
        <p class="field-value">${escapeHtml(session[key] || "")}</p>
      `;

      field.querySelector(".field-copy").addEventListener("click", async () => {
        await navigator.clipboard.writeText(session[key] || "");
      });

      fieldList.appendChild(field);
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

    const checked =
      currentValues.length > 0
        ? currentValues.includes(phase.value)
        : index === 1 || index === 2;

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
