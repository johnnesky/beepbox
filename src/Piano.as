package {
	
	import flash.events.SampleDataEvent;
	import flash.media.Sound;
	
	public class Piano {
		public static function frequencyFromPitchIndex(pitchIndex: int): Number {
			return 440.0 * Math.pow(2.0, (pitchIndex - 69.0) / 12.0);
		}
		
		public static function playBar(bar: Bar): void {
			
			const samplesPerSecond: int = 44100;
			const sampleTime: Number = 1.0 / samplesPerSecond;
			const beatsPerMinute: Number = 120.0 * 4.0;
			const beatsPerSecond: Number = beatsPerMinute / 60.0;
			const samplesPerBeat: int = samplesPerSecond / beatsPerSecond;
			const arpeggioPerSecond: Number = 20.0;
			const samplesPerArpeggio: int = samplesPerSecond / arpeggioPerSecond;
			
			var period: Number = 0.0;
			var beat: int = 0;
			var beatSamples: int = samplesPerBeat;
			var arpeggio: int = 0;
			var arpeggioSamples: int = samplesPerArpeggio;
			
			//var frequency: Number = Math.pow(2.0, (pitch + 3.0) / 12.0) * 440.0;
			//var globalVolume: Number = 0.75 - 0.5 * ((pitch + 24) / 36);
			
			function onSampleData(event: SampleDataEvent): void {
				var totalSamples: int = 2048;
				
				while (totalSamples > 0) {
					var samples1: int;
					if (beatSamples <= totalSamples) {
						samples1 = beatSamples;
					} else {
						samples1 = totalSamples;
					}
					totalSamples -= samples1;
					beatSamples -= samples1;
					
					var pitches: Array = [];
					for (var j: int = 0; j < Bar.numPitches; j++) {
						if (bar.notes[beat][j]) {
							pitches.push(Bar.pitches[j]);
						}
					}
					
					if (arpeggio >= pitches.length) arpeggio = 0;
					
					if (pitches.length > 0) {
						while (samples1 > 0) {
							var samples2: int;
							if (arpeggioSamples <= samples1) {
								samples2 = arpeggioSamples;
							} else {
								samples2 = samples1;
							}
							samples1 -= samples2;
							arpeggioSamples -= samples2;
							
							var pitchIndex: int = pitches[arpeggio];
							var frequency: Number = 440.0 * Math.pow(2.0, (pitchIndex - 69.0) / 12.0);
							
							while (samples2 > 0) {
								period += frequency * sampleTime;
								while (period >= 1.0) period -= 1.0;
								var sample: Number = period > 0.5 ? 1.0 : -1.0;
								//var sample: Number = period < 0.5 ? -1 + period * 4.0 : 3.0 - period * 4.0;
								event.data.writeFloat(sample);
								event.data.writeFloat(sample);
								samples2--;
							}
							
							if (arpeggioSamples == 0) {
								arpeggio++;
								if (arpeggio == pitches.length) arpeggio = 0;
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
						if (beat == Bar.numBeats) beat = 0;
						beatSamples = samplesPerBeat;
						arpeggio = 0;
						arpeggioSamples = samplesPerArpeggio;
					}
				}
				/*
				for (var i: int = 0; i < 2048; i++) {
					if (samplesWritten >= totalSamples) {
						break;
					}
					
					var angle: Number = samplesWritten * multiplier;
					var sample: Number = Math.sin(angle);
					
					event.data.writeFloat(sample);
					event.data.writeFloat(sample);
				}
				*/
			}
			
			var sound: Sound = new Sound();
			sound.addEventListener(SampleDataEvent.SAMPLE_DATA, onSampleData, false, 0, true);
			sound.play();
		}
		
		/*
		public static function playSound(pitch: Number, duration: Number): void {
			var timePassed: Number = 0.0;
			const sampleRate: Number = 44100.0;
			const sampleTime: Number = 1.0 / sampleRate;
			var samplesWritten: int = 0;
			var totalSamples: int = duration * sampleRate;
			
			var frequency: Number = Math.pow(2.0, (pitch + 3.0) / 12.0) * 440.0;
			var angle: Number = 0.0;
			const circumference: Number = Math.PI * 2.0;
			var globalVolume: Number = 0.75 - 0.5 * ((pitch + 24) / 36);
			
			function onSampleData(event: SampleDataEvent): void {
				var multiplier: Number = sampleTime * frequency * circumference;
				var divider: Number = 1.0 / totalSamples;
				
				for (var i: int = 0; i < 2048; i++) {
					if (samplesWritten >= totalSamples) {
						break;
					}
					
					var volume: Number = 1 - samplesWritten * divider;
					var angle: Number = samplesWritten * multiplier;
					volume *= volume;
					var sample: Number = 0;
					sample += Math.sin(angle);
					sample += Math.sin(angle * 2) * 0.5;
					sample += Math.sin(angle * 3) * 0.25;
					sample *= volume * globalVolume;
					
					event.data.writeFloat(sample);
					event.data.writeFloat(sample);
					
					
					samplesWritten++;
				}
				
			}
			
			var sound: Sound = new Sound();
			sound.addEventListener(SampleDataEvent.SAMPLE_DATA, onSampleData, false, 0, true);
			sound.play();
		}
		*/
	}
}
