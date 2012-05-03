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
	import flash.net.*;
	
	import beepbox.synth.*;
	import beepbox.avatar.*;
	
	[SWF(width='100', height='100', backgroundColor='#000000', frameRate='15')]
	public class MainEmbedded extends Sprite 
	{
		private var prevHash: String = null;
		
		private var synth: Synth = new Synth();
		private var avatar: Avatar;
		private var byline: TextField;
		private var beepboxLine: TextField;
		
		public function MainEmbedded() 
		{
			stage.scaleMode = StageScaleMode.NO_SCALE;
			stage.align = StageAlign.TOP_LEFT;
			stage.addEventListener(Event.RESIZE, onStageResize);
			stage.addEventListener(Event.ENTER_FRAME, onEnterFrame);
			stage.addEventListener(MouseEvent.MOUSE_MOVE, onMouseMove);
			stage.addEventListener(MouseEvent.CLICK, onClick);
			
			var format: TextFormat = new TextFormat();
			format.align = TextFormatAlign.RIGHT;
			//format.bold = true;
			format.font = "Helvetica";
			format.size = 10;
			byline = new TextField();
			byline.y = 2;
			byline.height = 14;
			byline.wordWrap = true;
			byline.type = TextFieldType.DYNAMIC;
			byline.selectable = false;
			//byline.mouseEnabled = false;
			byline.defaultTextFormat = format;
			byline.textColor = 0x777777;
			addChild(byline);
			
			beepboxLine = new TextField();
			beepboxLine.height = 14;
			beepboxLine.wordWrap = true;
			beepboxLine.type = TextFieldType.DYNAMIC;
			beepboxLine.selectable = false;
			//beepboxLine.mouseEnabled = false;
			beepboxLine.defaultTextFormat = format;
			beepboxLine.textColor = 0x777777;
			addChild(beepboxLine);
			
			avatar = new Avatar();
			addChild(avatar);
			
			//synth = new Synth(songs[songIndex].data);
			//text.text = songs[songIndex].title;
			
			ExternalInterface.addCallback("hashUpdatedExternally", hashUpdatedExternally);
		}
		
		private function hashUpdatedExternally(myhash: String): void {
			if (prevHash != myhash && myhash != "") {
				prevHash = myhash;
				synth.setSong(myhash);
				synth.snapToStart();
				
				var title: String = "Untitled Untitled Untitled";
				var name: String = "Anonymous Anonymous";
				var time: String = "10:00 12/12/2012"
				
				byline.htmlText = title + " shared by " + name;
				beepboxLine.htmlText = "with <u><font color=\"#7744ff\"><a target=\"_parent\" href=\"http://www.beepbox.co/" + myhash + "\">Beep Box</a></font></u> at " + time;
				
				render();
			}
		}
		
		private function onStageResize(event: Event): void {
			render();
		}
		
		private function onEnterFrame(event: Event): void {
			if (synth.playing) render();
		}
		
		private function onMouseMove(event: MouseEvent): void {
			render();
		}
		
		private function onClick(event: MouseEvent): void {
			if (synth.song != null) {
				if (synth.playing) {
					synth.pause();
				} else {
					synth.play();
				}
			}
			render();
		}
		
		private function render(): void {
			graphics.clear();
			if (synth.song != null) {
				var barHeight: Number = stage.stageHeight;
				
				avatar.x = stage.stageWidth - avatar.width;
				byline.x = barHeight;
				byline.width = stage.stageWidth - barHeight - avatar.width;
				beepboxLine.x = barHeight;
				beepboxLine.y = barHeight - 14;
				beepboxLine.width = stage.stageWidth - barHeight;
				
				var lineRadius: Number = barHeight * 0.075;
				
				var overPlay: Boolean = mouseX < barHeight;
				
				if (overPlay) {
					graphics.beginFill(0xffffff);
					graphics.drawCircle(barHeight * 0.5, barHeight * 0.5, barHeight * 0.5);
					graphics.endFill();
				} else {
					graphics.lineStyle(lineRadius * 2, 0x7744ff);
					graphics.drawCircle(barHeight * 0.5, barHeight * 0.5, barHeight * 0.5 - lineRadius);
					graphics.lineStyle();
				}
				if (synth.playing) {
					graphics.lineStyle(lineRadius * 2, overPlay ? 0x000000 : 0xffffff, 1.0, false, LineScaleMode.NONE, CapsStyle.SQUARE);
					graphics.moveTo(barHeight * 0.35, barHeight * 0.35);
					graphics.lineTo(barHeight * 0.35, barHeight * 0.65);
					graphics.moveTo(barHeight * 0.65, barHeight * 0.35);
					graphics.lineTo(barHeight * 0.65, barHeight * 0.65);
					graphics.lineStyle();
				} else {
					graphics.beginFill(overPlay ? 0x000000 : 0xffffff);
					var circleRadius: Number = barHeight * 0.5 - lineRadius;
					graphics.moveTo(lineRadius + circleRadius * (1.0 + Math.cos(Math.PI * 0.000)), lineRadius + circleRadius * (1.0 + Math.sin(Math.PI * 0.000)));
					graphics.lineTo(lineRadius + circleRadius * (1.0 + Math.cos(Math.PI * 0.666)), lineRadius + circleRadius * (1.0 + Math.sin(Math.PI * 0.666)));
					graphics.lineTo(lineRadius + circleRadius * (1.0 + Math.cos(Math.PI * 1.333)), lineRadius + circleRadius * (1.0 + Math.sin(Math.PI * 1.333)));
					graphics.lineTo(lineRadius + circleRadius * (1.0 + Math.cos(Math.PI * 0.000)), lineRadius + circleRadius * (1.0 + Math.sin(Math.PI * 0.000)));
					graphics.endFill();
				}
				
				var timelineLeft: Number = barHeight + lineRadius;
				var timelineWidth: Number = stage.stageWidth - barHeight - lineRadius * 2;
				var playhead: Number = timelineLeft + timelineWidth * synth.playhead / synth.totalBars;
				
				if (timelineWidth > 0) {
					graphics.lineStyle(lineRadius * 2, 0x777777, 1.0, false, LineScaleMode.NONE, CapsStyle.SQUARE);
					graphics.moveTo(timelineLeft, barHeight * 0.5);
					graphics.lineTo(timelineLeft + timelineWidth, barHeight * 0.5);
					graphics.lineStyle();
					graphics.lineStyle(lineRadius * 2, 0xffffff, 1.0, false, LineScaleMode.NONE, CapsStyle.ROUND);
					graphics.moveTo(playhead, barHeight * 0.333);
					graphics.lineTo(playhead, barHeight * 0.666);
					graphics.lineStyle();
				}
			}
		}
	}
}
