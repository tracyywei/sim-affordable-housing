// Runs the TypeScript compiler over the whole project. Catches missing modules, missing named
// exports (e.g. `import { buildingHeight } from './Building'` after it was renamed), and type errors.
import { expect, test } from 'vitest';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');

test('tsc --noEmit passes', () => {
  const tsc = path.join(ROOT, 'node_modules', 'typescript', 'bin', 'tsc');
  const r = spawnSync(process.execPath, [tsc, '--noEmit', '-p', ROOT], { cwd: ROOT, encoding: 'utf8' });
  const out = `${r.stdout}${r.stderr}`.trim();
  expect(r.status, `TypeScript errors:\n${out}`).toBe(0);
}, 120_000);
