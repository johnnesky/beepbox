#!/bin/bash

if 

mxmlc -target-player=11.1 -debug=true -source-path=src -static-link-runtime-shared-libraries -output=site/BeepBoxDebug.swf src/MainOffline.mxml;

then

open site/BeepBoxDebug.swf;

else

printf "\a";  # makes a beep sound!

fi