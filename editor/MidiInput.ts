import {SongDocument} from "./SongDocument";
import {LiveInput} from "./LiveInput";
import {MidiEventType} from "./Midi";

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

declare global {
	interface Navigator {
		requestMIDIAccess?(): Promise<any>;
	}
}

export class MIDIInputHandler {
	constructor(private _doc: SongDocument, private _liveInput: LiveInput) {
		this.registerMIDIAccessHandler();
	}
	private async registerMIDIAccessHandler() {
		if(navigator.requestMIDIAccess == null) return;

		try {
			const midiAccess = await navigator.requestMIDIAccess();

			midiAccess.inputs.forEach(this._registerMIDIInput);
			midiAccess.addEventListener("statechange", this._handleStateChange);
		} catch(e) {
			console.error("Failed to get MIDI access", e);
		}
	}

	private _handleStateChange = (event: MIDIConnectionEvent) => {
		if(event.port.type !== "input") return;
		
		switch(event.port.state) {
			case "connected":
				this._registerMIDIInput(event.port);
				break;
			case "disconnected":
				this._unregisterMIDIInput(event.port);
				break;
		}
	}

	private _registerMIDIInput = (midiInput: MIDIInput) => {
		midiInput.addEventListener("midimessage", this._onMIDIMessage as any);
	}

	private _unregisterMIDIInput = (midiInput: MIDIInput) => {
		midiInput.removeEventListener("midimessage", this._onMIDIMessage as any);
		this._liveInput.clear(this._getContext(midiInput));
	}

	private _getContext(midiInput: MIDIInput) {
		return `midiInput:${midiInput.id}`;
	}

	private _onMIDIMessage = (event: MIDIMessageEvent) => {
		const isDrum: boolean = this._doc.song.getChannelIsNoise(this._doc.channel);
		const context = this._getContext(event.target);
		let [eventType, key, velocity] = event.data;
		eventType &= 0xF0;

		if(isDrum) {
			key = key % 12;
		}

		switch(true) {
			case eventType == MidiEventType.noteOn && velocity > 0:
				this._doc.synth.maintainLiveInput();
				this._liveInput.addNote(key, context);
				break;
			case eventType == MidiEventType.noteOff:
			case eventType == MidiEventType.noteOn && velocity == 0:
				this._liveInput.removeNote(key, context);
				break;
		}
	}
}