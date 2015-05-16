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
/// <reference path="PatternEditor.ts" />
/// <reference path="TrackEditor.ts" />
/// <reference path="LoopEditor.ts" />
/// <reference path="BarScrollBar.ts" />
/// <reference path="OctaveScrollBar.ts" />
/// <reference path="Piano.ts" />
/// <reference path="SongDurationPrompt.ts" />
/// <reference path="ExportPrompt.ts" />

"use strict";

module beepbox {
	export interface SongEditor {
		closePrompt: ()=>void;
		promptVisible: boolean;
	}

	export interface SongEditorClass {
		(doc: SongDocument): void;
		channelColorsDim?: string[];
		channelColorsBright?: string[];
		noteColorsDim?: string[];
		noteColorsBright?: string[];
	}

	export var SongEditor: SongEditorClass = function(doc: SongDocument): void {
		var _this: SongEditor = this;
		var width: number = 700;
		var height: number = 645;
		var patternEditor: PatternEditor = new PatternEditor(doc);
		var trackEditor: TrackEditor = new TrackEditor(doc, this);
		var loopEditor: LoopEditor = new LoopEditor(doc);
		var barScrollBar: BarScrollBar = new BarScrollBar(doc);
		var octaveScrollBar: OctaveScrollBar = new OctaveScrollBar(doc);
		var piano: Piano = new Piano(doc);
		var copyTones: Tone[];
		var copyBeats: number = 0;
		var copyParts: number = 0;
		var copyDrums: boolean = false;
		var wasPlaying: boolean;
		
		this.promptVisible = false;
		
		function BuildOptions(items: any[]): string {
			var result: string = "";
			for (var i: number = 0; i < items.length; i++) {
				result = result + '<option value="' + items[i] + '">' + items[i] + '</option>';
			}
			return result;
		}
		
		function BuildOptionsWithTitle(items: string[][], title: string): string {
			var result: string = "";
			result = result + '<option value="' + title + '" selected="selected" disabled="disabled">' + title + '</option>';
			for (var i: number = 0; i < items.length; i++) {
				result = result + '<option value="' + items[i][1] + '">' + items[i][0] + '</option>';
			}
			return result;
		}
		
		var promptBackground: HTMLElement = <HTMLElement>document.getElementById("promptBackground");
		//var songSizePrompt: HTMLElement = <HTMLElement>document.getElementById("songSizePrompt");
		//var exportPrompt: HTMLElement = <HTMLElement>document.getElementById("exportPrompt");
		var editButton: HTMLSelectElement = <HTMLSelectElement>document.getElementById("editButton");
		var optionsButton: HTMLSelectElement = <HTMLSelectElement>document.getElementById("optionsButton");
		var mainLayer: HTMLElement = <HTMLElement>document.getElementById("mainLayer");
		var editorBox: HTMLElement = <HTMLElement>document.getElementById("editorBox");
		var patternContainerContainer: HTMLElement = <HTMLElement>document.getElementById("patternContainerContainer");
		var patternEditorContainer: HTMLElement = <HTMLElement>document.getElementById("patternEditorContainer");
		var pianoContainer: HTMLElement = <HTMLElement>document.getElementById("pianoContainer");
		var octaveScrollBarContainer: HTMLSelectElement = <HTMLSelectElement>document.getElementById("octaveScrollBarContainer");
		var trackEditorContainer: HTMLSelectElement = <HTMLSelectElement>document.getElementById("trackEditorContainer");
		var barScrollBarContainer: HTMLSelectElement = <HTMLSelectElement>document.getElementById("barScrollBarContainer");
		var playButton: HTMLButtonElement = <HTMLButtonElement>document.getElementById("playButton");
		var exportButton: HTMLButtonElement = <HTMLButtonElement>document.getElementById("exportButton");
		var volumeSlider: HTMLInputElement = <HTMLInputElement>document.getElementById("volumeSlider");
		var filterDropDownGroup: HTMLElement = <HTMLElement>document.getElementById("filterDropDownGroup");
		var chorusDropDownGroup: HTMLElement = <HTMLElement>document.getElementById("chorusDropDownGroup");
		var effectDropDownGroup: HTMLElement = <HTMLElement>document.getElementById("effectDropDownGroup");
		var patternSettingsLabel: HTMLSelectElement = <HTMLSelectElement>document.getElementById("patternSettingsLabel");
		var instrumentDropDownGroup: HTMLSelectElement = <HTMLSelectElement>document.getElementById("instrumentDropDownGroup");
		var scaleDropDown: HTMLSelectElement = <HTMLSelectElement>document.getElementById("scaleDropDown");
		var keyDropDown: HTMLSelectElement = <HTMLSelectElement>document.getElementById("keyDropDown");
		var tempoDropDown: HTMLSelectElement = <HTMLSelectElement>document.getElementById("tempoDropDown");
		var partDropDown: HTMLSelectElement = <HTMLSelectElement>document.getElementById("partDropDown");
		var instrumentDropDown: HTMLSelectElement = <HTMLSelectElement>document.getElementById("instrumentDropDown");
		var volumeDropDown: HTMLSelectElement = <HTMLSelectElement>document.getElementById("volumeDropDown");
		var waveDropDown: HTMLSelectElement = <HTMLSelectElement>document.getElementById("waveDropDown");
		var attackDropDown: HTMLSelectElement = <HTMLSelectElement>document.getElementById("attackDropDown");
		var filterDropDown: HTMLSelectElement = <HTMLSelectElement>document.getElementById("filterDropDown");
		var chorusDropDown: HTMLSelectElement = <HTMLSelectElement>document.getElementById("chorusDropDown");
		var effectDropDown: HTMLSelectElement = <HTMLSelectElement>document.getElementById("effectDropDown");
		
		var editCommands: string[][] = [
			[ "Undo (Z)", "undo" ],
			[ "Redo (Y)", "redo" ],
			[ "Copy Pattern (C)", "copy" ],
			[ "Paste Pattern (V)", "paste" ],
			[ "Shift Notes Up (+)", "transposeUp" ],
			[ "Shift Notes Down (-)", "transposeDown" ],
			[ "Custom song size...", "duration" ],
			[ "Clean Slate", "clean" ],
		]
		
		editButton.innerHTML  = BuildOptionsWithTitle(editCommands, "Edit Menu");
		scaleDropDown.innerHTML  = BuildOptions(Music.scaleNames);
		keyDropDown.innerHTML    = BuildOptions(Music.keyNames);
		tempoDropDown.innerHTML  = BuildOptions(Music.tempoNames);
		partDropDown.innerHTML   = BuildOptions(Music.partNames);
		filterDropDown.innerHTML = BuildOptions(Music.filterNames);
		attackDropDown.innerHTML = BuildOptions(Music.attackNames);
		effectDropDown.innerHTML = BuildOptions(Music.effectNames);
		chorusDropDown.innerHTML = BuildOptions(Music.chorusNames);
		volumeDropDown.innerHTML = BuildOptions(Music.volumeNames);
		var waveNames: string = BuildOptions(Music.waveNames);
		var drumNames: string = BuildOptions(Music.drumNames);
		
		function setPrompt(newPrompt: (doc: SongDocument, songEditor: SongEditor)=>void): void {
			if (_this.promptVisible) return;
			wasPlaying = doc.synth.playing;
			if (wasPlaying) togglePlay();
			promptBackground.style.display = "block";
			new newPrompt(doc, _this);
			_this.promptVisible = true;
		}
		
		this.closePrompt = (()=>{
			_this.promptVisible = false;
			promptBackground.style.display = "none";
			if (wasPlaying) togglePlay();
			mainLayer.focus();
		});
		
		function refocusStage(event: Event): void {
			//stage.focus = stage;
		}
		
		function onUpdated(): void {
			var optionCommands: string[][] = [
				[ (doc.showLetters ? "✓ " : "") + "Show Piano", "showLetters" ],
				[ (doc.showFifth ? "✓ " : "") + "Highlight 'Fifth' Notes", "showFifth" ],
				[ (doc.showChannels ? "✓ " : "") + "Show All Channels", "showChannels" ],
				[ (doc.showScrollBar ? "✓ " : "") + "Octave Scroll Bar", "showScrollBar" ],
			]
			optionsButton.innerHTML  = BuildOptionsWithTitle(optionCommands, "Preferences Menu");
			
			scaleDropDown.selectedIndex = doc.song.scale;
			keyDropDown.selectedIndex = doc.song.key;
			tempoDropDown.selectedIndex = doc.song.tempo;
			partDropDown.selectedIndex = Music.partCounts.indexOf(doc.song.parts);
			if (doc.channel == 3) {
				filterDropDownGroup.style.visibility = "hidden";
				chorusDropDownGroup.style.visibility = "hidden";
				effectDropDownGroup.style.visibility = "hidden";
				waveDropDown.innerHTML = drumNames;
			} else {
				filterDropDownGroup.style.visibility = "visible";
				chorusDropDownGroup.style.visibility = "visible";
				effectDropDownGroup.style.visibility = "visible";
				waveDropDown.innerHTML = waveNames;
			}
			
			var pattern: BarPattern = doc.getCurrentPattern();
			
			patternSettingsLabel.style.visibility    = (doc.song.instruments > 1 && pattern != null) ? "visible" : "hidden";
			instrumentDropDownGroup.style.visibility = (doc.song.instruments > 1 && pattern != null) ? "visible" : "hidden";
			var instrumentList: number[] = [];
			for (var i: number = 0; i < doc.song.instruments; i++) {
				instrumentList.push(i + 1);
			}
			instrumentDropDown.innerHTML = BuildOptions(instrumentList);
			
			var instrument: number = doc.getCurrentInstrument();
			waveDropDown.selectedIndex   = doc.song.instrumentWaves[doc.channel][instrument];
			filterDropDown.selectedIndex = doc.song.instrumentFilters[doc.channel][instrument];
			attackDropDown.selectedIndex = doc.song.instrumentAttacks[doc.channel][instrument];
			effectDropDown.selectedIndex = doc.song.instrumentEffects[doc.channel][instrument];
			chorusDropDown.selectedIndex = doc.song.instrumentChorus[doc.channel][instrument];
			volumeDropDown.selectedIndex = doc.song.instrumentVolumes[doc.channel][instrument];
			instrumentDropDown.selectedIndex = instrument;
			
			//currentState = doc.showLetters ? (doc.showScrollBar ? "showPianoAndScrollBar" : "showPiano") : (doc.showScrollBar ? "showScrollBar" : "hideAll");
			pianoContainer.style.display = doc.showLetters ? "table-cell" : "none";
			octaveScrollBarContainer.style.display = doc.showScrollBar ? "table-cell" : "none";
			barScrollBarContainer.style.display = doc.song.bars > 16 ? "table-row" : "none";
			
			var patternWidth: number = 512;
			if (doc.showLetters) patternWidth -= 32;
			if (doc.showScrollBar) patternWidth -= 20;
			patternEditorContainer.style.width = String(patternWidth) + "px";
			
			var trackHeight: number = 128;
			if (doc.song.bars > 16) trackHeight -= 20;
			trackEditorContainer.style.height = String(trackHeight) + "px";
			
			volumeSlider.value = String(doc.volume);
			
			if (doc.synth.playing) {
				playButton.innerHTML = "Pause";
			} else {
				playButton.innerHTML = "Play";
			}
		}
		
		function onKeyPressed(event: KeyboardEvent): void {
			if (_this.promptVisible) return;
			//if (event.ctrlKey)
			//trace(event.keyCode)
			switch (event.keyCode) {
				case 32: // space
					//stage.focus = stage;
					togglePlay();
					event.preventDefault();
					break;
				case 90: // z
					if (event.shiftKey) {
						doc.history.redo();
					} else {
						doc.history.undo();
					}
					event.preventDefault();
					break;
				case 89: // y
					doc.history.redo();
					event.preventDefault();
					break;
				case 67: // c
					copy();
					event.preventDefault();
					break;
				case 86: // v
					paste();
					event.preventDefault();
					break;
				case 219: // left brace
					doc.synth.prevBar();
					event.preventDefault();
					break;
				case 221: // right brace
					doc.synth.nextBar();
					event.preventDefault();
					break;
				case 71: // g
					doc.synth.stutterPressed = true;
					event.preventDefault();
					break;
				case 189: // -
				case 173: // Firefox -
					transpose(false);
					event.preventDefault();
					break;
				case 187: // +
				case 61: // Firefox +
					transpose(true);
					event.preventDefault();
					break;
			}
		}
		
		function onKeyReleased(event: KeyboardEvent): void {
			switch (event.keyCode) {
				case 71: // g
					doc.synth.stutterPressed = false;
					break;
			}
		}
		
		function togglePlay(): void {
			if (doc.synth.playing) {
				doc.synth.pause();
				doc.synth.snapToBar();
				playButton.innerHTML = "Play";
			} else {
				doc.synth.play();
				playButton.innerHTML = "Pause";
			}
		}
		
		function setVolumeSlider(): void {
			doc.setVolume(Number(volumeSlider.value));
		}
		
		function copy(): void {
			var pattern: BarPattern = doc.getCurrentPattern();
			if (pattern == null) return;
			copyTones = pattern.cloneTones();
			copyBeats = doc.song.beats;
			copyParts = doc.song.parts;
			copyDrums = doc.channel == 3;
		}
		
		function paste(): void {
			if (!canPaste()) return;
			doc.history.record(new ChangePaste(doc, copyTones));
		}
		
		function canPaste(): boolean {
			return doc.getCurrentPattern() != null && copyTones != null && copyBeats == doc.song.beats && copyParts == doc.song.parts && copyDrums == (doc.channel == 3);
		}
		
		function cleanSlate(): void {
			doc.history.record(new ChangeSong(doc, null));
			patternEditor.resetCopiedPins();
		}
		
		function transpose(upward: boolean): void {
			var pattern: BarPattern = doc.getCurrentPattern();
			if (pattern == null) return;
			doc.history.record(new ChangeTranspose(doc, pattern, upward));
		}
		
		function openPublishPrompt(): void {
			//setPrompt(PublishPrompt.make(doc, closePrompt));
		}
		
		function openExportPrompt(): void {
			setPrompt(ExportPrompt);
			//setPrompt(ExportPrompt.make(doc, closePrompt));
		}
		
		function copyToClipboard(): void {
			//Clipboard.generalClipboard.clear();
			//Clipboard.generalClipboard.setData(ClipboardFormats.TEXT_FORMAT, "http://www.beepbox.co/" + doc.song.toString());
		}
		
		function onSetScale(): void {
			doc.history.record(new ChangeScale(doc, scaleDropDown.selectedIndex));
		}
		
		function onSetKey(): void {
			doc.history.record(new ChangeKey(doc, keyDropDown.selectedIndex));
		}
		
		function onSetTempo(): void {
			doc.history.record(new ChangeTempo(doc, tempoDropDown.selectedIndex));
		}
		
		function onSetParts(): void {
			doc.history.record(new ChangeParts(doc, Music.partCounts[partDropDown.selectedIndex]));
		}
		
		function onSetWave(): void {
			doc.history.record(new ChangeWave(doc, waveDropDown.selectedIndex));
		}
		
		function onSetFilter(): void {
			doc.history.record(new ChangeFilter(doc, filterDropDown.selectedIndex));
		}
		
		function onSetAttack(): void {
			doc.history.record(new ChangeAttack(doc, attackDropDown.selectedIndex));
		}
		
		function onSetEffect(): void {
			doc.history.record(new ChangeEffect(doc, effectDropDown.selectedIndex));
		}
		
		function onSetChorus(): void {
			doc.history.record(new ChangeChorus(doc, chorusDropDown.selectedIndex));
		}
		
		function onSetVolume(): void {
			doc.history.record(new ChangeVolume(doc, volumeDropDown.selectedIndex));
		}
		
		function onSetInstrument(): void {
			if (doc.getCurrentPattern() == null) return;
			doc.history.record(new ChangePatternInstrument(doc, instrumentDropDown.selectedIndex));
		}
		
		function editMenuHandler(event:Event): void {
			switch (editButton.value) {
				case "undo":
					doc.history.undo();
					break;
				case "redo":
					doc.history.redo();
					break;
				case "copy":
					copy();
					break;
				case "paste":
					paste();
					break;
				case "transposeUp":
					transpose(true);
					break;
				case "transposeDown":
					transpose(false);
					break;
				case "clean":
					cleanSlate();
					break;
				case "duration":
					setPrompt(SongDurationPrompt);
					break;
			}
			editButton.selectedIndex = 0;
		}
		
		function optionsMenuHandler(event:Event): void {
			switch (optionsButton.value) {
				case "showLetters":
					doc.showLetters = !doc.showLetters;
					break;
				case "showFifth":
					doc.showFifth = !doc.showFifth;
					break;
				case "showChannels":
					doc.showChannels = !doc.showChannels;
					break;
				case "showScrollBar":
					doc.showScrollBar = !doc.showScrollBar;
					break;
			}
			optionsButton.selectedIndex = 0;
			doc.changed();
			doc.savePreferences();
		}
		
		doc.watch(onUpdated);
		onUpdated();
		
		editButton.addEventListener("change", editMenuHandler);
		optionsButton.addEventListener("change", optionsMenuHandler);
		scaleDropDown.addEventListener("change", onSetScale);
		keyDropDown.addEventListener("change", onSetKey);
		tempoDropDown.addEventListener("change", onSetTempo);
		partDropDown.addEventListener("change", onSetParts);
		instrumentDropDown.addEventListener("change", onSetInstrument);
		volumeDropDown.addEventListener("change", onSetVolume);
		waveDropDown.addEventListener("change",   onSetWave);
		attackDropDown.addEventListener("change", onSetAttack);
		filterDropDown.addEventListener("change", onSetFilter);
		chorusDropDown.addEventListener("change", onSetChorus);
		effectDropDown.addEventListener("change", onSetEffect);
		playButton.addEventListener("click", togglePlay);
		exportButton.addEventListener("click", openExportPrompt);
		volumeSlider.addEventListener("input", setVolumeSlider);
		
		//editorBox.addEventListener("mousedown", refocusStage);
		mainLayer.addEventListener("keydown", onKeyPressed);
		mainLayer.addEventListener("keyup", onKeyReleased);
	}
	
