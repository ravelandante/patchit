import chokidar from "chokidar";
import { logError, logSuccess } from "./terminal.js";
import { syncDirectories } from "./package.js";

export async function watchAndCommit(
  patchDir,
  debug,
  packageManager,
  localDir = null,
) {
  let commitCount = 0;
  let isCommitting = false;
  let pendingCommit = false;

  console.log("\nHot reload enabled - changes will be auto-committed");

  const watchDir = localDir || patchDir;
  const watcher = chokidar.watch(watchDir, {
    ignoreInitial: true,
    ignored: (path) => {
      const relativePath = path.startsWith(watchDir)
        ? path.slice(watchDir.length)
        : path;
      return /(?:^|[/\\])node_modules(?:[/\\]|$)/.test(relativePath);
    },
    awaitWriteFinish: {
      stabilityThreshold: 2000,
      pollInterval: 100,
    },
  });

  const commit = async () => {
    if (isCommitting) {
      pendingCommit = true;
      return;
    }

    isCommitting = true;
    pendingCommit = false;

    try {
      if (localDir) {
        await syncDirectories(localDir, patchDir);
      }
      const commitOutput = await packageManager.commitPatch(patchDir);
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
        setTimeout(() => commit(), 100);
      }
    }
  };

  watcher
    .on("change", (path) => {
      console.log(`\nDetected change: ${path}`);
      commit();
    })
    .on("add", (path) => {
      console.log(`\nDetected new file: ${path}`);
      commit();
    })
    .on("unlink", (path) => {
      console.log(`\nDetected deletion: ${path}`);
      commit();
    })
    .on("error", (error) => {
      logError(`Watcher error: ${error}`);
    });

  return watcher;
}
