// Copyright (C) 2019 John Nesky, distributed under the MIT license.

/// <reference path="../synth/synth.ts" />
/// <reference path="ColorConfig.ts" />
/// <reference path="SongDocument.ts" />
/// <reference path="html.ts" />
/// <reference path="SongEditor.ts" />

namespace beepbox {
	class Box {
		private readonly _text: Text = document.createTextNode("1");
		private readonly _label: SVGTextElement = SVG.text({x: 16, y: 23, "font-family": "sans-serif", "font-size": 20, "text-anchor": "middle", "font-weight": "bold", fill: "red"}, this._text);
		private readonly _rect: SVGRectElement = SVG.rect({width: 30, height: 30, x: 1, y: 1});
		public readonly container: SVGSVGElement = SVG.svg(this._rect, this._label);
		private _renderedIndex: number = 1;
		private _renderedDim: boolean = true;
		private _renderedSelected: boolean = false;
		private _renderedColor: string = "";
		constructor(channel: number, x: number, y: number, color: string) {
			this.container.setAttribute("x", "" + (x * 32));
            this.container.setAttribute("y", "" + (Config.barEditorHeight + y * 32));
            this._rect.setAttribute("fill", "#393e4f");
			this._label.setAttribute("fill", color);
		}
		
		public setSquashed(squashed: boolean, y: number): void {
			if (squashed) {
        		this.container.setAttribute("y", "" + (Config.barEditorHeight + y * 27));
				this._rect.setAttribute("height", "" + 25);
				this._label.setAttribute("y", "" + 21);
			} else {
        		this.container.setAttribute("y", "" + (Config.barEditorHeight + y * 32));
				this._rect.setAttribute("height", "" + 30);
				this._label.setAttribute("y", "" + 23);
			}
		}
		
		public setIndex(index: number, dim: boolean, selected: boolean, y: number, color: string, isNoise: boolean): void {
			if (this._renderedIndex != index) {
				if (!this._renderedSelected && ((index == 0) != (this._renderedIndex == 0))) {
            if (index == 0) {
                this._rect.setAttribute("fill", "#040410");
            }
            else {
                if (isNoise)
                    this._rect.setAttribute("fill", dim ? "#161313" : "#3d3535");
                else
                    this._rect.setAttribute("fill", dim ? "#1c1d28" : "#393e4f");

            }
				}
			
				this._renderedIndex = index;
				this._text.data = ""+index;
			}
			
			if (this._renderedDim != dim || this._renderedColor != color) {
				this._renderedDim = dim;
				if (selected) {
          			this._label.setAttribute("fill", "#040410");
				} else {
					this._label.setAttribute("fill", color);

		            if (this._renderedIndex == 0) {
		                this._rect.setAttribute("fill", "#040410");
		          	}
		          		else {
		            if (isNoise)
		                this._rect.setAttribute("fill", dim ? "#161313" : "#3d3535");
		            else
		                this._rect.setAttribute("fill", dim ? "#1c1d28" : "#393e4f");
		            }
				}
			}
			
			if (this._renderedSelected != selected || this._renderedColor != color) {
				this._renderedSelected = selected;
				if (selected) {
					this._rect.setAttribute("fill", color);
          			this._label.setAttribute("fill", "#040410");
				} else {
					this._label.setAttribute("fill", color);

		            if (this._renderedIndex == 0) {
		                this._rect.setAttribute("fill", "#040410");
		            }
		            else {
		                if (isNoise)
		                    this._rect.setAttribute("fill", dim ? "#161313" : "#3d3535");
		                else
		                    this._rect.setAttribute("fill", dim ? "#1c1d28" : "#393e4f");
		            }
				}
			}
			
			this._renderedColor = color;
		}
	}
	
