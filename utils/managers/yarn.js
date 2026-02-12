import { exec } from "child_process";
import { promisify } from "util";
import { rm } from "fs/promises";
import { logSuccess, logError } from "../terminal.js";
import launch from "launch-editor";

const execAsync = promisify(exec);

function extractYarnPatchDir(output) {
  const match = output.match(/You can now edit the following folder:\s+(.+)/);
  return match ? match[1].trim() : null;
}

export async function updateDependencies() {
  console.log(`\nInstalling latest dependencies...`);
  await execAsync("yarn install", { cwd: process.cwd() });
  logSuccess("Dependencies updated");
}

export async function createPatch(packageName) {
  console.log(`\nCreating patch directory for ${packageName}...`);

  try {
    const { stdout } = await execAsync(`yarn patch ${packageName}`, {
      cwd: process.cwd(),
    });
    const patchDir = extractYarnPatchDir(stdout);
    logSuccess(`Patch created at: ${patchDir}`);

    return patchDir;
  } catch (error) {
    logError(`Failed to create patch: ${error.message}`);
    process.exit(1);
  }
}

export async function openPatch(patchDir) {
  console.log(`\nOpening patch dir...`);
  launch(patchDir, null, (_, errorMessage) => {
    logError(
      `Failed to open patch directory automatically: ${errorMessage}. Please open it manually: ${patchDir}`,
    );
    return;
  });
  logSuccess("Opened");
}

// deletion not implemented for yarn yet
export async function removePatch(packageName, packageVersion, patchDir) {
  // Remove patch file from .yarn/patches
  // Remove patch entry from package.json
  // Remove the resolution entry
  // Clean up empty resolutions object
}

export async function commitPatch(patchDir) {
  const commitCommand = `yarn patch-commit -s '${patchDir}'`;
  console.log(`\nRunning: ${commitCommand}`);
  const { stdout: commitOutput } = await execAsync(commitCommand, {
    cwd: process.cwd(),
  });
  return commitOutput;
}
