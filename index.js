#!/usr/bin/env node

import { logError, logSuccess } from "./utils/terminal.js";
import { waitForKey } from "./utils/terminal.js";
import {
  useDirPath,
  revertDirPath,
  detectPackageManager,
  getPackageVersion,
} from "./utils/package.js";
import { watchAndCommit } from "./utils/watch.js";

async function main() {
  const args = process.argv.slice(2);
  const packageName = args.find((arg) => !arg.startsWith("--"));
  const manual = args.includes("--manual");
  const noUpdate = args.includes("--no-update");
  const debug = args.includes("--debug");
  const packageManagerIndex = args.indexOf("--pm");
  const packageManager =
    packageManagerIndex !== -1 && args[packageManagerIndex + 1]
      ? args[packageManagerIndex + 1]
      : null;

  if (packageManager && !["pnpm", "yarn-v2"].includes(packageManager)) {
    console.log(
      `Invalid package manager: ${packageManager}. Supported: pnpm, yarn-v2`,
    );
    process.exit(1);
  }

  const dirIndex = args.indexOf("--dir");
  const dirPath =
    dirIndex !== -1 && args[dirIndex + 1] ? args[dirIndex + 1] : null;

  if (!packageName || (dirIndex !== -1 && !args[dirIndex + 1])) {
    console.log(
      "\nUsage: patchit <pkg-name> [--no-update] [--hr] [--dir <dir-path>]",
    );
    process.exit(1);
  }

  if (!packageManager) {
    const packageManager = detectPackageManager();
    console.log(`Detected package manager: ${packageManager}`);
    if (packageManager === "npm") {
      logError(
        "Package manager not supported. If this is incorrect, explicitly specify a package manager e.g. --pm pnpm",
      );
      process.exit(1);
    }
  }

  const managers = {
    pnpm: await import("./utils/managers/pnpm.js"),
    "yarn-v2": await import("./utils/managers/yarn.js"),
  };

  const manager = managers[packageManager];

  try {
    // local dir path flow
    if (dirPath) {
      // step 1: update package.json to use local dir
      const originalValues = await useDirPath(packageName, dirPath);
      // step 2: install latest dependencies
      await manager.updateDependencies();
      // step 3: open the directory in vs code
      await manager.openPatch(dirPath);
      console.log("\nYou can now edit the package directly.");
      // step 4: wait for user to press Esc to revert and exit
      await waitForKey("\nPress Esc to revert and exit...", async () => {
        await revertDirPath(packageName, originalValues);
        await manager.updateDependencies();
      });
    }
    // normal flow
    else {
      // step 1: install latest dependencies
      if (!noUpdate) {
        await manager.updateDependencies();
      } else {
        console.log("\nSkipping dependency update...");
      }

      // get package version
      const packageWithVersion = await getPackageVersion(packageName);

      // step 2: create patch
      const patchDir = await manager.createPatch(packageName);

      // step 3: open patch dir in vs code
      await manager.openPatch(patchDir);

      const commitCommand = `pnpm patch-commit '${patchDir}'`;

      console.log("\ncommit command:");
      console.log(`  ${commitCommand}`);

      // step 4: auto or manual commit loop
      if (!manual) {
        const watcher = await watchAndCommit(patchDir, debug, manager);

        await waitForKey(
          "\nPress Esc to stop watching and exit...",
          async () => {
            await watcher.close();
            await manager.removePatch(packageName, patchDir);
            if (!noUpdate) {
              await manager.updateDependencies();
            }
          },
        );
      } else {
        let commitCount = 0;
        while (true) {
          await waitForKey(
            "\nPress Enter⏎ to commit changes (Esc to remove patch and exit)...",
            async () => {
              await manager.removePatch(packageWithVersion, patchDir);
              if (!noUpdate) {
                await manager.updateDependencies();
              }
            },
          );

          const commitOutput = await manager.commitPatch(patchDir);
          if (debug) {
            console.log(commitOutput);
          }
          commitCount++;
          logSuccess(`Patch #${commitCount} committed`);
          if (commitCount === 1) {
            console.log(
              "\nYou can continue editing and press Enter again to commit more changes.",
            );
          }
        }
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
