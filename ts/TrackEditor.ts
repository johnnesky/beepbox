/*
Copyright (C) 2012 John Nesky

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

/// <reference path="synth.ts" />
/// <reference path="editor.ts" />
/// <reference path="SongEditor.ts" />

"use strict";

module beepbox {
	export interface TrackEditor {
	}

	export function TrackEditor(doc: SongDocument, songEditor: SongEditor): void {
		var barWidth: number = 32;
		var mouseX: number;
		var mouseY: number;
		var mainLayer: HTMLSelectElement = <HTMLSelectElement>document.getElementById("mainLayer");
		var container: HTMLElement = <HTMLElement>document.getElementById("trackEditorContainer");
		var canvas: HTMLCanvasElement = <HTMLCanvasElement>document.getElementById("trackEditor");
		var graphics: CanvasRenderingContext2D = canvas.getContext("2d");
		var playhead: HTMLElement = document.getElementById("trackPlayhead");
		var preview: HTMLCanvasElement = <HTMLCanvasElement>document.getElementById("trackEditorPreview");
		var previewGraphics: CanvasRenderingContext2D = preview.getContext("2d");
		
		var pattern: BarPattern;
		var mouseOver: boolean = false;
		var digits: string = "";
		var editorWidth: number = 512;
		var editorHeight: number = 128;
		var channelHeight: number = 32;
		
		function onEnterFrame(timestamp: number): void {
			playhead.style.left = (barWidth * (doc.synth.playhead - doc.barScrollPos) - 2) + "px";
			window.requestAnimationFrame(onEnterFrame);
		}
		
		function setChannelBar(channel: number, bar: number): void {
			var oldBarScrollPos: number = doc.barScrollPos;
			if (doc.history.getRecentChange() instanceof ChangeChannelBar) doc.history.undo();
			doc.barScrollPos = oldBarScrollPos;
			doc.history.record(new ChangeChannelBar(doc, channel, bar));
			digits = "";
		}
		
		function setBarPattern(pattern: number): void {
			if (doc.history.getRecentChange() instanceof ChangeBarPattern) doc.history.undo();
			doc.history.record(new ChangeBarPattern(doc, pattern));
		}
		
		function onKeyPressed(event: KeyboardEvent): void {
			if (songEditor.promptVisible) return;
			//if (event.ctrlKey)
			switch (event.keyCode) {
				case 38: // up
					setChannelBar((doc.channel + 3) % Music.numChannels, doc.bar);
					event.preventDefault();
					break;
				case 40: // down
					setChannelBar((doc.channel + 1) % Music.numChannels, doc.bar);
					event.preventDefault();
					break;
				case 37: // left
					setChannelBar(doc.channel, (doc.bar + doc.song.bars - 1) % doc.song.bars);
					event.preventDefault();
					break;
				case 39: // right
					setChannelBar(doc.channel, (doc.bar + 1) % doc.song.bars);
					event.preventDefault();
					break;
				case 48: // 0
					nextDigit("0");
					event.preventDefault();
					break;
				case 49: // 1
					nextDigit("1");
					event.preventDefault();
					break;
				case 50: // 2
					nextDigit("2");
					event.preventDefault();
					break;
				case 51: // 3
					nextDigit("3");
					event.preventDefault();
					break;
				case 52: // 4
					nextDigit("4");
					event.preventDefault();
					break;
				case 53: // 5
					nextDigit("5");
					event.preventDefault();
					break;
				case 54: // 6
					nextDigit("6");
					event.preventDefault();
					break;
				case 55: // 7
					nextDigit("7");
					event.preventDefault();
					break;
				case 56: // 8
					nextDigit("8");
					event.preventDefault();
					break;
				case 57: // 9
					nextDigit("9");
					event.preventDefault();
					break;
				default:
					digits = "";
					break;
			}
		}
		
		function nextDigit(digit: string): void {
			digits += digit;
			var parsed: number = parseInt(digits);
			if (parsed <= doc.song.patterns) {
				setBarPattern(parsed);
				return;
			}
				
			digits = digit;
			parsed = parseInt(digits);
			if (parsed <= doc.song.patterns) {
				setBarPattern(parsed);
				return;
			}
			
			digits = "";
		}
		
		function onKeyReleased(event: KeyboardEvent): void {
		}
		
		function onMouseOver(event: MouseEvent): void {
			mouseOver = true;
		}
		
		function onMouseOut(event: MouseEvent): void {
			mouseOver = false;
		}
		
		function onMousePressed(event: MouseEvent): void {
			event.preventDefault();
			var channel: number = Math.floor(Math.min(Music.numChannels-1, Math.max(0, mouseY / channelHeight)));
			var bar: number = Math.floor(Math.min(doc.song.bars-1, Math.max(0, mouseX / barWidth + doc.barScrollPos)));
			if (doc.channel == channel && doc.bar == bar) {
				var up: boolean = (mouseY % channelHeight) < channelHeight / 2;
				var patternCount: number = doc.song.channelPatterns[channel].length;
				setBarPattern((doc.song.channelBars[channel][bar] + (up ? 1 : patternCount)) % (patternCount + 1));
			} else {
				setChannelBar(channel, bar);
			}
		}
		
		function onMouseMoved(event: MouseEvent): void {
			var boundingRect: ClientRect = canvas.getBoundingClientRect();
    		mouseX = (event.clientX || event.pageX) - boundingRect.left;
		    mouseY = (event.clientY || event.pageY) - boundingRect.top;
			updatePreview();
		}
		
		function onMouseReleased(event: MouseEvent): void {
		}
		
		function updatePreview(): void {
			previewGraphics.clearRect(0, 0, 34, 34);
			if (!mouseOver) return;
			
			var channel: number = Math.floor(Math.min(Music.numChannels-1, Math.max(0, mouseY / channelHeight)));
			var bar: number = Math.floor(Math.min(doc.song.bars-1, Math.max(0, mouseX / barWidth + doc.barScrollPos)));
			
			preview.style.left = barWidth * (bar - doc.barScrollPos) + "px";
			preview.style.top = channelHeight * channel + "px";
			
			var selected: boolean = (bar == doc.bar && channel == doc.channel);
			if (selected) {
				var up: boolean = (mouseY % channelHeight) < channelHeight / 2;
				var center: number = barWidth * 0.8;
				var middle: number = channelHeight * 0.5;
				var base: number = channelHeight * 0.1;
				var tip: number = channelHeight * 0.4;
				var width: number = channelHeight * 0.175;
				
				previewGraphics.lineWidth = 1;
				previewGraphics.strokeStyle = "#000000";
				previewGraphics.fillStyle = up ? "#ffffff" : "#000000";
				previewGraphics.beginPath();
				previewGraphics.moveTo(center, middle - tip);
				previewGraphics.lineTo(center + width, middle - base);
				previewGraphics.lineTo(center - width, middle - base);
				previewGraphics.lineTo(center, middle - tip);
				previewGraphics.fill();
				previewGraphics.stroke();
				previewGraphics.fillStyle = !up ? "#ffffff" : "#000000";
				previewGraphics.beginPath();
				previewGraphics.moveTo(center, middle + tip);
				previewGraphics.lineTo(center + width, middle + base);
				previewGraphics.lineTo(center - width, middle + base);
				previewGraphics.lineTo(center, middle + tip);
				previewGraphics.fill();
				previewGraphics.stroke();
			} else {
				previewGraphics.lineWidth = 2;
				previewGraphics.strokeStyle = "#ffffff";
				previewGraphics.strokeRect(1, 1, barWidth - 2, channelHeight - 2);
			}
		}
		
		function documentChanged(): void {
			pattern = doc.getCurrentPattern();
			editorHeight = doc.song.bars > 16 ? 108 : 128;
			canvas.height = editorHeight;
			canvas.style.width = String(editorHeight);
			channelHeight = editorHeight / Music.numChannels;
			//scrollRect = new Rectangle(0, 0, width, editorHeight);
			render();
		}
		
		function render(): void {
			graphics.clearRect(0, 0, editorWidth, editorHeight);
			
			var renderCount: number = Math.min(16, doc.song.bars);
			for (var j: number = 0; j < Music.numChannels; j++) {
				var channelColor: string = SongEditor.channelColorsBright[j];
				var channelDim: string   = SongEditor.channelColorsDim[j];
				var i: number;
				for (i = 0; i < renderCount; i++) {
					var pattern: BarPattern = doc.song.getPattern(j, i + doc.barScrollPos);
					var selected: boolean = (i + doc.barScrollPos == doc.bar && j == doc.channel);
					if (selected || pattern != null) {
						graphics.fillStyle = (selected ? channelColor : "#444444");
						graphics.fillRect(barWidth * i + 1, channelHeight * j + 1, barWidth - 2, channelHeight - 2);
					}
					
					var text = String(doc.song.channelBars[j][i + doc.barScrollPos]);
					graphics.font = "bold 20px sans-serif";
					graphics.textAlign = 'center';
					graphics.textBaseline = 'middle';
				    graphics.fillStyle = selected ? "#000000" : (pattern == null || pattern.tones.length == 0 ? channelDim : channelColor);
				    graphics.fillText(text, barWidth * (i + 0.5), channelHeight * (j + 0.5) + 1.0);
				}
			}
			
			updatePreview();
		}
		
		pattern = doc.getCurrentPattern();
		/*
		graphics.mozImageSmoothingEnabled = false;
		graphics.webkitImageSmoothingEnabled = false;
		graphics.msImageSmoothingEnabled = false;
		graphics.imageSmoothingEnabled = false;
		*/
		
		render();
		doc.watch(documentChanged);
		
		window.requestAnimationFrame(onEnterFrame);
		container.addEventListener("mousedown", onMousePressed);
		document.addEventListener("mousemove", onMouseMoved);
		document.addEventListener("mouseup", onMouseReleased);
		container.addEventListener("mouseover", onMouseOver);
		container.addEventListener("mouseout", onMouseOut);
		mainLayer.addEventListener("keydown", onKeyPressed);
		mainLayer.addEventListener("keyup", onKeyReleased);
	}
}
