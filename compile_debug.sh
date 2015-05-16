#!/bin/bash

if 

mxmlc -target-player=11.1 -debug=true -source-path=as -static-link-runtime-shared-libraries -output=beepbox-synth/BeepBoxDebug.swf as/MainOffline.mxml;

then

open beepbox-synth/BeepBoxDebug.swf;

else

printf "\a";  # makes a beep sound!

fi