package {
	
	import flash.events.SampleDataEvent;
	import flash.events.TimerEvent;
	import flash.media.Sound;
	import flash.media.SoundChannel;
	import flash.utils.Timer;
	import flash.utils.ByteArray;
	
	public class Synth {
		public const samplesPerSecond: int = 44100;
		public var playhead: Number = 0.0;
		public var bar: int = 0;
		public var beat: int = 0;
		public var part: int = 0;
		public var arpeggio: int = 0;
		public var arpeggioSamples: int = 0;
		public var paused: Boolean = true;
		public var pianoPressed: Boolean = false;
		public var pianoNote: int = 0;
		private const waves: Vector.<Vector.<Number>> = new <Vector.<Number>> [
			new <Number>[1.0/15.0, 3.0/15.0, 5.0/15.0, 7.0/15.0, 9.0/15.0, 11.0/15.0, 13.0/15.0, 15.0/15.0, 15.0/15.0, 13.0/15.0, 11.0/15.0, 9.0/15.0, 7.0/15.0, 5.0/15.0, 3.0/15.0, 1.0/15.0, -1.0/15.0, -3.0/15.0, -5.0/15.0, -7.0/15.0, -9.0/15.0, -11.0/15.0, -13.0/15.0, -15.0/15.0, -15.0/15.0, -13.0/15.0, -11.0/15.0, -9.0/15.0, -7.0/15.0, -5.0/15.0, -3.0/15.0, -1.0/15.0],
			new <Number>[1.0, -1.0],
			new <Number>[1.0, -1.0, -1.0, -1.0],
			new <Number>[1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0, -1.0],
			new <Number>[1.0/31.0, 3.0/31.0, 5.0/31.0, 7.0/31.0, 9.0/31.0, 11.0/31.0, 13.0/31.0, 15.0/31.0, 17.0/31.0, 19.0/31.0, 21.0/31.0, 23.0/31.0, 25.0/31.0, 27.0/31.0, 29.0/31.0, 31.0/31.0, -31.0/31.0, -29.0/31.0, -27.0/31.0, -25.0/31.0, -23.0/31.0, -21.0/31.0, -19.0/31.0, -17.0/31.0, -15.0/31.0, -13.0/31.0, -11.0/31.0, -9.0/31.0, -7.0/31.0, -5.0/31.0, -3.0/31.0, -1.0/31.0],
			//new <Number>[Math.sin(Math.PI * 0.0 / 64.0), Math.sin(Math.PI * 1.0 / 64.0), Math.sin(Math.PI * 2.0 / 64.0), Math.sin(Math.PI * 3.0 / 64.0), Math.sin(Math.PI * 4.0 / 64.0), Math.sin(Math.PI * 5.0 / 64.0), Math.sin(Math.PI * 6.0 / 64.0), Math.sin(Math.PI * 7.0 / 64.0), Math.sin(Math.PI * 8.0 / 64.0), Math.sin(Math.PI * 9.0 / 64.0), Math.sin(Math.PI * 10.0 / 64.0), Math.sin(Math.PI * 11.0 / 64.0), Math.sin(Math.PI * 12.0 / 64.0), Math.sin(Math.PI * 13.0 / 64.0), Math.sin(Math.PI * 14.0 / 64.0), Math.sin(Math.PI * 15.0 / 64.0), Math.sin(Math.PI * 16.0 / 64.0), Math.sin(Math.PI * 17.0 / 64.0), Math.sin(Math.PI * 18.0 / 64.0), Math.sin(Math.PI * 19.0 / 64.0), Math.sin(Math.PI * 20.0 / 64.0), Math.sin(Math.PI * 21.0 / 64.0), Math.sin(Math.PI * 22.0 / 64.0), Math.sin(Math.PI * 23.0 / 64.0), Math.sin(Math.PI * 24.0 / 64.0), Math.sin(Math.PI * 25.0 / 64.0), Math.sin(Math.PI * 26.0 / 64.0), Math.sin(Math.PI * 27.0 / 64.0), Math.sin(Math.PI * 28.0 / 64.0), Math.sin(Math.PI * 29.0 / 64.0), Math.sin(Math.PI * 30.0 / 64.0), Math.sin(Math.PI * 31.0 / 64.0), Math.sin(Math.PI * 32.0 / 64.0), Math.sin(Math.PI * 33.0 / 64.0), Math.sin(Math.PI * 34.0 / 64.0), Math.sin(Math.PI * 35.0 / 64.0), Math.sin(Math.PI * 36.0 / 64.0), Math.sin(Math.PI * 37.0 / 64.0), Math.sin(Math.PI * 38.0 / 64.0), Math.sin(Math.PI * 39.0 / 64.0), Math.sin(Math.PI * 40.0 / 64.0), Math.sin(Math.PI * 41.0 / 64.0), Math.sin(Math.PI * 42.0 / 64.0), Math.sin(Math.PI * 43.0 / 64.0), Math.sin(Math.PI * 44.0 / 64.0), Math.sin(Math.PI * 45.0 / 64.0), Math.sin(Math.PI * 46.0 / 64.0), Math.sin(Math.PI * 47.0 / 64.0), Math.sin(Math.PI * 48.0 / 64.0), Math.sin(Math.PI * 49.0 / 64.0), Math.sin(Math.PI * 50.0 / 64.0), Math.sin(Math.PI * 51.0 / 64.0), Math.sin(Math.PI * 52.0 / 64.0), Math.sin(Math.PI * 53.0 / 64.0), Math.sin(Math.PI * 54.0 / 64.0), Math.sin(Math.PI * 55.0 / 64.0), Math.sin(Math.PI * 56.0 / 64.0), Math.sin(Math.PI * 57.0 / 64.0), Math.sin(Math.PI * 58.0 / 64.0), Math.sin(Math.PI * 59.0 / 64.0), Math.sin(Math.PI * 60.0 / 64.0), Math.sin(Math.PI * 61.0 / 64.0), Math.sin(Math.PI * 62.0 / 64.0), Math.sin(Math.PI * 63.0 / 64.0), Math.sin(Math.PI * 64.0 / 64.0), Math.sin(Math.PI * 65.0 / 64.0), Math.sin(Math.PI * 66.0 / 64.0), Math.sin(Math.PI * 67.0 / 64.0), Math.sin(Math.PI * 68.0 / 64.0), Math.sin(Math.PI * 69.0 / 64.0), Math.sin(Math.PI * 70.0 / 64.0), Math.sin(Math.PI * 71.0 / 64.0), Math.sin(Math.PI * 72.0 / 64.0), Math.sin(Math.PI * 73.0 / 64.0), Math.sin(Math.PI * 74.0 / 64.0), Math.sin(Math.PI * 75.0 / 64.0), Math.sin(Math.PI * 76.0 / 64.0), Math.sin(Math.PI * 77.0 / 64.0), Math.sin(Math.PI * 78.0 / 64.0), Math.sin(Math.PI * 79.0 / 64.0), Math.sin(Math.PI * 80.0 / 64.0), Math.sin(Math.PI * 81.0 / 64.0), Math.sin(Math.PI * 82.0 / 64.0), Math.sin(Math.PI * 83.0 / 64.0), Math.sin(Math.PI * 84.0 / 64.0), Math.sin(Math.PI * 85.0 / 64.0), Math.sin(Math.PI * 86.0 / 64.0), Math.sin(Math.PI * 87.0 / 64.0), Math.sin(Math.PI * 88.0 / 64.0), Math.sin(Math.PI * 89.0 / 64.0), Math.sin(Math.PI * 90.0 / 64.0), Math.sin(Math.PI * 91.0 / 64.0), Math.sin(Math.PI * 92.0 / 64.0), Math.sin(Math.PI * 93.0 / 64.0), Math.sin(Math.PI * 94.0 / 64.0), Math.sin(Math.PI * 95.0 / 64.0), Math.sin(Math.PI * 96.0 / 64.0), Math.sin(Math.PI * 97.0 / 64.0), Math.sin(Math.PI * 98.0 / 64.0), Math.sin(Math.PI * 99.0 / 64.0), Math.sin(Math.PI * 100.0 / 64.0), Math.sin(Math.PI * 101.0 / 64.0), Math.sin(Math.PI * 102.0 / 64.0), Math.sin(Math.PI * 103.0 / 64.0), Math.sin(Math.PI * 104.0 / 64.0), Math.sin(Math.PI * 105.0 / 64.0), Math.sin(Math.PI * 106.0 / 64.0), Math.sin(Math.PI * 107.0 / 64.0), Math.sin(Math.PI * 108.0 / 64.0), Math.sin(Math.PI * 109.0 / 64.0), Math.sin(Math.PI * 110.0 / 64.0), Math.sin(Math.PI * 111.0 / 64.0), Math.sin(Math.PI * 112.0 / 64.0), Math.sin(Math.PI * 113.0 / 64.0), Math.sin(Math.PI * 114.0 / 64.0), Math.sin(Math.PI * 115.0 / 64.0), Math.sin(Math.PI * 116.0 / 64.0), Math.sin(Math.PI * 117.0 / 64.0), Math.sin(Math.PI * 118.0 / 64.0), Math.sin(Math.PI * 119.0 / 64.0), Math.sin(Math.PI * 120.0 / 64.0), Math.sin(Math.PI * 121.0 / 64.0), Math.sin(Math.PI * 122.0 / 64.0), Math.sin(Math.PI * 123.0 / 64.0), Math.sin(Math.PI * 124.0 / 64.0), Math.sin(Math.PI * 125.0 / 64.0), Math.sin(Math.PI * 126.0 / 64.0), Math.sin(Math.PI * 127.0 / 64.0), ],
		];
		private var prevSample: Number = 0.0;
		private var leadPeriod: Number = 0.0;
		private var harmonyPeriod: Number = 0.0;
		private var bassPeriod: Number = 0.0;
		private var drumPeriod: Number = 0.0;
		private var drumBuffer: int = 1;
		private var stillGoing: Boolean = false;
		private var doc: Document;
		
		public function getSamplesPerArpeggio(): int {
			var beatsPerMinute: Number = 120.0 * Math.pow(2.0, (-1.0 + doc.tempo) / 3.0);
			var beatsPerSecond: Number = beatsPerMinute / 60.0;
			var partsPerSecond: Number = beatsPerSecond * doc.parts;
			var arpeggioPerSecond: Number = partsPerSecond * 4.0;
			return samplesPerSecond / arpeggioPerSecond;
		}
		
		public function Synth(doc: Document) {
			this.doc = doc;
			waves.fixed = true;
			for each (var wave: Vector.<Number> in waves) {
				wave.fixed = true;
			}
		}
		
		public function synthesize(data: ByteArray, totalSamples: int, loop: Boolean): void {
			const sampleTime: Number = 1.0 / samplesPerSecond;
			const samplesPerArpeggio: int = getSamplesPerArpeggio();
			
			const maxLeadVolume:    Number = Music.channelVolumes[0] * Music.waveVolumes[doc.channelWaves[0]];
			const maxHarmonyVolume: Number = Music.channelVolumes[1] * Music.waveVolumes[doc.channelWaves[1]];
			const maxBassVolume:    Number = Music.channelVolumes[2] * Music.waveVolumes[doc.channelWaves[2]];
			const maxDrumVolume:    Number = Music.channelVolumes[3];
			
			const leadWave: Vector.<Number> = waves[doc.channelWaves[0]];
			const harmonyWave: Vector.<Number> = waves[doc.channelWaves[1]];
			const bassWave: Vector.<Number> = waves[doc.channelWaves[2]];
			
			const leadWaveLength: int = leadWave.length;
			const harmonyWaveLength: int = harmonyWave.length;
			const bassWaveLength: int = bassWave.length;
			
			var i: int;
			
			if (arpeggioSamples == 0 || arpeggioSamples > samplesPerArpeggio) {
				arpeggioSamples = samplesPerArpeggio;
			}
			if (part >= doc.parts) {
				beat++;
				part = 0;
				arpeggio = 0;
				arpeggioSamples = samplesPerArpeggio;
			}
			if (beat >= doc.beats) {
				bar++;
				if (loop && (bar < doc.loopStart || bar >= doc.loopStart + doc.loopLength)) {
					bar = doc.loopStart;
				}
				beat = 0;
				part = 0;
				arpeggio = 0;
				arpeggioSamples = samplesPerArpeggio;
			}
			
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
				var harmonyPeriodDelta: Number;
				var harmonyPeriodDeltaScale: Number;
				var harmonyVolume: Number;
				var harmonyVolumeDelta: Number;
				var bassPeriodDelta: Number;
				var bassPeriodDeltaScale: Number;
				var bassVolume: Number;
				var bassVolumeDelta: Number;
				var drumPeriodDelta: Number;
				var drumPeriodDeltaScale: Number;
				var drumVolume: Number;
				var drumVolumeDelta: Number;
				var time: int = part + beat * doc.parts;
				
				for (var channel: int = 0; channel < 4; channel++) {
					var pattern: BarPattern = doc.getBarPattern(channel, bar);
					var tone: Tone = null;
					for (i = 0; i < pattern.tones.length; i++) {
						if (pattern.tones[i].end <= time) {
							continue;
						} else if (pattern.tones[i].start <= time && pattern.tones[i].end > time) {
							tone = pattern.tones[i];
							break;
						} else if (pattern.tones[i].start > time) {
							break;
						}
					}
					
					var channelRoot: int = Music.channelRoots[channel];
					var pitch: int = channel == 3 ? 0 : Music.keyTransposes[doc.key];
					var intervalScale: int = channel == 3 ? Music.drumInterval : 1;
					var periodDelta: Number;
					var periodDeltaScale: Number;
					var volume: Number;
					var volumeDelta: Number;
					if (pianoPressed && channel == doc.channel) {
						periodDelta = frequencyFromPitch(pitch + channelRoot + pianoNote * intervalScale) * sampleTime;
						periodDeltaScale = 1.0;
						volume = channel == 3 ? 1.0 : Math.pow(2.0, -(pitch + pianoNote) / 48.0);
						volumeDelta = 0.0;
					} else if (tone == null) {
						periodDelta = 0.0;
						periodDeltaScale = 0.0;
						volume = 0.0;
						volumeDelta = 0.0;
					} else {
						if (tone.notes.length == 2) {
							pitch += tone.notes[arpeggio >> 1];
						} else if (tone.notes.length == 3) {
							pitch += tone.notes[arpeggio == 3 ? 1 : arpeggio];
						} else if (tone.notes.length == 4) {
							pitch += tone.notes[arpeggio];
						} else {
							pitch += tone.notes[0];
						}
						pitch *= intervalScale;
						
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
						var startTime:     int = (tone.start + startPin.time - time) * 4 - arpeggio;
						var endTime:       int = (tone.start + endPin.time - time) * 4 - arpeggio;
						var startRatio:    Number = (1.0 - (arpeggioSamples + samples) / samplesPerArpeggio - startTime) / (endTime - startTime);
						var endRatio:      Number = (1.0 - (arpeggioSamples) / samplesPerArpeggio - startTime) / (endTime - startTime);
						var startInterval: Number = startPin.interval * (1.0 - startRatio) + endPin.interval * startRatio;
						var endInterval:   Number = startPin.interval * (1.0 - endRatio  ) + endPin.interval * endRatio;
						var startFreq: Number = frequencyFromPitch(pitch + channelRoot + startInterval);
						var endFreq:   Number = frequencyFromPitch(pitch + channelRoot + endInterval);
						var startVol:  Number = channel == 3 ? 1.0 : Math.pow(2.0, -(pitch + startInterval) / 48.0);
						var endVol:    Number = channel == 3 ? 1.0 : Math.pow(2.0, -(pitch + endInterval) / 48.0);
						startVol *= volumeConversion(startPin.volume * (1.0 - startRatio) + endPin.volume * startRatio);
						endVol   *= volumeConversion(startPin.volume * (1.0 - endRatio)   + endPin.volume * endRatio);
						var frequency: Number = startFreq;
						var freqScale: Number = endFreq / startFreq;
						periodDelta = frequency * sampleTime;
						periodDeltaScale = Math.pow(freqScale, 1.0 / samples);
						volume = startVol;
						volumeDelta = (endVol - startVol) / samples;
					}
					
					if (channel == 0) {
						leadPeriodDelta = periodDelta;
						leadPeriodDeltaScale = periodDeltaScale;
						leadVolume = volume * maxLeadVolume;
						leadVolumeDelta = volumeDelta * maxLeadVolume;
						if (leadVolume == 0.0) leadPeriod = 0.0;
					} else if (channel == 1) {
						harmonyPeriodDelta = periodDelta;
						harmonyPeriodDeltaScale = periodDeltaScale;
						harmonyVolume = volume * maxHarmonyVolume;
						harmonyVolumeDelta = volumeDelta * maxHarmonyVolume;
						if (harmonyVolume == 0.0) harmonyPeriod = 0.0;
					} else if (channel == 2) {
						bassPeriodDelta = periodDelta;
						bassPeriodDeltaScale = periodDeltaScale;
						bassVolume = volume * maxBassVolume;
						bassVolumeDelta = volumeDelta * maxBassVolume;
						if (bassVolume == 0.0) bassPeriod = 0.0;
					} else if (channel == 3) {
						drumPeriodDelta = periodDelta;
						drumPeriodDeltaScale = periodDeltaScale;
						drumVolume = volume * maxDrumVolume;
						drumVolumeDelta = volumeDelta * maxDrumVolume;
						if (drumVolume == 0.0) drumPeriod = 0.0;
					}
				}
				
				while (samples > 0) {
					var sample: Number = 0.0;
					
					sample += leadWave[int(leadPeriod * leadWaveLength)] * leadVolume;
					leadVolume += leadVolumeDelta;
					leadPeriod += leadPeriodDelta;
					leadPeriodDelta *= leadPeriodDeltaScale;
					leadPeriod -= int(leadPeriod);
					
					sample += harmonyWave[int(harmonyPeriod * harmonyWaveLength)] * harmonyVolume;
					harmonyVolume += harmonyVolumeDelta;
					harmonyPeriod += harmonyPeriodDelta;
					harmonyPeriodDelta *= harmonyPeriodDeltaScale;
					harmonyPeriod -= int(harmonyPeriod);
					
					sample += bassWave[int(bassPeriod * bassWaveLength)] * bassVolume;
					bassVolume += bassVolumeDelta;
					bassPeriod += bassPeriodDelta;
					bassPeriodDelta *= bassPeriodDeltaScale;
					bassPeriod -= int(bassPeriod);
					
					sample += drumBuffer & 1 ? drumVolume : -drumVolume;
					drumVolume += drumVolumeDelta;
					drumPeriod += drumPeriodDelta;
					drumPeriodDelta *= drumPeriodDeltaScale;
					if (drumPeriod >= 1.0) {
						drumPeriod -= 1.0;
						var newBuffer: int = drumBuffer >> 1;
						if ((drumBuffer + newBuffer) & 1 == 1) {
							newBuffer += 1 << 14;
						}
						drumBuffer = newBuffer;
					}
					
					sample = prevSample + (sample - prevSample) * 0.2;
					prevSample = sample;
					
					data.writeFloat(sample);
					data.writeFloat(sample);
					samples--;
				}
					
				if (arpeggioSamples == 0) {
					arpeggio++;
					arpeggioSamples = samplesPerArpeggio;
					if (arpeggio == 4) {
						arpeggio = 0;
						part++;
						if (part == doc.parts) {
							part = 0;
							beat++;
							if (beat == doc.beats) {
								beat = 0;
								bar++;
								if (loop && (bar < doc.loopStart || bar >= doc.loopStart + doc.loopLength)) {
									bar = doc.loopStart;
								}
							}
						}
					}
				}
			}
			
			playhead = (((arpeggio + 1.0 - arpeggioSamples / samplesPerArpeggio) / 4.0 + part) / doc.parts + beat) / doc.beats;
		}
		
		public function play(): void {
			bar = doc.loopStart;
			paused = false;
			
			function onSampleData(event: SampleDataEvent): void {
				if (paused) {
					for (var i: int = 0; i < 4096; i++) {
						event.data.writeFloat(0.0);
						event.data.writeFloat(0.0);
					}
				} else {
					synthesize(event.data, 4096, true);
				}
				stillGoing = true;
			}
			
			var soundChannel: SoundChannel;
			
			function checkSound(event: TimerEvent): void {
				if (!stillGoing) {
					if (soundChannel != null) {
						soundChannel.stop();
					}
					var sound: Sound = new Sound();
					sound.addEventListener(SampleDataEvent.SAMPLE_DATA, onSampleData, false, 0, true);
					soundChannel = sound.play();
				} else {
					stillGoing = false;
				}
			}
			
			var timer: Timer = new Timer(200, 0);
			timer.addEventListener(TimerEvent.TIMER, checkSound);
			timer.start();
		}
		
		private function frequencyFromPitch(pitch: int): Number {
			return 440.0 * Math.pow(2.0, (pitch - 69.0) / 12.0);
		}
		
		private function volumeConversion(volume: Number): Number {
			return Math.pow(volume / 3.0, 1.5);
		}
	}
}
