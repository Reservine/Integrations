import { access, readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

interface ExportCondition {
  import?: string;
  svelte?: string;
  types?: string;
}

interface PackageManifest {
  exports: Record<string, string | ExportCondition>;
  name: string;
  version: string;
}

const packageRoot = resolve(import.meta.dir, '..');
const manifest = JSON.parse(
  await readFile(resolve(packageRoot, 'package.json'), 'utf8')
) as PackageManifest;

const exportPaths = Object.values(manifest.exports).flatMap((entry) =>
  typeof entry === 'string' ? [entry] : Object.values(entry)
);

for (const relativePath of new Set(exportPaths)) {
  await access(resolve(packageRoot, relativePath));
}

const cdnBundle = resolve(packageRoot, 'dist/cdn/sdk.js');
const bundleSize = (await stat(cdnBundle)).size;
const maximumBundleSize = 220_000;

if (bundleSize > maximumBundleSize) {
  throw new Error(`CDN bundle is ${bundleSize} bytes; budget is ${maximumBundleSize} bytes`);
}

console.log(`${manifest.name}@${manifest.version}: ${exportPaths.length} exports verified`);
console.log(`CDN bundle: ${bundleSize} bytes`);
