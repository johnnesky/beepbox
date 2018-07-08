#!/bin/bash

# Compile ts/SongEditor.ts into beepbox_editor.js
tsc \
	--target ES6 \
	--strictNullChecks \
	--noImplicitAny \
	--noImplicitReturns \
	--noFallthroughCasesInSwitch \
	--removeComments \
	ts/SongEditor.ts \
	--out beepbox-synth/beepbox_editor.js

# Minify beepbox_editor.js into beepbox_editor.min.js
uglifyjs \
	--compress \
	--mangle \
	--mangle-props regex="/^_.+/" \
	beepbox-synth/beepbox_editor.js \
	-o beepbox-synth/beepbox_editor.min.js

# Combine the html and js into a single file for the offline version
sed \
	-e '/INSERT_BEEPBOX_SOURCE_HERE/{r beepbox-synth/beepbox_editor.min.js' -e 'd' -e '}' \
	beepbox-synth/beepbox_offline_template.html \
	> beepbox-synth/beepbox_offline.html
