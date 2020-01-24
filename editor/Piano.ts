// Copyright (C) 2020 John Nesky, distributed under the MIT license.

/// <reference path="../synth/synth.ts" />
/// <reference path="SongDocument.ts" />
/// <reference path="html.ts" />

namespace beepbox {
	export class Piano {
		private readonly _pianoContainer: HTMLDivElement = HTML.div({style: "width: 100%; height: 100%; display: flex; flex-direction: column-reverse; align-items: stretch;"});
		private readonly _drumContainer: HTMLDivElement = HTML.div({style: "width: 100%; height: 100%; display: flex; flex-direction: column-reverse; align-items: stretch;"});
		private readonly _preview: HTMLDivElement = HTML.div({style: `width: 100%; height: 40px; border: 2px solid ${ColorConfig.primaryText}; position: absolute; box-sizing: border-box; pointer-events: none;`});
		public readonly container: HTMLDivElement = HTML.div({style: "width: 32px; height: 100%; overflow: hidden; position: relative; flex-shrink: 0; touch-action: none;"},
			this._pianoContainer,
			this._drumContainer,
			this._preview,
		);
		private readonly _editorHeight: number = 481;
		private readonly _pianoKeys: HTMLDivElement[] = [];
		private readonly _pianoLabels: HTMLDivElement[] = [];
		
		private _pitchHeight: number;
		private _pitchCount: number;
		//private _mouseX: number = 0;
		private _mouseY: number = 0;
		private _mouseDown: boolean = false;
		private _mouseOver: boolean = false;
		private _cursorPitch: number;
		private _renderedScale: number = -1;
		private _renderedDrums: boolean = false;
		private _renderedKey: number = -1;
		
		constructor(private _doc: SongDocument) {
			for (let i: number = 0; i < Config.windowPitchCount; i++) {
				const pianoLabel: HTMLDivElement = HTML.div({class: "piano-label", style: "font-weight: bold; font-size: 11px; font-family: sans-serif; position: absolute; padding-left: 15px;"});
				const pianoKey: HTMLDivElement = HTML.div({class: "piano-button", style: "background: gray;"}, pianoLabel);
				this._pianoContainer.appendChild(pianoKey);
				this._pianoLabels.push(pianoLabel);
				this._pianoKeys.push(pianoKey);
			}
			
			for (let i: number = 0; i < Config.drumCount; i++) {
				const scale: number = (1.0 - (i / Config.drumCount) * 0.35) * 100;
				const brightness: number = 1.0 + ((i - Config.drumCount / 2.0) / Config.drumCount) * 0.5;
				this._drumContainer.appendChild(HTML.div({class: "drum-button", style: `background-size: ${scale}% ${scale}%; filter: brightness(${brightness})`}));
			}
			
			this.container.addEventListener("mousedown", this._whenMousePressed);
			document.addEventListener("mousemove", this._whenMouseMoved);
			document.addEventListener("mouseup", this._whenMouseReleased);
			this.container.addEventListener("mouseover", this._whenMouseOver);
			this.container.addEventListener("mouseout", this._whenMouseOut);
			
			this.container.addEventListener("touchstart", this._whenTouchPressed);
			this.container.addEventListener("touchmove", this._whenTouchMoved);
			this.container.addEventListener("touchend", this._whenTouchReleased);
			this.container.addEventListener("touchcancel", this._whenTouchReleased);
			
			this._doc.notifier.watch(this._documentChanged);
			this._documentChanged();
		}
		
		private _updateCursorPitch(): void {
			const scale: ReadonlyArray<boolean> = Config.scales[this._doc.song.scale].flags;
			const mousePitch: number = Math.max(0, Math.min(this._pitchCount-1, this._pitchCount - (this._mouseY / this._pitchHeight)));
			if (scale[Math.floor(mousePitch) % 12] || this._doc.song.getChannelIsNoise(this._doc.channel)) {
				this._cursorPitch = Math.floor(mousePitch);
			} else {
				let topPitch: number = Math.floor(mousePitch) + 1;
				let bottomPitch: number = Math.floor(mousePitch) - 1;
				while (!scale[topPitch % 12]) {
					topPitch++;
				}
				while (!scale[(bottomPitch) % 12]) {
					bottomPitch--;
				}
				let topRange: number = topPitch;
				let bottomRange: number = bottomPitch + 1;
				if (topPitch % 12 == 0 || topPitch % 12 == 7) {
					topRange -= 0.5;
				}
				if (bottomPitch % 12 == 0 || bottomPitch % 12 == 7) {
					bottomRange += 0.5;
				}
				this._cursorPitch = mousePitch - bottomRange > topRange - mousePitch ? topPitch : bottomPitch;
			}
		}
		
		private _whenMouseOver = (event: MouseEvent): void => {
			if (this._mouseOver) return;
			this._mouseOver = true;
			this._updatePreview();
		}
		
		private _whenMouseOut = (event: MouseEvent): void => {
			if (!this._mouseOver) return;
			this._mouseOver = false;
			this._updatePreview();
		}
		
		private _whenMousePressed = (event: MouseEvent): void => {
			event.preventDefault();
			this._mouseDown = true;
			const boundingRect: ClientRect = this.container.getBoundingClientRect();
    		//this._mouseX = (event.clientX || event.pageX) - boundingRect.left;
		    this._mouseY = ((event.clientY || event.pageY) - boundingRect.top) * this._editorHeight / (boundingRect.bottom - boundingRect.top);
		    if (isNaN(this._mouseY)) this._mouseY = 0;
			this._doc.synth.liveInputPressed = true;
			this._updatePreview();
		}
		
