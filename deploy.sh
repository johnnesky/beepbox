#!/bin/bash

echo -n 'Are you sure you want to deploy? (y/n)? '
read answer
if echo "$answer" | grep -iq '^y'; then
    echo 'Deploying...'
else
    exit
fi

make

gcloud app deploy --project beepbox-synth website/app.yaml
