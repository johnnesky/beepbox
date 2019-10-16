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

/// <reference path="../synth/synth.ts" />
/// <reference path="SongDocument.ts" />
/// <reference path="html.ts" />
/// <reference path="SongEditor.ts" />

namespace beepbox {
	const {div, select, option} = HTML;

    export class MuteButton {
        private readonly _barWidth: number = 32;
        private readonly _rect : SVGRectElement = SVG.rect( { width: 30, height: 30, x: 1, y: 1 });
        private readonly _shape : SVGPolygonElement = SVG.polygon( { points: "7,10 14,10 24,4 24,28 14,22 7,22", fill: "#dda85d" });
        private readonly _muteCircle : SVGCircleElement = SVG.circle( { cx: "21", cy: "20", r: "6", stroke: "red", fill: "none", visibility:"hidden" });
        private readonly _muteLine : SVGLineElement = SVG.line( { x1:"17", y1:"16", x2:"25", y2:"24", stroke:"red", visibility:"hidden"});
        public readonly container : SVGSVGElement = SVG.svg( undefined, [this._rect, this._shape, this._muteCircle, this._muteLine]);
        private  _muted = false;
        constructor(channel: number, x: number, y: number) {
            this._muteCircle.setAttribute("stroke-width", "" + 2);
            this._muteLine.setAttribute("stroke-width", "" + 3);
            this.container.setAttribute("x", "" + (x * this._barWidth));
            this.container.setAttribute("y", "" + (Config.barEditorHeight + y * 32));
            this._rect.setAttribute("fill", "#040410");
            //this._label.setAttribute("fill", color);
        }

        public setSquashed(squashed: boolean, y: number): void {
            if (squashed) {
                this.container.setAttribute("y", "" + (Config.barEditorHeight + y * 27));
                this._rect.setAttribute("height", "" + 25);
                this._shape.setAttribute("y", "" + 21);
            } else {
                this.container.setAttribute("y", "" + (Config.barEditorHeight + y * 32));
                this._rect.setAttribute("height", "" + 30);
                this._shape.setAttribute("y", "" + 23);
            }
        }

        public getMuteState() {
            return this._muted;
        }

        public toggleMute( ) {
            if ( this._muted ) {
                this._muted = false;
                this._shape.setAttribute("fill", "#dda85d");
                this._muteCircle.setAttribute("visibility", "hidden");
                this._muteLine.setAttribute("visibility", "hidden");
            }
            else {
                this._muted = true;
                this._shape.setAttribute("fill", "#1c1d28");
                this._muteCircle.setAttribute("visibility", "visibile");
                this._muteLine.setAttribute("visibility", "visible");
            }
        }
	}
	
	export class MuteButtonEditor {
		private readonly _barWidth: number = 32;
    private readonly _svg = SVG.svg({ style: "background-color: #040410; position: absolute;", height: 128, width: this._barWidth });
        //private readonly _select: HTMLSelectElement = html.select({className: "muteButtonSelectBox", style: "width: 32px; height: 32px; background: none; border: none; appearance: none; color: transparent; position: absolute;"});
        private readonly _barEditorPath = SVG.path( { d: "M 2 1 H 30 V " + (Config.barEditorHeight - 3) + " H 2 V 1 Z", fill: "#5a3e4f", stroke: "#5a3e4f", "stroke-width": 1, "pointer-events": "none" });

        public readonly _barDropDown: HTMLSelectElement = select({ style: "width: 32px; height: " + Config.barEditorHeight + "px; position:absolute; opacity:0" },
            [
              option({ value: "solo" }, "Solo Current Channel"),
              option({ value: "unmuteAll" }, "Unmute All Channels"),
            ]
       );

        public readonly container: HTMLElement = div({ style: "height: 128px; width: 32px; position: relative; overflow:hidden;" }, [this._svg, this._barDropDown]);


        private readonly _muteButtonContainer = SVG.g();

		public readonly _muteButtons: MuteButton[] = [];
		//private _mouseX: number = 0;
		private _mouseY: number = 0;
		private _mouseOver: boolean = false;
		private _editorHeight: number = 128;
		private _channelHeight: number = 32;
		private _renderedChannelCount: number = 0;
		private _renderedSquashed: boolean = false;
		
		constructor(private _doc: SongDocument) {
            this._svg.appendChild(this._muteButtonContainer);
            this._svg.appendChild(this._barEditorPath);

            this._svg.addEventListener("mousedown", this._whenMousePressed);
            this._svg.addEventListener("mouseover", this._whenMouseOver);
            this._svg.addEventListener("mouseout", this._whenMouseOut);

            this._barDropDown.selectedIndex = -1;
            this._barDropDown.addEventListener("change", this._barDropDownHandler);
			
        }

