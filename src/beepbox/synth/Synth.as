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
		public var pianoPressed: Boolean = false;
		public var pianoNote: int = 0;
		public var pianoChannel: int = 0;
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
		/*
		private var reverbDelay1: Vector.<Number> = new Vector.<Number>();
		private var reverbDelayIndex1: int = 0;
		private var reverbDelay2: Vector.<Number> = new Vector.<Number>();
		private var reverbDelayIndex2: int = 0;
		private var reverbDelay3: Vector.<Number> = new Vector.<Number>();
		private var reverbDelayIndex3: int = 0;
		*/
		
		public function get playing(): Boolean {
			return !paused;
		}
		
		public function get playhead(): Number {
			return _playhead;
		}
		
		public function get totalSamples(): int {
			if (song == null) return 0;
			return getSamplesPerArpeggio() * 4 * song.parts * song.beats * song.bars;
		}
		
		public function get totalSeconds(): Number {
			return totalSamples / samplesPerSecond;
		}
		
		public function get totalBars(): Number {
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
			/*
			reverbDelay1.length = 1024;
			reverbDelay1.fixed = true;
			for (i = 0; i < reverbDelay1.length; i++) reverbDelay1[i] = 0.0;
			reverbDelay2.length = 1024;
			reverbDelay2.fixed = true;
			for (i = 0; i < reverbDelay2.length; i++) reverbDelay2[i] = 0.0;
			reverbDelay3.length = 1024;
			reverbDelay3.fixed = true;
			for (i = 0; i < reverbDelay3.length; i++) reverbDelay3[i] = 0.0;
			*/
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
			bar = song == null ? 0 : song.loopStart;
			snapToBar();
		}
		
		public function snapToBar(): void {
			_playhead = bar;
			beat = 0;
			part = 0;
			arpeggio = 0;
			arpeggioSamples = 0;
			effectPeriod = 0.0;
		}
		
		public function nextBar(): void {
			var oldBar: int = bar;
			bar++;
			if (bar == song.bars) {
				bar = 0;
			}
			if (song != null && bar < song.loopStart || bar >= song.loopStart + song.loopLength || bar >= song.bars) {
				bar = song.loopStart;
			}
			_playhead += bar - oldBar;
		}
		
		public function prevBar(): void {
			var oldBar: int = bar;
			bar--;
			if (bar < 0) {
				bar = song.bars - 1;
			}
			if (song != null && bar < song.loopStart || bar >= song.loopStart + song.loopLength || bar >= song.bars) {
				bar = song.loopStart + song.loopLength - 1;
			}
			_playhead += bar - oldBar;
		}
		
		private function onSampleData(event: SampleDataEvent): void {
			if (paused) {
				return;
			} else {
				synthesize(event.data, 4096, true);
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
		
		public function synthesize(data: ByteArray, totalSamples: int, loop: Boolean): void {
			var i: int;
			
			if (song == null) {
				for (i = 0; i < totalSamples; i++) {
					data.writeFloat(0.0);
					data.writeFloat(0.0);
				}
				return;
			}
			
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
				if (loop && (bar < song.loopStart || bar >= song.loopStart + song.loopLength)) {
					bar = song.loopStart;
				}
				beat = 0;
				part = 0;
				arpeggio = 0;
				arpeggioSamples = samplesPerArpeggio;
			}
			if (bar >= song.bars) {
				bar = song.loopStart;
			}
			
			var sampleTime: Number = 1.0 / samplesPerSecond;
			var samplesPerArpeggio: int = getSamplesPerArpeggio();
			
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
			
			var leadFilterScale:    Number;
			var harmonyFilterScale: Number;
			var bassFilterScale:    Number;
			
			var leadTremeloScale:    Number;
			var harmonyTremeloScale: Number;
			var bassTremeloScale:    Number;
			
			var leadChorusA:    Number;
			var harmonyChorusA: Number;
			var bassChorusA:    Number;
			var leadChorusB:    Number;
			var harmonyChorusB: Number;
			var bassChorusB:    Number;
			
			var updateInstruments: Function = function(): void {
				var instrumentLead: int    = song.getPattern(0, bar).instrument;
				var instrumentHarmony: int = song.getPattern(1, bar).instrument;
				var instrumentBass: int    = song.getPattern(2, bar).instrument;
				var instrumentDrum: int    = song.getPattern(3, bar).instrument;
				
				maxLeadVolume    = Music.channelVolumes[0] * (song.instrumentVolumes[0][instrumentLead] == 5 ? 0.0 : Math.pow(2, -Music.volumeValues[song.instrumentVolumes[0][instrumentLead]])) * Music.waveVolumes[song.instrumentWaves[0][instrumentLead]] * Music.filterVolumes[song.instrumentFilters[0][instrumentLead]] * 0.5;
				maxHarmonyVolume = Music.channelVolumes[1] * (song.instrumentVolumes[1][instrumentHarmony] == 5 ? 0.0 : Math.pow(2, -Music.volumeValues[song.instrumentVolumes[1][instrumentHarmony]])) * Music.waveVolumes[song.instrumentWaves[1][instrumentHarmony]] * Music.filterVolumes[song.instrumentFilters[1][instrumentHarmony]] * 0.5;
				maxBassVolume    = Music.channelVolumes[2] * (song.instrumentVolumes[2][instrumentBass] == 5 ? 0.0 : Math.pow(2, -Music.volumeValues[song.instrumentVolumes[2][instrumentBass]])) * Music.waveVolumes[song.instrumentWaves[2][instrumentBass]] * Music.filterVolumes[song.instrumentFilters[2][instrumentBass]] * 0.5;
				maxDrumVolume    = Music.channelVolumes[3] * (song.instrumentVolumes[3][instrumentDrum] == 5 ? 0.0 : Math.pow(2, -Music.volumeValues[song.instrumentVolumes[3][instrumentDrum]]));
				
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
				drumFilter = 0.2;
				
				leadFilterScale    = Math.pow(2, -Music.filterDecays[song.instrumentFilters[0][instrumentLead]] / samplesPerSecond);
				harmonyFilterScale = Math.pow(2, -Music.filterDecays[song.instrumentFilters[1][instrumentHarmony]] / samplesPerSecond);
				bassFilterScale    = Math.pow(2, -Music.filterDecays[song.instrumentFilters[2][instrumentBass]] / samplesPerSecond);
				
				leadTremeloScale    = Music.effectTremelos[song.instrumentEffects[0][instrumentLead]];
				harmonyTremeloScale = Music.effectTremelos[song.instrumentEffects[1][instrumentHarmony]];
				bassTremeloScale    = Music.effectTremelos[song.instrumentEffects[2][instrumentBass]];
				
				leadChorusA    = Math.pow( 2.0, (Music.chorusOffsets[song.instrumentChorus[0][instrumentLead]] + Music.chorusValues[song.instrumentChorus[0][instrumentLead]]) / 12.0 );
				harmonyChorusA = Math.pow( 2.0, (Music.chorusOffsets[song.instrumentChorus[1][instrumentHarmony]] + Music.chorusValues[song.instrumentChorus[1][instrumentHarmony]]) / 12.0 );
				bassChorusA    = Math.pow( 2.0, (Music.chorusOffsets[song.instrumentChorus[2][instrumentBass]] + Music.chorusValues[song.instrumentChorus[2][instrumentBass]]) / 12.0 );
				leadChorusB    = Math.pow( 2.0, (Music.chorusOffsets[song.instrumentChorus[0][instrumentLead]] - Music.chorusValues[song.instrumentChorus[0][instrumentLead]]) / 12.0 );
				harmonyChorusB = Math.pow( 2.0, (Music.chorusOffsets[song.instrumentChorus[1][instrumentHarmony]] - Music.chorusValues[song.instrumentChorus[1][instrumentHarmony]]) / 12.0 );
				bassChorusB    = Math.pow( 2.0, (Music.chorusOffsets[song.instrumentChorus[2][instrumentBass]] - Music.chorusValues[song.instrumentChorus[2][instrumentBass]]) / 12.0 );
				if (song.instrumentChorus[0][instrumentLead] == 0) leadPeriodB = leadPeriodA;
				if (song.instrumentChorus[1][instrumentHarmony] == 0) harmonyPeriodB = harmonyPeriodA;
				if (song.instrumentChorus[2][instrumentBass] == 0) bassPeriodB = bassPeriodA;
			}
			
			updateInstruments();
			
			while (totalSamples > 0) {
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
				var leadVibratoScale: Number;
				var harmonyPeriodDelta: Number;
				var harmonyPeriodDeltaScale: Number;
				var harmonyVolume: Number;
				var harmonyVolumeDelta: Number;
				var harmonyFilter: Number;
				var harmonyVibratoScale: Number;
				var bassPeriodDelta: Number;
				var bassPeriodDeltaScale: Number;
				var bassVolume: Number;
				var bassVolumeDelta: Number;
				var bassFilter: Number;
				var bassVibratoScale: Number;
				var drumPeriodDelta: Number;
				var drumPeriodDeltaScale: Number;
				var drumVolume: Number;
				var drumVolumeDelta: Number;
				var time: int = part + beat * song.parts;
				
				for (var channel: int = 0; channel < 4; channel++) {
					var pattern: BarPattern = song.getPattern(channel, bar);
					
					var attack: int = song.instrumentAttacks[channel][pattern.instrument];
					
					var tone: Tone = null;
					var prevTone: Tone = null;
					var nextTone: Tone = null;
					for (i = 0; i < pattern.tones.length; i++) {
						if (pattern.tones[i].end <= time) {
							prevTone = pattern.tones[i];
						} else if (pattern.tones[i].start <= time && pattern.tones[i].end > time) {
							tone = pattern.tones[i];
						} else if (pattern.tones[i].start > time) {
							nextTone = pattern.tones[i];
							break;
						}
					}
					if (tone != null && prevTone != null && prevTone.end != tone.start) prevTone = null;
					if (tone != null && nextTone != null && nextTone.start != tone.end) nextTone = null;
					
					var channelRoot: int = channel == 3 ? 69 : Music.keyTransposes[song.key];
					var intervalScale: int = channel == 3 ? Music.drumInterval : 1;
					var periodDelta: Number;
					var periodDeltaScale: Number;
					var toneVolume: Number;
					var volumeDelta: Number;
					var filter: Number;
					var vibratoScale: Number;
					var resetPeriod: Boolean = false;
					if (pianoPressed && channel == pianoChannel) {
						periodDelta = frequencyFromPitch(pitch + channelRoot + pianoNote * intervalScale) * sampleTime;
						periodDeltaScale = 1.0;
						toneVolume = channel == 3 ? 1.0 : Math.pow(2.0, -(pitch + pianoNote) / 48.0);
						volumeDelta = 0.0;
						filter = 1.0;
						vibratoScale = 0.0;
					} else if (tone == null) {
						periodDelta = 0.0;
						periodDeltaScale = 0.0;
						toneVolume = 0.0;
						volumeDelta = 0.0;
						filter = 1.0;
						vibratoScale = 0.0;
						resetPeriod = true;
					} else {
						var pitch: int;
						if (tone.notes.length == 2) {
							pitch = tone.notes[arpeggio >> 1];
						} else if (tone.notes.length == 3) {
							pitch = tone.notes[arpeggio == 3 ? 1 : arpeggio];
						} else if (tone.notes.length == 4) {
							pitch = tone.notes[arpeggio];
						} else {
							pitch = tone.notes[0];
						}
						
						var startPin: TonePin = null;
						var endPin: TonePin = null;
						for each (var pin: TonePin in tone.pins) {
							if (pin.time + tone.start <= time) {
								startPin = pin;
							} else {
								endPin = pin;
								break;
							}
						}
						
						var toneStart: int = tone.start * 4;
						var toneEnd:   int = tone.end   * 4;
						var pinStart: int  = (tone.start + startPin.time) * 4;
						var pinEnd:   int  = (tone.start + endPin.time  ) * 4;
						var arpeggioStart: int = time * 4 + arpeggio;
						var arpeggioEnd:   int = time * 4 + arpeggio + 1;
						var arpeggioRatioStart: Number = (arpeggioStart - pinStart) / (pinEnd - pinStart);
						var arpeggioRatioEnd:   Number = (arpeggioEnd   - pinStart) / (pinEnd - pinStart);
						var arpeggioVolumeStart: Number = startPin.volume * (1.0 - arpeggioRatioStart) + endPin.volume * arpeggioRatioStart;
						var arpeggioVolumeEnd:   Number = startPin.volume * (1.0 - arpeggioRatioEnd)   + endPin.volume * arpeggioRatioEnd;
						var arpeggioIntervalStart: Number = startPin.interval * (1.0 - arpeggioRatioStart) + endPin.interval * arpeggioRatioStart;
						var arpeggioIntervalEnd:   Number = startPin.interval * (1.0 - arpeggioRatioEnd)   + endPin.interval * arpeggioRatioEnd;
						
						var inhibitRestart: Boolean = false;
						if (arpeggioStart == toneStart) {
							if (attack == 0) {
								inhibitRestart = true;
							} else if (attack == 2) {
								arpeggioVolumeStart = 0.0;
							} else if (attack == 3) {
								if (prevTone == null || prevTone.notes.length > 1 || tone.notes.length > 1) {
									arpeggioVolumeStart = 0.0;
								} else if (prevTone.notes[0] + prevTone.pins[prevTone.pins.length-1].interval == pitch) {
									arpeggioVolumeStart = 0.0;
								} else {
									arpeggioIntervalStart = (prevTone.notes[0] + prevTone.pins[prevTone.pins.length-1].interval - pitch) * 0.5;
									inhibitRestart = true;
								}
							}
						}
						if (arpeggioEnd == toneEnd) {
							if (attack == 1 || attack == 2) {
								arpeggioVolumeEnd = 0.0;
							} else if (attack == 3) {
								if (nextTone == null || nextTone.notes.length > 1 || tone.notes.length > 1) {
									arpeggioVolumeEnd = 0.0;
								} else if (nextTone.notes[0] == pitch + tone.pins[tone.pins.length-1].interval) {
									arpeggioVolumeEnd = 0.0;
								} else {
									arpeggioIntervalEnd = (nextTone.notes[0] + tone.pins[tone.pins.length-1].interval - pitch) * 0.5;
								}
							}
						}
						
						var startRatio: Number = 1.0 - (arpeggioSamples + samples) / samplesPerArpeggio;
						var endRatio:   Number = 1.0 - (arpeggioSamples)           / samplesPerArpeggio;
						var startInterval: Number = arpeggioIntervalStart * (1.0 - startRatio) + arpeggioIntervalEnd * startRatio;
						var endInterval:   Number = arpeggioIntervalStart * (1.0 - endRatio)   + arpeggioIntervalEnd * endRatio;
						var startFreq: Number = frequencyFromPitch(channelRoot + (pitch + startInterval) * intervalScale);
						var endFreq:   Number = frequencyFromPitch(channelRoot + (pitch + endInterval) * intervalScale);
						var startVol: Number = channel == 3 ? 1.0 : Math.pow(2.0, -(pitch + startInterval) / 48.0);
						var endVol:   Number = channel == 3 ? 1.0 : Math.pow(2.0, -(pitch + endInterval) / 48.0);
						startVol *= volumeConversion(arpeggioVolumeStart * (1.0 - startRatio) + arpeggioVolumeEnd * startRatio);
						endVol   *= volumeConversion(arpeggioVolumeStart * (1.0 - endRatio)   + arpeggioVolumeEnd * endRatio);
						var freqScale: Number = endFreq / startFreq;
						periodDelta = startFreq * sampleTime;
						periodDeltaScale = Math.pow(freqScale, 1.0 / samples);
						toneVolume = startVol;
						volumeDelta = (endVol - startVol) / samples;
						var timeSinceStart: Number = (arpeggioStart + startRatio - toneStart) * samplesPerArpeggio / samplesPerSecond;
						if (timeSinceStart == 0.0 && !inhibitRestart) resetPeriod = true;
						filter = channel == 3 ? 1.0 : Math.pow(2, -Music.filterDecays[song.instrumentFilters[channel][pattern.instrument]] * timeSinceStart);
						vibratoScale = (song.instrumentEffects[channel][pattern.instrument] == 2 && time - tone.start < 3) ? 0.0 : Math.pow( 2.0, Music.effectVibratos[song.instrumentEffects[channel][pattern.instrument]] / 12.0 ) - 1.0;
					}
					
					if (channel == 0) {
						leadPeriodDelta = periodDelta;
						leadPeriodDeltaScale = periodDeltaScale;
						leadVolume = toneVolume * maxLeadVolume;
						leadVolumeDelta = volumeDelta * maxLeadVolume;
						leadFilter = filter * leadFilterBase;
						leadVibratoScale = vibratoScale;
						if (resetPeriod) {
							leadSample = 0.0;
							leadPeriodA = 0.0;
							leadPeriodB = 0.0;
						}
					} else if (channel == 1) {
						harmonyPeriodDelta = periodDelta;
						harmonyPeriodDeltaScale = periodDeltaScale;
						harmonyVolume = toneVolume * maxHarmonyVolume;
						harmonyVolumeDelta = volumeDelta * maxHarmonyVolume;
						harmonyFilter = filter * harmonyFilterBase;
						harmonyVibratoScale = vibratoScale;
						if (resetPeriod) {
							harmonySample = 0.0;
							harmonyPeriodA = 0.0;
							harmonyPeriodB = 0.0;
						}
					} else if (channel == 2) {
						bassPeriodDelta = periodDelta;
						bassPeriodDeltaScale = periodDeltaScale;
						bassVolume = toneVolume * maxBassVolume;
						bassVolumeDelta = volumeDelta * maxBassVolume;
						bassFilter = filter * bassFilterBase;
						bassVibratoScale = vibratoScale;
						if (resetPeriod) {
							bassSample = 0.0;
							bassPeriodA = 0.0;
							bassPeriodB = 0.0;
						}
					} else if (channel == 3) {
						drumPeriodDelta = periodDelta / 32767.0;
						drumPeriodDeltaScale = periodDeltaScale;
						drumVolume = toneVolume * maxDrumVolume;
						drumVolumeDelta = volumeDelta * maxDrumVolume;
					}
				}
				
				var effectY:     Number = Math.sin(effectPeriod);
				var prevEffectY: Number = Math.sin(effectPeriod - effectAngle);
				
				while (samples > 0) {
					var sample: Number = 0.0;
					var leadVibrato:    Number = 1.0 + leadVibratoScale    * effectY;
					var harmonyVibrato: Number = 1.0 + harmonyVibratoScale * effectY;
					var bassVibrato:    Number = 1.0 + bassVibratoScale    * effectY;
					var leadTremelo:    Number = 1.0 + leadTremeloScale    * (effectY - 1.0);
					var harmonyTremelo: Number = 1.0 + harmonyTremeloScale * (effectY - 1.0);
					var bassTremelo:    Number = 1.0 + bassTremeloScale    * (effectY - 1.0);
					var temp: Number = effectY;
					effectY = effectYMult * effectY - prevEffectY;
					prevEffectY = temp;
					
					leadSample += ((leadWave[int(leadPeriodA * leadWaveLength)] + leadWave[int(leadPeriodB * leadWaveLength)]) * leadVolume * leadTremelo - leadSample) * leadFilter;
					leadVolume += leadVolumeDelta;
					leadPeriodA += leadPeriodDelta * leadVibrato * leadChorusA;
					leadPeriodB += leadPeriodDelta * leadVibrato * leadChorusB;
					leadPeriodDelta *= leadPeriodDeltaScale;
					leadPeriodA -= int(leadPeriodA);
					leadPeriodB -= int(leadPeriodB);
					leadFilter *= leadFilterScale;
					sample += leadSample;
					
					harmonySample += ((harmonyWave[int(harmonyPeriodA * harmonyWaveLength)] + harmonyWave[int(harmonyPeriodB * harmonyWaveLength)]) * harmonyVolume * harmonyTremelo - harmonySample) * harmonyFilter;
					harmonyVolume += harmonyVolumeDelta;
					harmonyPeriodA += harmonyPeriodDelta * harmonyVibrato * harmonyChorusA;
					harmonyPeriodB += harmonyPeriodDelta * harmonyVibrato * harmonyChorusB;
					harmonyPeriodDelta *= harmonyPeriodDeltaScale;
					harmonyPeriodA -= int(harmonyPeriodA);
					harmonyPeriodB -= int(harmonyPeriodB);
					harmonyFilter *= harmonyFilterScale;
					sample += harmonySample;
					
					bassSample += ((bassWave[int(bassPeriodA * bassWaveLength)] + bassWave[int(bassPeriodB * bassWaveLength)]) * bassVolume * bassTremelo - bassSample) * bassFilter;
					bassVolume += bassVolumeDelta;
					bassPeriodA += bassPeriodDelta * bassVibrato * bassChorusA;
					bassPeriodB += bassPeriodDelta * bassVibrato * bassChorusB;
					bassPeriodDelta *= bassPeriodDeltaScale;
					bassPeriodA -= int(bassPeriodA);
					bassPeriodB -= int(bassPeriodB);
					bassFilter *= bassFilterScale;
					sample += bassSample;
					
					drumSample += (drumWave[int(drumPeriod * 32767.0)] * drumVolume - drumSample) * drumFilter;
					drumVolume += drumVolumeDelta;
					drumPeriod += drumPeriodDelta;
					drumPeriodDelta *= drumPeriodDeltaScale;
					drumPeriod -= int(drumPeriod);
					
					sample += drumSample;
					
					/*
					var g: Number = 0.9;
					var reverbSample: Number;
					
					reverbSample = reverbDelay1[reverbDelayIndex1];
					sample += reverbSample * g;
					reverbDelay1[reverbDelayIndex1] = sample;
					//reverbDelayIndex1 = (reverbDelayIndex1 + 1) & 0x3ff;
					reverbDelayIndex1 = (reverbDelayIndex1 + 1) % 1021;
					sample *= -g;
					sample += reverbSample;
					
					reverbSample = reverbDelay2[reverbDelayIndex2];
					sample += reverbSample * g;
					reverbDelay2[reverbDelayIndex2] = sample;
					//reverbDelayIndex2 = (reverbDelayIndex2 + 1) & 0x3ff;
					reverbDelayIndex2 = (reverbDelayIndex2 + 1) % 317;
					sample *= -g;
					sample += reverbSample;
					
					reverbSample = reverbDelay3[reverbDelayIndex3];
					sample += reverbSample * g;
					reverbDelay3[reverbDelayIndex3] = sample;
					//reverbDelayIndex3 = (reverbDelayIndex3 + 1) & 0x3ff;
					reverbDelayIndex3 = (reverbDelayIndex3 + 1) % 89;
					sample *= -g;
					sample += reverbSample;
					*/
					
					var abs: Number = sample < 0.0 ? -sample : sample;
					limit -= limitDecay;
					if (limit < abs) limit = abs;
					sample /= limit * 0.75 + 0.25;
					sample *= volume;
					data.writeFloat(sample);
					data.writeFloat(sample);
					samples--;
				}
				
				if ( effectYMult * effectY - prevEffectY > prevEffectY )
					effectPeriod = Math.asin( effectY );
				else
					effectPeriod = Math.PI - Math.asin( effectY );
				
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
								if (loop && (bar < song.loopStart || bar >= song.loopStart + song.loopLength)) {
									bar = song.loopStart;
								}
								if (bar >= song.bars) {
									bar = 0;
								}
								updateInstruments();
							}
						}
					}
				}
			}
			
			_playhead = (((arpeggio + 1.0 - arpeggioSamples / samplesPerArpeggio) / 4.0 + part) / song.parts + beat) / song.beats + bar;
		}
		
		private function frequencyFromPitch(pitch: Number): Number {
			return 440.0 * Math.pow(2.0, (pitch - 69.0) / 12.0);
		}
		
		private function volumeConversion(toneVolume: Number): Number {
			return Math.pow(toneVolume / 3.0, 1.5);
		}
		
		private function getSamplesPerArpeggio(): int {
			if (song == null) return 0;
			var beatsPerMinute: Number = 120.0 * Math.pow(2.0, (-1.0 + song.tempo) / 3.0);
			var beatsPerSecond: Number = beatsPerMinute / 60.0;
			var partsPerSecond: Number = beatsPerSecond * song.parts;
			var arpeggioPerSecond: Number = partsPerSecond * 4.0;
			return samplesPerSecond / arpeggioPerSecond;
		}
	}
}
