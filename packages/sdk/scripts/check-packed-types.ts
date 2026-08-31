import { mkdir, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

const outputDirectory = join(import.meta.dir, '..', 'dist', '.pack-check');

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

const pack = Bun.spawn(['bun', 'pm', 'pack', '--destination', outputDirectory], {
  cwd: join(import.meta.dir, '..'),
  stdout: 'inherit',
  stderr: 'inherit'
});

if ((await pack.exited) !== 0) throw new Error('bun pack failed');

const archives = (await readdir(outputDirectory)).filter((file) => file.endsWith('.tgz'));
if (archives.length !== 1) throw new Error(`Expected one package archive, found ${archives.length}`);

const attw = Bun.spawn([
  join(import.meta.dir, '..', 'node_modules', '.bin', 'attw'),
  join(outputDirectory, archives[0]),
  '--profile',
  'node16',
  '--ignore-rules',
  'cjs-resolves-to-esm'
], {
  stdout: 'inherit',
  stderr: 'inherit'
});

if ((await attw.exited) !== 0) throw new Error('Are the Types Wrong found a package issue');

await rm(outputDirectory, { recursive: true, force: true });
