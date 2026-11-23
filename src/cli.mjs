import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { operate } from "@jocki/saddle/node";
export const help = `SADDLE — portable metadata, history and approved synchronization

saddle inspect PATH
saddle archive list|verify|get|put PATH [--record NAME] [--input FILE]
saddle metadata get|set PATH [--input FILE]
saddle history list|enable|disable|unset|reset|delete PATH [--hash HASH]
saddle share list|enable|disable|unset|invite|join|grant|broadcast|serve PATH
  [--invitation LINK] [--contact CARD] [--role read|edit] [--on|--off]
  [--relay URL] [--profile DIRECTORY]
saddle rpc                       Read one JSON request from stdin

Results are JSON. Ordinary files are unchanged by archive inspection.
History deletion replays later edits. Shared pruning waits for peer agreement.
Invitations and contact cards are sensitive runtime data: keep them out of source control.
`;
export function parse(args) {
  const values = [],
    options = {};
  for (let index = 0; index < args.length; index++) {
    const token = args[index];
    if (!token.startsWith("--")) {
      values.push(token);
      continue;
    }
    if (["--on", "--off"].includes(token)) {
      options.broadcast = token === "--on";
      continue;
    }
    if (
      ![
        "--record",
        "--input",
        "--hash",
        "--invitation",
        "--contact",
        "--role",
        "--relay",
        "--profile",
        "--rename-engine",
      ].includes(token)
    )
      throw Error("Unknown option " + token);
    const value = args[++index];
    if (!value || value.startsWith("--"))
      throw Error("Missing value for " + token);
    if (token === "--relay") (options.endpoints ??= []).push(value);
    else
      options[
        token === "--rename-engine" ? "renameExecutable" : token.slice(2)
      ] = value;
  }
  let [group, action, target] = values;
  if (group === "inspect")
    return { method: "unit.inspect", target: action, ...options };
  if (group === "share") group = "sharing";
  if (!["archive", "metadata", "history", "sharing"].includes(group))
    throw Error("Choose an operation; use --help for commands");
  if (!target) throw Error("An explicit file or folder path is required");
  if (
    ["history", "sharing"].includes(group) &&
    ["enable", "disable", "unset"].includes(action)
  )
    return {
      method: group + ".configure",
      target,
      state:
        action === "enable"
          ? "enabled"
          : action === "disable"
            ? "disabled"
            : "unset",
      ...options,
    };
  return { method: group + "." + action, target, ...options };
}
async function stdin() {
  let source = "";
  for await (const chunk of process.stdin) source += chunk;
  return source;
}
export async function main(args) {
  if (!args.length || args.includes("--help") || args.includes("-h")) {
    process.stdout.write(help);
    return;
  }
  const rpc = args[0] === "rpc";
  try {
    const request = rpc ? JSON.parse(await stdin()) : parse(args);
    if (request.input) {
      const bytes = await readFile(request.input);
      if (request.method === "metadata.set")
        request.value = JSON.parse(bytes.toString("utf8"));
      else if (request.method === "archive.put")
        request.bytes = bytes.toString("base64");
      else throw Error("--input is only valid for metadata set or archive put");
      delete request.input;
    }
    if (request.method === "metadata.set" && request.value === undefined)
      request.value = JSON.parse(await stdin());
    const controller = new AbortController();
    const stop = () => controller.abort();
    process.once("SIGINT", stop);
    process.once("SIGTERM", stop);
    let result;
    try {
      result = await operate(request, { signal: controller.signal });
    } finally {
      process.removeListener("SIGINT", stop);
      process.removeListener("SIGTERM", stop);
    }
    process.stdout.write(
      JSON.stringify(rpc ? { ok: true, result } : result) + "\n",
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (rpc)
      process.stdout.write(
        JSON.stringify({ ok: false, error: message }) + "\n",
      );
    else process.stderr.write("saddle: " + message + "\n");
    process.exitCode = 1;
  }
}
