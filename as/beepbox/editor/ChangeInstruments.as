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

package beepbox.editor {
	import beepbox.synth.*;
	
	public class ChangeInstruments extends Change {
		private var document: Document;
		private var oldInstruments: int;
		private var newInstruments: int;
		private var oldInstrumentWaves: Array;
		private var oldInstrumentFilters: Array;
		private var oldInstrumentAttacks: Array;
		private var oldInstrumentEffects: Array;
		private var oldInstrumentChorus: Array;
		private var oldInstrumentVolumes: Array;
		private var newInstrumentWaves: Array;
		private var newInstrumentFilters: Array;
		private var newInstrumentAttacks: Array;
		private var newInstrumentEffects: Array;
		private var newInstrumentChorus: Array;
		private var newInstrumentVolumes: Array;
		private var oldInstrumentIndices: Array;
		private var newInstrumentIndices: Array;
		public function ChangeInstruments(document: Document, instruments: int) {
			super(false);
			this.document = document;
			oldInstruments = document.song.instruments;
			newInstruments = instruments;
			if (oldInstruments != newInstruments) {
				// todo: adjust size of instrument arrays, make sure no references to invalid instruments
				oldInstrumentWaves   = document.song.instrumentWaves;
				oldInstrumentFilters = document.song.instrumentFilters;
				oldInstrumentAttacks = document.song.instrumentAttacks;
				oldInstrumentEffects = document.song.instrumentEffects;
				oldInstrumentChorus  = document.song.instrumentChorus;
				oldInstrumentVolumes = document.song.instrumentVolumes;
				newInstrumentWaves   = [];
				newInstrumentFilters = [];
				newInstrumentAttacks = [];
				newInstrumentEffects = [];
				newInstrumentChorus  = [];
				newInstrumentVolumes = [];
				var oldArrays: Array = [oldInstrumentWaves, oldInstrumentFilters, oldInstrumentAttacks, oldInstrumentEffects, oldInstrumentChorus, oldInstrumentVolumes];
				var newArrays: Array = [newInstrumentWaves, newInstrumentFilters, newInstrumentAttacks, newInstrumentEffects, newInstrumentChorus, newInstrumentVolumes];
				var k: int;
				var i: int;
				var j: int;
				for (k = 0; k < newArrays.length; k++) {
					var oldArray: Array = oldArrays[k];
					var newArray: Array = newArrays[k];
					for (i = 0; i < Music.numChannels; i++) {
						var channel: Array = [];
						for (j = 0; j < newInstruments; j++) {
							if (j < oldInstruments) {
								channel.push(oldArray[i][j]);
							} else {
								if (k == 0) { // square wave or white noise
									channel.push(1);
								} else if (k == 2) { // sudden attack
									channel.push(1);
								} else {
									channel.push(0);
								}
							}
						}
						newArray.push(channel);
					}
				}
				
				oldInstrumentIndices = [];
				newInstrumentIndices = [];
				for (i = 0; i < Music.numChannels; i++) {
					var oldIndices: Array = [];
					var newIndices: Array = [];
					for (j = 0; j < document.song.patterns; j++) {
						var oldIndex: int = document.song.channelPatterns[i][j].instrument;
						oldIndices.push(oldIndex);
						newIndices.push(oldIndex < newInstruments ? oldIndex : 0);
					}
					oldInstrumentIndices.push(oldIndices);
					newInstrumentIndices.push(newIndices);
				}
				doForwards();
				didSomething();
			}
		}
		
		protected override function doForwards(): void {
			document.song.instruments = newInstruments;
			document.song.instrumentWaves   = newInstrumentWaves;
			document.song.instrumentFilters = newInstrumentFilters;
			document.song.instrumentAttacks = newInstrumentAttacks;
			document.song.instrumentEffects = newInstrumentEffects;
			document.song.instrumentChorus  = newInstrumentChorus;
			document.song.instrumentVolumes = newInstrumentVolumes;
			copyIndices(newInstrumentIndices);
			document.changed();
		}
		
		protected override function doBackwards(): void {
			document.song.instruments = oldInstruments;
			document.song.instrumentWaves   = oldInstrumentWaves;
			document.song.instrumentFilters = oldInstrumentFilters;
			document.song.instrumentAttacks = oldInstrumentAttacks;
			document.song.instrumentEffects = oldInstrumentEffects;
			document.song.instrumentChorus  = oldInstrumentChorus;
			document.song.instrumentVolumes = oldInstrumentVolumes;
			copyIndices(oldInstrumentIndices);
			document.changed();
		}
		
		private function copyIndices(indices: Array): void {
			for (var i: int = 0; i < Music.numChannels; i++) {
				for (var j: int = 0; j < document.song.patterns; j++) {
					document.song.channelPatterns[i][j].instrument = indices[i][j];
				}
			}
		}
	}
}
