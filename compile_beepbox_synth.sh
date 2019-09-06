#!/bin/bash

# Compile ts/synth.ts into beepbox_synth.js
tsc -p tsconfig_synth_only.json

# Minify beepbox_synth.js into beepbox_synth.min.js
uglifyjs \
	--compress \
	--mangle \
	--mangle-props regex="/^_.+/" \
	beepbox-synth/beepbox_synth.js \
	-o beepbox-synth/beepbox_synth.min.js
