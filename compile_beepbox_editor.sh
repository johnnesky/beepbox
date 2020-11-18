#!/bin/bash
set -e

# Compile editor/main.ts into build/editor/main.js and dependencies
npx tsc

# Combine build/editor/main.js and dependencies into website/beepbox_editor.js
npx rollup build/editor/main.js \
	--file website/beepbox_editor.js \
	--format iife \
	--output.name beepbox \
	--context exports \
	--sourcemap \
	--plugin rollup-plugin-sourcemaps \
	--plugin @rollup/plugin-node-resolve

# Minify website/beepbox_editor.js into website/beepbox_editor.min.js
npx terser \
	website/beepbox_editor.js \
	--source-map "content='website/beepbox_editor.js.map',url=beepbox_editor.min.js.map" \
	-o website/beepbox_editor.min.js \
	--compress \
	--mangle \
	--mangle-props regex="/^_.+/;"

# Combine the html and js into a single file for the offline version
sed \
	-e '/INSERT_BEEPBOX_SOURCE_HERE/{r website/beepbox_editor.min.js' -e 'd' -e '}' \
	website/jummbox_offline_template.html \
	> website/jummbox_offline.html
