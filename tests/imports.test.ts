// Static import check: every import in the app source must point at something that exists.
// Catches "Cannot find module './Whimsy'"-style runtime errors without starting Next. Because
// SfMap is loaded with next/dynamic, a broken import there only blows up in the browser.
import { describe, expect, test } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { builtinModules } from 'node:module';

const ROOT = path.resolve(__dirname, '..');
const SRC_DIRS = ['app', 'components', 'lib', 'scripts'];
const SRC_EXT = /\.(ts|tsx|js|jsx|mjs|cjs|mts)$/;
const RESOLVE_EXTS = ['', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.mts', '.json', '.css'];

function walk(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? walk(p) : SRC_EXT.test(e.name) ? [p] : [];
  });
}

/** Strip comments so commented-out imports don't count (keeps string contents intact enough for specifiers). */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
}

/** All module specifiers: `import x from`, `export ... from`, `import 'side-effect'`, `import()`, `require()`. */
function specifiers(src: string): string[] {
  const code = stripComments(src);
  const out: string[] = [];
  const res = [
    /\bfrom\s*['"]([^'"]+)['"]/g,
    /\bimport\s*['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];
  for (const re of res) for (const m of code.matchAll(re)) out.push(m[1]);
  return [...new Set(out)];
}

/** True if `p` exists with exactly this casing (macOS is case-insensitive; Linux deploys are not). */
function existsExactCase(p: string): boolean {
  if (!fs.existsSync(p)) return false;
  const rel = path.relative(ROOT, p);
  let cur = ROOT;
  for (const seg of rel.split(path.sep)) {
    if (!fs.readdirSync(cur).includes(seg)) return false;
    cur = path.join(cur, seg);
  }
  return true;
}

function resolveLocal(fromFile: string, spec: string): string | null {
  const base = spec.startsWith('@/') ? path.join(ROOT, spec.slice(2)) : path.resolve(path.dirname(fromFile), spec);
  for (const ext of RESOLVE_EXTS) {
    const p = base + ext;
    if (existsExactCase(p) && fs.statSync(p).isFile()) return p;
  }
  for (const ext of RESOLVE_EXTS.slice(1)) {
    const p = path.join(base, 'index' + ext);
    if (existsExactCase(p)) return p;
  }
  return null;
}

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const declared = new Set<string>([...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.devDependencies ?? {})]);
const builtins = new Set(builtinModules);

function packageName(spec: string): string {
  const parts = spec.split('/');
  return spec.startsWith('@') ? parts.slice(0, 2).join('/') : parts[0];
}

/** `geojson` is types-only and comes from `@types/geojson`. */
function isDeclared(name: string): boolean {
  if (declared.has(name)) return true;
  const typesName = name.startsWith('@') ? `@types/${name.slice(1).replace('/', '__')}` : `@types/${name}`;
  return declared.has(typesName);
}

const files = SRC_DIRS.flatMap((d) => walk(path.join(ROOT, d)));
const rel = (p: string) => path.relative(ROOT, p);

describe('imports resolve', () => {
  test('found source files to scan', () => {
    expect(files.length).toBeGreaterThan(10);
  });

  test('every relative and @/ import points at an existing file (exact case)', () => {
    const broken: string[] = [];
    for (const f of files) {
      for (const s of specifiers(fs.readFileSync(f, 'utf8'))) {
        if (!(s.startsWith('.') || s.startsWith('@/'))) continue;
        if (!resolveLocal(f, s)) broken.push(`${rel(f)} → '${s}'`);
      }
    }
    expect(broken, `Unresolvable imports:\n  ${broken.join('\n  ')}`).toEqual([]);
  });

  test('every package import is a Node builtin or declared in package.json', () => {
    const missing: string[] = [];
    for (const f of files) {
      for (const s of specifiers(fs.readFileSync(f, 'utf8'))) {
        if (s.startsWith('.') || s.startsWith('@/')) continue;
        if (s.startsWith('node:') || builtins.has(s)) continue;
        const name = packageName(s);
        if (!isDeclared(name)) missing.push(`${rel(f)} → '${s}' (add "${name}" to package.json)`);
      }
    }
    expect(missing, `Undeclared packages:\n  ${missing.join('\n  ')}`).toEqual([]);
  });

  test('every declared runtime dependency is installed', () => {
    const notInstalled = Object.keys(pkg.dependencies ?? {}).filter(
      (d) => !fs.existsSync(path.join(ROOT, 'node_modules', d, 'package.json')),
    );
    expect(notInstalled, `Run npm install — missing: ${notInstalled.join(', ')}`).toEqual([]);
  });
});
