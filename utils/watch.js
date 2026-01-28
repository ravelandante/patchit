import chokidar from "chokidar";
import { commitPatch } from "./patch.js";
import { logError, logSuccess } from "./terminal.js";

export async function watchAndCommit(patchDir, debug) {
  let commitCount = 0;
  let isCommitting = false;
  let pendingCommit = false;

  console.log("\nHot reload enabled - changes will be auto-committed");

  const watcher = chokidar.watch(patchDir, {
    ignoreInitial: true,
    persistent: true,
    awaitWriteFinish: {
      stabilityThreshold: 2000,
      pollInterval: 100,
    },
  });

  const doCommit = async () => {
    if (isCommitting) {
      pendingCommit = true;
      return;
    }

    isCommitting = true;
    pendingCommit = false;

    try {
      const commitOutput = await commitPatch(patchDir);
      if (debug) {
        console.log(commitOutput);
      }
      commitCount++;
      logSuccess(`Patch #${commitCount} auto-committed`);
      console.log("\nPress Esc to stop watching and exit...");
    } catch (error) {
      logError(`Failed to commit: ${error.message}`);
    } finally {
      isCommitting = false;

      if (pendingCommit) {
        setTimeout(() => doCommit(), 100);
      }
    }
  };

  watcher
    .on("change", (path) => {
      console.log(`\nDetected change: ${path}`);
      doCommit();
    })
    .on("add", (path) => {
      console.log(`\nDetected new file: ${path}`);
      doCommit();
    })
    .on("unlink", (path) => {
      console.log(`\nDetected deletion: ${path}`);
      doCommit();
    })
    .on("error", (error) => {
      logError(`Watcher error: ${error}`);
    });

  return watcher;
}
