#!/bin/bash

mxmlc -target-player=11.1 -source-path=as -static-link-runtime-shared-libraries -output=beepbox-synth/BeepBoxEmbedded.swf as/MainEmbedded.as;
