#!/bin/bash
set -e

# This is similar to live_editor.sh, but instead of compiling with tsc and
# bundling with rollup, this uses esbuild for both. It uses less resources and
# is faster. However, this doesn't check type safety at all! Also, the generated
# JS output has some slight differences, so check the other build strategies
# before publishing updates.
npx concurrently \
	"npx esbuild --format=iife --keep-names --global-name=beepbox --bundle ./editor/index.js --outfile=website/beepbox_editor.js --sourcemap --watch" \
	"npx five-server --wait=200 --watch=website/* --open=/index_debug.html website/"

# To run without automatically opening a web browser, set open to false:
#	"npx five-server --wait=200 --watch=website/* --open=false website/"
