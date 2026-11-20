import { open, readFile } from "node:fs/promises";
import { saveApprovedPortrait, type ApprovedPortraitSave } from "../../scripts/lib/clipper/portraitSave.ts";

// Invoked only as a child by the local filesystem integration test.
const [, , mode, requestFile, journalFile] = process.argv;
if ((mode !== "before-link" && mode !== "after-save") || !requestFile || !journalFile) process.exit(90);
const request = JSON.parse(await readFile(requestFile, "utf8")) as ApprovedPortraitSave;
const result = await saveApprovedPortrait(request, {
  persistPrepared: async (intent) => {
    const journal = await open(journalFile, "wx");
    try { await journal.writeFile(JSON.stringify(intent)); await journal.sync(); }
    finally { await journal.close(); }
    if (mode === "before-link") process.exit(37);
  },
});
// Simulate process loss before the host records the returned success.
process.exit(result.status === "saved" && result.verification === "verified" ? 38 : 91);
