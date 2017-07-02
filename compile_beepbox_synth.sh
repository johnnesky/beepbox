#!/bin/bash

# Compile ts/synth.ts into beepbox_synth.js
#	--strictNullChecks \
tsc \
	--target ES5 \
	--noImplicitAny \
	--noImplicitReturns \
	--noFallthroughCasesInSwitch \
	--removeComments \
	ts/synth.ts \
	--out beepbox-synth/beepbox_synth.js

# Minify beepbox_synth.js into beepbox_synth.min.js
uglifyjs \
	--compress \
	--mangle \
	--mangle-props \
	--mangle-regex="/^_.+/" \
	--screw-ie8 \
	beepbox-synth/beepbox_synth.js \
	-o beepbox-synth/beepbox_synth.min.js
