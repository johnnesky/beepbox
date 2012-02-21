#!/bin/bash

mxmlc -target-player=11.1 -debug=true -source-path=src -static-link-runtime-shared-libraries -output=beepbox-synth/BeepBox.swf src/Main.mxml;
