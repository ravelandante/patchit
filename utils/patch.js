import { exec } from "child_process";
import { promisify } from "util";
import { logSuccess, logError } from "./terminal.js";
import { getPackageVersion } from "./package.js";
import launch from "launch-editor";

const execAsync = promisify(exec);

export async function updateDependencies() {
  console.log(`\nInstalling latest dependencies...`);
  await execAsync("pnpm i", { cwd: process.cwd() });
  logSuccess("Dependencies updated");
}

export async function createPatch(packageName) {
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

export async function removePatch(packageName) {
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

export async function commitPatch(patchDir) {
  const commitCommand = `pnpm patch-commit '${patchDir}'`;
  console.log(`\nRunning: ${commitCommand}`);
  const { stdout: commitOutput } = await execAsync(commitCommand, {
    cwd: process.cwd(),
  });
  return commitOutput;
}
