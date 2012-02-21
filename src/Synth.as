package {
	
	import flash.events.SampleDataEvent;
	import flash.events.TimerEvent;
	import flash.media.Sound;
	import flash.media.SoundChannel;
	import flash.utils.Timer;
	
	public class Synth {
		public var playhead: Number;
		public var bar: int;
		public var beat: int;
		public var part: int;
		public var arpeggio: int;
		public var arpeggioSamples: int;
		public var paused: Boolean;
		private var prevSample: Number;
		
		public function Synth(doc: Document) {
			const samplesPerSecond: int = 44100;
			const sampleTime: Number = 1.0 / samplesPerSecond;
			
			var leadPeriod: Number = 0.0;
			var harmonyPeriod: Number = 0.0;
			var bassPeriod: Number = 0.0;
			var i: int;
			var stillGoing: Boolean = false;
			bar = doc.loopStart;
			beat = 0;
			part = 0;
			arpeggio = 0;
			arpeggioSamples = 0;
			paused = false;
			prevSample = 0.0;
			playhead = 0.0;
			
			function onSampleData(event: SampleDataEvent): void {
				const beatsPerMinute: Number = 120.0 * Math.pow(2.0, (-1.0 + doc.tempo) / 3.0);
				const beatsPerSecond: Number = beatsPerMinute / 60.0;
				const partsPerSecond: Number = beatsPerSecond * doc.parts;
				const arpeggioPerSecond: Number = partsPerSecond * 4.0;
				const samplesPerArpeggio: int = samplesPerSecond / arpeggioPerSecond;
				
				const consolidatedWaves: Array = [0,1,1,1,2];
				const leadPulse:    Boolean = doc.channelWaves[0] > 0;
				const harmonyPulse: Boolean = doc.channelWaves[1] > 0;
				const bassPulse:    Boolean = doc.channelWaves[2] > 0;
				
				const consolidatedThresholds: Array = [0.5,0.5,0.25,0.125];
				const leadThreshold:    Number = consolidatedThresholds[doc.channelWaves[0]];
				const harmonyThreshold: Number = consolidatedThresholds[doc.channelWaves[1]];
				const bassThreshold:    Number = consolidatedThresholds[doc.channelWaves[2]];
				
				const maxLeadVolume:    Number = Music.channelVolumes[0] * Music.waveVolumes[doc.channelWaves[0]];
				const maxHarmonyVolume: Number = Music.channelVolumes[1] * Music.waveVolumes[doc.channelWaves[1]];
				const maxBassVolume:    Number = Music.channelVolumes[2] * Music.waveVolumes[doc.channelWaves[2]];
				
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
					if (bar < doc.loopStart || bar >= doc.loopStart + doc.loopLength) {
						bar = doc.loopStart;
					}
					beat = 0;
					part = 0;
					arpeggio = 0;
					arpeggioSamples = samplesPerArpeggio;
				}
				
				var totalSamples: int = 4096;
				
				if (paused) {
					while (totalSamples > 0) {
						event.data.writeFloat(0.0);
						event.data.writeFloat(0.0);
						totalSamples--;
					}
					return;
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
					var leadPeriodDeltaDelta: Number;
					var leadVolume: Number;
					var leadVolumeDelta: Number;
					var harmonyPeriodDelta: Number;
					var harmonyPeriodDeltaDelta: Number;
					var harmonyVolume: Number;
					var harmonyVolumeDelta: Number;
					var bassPeriodDelta: Number;
					var bassPeriodDeltaDelta: Number;
					var bassVolume: Number;
					var bassVolumeDelta: Number;
					var time: int = part + beat * doc.parts;
					
					for (var channel: int = 0; channel < 3; channel++) {
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
						
						var periodDelta: Number;
						var periodDeltaDelta: Number;
						var volume: Number;
						var volumeDelta: Number;
						if (tone == null) {
							periodDelta = 0.0;
							periodDeltaDelta = 0.0;
							volume = 0.0;
							volumeDelta = 0.0;
						} else {
							var channelRoot: int = Music.channelRoots[channel];
							var pitch: int = Music.keyTransposes[doc.key];
							if (tone.notes.length == 2) {
								pitch += tone.notes[arpeggio >> 1];
							} else if (tone.notes.length == 3) {
								pitch += tone.notes[arpeggio == 3 ? 1 : arpeggio];
							} else if (tone.notes.length == 4) {
								pitch += tone.notes[arpeggio];
							} else {
								pitch += tone.notes[0];
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
							var startTime:     int = (tone.start + startPin.time - time) * 4 - arpeggio;
							var endTime:       int = (tone.start + endPin.time - time) * 4 - arpeggio;
							var startRatio:    Number = (1.0 - (arpeggioSamples + samples) / samplesPerArpeggio - startTime) / (endTime - startTime);
							var endRatio:      Number = (1.0 - (arpeggioSamples) / samplesPerArpeggio - startTime) / (endTime - startTime);
							var startInterval: Number = startPin.interval * (1.0 - startRatio) + endPin.interval * startRatio;
							var endInterval:   Number = startPin.interval * (1.0 - endRatio  ) + endPin.interval * endRatio;
							var startFreq: Number = 440.0 * Math.pow(2.0, (pitch + channelRoot + startInterval - 69.0) / 12.0);
							var endFreq:   Number = 440.0 * Math.pow(2.0, (pitch + channelRoot + endInterval   - 69.0) / 12.0);
							var startVol:  Number = Math.pow(2.0, -(pitch + startInterval) / 48.0);
							var endVol:    Number = Math.pow(2.0, -(pitch + endInterval) / 48.0);
							var frequency: Number = startFreq;
							var freqDelta: Number = (endFreq - startFreq) / samples;
							periodDelta = frequency * sampleTime;
							periodDeltaDelta = freqDelta * sampleTime;
							volume = startVol;
							volumeDelta = (endVol - startVol) / samples;
						}
						
						if (channel == 0) {
							leadPeriodDelta = periodDelta;
							leadPeriodDeltaDelta = periodDeltaDelta;
							leadVolume = volume * maxLeadVolume;
							leadVolumeDelta = volumeDelta * maxLeadVolume;
						} else if (channel == 1) {
							harmonyPeriodDelta = periodDelta;
							harmonyPeriodDeltaDelta = periodDeltaDelta;
							harmonyVolume = volume * maxHarmonyVolume;
							harmonyVolumeDelta = volumeDelta * maxHarmonyVolume;
						} else if (channel == 2) {
							bassPeriodDelta = periodDelta;
							bassPeriodDeltaDelta = periodDeltaDelta;
							bassVolume = volume * maxBassVolume;
							bassVolumeDelta = volumeDelta * maxBassVolume;
						}
					}
					
					while (samples > 0) {
						var sample: Number = 0.0;
						
						if (leadPulse) {
							sample += leadPeriod > leadThreshold ? leadVolume : -leadVolume;
						} else {
							//sample += (leadPeriod < 0.5 ? -1 + leadPeriod * 4.0 : 3.0 - leadPeriod * 4.0) * leadVolume;
							sample += (int((leadPeriod < 0.5 ? leadPeriod * 2.0 : 2.0 - leadPeriod * 2.0) * 15.9999999) * 0.1333333 - 1.0) * leadVolume;
						}
						leadPeriod += leadPeriodDelta;
						leadPeriodDelta += leadPeriodDeltaDelta;
						if (leadPeriod >= 1.0) leadPeriod -= 1.0;
						leadVolume += leadVolumeDelta;
						
						if (harmonyPulse) {
							sample += harmonyPeriod > harmonyThreshold ? harmonyVolume : -harmonyVolume;
						} else {
							//sample += (harmonyPeriod < 0.5 ? -1 + harmonyPeriod * 4.0 : 3.0 - harmonyPeriod * 4.0) * harmonyVolume;
							sample += (int((harmonyPeriod < 0.5 ? harmonyPeriod * 2.0 : 2.0 - harmonyPeriod * 2.0) * 15.9999999) * 0.1333333 - 1.0) * harmonyVolume;
						}
						harmonyPeriod += harmonyPeriodDelta;
						harmonyPeriodDelta += harmonyPeriodDeltaDelta;
						if (harmonyPeriod >= 1.0) harmonyPeriod -= 1.0;
						harmonyVolume += harmonyVolumeDelta;
						
						if (bassPulse) {
							sample += bassPeriod > bassThreshold ? bassVolume : -bassVolume;
						} else {
							//sample += (bassPeriod < 0.5 ? -1 + bassPeriod * 4.0 : 3.0 - bassPeriod * 4.0) * bassVolume;
							sample += (int((bassPeriod < 0.5 ? bassPeriod * 2.0 : 2.0 - bassPeriod * 2.0) * 15.9999999) * 0.1333333 - 1.0) * bassVolume;
						}
						bassPeriod += bassPeriodDelta;
						if (bassPeriod >= 1.0) bassPeriod -= 1.0;
						bassPeriodDelta += bassPeriodDeltaDelta;
						bassVolume += bassVolumeDelta;
						
						sample = prevSample + (sample - prevSample) * 0.3;
						prevSample = sample;
						
						event.data.writeFloat(sample);
						event.data.writeFloat(sample);
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
									if (bar < doc.loopStart || bar >= doc.loopStart + doc.loopLength) {
										bar = doc.loopStart;
									}
								}
							}
						}
					}
				}
				
				playhead = (((arpeggio + 1.0 - arpeggioSamples / samplesPerArpeggio) / 4.0 + part) / doc.parts + beat) / doc.beats;
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
	}
}
