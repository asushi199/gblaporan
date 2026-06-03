import fs from "node:fs/promises";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");
const SETTINGS_PATH = path.join(DATA_DIR, "settings.local.json");

const DEFAULT_SETTINGS = {
  model: "gemini-2.5-flash",
  apiKey: "",
  theoryMode: "auto",
  theoryPreference: "REBT",
  privacyMode: "anonymous"
};

export async function readSettings() {
  try {
    const raw = await fs.readFile(SETTINGS_PATH, "utf8");
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch (error) {
    if (error.code === "ENOENT") {
      return { ...DEFAULT_SETTINGS };
    }

    throw error;
  }
}

export async function writeSettings(nextSettings) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const current = await readSettings();
  const merged = { ...current, ...nextSettings };
  await fs.writeFile(SETTINGS_PATH, JSON.stringify(merged, null, 2), "utf8");
  return merged;
}