        private _barDropDownHandler = (event: Event): void => {

            if (this._barDropDown.value == "solo") {

                for (let i: number = 0; i < this._muteButtons.length; i++) {

                    if (i == this._doc.channel && this._muteButtons[i].getMuteState() == true)
                        this._muteButtons[i].toggleMute();
                    else if (i != this._doc.channel && this._muteButtons[i].getMuteState() == false)
                        this._muteButtons[i].toggleMute();

                    this._doc.song.channels[i].muted = this._muteButtons[i].getMuteState();

                }

            }

            if (this._barDropDown.value == "unmuteAll") {

                for (let i: number = 0; i < this._muteButtons.length; i++) {

                    if (this._muteButtons[i].getMuteState() == true)
                        this._muteButtons[i].toggleMute();


                    this._doc.song.channels[i].muted = this._muteButtons[i].getMuteState();

                }

            }

            this._barDropDown.selectedIndex = -1;

        }
		
		//private _whenSelectChanged = (): void => {
		//this._toggleMuteButton(this._select.selectedIndex);
    //}
		
		private _whenMouseOver = (event: MouseEvent): void => {
			if (this._mouseOver) return;
			this._mouseOver = true;
		}
		
		private _whenMouseOut = (event: MouseEvent): void => {
			if (!this._mouseOver) return;
			this._mouseOver = false;
		}
		
		private _whenMousePressed = (event: MouseEvent): void => {
			event.preventDefault();
			const boundingRect: ClientRect = this._svg.getBoundingClientRect();
    		//this._mouseX = (event.clientX || event.pageX) - boundingRect.left;
            this._mouseY = (event.clientY || event.pageY) - boundingRect.top;

            if (this._mouseY >= Config.barEditorHeight) {

                const channel: number = Math.floor(Math.min(this._doc.song.getChannelCount() - 1, Math.max(0, (this._mouseY - Config.barEditorHeight) / this._channelHeight)));

                this._muteButtons[channel].toggleMute();

                this._doc.song.channels[channel].muted = this._muteButtons[channel].getMuteState();

            } else {


            }
		}
		
		//private _whenMouseMoved = (event: MouseEvent): void => {
			//const boundingRect: ClientRect = this._svg.getBoundingClientRect();
    		//this._mouseX = (event.clientX || event.pageX) - boundingRect.left;
		    //this._mouseY = (event.clientY || event.pageY) - boundingRect.top;

            // Note: may need to add a preview box to increase feedback
			//this._updatePreview();
		//}

		public render(): void {
			
			// Get channel height
			const wideScreen: boolean = window.innerWidth > 700;
			const squashed: boolean = !wideScreen || this._doc.song.getChannelCount() > 4 || (this._doc.song.barCount > this._doc.trackVisibleBars && this._doc.song.getChannelCount() > 3);
			this._channelHeight = squashed ? 27 : 32;
			

			if (this._renderedChannelCount != this._doc.song.getChannelCount()) {
				
				// Add new mute controls if needed
				for (let y: number = this._renderedChannelCount; y < this._doc.song.getChannelCount(); y++) {
					
					// Add new mute control box
					const mute : MuteButton = new MuteButton(y, 0, y);
                    this._muteButtons[y] = mute;
                    mute.setSquashed(squashed, y);
                    this._muteButtonContainer.appendChild(mute.container);
				}
				
				// Remove old mute controls if needed
				for (let y: number = this._doc.song.getChannelCount(); y < this._renderedChannelCount; y++) {
					
                    this._muteButtonContainer.removeChild(this._muteButtons[y].container);
				}
				
				this._muteButtons.length = this._doc.song.getChannelCount();
			}
			
			if (this._renderedSquashed != squashed) {
				for (let y: number = 0; y < this._doc.song.getChannelCount(); y++) {

					this._muteButtons[y].setSquashed(squashed, y);
				}
			}
			
			if (this._renderedSquashed != squashed || this._renderedChannelCount != this._doc.song.getChannelCount()) {
				this._renderedSquashed = squashed;
				this._renderedChannelCount = this._doc.song.getChannelCount();
                this._editorHeight = Config.barEditorHeight + this._doc.song.getChannelCount() * this._channelHeight;
				this._svg.setAttribute("height", "" + this._editorHeight);
				this.container.style.height = this._editorHeight + "px";
			}
			
			//this._updatePreview();
		}
	}
}