	export class TrackEditor {
		private readonly _barWidth: number = 32;
		private readonly _svg: SVGSVGElement = SVG.svg({style: "background-color: #040410; position: absolute;", height: 128});
		private readonly _select: HTMLSelectElement = HTML.select({className: "trackSelectBox", style: "width: 32px; height: 32px; background: none; border: none; appearance: none; color: transparent; position: absolute;"});
		public readonly _barDropDown: HTMLSelectElement = HTML.select({ style: "width: 32px; height: " + Config.barEditorHeight + "px; position:absolute; opacity:0" },
      
	        HTML.option({ value: "barBefore" }, "Insert Bar Before"),
	        HTML.option({ value: "barAfter" }, "Insert Bar After"),
	        HTML.option({ value: "deleteBar" }, "Delete This Bar"),
	    );
    public readonly container: HTMLElement = HTML.div({style: "height: 128px; position: relative; overflow:hidden;"}, this._svg, this._select, this._barDropDown);
		
		private readonly _boxContainer: SVGGElement = SVG.g();
		private readonly _playhead: SVGRectElement = SVG.rect({fill: "white", x: 0, y: 0, width: 4, height: 128});
		private readonly _boxHighlight: SVGRectElement = SVG.rect({fill: "none", stroke: "white", "stroke-width": 2, "pointer-events": "none", x: 1, y: 1, width: 30, height: 30});
		private readonly _upHighlight: SVGPathElement = SVG.path({fill: "040410", stroke: "040410", "stroke-width": 1, "pointer-events": "none"});
		private readonly _downHighlight: SVGPathElement = SVG.path({fill: "040410", stroke: "040410", "stroke-width": 1, "pointer-events": "none"});
		private readonly _barEditorPath = <SVGPathElement>SVG.path( { fill: "#393e4f", stroke: "#393e4f", "stroke-width": 1, "pointer-events": "none" });
        private readonly _selectHighlight = <SVGRectElement>SVG.rect( { fill:"#044B94", "stroke-width":"2", "stroke":"#3030fb", "fill-opacity": "0.4" });
		
		private readonly _grid: Box[][] = [];
		private _mouseX: number = 0;
		private _mouseY: number = 0;
	    private _lastScrollTime: number = 0;
	    private _selecting: boolean = false;
	    private _hasSelection: boolean = false;
	    public _selectionLeft: number = 0;
	    public _selectionTop: number = 0;
	    public _selectionWidth: number = 0;
	    public _selectionHeight: number = 0;
	    private _selectionStartBar: number = 0;
	    private _selectionStartChannel: number = 0;
		//private _pattern: Pattern | null = null;
		private _mouseOver: boolean = false;
		private _digits: string = "";
        private _instrumentDigits: string = "";
		private _editorHeight: number = 128;
		private _channelHeight: number = 32;
		private _renderedChannelCount: number = 0;
		private _renderedBarCount: number = 0;
		private _renderedPatternCount: number = 0;
		private _renderedPlayhead: number = -1;
		private _renderedSquashed: boolean = false;
		private _changePattern: ChangePattern | null = null;
		
        private _barDropDownBar: number = 0;
		
		constructor(private _doc: SongDocument, private _songEditor: SongEditor) {
			this._svg.appendChild(this._boxContainer);
      		this._svg.appendChild(this._barEditorPath);
      		this._svg.appendChild(this._selectHighlight);
			this._svg.appendChild(this._boxHighlight);
			this._svg.appendChild(this._upHighlight);
			this._svg.appendChild(this._downHighlight);
			this._svg.appendChild(this._playhead);
			
			window.requestAnimationFrame(this._animatePlayhead);
			this._svg.addEventListener("mousedown", this._whenMousePressed);
			document.addEventListener("mousemove", this._whenMouseMoved);
			document.addEventListener("mouseup", this._whenMouseReleased);
			this._svg.addEventListener("mouseover", this._whenMouseOver);
			this._svg.addEventListener("mouseout", this._whenMouseOut);
			
			this._select.addEventListener("change", this._whenSelectChanged);

      		this._barDropDown.selectedIndex = -1;
      		this._barDropDown.addEventListener("change", this._barDropDownHandler);
      		this._barDropDown.addEventListener("mousedown", this._barDropDownGetOpenedPosition);

  		}

