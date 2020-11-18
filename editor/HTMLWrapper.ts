// Copyright (C) 2020 John Nesky, distributed under the MIT license.
// A few wrapper classes that add functionality onto existing HTML elements, namely binding some events to an implementation-specified change class

import { Change } from "./Change";
import { SongDocument } from "./SongDocument";
import { HTML } from "imperative-html/dist/esm/elements-strict";

const { span } = HTML;

export class InputBox {
	private _change: Change | null = null;
	private _value: string = "";
	private _oldValue: string = "";

	constructor(public readonly input: HTMLInputElement, private readonly _doc: SongDocument, private readonly _getChange: (oldValue: string, newValue: string) => Change) {
		input.addEventListener("input", this._whenInput);
		input.addEventListener("change", this._whenChange);
	}

	public updateValue(value: string): void {
		this._value = value;
		this.input.value = String(value);
	}

	private _whenInput = (): void => {
		const continuingProspectiveChange: boolean = this._doc.lastChangeWas(this._change);
		if (!continuingProspectiveChange) this._oldValue = this._value;
		this._change = this._getChange(this._oldValue, this.input.value);
		this._doc.setProspectiveChange(this._change);
	};

	private _whenChange = (): void => {
		this._doc.record(this._change!);
		this._change = null;
	};
}

export class Slider {
	private _change: Change | null = null;
	private _value: number = 0;
	private _oldValue: number = 0;
	public container: HTMLSpanElement;

	constructor(public readonly input: HTMLInputElement, private readonly _doc: SongDocument, private readonly _getChange: ((oldValue: number, newValue: number) => Change) | null, midTick: boolean) {
		// A container is created around the input to allow for spec-compliant pseudo css classes (e.g ::before and ::after, which must be added to containers, not the input itself)
		this.container = (midTick) ? span({ class: "midTick", style: "position: sticky; width: 61.5%;" }, input) : span({ style: "position: sticky;" }, input);
		input.addEventListener("input", this._whenInput);
		input.addEventListener("change", this._whenChange);
	}

	public updateValue(value: number): void {
		this._value = value;
		this.input.value = String(value);
	}

	private _whenInput = (): void => {
		const continuingProspectiveChange: boolean = this._doc.lastChangeWas(this._change);
		if (!continuingProspectiveChange) this._oldValue = this._value;
		if (this._getChange != null) {
			this._change = this._getChange(this._oldValue, parseInt(this.input.value));
			this._doc.setProspectiveChange(this._change);
		}
	};

	private _whenChange = (): void => {
		if (this._getChange != null) {
			this._doc.record(this._change!);
			this._change = null;
		}
	};
}