#!/bin/bash

npm run build

gcloud app deploy --project beepbox-synth website/app.yaml
