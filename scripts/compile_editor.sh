#!/bin/bash
set -e

# Compile editor/index.ts into build/editor/index.js and dependencies
npx tsc -p scripts/tsconfig_editor.json

# Combine build/editor/index.js and dependencies into website/beepbox_editor.js
npx rollup build/editor/index.js \
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
	website/beepbox_offline_template.html \
	> website/beepbox_offline.html
