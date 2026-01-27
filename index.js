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
import { useDirPath } from "./utils/package.js";

async function main() {
  const args = process.argv.slice(2);
  const packageName = args.find((arg) => !arg.startsWith("--"));
  const noUpdate = args.includes("--no-update");
  const dirIndex = args.indexOf("--dir");
  const dirPath =
    dirIndex !== -1 && args[dirIndex + 1] ? args[dirIndex + 1] : null;

  if (!packageName || (dirIndex !== -1 && !args[dirIndex + 1])) {
    console.log("\nUsage: patchit <pkg-name> [--no-update] [--dir <dir-path>]");
    process.exit(1);
  }

  try {
    // local dir path flow
    if (dirPath) {
      // step 1: update package.json to use local dir
      await useDirPath(packageName, dirPath);

      // step 2: install latest dependencies
      await updateDependencies();

      // step 3: open the directory in vs code
      await openPatch(dirPath);

      console.log("\nYou can now edit the package directly.");
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

      // step 4: loop - keep prompting to commit
      let commitCount = 0;
      while (true) {
        await waitForKey(
          "\nPress Enter⏎ to commit changes (Esc to remove patch and exit)...",
          async () => {
            if (commitCount > 0) {
              await removePatch(packageName);
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
  } catch (error) {
    console.log(`\nError: ${error.message}`);
    if (error.stderr) {
      console.error(error.stderr);
    }
    process.exit(1);
  }
}

main();
