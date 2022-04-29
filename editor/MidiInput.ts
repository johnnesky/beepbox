// Copyright (c) 2012-2022 John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

import {Config} from "../synth/SynthConfig";
import {SongDocument} from "./SongDocument";
import {AnalogousDrum, analogousDrumMap, MidiEventType} from "./Midi";

declare global {
	interface Navigator {
		requestMIDIAccess?(): Promise<any>;
	}
}

interface MIDIInput extends EventTarget {
	id: string;
	type: "input" | "output";
	state: "disconnected" | "connected";
}

interface MIDIConnectionEvent {
	port: MIDIInput;
}

interface MIDIMessageEvent {
	data: [type: number, key: number, velocity: number];
	target: MIDIInput;
}

// A unique id for this tab.
const id: string = ((Math.random() * 0xffffffff) >>> 0).toString(16);

export class MidiInputHandler {
	constructor(private _doc: SongDocument) {
		this.registerMidiAccessHandler();
	}
	
	private async registerMidiAccessHandler() {
		if (navigator.requestMIDIAccess == null) return;
		
		try {
			const midiAccess = await navigator.requestMIDIAccess();
			
			midiAccess.inputs.forEach(this._registerMidiInput);
			midiAccess.addEventListener("statechange", this._handleStateChange);
			
			this._takeMidiHandlerFocus();
			window.addEventListener("focus", this._takeMidiHandlerFocus);
		} catch (e) {
			console.error("Failed to get MIDI access", e);
		}
	}
	
	private _takeMidiHandlerFocus = (event?: Event) => {
		// Record that this browser tab is the one that should handle midi
		// events and any other open tabs should ignore midi events for now.
		localStorage.setItem("midiHandlerId", id);
	}
	
	private _handleStateChange = (event: MIDIConnectionEvent) => {
		if (event.port.type !== "input") return;
		
		switch (event.port.state) {
			case "connected":
				this._registerMidiInput(event.port);
				break;
			case "disconnected":
				this._unregisterMidiInput(event.port);
				break;
		}
	}
	
	private _registerMidiInput = (midiInput: MIDIInput) => {
		midiInput.addEventListener("midimessage", this._onMidiMessage as any);
	}
	
	private _unregisterMidiInput = (midiInput: MIDIInput) => {
		midiInput.removeEventListener("midimessage", this._onMidiMessage as any);
		this._doc.performance.clearAllPitches();
	}
	
	private _onMidiMessage = (event: MIDIMessageEvent) => {
		// Ignore midi events if disabled or a different tab is handling them.
		if (!this._doc.prefs.enableMidi || localStorage.getItem("midiHandlerId") != id) return;
		
		const isDrum: boolean = this._doc.song.getChannelIsNoise(this._doc.channel);
		let [eventType, key, velocity] = event.data;
		eventType &= 0xF0;
		
		if (isDrum) {
			const drum: AnalogousDrum | undefined = analogousDrumMap[key];
			if (drum != undefined) {
				key = drum.frequency;
			} else {
				return;
			}
		} else {
			key -= Config.keys[this._doc.song.key].basePitch; // The basePitch of the song key is implicit so don't include it.
			if (key < 0 || key > Config.maxPitch) return;
		}
		
		if (eventType == MidiEventType.noteOn && velocity == 0) {
			eventType = MidiEventType.noteOff;
		}
		
		switch (eventType) {
			case MidiEventType.noteOn:
				this._doc.synth.preferLowerLatency = true;
				this._doc.performance.addPerformedPitch(key);
				break;
			case MidiEventType.noteOff:
				this._doc.performance.removePerformedPitch(key);
				break;
		}
	}
}