	SongEditor.channelColorsDim    = ["#0099a1", "#a1a100", "#c75000", "#6f6f6f"];
	SongEditor.channelColorsBright = ["#25f3ff", "#ffff25", "#ff9752", "#aaaaaa"];
	SongEditor.noteColorsDim       = ["#00bdc7", "#c7c700", "#ff771c", "#aaaaaa"];
	SongEditor.noteColorsBright    = ["#92f9ff", "#ffff92", "#ffcdab", "#eeeeee"];
}


var styleSheet = document.createElement('style');
styleSheet.type = "text/css";
styleSheet.appendChild(document.createTextNode((function () {
/*
#mainLayer div {
	margin: 0;
	padding: 0;
}
#mainLayer canvas {
	overflow: hidden;
	position: absolute;
	display: block;
}

#mainLayer .selectRow {
	width:100%;
	color: #bbbbbb;
	margin: 0;
	vertical-align: middle;
	line-height: 27px;
}
*/
;}).toString().replace(/^[^\/]+\/\*!?/, '').replace(/\*\/[^\/]+$/, '')));
document.head.appendChild(styleSheet);


var beepboxEditorContainer: HTMLElement = document.getElementById("beepboxEditorContainer");
beepboxEditorContainer.innerHTML = (function () {
/*
<div id="mainLayer" tabindex="0" style="width: 700px; height: 645px; -webkit-touch-callout: none; -webkit-user-select: none; -khtml-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none; position: relative;">
	<div id="editorBox" style="width: 512px; height: 645px; float: left;">
		<div id="patternContainerContainer" style="width: 512px; height: 481px; display: table; table-layout: fixed;">
			<div id="pianoContainer" style="width: 32px; height: 481px; display: table-cell; overflow:hidden; position: relative;">
				<canvas id="piano" width="32" height="481"></canvas>
				<canvas id="pianoPreview" width="32" height="43"></canvas>
			</div>
			<div id="patternEditorContainer"  style="height: 481px; display: table-cell; overflow:hidden; position: relative;">
				<canvas id="patternEditor" width="512" height="481"></canvas>
				<canvas id="patternEditorPreview" width="512" height="481"></canvas>
				<div id="patternPlayhead" style="width: 4px; height: 481px; overflow:hidden; position: absolute; background: #ffffff; visibility: hidden;"></div>
			</div>
			<div id="octaveScrollBarContainer" style="width: 20px; height: 481px; display: table-cell; overflow:hidden; position: relative;">
				<canvas id="octaveScrollBar" width="20" height="481"></canvas>
				<canvas id="octaveScrollBarPreview" width="20" height="481"></canvas>
			</div>
		</div>
		<div style="width: 512px; height: 6px;"></div>
		<div id="trackContainerContainer" style="width: 512px; height: 158px;">
			<div id="trackEditorContainer" style="width: 512px; height: 128px; position: relative; overflow:hidden;">
				<canvas id="trackEditor" width="512" height="128"></canvas>
				<canvas id="trackEditorPreview" width="32" height="32"></canvas>
				<div id="trackPlayhead" style="width: 4px; height: 100%; overflow:hidden; position: absolute; background: #ffffff;"></div>
			</div>
			<div style="width: 512px; height: 5px;"></div>
			<div id="loopEditorContainer" style="width: 512px; height: 20px; position: relative;">
				<canvas id="loopEditor" width="512" height="20"></canvas>
				<canvas id="loopEditorPreview" width="512" height="20"></canvas>
			</div>
			<div style="width: 512px; height: 5px;"></div>
			<div id="barScrollBarContainer" style="width: 512px; height: 20px; position: relative;">
				<canvas id="barScrollBar" width="512" height="20"></canvas>
				<canvas id="barScrollBarPreview" width="512" height="20"></canvas>
			</div>
		</div>
	</div>
	
	<div style="float: left; width: 6px; height: 645px;"></div>
	
	<div style="float: left; width: 182px; height: 645px; font-size: 12px;">
		<div style="width:100%; text-align: center; color: #bbbbbb;">
			BeepBox 2.0 beta
		</div>
		
		<div style="width:100%; margin: 5px 0;">
			<button id="playButton" style="width: 75px; float: left; margin: 0px" type="button">Play</button>
			<div style="float: left; width: 4px; height: 10px;"></div>
			<span style="float: left; background: #777777;"><input id="volumeSlider" style="width: 101px; margin: 0px;" type="range" min="0" max="100" value="50" step="1" /></span>
			<div style="clear: both;"></div> 
		</div>
		
		<select id="editButton" style="width:100%; margin: 5px 0;">Edit Menu</select>
		<select id="optionsButton" style="width:100%; margin: 5px 0;">Preferences Menu</select>
		<!--<button id="publishButton" style="width:100%" type="button">Publishing Panel...</button>-->
		<button id="exportButton" style="width:100%; margin: 5px 0;" type="button">Export to .wav File</button>
		<!--<button id="copyButton" style="width:100%" type="button">Copy URL to Clipboard</button>-->
		
		<div style="width: 100%; height: 110px;"></div>
		
		<div style="width:100%; margin: 3px 0;">
			Song Settings:
		</div>
		
		<div class="selectRow">
			Scale: <span style="float: right;"><select id="scaleDropDown" style="width:90px;"></select></span><div style="clear: both;"></div> 
		</div>
		<div class="selectRow">
			Key: <span style="float: right;"><select id="keyDropDown" style="width:90px;"></select></span><div style="clear: both;"></div> 
		</div>
		<div class="selectRow">
			Tempo: <span style="float: right;"><select id="tempoDropDown" style="width:90px;"></select></span><div style="clear: both;"></div> 
		</div>
		<div class="selectRow">
			Rhythm: <span style="float: right;"><select id="partDropDown" style="width:90px;"></select></span><div style="clear: both;"></div> 
		</div>
		
		<div style="width: 100%; height: 25px;"></div>
		
		<div id="patternSettingsLabel" style="visibility: hidden; width:100%; margin: 3px 0;">
			Pattern Settings:
		</div>
		
		<div id="instrumentDropDownGroup" style="width:100%; color: #bbbbbb; visibility: hidden; margin: 0; vertical-align: middle; line-height: 27px;">
			Instrument: <span style="float: right;"><select id="instrumentDropDown" style="width:120px;"></select></span><div style="clear: both;"></div> 
		</div>
		
		<div style="width: 100%; height: 25px;"></div>
		
		<div id="instrumentSettingsLabel" style="clear: both; width:100%; margin: 3px 0;">
			Instrument Settings:
		</div>
		
		<div id="volumeDropDownGroup" class="selectRow">
			Volume: <span style="float: right;"><select id="volumeDropDown" style="width:120px;"></select></span><div style="clear: both;"></div> 
		</div>
		<div id="waveDropDownGroup" class="selectRow">
			Wave: <span style="float: right;"><select id="waveDropDown" style="width:120px;"></select></span><div style="clear: both;"></div> 
		</div>
		<div id="attackDropDownGroup" class="selectRow">
			Envelope: <span style="float: right;"><select id="attackDropDown" style="width:120px;"></select></span><div style="clear: both;"></div> 
		</div>
		<div id="filterDropDownGroup" class="selectRow">
			Filter: <span style="float: right;"><select id="filterDropDown" style="width:120px;"></select></span><div style="clear: both;"></div> 
		</div>
		<div id="chorusDropDownGroup" class="selectRow">
			Chorus: <span style="float: right;"><select id="chorusDropDown" style="width:120px;"></select></span><div style="clear: both;"></div> 
		</div>
		<div id="effectDropDownGroup" class="selectRow">
			Effect: <span style="float: right;"><select id="effectDropDown" style="width:120px;"></select></span><div style="clear: both;"></div> 
		</div>
	</div>
	
	<div id="promptBackground" style="position: absolute; background: #000000; opacity: 0.5; width: 100%; height: 100%; display: none;"></div>
	
	<div id="songSizePrompt" style="position: absolute; display: none;">
		<div style="display: table-cell; vertical-align: middle; width: 700px; height: 645px;">
			<div style="margin: auto; text-align: center; background: #000000; width: 274px; border-radius: 15px; border: 4px solid #444444; color: #ffffff; font-size: 12px; padding: 20px;">
				<div style="font-size: 30px">Custom Song Size</div>
				
				<div style="height: 30px;"></div>
				
				<div style="vertical-align: middle; line-height: 46px;">
					<span style="float: right;"><div style="display: inline-block; vertical-align: middle; text-align: right; line-height: 18px;">Beats per bar:<br /><span style="color: #888888;">(Multiples of 3 or 4 are recommended)</span></div><div style="display: inline-block; width: 20px; height: 1px;"></div><input id="beatsStepper" style="width: 40px; height: 16px;" type="number" min="1" max="128" step="1" /></span>
					<div style="clear: both;"></div>
				</div>
				<div style="vertical-align: middle; line-height: 46px;">
					<span style="float: right;"><div style="display: inline-block; vertical-align: middle; text-align: right; line-height: 18px;">Bars per song:<br /><span style="color: #888888;">(Multiples of 2 or 4 are recommended)</span></div><div style="display: inline-block; width: 20px; height: 1px;"></div><input id="barsStepper" style="width: 40px; height: 16px;" type="number" min="1" max="128" step="1" /></span>
					<div style="clear: both;"></div>
				</div>
				<div style="vertical-align: middle; line-height: 46px;">
					<span style="float: right;">Patterns per channel:<div style="display: inline-block; width: 20px; height: 1px;"></div><input id="patternsStepper" style="width: 40px; height: 16px;" type="number" min="1" max="32" step="1" /></span>
					<div style="clear: both;"></div>
				</div>
				<div style="vertical-align: middle; line-height: 46px;">
					<span style="float: right;">Instruments per channel:<div style="display: inline-block; width: 20px; height: 1px;"></div><input id="instrumentsStepper" style="width: 40px; height: 16px;" type="number" min="1" max="10" step="1" /></span>
					<div style="clear: both;"></div>
				</div>
				
				<div style="height: 30px;"></div>
				
				<button id="songDurationOkayButton" style="width:125px; float: left;" type="button">Okay</button>
				<button id="songDurationCancelButton" style="width:125px; float: right;" type="button">Cancel</button>
				<div style="clear: both;"></div>
			</div>
		</div>
	</div>
	
	<div id="exportPrompt" style="position: absolute; display: none;">
		<div style="display: table-cell; vertical-align: middle; width: 700px; height: 645px;">
			<div style="margin: auto; text-align: center; background: #000000; width: 200px; border-radius: 15px; border: 4px solid #444444; color: #ffffff; font-size: 12px; padding: 20px;">
				<div style="font-size: 30px">Export Options</div>
				
				<div style="height: 30px;"></div>
				
				<div style="display: table; width: 200px;">
					<div style="display: table-row;">
						<div style="display: table-cell;">
							Intro:
						</div> 
						<div style="display: table-cell;">
							Loop Count:
						</div> 
						<div style="display: table-cell;">
							Outro:
						</div> 
					</div> 
					<div style="display: table-row; height: 30px;">
						<div style="display: table-cell; vertical-align: middle;">
							<input id="enableIntro" type="checkbox" />
						</div>
						<div style="display: table-cell; vertical-align: middle;">
							<input id="loopDropDown" style="width: 40px; height: 16px;" type="number" min="1" max="4" step="1" />
						</div>
						<div style="display: table-cell; vertical-align: middle;">
							<input id="enableOutro" type="checkbox" />
						</div>
					</div> 
				</div> 
				
				<div style="height: 30px;"></div>
				
				<button id="exportOkayButton" style="width:200px;" type="button">Export</button>
				<div style="height: 30px;"></div>
				<button id="exportCancelButton" style="width:200px;" type="button">Cancel</button>
			</div>
		</div>
	</div>
</div>
*/
;}).toString().replace(/^[^\/]+\/\*!?/, '').replace(/\*\/[^\/]+$/, '');