		public clearSelection() {
		    this._hasSelection = false;
		    this._selecting = false;
		    this._selectionLeft = 0;
		    this._selectionTop = 0;
		    this._selectionWidth = 0;
		    this._selectionHeight = 0;
		}

	    public hasASelection(): boolean {
	        return (this._hasSelection && (this._selectionWidth > 0 || this._selectionHeight > 0));
	    }

  		private _barDropDownGetOpenedPosition = (event: MouseEvent): void => {
      		this._barDropDownBar = Math.floor(Math.min(this._doc.song.barCount - 1, Math.max(0, this._mouseX / this._barWidth)));
  		}

  		private _barDropDownHandler = (event: Event): void => {

      		this._setChannelBar(this._doc.channel, this._doc.bar);

      		var moveBarOffset = ( this._barDropDown.value == "barBefore" ) ? 0 : 1;

      		if (this._barDropDown.value == "barBefore" || this._barDropDown.value == "barAfter") {

          		// Can only insert one bar if there is space in the song
          		if (this._doc.song.barCount < Config.barCountMax) {

              		var prevBar = this._doc.bar;
              		var prevChannel = this._doc.channel;

              		var insertionGroup: ChangeGroup = new ChangeGroup();

              		insertionGroup.append(new ChangeBarCount(this._doc, this, this._doc.song.barCount + 1, false));

              		// Move everything past current bar right
              		for (let channel: number = 0; channel < this._doc.song.getChannelCount(); channel++) {

                  	for (let bar: number = this._doc.song.barCount - 1; bar > this._barDropDownBar + moveBarOffset; bar--) {

                    	this._doc.bar = bar;
                        this._doc.channel = channel;
                        this._setPatternChangeGroup(this._doc.song.channels[channel].bars[bar - 1], insertionGroup);

                    }

                    // Zero out inserted colum
                    this._doc.bar = this._barDropDownBar + moveBarOffset;
                    this._setPattern(0);

                }

                this._doc.bar = prevBar + ((prevBar < this._barDropDownBar + moveBarOffset) ? 0 : 1);

                // Adjust song playhead
                if (this._doc.synth.playhead >= this._barDropDownBar + moveBarOffset)
                    this._doc.synth.playhead++;

                this._doc.channel = prevChannel;

                this._doc.record(insertionGroup, false);

                this.render();

            }

        }
        else if (this._barDropDown.value == "deleteBar") {

            var prevBar = this._doc.bar;
            var prevChannel = this._doc.channel;
            var deletionGroup: ChangeGroup = new ChangeGroup();

            // Move everything past current bar left
            for (let channel: number = 0; channel < this._doc.song.getChannelCount(); channel++) {

                for (let bar: number = this._barDropDownBar; bar < this._doc.song.barCount - 1; bar++) {

                    this._doc.bar = bar;
                    this._doc.channel = channel;
                    this._setPatternChangeGroup(this._doc.song.channels[channel].bars[bar + 1], deletionGroup);

                }

            }

            deletionGroup.append(new ChangeBarCount(this._doc, this, this._doc.song.barCount - 1, false));

            //this._doc.synth.enableOutro = false;
          
            this._doc.bar = prevBar - ((prevBar <= this._barDropDownBar) ? 0 : 1);
            this._doc.channel = prevChannel;

            // Adjust song playhead
            if (this._doc.synth.playhead > this._barDropDownBar)
                this._doc.synth.playhead--;

          

            this._doc.record(deletionGroup, false);

            this.render();

        }
        this._barDropDown.selectedIndex = -1;
	}
		
