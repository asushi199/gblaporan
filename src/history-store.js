import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const DATA_DIR = path.join(process.cwd(), "data");
const HISTORY_PATH = path.join(DATA_DIR, "history.local.json");
const MAX_HISTORY_ENTRIES = 100;
const SUPABASE_TABLE = "report_history";

export async function listHistoryEntries(historyPath = HISTORY_PATH) {
  const supabase = getSupabaseConfig();

  if (supabase) {
    return useSupabaseHistory(supabase).listHistoryEntries();
  }

  const data = await readHistory(historyPath);
  return data.entries;
}

export async function addHistoryEntry(rawEntry, historyPath = HISTORY_PATH) {
  const supabase = getSupabaseConfig();

  if (supabase) {
    return useSupabaseHistory(supabase).addHistoryEntry(rawEntry);
  }

  const data = await readHistory(historyPath);
  const entry = sanitiseHistoryEntry(rawEntry);

  data.entries = [entry, ...data.entries].slice(0, MAX_HISTORY_ENTRIES);
  await writeHistory(data, historyPath);
  return entry;
}

export async function deleteHistoryEntry(id, historyPath = HISTORY_PATH) {
  const supabase = getSupabaseConfig();

  if (supabase) {
    return useSupabaseHistory(supabase).deleteHistoryEntry(id);
  }

  const data = await readHistory(historyPath);
  const before = data.entries.length;

  data.entries = data.entries.filter((entry) => entry.id !== id);
  await writeHistory(data, historyPath);

  return data.entries.length !== before;
}

export function useSupabaseHistory({
  url,
  serviceRoleKey,
  fetchImpl = globalThis.fetch
}) {
  const baseUrl = String(url || "").replace(/\/+$/, "");
  const headers = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json"
  };

  return {
    async listHistoryEntries() {
      const response = await fetchImpl(
        `${baseUrl}/rest/v1/${SUPABASE_TABLE}?select=*&order=created_at.desc&limit=${MAX_HISTORY_ENTRIES}`,
        {
          headers
        }
      );
      const rows = await readSupabaseJson(response);
      return rows.map(fromSupabaseRow);
    },

    async addHistoryEntry(rawEntry) {
      const entry = sanitiseHistoryEntry(rawEntry);
      const row = toSupabaseRow(entry);
      const response = await fetchImpl(
        `${baseUrl}/rest/v1/${SUPABASE_TABLE}?select=*`,
        {
          method: "POST",
          headers: {
            ...headers,
            Prefer: "return=representation"
          },
          body: JSON.stringify(row)
        }
      );
      const rows = await readSupabaseJson(response);
      return fromSupabaseRow(rows[0] || row);
    },

    async deleteHistoryEntry(id) {
      const response = await fetchImpl(
        `${baseUrl}/rest/v1/${SUPABASE_TABLE}?id=eq.${encodeURIComponent(id)}`,
        {
          method: "DELETE",
          headers
        }
      );

      if (!response.ok) {
        await readSupabaseJson(response);
      }

      return response.ok;
    }
  };
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

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return null;
  }

  return {
    url,
    serviceRoleKey
  };
}

async function readSupabaseJson(response) {
  const text = await response.text();
  const data = text ? JSON.parse(text) : [];

  if (!response.ok) {
    throw new Error(data.message || "Supabase history request failed.");
  }

  return Array.isArray(data) ? data : [data];
}

function toSupabaseRow(entry) {
  return {
    id: entry.id,
    created_at: entry.createdAt,
    title: entry.title,
    session_count: entry.sessionCount,
    sessions: entry.sessions,
    quality: entry.quality
  };
}

function fromSupabaseRow(row) {
  return {
    id: row.id,
    createdAt: row.created_at,
    title: row.title,
    sessionCount: row.session_count,
    sessions: Array.isArray(row.sessions) ? row.sessions : [],
    quality: row.quality || {
      ok: false,
      issues: [],
      warnings: [],
      advice: ""
    }
  };
}
