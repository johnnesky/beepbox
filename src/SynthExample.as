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
