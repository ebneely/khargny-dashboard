# Dashboard end-to-end tests

This suite has its own installed packages and lockfile. Do not install test packages at the dashboard root. It targets `http://localhost:3111` and lets the backend's `scripts/dev-local.mjs --e2e` own the stack. The dashboard must be a production build served by `next start`: its development route guard bypasses real sign-in. `reuseExisting` attaches to a stack already running on that port.

The default backend path is `../../khargny-backend` relative to this folder. In the current sibling worktrees, set `KHARGNY_BACKEND_DIR` to `../e2e-backend`. The stack always receives this dashboard checkout's absolute path as `KHARGNY_DASHBOARD_DIR`, plus `KHARGNY_FRONTEND_DIR` when supplied.

## Run on the host

PowerShell 5.1 commands, from the dashboard repo root, with packages already installed:

```powershell
$env:KHARGNY_BACKEND_DIR = (Resolve-Path '..\e2e-backend').Path
$env:TEMP = Join-Path $PWD 'e2e-tests\.e2e\tmp'
$env:TMP = $env:TEMP
$env:npm_config_cache = Join-Path $PWD 'e2e-tests\.e2e\npm-cache'
New-Item -ItemType Directory -Force -Path $env:TEMP | Out-Null

Push-Location $env:KHARGNY_BACKEND_DIR
node scripts/dev-local.mjs --e2e
Pop-Location

npm --prefix e2e-tests run test:e2e -- --exclude-tag visual
npm --prefix e2e-tests run test:e2e -- --tag visual --update-snapshots
npm run e2e

Push-Location $env:KHARGNY_BACKEND_DIR
node scripts/dev-local.mjs --e2e --stop
Pop-Location
```

Create the Windows login image on the host with the visual command, inspect it, then rerun without `--update-snapshots`. Baselines are per target and OS, under `tests/visual.e2e.ts-snapshots/`. Do not use a Windows baseline for Linux. Keep the replay cache under `.e2e/cache/` in Git; no recording exists until a host agent run passes its locator checks.

`E2E_MODEL=<provider>:<model id>` enables the agent test. The config copies the backend's runtime selection for `gateway`, `chatgpt` and `copilot`. It never chooses a model when the variable is unset. Provider authentication and any optional provider packages must already exist; this task installs nothing. The non-agent tests need no model. Password fills, including the deliberately invalid credential for the negative test, use declared credential handles rather than plaintext in test bodies.

## What is covered

| File | Assertions and locators |
| --- | --- |
| `tests/auth.setup.e2e.ts` | Uses radio `EN`, labels `Email` and `Password`, and button `Sign in`. Waits for `/dashboard` and heading `Insights`, then saves session `admin`. |
| `tests/login.e2e.ts` | Uses the same sign-in controls with the declared invalid password. The alert says `Invalid credentials`, the URL remains `/login`, and the sign-in form is usable again. The message comes from the backend through the dashboard login handler. |
| `tests/places.e2e.ts` | Table links show Giza Pyramids, Egyptian Museum, Abou Tarek, Bibliotheca Alexandrina, and the inactive, pending-media and no-media fixtures. The deleted fixture is absent. A second test uses navigation `Dashboard` / link `Categories`, button `Add Category`, labels `Name (Arabic) *`, `Name (English) *`, `Slug *`, and button `Save changes`; its unique slug row must be visible and `Active`. |
| `tests/places-agent.e2e.ts` | The `admin` persona creates the same category with a `unique()` name param. A locator assertion on its slug row immediately verifies the outcome for replay caching. It skips with an explicit reason when `E2E_MODEL` is unset. |
| `tests/visual.e2e.ts` | Tagged `visual`. Selects radio `EN`, waits for the English sign-in form, then compares `login.png`. It has no saved session and fills no secret, so screenshots remain available. |

The EN choice is made through the UI in the setup and each unauthenticated test. The app stores it at `khargny.dashboard.lang` in local storage, which the `admin` session preserves. Signed-in tests therefore restore English without changing application code.

Categories are the smallest no-upload record: only names and a slug are needed. Place creation requires a cover photo; cities also require a governorate. Both category tests generate a fresh UUID name per attempt. Their `afterEach` hook uses the existing `categories-q` list filter, a slug cell to identify just that row, button `More actions: <name>`, menu item `Delete`, dialog `Delete <name>?`, and its `Delete` button. It verifies absence again after reopening the list. If creation failed before saving anything, cleanup waits for the filtered empty state instead. The two `Add Category` buttons are equivalent page-action mirrors, so the deterministic test chooses the first.

The supplied screen trees show unnamed comboboxes for the city's Status and the category's Parent category and Status. The tests leave those defaults untouched. No test IDs, CSS selectors or application accessibility changes were added.

## Checks without launching a browser

```powershell
Push-Location e2e-tests
node node_modules/e2e/dist/cli/bin.js list
Pop-Location
npx --no-install tsc -p e2e-tests/tsconfig.json --noEmit
npx --no-install tsc --noEmit
```

Browser runs, screenshots and replay recordings need the host. This sandbox cannot launch the browser. If the stack script has not yet switched the dashboard to a production build, the director must start that build manually before running the suite.
