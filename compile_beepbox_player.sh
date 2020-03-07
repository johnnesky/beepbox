#!/bin/bash

# Compile player/main.ts into website/player/beepbox_player.js
tsc -p tsconfig_player.json

# Minify website/player/beepbox_player.js into website/player/beepbox_player.min.js
uglifyjs \
	--compress \
	--mangle \
	--mangle-props regex="/^_.+/;" \
	website/player/beepbox_player.js \
	-o website/player/beepbox_player.min.js
