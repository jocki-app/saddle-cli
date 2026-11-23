import { packCLI } from "./pack.mjs";
import { mkdtemp, writeFile, readFile, rm, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
const temporary = await mkdtemp(join(tmpdir(), "saddle-cli-package-"));
const npm = process.env.npm_execpath;
if (!npm) throw Error("Run through npm run pack:verify");
const run = (args, options = {}) => {
  const result = spawnSync(process.execPath, args, {
    encoding: "utf8",
    timeout: 60000,
    ...options,
  });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout;
};
try {
  const [{ filename }] = await packCLI(temporary);
  const install = join(temporary, "install");
  run([
    npm,
    "install",
    "--prefix",
    install,
    "--offline",
    "--cache",
    join(temporary, "empty-cache"),
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
    join(temporary, filename),
  ]);
  const cli = join(install, "node_modules/@jocki/saddle-cli/bin/saddle.mjs");
  const note = join(temporary, "note.md");
  await writeFile(note, "ordinary file");
  const request = {
    method: "unit.inspect",
    target: note,
    profile: join(temporary, "profile"),
  };
  const response = JSON.parse(
    run([cli, "rpc"], { input: JSON.stringify(request), cwd: temporary }),
  );
  assert.equal(response.ok, true);
  assert.equal(response.result.kind, "file");
  assert.equal(await readFile(note, "utf8"), "ordinary file");
  await assert.rejects(access(join(temporary, ".note.md.saddle")));
  console.log(
    "Verified packed CLI installs offline and opens a standalone file",
  );
} finally {
  await rm(temporary, { recursive: true, force: true });
}
