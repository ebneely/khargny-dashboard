import type { E2EConfig } from 'e2e';
import { web } from '@e2e-dev/web';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { adminCredentials } from './tests/admin-credentials.js';

async function selectedModel() {
  const selection = process.env.E2E_MODEL;
  if (selection === undefined) return undefined;
  const separator = selection.indexOf(':');
  if (separator < 1 || !selection.slice(separator + 1).trim()) {
    throw new Error('E2E_MODEL must be <provider>:<model id>.');
  }
  const provider = selection.slice(0, separator);
  const modelId = selection.slice(separator + 1);
  if (provider === 'gateway') {
    const { gateway } = await import('ai');
    return gateway(modelId);
  }
  if (provider === 'chatgpt') {
    let chatgpt;
    try {
      ({ chatgpt } = await import('e2e/oauth/chatgpt'));
    } catch {
      throw new Error(
        'Install @ai-sdk/openai in e2e-tests/ to use E2E_MODEL=chatgpt:<model id>.',
      );
    }
    return chatgpt(modelId);
  }
  if (provider === 'copilot') {
    let copilot;
    try {
      ({ copilot } = await import('e2e/oauth/copilot'));
    } catch {
      throw new Error(
        'Install @ai-sdk/openai and @ai-sdk/openai-compatible in e2e-tests/ to use E2E_MODEL=copilot:<model id>.',
      );
    }
    return copilot(modelId);
  }
  throw new Error(
    `Unknown E2E_MODEL provider "${provider}"; use chatgpt, copilot, or gateway.`,
  );
}

const model = await selectedModel();
const suiteDir = fileURLToPath(new URL('.', import.meta.url));
const stackEnv = {
  ...Object.fromEntries(
    ['USERPROFILE', 'APPDATA', 'LOCALAPPDATA', 'KHARGNY_FRONTEND_DIR'].flatMap(
      (name) => process.env[name] === undefined ? [] : [[name, process.env[name]!]],
    ),
  ),
  KHARGNY_DASHBOARD_DIR: resolve(suiteDir, '..'),
};

export default {
  targets: [
    {
      name: 'dashboard',
      engine: web(),
      app: {
        url: process.env.E2E_DASHBOARD_URL ?? 'http://localhost:3111',
        command: {
          executable: 'node',
          args: ['scripts/dev-local.mjs', '--e2e'],
          cwd: resolve(suiteDir, process.env.KHARGNY_BACKEND_DIR ?? '../../khargny-backend'),
          reuseExisting: true,
          startupTimeout: 300_000,
          log: '.e2e/logs/stack.log',
          env: stackEnv,
        },
      },
    },
  ],
  credentials: {
    admin: adminCredentials,
    invalidAdmin: { username: adminCredentials.username, password: 'IncorrectPassword123!' },
  },
  agents: {
    default: {
      system: 'You are a thorough QA agent. Verify every outcome.',
      ...(model === undefined ? {} : { model }),
    },
    admin: {
      system: 'You operate a city-guide dashboard and manage its places and catalogue. Verify every saved change on screen and never modify unrelated records.',
      context: 'The Dashboard navigation has Home; Sales: Subscribers, Ads, Analytics, Trips, Storefront; Content: Places, Cities, Categories, Amenities, Tags, Badges; Team: Admins, Settings. Categories uses Add Category, New Category and Save changes. More actions opens the Delete menu for one record.',
      ...(model === undefined ? {} : { model }),
    },
  },
  reporters: ['list', 'markdown'],
  actionTimeout: 60_000,
  assertionTimeout: 15_000,
} satisfies E2EConfig;
