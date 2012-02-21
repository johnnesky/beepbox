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
		public var arpeggio: int;
		public var arpeggioSamples: int;
		public var paused: Boolean;
		
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
			arpeggio = 0;
			arpeggioSamples = 0;
			paused = false;
			
			function onSampleData(event: SampleDataEvent): void {
				const beatsPerMinute: Number = 120.0 * 4.0 * Math.pow(2.0, (-1.0 + doc.tempo) / 3.0);
				const beatsPerSecond: Number = beatsPerMinute / 60.0;
				const arpeggioPerSecond: Number = beatsPerSecond * 4.0;
				const samplesPerArpeggio: int = samplesPerSecond / arpeggioPerSecond;
				const globalVolume: Number = 0.25;
				
				if (arpeggioSamples == 0 || arpeggioSamples > samplesPerArpeggio) {
					arpeggioSamples = samplesPerArpeggio;
				}
				
				var totalSamples: int = 2048;
				
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
					
					var leadFrequency: Number;
					var leadFreqDelta: Number;
					var harmonyFrequency: Number;
					var harmonyFreqDelta: Number;
					var bassFrequency: Number;
					var bassFreqDelta: Number;
					
					for (var channel: int = 0; channel < 3; channel++) {
						var pattern: BarPattern = doc.getBarPattern(channel, bar);
						var tone: Tone = null;
						for (i = 0; i < pattern.tones.length; i++) {
							if (pattern.tones[i].end <= beat) {
								continue;
							} else if (pattern.tones[i].start <= beat && pattern.tones[i].end > beat) {
								tone = pattern.tones[i];
								break;
							} else if (pattern.tones[i].start > beat) {
								break;
							}
						}
						
						var frequency: Number;
						var freqDelta: Number;
						if (tone == null) {
							frequency = 0;
							freqDelta = 0;
						} else {
							var pitch: int = Music.channelRoots[channel] + Music.keyTransposes[doc.key];
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
								if (pin.time + tone.start <= beat) {
									startPin = pin;
								} else {
									endPin = pin;
									break;
								}
							}
							var startTime:     int = (tone.start + startPin.time - beat) * 4 - arpeggio;
							var endTime:       int = (tone.start + endPin.time - beat) * 4 - arpeggio;
							var startRatio:    Number = (1.0 - (arpeggioSamples + samples) / samplesPerArpeggio - startTime) / (endTime - startTime);
							var endRatio:      Number = (1.0 - (arpeggioSamples) / samplesPerArpeggio - startTime) / (endTime - startTime);
							var startInterval: Number = startPin.interval * (1.0 - startRatio) + endPin.interval * startRatio;
							var endInterval:   Number = startPin.interval * (1.0 - endRatio  ) + endPin.interval * endRatio;
							var startFreq: Number = 440.0 * Math.pow(2.0, (pitch + startInterval - 69.0) / 12.0);
							var endFreq:   Number = 440.0 * Math.pow(2.0, (pitch + endInterval   - 69.0) / 12.0);
							frequency = startFreq;
							freqDelta = (endFreq - startFreq) / samples;
						}
						
						if (channel == 0) {
							leadFrequency = frequency;
							leadFreqDelta = freqDelta;
						} else if (channel == 1) {
							harmonyFrequency = frequency;
							harmonyFreqDelta = freqDelta;
						} else if (channel == 2) {
							bassFrequency = frequency;
							bassFreqDelta = freqDelta;
						}
					}
					
					while (samples > 0) {
						var sample: Number = 0.0;
						//sample = period < 0.5 ? -1 + period * 4.0 : 3.0 - period * 4.0;
						
						leadPeriod += leadFrequency * sampleTime;
						leadFrequency += leadFreqDelta;
						if (leadPeriod >= 1.0) leadPeriod -= 1.0;
						sample += leadPeriod > 0.5 ? 1.0 : -1.0;
						
						harmonyPeriod += harmonyFrequency * sampleTime;
						harmonyFrequency += harmonyFreqDelta;
						if (harmonyPeriod >= 1.0) harmonyPeriod -= 1.0;
						sample += harmonyPeriod > 0.5 ? 1.0 : -1.0;
						
						bassPeriod += bassFrequency * sampleTime;
						bassFrequency += bassFreqDelta;
						if (bassPeriod >= 1.0) bassPeriod -= 1.0;
						sample += bassPeriod > 0.5 ? 1.0 : -1.0;
						
						sample *= globalVolume;
						event.data.writeFloat(sample);
						event.data.writeFloat(sample);
						samples--;
					}
						
					if (arpeggioSamples == 0) {
						arpeggio++;
						arpeggioSamples = samplesPerArpeggio;
						if (arpeggio == 4) {
							arpeggio = 0;
							beat++;
							if (beat == Music.beatsPerBar) {
								beat = 0;
								bar++;
								if (bar < doc.loopStart || bar >= doc.loopStart + doc.loopLength) {
									bar = doc.loopStart;
								}
							}
						}
					}
				}
				
				playhead = beat + (arpeggio + 1.0 - arpeggioSamples / samplesPerArpeggio) / 4.0;
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
