const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

async function release() {
  // Dynamic import for inquirer
  const inquirer = (await import('inquirer')).default;

  const buttonPackageJsonPath = path.resolve(__dirname, '../apps/reservine-button/package.json');

  // Load the package.json for reservine-button
  const packageJson = JSON.parse(fs.readFileSync(buttonPackageJsonPath, 'utf-8'));

  // Prompt for version bump type
  const { versionType } = await inquirer.prompt([
    {
      type: 'list',
      name: 'versionType',
      message: 'Select version bump type:',
      choices: ['patch', 'minor'],
    },
  ]);

  // Helper to run shell commands
  const runCommand = (command) => {
    console.log(`\nRunning: ${command}`);
    execSync(command, { stdio: 'inherit' });
  };

  try {
    // Bump version locally
    const oldVersion = packageJson.version;
    const newVersion = execSync(
      `npm version ${versionType} --no-git-tag-version --prefix ./apps/reservine-button`,
    )
      .toString()
      .trim();

    console.log(`✅ Version bumped from ${oldVersion} to ${newVersion}`);

    // Build the library
    console.log('\nBuilding the library...');
    runCommand('pnpm run build:reservine-button');

    // Copy lightweight package.json into dist folder
    const distFolder = path.resolve(__dirname, '../dist/apps/reservine-button');
    const packageJsonForDist = {
      name: 'reservine-button',
      version: newVersion,
      main: 'reservine-button.umd.js',
      module: 'reservine-button.mjs',
      files: ['reservine-button.mjs', 'reservine-button.umd.js'],
      license: 'MIT',
    };

    fs.writeFileSync(
      path.join(distFolder, 'package.json'),
      JSON.stringify(packageJsonForDist, null, 2),
    );

    // Publish to npm
    console.log('\nPublishing to npm...');
    runCommand(`npm publish ${distFolder} --access public`);

    // Commit and push changes
    /*  console.log('\nCommitting and tagging the release...');
    runCommand('git add .');
    runCommand(`git commit -m "chore: release reservine-button v${newVersion}"`);
    runCommand(`git tag -a v${newVersion} -m "Release reservine-button v${newVersion}"`);
    runCommand('git push --follow-tags');*/

    console.log('\n✅ Release complete!');
  } catch (error) {
    console.error('❌ Release failed:', error.message);
    process.exit(1);
  }
}

release();
