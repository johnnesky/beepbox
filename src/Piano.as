package {
	
	import flash.events.SampleDataEvent;
	import flash.media.Sound;
	
	public class Piano {
		public static var playhead: Number;
		
		public static function frequencyFromPitchIndex(pitchIndex: int): Number {
			return 440.0 * Math.pow(2.0, (pitchIndex - 69.0) / 12.0);
		}
		
		public static function playBar(bar: Bar): void {
			const samplesPerSecond: int = 44100;
			const sampleTime: Number = 1.0 / samplesPerSecond;
			const beatsPerMinute: Number = 120.0 * 4.0;
			const beatsPerSecond: Number = beatsPerMinute / 60.0;
			const samplesPerBeat: int = samplesPerSecond / beatsPerSecond;
			const arpeggioPerSecond: Number = beatsPerSecond * 2.0;
			const samplesPerArpeggio: int = samplesPerSecond / arpeggioPerSecond;
			
			var period: Number = 0.0;
			var beat: int = 0;
			var beatSamples: int = samplesPerBeat;
			var arpeggio: int = 0;
			var arpeggioSamples: int = samplesPerArpeggio;
			var i: int;
			
			function onSampleData(event: SampleDataEvent): void {
				var totalSamples: int = 2048;
				
				var tone: Tone = null;
				var toneIndex: int = 0;
				for (i = 0; i < bar.tones.length; i++) {
					if (bar.tones[i].end <= beat) {
						toneIndex++;
					} else if (bar.tones[i].start <= beat && bar.tones[i].end > beat) {
						tone = bar.tones[i];
						break;
					} else if (bar.tones[i].start > beat) {
						break;
					}
				}
				
				while (totalSamples > 0) {
					var samples1: int;
					if (beatSamples <= totalSamples) {
						samples1 = beatSamples;
					} else {
						samples1 = totalSamples;
					}
					totalSamples -= samples1;
					beatSamples -= samples1;
					
					if (tone != null) {
						while (samples1 > 0) {
							var samples2: int;
							if (arpeggioSamples <= samples1) {
								samples2 = arpeggioSamples;
							} else {
								samples2 = samples1;
							}
							samples1 -= samples2;
							arpeggioSamples -= samples2;
							
							var note: Note = null;
							if (tone.notes.length == 2) {
								note = tone.notes[arpeggio];
							} else {
								note = tone.notes[0];
							}
							var startPin: NotePin = null;
							var endPin: NotePin = null;
							for each (var pin: NotePin in note.pins) {
								if (pin.time + tone.start <= beat) {
									startPin = pin;
								} else {
									endPin = pin;
									break;
								}
							}
							var startTime: int = tone.start + startPin.time - beat;
							var endTime:   int = tone.start + endPin.time - beat;
							var startRatio: Number = (1.0 - (beatSamples + samples1 - samples2) / samplesPerBeat - startTime) / (endTime - startTime);
							var endRatio:   Number = (1.0 - (beatSamples + samples1) / samplesPerBeat - startTime) / (endTime - startTime);
							var startPitch: Number = Bar.pitches[startPin.pitch] * (1.0 - startRatio) + Bar.pitches[endPin.pitch] * startRatio;
							var endPitch:   Number = Bar.pitches[startPin.pitch] * (1.0 - endRatio)   + Bar.pitches[endPin.pitch] * endRatio;
							var startFreq: Number = 440.0 * Math.pow(2.0, (startPitch - 69.0) / 12.0);
							var endFreq:   Number = 440.0 * Math.pow(2.0, (endPitch - 69.0) / 12.0);
							var frequency: Number = startFreq;
							var freqDelta: Number = (endFreq - startFreq) / samples2;
							
							while (samples2 > 0) {
								period += frequency * sampleTime;
								while (period >= 1.0) period -= 1.0;
								var sample: Number = period > 0.5 ? 1.0 : -1.0;
								//var sample: Number = period < 0.5 ? -1 + period * 4.0 : 3.0 - period * 4.0;
								event.data.writeFloat(sample);
								event.data.writeFloat(sample);
								samples2--;
								frequency += freqDelta;
							}
							
							if (arpeggioSamples == 0) {
								arpeggio++;
								if (arpeggio == 2) arpeggio = 0;
								arpeggioSamples = samplesPerArpeggio;
							}
						}
					} else {
						while (samples1 > 0) {
							event.data.writeFloat(0.0);
							event.data.writeFloat(0.0);
							samples1--;
						}
					}
					
					if (beatSamples == 0) {
						beat++;
						if (beat == Bar.numBeats) {
							beat = 0;
							toneIndex = 0;
							tone = null;
						}
						if (tone != null && tone.end <= beat) {
							tone = null;
							toneIndex++;
						}
						if (tone == null && bar.tones.length > toneIndex && bar.tones[toneIndex].start <= beat) {
							tone = bar.tones[toneIndex];
						}
						beatSamples = samplesPerBeat;
						arpeggio = 0;
						arpeggioSamples = samplesPerArpeggio;
					}
				}
				
				playhead = beat + 1.0 - beatSamples / samplesPerBeat;
			}
			
			var sound: Sound = new Sound();
			sound.addEventListener(SampleDataEvent.SAMPLE_DATA, onSampleData, false, 0, true);
			sound.play();
		}
	}
}
