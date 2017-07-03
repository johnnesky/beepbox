/*
Copyright (C) 2012 John Nesky

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

package beepbox.synth {
	
	import flash.events.SampleDataEvent;
	import flash.events.TimerEvent;
	import flash.media.Sound;
	import flash.media.SoundChannel;
	import flash.utils.Timer;
	import flash.utils.ByteArray;
	
	public class Synth {
		public const samplesPerSecond: int = 44100;
		private const effectDuration: Number = 0.14;
		private const effectAngle: Number = Math.PI * 2.0 / (effectDuration * samplesPerSecond);
		private const effectYMult: Number = 2.0 * Math.cos( effectAngle );
		private const limitDecay: Number = 1.0 / (2.0 * samplesPerSecond);
		private const waves: Vector.<Vector.<Number>> = new <Vector.<Number>> [
			new <Number>[1.0/15.0, 3.0/15.0, 5.0/15.0, 7.0/15.0, 9.0/15.0, 11.0/15.0, 13.0/15.0, 15.0/15.0, 15.0/15.0, 13.0/15.0, 11.0/15.0, 9.0/15.0, 7.0/15.0, 5.0/15.0, 3.0/15.0, 1.0/15.0, -1.0/15.0, -3.0/15.0, -5.0/15.0, -7.0/15.0, -9.0/15.0, -11.0/15.0, -13.0/15.0, -15.0/15.0, -15.0/15.0, -13.0/15.0, -11.0/15.0, -9.0/15.0, -7.0/15.0, -5.0/15.0, -3.0/15.0, -1.0/15.0],
			new <Number>[1.0, -1.0],
			new <Number>[1.0, -1.0, -1.0, -1.0],
			new <Number>[1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0],
			new <Number>[1.0/31.0, 3.0/31.0, 5.0/31.0, 7.0/31.0, 9.0/31.0, 11.0/31.0, 13.0/31.0, 15.0/31.0, 17.0/31.0, 19.0/31.0, 21.0/31.0, 23.0/31.0, 25.0/31.0, 27.0/31.0, 29.0/31.0, 31.0/31.0, -31.0/31.0, -29.0/31.0, -27.0/31.0, -25.0/31.0, -23.0/31.0, -21.0/31.0, -19.0/31.0, -17.0/31.0, -15.0/31.0, -13.0/31.0, -11.0/31.0, -9.0/31.0, -7.0/31.0, -5.0/31.0, -3.0/31.0, -1.0/31.0],
			new <Number>[0.0, -0.2, -0.4, -0.6, -0.8, -1.0, 1.0, -0.8, -0.6, -0.4, -0.2, 1.0, 0.8, 0.6, 0.4, 0.2, ],
			new <Number>[1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, 1.0, 1.0, 1.0, 1.0, -1.0, -1.0, -1.0, -1.0],
			new <Number>[1.0, -1.0, 1.0, -1.0, 1.0, 0.0],
			new <Number>[0.0, 0.2, 0.4, 0.5, 0.6, 0.7, 0.8, 0.85, 0.9, 0.95, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0.95, 0.9, 0.85, 0.8, 0.7, 0.6, 0.5, 0.4, 0.2, 0.0, -0.2, -0.4, -0.5, -0.6, -0.7, -0.8, -0.85, -0.9, -0.95, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -0.95, -0.9, -0.85, -0.8, -0.7, -0.6, -0.5, -0.4, -0.2, ],
		];
		private const drumWaves: Vector.<Vector.<Number>> = new <Vector.<Number>> [
			new Vector.<Number>(),
			new Vector.<Number>(),
		];
		
		public var song: Song = null;
		public var stutterPressed: Boolean = false;
		public var pianoPressed: Boolean = false;
		public var pianoPitch: int = 0;
		public var pianoChannel: int = 0;
		public var enableIntro: Boolean = true;
		public var enableOutro: Boolean = false;
		public var loopCount: int = -1;
		public var volume: Number = 1.0;
		
		private var _playhead: Number = 0.0;
		private var bar: int = 0;
		private var beat: int = 0;
		private var part: int = 0;
		private var arpeggio: int = 0;
		private var arpeggioSamples: int = 0;
		private var paused: Boolean = true;
		private var leadPeriodA: Number = 0.0;
		private var leadPeriodB: Number = 0.0;
		private var leadSample: Number = 0.0;
		private var harmonyPeriodA: Number = 0.0;
		private var harmonyPeriodB: Number = 0.0;
		private var harmonySample: Number = 0.0;
		private var bassPeriodA: Number = 0.0;
		private var bassPeriodB: Number = 0.0;
		private var bassSample: Number = 0.0;
		private var drumPeriod: Number = 0.0;
		private var drumSample: Number = 0.0;
		private var drumSignal: Number = 1.0;
		private var stillGoing: Boolean = false;
		private var sound: Sound = new Sound();
		private var soundChannel: SoundChannel = null;
		private var timer: Timer = new Timer(200, 0);
		private var effectPeriod: Number = 0.0;
		private var limit: Number = 0.0;
		
		private var delayLine: Vector.<Number> = new Vector.<Number>(16384, true);
		private var delayPos: int = 0;
		private var delayFeedback0: Number = 0.0;
		private var delayFeedback1: Number = 0.0;
		private var delayFeedback2: Number = 0.0;
		private var delayFeedback3: Number = 0.0;
		
		public function get playing(): Boolean {
			return !paused;
		}
		
		public function get playhead(): Number {
			return _playhead;
		}
		
		public function set playhead(value: Number): void {
			if (song != null) {
				_playhead = Math.max(0, Math.min(song.bars, value));
				var remainder: Number = _playhead;
				bar = Math.floor(remainder);
				remainder = song.beats * (remainder - bar);
				beat = Math.floor(remainder);
				remainder = song.parts * (remainder - beat);
				part = Math.floor(remainder);
				remainder = 4 * (remainder - part);
				arpeggio = Math.floor(remainder);
				var samplesPerArpeggio: Number = getSamplesPerArpeggio();
				remainder = samplesPerArpeggio * (remainder - arpeggio);
				arpeggioSamples = Math.floor(samplesPerArpeggio - remainder);
				if (bar < song.loopStart) {
					enableIntro = true;
				}
				if (bar > song.loopStart + song.loopLength) {
					enableOutro = true;
				}
			}
		}
		
		public function get totalSamples(): int {
			if (song == null) return 0;
			var samplesPerBar: int = getSamplesPerArpeggio() * 4 * song.parts * song.beats;
			var loopMinCount: int = loopCount;
			if (loopMinCount < 0) loopMinCount = 1;
			var bars: int = song.loopLength * loopMinCount;
			if (enableIntro) bars += song.loopStart;
			if (enableOutro) bars += song.bars - (song.loopStart + song.loopLength);
			return bars * samplesPerBar;
		}
		
		public function get totalSeconds(): Number {
			return totalSamples / samplesPerSecond;
		}
		
		public function get totalBars(): Number {
			if (song == null) return 0.0;
			return song.bars;
		}
		
		public function Synth(song: * = null) {
			var i: int;
			var wave: Vector.<Number>;
			
			waves.fixed = true;
			for each (wave in waves) {
				wave.fixed = true;
				var sum: Number = 0.0;
				for (i = 0; i < wave.length; i++) sum += wave[i];
				var average: Number = sum / wave.length;
				for (i = 0; i < wave.length; i++) wave[i] -= average;
			}
			
			drumWaves.fixed = true;
			for each (wave in drumWaves) {
				if (drumWaves.indexOf(wave) == 0) {
					var drumBuffer: int = 1;
					for (i = 0; i < 32767; i++) {
						wave.push((drumBuffer & 1) * 2.0 - 1.0);
						var newBuffer: int = drumBuffer >> 1;
						if ((drumBuffer + newBuffer) & 1 == 1) {
							newBuffer += 1 << 14;
						}
						drumBuffer = newBuffer;
					}
				} else if (drumWaves.indexOf(wave) == 1) {
					for (i = 0; i < 32767; i++) {
						wave.push(Math.random() * 2.0 - 1.0);
					}
				}
				wave.fixed = true;
			}
			
			sound.addEventListener(SampleDataEvent.SAMPLE_DATA, onSampleData, false, 0, true);
			timer.addEventListener(TimerEvent.TIMER, checkSound);
			
			if (song != null) {
				setSong(song);
			}
		}
		
		public function setSong(song: *): void {
			if (song is String) {
				this.song = new Song(song);
			} else if (song is Song) {
				this.song = song;
			}
		}
		
		public function play(): void {
			if (!paused) return;
			paused = false;
			soundChannel = sound.play();
			timer.start();
			stillGoing = true;
		}
		
		public function pause(): void {
			if (paused) return;
			paused = true;
			soundChannel.stop();
			soundChannel = null;
			timer.stop();
			stillGoing = false;
		}
		
		public function snapToStart(): void {
			bar = 0;
			enableIntro = true;
			snapToBar();
		}
		
		public function snapToBar(): void {
			_playhead = bar;
			beat = 0;
			part = 0;
			arpeggio = 0;
			arpeggioSamples = 0;
			effectPeriod = 0.0;
			
			leadSample = 0.0;
			harmonySample = 0.0;
			bassSample = 0.0;
			drumSample = 0.0;
			delayPos = 0;
			delayFeedback0 = 0.0;
			delayFeedback1 = 0.0;
			delayFeedback2 = 0.0;
			delayFeedback3 = 0.0;
			for (var i: int = 0; i < delayLine.length; i++) delayLine[i] = 0.0;
		}
		
		public function nextBar(): void {
			var oldBar: int = bar;
			bar++;
			if (enableOutro) {
				if (bar >= song.bars) {
					bar = enableIntro ? 0 : song.loopStart;
				}
			} else {
				if (bar >= song.loopStart + song.loopLength || bar >= song.bars) {
					bar = song.loopStart;
				}
			}
			_playhead += bar - oldBar;
		}
		
		public function prevBar(): void {
			var oldBar: int = bar;
			bar--;
			if (bar < 0) {
				bar = song.loopStart + song.loopLength - 1;
			}
			if (bar >= song.bars) {
				bar = song.bars - 1;
			}
			if (bar < song.loopStart) {
				enableIntro = true;
			}
			if (!enableOutro && bar >= song.loopStart + song.loopLength) {
				bar = song.loopStart + song.loopLength - 1;
			}
			_playhead += bar - oldBar;
		}
		
		private function onSampleData(event: SampleDataEvent): void {
			if (paused) {
				return;
			} else {
				synthesize(event.data, 4096);
			}
			stillGoing = true;
		}
		
		private function checkSound(event: TimerEvent): void {
			if (!stillGoing) {
				if (soundChannel != null) {
					soundChannel.stop();
				}
				soundChannel = sound.play();
			} else {
				stillGoing = false;
			}
		}
		
		public function synthesize(data: ByteArray, totalSamples: int): void {
			if (song == null) {
				for (i = 0; i < totalSamples; i++) {
					data.writeFloat(0.0);
					data.writeFloat(0.0);
				}
				return;
			}
			
			var stutterFunction: Function;
			if (stutterPressed) {
				var barOld: int = bar;
				var beatOld: int = beat;
				var partOld: int = part;
				var arpeggioOld: int = arpeggio;
				var arpeggioSamplesOld: int = arpeggioSamples;
				var leadPeriodAOld: Number = leadPeriodA;
				var leadPeriodBOld: Number = leadPeriodB;
				var leadSampleOld: Number = leadSample;
				var harmonyPeriodAOld: Number = harmonyPeriodA;
				var harmonyPeriodBOld: Number = harmonyPeriodB;
				var harmonySampleOld: Number = harmonySample;
				var bassPeriodAOld: Number = bassPeriodA;
				var bassPeriodBOld: Number = bassPeriodB;
				var bassSampleOld: Number = bassSample;
				var drumPeriodOld: Number = drumPeriod;
				var drumSampleOld: Number = drumSample;
				var drumSignalOld: Number = drumSignal;
				var effectPeriodOld: Number = effectPeriod;
				var limitOld: Number = limit;
				stutterFunction = function(): void {
					bar = barOld;
					beat = beatOld;
					part = partOld;
					arpeggio = arpeggioOld;
					arpeggioSamples = arpeggioSamplesOld;
					leadPeriodA = leadPeriodAOld;
					leadPeriodB = leadPeriodBOld;
					leadSample = leadSampleOld;
					harmonyPeriodA = harmonyPeriodAOld;
					harmonyPeriodB = harmonyPeriodBOld;
					harmonySample = harmonySampleOld;
					bassPeriodA = bassPeriodAOld;
					bassPeriodB = bassPeriodBOld;
					bassSample = bassSampleOld;
					drumPeriod = drumPeriodOld;
					drumSample = drumSampleOld;
					drumSignal = drumSignalOld;
					effectPeriod = effectPeriodOld;
					limit = limitOld;
				}
			}
			
			
			var i: int;
			
			var sampleTime: Number = 1.0 / samplesPerSecond;
			var samplesPerArpeggio: int = getSamplesPerArpeggio();
			
			var reverb: Number = Math.pow(song.reverb / Music.reverbRange, 0.667) * 0.375;
			
			var ended: Boolean = false;

			// Check the bounds of the playhead:
			if (arpeggioSamples == 0 || arpeggioSamples > samplesPerArpeggio) {
				arpeggioSamples = samplesPerArpeggio;
			}
			if (part >= song.parts) {
				beat++;
				part = 0;
				arpeggio = 0;
				arpeggioSamples = samplesPerArpeggio;
			}
			if (beat >= song.beats) {
				bar++;
				beat = 0;
				part = 0;
				arpeggio = 0;
				arpeggioSamples = samplesPerArpeggio;
				
				if (loopCount == -1) {
					if (bar < song.loopStart && !enableIntro) bar = song.loopStart;
					if (bar >= song.loopStart + song.loopLength && !enableOutro) bar = song.loopStart;
				}
			}
			if (bar >= song.bars) {
				if (enableOutro) {
					bar = 0;
					enableIntro = true;
					ended = true;
					pause();
				} else {
					bar = song.loopStart;
				}
			}
			if (bar >= song.loopStart) {
				enableIntro = false;
			}
			
			var maxLeadVolume:    Number;
			var maxHarmonyVolume: Number;
			var maxBassVolume:    Number;
			var maxDrumVolume:    Number;
			
			var leadWave:    Vector.<Number>;
			var harmonyWave: Vector.<Number>;
			var bassWave:    Vector.<Number>;
			var drumWave:    Vector.<Number>;
			
			var leadWaveLength:    int;
			var harmonyWaveLength: int;
			var bassWaveLength:    int;
			
			var leadFilterBase:    Number;
			var harmonyFilterBase: Number;
			var bassFilterBase:    Number;
			var drumFilter: Number;
			
			var leadTremeloScale:    Number;
			var harmonyTremeloScale: Number;
			var bassTremeloScale:    Number;
			
			var leadChorusA:    Number;
			var harmonyChorusA: Number;
			var bassChorusA:    Number;
			var leadChorusB:    Number;
			var harmonyChorusB: Number;
			var bassChorusB:    Number;
			var leadChorusSign: Number;
			var harmonyChorusSign: Number;
			var bassChorusSign: Number;
			
			var updateInstruments: Function = function(): void {
				var instrumentLead: int    = song.getPatternInstrument(0, bar);
				var instrumentHarmony: int = song.getPatternInstrument(1, bar);
				var instrumentBass: int    = song.getPatternInstrument(2, bar);
				var instrumentDrum: int    = song.getPatternInstrument(3, bar);
				
				maxLeadVolume    = Music.channelVolumes[0] * (song.instrumentVolumes[0][instrumentLead] == 5 ? 0.0 :    Math.pow(2, -Music.volumeValues[song.instrumentVolumes[0][instrumentLead]]))    * Music.waveVolumes[song.instrumentWaves[0][instrumentLead]]    * Music.filterVolumes[song.instrumentFilters[0][instrumentLead]]    * Music.chorusVolumes[song.instrumentChorus[0][instrumentLead]]    * 0.5;
				maxHarmonyVolume = Music.channelVolumes[1] * (song.instrumentVolumes[1][instrumentHarmony] == 5 ? 0.0 : Math.pow(2, -Music.volumeValues[song.instrumentVolumes[1][instrumentHarmony]])) * Music.waveVolumes[song.instrumentWaves[1][instrumentHarmony]] * Music.filterVolumes[song.instrumentFilters[1][instrumentHarmony]] * Music.chorusVolumes[song.instrumentChorus[0][instrumentHarmony]] * 0.5;
				maxBassVolume    = Music.channelVolumes[2] * (song.instrumentVolumes[2][instrumentBass] == 5 ? 0.0 :    Math.pow(2, -Music.volumeValues[song.instrumentVolumes[2][instrumentBass]]))    * Music.waveVolumes[song.instrumentWaves[2][instrumentBass]]    * Music.filterVolumes[song.instrumentFilters[2][instrumentBass]]    * Music.chorusVolumes[song.instrumentChorus[0][instrumentBass]]    * 0.5;
				maxDrumVolume    = Music.channelVolumes[3] * (song.instrumentVolumes[3][instrumentDrum] == 5 ? 0.0 :    Math.pow(2, -Music.volumeValues[song.instrumentVolumes[3][instrumentDrum]]))    * Music.drumVolumes[song.instrumentWaves[3][instrumentDrum]];
				
				leadWave    = waves[song.instrumentWaves[0][instrumentLead]];
				harmonyWave = waves[song.instrumentWaves[1][instrumentHarmony]];
				bassWave    = waves[song.instrumentWaves[2][instrumentBass]];
				drumWave    = drumWaves[song.instrumentWaves[3][instrumentDrum]];
				
				leadWaveLength    = leadWave.length;
				harmonyWaveLength = harmonyWave.length;
				bassWaveLength    = bassWave.length;
				
				leadFilterBase    = Math.pow(2, -Music.filterBases[song.instrumentFilters[0][instrumentLead]]);
				harmonyFilterBase = Math.pow(2, -Music.filterBases[song.instrumentFilters[1][instrumentHarmony]]);
				bassFilterBase    = Math.pow(2, -Music.filterBases[song.instrumentFilters[2][instrumentBass]]);
				drumFilter = 1.0;
				
				leadTremeloScale    = Music.effectTremelos[song.instrumentEffects[0][instrumentLead]];
				harmonyTremeloScale = Music.effectTremelos[song.instrumentEffects[1][instrumentHarmony]];
				bassTremeloScale    = Music.effectTremelos[song.instrumentEffects[2][instrumentBass]];
				
				leadChorusA    = Math.pow( 2.0, (Music.chorusOffsets[song.instrumentChorus[0][instrumentLead]] + Music.chorusValues[song.instrumentChorus[0][instrumentLead]]) / 12.0 );
				harmonyChorusA = Math.pow( 2.0, (Music.chorusOffsets[song.instrumentChorus[1][instrumentHarmony]] + Music.chorusValues[song.instrumentChorus[1][instrumentHarmony]]) / 12.0 );
				bassChorusA    = Math.pow( 2.0, (Music.chorusOffsets[song.instrumentChorus[2][instrumentBass]] + Music.chorusValues[song.instrumentChorus[2][instrumentBass]]) / 12.0 );
				leadChorusB    = Math.pow( 2.0, (Music.chorusOffsets[song.instrumentChorus[0][instrumentLead]] - Music.chorusValues[song.instrumentChorus[0][instrumentLead]]) / 12.0 );
				harmonyChorusB = Math.pow( 2.0, (Music.chorusOffsets[song.instrumentChorus[1][instrumentHarmony]] - Music.chorusValues[song.instrumentChorus[1][instrumentHarmony]]) / 12.0 );
				bassChorusB    = Math.pow( 2.0, (Music.chorusOffsets[song.instrumentChorus[2][instrumentBass]] - Music.chorusValues[song.instrumentChorus[2][instrumentBass]]) / 12.0 );
				leadChorusSign = (song.instrumentChorus[0][instrumentLead] == 7) ? -1.0 : 1.0;
				harmonyChorusSign = (song.instrumentChorus[1][instrumentHarmony] == 7) ? -1.0 : 1.0;
				bassChorusSign = (song.instrumentChorus[2][instrumentBass] == 7) ? -1.0 : 1.0;
				if (song.instrumentChorus[0][instrumentLead] == 0) leadPeriodB = leadPeriodA;
				if (song.instrumentChorus[1][instrumentHarmony] == 0) harmonyPeriodB = harmonyPeriodA;
				if (song.instrumentChorus[2][instrumentBass] == 0) bassPeriodB = bassPeriodA;
			}
			
			updateInstruments();
			
			while (totalSamples > 0) {
				if (ended) {
					while (totalSamples-- > 0) {
						data.writeFloat(0.0);
						data.writeFloat(0.0);
					}
					break;
				}
				
				var samples: int;
				if (arpeggioSamples <= totalSamples) {
					samples = arpeggioSamples;
				} else {
					samples = totalSamples;
				}
				totalSamples -= samples;
				arpeggioSamples -= samples;
				
				var leadPeriodDelta: Number;
				var leadPeriodDeltaScale: Number;
				var leadVolume: Number;
				var leadVolumeDelta: Number;
				var leadFilter: Number;
				var leadFilterScale: Number;
				var leadVibratoScale: Number;
				var harmonyPeriodDelta: Number;
				var harmonyPeriodDeltaScale: Number;
				var harmonyVolume: Number;
				var harmonyVolumeDelta: Number;
				var harmonyFilter: Number;
				var harmonyFilterScale: Number;
				var harmonyVibratoScale: Number;
				var bassPeriodDelta: Number;
				var bassPeriodDeltaScale: Number;
				var bassVolume: Number;
				var bassVolumeDelta: Number;
				var bassFilter: Number;
				var bassFilterScale: Number;
				var bassVibratoScale: Number;
				var drumPeriodDelta: Number;
				var drumPeriodDeltaScale: Number;
				var drumVolume: Number;
				var drumVolumeDelta: Number;
				var time: int = part + beat * song.parts;
				
				for (var channel: int = 0; channel < 4; channel++) {
					var pattern: BarPattern = song.getPattern(channel, bar);
					
					var attack: int = pattern == null ? 0 : song.instrumentAttacks[channel][pattern.instrument];
					
					var note: Note = null;
					var prevNote: Note = null;
					var nextNote: Note = null;
					if (pattern != null) {
						for (i = 0; i < pattern.notes.length; i++) {
							if (pattern.notes[i].end <= time) {
								prevNote = pattern.notes[i];
							} else if (pattern.notes[i].start <= time && pattern.notes[i].end > time) {
								note = pattern.notes[i];
							} else if (pattern.notes[i].start > time) {
								nextNote = pattern.notes[i];
								break;
							}
						}
					}
					if (note != null && prevNote != null && prevNote.end != note.start) prevNote = null;
					if (note != null && nextNote != null && nextNote.start != note.end) nextNote = null;
					
					var channelRoot: int = channel == 3 ? 69 : Music.keyTransposes[song.key];
					var intervalScale: int = channel == 3 ? Music.drumInterval : 1;
					var periodDelta: Number;
					var periodDeltaScale: Number;
					var noteVolume: Number;
					var volumeDelta: Number;
					var filter: Number;
					var filterScale: Number;
					var vibratoScale: Number;
					var resetPeriod: Boolean = false;
					if (pianoPressed && channel == pianoChannel) {
						var pianoFreq: Number = frequencyFromPitch(channelRoot + pianoPitch * intervalScale);
						var pianoPitchDamping: Number;
						if (channel == 3) {
							if (song.instrumentWaves[3][pattern.instrument] > 0) {
								drumFilter = Math.min(1.0, pianoFreq * sampleTime * 8.0);
								pianoPitchDamping = 24.0;
							} else {
								pianoPitchDamping = 60.0;
							}
						} else {
							pianoPitchDamping = 48.0;
						}
						periodDelta = pianoFreq * sampleTime;
						periodDeltaScale = 1.0;
						noteVolume = Math.pow(2.0, -pianoPitch * intervalScale / pianoPitchDamping);
						volumeDelta = 0.0;
						filter = 1.0;
						filterScale = 1.0;
						vibratoScale = Math.pow(2.0, Music.effectVibratos[song.instrumentEffects[channel][pattern.instrument]] / 12.0 ) - 1.0;
					} else if (note == null) {
						periodDelta = 0.0;
						periodDeltaScale = 0.0;
						noteVolume = 0.0;
						volumeDelta = 0.0;
						filter = 1.0;
						filterScale = 1.0;
						vibratoScale = 0.0;
						resetPeriod = true;
					} else {
						var pitch: int;
						if (note.pitches.length == 2) {
							pitch = note.pitches[arpeggio >> 1];
						} else if (note.pitches.length == 3) {
							pitch = note.pitches[arpeggio == 3 ? 1 : arpeggio];
						} else if (note.pitches.length == 4) {
							pitch = note.pitches[arpeggio];
						} else {
							pitch = note.pitches[0];
						}
						
						var startPin: NotePin = null;
						var endPin: NotePin = null;
						for each (var pin: NotePin in note.pins) {
							if (pin.time + note.start <= time) {
								startPin = pin;
							} else {
								endPin = pin;
								break;
							}
						}
						
						var noteStart: int = note.start * 4;
						var noteEnd:   int = note.end   * 4;
						var pinStart: int  = (note.start + startPin.time) * 4;
						var pinEnd:   int  = (note.start + endPin.time  ) * 4;
						var arpeggioStart: int = time * 4 + arpeggio;
						var arpeggioEnd:   int = time * 4 + arpeggio + 1;
						var arpeggioRatioStart: Number = (arpeggioStart - pinStart) / (pinEnd - pinStart);
						var arpeggioRatioEnd:   Number = (arpeggioEnd   - pinStart) / (pinEnd - pinStart);
						var arpeggioVolumeStart: Number = startPin.volume * (1.0 - arpeggioRatioStart) + endPin.volume * arpeggioRatioStart;
						var arpeggioVolumeEnd:   Number = startPin.volume * (1.0 - arpeggioRatioEnd)   + endPin.volume * arpeggioRatioEnd;
						var arpeggioIntervalStart: Number = startPin.interval * (1.0 - arpeggioRatioStart) + endPin.interval * arpeggioRatioStart;
						var arpeggioIntervalEnd:   Number = startPin.interval * (1.0 - arpeggioRatioEnd)   + endPin.interval * arpeggioRatioEnd;
						var arpeggioFilterTimeStart: Number = startPin.time * (1.0 - arpeggioRatioStart) + endPin.time * arpeggioRatioStart;
						var arpeggioFilterTimeEnd:   Number = startPin.time * (1.0 - arpeggioRatioEnd)   + endPin.time * arpeggioRatioEnd;
						
						var inhibitRestart: Boolean = false;
						if (arpeggioStart == noteStart) {
							if (attack == 0) {
								inhibitRestart = true;
							} else if (attack == 2) {
								arpeggioVolumeStart = 0.0;
							} else if (attack == 3) {
								if (prevNote == null || prevNote.pitches.length > 1 || note.pitches.length > 1) {
									arpeggioVolumeStart = 0.0;
								} else if (prevNote.pins[prevNote.pins.length-1].volume == 0 || note.pins[0].volume == 0) {
									arpeggioVolumeStart = 0.0;
								//} else if (prevNote.pitches[0] + prevNote.pins[prevNote.pins.length-1].interval == pitch) {
								//	arpeggioVolumeStart = 0.0;
								} else {
									arpeggioIntervalStart = (prevNote.pitches[0] + prevNote.pins[prevNote.pins.length-1].interval - pitch) * 0.5;
									arpeggioFilterTimeStart = prevNote.pins[prevNote.pins.length-1].time * 0.5;
									inhibitRestart = true;
								}
							}
						}
						if (arpeggioEnd == noteEnd) {
							if (attack == 1 || attack == 2) {
								arpeggioVolumeEnd = 0.0;
							} else if (attack == 3) {
								if (nextNote == null || nextNote.pitches.length > 1 || note.pitches.length > 1) {
									arpeggioVolumeEnd = 0.0;
								} else if (note.pins[note.pins.length-1].volume == 0 || nextNote.pins[0].volume == 0) {
									arpeggioVolumeStart = 0.0;
								//} else if (nextNote.pitches[0] == pitch + note.pins[note.pins.length-1].interval) {
									//arpeggioVolumeEnd = 0.0;
								} else {
									arpeggioIntervalEnd = (nextNote.pitches[0] + note.pins[note.pins.length-1].interval - pitch) * 0.5;
									arpeggioFilterTimeEnd *= 0.5;
								}
							}
						}
						
						var startRatio: Number = 1.0 - (arpeggioSamples + samples) / samplesPerArpeggio;
						var endRatio:   Number = 1.0 - (arpeggioSamples)           / samplesPerArpeggio;
						var startInterval: Number = arpeggioIntervalStart * (1.0 - startRatio) + arpeggioIntervalEnd * startRatio;
						var endInterval:   Number = arpeggioIntervalStart * (1.0 - endRatio)   + arpeggioIntervalEnd * endRatio;
						var startFilterTime: Number = arpeggioFilterTimeStart * (1.0 - startRatio) + arpeggioFilterTimeEnd * startRatio;
						var endFilterTime:   Number = arpeggioFilterTimeStart * (1.0 - endRatio)   + arpeggioFilterTimeEnd * endRatio;
						var startFreq: Number = frequencyFromPitch(channelRoot + (pitch + startInterval) * intervalScale);
						var endFreq:   Number = frequencyFromPitch(channelRoot + (pitch + endInterval) * intervalScale);
						var pitchDamping: Number;
						if (channel == 3) {
							if (song.instrumentWaves[3][pattern.instrument] > 0) {
								drumFilter = Math.min(1.0, startFreq * sampleTime * 8.0);
								//trace(drumFilter);
								pitchDamping = 24.0;
							} else {
								pitchDamping = 60.0;
							}
						} else {
							pitchDamping = 48.0;
						}
						var startVol: Number = Math.pow(2.0, -(pitch + startInterval) * intervalScale / pitchDamping);
						var endVol:   Number = Math.pow(2.0, -(pitch + endInterval) * intervalScale / pitchDamping);
						startVol *= volumeConversion(arpeggioVolumeStart * (1.0 - startRatio) + arpeggioVolumeEnd * startRatio);
						endVol   *= volumeConversion(arpeggioVolumeStart * (1.0 - endRatio)   + arpeggioVolumeEnd * endRatio);
						var freqScale: Number = endFreq / startFreq;
						periodDelta = startFreq * sampleTime;
						periodDeltaScale = Math.pow(freqScale, 1.0 / samples);
						noteVolume = startVol;
						volumeDelta = (endVol - startVol) / samples;
						var timeSinceStart: Number = (arpeggioStart + startRatio - noteStart) * samplesPerArpeggio / samplesPerSecond;
						if (timeSinceStart == 0.0 && !inhibitRestart) resetPeriod = true;
						
						var filterScaleRate: Number = Music.filterDecays[song.instrumentFilters[channel][pattern.instrument]];
						filter = Math.pow(2, -filterScaleRate * startFilterTime * 4.0 * samplesPerArpeggio / samplesPerSecond);
						var endFilter: Number = Math.pow(2, -filterScaleRate * endFilterTime * 4.0 * samplesPerArpeggio / samplesPerSecond);
						filterScale = Math.pow(endFilter / filter, 1.0 / samples);
						vibratoScale = (song.instrumentEffects[channel][pattern.instrument] == 2 && time - note.start < 3) ? 0.0 : Math.pow( 2.0, Music.effectVibratos[song.instrumentEffects[channel][pattern.instrument]] / 12.0 ) - 1.0;
					}
					
					if (channel == 0) {
						leadPeriodDelta = periodDelta;
						leadPeriodDeltaScale = periodDeltaScale;
						leadVolume = noteVolume * maxLeadVolume;
						leadVolumeDelta = volumeDelta * maxLeadVolume;
						leadFilter = filter * leadFilterBase;
						leadFilterScale = filterScale;
						leadVibratoScale = vibratoScale;
						if (resetPeriod) {
							leadSample = 0.0;
							leadPeriodA = 0.0;
							leadPeriodB = 0.0;
						}
					} else if (channel == 1) {
						harmonyPeriodDelta = periodDelta;
						harmonyPeriodDeltaScale = periodDeltaScale;
						harmonyVolume = noteVolume * maxHarmonyVolume;
						harmonyVolumeDelta = volumeDelta * maxHarmonyVolume;
						harmonyFilter = filter * harmonyFilterBase;
						harmonyFilterScale = filterScale;
						harmonyVibratoScale = vibratoScale;
						if (resetPeriod) {
							harmonySample = 0.0;
							harmonyPeriodA = 0.0;
							harmonyPeriodB = 0.0;
						}
					} else if (channel == 2) {
						bassPeriodDelta = periodDelta;
						bassPeriodDeltaScale = periodDeltaScale;
						bassVolume = noteVolume * maxBassVolume;
						bassVolumeDelta = volumeDelta * maxBassVolume;
						bassFilter = filter * bassFilterBase;
						bassFilterScale = filterScale;
						bassVibratoScale = vibratoScale;
						if (resetPeriod) {
							bassSample = 0.0;
							bassPeriodA = 0.0;
							bassPeriodB = 0.0;
						}
					} else if (channel == 3) {
						drumPeriodDelta = periodDelta / 32767.0;
						drumPeriodDeltaScale = periodDeltaScale;
						drumVolume = noteVolume * maxDrumVolume;
						drumVolumeDelta = volumeDelta * maxDrumVolume;
					}
				}
				
				var effectY:     Number = Math.sin(effectPeriod);
				var prevEffectY: Number = Math.sin(effectPeriod - effectAngle);
				
				while (samples > 0) {
					var leadVibrato:    Number = 1.0 + leadVibratoScale    * effectY;
					var harmonyVibrato: Number = 1.0 + harmonyVibratoScale * effectY;
					var bassVibrato:    Number = 1.0 + bassVibratoScale    * effectY;
					var leadTremelo:    Number = 1.0 + leadTremeloScale    * (effectY - 1.0);
					var harmonyTremelo: Number = 1.0 + harmonyTremeloScale * (effectY - 1.0);
					var bassTremelo:    Number = 1.0 + bassTremeloScale    * (effectY - 1.0);
					var temp: Number = effectY;
					effectY = effectYMult * effectY - prevEffectY;
					prevEffectY = temp;
					
					leadSample += ((leadWave[int(leadPeriodA * leadWaveLength)] + leadWave[int(leadPeriodB * leadWaveLength)] * leadChorusSign) * leadVolume * leadTremelo - leadSample) * leadFilter;
					leadVolume += leadVolumeDelta;
					leadPeriodA += leadPeriodDelta * leadVibrato * leadChorusA;
					leadPeriodB += leadPeriodDelta * leadVibrato * leadChorusB;
					leadPeriodDelta *= leadPeriodDeltaScale;
					leadPeriodA -= int(leadPeriodA);
					leadPeriodB -= int(leadPeriodB);
					leadFilter *= leadFilterScale;
					
					harmonySample += ((harmonyWave[int(harmonyPeriodA * harmonyWaveLength)] + harmonyWave[int(harmonyPeriodB * harmonyWaveLength)] * harmonyChorusSign) * harmonyVolume * harmonyTremelo - harmonySample) * harmonyFilter;
					harmonyVolume += harmonyVolumeDelta;
					harmonyPeriodA += harmonyPeriodDelta * harmonyVibrato * harmonyChorusA;
					harmonyPeriodB += harmonyPeriodDelta * harmonyVibrato * harmonyChorusB;
					harmonyPeriodDelta *= harmonyPeriodDeltaScale;
					harmonyPeriodA -= int(harmonyPeriodA);
					harmonyPeriodB -= int(harmonyPeriodB);
					harmonyFilter *= harmonyFilterScale;
					
					bassSample += ((bassWave[int(bassPeriodA * bassWaveLength)] + bassWave[int(bassPeriodB * bassWaveLength)] * bassChorusSign) * bassVolume * bassTremelo - bassSample) * bassFilter;
					bassVolume += bassVolumeDelta;
					bassPeriodA += bassPeriodDelta * bassVibrato * bassChorusA;
					bassPeriodB += bassPeriodDelta * bassVibrato * bassChorusB;
					bassPeriodDelta *= bassPeriodDeltaScale;
					bassPeriodA -= int(bassPeriodA);
					bassPeriodB -= int(bassPeriodB);
					bassFilter *= bassFilterScale;
					
					drumSample += (drumWave[int(drumPeriod * 32767.0)] * drumVolume - drumSample) * drumFilter;
					drumVolume += drumVolumeDelta;
					drumPeriod += drumPeriodDelta;
					drumPeriodDelta *= drumPeriodDeltaScale;
					drumPeriod -= int(drumPeriod);
					
					var instrumentSample: Number = leadSample + harmonySample + bassSample;
					
					// Reverb, implemented using a feedback delay network with a Hadamard matrix and lowpass filters.
					// good ratios:    0.555235 + 0.618033 + 0.818 +   1.0 = 2.991268
					// Delay lengths:  3041     + 3385     + 4481  +  5477 = 16384 = 2^14
					// Buffer offsets: 3041    -> 6426   -> 10907 -> 16384
					var delaySample0: Number = delayLine[delayPos] + instrumentSample;
					var delaySample1: Number = delayLine[(delayPos +  3041) & 0x3FFF];
					var delaySample2: Number = delayLine[(delayPos +  6426) & 0x3FFF];
					var delaySample3: Number = delayLine[(delayPos + 10907) & 0x3FFF];
					var delayTemp0: Number = -delaySample0 + delaySample1;
					var delayTemp1: Number = -delaySample0 - delaySample1;
					var delayTemp2: Number = -delaySample2 + delaySample3;
					var delayTemp3: Number = -delaySample2 - delaySample3;
					delayFeedback0 += ((delayTemp0 + delayTemp2) * reverb - delayFeedback0) * 0.5;
					delayFeedback1 += ((delayTemp1 + delayTemp3) * reverb - delayFeedback1) * 0.5;
					delayFeedback2 += ((delayTemp0 - delayTemp2) * reverb - delayFeedback2) * 0.5;
					delayFeedback3 += ((delayTemp1 - delayTemp3) * reverb - delayFeedback3) * 0.5;
					delayLine[(delayPos +  3041) & 0x3FFF] = delayFeedback0;
					delayLine[(delayPos +  6426) & 0x3FFF] = delayFeedback1;
					delayLine[(delayPos + 10907) & 0x3FFF] = delayFeedback2;
					delayLine[delayPos] = delayFeedback3;
					delayPos = (delayPos + 1) & 0x3FFF;
					
					var sample: Number = delaySample0 + delaySample1 + delaySample2 + delaySample3 + drumSample;
					
					var abs: Number = sample < 0.0 ? -sample : sample;
					limit -= limitDecay;
					if (limit < abs) limit = abs;
					sample /= limit * 0.75 + 0.25;
					sample *= volume;
					data.writeFloat(sample);
					data.writeFloat(sample);
					samples--;
				}
				
				if ( effectYMult * effectY - prevEffectY > prevEffectY ) {
					effectPeriod = Math.asin( effectY );
				} else {
					effectPeriod = Math.PI - Math.asin( effectY );
				}
				
				if (arpeggioSamples == 0) {
					arpeggio++;
					arpeggioSamples = samplesPerArpeggio;
					if (arpeggio == 4) {
						arpeggio = 0;
						part++;
						if (part == song.parts) {
							part = 0;
							beat++;
							if (beat == song.beats) {
								beat = 0;
								effectPeriod = 0.0;
								bar++;
								if (bar < song.loopStart) {
									if (!enableIntro) bar = song.loopStart;
								} else {
									enableIntro = false;
								}
								if (bar >= song.loopStart + song.loopLength) {
									if (loopCount > 0) loopCount--;
									if (loopCount > 0 || !enableOutro) {
										bar = song.loopStart;
									}
								}
								if (bar >= song.bars) {
									bar = 0;
									enableIntro = true;
									ended = true;
									pause();
								}
								updateInstruments();
							}
						}
					}
				}
			}
			
			if (stutterPressed) stutterFunction();
			_playhead = (((arpeggio + 1.0 - arpeggioSamples / samplesPerArpeggio) / 4.0 + part) / song.parts + beat) / song.beats + bar;
		}
		
		private function frequencyFromPitch(pitch: Number): Number {
			return 440.0 * Math.pow(2.0, (pitch - 69.0) / 12.0);
		}
		
		private function volumeConversion(noteVolume: Number): Number {
			return Math.pow(noteVolume / 3.0, 1.5);
		}
		
		private function getSamplesPerArpeggio(): int {
			if (song == null) return 0;
			var beatsPerMinute: Number = song.getBeatsPerMinute();
			var beatsPerSecond: Number = beatsPerMinute / 60.0;
			var partsPerSecond: Number = beatsPerSecond * song.parts;
			var arpeggioPerSecond: Number = partsPerSecond * 4.0;
			return samplesPerSecond / arpeggioPerSecond;
		}
	}
}
