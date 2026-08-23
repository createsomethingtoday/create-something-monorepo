# Compatibility policy

## Runtime

The supported production matrix is Node.js 22 and Node.js 24 on Linux and
macOS. Both lines are exercised as clean npm consumers in CI. The package is
ESM-only. Its npm install floor remains `node >=20` so the package can coexist
with the monorepo's current downstream build lane, but Node 20 is end-of-life
and is not a supported production runtime. Untested odd-numbered and newer
Current releases are also outside the production matrix. Browser runtimes and
CommonJS `require()` are not supported.

Supporting a Node line means the package builds, imports, compiles the shipped
release-promotion fixture, verifies its artifact bundle, and runs the public
CLI from an isolated tarball install. Other Node versions may work but are not
release gates.

## Version surfaces

The npm version, workflow input schema, replay schema, compiled artifact schema,
and governed-interaction schema are independent compatibility surfaces. A
minor npm release may add an explicitly optional field or export while keeping
existing schema versions readable. It does not silently reinterpret an
existing versioned field.

Unknown schema versions and unknown fields fail closed. A breaking TypeScript,
CLI, semantic, or schema change requires either a new npm major version or a
new explicitly versioned schema with a documented migration path.

## Prereleases

`0.1.0-beta.*` releases are public integration candidates. Their documented
public seams are intentional, but a later beta may still make a breaking
change with a changelog and migration entry. Stable `0.1.x` releases retain
the documented interfaces for the remainder of the `0.1` line.

## Operating systems and filesystems

Atomic artifact promotion requires a local filesystem that supports symbolic
links and atomic rename within one parent directory. Callers must not place the
public output path and its compiler control directory on different filesystems.
Windows is not currently a supported production target.
