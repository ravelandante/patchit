#!/usr/bin/env node

import { logError, logSuccess } from "./utils/terminal.js";
import { waitForKey } from "./utils/terminal.js";
import {
  createPatch,
  openPatch,
  removePatch,
  commitPatch,
  updateDependencies,
} from "./utils/patch.js";

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
  } catch (error) {
    console.log(`\nError: ${error.message}`);
    if (error.stderr) {
      console.error(error.stderr);
    }
    process.exit(1);
  }
}

main();
