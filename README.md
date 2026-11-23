# SADDLE CLI

Command-line and JSON access to the SADDLE v1 archive and canonical history/sharing runtime. Requires Node.js 26.10 or newer.

## Install

Run `npm ci`, then `npm link` to install the `saddle` command locally. A reproducible `@jocki/saddle` package snapshot is included in `vendor/`, so this checkout does not require another repository. `npm test` verifies argument handling; the Python SDK's interoperability suite exercises the real runtime end to end.

```sh
saddle inspect notes.md
saddle archive list notes.md
saddle metadata get notes.md
saddle metadata set notes.md --input resource.json
saddle history enable notes.md
saddle history list notes.md
saddle history reset notes.md
saddle history delete notes.md --hash CHANGE_HASH
saddle history disable notes.md
saddle share invite notes.md
saddle share list notes.md
```

`share grant` takes an invitation and an explicitly approved contact card. `share broadcast` uses `--on` or `--off`. Use `--relay URL` for a transport endpoint and `--profile DIRECTORY` for private identity/cache state. `share serve` exchanges changes until interrupted. Local files work without an active transport. An invitation never substitutes for a grant. Do not commit invitations or identity material.

The three policy states are enabled, disabled and unset. Unset inherits within the opened boundary. A file operation does not inherit its parent's unopened folder. History deletion removes that version's edits and replays later edits; shared pruning waits for the normal signed peer barrier.

## JSON language binding

`saddle rpc` reads one JSON request from stdin and writes exactly one envelope to stdout:

```json
{"method":"history.list","target":"/absolute/path/notes.md"}
```

Success is `{"ok":true,"result":...}`; failure is `{"ok":false,"error":"..."}` with a nonzero exit status. The public request type is `UnitRequest` in the TypeScript SDK. File arguments and operations are explicit local capabilities; received synchronization data never creates a request. Low-level archive puts reject Automerge record replacement; use coordinated history methods instead.

See [the specification](https://github.com/jocki-app/saddle-specification) and [SDK docs](https://jocki-app.github.io/saddle-website/). GPL-3.0-only.
