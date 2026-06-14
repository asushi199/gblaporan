import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  addHistoryEntry,
  deleteHistoryEntry,
  listHistoryEntries,
  useSupabaseHistory
} from "../src/history-store.js";

async function tempHistoryPath() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "autoreport-history-"));
  return path.join(dir, "history.local.json");
}

test("history entries store generated output without raw case description", async () => {
  const historyPath = await tempHistoryPath();
  const entry = await addHistoryEntry(
    {
      caseDescription: "Sensitive raw note should not be stored.",
      sessions: [
        {
          sesi: 1,
          perkara: "Murid dirujuk kerana bergaduh dengan rakan sekelas.",
          persoalan: "Isu sebenar masih diterokai.",
          huraian_tindakan_intervensi: [
            "GBK membina hubungan dengan klien.",
            "Klien berkongsi keadaan awal.",
            "GBK menerangkan tujuan sesi.",
            "GBK merumuskan perkongsian awal."
          ]
        }
      ],
      quality: {
        ok: true,
        issues: [],
        warnings: []
      }
    },
    historyPath
  );
  const entries = await listHistoryEntries(historyPath);
  const raw = await fs.readFile(historyPath, "utf8");

  assert.equal(entries.length, 1);
  assert.equal(entries[0].id, entry.id);
  assert.match(entries[0].title, /Murid dirujuk/);
  assert.equal(entries[0].sessions.length, 1);
  assert.equal(raw.includes("Sensitive raw note"), false);
});

test("deleteHistoryEntry removes one saved entry", async () => {
  const historyPath = await tempHistoryPath();
  const first = await addHistoryEntry(
    {
      sessions: [{ sesi: 1, perkara: "Perkara pertama." }],
      quality: { ok: true }
    },
    historyPath
  );
  await addHistoryEntry(
    {
      sessions: [{ sesi: 1, perkara: "Perkara kedua." }],
      quality: { ok: true }
    },
    historyPath
  );

  const deleted = await deleteHistoryEntry(first.id, historyPath);
  const entries = await listHistoryEntries(historyPath);

  assert.equal(deleted, true);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].title, "Perkara kedua.");
});

test("Supabase history backend inserts sanitized entries", async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    const body = JSON.parse(options.body);
    return new Response(JSON.stringify([{ ...body, created_at: body.created_at }]), {
      status: 201,
      headers: { "Content-Type": "application/json" }
    });
  };
  const store = useSupabaseHistory({
    url: "https://example.supabase.co",
    serviceRoleKey: "service-role",
    fetchImpl
  });

  const entry = await store.addHistoryEntry({
    caseDescription: "Do not send raw note.",
    sessions: [{ sesi: 1, perkara: "Murid dirujuk kerana lewat ke sekolah." }],
    quality: { ok: true }
  });

  assert.equal(entry.title, "Murid dirujuk kerana lewat ke sekolah.");
  assert.equal(calls.length, 1);
  assert.equal(
    calls[0].url,
    "https://example.supabase.co/rest/v1/report_history?select=*"
  );
  assert.equal(calls[0].options.method, "POST");
  assert.equal(calls[0].options.headers.apikey, "service-role");
  assert.equal(JSON.stringify(calls[0].options.body).includes("Do not send raw note"), false);
});

test("Supabase history backend lists and deletes entries", async () => {
  const calls = [];
  const fetchImpl = async (url, options = {}) => {
    calls.push({ url, options });

    if (options.method === "DELETE") {
      return new Response(null, { status: 204 });
    }

    return new Response(
      JSON.stringify([
        {
          id: "entry-1",
          created_at: "2026-06-14T00:00:00.000Z",
          title: "Perkara Supabase.",
          session_count: 1,
          sessions: [{ sesi: 1 }],
          quality: { ok: true }
        }
      ]),
      {
        status: 200,
        headers: { "Content-Type": "application/json" }
      }
    );
  };
  const store = useSupabaseHistory({
    url: "https://example.supabase.co/",
    serviceRoleKey: "service-role",
    fetchImpl
  });

  const entries = await store.listHistoryEntries();
  const deleted = await store.deleteHistoryEntry("entry-1");

  assert.equal(entries.length, 1);
  assert.equal(entries[0].createdAt, "2026-06-14T00:00:00.000Z");
  assert.equal(entries[0].sessionCount, 1);
  assert.equal(deleted, true);
  assert.match(calls[0].url, /order=created_at\.desc/);
  assert.match(calls[1].url, /id=eq\.entry-1/);
});
