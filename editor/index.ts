// Copyright (c) John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

export {Dictionary, DictionaryArray, EnvelopeType, InstrumentType, Transition, Chord, Envelope, Config} from "../synth/SynthConfig.js";
export {EditorConfig} from "./EditorConfig.js";
export {ColorConfig} from "./ColorConfig.js";
import "./style.js"; // Import for the side effects, there's no exports.
export {SongEditor} from "./SongEditor.js";
export {NotePin, Note, Pattern, Instrument, Channel, Song, Synth} from "../synth/synth.js";
export {SongDocument} from "./SongDocument.js";
export {ExportPrompt} from "./ExportPrompt.js";
export {ChangePreset} from "./changes.js";
export {fastFourierTransform, forwardRealFourierTransform, inverseRealFourierTransform} from "../synth/FFT.js";
export {FilterCoefficients, FrequencyResponse, DynamicBiquadFilter} from "../synth/filtering.js";

// To initialize:
// new beepbox.SongEditor(document.getElementById("beepboxEditorContainer"));
