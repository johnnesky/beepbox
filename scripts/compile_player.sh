#!/bin/bash
set -e

# Compile player/main.ts into build/player/main.js and dependencies
npx tsc -p tsconfig_player.json

# Combine build/player/main.js and dependencies into website/player/beepbox_player.js
npx rollup build/player/main.js \
	--file website/player/beepbox_player.js \
	--format iife \
	--output.name beepbox \
	--context exports \
	--sourcemap \
	--plugin rollup-plugin-sourcemaps \
	--plugin @rollup/plugin-node-resolve

# Minify website/player/beepbox_player.js into website/player/beepbox_player.min.js
npx terser \
	website/player/beepbox_player.js \
	--source-map "content='website/player/beepbox_player.js.map',url=beepbox_player.min.js.map" \
	-o website/player/beepbox_player.min.js \
	--compress \
	--mangle \
	--mangle-props regex="/^_.+/;"
