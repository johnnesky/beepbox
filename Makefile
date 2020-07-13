ifneq (,$(wildcard node_modules/typescript))
	export TSC="./node_modules/typescript/bin/tsc"
else
	export TSC="tsc"
endif

ifneq (,$(wildcard node_modules/uglify-js))
	export UGLIFYJS="./node_modules/uglify-js/bin/uglifyjs"
else
	export UGLIFYJS="uglifyjs"
endif

.PHONY: editor player synth

all: editor player synth

editor:
	# Compile editor/main.ts into website/beepbox_editor.js
	$(TSC)

	# Minify website/beepbox_editor.js into website/beepbox_editor.min.js
	$(UGLIFYJS) \
	--compress \
	--mangle \
	--mangle-props regex="/^_.+/;" \
	website/beepbox_editor.js \
	-o website/beepbox_editor.min.js

	# Combine the html and js into a single file for the offline version
	sed \
	-e '/INSERT_BEEPBOX_SOURCE_HERE/{r website/beepbox_editor.min.js' -e 'd' -e '}' \
	website/beepbox_offline_template.html \
	> website/beepbox_offline.html

player:
	# Compile player/main.ts into website/player/beepbox_player.js
	$(TSC) -p tsconfig_player.json

	# Minify website/player/beepbox_player.js
	# into website/player/beepbox_player.min.js
	$(UGLIFYJS) \
	--compress \
	--mangle \
	--mangle-props regex="/^_.+/;" \
	website/player/beepbox_player.js \
	-o website/player/beepbox_player.min.js


synth:
	# Compile synth/synth.ts into website/beepbox_synth.js
	$(TSC) -p tsconfig_synth_only.json

	# Minify website/beepbox_synth.js into website/beepbox_synth.min.js
	$(UGLIFYJS) \
	--compress \
	--mangle \
	--mangle-props regex="/^_.+/;" \
	website/beepbox_synth.js \
	-o website/beepbox_synth.min.js

