#!/usr/bin/env node

import { logSuccess } from "./utils/terminal.js";
import { waitForKey } from "./utils/terminal.js";
import {
  createPatch,
  openPatch,
  removePatch,
  commitPatch,
  updateDependencies,
} from "./utils/patch.js";
import { useDirPath, revertDirPath } from "./utils/package.js";
import { watchAndCommit } from "./utils/watch.js";

async function main() {
  const args = process.argv.slice(2);
  const packageName = args.find((arg) => !arg.startsWith("--"));
  const noUpdate = args.includes("--no-update");
  const hotReload = args.includes("--hr");
  const dirIndex = args.indexOf("--dir");
  const dirPath =
    dirIndex !== -1 && args[dirIndex + 1] ? args[dirIndex + 1] : null;

  if (!packageName || (dirIndex !== -1 && !args[dirIndex + 1])) {
    console.log(
      "\nUsage: patchit <pkg-name> [--no-update] [--hr] [--dir <dir-path>]",
    );
    process.exit(1);
  }

  try {
    // local dir path flow
    if (dirPath) {
      // step 1: update package.json to use local dir
      const originalValues = await useDirPath(packageName, dirPath);

      // step 2: install latest dependencies
      await updateDependencies();

      // step 3: open the directory in vs code
      await openPatch(dirPath);

      console.log("\nYou can now edit the package directly.");

      // step 4: wait for user to press Esc to revert and exit
      await waitForKey("\nPress Esc to revert and exit...", async () => {
        await revertDirPath(packageName, originalValues);
        await updateDependencies();
      });
    }
    // normal flow
    else {
      // step 1: install latest dependencies
      if (!noUpdate) {
        await updateDependencies();
      } else {
        console.log("\nSkipping dependency update...");
      }

      // step 2: create patch
      const patchDir = await createPatch(packageName);

      // step 3: open patch dir in vs code
      await openPatch(patchDir);

      const commitCommand = `pnpm patch-commit '${patchDir}'`;

      console.log("\ncommit command:");
      console.log(`  ${commitCommand}`);

      // step 4: hot reload or manual commit loop
      if (hotReload) {
        const watcher = await watchAndCommit(patchDir);

        await waitForKey(
          "\nPress Esc to stop watching and exit...",
          async () => {
            await watcher.close();
            await removePatch(packageName, patchDir);
            if (!noUpdate) {
              await updateDependencies();
            }
          },
        );
      } else {
        let commitCount = 0;
        while (true) {
          await waitForKey(
            "\nPress Enter⏎ to commit changes (Esc to remove patch and exit)...",
            async () => {
              await removePatch(packageName, patchDir);
              if (!noUpdate) {
                await updateDependencies();
              }
            },
          );

          const commitOutput = await commitPatch(patchDir);
          console.log(commitOutput);
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
