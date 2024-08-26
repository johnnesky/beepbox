# BeepBox

BeepBox is a music synthesizer, along with an online editor for authoring songs that you can try out at [beepbox.co](https://www.beepbox.co)!

The editor stores all song data in the URL as text after the hash mark, and this song data can be easily copied and shared. You can use the code in this npm package to synthesize music out loud from this song data, just like in the editor!

BeepBox is a passion project, and will always be free to use. If you find it valuable and have the means, any gratuity via [PayPal](https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=QZJTX9GRYEV9N&currency_code=USD) would be appreciated! BeepBox is developed by [John Nesky](https://johnnesky.com/), and this code is available under the [MIT license](https://github.com/johnnesky/beepbox/blob/main/LICENSE.md).

## Getting the synthesizer without installing anything

You can easily use a script tag to load the synthesizer code, then use the global `beepbox` namespace to access the synthesizer:

```html
<script src="https://cdn.jsdelivr.net/npm/beepbox/global/beepbox_synth.min.js"></script>
<script>
	const {Synth} = beepbox;
</script>
```

## Installing the code from npm

If you're using npm, you can use that to install the synthesizer on the command line:

```shell
npm install beepbox
```

And then in your code you can import the synthesizer as a module:

```javascript
import {Synth} from "beepbox";
```

Deploying code to your website that was written in this manner is a complex subject that's outside the scope of this README, but the advantage is that you can use many advanced tools, including TypeScript.

## Using the synthesizer

Either way, you can use the Synth class in your code to play and pause songs using the song data that you can copy from the URL above BeepBox's online editor:

```javascript
var synth = new Synth("#9n30sbk7l00e00t2-a7g00j00r1i0o443T0v2u00f0qw02d03w2h0E0T0v2u00f0qw02d03w2h0E0T0v0u00f0qw02d03w1h0E0bUp1OFEYtghQ4sBihS7dQQuwE8W2eywzwPbGcKCzZk4t17hghQCngpo");

document.getElementById("playButton").addEventListener("click", event => {
	if (synth.isPlayingSong) {
		synth.pause();
	} else {
		synth.play();
	}
});
```

Make sure that the playback is [triggered by a user input event](https://developer.mozilla.org/en-US/docs/Web/Media/Autoplay_guide), such as a "click" event.

## Beepbox-Lite

The npm package called `beepbox` has changed. If you were using npm to access the `beepbox` package before 2024-09, that version of the package has moved to [beepbox-lite](https://www.npmjs.com/package/beepbox-lite). Please update your dependencies!