	private _whenSelectChanged = (): void => {
		this._setPattern(this._select.selectedIndex);
	}
		
	private _animatePlayhead = (timestamp: number): void => {
		const playhead = (this._barWidth * this._doc.synth.playhead - 2);
		if (this._renderedPlayhead != playhead) {
			this._renderedPlayhead = playhead;
			this._playhead.setAttribute("x", "" + playhead);
		}
		window.requestAnimationFrame(this._animatePlayhead);
	}
		
	private _setChannelBar(channel: number, bar: number): void {
		new ChangeChannelBar(this._doc, channel, bar);
		this._digits = "";
		this._doc.forgetLastChange();
	}
		
	private _setPattern(pattern: number): void {
		const currentValue: number = this._doc.song.channels[this._doc.channel].bars[this._doc.bar];
		const canReplaceLastChange: boolean = this._doc.lastChangeWas(this._changePattern);
		const oldValue: number = canReplaceLastChange ? this._changePattern!.oldValue : currentValue;
		if (pattern != currentValue) {
			this._changePattern = new ChangePattern(this._doc, oldValue, pattern);
			this._doc.record(this._changePattern, canReplaceLastChange);
		}
      
    }
		
    private _setPatternChangeGroup(pattern: number, group: ChangeGroup): void {

        const currentValue: number = this._doc.song.channels[this._doc.channel].bars[this._doc.bar];
        const oldValue: number = currentValue;
        if (pattern != currentValue) {
          group.append(new ChangePattern(this._doc, oldValue, pattern));
        }

    }

    private _setPatternRangeChangeGroup(pattern: number, group: ChangeGroup) {

        // Act on multi selection.
        let prevChannel = this._doc.channel;
        let prevBar = this._doc.bar;

        for (let bar: number = 0; bar <= this._selectionWidth; bar++) {

            for (let channel: number = 0; channel <= this._selectionHeight; channel++) {

                const currentValue: number = this._doc.song.channels[channel + this._selectionTop].bars[bar + this._selectionLeft];
          		const oldValue: number = currentValue;

          		this._doc.channel = channel + this._selectionTop;
          		this._doc.bar = bar + this._selectionLeft;

          		if (oldValue != pattern) {
            		group.append(new ChangePattern(this._doc, oldValue, pattern));
          		}
        	}
      	}

      	this._doc.channel = prevChannel;
      	this._doc.bar = prevBar;
	}
		
	public onKeyPressed(event: KeyboardEvent): void {
		switch (event.keyCode) {
			case 38: // up
				this._setChannelBar((this._doc.channel - 1 + this._doc.song.getChannelCount()) % this._doc.song.getChannelCount(), this._doc.bar);
				event.preventDefault();
				break;
			case 40: // down
				this._setChannelBar((this._doc.channel + 1) % this._doc.song.getChannelCount(), this._doc.bar);
				event.preventDefault();
				break;
			case 37: // left
				this._setChannelBar(this._doc.channel, (this._doc.bar + this._doc.song.barCount - 1) % this._doc.song.barCount);
				event.preventDefault();
				break;
			case 39: // right
				this._setChannelBar(this._doc.channel, (this._doc.bar + 1) % this._doc.song.barCount);
				event.preventDefault();
				break;
        	case 46: // Delete
          		this._digits = "";
          		this._nextDigit("0", false);
          		event.preventDefault();
          	break;
			case 48: // 0
				this._nextDigit("0", event.shiftKey || event.ctrlKey);
				event.preventDefault();
				break;
			case 49: // 1
          		this._nextDigit("1", event.shiftKey || event.ctrlKey);
				event.preventDefault();
				break;
			case 50: // 2
          		this._nextDigit("2", event.shiftKey || event.ctrlKey);
				event.preventDefault();
				break;
			case 51: // 3
          		this._nextDigit("3", event.shiftKey || event.ctrlKey);
				event.preventDefault();
				break;
			case 52: // 4
          		this._nextDigit("4", event.shiftKey || event.ctrlKey);
				event.preventDefault();
				break;
			case 53: // 5
          		this._nextDigit("5", event.shiftKey || event.ctrlKey);
				event.preventDefault();
				break;
			case 54: // 6
          		this._nextDigit("6", event.shiftKey || event.ctrlKey);
				event.preventDefault();
				break;
			case 55: // 7
          		this._nextDigit("7", event.shiftKey || event.ctrlKey);
				event.preventDefault();
				break;
			case 56: // 8
          		this._nextDigit("8", event.shiftKey || event.ctrlKey);
				event.preventDefault();
				break;
			case 57: // 9
          		this._nextDigit("9", event.shiftKey || event.ctrlKey);
				event.preventDefault();
				break;
			default:
				this._digits = "";
          		this._instrumentDigits = "";
			break;
		}
	}
		
