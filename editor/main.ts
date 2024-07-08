// Copyright (c) John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

import {Dictionary, DictionaryArray, EnvelopeType, InstrumentType, Transition, Chord, Envelope, Config} from "../synth/SynthConfig";
import {EditorConfig} from "./EditorConfig";
import {ColorConfig} from "./ColorConfig";
import "./style"; // Import for the side effects, there's no exports.
import {SongEditor} from "./SongEditor";
import {NotePin, Note, Pattern, Instrument, Channel, Song, Synth} from "../synth/synth";
import {SongDocument} from "./SongDocument";
import {ExportPrompt} from "./ExportPrompt";
import {ChangePreset} from "./changes";
import {fastFourierTransform, forwardRealFourierTransform, inverseRealFourierTransform} from "../synth/FFT";
import {FilterCoefficients, FrequencyResponse, DynamicBiquadFilter} from "../synth/filtering";

// To initialize:
// new beepbox.SongEditor(document.getElementById("beepboxEditorContainer"));

// When compiling editor/main.ts as a standalone module named "beepbox", expose
// these classes as members to JavaScript:
export {
	Dictionary,
	DictionaryArray,
	EnvelopeType,
	InstrumentType,
	Transition,
	Chord,
	Envelope,
	Config,
	NotePin,
	Note,
	Pattern,
	Instrument,
	Channel,
	Song,
	Synth,
	fastFourierTransform,
	forwardRealFourierTransform,
	inverseRealFourierTransform,
	FilterCoefficients,
	FrequencyResponse,
	DynamicBiquadFilter,
	ColorConfig,
	EditorConfig,
	SongDocument,
	SongEditor,
	ExportPrompt,
	ChangePreset,
};
