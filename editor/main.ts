// Copyright (c) John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

export {Dictionary, DictionaryArray, EnvelopeType, InstrumentType, Transition, Chord, Envelope, Config} from "../synth/SynthConfig";
export {EditorConfig} from "./EditorConfig";
export {ColorConfig} from "./ColorConfig";
import "./style"; // Import for the side effects, there's no exports.
export {SongEditor} from "./SongEditor";
export {NotePin, Note, Pattern, Instrument, Channel, Song, Synth} from "../synth/synth";
export {SongDocument} from "./SongDocument";
export {ExportPrompt} from "./ExportPrompt";
export {ChangePreset} from "./changes";
export {fastFourierTransform, forwardRealFourierTransform, inverseRealFourierTransform} from "../synth/FFT";
export {FilterCoefficients, FrequencyResponse, DynamicBiquadFilter} from "../synth/filtering";

// To initialize:
// new beepbox.SongEditor(document.getElementById("beepboxEditorContainer"));
