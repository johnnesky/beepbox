// Copyright (C) 2021 John Nesky, distributed under the MIT license.

export const defaultMidiExpression: number = 0x7F;
export const defaultMidiPitchBend: number = 0x2000;

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
	panMSB = 0x0A,
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

// BeepBox noise channels are very different from Midi drumsets, but here's my attempt at a conversion from Midi to BeepBox.
export interface AnalogousDrum {
	frequency: number;
	duration: number;
	volume: number;
}
export const analogousDrumMap: { [K: number]: AnalogousDrum } = {
		35: { frequency:  0, duration: 2, volume: 3 }, // Acoustic Bass Drum
		36: { frequency:  0, duration: 2, volume: 3 }, // Bass Drum 1
		37: { frequency:  5, duration: 1, volume: 3 }, // Side Stick
		38: { frequency:  4, duration: 2, volume: 3 }, // Acoustic Snare
		39: { frequency:  5, duration: 2, volume: 3 }, // Hand Clap
		40: { frequency:  4, duration: 2, volume: 3 }, // Electric Snare
		41: { frequency:  1, duration: 2, volume: 3 }, // Low Floor Tom
		42: { frequency:  8, duration: 1, volume: 3 }, // Closed Hi Hat
		43: { frequency:  1, duration: 2, volume: 3 }, // High Floor Tom
		44: { frequency:  8, duration: 1, volume: 2 }, // Pedal Hi-Hat
		45: { frequency:  2, duration: 2, volume: 3 }, // Low Tom
		46: { frequency:  8, duration: 4, volume: 3 }, // Open Hi-Hat
		47: { frequency:  2, duration: 2, volume: 3 }, // Low-Mid Tom
		48: { frequency:  3, duration: 2, volume: 3 }, // Hi-Mid Tom
		49: { frequency:  7, duration: 4, volume: 3 }, // Crash Cymbal 1
		50: { frequency:  3, duration: 2, volume: 3 }, // High Tom
		51: { frequency:  6, duration: 4, volume: 2 }, // Ride Cymbal 1
		52: { frequency:  7, duration: 4, volume: 3 }, // Chinese Cymbal
		53: { frequency:  6, duration: 2, volume: 3 }, // Ride Bell
	54: { frequency: 11, duration: 2, volume: 3 }, // Tambourine
		55: { frequency:  9, duration: 4, volume: 3 }, // Splash Cymbal
		56: { frequency:  7, duration: 1, volume: 2 }, // Cowbell
		57: { frequency:  7, duration: 4, volume: 3 }, // Crash Cymbal 2
	58: { frequency: 10, duration: 2, volume: 2 }, // Vibraslap
		59: { frequency:  6, duration: 4, volume: 3 }, // Ride Cymbal 2
	//60: { frequency:  7, duration: 1, volume: 3 }, // Hi Bongo
	//61: { frequency:  5, duration: 1, volume: 3 }, // Low Bongo
	//62: { frequency:  6, duration: 1, volume: 3 }, // Mute Hi Conga
	//63: { frequency:  5, duration: 1, volume: 3 }, // Open Hi Conga
	//64: { frequency:  4, duration: 1, volume: 3 }, // Low Conga
	//65: { frequency:  6, duration: 2, volume: 3 }, // High Timbale
	//66: { frequency:  4, duration: 2, volume: 3 }, // Low Timbale
	//67: { frequency: 10, duration: 1, volume: 2 }, // High Agogo
	//68: { frequency:  9, duration: 1, volume: 2 }, // Low Agogo
	69: { frequency: 10, duration: 2, volume: 3 }, // Cabasa
	70: { frequency: 10, duration: 2, volume: 3 }, // Maracas
	//71: { frequency: 10, duration: 2, volume: 3 }, // Short Whistle
	//72: { frequency:  9, duration: 2, volume: 3 }, // Long Whistle
	73: { frequency: 10, duration: 1, volume: 2 }, // Short Guiro
	74: { frequency: 10, duration: 2, volume: 2 }, // Long Guiro
	//75: { frequency: 10, duration: 1, volume: 2 }, // Claves
	//76: { frequency:  6, duration: 1, volume: 2 }, // Hi Wood Block
	//77: { frequency:  5, duration: 1, volume: 2 }, // Low Wood Block
	//78: { frequency:  6, duration: 2, volume: 3 }, // Mute Cuica
	//79: { frequency:  4, duration: 2, volume: 3 }, // Open Cuica
	//80: { frequency:  7, duration: 1, volume: 2 }, // Mute Triangle
	//81: { frequency:  7, duration: 4, volume: 2 }, // Open Triangle
};

export function midiVolumeToVolumeMult(volume: number): number {
	// default midi volume is 100, pow(100/127,4)≈0.384 so I'm considering that the baseline volume.
	return Math.pow(volume / 127, 4.0) / 0.3844015376046128;
}
export function volumeMultToMidiVolume(volumeMult: number): number {
	return Math.pow(volumeMult * 0.3844015376046128, 0.25) * 127;
}
export function midiExpressionToVolumeMult(expression: number): number {
	return Math.pow(expression / 127, 4.0);
}
export function volumeMultToMidiExpression(volumeMult: number): number {
	return Math.pow(volumeMult, 0.25) * 127;
}
