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
	
	[SWF(width='200', height='50', backgroundColor='#000000', frameRate='15')]
	public class MainEmbedded extends Sprite 
	{
		public static const WIDTH: int = 200;
		public static const HEIGHT: int = 50;
		
		private var prevHash: String = null;
		
		private var wokeUp: Boolean = false;
		
		private var synth: Synth = new Synth("3sbk4l0egt3a7g0fj7i0r1w1100f0000d1110c0000h0000v2200o3320b1hjzHzK-1hjzHzK-1hjzHzK-1hjzHzK-p24ZFzzQ1E39kxIceEtoV8s66138l1S0L1u2139l1H39McyaeOgKA0TxAU213jj0NM4x8i0o0c86ywz7keUtVxQk1E3hi6OEcB8Atl0q0Qmm6eCexg6wd50oczkhO8VcsEeAc26gG3E1q2U406hG3i6jw94ksf8i5Uo0dZY26kHHzxp2gAgM0o4d516ej7uegceGwd0q84czm6yj8Xa0Q1EIIctcvq0Q1EE3ihE8W1OgV8s46Icxk7o24110w0OdgqMOk392OEWhS1ANQQ4toUctBpzRxx1M0WNSk1I3ANMEXwS3I79xSzJ7q6QtEXgw0");
		//private var text: TextField;
		
		public function MainEmbedded() 
		{
			stage.addEventListener(Event.ENTER_FRAME, onEnterFrame);
			stage.addEventListener(MouseEvent.CLICK, onClick);
			
			/*
			var format: TextFormat = new TextFormat();
			format.align = TextFormatAlign.CENTER;
			format.bold = true;
			format.font = "Arial";
			format.size = 15;
			text = new TextField();
			text.width = WIDTH;
			text.x = 0;
			text.height = 22;
			text.y = 13;
			text.wordWrap = true;
			text.type = TextFieldType.DYNAMIC;
			text.selectable = false;
			text.mouseEnabled = false;
			text.defaultTextFormat = format;
			text.textColor = 0xffffff;
			addChild(text);
			*/
			//synth = new Synth(songs[songIndex].data);
			//text.text = songs[songIndex].title;
			
			ExternalInterface.addCallback("hashUpdatedExternally", hashUpdatedExternally);
		}
		
		private function hashUpdatedExternally(myhash: String): void {
			if (prevHash != myhash) {
				prevHash = myhash;
				//fragment.text = myhash;
				if (myhash != "") {
					synth.setSong(myhash);
				}
				
				if (!wokeUp) {
					wokeUp = true;
				}
			}
		}
		
		private function onEnterFrame(event: Event): void {
			graphics.clear();
			if (synth.song != null) {
				graphics.beginFill(0x777777);
				graphics.drawRect(0, 0, WIDTH * synth.playhead / synth.totalBars, HEIGHT);
				graphics.endFill();
				graphics.lineStyle(2, 0x777777);
				graphics.drawRect(0, 0, WIDTH, HEIGHT);
				graphics.lineStyle();
			}
		}
		
		private function onClick(event: MouseEvent): void {
			if (synth.song != null) {
				if (synth.playing) {
					synth.pause();
				} else {
					synth.play();
				}
			}
		}
	}
}
