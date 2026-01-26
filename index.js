#!/usr/bin/env node

import { exec } from "child_process";
import * as readline from "readline";
import { promisify } from "util";

const execAsync = promisify(exec);

const colours = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
};

function logSuccess(message) {
  console.log(`${colours.green}✓ ${message}${colours.reset}`);
}

function logError(message) {
  console.log(`${colours.red}✗ ${message}${colours.reset}`);
}

async function updateDependencies() {
  console.log(`\nInstalling latest dependencies...`);
  await execAsync("pnpm i", { cwd: process.cwd() });
  logSuccess("Dependencies updated");
}

async function createPatch(packageName) {
  console.log(`\nRunning pnpm patch ${packageName}...`);
  const { stdout } = await execAsync(`pnpm patch ${packageName}`, {
    cwd: process.cwd(),
  });

  const patchDirMatch = stdout.match(
    /You can now edit the package at:\s*\n\s*\n\s*(.+?)(?:\s*\(|$)/i,
  );

  if (!patchDirMatch) {
    logError("Could not find patch directory in pnpm output");
    console.log("\nOutput was:");
    console.log(stdout);
    process.exit(1);
  }

  const patchDir = patchDirMatch[1].trim();
  logSuccess(`Patch created at: ${patchDir}`);
  return patchDir;
}

async function openPatch(patchDir) {
  console.log(`\nOpening patch dir...`);
  await execAsync(`code "${patchDir}"`);
  logSuccess("Opened");
}

async function removePatch(packageName) {
  console.log("\n\nRemoving patch...");
  try {
    const packageWithVersion = await getPackageVersion(packageName);
    await execAsync(`pnpm patch-remove ${packageWithVersion}`, {
      cwd: process.cwd(),
    });
    logSuccess("Patch removed");
  } catch (error) {
    logError(`Failed to remove patch: ${error}`);
  }
}

async function waitForKey(prompt, onEscape) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  readline.emitKeypressEvents(process.stdin, rl);

  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }

  return new Promise((resolve) => {
    const onKeypress = async (str, key) => {
      if (key.name === "escape") {
        if (process.stdin.isTTY) {
          process.stdin.setRawMode(false);
        }
        rl.close();
        await onEscape();
        process.exit(0);
      } else if (key.name === "return") {
        if (process.stdin.isTTY) {
          process.stdin.setRawMode(false);
        }
        process.stdin.removeListener("keypress", onKeypress);
        rl.close();
        resolve();
      }
    };

    process.stdout.write(prompt);
    process.stdin.on("keypress", onKeypress);
  });
}

async function getPackageVersion(packageName) {
  const { stdout: listOutput } = await execAsync(
    `pnpm list ${packageName} --json --depth=0`,
    { cwd: process.cwd() },
  );
  const listData = JSON.parse(listOutput);
  const packageVersion =
    listData[0]?.dependencies?.[packageName]?.version ||
    listData[0]?.devDependencies?.[packageName]?.version;

  if (!packageVersion) {
    logError("Could not determine package version");
    process.exit(1);
  }

  const packageWithVersion = `${packageName}@${packageVersion}`;
  return packageWithVersion;
}

async function main() {
  const packageName = process.argv[2];

  if (!packageName) {
    logError("Please provide a package name");
    console.log("\nUsage: node patchit.mjs <package-name>");
    process.exit(1);
  }

  try {
    // step 1: install latest dependencies
    await updateDependencies();

    // step 2: create patch
    const patchDir = await createPatch(packageName);

    // step 3: open patch dir in vs code
    await openPatch(patchDir);

    const commitCommand = `pnpm patch-commit '${patchDir}'`;

    console.log("\ncommit command:");
    console.log(`  ${commitCommand}`);

    // step 4: loop - keep prompting to commit
    let commitCount = 0;
    while (true) {
      await waitForKey(
        "\nPress Enter⏎ to commit changes (Esc to remove patch and exit)...",
        async () => {
          await removePatch(packageName);
        },
      );

      console.log(`\nRunning: ${commitCommand}`);
      const { stdout: commitOutput } = await execAsync(commitCommand, {
        cwd: process.cwd(),
      });

      console.log(commitOutput);
      commitCount++;
      logSuccess(`Patch #${commitCount} committed`);
      if (commitCount === 1) {
        console.log(
          "\nYou can continue editing and press Enter again to commit more changes.",
        );
      }
    }
  } catch (error) {
    console.log(`\nError: ${error.message}`);
    if (error.stderr) {
      console.error(error.stderr);
    }
    process.exit(1);
  }
}

main();
