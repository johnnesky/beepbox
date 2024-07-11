#!/bin/bash
set -e

# Compile synth/synth.ts into build/synth/synth.js and dependencies
npx tsc -p tsconfig_synth_only.json

# Combine build/synth/synth.js and dependencies into website/beepbox_synth.js
npx rollup build/synth/synth.js \
	--file website/beepbox_synth.js \
	--format iife \
	--output.name beepbox \
	--context exports \
	--sourcemap \
	--plugin rollup-plugin-sourcemaps \
	--plugin @rollup/plugin-node-resolve

# Minify website/beepbox_synth.js into website/beepbox_synth.min.js
npx terser \
	website/beepbox_synth.js \
	--source-map "content='website/beepbox_synth.js.map',url=beepbox_synth.min.js.map" \
	-o website/beepbox_synth.min.js \
	--compress \
	--mangle \
	--mangle-props regex="/^_.+/;"
