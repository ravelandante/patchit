## patchit

[![npm version](https://img.shields.io/npm/v/@fynn-is-making-packages/patchit.svg)](https://www.npmjs.com/package/@fynn-is-making-packages/patchit)

A simple script to semi-automate the use of `pnpm/yarn patch <pkg>`.

Supported package managers:

- pnpm
- yarn v2+

### Usage

Run `npx @fynn-is-making-packages/patchit <pkg>`.

The script will:

1. automatically detect what package manager you are using
2. update your dependencies
3. create a patch for the specified package in `node_modules/<sensible-patch-name>`
4. open the patch in your default or currently open editor
5. auto-commit the patch when changes are detected
6. remove the patch when exiting

Differences for yarn:

- yarn does not let you specify a folder to write the patched package to, so it will always be created in an arbitrary temporary folder
- automatically removing patches on exit is not currently supported

### Example

```
> npx @fynn-is-making-packages/patchit example-package

Detected package manager: pnpm

Installing latest dependencies...
✓ Dependencies updated

Creating patch directory for example-package...
✓ Patch created at: node_modules/.patchit/example-package-2026-02-12-1022

Opening patch dir...
✓ Opened

# patch dir will be opened in your preferred code editor

commit command:
  pnpm patch-commit 'node_modules/.patchit/example-package-2026-02-12-1022'

Hot reload enabled - changes will be auto-committed

Press Esc to stop watching and exit...
Detected change: node_modules/.patchit/example-package-2026-02-12-1022/example-file.js

Running: pnpm patch-commit 'node_modules/.patchit/example-package-2026-02-12-1022'
✓ Patch #1 auto-committed

Press Esc to stop watching and exit...

> ESC

Removing patch...
✓ Patch removed

Installing latest dependencies...
✓ Dependencies updated
```

#### Options

| Flag                     | Description                                                                           |
| ------------------------ | ------------------------------------------------------------------------------------- |
| `--manual`               | Disable auto-commit mode and instead use Enter to commit a patch                      |
| `--no-update`            | Skip dependency update before creating patch                                          |
| `--debug`                | Show patch commit output                                                              |
| `--pm <package-manager>` | Explicitly specify a package manager if the correct one is not automatically detected |
| `--dir <path>`           | (BUGGY) Link a local directory instead of using pnpm patch (for direct development)   |
