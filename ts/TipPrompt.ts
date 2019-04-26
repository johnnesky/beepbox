/*
Copyright (C) 2019 John Nesky

Permission is hereby granted, free of charge, to any person obtaining a copy of 
this software and associated documentation files (the "Software"), to deal in 
the Software without restriction, including without limitation the rights to 
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies 
of the Software, and to permit persons to whom the Software is furnished to do 
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all 
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR 
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, 
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE 
SOFTWARE.
*/

/// <reference path="html.ts" />
/// <reference path="Prompt.ts" />

namespace beepbox {
	const {button, div, p, h2, span} = HTML;
	
	export class TipPrompt implements Prompt {
		private readonly _closeButton: HTMLButtonElement = button({className: "cancelButton"});
		
		public readonly container: HTMLDivElement;
		
		constructor(private _doc: SongDocument, type: string) {
			let message: HTMLDivElement;
			
			switch (type) {
				case "scale": {
					message = div(
						h2("Scale"),
						p("This setting limits the available pitches for adding notes. You may think that there's no point in limiting your choices, but the set of pitches you use has a strong influence on the mood and feel of your song, and these scales serve as guides to help you choose appropriate pitches. Don't worry, you can change the scale at any time, so you're not locked into it. Try making little melodies using all of notes of each scale to get a sense for how they sound."),
						p("Most of the scales have a major version, marked with a smiley face, and a minor version, marked with a sad face. Major scales tend to sound more playful or optimistic if you emphasize \"tonic\" notes (the brown rows in the pattern editor) at various points in your melody, whereas minor scales sound more serious or sad if you emphasize \"tonic\" notes."),
					);
				} break;
				case "key": {
					message = div(
						h2("Song Key"),
						p("This setting can shift the frequency of every note in your entire song up or down to align the tonic notes (the brown rows) with the selected \"key\" pitch."),
					);
				} break;
				case "tempo": {
					message = div(
						h2("Song Tempo"),
						p("This setting controls the speed of your song. (You can hover the mouse over the slider to see the beats per minute.)"),
					);
				} break;
				case "reverb": {
					message = div(
						h2("Reverb"),
						p("Reverb is a kind of echo effect. You can use this slider to control the amount of reverb for instruments that enable it. A little bit helps instruments sound more natural. Adding a lot of reverb can add sense of depth or mystery."),
					);
				} break;
				case "rhythm": {
					message = div(
						h2("Rhythm"),
						p("This setting determines how beats are divided. The pattern editor helps you align notes to fractions of a beat based on this setting."),
					);
				} break;
				case "instrumentIndex": {
					message = div(
						h2("Instrument Number"),
						p("BeepBox can have multiple instruments per channel, but it can only play one instrument at a time in each channel. This setting determines which of the instruments should be used to play the currently selected pattern. Different patterns in the channel can use different instruments."),
					);
				} break;
				case "instrumentVolume": {
					message = div(
						h2("Instrument Volume"),
						p("This setting controls the volume of the selected instrument without affecting the volume of the other instruments. This allows you to balance the loudness of each instrument relative to each other."),
					);
				} break;
				case "instrumentType": {
					message = div(
						h2("Instrument Type"),
						p("BeepBox comes with many instrument presets. You can also create your own custom instruments, or even generate random ones!"),
					);
				} break;
				case "filterCutoff": {
					message = div(
						h2("Low-Pass Filter Cutoff Frequency"),
						p("The lowest setting feels \"muffled\" or \"dark\", and the highest setting feels \"harsh\" or \"bright\"."),
						p("Most sounds include a range of frequencies from low to high. BeepBox instruments have a filter that allows the lowest frequencies to pass through at full volume, but can reduce the volume of the higher frequencies that are above a cutoff frequency. This setting controls the cutoff frequency and thus the range of higher frequencies that are reduced."),
						p("This cutoff setting also determines which frequency resonates when the resonance peak setting is used."),
						// TODO: Add a graphic?
					);
				} break;
				case "filterResonance": {
					message = div(
						h2("Low-Pass Filter Resonance Peak"),
						p("Increasing this setting emphasizes a narrow range of frequencies, based on the position of the filter cutoff setting. This can be used to imitate the resonant bodies of acoustic instruments and other interesting effects."),
						p("The filter preserves the volume of frequencies that are below the cutoff frequency, and reduces the volume of frequencies that are above the cutoff. If this setting is used, the filter also increases the volume of frequencies that are near the cutoff."),
						// TODO: Add a graphic?
					);
				} break;
				case "filterEnvelope": {
					message = div(
						h2("Low-Pass Filter Envelope"),
						p("This setting can dynamically change the filter cutoff frequency over time. Try the different options to see how they sound!"),
						p("The \"custom\" option uses the note volume as drawn in the pattern editor as the cutoff envelope."),
					);
				} break;
				case "transition": {
					message = div(
						h2("Transition"),
						p("This setting controls how quickly notes begin and end."),
						p("Hard transitions start suddenly and sound like instruments that are played by hitting or plucking, whereas soft transitions start gradually and sound like instruments that are played by blowing air. Some transitions stop suddenly, but some fade out slowly after the end of the note."),
						p("The \"seamless\" and \"slide\" transitions connect the end of a note with the start of the next note."),
					);
				} break;
				case "chipWave": {
					message = div(
						h2("Chip Wave"),
						p("BeepBox comes with some sound waves based on classic electronic sound chips, as well as several unique waves."),
					);
				} break;
				case "chipNoise": {
					message = div(
						h2("Noise"),
						p("BeepBox comes with several basic noise sounds. These do not have any distinct musical pitch, and can be used like drums to create beats and emphasize your song's rhythm."),
					);
				} break;
				case "pulseEnvelope": {
					message = div(
						h2("Pulse Wave Envelope"),
						p("This setting can dynamically change the pulse width over time. Try the different options to see how they sound!"),
						p("The \"custom\" option uses the note volume as drawn in the pattern editor as the pulse width envelope."),
					);
				} break;
				case "pulseWidth": {
					message = div(
						h2("Pulse Wave Width"),
						p("This setting controls the shape and sound of a pulse wave. At the minimum width, it sounds light and buzzy. At the maximum width, it is shaped like a classic square wave."),
					);
				} break;
				case "interval": {
					message = div(
						h2("Instrument Interval"),
						p("Some BeepBox instrument types can play two waves at slightly different frequencies. The difference between the frequencies is called an \"interval\", and this setting controls how large it is."),
						p("When two similar waves play at slightly different frequencies, they move in and out of phase with each other over time as different parts of the waves line up. This creates a dynamic, shifting sound. Pianos are a common example of this kind of sound, because each piano key strikes multiple strings that are tuned to slightly different frequencies."),
						p("If the interval is large, then the waves can sound out-of-tune and \"dissonant\". If the interval is even larger, then the two frequencies can even be distinct pitches."),
					);
				} break;
				case "chords": {
					message = div(
						h2("Chords"),
						p("When multiple notes occur at the same time, this is called a chord. Chords can be created in BeepBox's pattern editor by adding notes above or below another note."),
						p("This setting determines how chords are played. The standard option is \"harmony\" which plays all of the notes out loud simultaneously. The \"strum\" option is similar, but plays the notes starting at slightly different times. The \"arpeggio\" option is used in \"chiptune\" style music and plays a single tone that rapidly alternates between all of the pitches in the chord."),
						p("Some BeepBox instruments have an option called \"custom interval\" which uses the chord notes to control the interval between the waves of a single tone. This can create strange sound effects when combined with FM modulators."),
					);
				} break;
				case "vibrato": {
					message = div(
						h2("Vibrato"),
						p("This setting causes the frequency of a note to wobble slightly. Singers and violinists often use vibrato."),
					);
				} break;
				case "algorithm": {
					message = div(
						h2("FM Algorithm"),
						p('FM Synthesis is a mysterious but powerful technique for crafting sounds, popularized by Yamaha keyboards and the Sega Genesis/Mega Drive. It may seem confusing, but try playing around with the options until you get a feel for it, or check out some of the preset examples!'),
						p('This FM synthesizer uses up to four waves, numbered 1, 2, 3, and 4. Each wave may have its own frequency, volume, and volume envelope to control its effect over time.'),
						p('There are two kinds of waves: "carrier" waves play a tone out loud, but "modulator" waves distort other waves instead. Wave 1 is always a carrier and plays a tone, but other waves may distort it. The "Algorithm" setting determines which waves are modulators, and which other waves those modulators distort. For example, "1←2" means that wave 2 is modulating wave 1, and wave 1 is played out loud.'),
					);
				} break;
				case "feedbackType": {
					message = div(
						h2("Feedback"),
						p('Modulators distort in one direction (like 1←2), but you can also use the feedback setting to make any wave distort in the opposite direction (1→2), or even itself (1⟲).'),
					);
				} break;
				case "operatorFrequency": {
					message = div(
						h2("Operator Frequency"),
						p('This setting controls the frequency of an individual FM wave. The fundamental frequency (1×) is determined by the pitch of the note, and the frequency (2×) is an octave (12 semitones) above it. The frequencies with a "~" are slightly detuned and shift in and out of phase over time compared to the other frequencies.'),
						p('Try different combinations of a "carrier" wave and a "modulator" wave with different frequencies to get a feel for how they sound together.'),
					);
				} break;
				case "operatorVolume": {
					message = div(
						h2("Operator Volume"),
						p("This setting controls the volume of \"carrier\" waves, or the amount of distortion that \"modulator\" waves apply to other waves."),
					);
				} break;
				case "operatorEnvelope": {
					message = div(
						h2("Operator Envelope"),
						p("This setting can dynamically change the FM wave volume over time. Try the different options to see how they sound!"),
						p("The \"custom\" option uses the note volume as drawn in the pattern editor as the FM wave envelope."),
					);
				} break;
				case "spectrum": {
					message = div(
						h2("Spectrum"),
						p("This setting allows you to draw your own noise spectrum! This is good for making drum sounds when combined with a hard transition and a falling filter cutoff envelope."),
						p("If you only use certain frequencies and a soft transition, it's also possible to make howling wind sounds or even musical blown bottle sounds."),
						p("The left side of the spectrum editor controls the noise energy at lower frequencies, and the right side controls higher frequencies."),
					);
				} break;
				case "harmonics": {
					message = div(
						h2("Harmonics"),
						p("This setting allows you to design your own sound wave! Most musical waves are actually a combination of sine waves at certain frequencies, and this lets you control the volume of each sine wave individually."),
						p("The left side of the harmonics editor controls the sine wave volumes at lower frequencies, and the right side controls higher frequencies."),
					);
				} break;
				case "effects": {
					message = div(
						h2("Effects"),
						p("BeepBox has two special effects you can add to instruments. You can turn on either effect, or both at once."),
						p("Reverb is a kind of echo effect. You can use the \"reverb\" slider in the \"Song Settings\" section above to control the amount of reverb for instruments that enable it. A little bit helps instruments sound more natural. Adding a lot of reverb can add sense of depth or mystery."),
						p("The chorus effect combines multiple copies of the instrument's sound and adds a bit of vibrato to simulate an ensemble of instruments or voices."),
					);
				} break;
				case "drumsetEnvelope": {
					message = div(
						h2("Drumset Envelope"),
						p("This setting can dynamically change the filter cutoff frequency over time. Each row in the pattern editor gets its own envelope."),
						p("The \"custom\" option uses the note volume as drawn in the pattern editor as the drumset cutoff envelope."),
					);
				} break;
				case "drumsetSpectrum": {
					message = div(
						h2("Drumset Spectrum"),
						p("This setting allows you to draw your own noise spectrum! This is good for making drumsets. Each row in the pattern editor gets its own spectrum."),
						p("The left side of the spectrum editor controls the noise energy at lower frequencies, and the right side controls higher frequencies."),
					);
				} break;
				default: throw new Error("Unhandled TipPrompt type: " + type);
			}
			
			this.container = div({className: "prompt", style: "width: 250px;"},
				message,
				this._closeButton,
			);
			
			setTimeout(()=>this._closeButton.focus());
			
			this._closeButton.addEventListener("click", this._close);
		}
		
		private _close = (): void => { 
			this._doc.undo();
		}
		
		public cleanUp = (): void => { 
			this._closeButton.removeEventListener("click", this._close);
		}
	}
}
