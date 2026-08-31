import { copyFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const packageRoot = resolve(import.meta.dir, '..');
const compatibilityRoot = resolve(packageRoot, '../reservine-button-compat/dist');

await mkdir(compatibilityRoot, { recursive: true });
await copyFile(
  resolve(packageRoot, 'dist/cdn/sdk.js'),
  resolve(compatibilityRoot, 'reservine-button.umd.js')
);
