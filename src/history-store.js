import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const DATA_DIR = path.join(process.cwd(), "data");
const HISTORY_PATH = path.join(DATA_DIR, "history.local.json");
const MAX_HISTORY_ENTRIES = 100;

export async function listHistoryEntries(historyPath = HISTORY_PATH) {
  const data = await readHistory(historyPath);
  return data.entries;
}

export async function addHistoryEntry(rawEntry, historyPath = HISTORY_PATH) {
  const data = await readHistory(historyPath);
  const entry = sanitiseHistoryEntry(rawEntry);

  data.entries = [entry, ...data.entries].slice(0, MAX_HISTORY_ENTRIES);
  await writeHistory(data, historyPath);
  return entry;
}

export async function deleteHistoryEntry(id, historyPath = HISTORY_PATH) {
  const data = await readHistory(historyPath);
  const before = data.entries.length;

  data.entries = data.entries.filter((entry) => entry.id !== id);
  await writeHistory(data, historyPath);

  return data.entries.length !== before;
}

async function readHistory(historyPath) {
  try {
    const raw = await fs.readFile(historyPath, "utf8");
    const parsed = JSON.parse(raw);
    return {
      entries: Array.isArray(parsed.entries) ? parsed.entries : []
    };
  } catch (error) {
    if (error.code === "ENOENT") {
      return { entries: [] };
    }

    throw error;
  }
}

async function writeHistory(data, historyPath) {
  await fs.mkdir(path.dirname(historyPath), { recursive: true });
  await fs.writeFile(historyPath, JSON.stringify(data, null, 2), "utf8");
}

function sanitiseHistoryEntry(rawEntry = {}) {
  const sessions = Array.isArray(rawEntry.sessions) ? rawEntry.sessions : [];
  const firstSession = sessions[0] || {};

  return {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    title: String(firstSession.perkara || "Draf sesi kaunseling").trim(),
    sessionCount: sessions.length,
    sessions,
    quality: {
      ok: Boolean(rawEntry.quality?.ok),
      issues: Array.isArray(rawEntry.quality?.issues) ? rawEntry.quality.issues : [],
      warnings: Array.isArray(rawEntry.quality?.warnings)
        ? rawEntry.quality.warnings
        : [],
      advice: String(rawEntry.quality?.advice || "")
    }
  };
}
