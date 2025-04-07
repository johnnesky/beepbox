#!/bin/bash
set -e

# Compile synth/index.ts into build/synth/index.js and dependencies
npx tsc -p scripts/tsconfig_synth_only.json

# Bundle build/synth/index.js and dependencies into bundle/beepbox_synth.js
npx rollup build/synth/index.js \
	--file bundle/beepbox_synth.js \
	--format iife \
	--output.name beepbox \
	--context exports \
	--sourcemap \
	--plugin rollup-plugin-sourcemaps \
	--plugin @rollup/plugin-node-resolve

# Minify bundle/beepbox_synth.js into bundle/beepbox_synth.min.js
npx terser \
	bundle/beepbox_synth.js \
	--source-map "content='bundle/beepbox_synth.js.map',url=beepbox_synth.min.js.map" \
	-o bundle/beepbox_synth.min.js \
	--compress \
	--mangle \
	--mangle-props regex="/^_.+/;"

# Copy the bundled and minified code into the website folder
cp -r bundle/. website/
