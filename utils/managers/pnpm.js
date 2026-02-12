import { exec } from "child_process";
import { promisify } from "util";
import { mkdir, rm } from "fs/promises";
import { resolve, join } from "path";
import { logSuccess, logError } from "../terminal.js";
import launch from "launch-editor";

const execAsync = promisify(exec);

function generatePatchDirName(packageName) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  const timestamp = `${year}-${month}-${day}-${hours}${minutes}`;

  const safeName = packageName.replace(/[@/]/g, "-").replace(/^-+/, "");
  return `${safeName}-${timestamp}`;
}

export async function updateDependencies() {
  console.log(`\nInstalling latest dependencies...`);
  await execAsync("pnpm i", { cwd: process.cwd() });
  logSuccess("Dependencies updated");
}

export async function createPatch(packageName) {
  console.log(`\nCreating patch directory for ${packageName}...`);

  const dirName = generatePatchDirName(packageName);
  const patchitDir = resolve(process.cwd(), "node_modules", ".patchit");
  const patchDir = join(patchitDir, dirName);

  await mkdir(patchitDir, { recursive: true });

  try {
    await execAsync(`pnpm patch ${packageName} --edit-dir "${patchDir}"`, {
      cwd: process.cwd(),
    });
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

export async function removePatch(packageName, packageVersion, patchDir) {
  console.log("\nRemoving patch...");
  try {
    await execAsync(`pnpm patch-remove ${packageName}@${packageVersion}`, {
      cwd: process.cwd(),
    });

    if (patchDir) {
      await rm(patchDir, { recursive: true, force: true });
    }
    logSuccess("Patch removed");
  } catch (error) {
    logError(`Failed to remove patch: ${error}`);
  }
}

export async function commitPatch(patchDir) {
  const commitCommand = `pnpm patch-commit '${patchDir}'`;
  console.log(`\nRunning: ${commitCommand}`);
  const { stdout: commitOutput } = await execAsync(commitCommand, {
    cwd: process.cwd(),
  });
  return commitOutput;
}
