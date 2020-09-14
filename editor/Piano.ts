// Copyright (C) 2020 John Nesky, distributed under the MIT license.

/// <reference path="../synth/synth.ts" />
/// <reference path="SongDocument.ts" />
/// <reference path="html.ts" />

namespace beepbox {
	export class Piano {
		private readonly _pianoContainer: HTMLDivElement = HTML.div({ style: "width: 100%; height: 100%; display: flex; flex-direction: column-reverse; align-items: stretch;" });
		private readonly _drumContainer: HTMLDivElement = HTML.div({ style: "width: 100%; height: 100%; display: flex; flex-direction: column-reverse; align-items: stretch;" });
		private readonly _modContainer: HTMLDivElement = HTML.div({ style: "width: 100%; height: 100%; display: flex; flex-direction: column-reverse; align-items: stretch;" });
		private readonly _preview: HTMLDivElement = HTML.div({ style: `width: 100%; height: 40px; border: 2px solid ${ColorConfig.primaryText}; position: absolute; box-sizing: border-box; pointer-events: none;` });
		public readonly container: HTMLDivElement = HTML.div({ style: "width: 32px; height: 100%; overflow: hidden; position: relative; flex-shrink: 0; touch-action: none;" },
			this._pianoContainer,
			this._drumContainer,
			this._modContainer,
			this._preview,
		);
		private readonly _editorHeight: number = 481;
		private readonly _pianoKeys: HTMLDivElement[] = [];
		private readonly _pianoLabels: HTMLDivElement[] = [];
		private readonly _modFirstLabels: SVGTextElement[] = [];
		private readonly _modSecondLabels: SVGTextElement[] = [];
		private readonly _modCountLabels: SVGTextElement[] = [];
		private readonly _modCountRects: SVGRectElement[] = [];

		private _pitchHeight: number;
		private _pitchCount: number;
		//private _mouseX: number = 0;
		private _mouseY: number = 0;
		private _mouseDown: boolean = false;
		private _mouseOver: boolean = false;
		private _cursorPitch: number;
		private _playedPitch: number = -1;
		private _renderedScale: number = -1;
		private _renderedDrums: boolean = false;
		private _renderedMod: boolean = false;
		private _renderedKey: number = -1;
		private _renderedPitchCount: number = -1;

		public forceRender(): void {
			this._renderedScale = -1;
			this._render();
		}