    private _nextDigit(digit: string, forInstrument: boolean): void {
        if (forInstrument) {
            this._instrumentDigits += digit;
            var parsed = parseInt(this._instrumentDigits);
        	if (parsed != 0 && parsed <= this._doc.song.instrumentsPerChannel) {
          		this._songEditor.changeInstrument(parsed-1);
          		return;
        	}
        	this._instrumentDigits = digit;
        	parsed = parseInt(this._instrumentDigits);
        	if (parsed != 0 && parsed <= this._doc.song.instrumentsPerChannel) {
          		this._songEditor.changeInstrument(parsed-1);
          		return;
        	}
        	this._instrumentDigits = "";
      	}
      	else {
			this._digits += digit;
			let parsed: number = parseInt(this._digits);
			if (parsed <= this._doc.song.patternsPerChannel) {
          		if (this.hasASelection()) {
            		var patternGroup: ChangeGroup = new ChangeGroup();

            		this._setPatternRangeChangeGroup(parsed, patternGroup);

            		this._doc.record(patternGroup, false);
          		}
          		else {
					this._setPattern(parsed);
          		}
			return;
			}
				
			this._digits = digit;
			parsed = parseInt(this._digits);
			if (parsed <= this._doc.song.patternsPerChannel) {

          		if (this.hasASelection()) {
            		var patternGroup: ChangeGroup = new ChangeGroup();

            		this._setPatternRangeChangeGroup(parsed, patternGroup);

            		this._doc.record(patternGroup, false);

          		}
          		else {
					this._setPattern(parsed);
				}
				return;
			}
			
			this._digits = "";
		}
	}
		
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
    	this._mouseX = (event.clientX || event.pageX) - boundingRect.left;
	    this._mouseY = (event.clientY || event.pageY) - boundingRect.top;
		const channel: number = Math.floor(Math.min(this._doc.song.getChannelCount() - 1, Math.max(0, ( this._mouseY - Config.barEditorHeight ) / this._channelHeight)));
		const bar: number = Math.floor(Math.min(this._doc.song.barCount - 1, Math.max(0, this._mouseX / this._barWidth)));

        // Act on track portion
        if (this._mouseY >= Config.barEditorHeight) {

			if (this._doc.channel == channel && this._doc.bar == bar) {
				const up: boolean = ( ( this._mouseY - Config.barEditorHeight ) % this._channelHeight) < this._channelHeight / 2;
				const patternCount: number = this._doc.song.patternsPerChannel;
				this._setPattern((this._doc.song.channels[channel].bars[bar] + (up ? 1 : patternCount)) % (patternCount + 1));
			} else {
				this._setChannelBar(channel, bar);
			}

	        // Start selection
	        this._selecting = true;
	        this._hasSelection = false;
	        this._selectionWidth = 0;
	        this._selectionHeight = 0;
	        this._selectionStartBar = bar;
	        this._selectionStartChannel = channel;

        }
	}
		
