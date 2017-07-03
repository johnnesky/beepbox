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

package {
	import flash.desktop.*;
	import flash.display.*;
	import flash.events.*;
	import flash.external.*;
	import flash.geom.*;
	import flash.media.*;
	import flash.text.*;
	import flash.ui.*;
	import flash.utils.*;
	import flash.system.*;
	import flash.net.*;
	
	import beepbox.synth.*;
	
	[SWF(width='100', height='100', backgroundColor='#000000', frameRate='15')]
	public class MainEmbedded extends Sprite 
	{
		private var prevHash: String = null;
		
		private var synth: Synth = new Synth();
		private var titleText: TextField;
		private var linkText: TextField;
		private var linkContainer: Sprite = new Sprite();
		private var mouseIsOverPlayButton: Boolean = false;
		private var draggingPlayhead: Boolean = false;
		private var draggingVolume: Boolean = false;
		private var playButton: Sprite = new Sprite();
		private var loopIcon: Sprite = new Sprite();
		private var volumeIcon: Sprite = new Sprite();
		private var volumeSlider: Sprite = new Sprite();
		private var timeline: Sprite = new Sprite();
		private var playhead: Sprite = new Sprite();
		private var volume: int = 75;
		private var textHeight: Number = 12;
		private var playButtonWidth: Number;
		private var volumeIconWidth: Number = 12;
		private var volumeSliderWidth: Number;
		private var timelineLeft: Number;
		private var timelineWidth: Number;
		private var timelineHeight: Number;
		private var id: String = uint(Math.random() * 0xffffffff).toString(16);
		private var pauseButtonDisplayed: Boolean = false;
		
		public function MainEmbedded() 
		{
			var format: TextFormat = new TextFormat();
			format.align = TextFormatAlign.LEFT;
			format.bold = true;
			format.font = "Helvetica";
			format.size = 10;
			titleText = new TextField();
			titleText.height = textHeight + 4; // text fields have a 2px gutter.
			titleText.type = TextFieldType.DYNAMIC;
			//titleText.selectable = false;
			titleText.autoSize = TextFieldAutoSize.LEFT;
			//titleText.mouseEnabled = false;
			titleText.defaultTextFormat = format;
			titleText.textColor = 0xffffff;
			
			format.align = TextFormatAlign.RIGHT;
			linkText = new TextField();
			linkText.height = textHeight + 4; // text fields have a 2px gutter.
			linkText.type = TextFieldType.DYNAMIC;
			linkText.selectable = false;
			linkText.autoSize = TextFieldAutoSize.RIGHT;
			//linkText.mouseEnabled = false;
			linkText.defaultTextFormat = format;
			linkText.textColor = 0x8866ff;
			linkText.text = "Edit in BeepBox";
			
			volumeIcon.graphics.beginFill(0x444444);
			volumeIcon.graphics.moveTo(1, 9);
			volumeIcon.graphics.lineTo(1, 3);
			volumeIcon.graphics.lineTo(4, 3);
			volumeIcon.graphics.lineTo(7, 0);
			volumeIcon.graphics.lineTo(7, 12);
			volumeIcon.graphics.lineTo(4, 9);
			volumeIcon.graphics.lineTo(1, 9);
			volumeIcon.graphics.moveTo(9, 3);
			volumeIcon.graphics.curveTo(12, 6, 9, 9);
			volumeIcon.graphics.lineTo(8, 8);
			volumeIcon.graphics.curveTo(10.5, 6, 8, 4);
			volumeIcon.graphics.lineTo(9, 3);
			volumeIcon.graphics.endFill();
			
			playButton.buttonMode = true;
			loopIcon.buttonMode = true;
			volumeSlider.buttonMode = true;
			timeline.buttonMode = true;
			playhead.mouseChildren = false;
			linkContainer.buttonMode = true;
			linkContainer.mouseChildren = false;
			
			linkContainer.addChild(linkText);
			addChild(playButton);
			addChild(loopIcon);
			addChild(volumeIcon);
			addChild(volumeSlider);
			addChild(timeline);
			addChild(playhead);
			addChild(linkContainer);
			addChild(titleText);
			
			try {
				var localSO: SharedObject = getLocalSO();
				if (localSO != null) {
					if (localSO.data.volume != undefined) volume = localSO.data.volume;
				}
			} catch(e: Error) {}
			setVolume(volume);
			
			stage.scaleMode = StageScaleMode.NO_SCALE;
			stage.align = StageAlign.TOP_LEFT;
			stage.addEventListener(Event.RESIZE, onStageResize);
			stage.addEventListener(Event.ENTER_FRAME, onEnterFrame);
			stage.addEventListener(MouseEvent.MOUSE_MOVE, onMouseMove);
			stage.addEventListener(MouseEvent.MOUSE_UP, onMouseUp);
			stage.addEventListener(KeyboardEvent.KEY_DOWN, onKeyPressed);
			playButton.addEventListener(MouseEvent.ROLL_OVER, onMouseOverPlayButton);
			playButton.addEventListener(MouseEvent.ROLL_OUT, onMouseOutPlayButton);
			playButton.addEventListener(MouseEvent.CLICK, onTogglePlay);
			loopIcon.addEventListener(MouseEvent.CLICK, onToggleLoop);
			timeline.addEventListener(MouseEvent.MOUSE_DOWN, onTimelineMouseDown);
			volumeSlider.addEventListener(MouseEvent.MOUSE_DOWN, onVolumeMouseDown);
			linkContainer.addEventListener(MouseEvent.CLICK, onOpenInEditor);
			onStageResize();
			
			Security.allowDomain("*");
			ExternalInterface.addCallback("hashUpdatedExternally", hashUpdatedExternally);
		}
		
		private function getLocalSO(): SharedObject {
			return SharedObject.getLocal("preferences");
		}
		
		private function hashUpdatedExternally(myhash: String): void {
			if (prevHash == myhash || myhash == "") return;
			
			prevHash = myhash;
			
			if (myhash.charAt(0) == "#") {
				myhash = myhash.substring(1);
			}
			
			titleText.text = "";
			
			for each (var parameter: String in myhash.split("&")) {
				var equalsIndex: Number = parameter.indexOf("=");
				if (equalsIndex != -1) {
					var paramName: String = parameter.substring(0, equalsIndex);
					var value: String = parameter.substring(equalsIndex + 1);
					switch (paramName) {
						case "song":
							synth.setSong(value);
							synth.snapToStart();
							break;
						case "title":
							titleText.text = value;
							break;
						case "loop":
							synth.enableOutro = (value != "1");
							break;
					}
				} else {
					synth.setSong(myhash);
					synth.snapToStart();
				}
			}
			
			//titleText.text = "Anonymous - Untitled";
			
			renderPlayhead();
			renderTimeline();
			render();
		}
		
		private function onStageResize(event: Event = null): void {
			playButtonWidth = Math.min(stage.stageHeight, stage.stageWidth / 5);
			
			timelineLeft = playButtonWidth;
			timelineWidth = stage.stageWidth - timelineLeft;
			timelineHeight = stage.stageHeight - textHeight;
			volumeSliderWidth = Math.min(100, timelineWidth * 0.15);
			
			var xPos: Number = timelineLeft;
			
			loopIcon.x = xPos;
			loopIcon.y = stage.stageHeight - textHeight;
			
			xPos += volumeIconWidth + 2;
			
			volumeIcon.x = xPos;
			volumeIcon.y = stage.stageHeight - textHeight;
			
			xPos += volumeIconWidth + 2;
			
			volumeSlider.x = xPos;
			volumeSlider.y = stage.stageHeight - textHeight;
			
			xPos += volumeSliderWidth + 4;
			
			titleText.x = xPos;
			titleText.y = stage.stageHeight - textHeight - 2; // text fields have a 2px gutter.
			titleText.width = 10;
			linkText.x = stage.stageWidth - 10;
			linkText.y = stage.stageHeight - textHeight - 2; // text fields have a 2px gutter.
			linkText.width = 10;
			renderTimeline();
			render();
		}
		
		private function onEnterFrame(event: Event): void {
			if (synth.playing) {
				var localSO: SharedObject = getLocalSO();
				if (localSO != null) {
					if (localSO.data.playerId != id) {
						synth.pause();
						render();
					}
				}
				renderPlayhead();
			}
			
			if (pauseButtonDisplayed != synth.playing) {
				render();
			}
		}
		
		private function onKeyPressed(event: KeyboardEvent): void {
			switch (event.keyCode) {
				case 32: // space
					onTogglePlay();
					break;
			}
		}
		
		private function onMouseOverPlayButton(event: MouseEvent): void {
			mouseIsOverPlayButton = true;
			render();
		}
		
		private function onMouseOutPlayButton(event: MouseEvent): void {
			mouseIsOverPlayButton = false;
			render();
		}
		
		private function onTogglePlay(event: MouseEvent = null): void {
			if (synth.song != null) {
				if (synth.playing) {
					synth.pause();
				} else {
					synth.play();
					
					var localSO: SharedObject = getLocalSO();
					if (localSO != null) {
						localSO.data.playerId = id;
						localSO.flush();
					}
				}
			}
			render();
		}
		
		private function onToggleLoop(event: MouseEvent = null): void {
			if (synth.enableOutro) {
				synth.enableOutro = false;
			} else {
				synth.enableOutro = true;
			}
			render();
		}
				
		private function onTimelineMouseDown(event: MouseEvent): void {
			draggingPlayhead = true;
			onMouseMove(event);
		}
		
		private function onVolumeMouseDown(event: MouseEvent): void {
			draggingVolume = true;
			onMouseMove(event);
		}
		
		private function onMouseMove(event: MouseEvent): void {
			if (draggingPlayhead) {
				if (synth.song != null) {
					synth.playhead = synth.song.bars * timeline.mouseX / timelineWidth;
				}
			}
			if (draggingVolume) {
				setVolume(Math.max(0, Math.min(100, volumeSlider.mouseX * 100 / volumeSliderWidth)));
			}
			render();
		}
		
		private function onMouseUp(event: MouseEvent): void {
			if (draggingVolume) {
				var localSO: SharedObject = getLocalSO();
				if ((localSO != null) && (volume != 0)) {
					// save volume
					localSO.data.volume = volume;
					localSO.flush();
				}
			}
			draggingPlayhead = false;
			draggingVolume = false;
		}
		
		private function setVolume(v: int): void {
			volume = v;
			synth.volume = Math.min(1.0, Math.pow(volume / 50.0, 0.5)) * Math.pow(2.0, (volume - 75.0) / 25.0);
		}
		
		private function onOpenInEditor(event: MouseEvent): void {
			if (synth.playing) {
				synth.pause();
			}
			if (synth.song != null) {
				ExternalInterface.call("open", "http://beepbox.co/#" + synth.song.toString(), "_blank");
			}
		}
		
		private function renderPlayhead(): void {
			var pos: Number = timelineLeft + timelineWidth * synth.playhead / synth.totalBars;
			
			playhead.graphics.clear();
			playhead.graphics.beginFill(0xffffff);
			playhead.graphics.drawRect(pos, 0, 2, timelineHeight);
			playhead.graphics.endFill();
		}
		
		private function renderTimeline(): void {
			timeline.graphics.clear();
			timeline.x = timelineLeft;
			if (synth.song == null) return;
			
			var noteColors: Array = [0x00bdc7, 0xc7c700, 0xff771c, 0x777777];
			
			var barWidth: Number = timelineWidth / synth.song.bars;
			var partWidth: Number = barWidth / (synth.song.beats * synth.song.parts);
			var wavePitchHeight: Number = (timelineHeight-1) / Music.pitchCount;
			var drumPitchHeight: Number =  (timelineHeight-1) / Music.drumCount;
			
			timeline.graphics.beginFill(0x000000);
			timeline.graphics.drawRect(0, 0, timelineWidth, timelineHeight);
			timeline.graphics.endFill();
			
			timeline.graphics.beginFill(0x444444);
			for (var bar: int = 0; bar < synth.song.bars + 1; bar++) {
				timeline.graphics.drawRect(bar * barWidth - 1, 0, 2, timelineHeight);
			}
			timeline.graphics.endFill();
			timeline.graphics.beginFill(0x664933);
			for (var octave: int = 0; octave < 4; octave++) {
				timeline.graphics.drawRect(0, octave * 12 * wavePitchHeight, timelineWidth, wavePitchHeight + 1);
			}
			timeline.graphics.endFill();
			
			for (var channel: int = 3; channel >= 0; channel--) {
				var pitchHeight: Number = (channel == 3 ? drumPitchHeight : wavePitchHeight);
				var offsetY: Number = synth.song.channelOctaves[channel] * pitchHeight * 12 + timelineHeight - pitchHeight * 0.5 - 0.5;
				
				for (var bar: int = 0; bar < synth.song.bars; bar++) {
					var pattern: BarPattern = synth.song.getPattern(channel, bar);
					if (pattern == null) continue;
					var offsetX: Number = bar * barWidth;
					
					for (var i: int = 0; i < pattern.notes.length; i++) {
						var note: Note = pattern.notes[i];
						
						for each (var pitch: int in note.pitches) {
							timeline.graphics.beginFill(noteColors[channel]);
							drawNote(pitch, note.start, note.pins, (pitchHeight + 1) / 2, offsetX, offsetY, partWidth, pitchHeight);
							timeline.graphics.endFill();
						}
					}
				}
			}
		}
		
		private function drawNote(pitch: int, start: int, pins: Array, radius: int, offsetX: Number, offsetY: Number, partWidth: Number, pitchHeight: Number): void {
			var i: int;
			var prevPin: NotePin;
			var nextPin: NotePin;
			var prevSide:   Number;
			var nextSide:   Number;
			var prevHeight: Number;
			var nextHeight: Number;
			var prevVolume: Number;
			var nextVolume: Number;
			nextPin = pins[0];
			timeline.graphics.moveTo(offsetX + partWidth * (start + nextPin.time), offsetY - pitch * pitchHeight + radius * (nextPin.volume / 3.0));
			for (i = 1; i < pins.length; i++) {
				prevPin = nextPin;
				nextPin = pins[i];
				prevSide   = offsetX + partWidth * (start + prevPin.time);
				nextSide   = offsetX + partWidth * (start + nextPin.time);
				prevHeight = offsetY - pitchHeight * (pitch + prevPin.interval);
				nextHeight = offsetY - pitchHeight * (pitch + nextPin.interval);
				prevVolume = prevPin.volume / 3.0;
				nextVolume = nextPin.volume / 3.0;
				timeline.graphics.lineTo(prevSide, prevHeight - radius * prevVolume);
				if (prevPin.interval > nextPin.interval) timeline.graphics.lineTo(prevSide, prevHeight - radius * prevVolume);
				if (prevPin.interval < nextPin.interval) timeline.graphics.lineTo(nextSide, nextHeight - radius * nextVolume);
				timeline.graphics.lineTo(nextSide, nextHeight - radius * nextVolume);
			}
			for (i = pins.length - 2; i >= 0; i--) {
				prevPin = nextPin;
				nextPin = pins[i];
				prevSide   = offsetX + partWidth * (start + prevPin.time);
				nextSide   = offsetX + partWidth * (start + nextPin.time);
				prevHeight = offsetY - pitchHeight * (pitch + prevPin.interval);
				nextHeight = offsetY - pitchHeight * (pitch + nextPin.interval);
				prevVolume = prevPin.volume / 3.0;
				nextVolume = nextPin.volume / 3.0;
				timeline.graphics.lineTo(prevSide, prevHeight + radius * prevVolume);
				if (prevPin.interval < nextPin.interval) timeline.graphics.lineTo(prevSide, prevHeight + radius * prevVolume);
				if (prevPin.interval > nextPin.interval) timeline.graphics.lineTo(nextSide, nextHeight + radius * nextVolume);
				timeline.graphics.lineTo(nextSide, nextHeight + radius * nextVolume);
			}
		}
		
		private function pitchToPixelHeight(pitch: int, wavePitchHeight: Number): Number {
			return wavePitchHeight * (pitch - 0.5);
		}
		
		private function render(): void {
			playButton.graphics.clear();
			volumeSlider.graphics.clear();
			
			if (synth.song != null) {
				playButton.x = playButtonWidth * 0.5;
				playButton.y = stage.stageHeight * 0.5;
				
				playButton.graphics.beginFill(mouseIsOverPlayButton ? 0x777777 : 0x444444);
				
				playButton.graphics.drawRoundRect(-playButtonWidth * 0.4, -stage.stageHeight * 0.5 + playButtonWidth * 0.1, playButtonWidth * 0.8, stage.stageHeight - playButtonWidth * 0.2, playButtonWidth * 0.2, playButtonWidth * 0.2);
				playButton.graphics.endFill();
				
				playButton.graphics.beginFill(0xffffff);
				if (synth.playing) {
					var lineRadius: Number = playButtonWidth * 0.1;
					playButton.graphics.drawRect(-playButtonWidth * 0.2, -playButtonWidth * 0.2, playButtonWidth * 0.1, playButtonWidth * 0.4);
					playButton.graphics.drawRect( playButtonWidth * 0.1, -playButtonWidth * 0.2, playButtonWidth * 0.1, playButtonWidth * 0.4);
				} else {
					var circleRadius: Number = playButtonWidth * 0.25;
					playButton.graphics.moveTo(-playButtonWidth * 0.02 + circleRadius * Math.cos(Math.PI * 0.000), circleRadius * Math.sin(Math.PI * 0.000));
					playButton.graphics.lineTo(-playButtonWidth * 0.02 + circleRadius * Math.cos(Math.PI * 0.666), circleRadius * Math.sin(Math.PI * 0.666));
					playButton.graphics.lineTo(-playButtonWidth * 0.02 + circleRadius * Math.cos(Math.PI * 1.333), circleRadius * Math.sin(Math.PI * 1.333));
					playButton.graphics.lineTo(-playButtonWidth * 0.02 + circleRadius * Math.cos(Math.PI * 0.000), circleRadius * Math.sin(Math.PI * 0.000));
				}
				playButton.graphics.endFill();
				
				pauseButtonDisplayed = synth.playing;
			}
			
			
			loopIcon.graphics.beginFill(0x000000);
			loopIcon.graphics.drawRect(0, 0, 12, 12);
			loopIcon.graphics.endFill();
			loopIcon.graphics.beginFill(!synth.enableOutro ? 0x8866ff : 0x444444);
			loopIcon.graphics.moveTo(4, 2);
			loopIcon.graphics.lineTo(4, 0);
			loopIcon.graphics.lineTo(7, 3);
			loopIcon.graphics.lineTo(4, 6);
			loopIcon.graphics.lineTo(4, 4);
			loopIcon.graphics.curveTo(2, 4, 2, 6);
			loopIcon.graphics.curveTo(2, 8, 4, 8);
			loopIcon.graphics.lineTo(4, 10);
			loopIcon.graphics.curveTo(0, 10, 0, 6);
			loopIcon.graphics.curveTo(0, 2, 4, 2);
			loopIcon.graphics.moveTo(12 - 4, 12 - 2);
			loopIcon.graphics.lineTo(12 - 4, 12 - 0);
			loopIcon.graphics.lineTo(12 - 7, 12 - 3);
			loopIcon.graphics.lineTo(12 - 4, 12 - 6);
			loopIcon.graphics.lineTo(12 - 4, 12 - 4);
			loopIcon.graphics.curveTo(12 - 2, 12 - 4, 12 - 2, 12 - 6);
			loopIcon.graphics.curveTo(12 - 2, 12 - 8, 12 - 4, 12 - 8);
			loopIcon.graphics.lineTo(12 - 4, 12 - 10);
			loopIcon.graphics.curveTo(12 - 0, 12 - 10, 12 - 0, 12 - 6);
			loopIcon.graphics.curveTo(12 - 0, 12 - 2, 12 - 4, 12 - 2);
			loopIcon.graphics.endFill();
			
			
			volumeSlider.graphics.beginFill(0x000000);
			volumeSlider.graphics.drawRect(0, 0, volumeSliderWidth, 12);
			volumeSlider.graphics.endFill();
			volumeSlider.graphics.beginFill(0x444444);
			volumeSlider.graphics.drawRect(0, 4, volumeSliderWidth, 4);
			volumeSlider.graphics.endFill();
			volumeSlider.graphics.beginFill(0xffffff);
			volumeSlider.graphics.drawRect(volume * 0.01 * volumeSliderWidth - 1, 0, 2, 12);
			volumeSlider.graphics.endFill();
			
			renderPlayhead();
		}
	}
}
