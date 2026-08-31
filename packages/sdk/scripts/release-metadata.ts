import { appendFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

interface PackageManifest {
  version: string;
}

const tag = process.env.RELEASE_TAG;
if (!tag?.startsWith('v')) {
  throw new Error('RELEASE_TAG must have the form v1.2.3');
}

const version = tag.slice(1);
const manifest = JSON.parse(
  await readFile(resolve(import.meta.dir, '../package.json'), 'utf8')
) as PackageManifest;

if (manifest.version !== version) {
  throw new Error(`Tag ${tag} does not match @reservine/sdk version ${manifest.version}`);
}

const output = process.env.GITHUB_OUTPUT;
if (!output) {
  throw new Error('GITHUB_OUTPUT is required');
}

await appendFile(output, `version=${version}\nmajor=${version.split('.')[0]}\n`);
