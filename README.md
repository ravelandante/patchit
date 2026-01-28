A simple script to semi-automate the use of `pnpm patch <pkg>`.

### Usage

Run `npx @fynn-is-making-packages/patchit <pkg>`.

The script will:

1. update your dependencies
2. create a patch for the specified package
3. open the patch in your default or currently open editor

You can then press Enter to commit your changes, or Esc to exit and remove the patch.

#### Options

| Flag           | Description                                                                         |
| -------------- | ----------------------------------------------------------------------------------- |
| `--hr`         | Enable hot reload mode - automatically commit changes when files are modified       |
| `--no-update`  | Skip dependency update before creating patch                                        |
| `--debug`      | Show patch commit output                                                            |
| `--dir <path>` | (BUGGY) Link a local directory instead of using pnpm patch (for direct development) |
