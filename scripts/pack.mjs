import { mkdtemp, cp, readFile, writeFile, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

/** Bundle release dependencies in isolation; source installs use the normal lockfile. */
export async function packCLI(destination) {
  const npm = process.env.npm_execpath;
  if (!npm) throw Error("Run through npm run pack or npm run pack:verify");
  const output = resolve(destination);
  await mkdir(output, { recursive: true });
  const stage = await mkdtemp(join(tmpdir(), "saddle-cli-release-"));
  try {
    const manifest = JSON.parse(await readFile("package.json", "utf8"));
    for (const file of manifest.files)
      await cp(file, join(stage, file), { recursive: true });
    await cp("node_modules", join(stage, "node_modules"), { recursive: true });
    manifest.bundleDependencies = Object.keys(manifest.dependencies);
    delete manifest.scripts;
    await writeFile(
      join(stage, "package.json"),
      JSON.stringify(manifest, null, 2) + "\n",
    );
    const result = spawnSync(
      process.execPath,
      [npm, "pack", "--json", "--ignore-scripts", "--pack-destination", output],
      { cwd: stage, encoding: "utf8", timeout: 60000 },
    );
    if (result.error) throw result.error;
    if (result.status !== 0) throw Error(result.stderr || result.stdout);
    return JSON.parse(result.stdout);
  } finally {
    await rm(stage, { recursive: true, force: true });
  }
}
if (import.meta.url === pathToFileURL(process.argv[1]).href)
  console.log(JSON.stringify(await packCLI(process.argv[2] ?? "release")));
