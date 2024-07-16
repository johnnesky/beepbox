#!/bin/bash
set -e

# Defaults to opening index_debug.html in a browser, but that can be disabled
# by passing the argument --headless, like this:
# npm run live-editor-fast-typeless -- --headless
open_browser_path=/index_debug.html
for arg in "$@"; do
  case "$arg" in
    '--headless') open_browser_path=false;;
  esac
done

# This is similar to live_editor.sh, but instead of compiling with tsc and
# bundling with rollup, this uses esbuild for both. It uses less resources and
# is faster. However, this doesn't check type safety at all! Also, the generated
# JS output has some slight differences, so check the other build strategies
# before publishing updates.
npx concurrently \
	"npx esbuild --format=iife --keep-names --global-name=beepbox --bundle ./editor/index.js --outfile=website/beepbox_editor.js --sourcemap --watch" \
	"npx five-server --wait=200 --watch=website/* --port=8081 --open=$open_browser_path website/"
