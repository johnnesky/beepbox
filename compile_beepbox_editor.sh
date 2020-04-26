#!/bin/bash

# Compile editor/main.ts into website/beepbox_editor.js
tsc

# Minify website/beepbox_editor.js into website/beepbox_editor.min.js
uglifyjs \
	--compress \
	--mangle \
	--mangle-props regex="/^_.+/;" \
	website/beepbox_editor.js \
	-o website/beepbox_editor.min.js

# Combine the html and js into a single file for the offline version
sed \
	-e '/INSERT_BEEPBOX_SOURCE_HERE/{r website/beepbox_editor.min.js' -e 'd' -e '}' \
	website/jummbox_offline_template.html \
	> website/jummbox_offline.html
