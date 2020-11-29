# JummBox

JummBox is an online tool for sketching and sharing instrumental melodies.
You can find it [here](jummbus.bitbucket.io).
It is a modification of the [original BeepBox](https://beepbox.co), focused on improving ease-of-use.

All song data is packaged into the URL at the top of your browser. When you make
changes to the song, the URL is updated to reflect your changes. When you are
satisfied with your song, just copy and paste the URL to save and share your
song!

JummBox is free, as is BeepBox. If you ever feel so inclined, definitely send something to the original creator, [John Nesky](http://www.johnnesky.com/)'s
[PayPal](https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=QZJTX9GRYEV9N&currency_code=USD). He deserves it :)

## Compiling

The compilation procedure is identical to the repository for BeepBox. I will include the excerpt on compiling from that page's readme below for convenience:

The source code is available under the MIT license. The code is written in
[TypeScript](https://www.typescriptlang.org/), which requires
[node & npm](https://www.npmjs.com/get-npm), so install those first. Then to
build this project, open the command line and run:

```
git clone https://github.com/johnnesky/beepbox.git
cd beepbox
npm install
npm run build
```

A note for JummBox: You may also have to install these additional dependencies if they are not picked up automatically.

```
npm install select2
npm install @types/select2
npm install @types/jquery
```


## Code

The code is divided into several folders. Again, this bit is mostly the same as BeepBox. I will include the original excerpt again for reference.

The [synth/](synth) folder has just the code you need to be able to play BeepBox
songs out loud, and you could use this code in your own projects, like a web
game. After compiling the synth code, open website/synth_example.html to see a
demo using it. To rebuild just the synth code, run:

```
npm run build-synth
```

The [editor/](editor) folder has additional code to display the online song
editor interface. After compiling the editor code, open website/index.html to
see the editor interface. To rebuild just the editor code, run:

```
npm run build-editor
```

The [player/](player) folder has a miniature song player interface for embedding
on other sites. To rebuild just the player code, run:

```
npm run build-player
```

The [website/](website) folder contains index.html files to view the interfaces.
The build process outputs JavaScript files into this folder.

## Dependencies

Most of the dependencies are listed in [package.json](package.json), although
I'd like to note that BeepBox also has an indirect, optional dependency on
[lamejs](https://www.npmjs.com/package/lamejs) via
[jsdelivr](https://www.jsdelivr.com/) for exporting .mp3 files. If the user
attempts to export an .mp3 file, BeepBox will direct the browser to download
that dependency on demand.

Note: I am compiling on Windows and "npm run build" setup doesn't work by default. You can get it working by going into package.json and removing the "./" from the paths for the build-synth, build-player, and build-editor rules.
