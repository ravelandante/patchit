import * as readline from "readline";

const colours = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
};

export function logSuccess(message) {
  console.log(`${colours.green}✓ ${message}${colours.reset}`);
}

export function logError(message) {
  console.log(`${colours.red}✗ ${message}${colours.reset}`);
}

export async function waitForKey(prompt, onEscape) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  readline.emitKeypressEvents(process.stdin, rl);

  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }

  return new Promise((resolve) => {
    const onKeypress = async (str, key) => {
      if (key.name === "escape") {
        if (process.stdin.isTTY) {
          process.stdin.setRawMode(false);
        }
        rl.close();
        await onEscape();
        process.exit(0);
      } else if (key.name === "return") {
        if (process.stdin.isTTY) {
          process.stdin.setRawMode(false);
        }
        process.stdin.removeListener("keypress", onKeypress);
        rl.close();
        resolve();
      }
    };

    process.stdout.write(prompt);
    process.stdin.on("keypress", onKeypress);
  });
}
