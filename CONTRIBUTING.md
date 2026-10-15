# Contributing

Issues and pull requests are welcome. Keep changes focused on the local-first MVP and include a test for new nontrivial behavior.

1. Use Node.js 22.13+ and pnpm 11; run `pnpm install`.
2. Make changes on a branch. Keep storage operations in the background and avoid host-page CSS or DOM mutations.
3. Run `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm test:e2e`, and `pnpm build`.
4. Explain permission changes, schema migrations, and anchor matching changes in the PR.

For database changes, add a new Dexie schema version and migration. Never change version 1 in a way that strands existing local data. Avoid collecting or transmitting comment content.
