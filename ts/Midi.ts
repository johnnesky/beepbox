/*
Copyright (C) 2018 John Nesky

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

namespace beepbox {
	
	export const enum MidiChunkType {
		header = 0x4D546864, // "MThd" as bytes, big endian
		track = 0x4D54726B, // "MTrk" as bytes, big endian
	}
	
	export const enum MidiFileFormat {
		singleTrack = 0x0000,
		simultaneousTracks = 0x0001,
		independentTracks = 0x0002,
	}
	
	// Lower 4 bits indicate channel, except for meta and sysex events.
	export const enum MidiEventType {
		//channelMode = 0x70,
		noteOff = 0x80,
		noteOn = 0x90,
		keyPressure = 0xA0,
		controlChange = 0xB0,
		programChange = 0xC0,
		channelPressure = 0xD0,
		pitchBend = 0xE0,
		metaAndSysex = 0xF0,
		
		// These events are identified by all 8 bits.
		meta = 0xFF,
		// sysexStart = 0xF0,
		// sysexEscape = 0xF7,
	}
	
	export const enum MidiControlEventMessage {
		
		setParameterMSB = 0x06,
		volumeMSB = 0x07,
		expressionMSB = 0x0B,
		
		setParameterLSB = 0x26,
		//volumeLSB = 0x27,
		//expressionLSB = 0x2B,
		
		//nonRegisteredParameterNumberLSB = 0x62,
		//nonRegisteredParameterNumberMSB = 0x63,
		registeredParameterNumberLSB = 0x64,
		registeredParameterNumberMSB = 0x65,
		
		// Channel mode messages:
		/*
		allSoundOff = 0x78,
		resetControllers = 0x79,
		localControl = 0x7A,
		allNotesOff = 0x7B,
		omniModeOff = 0x7C,
		omniModeOn = 0x7D,
		monoMode = 0x7E,
		polyphonicMode = 0x7F,
		*/
	}
	
	export const enum MidiRegisteredParameterNumberMSB {
		pitchBendRange = 0x00, // semitones
		fineTuning = 0x00,
		coarseTuning = 0x00,
		tuningProgramSelect = 0x00,
		tuningBankSelect = 0x00,
		reset = 0x7f,
	}
	
	export const enum MidiRegisteredParameterNumberLSB {
		pitchBendRange = 0x00, // cents
		fineTuning = 0x01,
		coarseTuning = 0x02,
		tuningProgramSelect = 0x03,
		tuningBankSelect = 0x04,
		reset = 0x7f,
	}
	
	export const enum MidiMetaEventMessage {
		sequenceNumber = 0x00,
		text = 0x01,
		copyrightNotice = 0x02,
		trackName = 0x03,
		instrumentName = 0x04,
		lyricText = 0x05,
		marker = 0x06,
		cuePoint = 0x07,
		channelPrefix = 0x20,
		endOfTrack = 0x2F,
		tempo = 0x51,
		smpteOffset = 0x54,
		timeSignature = 0x58,
		keySignature = 0x59,
		sequencerSpecificEvent = 0x7F,
	}
}
