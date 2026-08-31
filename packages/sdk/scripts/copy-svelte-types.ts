import { copyFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const source = resolve(import.meta.dir, '../src/adapters/svelte.d.ts');
const destination = resolve(import.meta.dir, '../dist/types/adapters/svelte.d.ts');

await mkdir(dirname(destination), { recursive: true });
await copyFile(source, destination);
