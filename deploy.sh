#!/bin/bash

echo -n 'Are you sure you want to deploy? (y/n)? '
read answer
if echo "$answer" | grep -iq '^y'; then
    echo 'Deploying...'
else
    exit
fi

if [ -d "node_modules/typescript" ]; then
    export TSC="./node_modules/typescript/bin/tsc"
else
    export TSC="tsc"
fi

if [ -d "node_modules/uglify-js" ]; then
    export UGLIFYJS="./node_modules/uglify-js/bin/uglifyjs"
else
    export UGLIFYJS="uglifyjs"
fi

./compile_beepbox_synth.sh

./compile_beepbox_editor.sh

./compile_beepbox_player.sh

gcloud app deploy --project beepbox-synth website/app.yaml
