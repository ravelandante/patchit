import { exec } from "child_process";
import { promisify } from "util";
import {
  readFile,
  rm,
  mkdir,
  copyFile,
  symlink,
  readlink,
  lstat,
} from "fs/promises";
import { logError } from "./terminal.js";
import { logSuccess } from "./terminal.js";
import fs from "fs";
import path from "path";

const execAsync = promisify(exec);

const packageJsonPath = "package.json";

const readPackageJson = async () => {
  try {
    const packageJsonContent = await readFile(packageJsonPath, "utf8");
    return JSON.parse(packageJsonContent);
  } catch (error) {
    logError(`Failed to read package.json: ${error.message}`);
    process.exit(1);
  }
};

export async function getPackageVersionFromList(packageName) {
  const { stdout: listOutput } = await execAsync(
    `pnpm list ${packageName} --json --depth=0`,
    { cwd: process.cwd() },
  );
  const listData = JSON.parse(listOutput);
  const packageVersion =
    listData[0]?.dependencies?.[packageName]?.version ||
    listData[0]?.devDependencies?.[packageName]?.version;

  if (!packageVersion) {
    return;
  }

  const packageWithVersion = `${packageName}@${packageVersion}`;
  return packageWithVersion;
}

export async function getPackageVersionFromManifest(packageName) {
  try {
    const packageJson = await readPackageJson();

    const dependencies = packageJson.dependencies || {};
    const devDependencies = packageJson.devDependencies || {};

    const version = dependencies[packageName] || devDependencies[packageName];

    if (!version) {
      logError(`Could not find ${packageName} in package.json dependencies`);
      process.exit(1);
    }

    const cleanVersion = version.replace(/^[^\d]+/, "");

    return cleanVersion;
  } catch (error) {
    logError(`Failed to read package.json: ${error.message}`);
    process.exit(1);
  }
}

function checkForFile(cwd, fileName) {
  return fs.existsSync(path.join(cwd, fileName));
}

export function detectPackageManager() {
  const cwd = process.cwd();

  let currentDir = cwd;
  while (currentDir !== path.parse(cwd).root) {
    if (
      (checkForFile(currentDir, "pnpm-workspace.yaml") ||
        checkForFile(currentDir, "pnpm-workspace.yml")) &&
      checkForFile(currentDir, "pnpm-lock.yaml")
    ) {
      return "pnpm";
    }

    if (checkForFile(currentDir, "yarn.lock")) {
      if (checkForFile(currentDir, ".yarnrc.yml")) {
        return "yarn-v2";
      }
      return "yarn-v1";
    }

    if (checkForFile(currentDir, "package-lock.json")) {
      return "npm";
    }

    currentDir = path.dirname(currentDir);
  }

  return "npm";
}

async function copyDirectory(src, dest) {
  await mkdir(dest, { recursive: true });
  const entries = await fs.promises.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.name === "node_modules") {
      continue;
    }

    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    try {
      const stats = await lstat(srcPath);

      if (stats.isSymbolicLink()) {
        const linkTarget = await readlink(srcPath);
        await symlink(linkTarget, destPath);
      } else if (stats.isDirectory()) {
        await copyDirectory(srcPath, destPath);
      } else if (stats.isFile()) {
        await copyFile(srcPath, destPath);
      }
    } catch (error) {
      console.warn(`Warning: Could not copy ${srcPath}: ${error.message}`);
    }
  }
}

export async function syncDirectories(sourceDir, targetDir) {
  try {
    console.log(`\nSyncing directories...`);
    if (fs.existsSync(targetDir)) {
      await rm(targetDir, { recursive: true, force: true });
    }

    await copyDirectory(sourceDir, targetDir);
    logSuccess("Directories synced");
  } catch (error) {
    logError(`Failed to sync directories: ${error.message}`);
    throw error;
  }
}
