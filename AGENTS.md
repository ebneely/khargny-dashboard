<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

Read `DESIGN.md` before changing any dashboard or login screen.

End-to-end tests use e2e and live in `e2e-tests/`, with their own packages and lockfile. Load the `e2ev` and `e2e` skills before writing or running a test. From the backend repo, start the stack with `node scripts/dev-local.mjs --e2e`; it must serve the dashboard as a production build, not `next dev`. From this repo, run `npm run e2e`. Stop the stack from the backend repo with `node scripts/dev-local.mjs --e2e --stop`.
