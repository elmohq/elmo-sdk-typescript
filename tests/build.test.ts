import { afterAll, beforeAll, expect, it } from 'vitest';

import manifest from '../package.json';

/** Node, whose types a package that runs in a browser does not install. */
const { process } = globalThis as any;

/** Each module `exports` names, by the specifier a project imports it with. */
const entries = Object.keys(manifest.exports)
  .filter((key) => !key.endsWith('.json'))
  .map((key) => manifest.name + key.slice(1));

/** A project outside the package, which installs the tarball `npm pack` writes. */
const project = process
  .getBuiltinModule('node:fs')
  .mkdtempSync(`${process.getBuiltinModule('node:os').tmpdir()}/consumer-`);

beforeAll(() => {
  const fs = process.getBuiltinModule('node:fs');
  const tarball = JSON.parse(
    run('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', project]),
  )[0].filename;
  fs.writeFileSync(`${project}/package.json`, JSON.stringify({ private: true, type: 'module' }));
  fs.copyFileSync(new URL('consumer.ts', import.meta.url), `${project}/consumer.ts`);
  fs.writeFileSync(
    `${project}/entries.ts`,
    entries.map((entry, index) => `import type * as entry${index} from '${entry}';`).join('\n'),
  );
  run(
    'npm',
    ['install', '--no-audit', '--no-fund', '--no-package-lock', '--prefer-offline', `./${tarball}`],
    project,
  );
}, 60000);

afterAll(() => {
  process.getBuiltinModule('node:fs').rmSync(project, { force: true, recursive: true });
});

it('installs into a clean project, and loads every entry through import', async () => {
  expect(offered('module', 'await import(entry)')).toEqual(await offers());
});

it('installs into a clean project, and loads every entry through require()', async () => {
  expect(offered('commonjs', 'require(entry)')).toEqual(await offers());
});

it.each([
  ['bundler', 'esnext'],
  ['nodenext', 'nodenext'],
])(
  'installs into a clean project, and typechecks against it under %s resolution',
  (resolution, module) => {
    const tsc = process
      .getBuiltinModule('node:module')
      .createRequire(import.meta.url)
      .resolve('typescript/package.json')
      .replace(/package\.json$/, 'bin/tsc');
    run(
      process.execPath,
      [
        tsc,
        '--noEmit',
        '--strict',
        '--module',
        module,
        '--moduleResolution',
        resolution,
        'consumer.ts',
        'entries.ts',
      ],
      project,
    );
  },
);

/** The names each entry offers here, sorted. */
async function offers() {
  return Promise.all(entries.map(async (entry) => Object.keys(await import(entry)).sort()));
}

/** The names each entry offers in the project, as Node loads it as `type`. */
function offered(type: string, load: string) {
  const script = `Promise.all(${JSON.stringify(entries)}.map(async (entry) => Object.keys(${load}).sort())).then((names) => globalThis.console.log(JSON.stringify(names)));`;
  return JSON.parse(run(process.execPath, [`--input-type=${type}`, '--eval', script], project));
}

/** Runs a command, and returns what it prints. A failure says what it printed. */
function run(command: string, args: Array<string>, cwd?: string): string {
  try {
    return process
      .getBuiltinModule('node:child_process')
      .execFileSync(command, args, { cwd, encoding: 'utf8' });
  } catch (error) {
    const { stderr, stdout } = error as Record<string, string>;
    throw new Error([`${[command, ...args].join(' ')} failed:`, stdout, stderr].join('\n'));
  }
}
