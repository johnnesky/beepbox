# BeepBox

BeepBox is an online tool for sketching and sharing instrumental melodies.
Try it out [here](https://beepbox.co)!

All song data is packaged into the URL at the top of your browser. When you make
changes to the song, the URL is updated to reflect your changes. When you are
satisfied with your song, just copy and paste the URL to save and share your
song!

BeepBox is a passion project, and will always be free to use. If you find it
valuable and have the means, any gratuity via
[PayPal](https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=QZJTX9GRYEV9N&currency_code=USD)
would be appreciated!

Beep Box is developed by [John Nesky](http://www.johnnesky.com/).

## Compiling

The source code is available under the MIT license. The code is written in
[TypeScript](https://www.typescriptlang.org/), which requires
[node/npm](https://www.npmjs.com/get-npm), so install that first. Then to build
this project, open the command line and run:

```
git clone https://github.com/johnnesky/beepbox.git
cd beepbox
npm install
npm run build
```

## Code

The code is divided into several folders.

The synth/ folder has just the code you need to be able to play BeepBox songs
out loud, and you could use this code in your own projects, like a web game.
After compiling the synth code, open website/synth_example.html to see a demo
using it. To rebuild just the synth code, run:

```
npm run build-synth
```

The editor/ folder has additional code to display the online song editor
interface. After compiling the editor code, open website/index.html to see the
editor interface. To rebuild just the editor code, run:

```
npm run build-editor
```

The player/ folder has a miniature song player interface for embedding on other
sites. To rebuild just the player code, run:

```
npm run build-player
```

The website/ folder contains index.html files to view the interfaces. The build
process outputs JavaScript files into this folder.