		constructor(private _doc: SongDocument) {
			for (let i: number = 0; i < this._doc.windowPitchCount; i++) {
				const pianoLabel: HTMLDivElement = HTML.div({ class: "piano-label", style: "font-weight: bold; -webkit-text-stroke-width: 0; font-size: 11px; font-family: sans-serif; position: absolute; padding-left: 15px;" });
				const pianoKey: HTMLDivElement = HTML.div({ class: "piano-button", style: "background: gray;" }, pianoLabel);
				this._pianoContainer.appendChild(pianoKey);
				this._pianoLabels.push(pianoLabel);
				this._pianoKeys.push(pianoKey);
			}
			this._renderedPitchCount = this._doc.windowPitchCount;

			for (let i: number = 0; i < Config.drumCount; i++) {
				const scale: number = (1.0 - (i / Config.drumCount) * 0.35) * 100;
				const brightness: number = 1.0 + ((i - Config.drumCount / 2.0) / Config.drumCount) * 0.5;
				this._drumContainer.appendChild(HTML.div({ class: "drum-button", style: `background-size: ${scale}% ${scale}%; filter: brightness(${brightness})` }));
			}

			for (let i: number = 0; i < Config.modCount; i++) {


				const firstRowText: SVGTextElement = SVG.text({ class: "modulator-label", "text-anchor": "left", fill: ColorConfig.modLabelPrimaryText, style: "font-weight: bold; align-self: flex-start; transform-origin: center; transform: rotate(-90deg) translate(-19px, 39px); font-size: 11px; font-family: sans-serif;" });
				const secondRowText: SVGTextElement = SVG.text({ class: "modulator-label", "text-anchor": "left", fill: ColorConfig.modLabelPrimaryText, style: "font-weight: bold; align-self: flex-end; transform-origin: center; transform: rotate(-90deg) translate(-26px, 42px); font-size: 11px; font-family: sans-serif;" });
				const countText: SVGTextElement = SVG.text({ class: "modulator-inverse-label", fill: ColorConfig.modLabelPrimary, style: "font-weight: bold; align-self: flex-start; transform-origin: center; transform: rotate(-90deg) translate(4px, 13px); font-size: 11px; font-family: sans-serif;" });
				const countRect: SVGRectElement = SVG.rect({ width: "12px", height: "9px", fill: ColorConfig.indicatorPrimary, style: "pointer-events: none; transform: translate(4px, 4px);" });

				const firstRowSVG: SVGSVGElement = SVG.svg({ viewBox: "0 0 16 66", width: "16px", style: "pointer-events: none; flex-grow: 1;" }, [
					firstRowText,
				]);
				const countSVG: SVGSVGElement = SVG.svg({ viewBox: "0 0 16 14", width: "16px", style: "pointer-events: none;" }, [
					countRect,
					countText,
				]);
				const secondRowSVG: SVGSVGElement = SVG.svg({ viewBox: "0 0 16 80", width: "16px", style: "pointer-events: none;" }, [
					secondRowText,
				]);

				const flexRow1: HTMLDivElement = HTML.div({ style: "display: flex; flex-direction: column; justify-content: space-between; pointer-events: none;" }, [
					countSVG,
					firstRowSVG,
				]);
				const flexRow2: HTMLDivElement = HTML.div({ style: "display: flex; flex-direction: column-reverse; justify-content: space-between; pointer-events: none;" }, [
					secondRowSVG,
				]);

				const flexContainer: HTMLDivElement = HTML.div({ style: "display: flex; flex-direction: row; justify-content: space-between; padding: 0px; width: 32px; height: 100%; overflow: hidden; pointer-events: none;" }, [
					flexRow1,
					flexRow2,
				]);
				
				const modKey: HTMLDivElement = HTML.div({ class: "modulator-button", style: "background: " + ColorConfig.modLabelPrimary + ";" }, flexContainer);
				this._modContainer.appendChild(modKey);
				this._modFirstLabels.push(firstRowText);
				this._modSecondLabels.push(secondRowText);
				this._modCountLabels.push(countText);
				this._modCountRects.push(countRect);
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
			const mousePitch: number = Math.max(0, Math.min(this._pitchCount - 1, this._pitchCount - (this._mouseY / this._pitchHeight)));
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
		
		private _playLiveInput(): void {
			const currentPitch: number = this._cursorPitch + this._doc.song.channels[this._doc.channel].octave * 12;
			if (this._playedPitch == currentPitch) return;
			this._playedPitch = currentPitch;
			this._doc.synth.liveInputDuration = Number.MAX_SAFE_INTEGER;
			this._doc.synth.liveInputPitches = [this._playedPitch];
			this._doc.synth.liveInputStarted = true;
		}
		
		private _releaseLiveInput(): void {
			this._playedPitch = -1;
			this._doc.synth.liveInputDuration = 0;
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
			this._doc.synth.maintainLiveInput();
			this._mouseDown = true;
			const boundingRect: ClientRect = this.container.getBoundingClientRect();
    		//this._mouseX = (event.clientX || event.pageX) - boundingRect.left;
		    this._mouseY = ((event.clientY || event.pageY) - boundingRect.top) * this._editorHeight / (boundingRect.bottom - boundingRect.top);
		    if (isNaN(this._mouseY)) this._mouseY = 0;
			this._playLiveInput();
			this._updatePreview();
		}

		private _whenMouseMoved = (event: MouseEvent): void => {
			if (this._mouseDown || this._mouseOver) this._doc.synth.maintainLiveInput();
			const boundingRect: ClientRect = this.container.getBoundingClientRect();
			//this._mouseX = (event.clientX || event.pageX) - boundingRect.left;
			this._mouseY = ((event.clientY || event.pageY) - boundingRect.top) * this._editorHeight / (boundingRect.bottom - boundingRect.top);
			if (isNaN(this._mouseY)) this._mouseY = 0;
			this._updateCursorPitch();
			if (this._mouseDown) this._playLiveInput();
			this._updatePreview();
		}

		private _whenMouseReleased = (event: MouseEvent): void => {
			if (this._mouseDown) this._releaseLiveInput();
			this._mouseDown = false;
			this._updatePreview();
		}

		private _whenTouchPressed = (event: TouchEvent): void => {
			event.preventDefault();
			this._doc.synth.maintainLiveInput();
			this._mouseDown = true;
			const boundingRect: ClientRect = this.container.getBoundingClientRect();
			//this._mouseX = event.touches[0].clientX - boundingRect.left;
			this._mouseY = (event.touches[0].clientY - boundingRect.top) * this._editorHeight / (boundingRect.bottom - boundingRect.top);
			if (isNaN(this._mouseY)) this._mouseY = 0;
			this._updateCursorPitch();
			this._playLiveInput();
		}

		private _whenTouchMoved = (event: TouchEvent): void => {
			event.preventDefault();
			this._doc.synth.maintainLiveInput();
			const boundingRect: ClientRect = this.container.getBoundingClientRect();
			//this._mouseX = event.touches[0].clientX - boundingRect.left;
			this._mouseY = (event.touches[0].clientY - boundingRect.top) * this._editorHeight / (boundingRect.bottom - boundingRect.top);
			if (isNaN(this._mouseY)) this._mouseY = 0;
			this._updateCursorPitch();
			if (this._mouseDown) this._playLiveInput();
		}

		private _whenTouchReleased = (event: TouchEvent): void => {
			event.preventDefault();
			this._releaseLiveInput();
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
			const isMod: boolean = this._doc.song.getChannelIsMod(this._doc.channel);
			if (isDrum) {
				this._pitchHeight = 40;
				this._pitchCount = Config.drumCount;
			}
			else if (isMod) {
				this._pitchHeight = 80;
				this._pitchCount = Config.modCount;
			}
			else {
				this._pitchHeight = (this._editorHeight / this._doc.windowPitchCount);
				this._pitchCount = this._doc.windowPitchCount;
			}

			if (!isDrum && !isMod) {
				for (let i: number = this._renderedPitchCount; i < this._doc.windowPitchCount; i++) {
					const pianoLabel: HTMLDivElement = HTML.div({ class: "piano-label", style: "font-weight: bold; -webkit-text-stroke-width: 0; font-size: 11px; font-family: sans-serif; position: absolute; padding-left: 15px;" });
					const pianoKey: HTMLDivElement = HTML.div({ class: "piano-button", style: "background: gray;" }, pianoLabel);
					this._pianoContainer.appendChild(pianoKey);
					this._pianoLabels.push(pianoLabel);
					this._pianoKeys.push(pianoKey);
					this._renderedPitchCount++;
				}

				for (let i: number = this._renderedPitchCount; i > this._doc.windowPitchCount; i--) {
					this._pianoContainer.removeChild(this._pianoContainer.lastChild as Node);
					this._pianoLabels.pop();
					this._pianoKeys.pop();
				}

				this._renderedPitchCount = this._doc.windowPitchCount;
			}

			this._updateCursorPitch();
			if (this._mouseDown) this._playLiveInput();
			this._doc.synth.liveInputChannel = this._doc.channel;
			this._render();
		}

		private _render = (): void => {
			if (!this._doc.showLetters) return;

			const isDrum = this._doc.song.getChannelIsNoise(this._doc.channel);
			const isMod = this._doc.song.getChannelIsMod(this._doc.channel);

			if (this._renderedScale == this._doc.song.scale && this._renderedKey == this._doc.song.key && this._renderedDrums == isDrum && this._renderedMod == isMod) return;
			this._renderedScale = this._doc.song.scale;
			this._renderedKey = this._doc.song.key;
			this._renderedDrums = isDrum;
			this._renderedMod = isMod;
			const instrument: Instrument = this._doc.song.channels[this._doc.channel].instruments[this._doc.getCurrentInstrument()];

			this._pianoContainer.style.display = (isDrum || isMod) ? "none" : "flex";
			this._drumContainer.style.display = isDrum ? "flex" : "none";
			this._modContainer.style.display = isMod ? "flex" : "none";

			if (!isDrum && !isMod) {
				for (let j: number = 0; j < this._pitchCount; j++) {
					const pitchNameIndex: number = (j + Config.keys[this._doc.song.key].basePitch) % 12;
					const isWhiteKey: boolean = Config.keys[pitchNameIndex].isWhiteKey;
					this._pianoKeys[j].style.background = isWhiteKey ? ColorConfig.whitePianoKey : ColorConfig.blackPianoKey;
					if (!Config.scales[this._doc.song.scale].flags[j % 12]) {
						this._pianoKeys[j].classList.add("disabled");
						this._pianoLabels[j].style.display = "none";
					} else {
						this._pianoKeys[j].classList.remove("disabled");
						this._pianoLabels[j].style.display = "";

						let text: string;

						if (Config.keys[pitchNameIndex].isWhiteKey) {
							text = Config.keys[pitchNameIndex].name;
						} else {
							const shiftDir: number = Config.blackKeyNameParents[j % 12];
							text = Config.keys[(pitchNameIndex + 12 + shiftDir) % 12].name;
							if (shiftDir == 1) {
								text += "♭";
							} else if (shiftDir == -1) {
								text += "♯";
							}
						}

						const label: HTMLDivElement = this._pianoLabels[j];

						if ((j % 12) == 0) {
							text += Math.floor(j / 12) + this._doc.song.channels[this._doc.channel].octave;
							label.style.transform = "translate(-5px, 0px)";
						}
						else {
							label.style.transform = "translate(0px, 0px)";
						}

						
						label.style.color = Config.keys[pitchNameIndex].isWhiteKey ? "black" : "white";
						label.textContent = text;
					}
				}
			}
			else if (isMod) {
				let firstRow: string = "";
				let secondRow: string = "";
				let useFirstColor: string = ColorConfig.modLabelPrimaryText;
				let useSecondColor: string = ColorConfig.modLabelSecondaryText;
				let channelVal: number;
				for (let j: number = 0; j < Config.modCount; j++) {

					let usingSecondRow: boolean = true;
					let usingMod: boolean = true;
					let instrumentVal: number = instrument.modInstruments[Config.modCount - j - 1] + 1;

					switch (instrument.modStatuses[Config.modCount - j - 1]) {
						case ModStatus.msNone:
							firstRow = "Mod"
							usingSecondRow = false;
							useSecondColor = ColorConfig.modLabelSecondaryText;
							usingMod = false;
							break;
						case ModStatus.msForPitch:
							channelVal = instrument.modChannels[Config.modCount - j - 1] + 1;
							instrumentVal = instrument.modInstruments[Config.modCount - j - 1] + 1;

							if (this._doc.song.channels[channelVal-1].name == "") {

								if (this._doc.song.instrumentsPerChannel > 1) {
									if (channelVal >= 10 || instrumentVal >= 10) {
										firstRow = "P" + channelVal;
										firstRow += " I" + instrumentVal;
									}
									else {
										firstRow = "Pitch" + channelVal;
										firstRow += " Ins" + instrumentVal;
									}
								}
								else {
									firstRow = "Pitch " + channelVal;
								}

							} else {

								// Channel name display
								if (this._doc.song.instrumentsPerChannel > 1) {
									firstRow = "P" + channelVal + " " + this._doc.song.channels[channelVal-1].name + " I" + instrumentVal;
								}
								else {
									firstRow = "P" + channelVal + " " + this._doc.song.channels[channelVal-1].name;
								}

							}
							break;
						case ModStatus.msForNoise:
							channelVal = instrument.modChannels[Config.modCount - j - 1] + 1;
							instrumentVal = instrument.modInstruments[Config.modCount - j - 1] + 1;

							if (this._doc.song.channels[channelVal - 1].name == "") {

								if (this._doc.song.instrumentsPerChannel > 1) {

									if (channelVal >= 10 || instrumentVal >= 10) {
										firstRow = "N" + channelVal;
										firstRow += " I" + instrumentVal;
									}
									else {
										firstRow = "Noise" + channelVal;
										firstRow += " Ins" + instrumentVal;
									}
								}
								else {
									firstRow = "Noise " + channelVal;
								}
							} else {

								// Channel name display
								if (this._doc.song.instrumentsPerChannel > 1) {
									firstRow = "N" + channelVal + " " + this._doc.song.channels[channelVal - 1].name + " I" + instrumentVal;
								}
								else {
									firstRow = "N" + channelVal + " " + this._doc.song.channels[channelVal - 1].name;
								}

							}
							break;
						case ModStatus.msForSong:
							firstRow = "Song";
							break;
					}

					// When unused, show name of mod on second row
					if (usingSecondRow) {
						switch (instrument.modSettings[Config.modCount - j - 1]) {
							case ModSetting.mstNone:
								useSecondColor = ColorConfig.modLabelSecondaryText;
								secondRow = "None";
								usingMod = false;
								break;
							case ModSetting.mstFilterCut:
								secondRow = "Filter Cut";
								break;
							case ModSetting.mstFilterPeak:
								secondRow = "Filter Peak";
								break;
							case ModSetting.mstFMFeedback:
								secondRow = "FM Feedback";
								break;
							case ModSetting.mstFMSlider1:
								secondRow = "FM 1";
								break;
							case ModSetting.mstFMSlider2:
								secondRow = "FM 2";
								break;
							case ModSetting.mstFMSlider3:
								secondRow = "FM 3";
								break;
							case ModSetting.mstFMSlider4:
								secondRow = "FM 4";
								break;
							case ModSetting.mstInsVolume:
								secondRow = "Volume";
								break;
							case ModSetting.mstNextBar:
								secondRow = "Next Bar";
								break;
							case ModSetting.mstPan:
								secondRow = "Pan";
								break;
							case ModSetting.mstDetune:
								secondRow = "Detune";
								break;
							case ModSetting.mstVibratoDepth:
								secondRow = "Vibrato Depth";
								break;
							//case ModSetting.mstVibratoSpeed:
								//secondRow = "Vibrato Speed";
								//break;
							case ModSetting.mstPulseWidth:
								secondRow = "Pulse Width";
								break;
							case ModSetting.mstReverb:
								secondRow = "Reverb";
								break;
							case ModSetting.mstSongVolume:
								secondRow = "Volume";
								break;
							case ModSetting.mstTempo:
								secondRow = "Tempo";
								break;
							case ModSetting.mstSongDetune:
								secondRow = "Detune";
								break;
						}
					}

					const firstLabel: SVGTextElement = this._modFirstLabels[j];
					const secondLabel: SVGTextElement = this._modSecondLabels[j];
					const modCountLabel: SVGTextElement = this._modCountLabels[j];
					const modCountRect: SVGRectElement = this._modCountRects[j];
					firstLabel.style.fill = useFirstColor;
					firstLabel.textContent = firstRow;
					secondLabel.style.fill = useSecondColor;
					secondLabel.textContent = usingSecondRow ? secondRow : "Not set";
					modCountLabel.textContent = "" + (Config.modCount - j);
					modCountRect.style.fill = usingMod ? ColorConfig.indicatorPrimary : ColorConfig.modLabelSecondaryText;

					// Check if text is too long, if name is set
					if (this._doc.song.channels[instrument.modChannels[Config.modCount - j - 1]].name != "") {
						let scaleFactor: string = "1";
						let height: number = firstLabel.parentElement!.parentElement!.getBoundingClientRect().height;
						let length: number = firstLabel.getComputedTextLength();
						let squeeze: number = 0;
						if (length > height - 8) {
							scaleFactor = "0.65";
							squeeze = 2;
						}
						else if ( length > height - 24) {
							scaleFactor = "0.8";
							squeeze = 1;
						}
						firstLabel.style.transform = "rotate(-90deg) translate(" + (-20 - squeeze - Math.round(Math.max(0, (height - 80) / 2))) + "px, 39px) scale(" + scaleFactor + ", 1)";
						// Truncate end of string if it's too long, but keep instrument num
						while (scaleFactor == "0.65" && firstLabel.getComputedTextLength() > height + 8 ) {
							var offset = 4 + (instrumentVal >= 10 ? 1 : 0);
							firstLabel.textContent = firstLabel.textContent.substr(0, firstLabel.textContent.length - offset) + firstLabel.textContent.substr(firstLabel.textContent.length - offset + 1);
						}
					}
					else {
						let height: number = firstLabel.parentElement!.parentElement!.getBoundingClientRect().height;
						firstLabel.style.transform = "rotate(-90deg) translate(" + (-20 - Math.round(Math.max(0, (height - 80) / 2))) + "px, 39px) scale(1, 1)";
					}
				}
			}
			this._updatePreview();
		}
	}
}