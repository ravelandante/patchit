import { exec } from "child_process";
import { promisify } from "util";
import { readFile } from "fs/promises";
import { logError } from "./terminal.js";

const execAsync = promisify(exec);

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
    const packageJsonContent = await readFile("package.json", "utf8");
    const packageJson = JSON.parse(packageJsonContent);

    const dependencies = packageJson.dependencies || {};
    const devDependencies = packageJson.devDependencies || {};

    const version = dependencies[packageName] || devDependencies[packageName];

    if (!version) {
      logError(`Could not find ${packageName} in package.json dependencies`);
      process.exit(1);
    }

    const cleanVersion = version.replace(/^[^\d]+/, "");

    return `${packageName}@${cleanVersion}`;
  } catch (error) {
    logError(`Failed to read package.json: ${error.message}`);
    process.exit(1);
  }
}

export async function getPackageVersion(packageName) {
  let packageVersion = await getPackageVersionFromList(packageName);
  if (!packageVersion) {
    packageVersion = await getPackageVersionFromManifest(packageName);
  }
  return packageVersion;
}
