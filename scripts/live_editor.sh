#!/bin/bash
set -e

# Uses the "concurrently" npm package to execute multiple tasks simultaneously.
# This performs some but not all of the tasks from compile_beepbox_editor.sh.
# tsc is used to transpile TypeScript files to JavaScript files in build/, and
# rollup is used to bundle these files into website/beepbox_editor.js. Here,
# both of these tasks are configured to remain active and watch for changes to
# files, so that when you edit and save a source file, a new compiled version
# will be generated automatically. Finally, the "five-server" npm package is
# used to locally serve the site, navigate your browser to
# website/index_debug.html, and automatically make the browser reload when the
# compiled version is regenerated. You can use CTRL+C to stop the tasks.
# You may need to wait for tsc to compile once before editing any source files.
npx concurrently \
	"npx tsc -p scripts/tsconfig_editor.json --watch --preserveWatchOutput" \
	"npx rollup build/editor/index.js --file website/beepbox_editor.js --format iife --output.name beepbox --context exports --sourcemap --plugin rollup-plugin-sourcemaps --plugin @rollup/plugin-node-resolve --watch.buildDelay 200 -w" \
	"npx five-server --wait=200 --watch=website/* --open=/index_debug.html website/"