		private _whenMouseMoved = (event: MouseEvent): void => {
			const boundingRect: ClientRect = this.container.getBoundingClientRect();
    		//this._mouseX = (event.clientX || event.pageX) - boundingRect.left;
		    this._mouseY = ((event.clientY || event.pageY) - boundingRect.top) * this._editorHeight / (boundingRect.bottom - boundingRect.top);
		    if (isNaN(this._mouseY)) this._mouseY = 0;
			this._updateCursorPitch();
			this._doc.synth.liveInputPitches[0] = this._cursorPitch + this._doc.song.channels[this._doc.channel].octave * 12;
			this._updatePreview();
		}
		
		private _whenMouseReleased = (event: MouseEvent): void => {
			this._mouseDown = false;
			this._doc.synth.liveInputPressed = false;
			this._updatePreview();
		}
		
		private _whenTouchPressed = (event: TouchEvent): void => {
			event.preventDefault();
			this._mouseDown = true;
			const boundingRect: ClientRect = this.container.getBoundingClientRect();
			//this._mouseX = event.touches[0].clientX - boundingRect.left;
			this._mouseY = (event.touches[0].clientY - boundingRect.top) * this._editorHeight / (boundingRect.bottom - boundingRect.top);
		    if (isNaN(this._mouseY)) this._mouseY = 0;
			this._updateCursorPitch();
			this._doc.synth.liveInputPressed = true;
			this._doc.synth.liveInputPitches[0] = this._cursorPitch + this._doc.song.channels[this._doc.channel].octave * 12;
		}
		
		private _whenTouchMoved = (event: TouchEvent): void => {
			event.preventDefault();
			const boundingRect: ClientRect = this.container.getBoundingClientRect();
			//this._mouseX = event.touches[0].clientX - boundingRect.left;
			this._mouseY = (event.touches[0].clientY - boundingRect.top) * this._editorHeight / (boundingRect.bottom - boundingRect.top);
		    if (isNaN(this._mouseY)) this._mouseY = 0;
			this._updateCursorPitch();
			this._doc.synth.liveInputPitches[0] = this._cursorPitch + this._doc.song.channels[this._doc.channel].octave * 12;
		}
		
		private _whenTouchReleased = (event: TouchEvent): void => {
			event.preventDefault();
			this._doc.synth.liveInputPressed = false;
		}
		
		private _updatePreview(): void {
			this._preview.style.visibility = (!this._mouseOver || this._mouseDown) ? "hidden" : "visible";
			if (!this._mouseOver || this._mouseDown) return;
			
			const boundingRect: ClientRect = this.container.getBoundingClientRect();
			const pitchHeight: number = this._pitchHeight / (this._editorHeight / (boundingRect.bottom - boundingRect.top));
			
			this._preview.style.left = "0px";
			this._preview.style.top = pitchHeight * (this._pitchCount - this._cursorPitch - 1) + "px";
			this._preview.style.height = pitchHeight + "px";
		}
		
		private _documentChanged = (): void => {
			const isDrum: boolean = this._doc.song.getChannelIsNoise(this._doc.channel);
			this._pitchHeight = isDrum ? 40 : 13;
			this._pitchCount = isDrum ? Config.drumCount : Config.windowPitchCount;
			this._updateCursorPitch();
			this._doc.synth.liveInputPitches[0] = this._cursorPitch + this._doc.song.channels[this._doc.channel].octave * 12;
			this._doc.synth.liveInputChannel = this._doc.channel;
			this._render();
		}
		
		private _render = (): void => {
			if (!this._doc.showLetters) return;
			
			const isDrum = this._doc.song.getChannelIsNoise(this._doc.channel);
			if (this._renderedScale == this._doc.song.scale && this._renderedKey == this._doc.song.key && this._renderedDrums == isDrum) return;
			this._renderedScale = this._doc.song.scale;
			this._renderedKey = this._doc.song.key;
			this._renderedDrums = isDrum;
			
			this._pianoContainer.style.display = isDrum ? "none" : "flex";
			this._drumContainer.style.display = isDrum ? "flex" : "none";
			
			if (!isDrum) {
				for (let j: number = 0; j < this._pitchCount; j++) {
					const pitchNameIndex: number = (j + Config.keys[this._doc.song.key].basePitch) % 12;
					const isWhiteKey: boolean = Config.keys[pitchNameIndex].isWhiteKey;
					this._pianoKeys[j].style.background = isWhiteKey ? ColorConfig.whitePianoKey : ColorConfig.blackPianoKey;
					if (!Config.scales[this._doc.song.scale].flags[j%12]) {
						this._pianoKeys[j].classList.add("disabled");
						this._pianoLabels[j].style.display = "none";
					} else {
						this._pianoKeys[j].classList.remove("disabled");
						this._pianoLabels[j].style.display = "";
						
						let text: string;
						
						if (Config.keys[pitchNameIndex].isWhiteKey) {
							text = Config.keys[pitchNameIndex].name;
						} else {
							const shiftDir: number = Config.blackKeyNameParents[j%12];
							text = Config.keys[(pitchNameIndex + 12 + shiftDir) % 12].name;
							if (shiftDir == 1) {
								text += "♭";
							} else if (shiftDir == -1) {
								text += "♯";
							}
						}
						
						const label: HTMLDivElement = this._pianoLabels[j];
						label.style.color = Config.keys[pitchNameIndex].isWhiteKey ? "black" : "white";
						label.textContent = text;
					}
				}
			}
			this._updatePreview();
		}
	}
}
