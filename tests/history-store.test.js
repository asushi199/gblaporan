import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  addHistoryEntry,
  deleteHistoryEntry,
  listHistoryEntries
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