	private _whenMouseMoved = (event: MouseEvent): void => {
		const boundingRect: ClientRect = this._svg.getBoundingClientRect();
    	this._mouseX = (event.clientX || event.pageX) - boundingRect.left;
	    this._mouseY = (event.clientY || event.pageY) - boundingRect.top;
		this._updatePreview();
	}
		
	private _whenMouseReleased = (event: MouseEvent): void => {
       this._selecting = false;
       this._hasSelection = true;
	}
		
	private _updatePreview(): void {
			let channel: number = Math.floor(Math.min(this._doc.song.getChannelCount() - 1, Math.max(0, ( this._mouseY - Config.barEditorHeight ) / this._channelHeight)));
			let bar: number = Math.floor(Math.min(this._doc.song.barCount - 1, Math.max(0, this._mouseX / this._barWidth)));
				
			const wideScreen: boolean = window.innerWidth > 700;
			if (!wideScreen) {
				bar = this._doc.bar;
				channel = this._doc.channel;
			}
			
			const selected: boolean = (bar == this._doc.bar && channel == this._doc.channel);
        	const overTrackEditor: boolean = (this._mouseY >= Config.barEditorHeight);

      		if (((this._hasSelection && (this._selectionWidth > 0 || this._selectionHeight > 0)) || (this._selecting && overTrackEditor && (bar != this._selectionStartBar || channel != this._selectionStartChannel)))) {
        		this._selectHighlight.style.display = "";

            	if (this._selecting) {

            		this._selectionLeft = Math.min(bar, this._selectionStartBar);
                	this._selectionWidth = Math.abs(bar - this._selectionStartBar);
                	this._selectionTop = Math.min(channel, this._selectionStartChannel);
                	this._selectionHeight = Math.abs(channel - this._selectionStartChannel);

                	// Handle auto-scroll in selection. Only @50ms or slower.
                	var timestamp : number = Date.now();
			
              		if (timestamp - this._lastScrollTime >= 50) {

                		if (bar > this._doc.barScrollPos + this._doc.trackVisibleBars - 1 && this._doc.barScrollPos < this._doc.song.barCount - this._doc.trackVisibleBars) {

                    	this._songEditor.changeBarScrollPos(1);
                	}
                	if (bar < this._doc.barScrollPos && this._doc.barScrollPos > 0) {

            	        this._songEditor.changeBarScrollPos(-1);
        	        }

    	            this._lastScrollTime = timestamp;

	            }

        	}
          
        	this._selectHighlight.setAttribute("x", "" + (1 + this._barWidth * this._selectionLeft));
        	this._selectHighlight.setAttribute("y", "" + (1 + Config.barEditorHeight + (this._channelHeight * this._selectionTop)));
        	this._selectHighlight.setAttribute("width", "" + ((this._selectionWidth + 1 ) * this._barWidth - 2));
        	this._selectHighlight.setAttribute("height", "" + ((this._selectionHeight + 1) * this._channelHeight - 2));

    	} else {
            this._selectionWidth = 0;
            this._selectionHeight = 0;
            this._selectHighlight.style.display = "none";
        }

		if (this._mouseOver && !selected && overTrackEditor) {
			this._boxHighlight.setAttribute("x", "" + (1 + this._barWidth * bar));
			this._boxHighlight.setAttribute("y", "" + (1 + Config.barEditorHeight + (this._channelHeight * channel)));
			this._boxHighlight.setAttribute("height", "" + (this._channelHeight - 2));
			this._boxHighlight.style.visibility = "visible";
        } else if ( ( this._mouseOver || ( ( this._mouseX >= bar * 32 ) && ( this._mouseX < bar * 32 + 32 ) && ( this._mouseY > 0 ) ) ) && (!overTrackEditor) ) {                 
        	this._boxHighlight.setAttribute("x", "" + (1 + this._barWidth * bar));
        	this._boxHighlight.setAttribute("y", "1"); // The y is set to 1 instead of 0 due to the thickness of the box causing it to go slightly outside the frame at y=0.
        	this._boxHighlight.setAttribute("height", "" + (Config.barEditorHeight - 3 ));
        	this._boxHighlight.style.visibility = "visible";
		} else {
			this._boxHighlight.style.visibility = "hidden";
		}
			
      	if ((this._mouseOver || !wideScreen) && selected && overTrackEditor) {
        	const up: boolean = ((this._mouseY - Config.barEditorHeight ) % this._channelHeight) < this._channelHeight / 2;
			const center: number = this._barWidth * (bar + 0.8);
		    const middle: number = Config.barEditorHeight + this._channelHeight * (channel + 0.5);
			const base: number = this._channelHeight * 0.1;
			const tip: number = this._channelHeight * 0.4;
			const width: number = this._channelHeight * 0.175;
				
		    this._upHighlight.setAttribute("fill", up && wideScreen ? "#fff" : "#040410");
		    this._downHighlight.setAttribute("fill", !up && wideScreen ? "#fff" : "#040410");
				
			this._upHighlight.setAttribute("d", `M ${center} ${middle - tip} L ${center + width} ${middle - base} L ${center - width} ${middle - base} z`);
			this._downHighlight.setAttribute("d", `M ${center} ${middle + tip} L ${center + width} ${middle + base} L ${center - width} ${middle + base} z`);
				
			this._upHighlight.style.visibility = "visible";
			this._downHighlight.style.visibility = "visible";
		} else {
			this._upHighlight.style.visibility = "hidden";
			this._downHighlight.style.visibility = "hidden";
		}
			
        this._selectHighlight.style.left = (this._barWidth * this._doc.bar) + "px";
        this._selectHighlight.style.top = (Config.barEditorHeight + (this._channelHeight * this._doc.channel)) + "px";

		this._select.style.left = (this._barWidth * this._doc.bar) + "px";
        this._select.style.top = (Config.barEditorHeight + (this._channelHeight * this._doc.channel)) + "px";
		this._select.style.height = this._channelHeight + "px";
			
        this._barDropDown.style.left = (this._barWidth * bar) + "px";
        this._barDropDown.style.top = "0px";
			
		const patternCount: number = this._doc.song.patternsPerChannel + 1;
		for (let i: number = this._renderedPatternCount; i < patternCount; i++) {
			this._select.appendChild(HTML.option({value: i}, i));
		}
		for (let i: number = patternCount; i < this._renderedPatternCount; i++) {
			this._select.removeChild(<Node> this._select.lastChild);
		}
		this._renderedPatternCount = patternCount;
		const selectedPattern: number = this._doc.song.channels[this._doc.channel].bars[this._doc.bar];
		if (this._select.selectedIndex != selectedPattern) this._select.selectedIndex = selectedPattern;
	}
		
