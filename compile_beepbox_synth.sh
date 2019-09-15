#!/bin/bash

# Compile ts/synth.ts into beepbox_synth.js
tsc -p tsconfig_synth_only.json

# Minify beepbox_synth.js into beepbox_synth.min.js
uglifyjs \
	--compress \
	--mangle \
	--mangle-props regex="/^_.+/;" \
	website/beepbox_synth.js \
	-o website/beepbox_synth.min.js
