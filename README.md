A simple script to semi-automate the use of `pnpm patch <pkg>`.

### Usage

Run `npx @fynn-is-making-packages/patchit <pkg>`.

The script will:

1. update your dependencies (skip with the --no-update flag)
2. create a patch for the specified package
3. open the patch in vs code

You can then press Enter to commit your changes, or Esc to exit and remove the patch.
