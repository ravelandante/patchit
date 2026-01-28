## patchit

[![npm version](https://img.shields.io/npm/v/@fynn-is-making-packages/patchit.svg)](https://www.npmjs.com/package/@fynn-is-making-packages/patchit)

A simple script to semi-automate the use of `pnpm patch <pkg>`.

### Usage

Run `npx @fynn-is-making-packages/patchit <pkg>`.

The script will:

1. update your dependencies
2. create a patch for the specified package in `node_modules/<sensible-patch-name>`
3. open the patch in your default or currently open editor
4. auto-commit the patch when changes are detected
5. remove the patch when exiting

#### Options

| Flag           | Description                                                                         |
| -------------- | ----------------------------------------------------------------------------------- |
| `--manual`     | Disable auto-commit mode and instead press Enter to commit a patch                  |
| `--no-update`  | Skip dependency update before creating patch                                        |
| `--debug`      | Show patch commit output                                                            |
| `--dir <path>` | (BUGGY) Link a local directory instead of using pnpm patch (for direct development) |
