#!/bin/bash

#tsc --target ES5 ts/SongEditor.ts --out beepbox-synth/beepbox_editor.js;
tsc --target ES5 ts/SongEditor.ts --out beepbox-synth/beepbox_editor.js --noImplicitReturns --noFallthroughCasesInSwitch --removeComments;
#tsc --target ES5 ts/SongEditor.ts --out beepbox-synth/beepbox_editor.js --noImplicitAny --noImplicitReturns --strictNullChecks --noFallthroughCasesInSwitch --removeComments;
