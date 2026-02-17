#!/usr/bin/env node

import { logError, logSuccess } from "./utils/terminal.js";
import { waitForKey } from "./utils/terminal.js";
import {
  detectPackageManager,
  getPackageVersionFromManifest,
} from "./utils/package.js";
import { watchAndCommit } from "./utils/watch.js";

async function main() {
  const args = process.argv.slice(2);
  const packageName = args.find((arg) => !arg.startsWith("--"));
  const manual = args.includes("--manual");
  const noUpdate = args.includes("--no-update");
  const debug = args.includes("--debug");
  const preBuild = args.includes("--build");
  const packageManagerIndex = args.indexOf("--pm");
  let packageManager =
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
    packageManager = detectPackageManager();
    console.log(`Detected package manager: ${packageManager}`);
    if (packageManager === "npm" || packageManager === "yarn-v1") {
      logError(
        "Package manager not supported. If this is incorrect, explicitly specify a package manager e.g. --pm pnpm",
      );
      process.exit(1);
    }
    if (packageManager === "yarn-v2" && dirPath) {
      logError(
        "Local directory patches are not supported for yarn v2. Please use pnpm",
      );
      process.exit(1);
    }
  }

  const managers = {
    pnpm: await import("./utils/managers/pnpm.js"),
    "yarn-v2": await import("./utils/managers/yarn.js"),
  };

  const manager = managers[packageManager];
  const managerVersion = await manager.getVersion();

  let parsedPackageName = packageName;
  let packageVersion = null;
  let isVersionSpecified = false;

  const lastAtIndex = packageName.lastIndexOf("@");
  if (lastAtIndex > 0) {
    parsedPackageName = packageName.substring(0, lastAtIndex);
    packageVersion = packageName.substring(lastAtIndex + 1);
    isVersionSpecified = true;
  }

  try {
    // step 1: install latest dependencies
    if (!noUpdate) {
      await manager.updateDependencies();
    } else {
      console.log("\nSkipping dependency update...");
    }

    if (!packageVersion) {
      packageVersion = await getPackageVersionFromManifest(parsedPackageName);
    }

    // step 2: create patch
    const patchDir = await manager.createPatch(packageName);

    // step 3: open patch dir in vs code
    await manager.openPatch(dirPath ?? patchDir);

    const commitCommand = `pnpm patch-commit '${patchDir}'`;

    console.log("\ncommit command:");
    console.log(`  ${commitCommand}`);

    // step 4: auto or manual commit loop
    if (!manual) {
      const watcher = await watchAndCommit(
        patchDir,
        debug,
        manager,
        dirPath,
        preBuild,
      );

      await waitForKey(
        "\nPress Esc to exit, Backspace to remove patch and exit...",
        async () => {
          await watcher.close();
          process.exit(0);
        },
        async () => {
          await watcher.close();
          await manager.removePatch(
            parsedPackageName,
            packageVersion,
            patchDir,
            managerVersion,
            isVersionSpecified,
          );
          if (!noUpdate) {
            await manager.updateDependencies();
          }
          process.exit(0);
        },
      );
    } else {
      let commitCount = 0;
      while (true) {
        await waitForKey(
          "\nPress Enter⏎ to commit changes (Esc to exit, Backspace to remove patch and exit)...",
          () => {
            process.exit(0);
          },
          async () => {
            await manager.removePatch(
              parsedPackageName,
              packageVersion,
              patchDir,
              managerVersion,
              isVersionSpecified,
            );
            if (!noUpdate) {
              await manager.updateDependencies();
            }
            process.exit(0);
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
  } catch (error) {
    console.log(`\nError: ${error.message}`);
    if (error.stderr) {
      console.error(error.stderr);
    }
    process.exit(1);
  }
}

main();