var prevHash: string = "**blank**";
var doc: beepbox.SongDocument = new beepbox.SongDocument();
var wokeUp: boolean = false;

function checkHash(): void {
	if (prevHash != location.hash) {
		prevHash = location.hash;
		if (prevHash != "") {
			doc.history.record(new beepbox.ChangeSong(doc, prevHash));
		}
	
		if (!wokeUp) {
			wokeUp = true;
			if ( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|android|ipad|playbook|silk/i.test(navigator.userAgent) ) {
				// don't autoplay on mobile devices, wait for input.
			} else {
				doc.synth.play();
			}
			doc.changed();
		}
	}
	beepbox.Model.updateAll();
	window.requestAnimationFrame(checkHash);
}

function onUpdated (): void {
	var hash: string = doc.song.toString();
	if (location.hash != hash) {
		location.hash = hash;
		prevHash = hash;
	}
}

new beepbox.SongEditor(doc);

doc.history.watch(onUpdated);

checkHash();



var lamescript = document.createElement("script")
lamescript.setAttribute("type", "text/javascript")
lamescript.setAttribute("src", "https://raw.githubusercontent.com/akrennmair/libmp3lame-js/master/dist/libmp3lame.min.js")
document.getElementsByTagName("head")[0].appendChild(lamescript)
