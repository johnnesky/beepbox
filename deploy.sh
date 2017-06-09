#!/bin/bash

echo -n 'Are you sure you want to deploy? (y/n)? '
read answer
if echo "$answer" | grep -iq '^y'; then
    echo 'Deploying...'
else
    exit
fi

./compile_beepbox_synth.sh

./compile_beepbox_editor.sh

gcloud app deploy --project beepbox-synth beepbox-synth/app.yaml