	public render(): void {
		//this._pattern = this._doc.getCurrentPattern();
			
		// Get channel height
		const wideScreen: boolean = window.innerWidth > 700;
		const squashed: boolean = !wideScreen || this._doc.song.getChannelCount() > 4 || (this._doc.song.barCount > this._doc.trackVisibleBars && this._doc.song.getChannelCount() > 3);
		this._channelHeight = squashed ? 27 : 32;
		
		if (this._renderedChannelCount != this._doc.song.getChannelCount()) {

			// Add new channel boxes if needed
			for (let y: number = this._renderedChannelCount; y < this._doc.song.getChannelCount(); y++) {
				this._grid[y] = [];
				for (let x: number = 0; x < this._renderedBarCount; x++) {
					const box: Box = new Box(y, x, y, ColorConfig.getChannelColor(this._doc.song, y).channelDim);
					box.setSquashed(squashed, y);
					this._boxContainer.appendChild(box.container);
					this._grid[y][x] = box;
				}
			}
				
			// Remove old channel boxes
			for (let y: number = this._doc.song.getChannelCount(); y < this._renderedChannelCount; y++) {
				for (let x: number = 0; x < this._renderedBarCount; x++) {
					this._boxContainer.removeChild(this._grid[y][x].container);
				}
			}
				
			this._grid.length = this._doc.song.getChannelCount();
		}
			
		if (this._renderedBarCount != this._doc.song.barCount) {
			for (let y: number = 0; y < this._doc.song.getChannelCount(); y++) {
				for (let x: number = this._renderedBarCount; x < this._doc.song.barCount; x++) {
          const box: Box = new Box(y, x, y, ColorConfig.getChannelColor(this._doc.song, y).channelDim);
					box.setSquashed(squashed, y);
					this._boxContainer.appendChild(box.container);
					this._grid[y][x] = box;
				}
				for (let x: number = this._doc.song.barCount; x < this._renderedBarCount; x++) {
					this._boxContainer.removeChild(this._grid[y][x].container);
				}
					this._grid[y].length = this._doc.song.barCount;
				}
				
        // Update bar editor's SVG
        // this._upHighlight.setAttribute("d", `M ${center} ${middle - tip} L ${center + width} ${middle - base} L ${center - width} ${middle - base} z`);
        //this._downHighlight.setAttribute("d", `M ${center} ${middle + tip} L ${center + width} ${middle + base} L ${center - width} ${middle + base} z`);

        var pathString = "";

        for (let x: number = 0; x < this._doc.song.barCount; x++) {
          var pathLeft = x * 32 + 2;
          var pathTop = 1;
          var pathRight = x * 32 + 30;
          var pathBottom = Config.barEditorHeight - 3;

          pathString += `M ${pathLeft} ${pathTop} H ${pathRight} V ${pathBottom} H ${pathLeft} V ${pathTop} Z `;
        }

        this._barEditorPath.setAttribute("d", pathString);
				
				this._renderedBarCount = this._doc.song.barCount;
				const editorWidth = 32 * this._doc.song.barCount;
				this.container.style.width = editorWidth + "px";
				this._svg.setAttribute("width", editorWidth + "");
			}
			
			if (this._renderedSquashed != squashed) {
				for (let y: number = 0; y < this._doc.song.getChannelCount(); y++) {
					for (let x: number = 0; x < this._renderedBarCount; x++) {
						this._grid[y][x].setSquashed(squashed, y);
					}
				}
			}
			
			if (this._renderedSquashed != squashed || this._renderedChannelCount != this._doc.song.getChannelCount()) {
				this._renderedSquashed = squashed;
				this._renderedChannelCount = this._doc.song.getChannelCount();
        		this._editorHeight = Config.barEditorHeight + this._doc.song.getChannelCount() * this._channelHeight;
				this._svg.setAttribute("height", "" + this._editorHeight);
				this._playhead.setAttribute("height", "" + this._editorHeight);
				this.container.style.height = this._editorHeight + "px";
			}
			
			for (let j: number = 0; j < this._doc.song.getChannelCount(); j++) {
				for (let i: number = 0; i < this._renderedBarCount; i++) {
					const pattern: Pattern | null = this._doc.song.getPattern(j, i);
					const selected: boolean = (i == this._doc.bar && j == this._doc.channel);
					const dim: boolean = (pattern == null || pattern.notes.length == 0);
					
					const box: Box = this._grid[j][i];
					if (i < this._doc.song.barCount) {
						const colors: ChannelColors = ColorConfig.getChannelColor(this._doc.song, j);
            box.setIndex(this._doc.song.channels[j].bars[i], dim, selected, j, dim && !selected ? colors.channelDim : colors.channelBright, j >= this._doc.song.pitchChannelCount );
						box.container.style.visibility = "visible";
					} else {
						box.container.style.visibility = "hidden";
					}
				}
			}
			
			this._updatePreview();
		}
	}
}
