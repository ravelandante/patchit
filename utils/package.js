import { exec } from "child_process";
import { promisify } from "util";
import { readFile, writeFile } from "fs/promises";
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

export async function useDirPath(packageName, dirPath) {
  console.log(`\nUpdating package.json to use local dir...`);

  const packageJson = await readPackageJson();

  const isDependency = packageJson.dependencies?.[packageName];
  const isDevDependency = packageJson.devDependencies?.[packageName];

  if (!isDependency && !isDevDependency) {
    logError(`Could not find ${packageName} in package.json dependencies`);
    process.exit(1);
  }

  const originalValues = {
    dependency: isDependency || null,
    devDependency: isDevDependency || null,
  };

  if (isDependency) {
    packageJson.dependencies[packageName] = `link:${dirPath}`;
  }
  if (isDevDependency) {
    packageJson.devDependencies[packageName] = `link:${dirPath}`;
  }

  await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2) + "\n");
  logSuccess(`Updated ${packageName} to use: ${dirPath}`);

  return originalValues;
}

export async function revertDirPath(packageName, originalValues) {
  console.log(`\nReverting package.json...`);

  const packageJson = await readPackageJson();

  if (originalValues.dependency) {
    packageJson.dependencies[packageName] = originalValues.dependency;
  }
  if (originalValues.devDependency) {
    packageJson.devDependencies[packageName] = originalValues.devDependency;
  }

  await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2) + "\n");
  logSuccess(`Reverted ${packageName} to original version`);
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
