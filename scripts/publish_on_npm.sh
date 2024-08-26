#!/bin/bash
set -e

# Build, bundle, and minify all code.
npm run build

# Make directories in dist/ for the code.
mkdir -p dist/esm
mkdir -p dist/global

# Copy the code and license into dist/.
rsync -r --exclude=.DS_Store synth dist/
cp -r build/synth dist/esm/
cp -r bundle/beepbox_synth* dist/global/
cp -r LICENSE.md dist/

# Publish as an npm package.
npm publish ./dist
