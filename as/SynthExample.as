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
	import flash.display.*;
	import flash.events.*;
	import flash.geom.*;
	import flash.text.*;
	import flash.ui.*;
	
	import beepbox.synth.*;
	
	[SWF(width='200', height='50', backgroundColor='#000000', frameRate='30')]
	public class SynthExample extends Sprite 
	{
		public static const WIDTH: int = 200;
		public static const HEIGHT: int = 50;
		
		private var songs: Array = [
			{title: "John Nesky - Carnival", data: "2s0k3l0egt1a2r1w01w13w20b0g0ar_12AKb1g0911ijijb2g0099iirrb3g00000000p083ejby7j7jN6jNj0GIXeKPY.HbMi1Op6KBceqtWTuFGTbaqJKPkUaGKTv10wjf2Nw5gawlMbwnxE3g2EdgqMkRkRQTTOdlc5nnvjjrvjntrlnpvjltjjjljjjpr2OdcDnjplnpi2w5BB8arqglRQwE1i2Q5dds5i2S2F1c5lddtJRYzjjjwmq221i2A5Eawl2G1hs2yCU50aaqGqwp181Ij3wl0G1k0J190E5g2w462A4c2Md8qgk1wwR0F1g2w5Ma0k0wgkwIIFFIHFFHHFFKGFFGIIJFGHIFGFGJLLFK9k4G1k1wWgkwFFxEgUpMPxD3p280OjjUwo6Jc.GGWGWWGCqvsRvntoyo_1F3s6Ad5BdtdlBFMPxD3e6p380fe6scUpMPxD3e6sc"},
			{title: "John Nesky - Toast",    data: "2s5k4l0egt1a2r1w04w11w22b0g__09irAKb1g11111111b2g00000000b3g09iiiii9p082yj3w4y2CAd8884301K18wF1i2A58bWMQwG1m2A462E5gaMn0K1s2CGm110whkRkQQQQQQRSSTlkRmmQQTlnlkSmTllQQRTQQQSkQSmkRlSgddlddddtBJdRkH1lnTSwxwkwF1o2M5Ax8kT0I1i2M5wb0kSOI4scUpMMp180Ij7wd0q0Q1wwM8o0dwpgd0p8d0qgT1K3g4UpMPxD3e6scp280vjfRcuGIHaGOIGHaOGzxD3e6scUpMPxwp380.e6d43Nk2EA2d8G1kTxpy8w9080i4T91AV88603KW7tTgpei2S0KA3xD3e6scUo"},
			{title: "John Nesky - 5 AM",     data: "2s6kal0egt1a2r1w02w18w21f03f11f22c00c10c20h01h12h20v00v10v23b0g0hhhrB0Tb1g00099j00b2g0000009ib3g009999iip0820e6Ce7gCDRwJ2p.oBhBQXCEOJtCjCQTSFxU2I76p8awpes2M69QRpE8c4y2A482h1b0L1u2E5obgsvA0L1k2A4y2I58aMg0bgl0xgoBD0E0CLND0E1Ap8a0p68wAgs9sip181a6Cu7lieyhF6Cfk3jjCzPbarsQqou0E1g2w683Pwk0E1g3b7BwE1g2w6mf10k0E1g30jxD3e6scp281Dj3yyyxc.cyyyz8Oaaacz0qaacz0qWqqqqqo6iFFFFFFGwGqqqqqrU6CSKCOC.yyyyyyyiEEEEEEEAqaaaaaa96iFFFFFFe6scUpMPxwp380Ve654i2c1iex4M4ag2l2hA8wq6ySCw5wbgkwAaC9CPAk2J3i8UpMPxD3e6"},
		];
		private var songIndex: int = 0;
		private var synth: Synth = new Synth();
		private var text: TextField;
		
		public function SynthExample() 
		{
			stage.addEventListener(Event.ENTER_FRAME, onEnterFrame);
			stage.addEventListener(MouseEvent.CLICK, onClick);
			
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
			
			synth = new Synth(songs[songIndex].data);
			synth.play();
			text.text = songs[songIndex].title;
		}
		
		private function onEnterFrame(event: Event): void {
			graphics.clear();
			graphics.beginFill(0x777777);
			graphics.drawRect(0, 0, WIDTH * synth.playhead / synth.totalBars, HEIGHT);
			graphics.endFill();
			graphics.lineStyle(2, 0x777777);
			graphics.drawRect(0, 0, WIDTH, HEIGHT);
			graphics.lineStyle();
		}
		
		private function onClick(event: MouseEvent): void {
			cycleSongs();
		}
		
		private function cycleSongs(): void {
			songIndex = (songIndex + 1) % songs.length;
			synth.setSong(songs[songIndex].data);
			synth.snapToStart();
			text.text = songs[songIndex].title;
		}
	}
}
