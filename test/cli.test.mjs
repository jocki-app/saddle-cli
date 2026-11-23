import { test } from "node:test";
import assert from "node:assert/strict";
import { parse } from "../src/cli.mjs";
test("maps explicit operations and rejects ambiguous options", () => {
  assert.deepEqual(parse(["history", "enable", "note.md"]), {
    method: "history.configure",
    target: "note.md",
    state: "enabled",
  });
  assert.deepEqual(parse(["share", "broadcast", "note.md", "--off"]), {
    method: "sharing.broadcast",
    target: "note.md",
    broadcast: false,
  });
  assert.throws(() => parse(["history", "list"]));
  assert.throws(() => parse(["inspect", "note.md", "--execute", "anything"]));
});

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
test("rejects extra paths, omitted inspect paths, unknown actions and conflicting switches", () => {
  for (const args of [
    ["inspect"],
    ["inspect", "a", "b"],
    ["history", "list", "a", "b"],
    ["archive", "execute", "a"],
    ["share", "broadcast", "a", "--on", "--off"],
  ])
    assert.throws(() => parse(args));
  assert.deepEqual(parse(["share", "contact", "a"]), {
    method: "sharing.contact",
    target: "a",
  });
});
test("installed entry point reports its version and structured failures", () => {
  const run = (args) =>
    spawnSync(process.execPath, ["bin/saddle.mjs", ...args], {
      encoding: "utf8",
      input: JSON.stringify({ method: "unknown", target: "." }),
    });
  const version = run(["--version"]);
  assert.equal(version.status, 0);
  assert.equal(
    version.stdout.trim(),
    JSON.parse(readFileSync("package.json", "utf8")).version,
  );
  const rpc = run(["rpc"]);
  assert.equal(rpc.status, 1);
  const envelope = JSON.parse(rpc.stdout);
  assert.equal(envelope.ok, false);
  assert.equal(typeof envelope.error, "string");
});
