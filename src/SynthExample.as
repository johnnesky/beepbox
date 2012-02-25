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
			{title: "Carnival Song", data: "2s0k3l0egt1a2r1w01w13w20b0g0ar_12AKb1g0911ijijb2g0099iirrb3g00000000p083ejby7j7jN6jNj0GIXeKPY.HbMi1Op6KBceqtWTuFGTbaqJKPkUaGKTv10wjf2Nw5gawlMbwnxE3g2EdgqMkRkRQTTOdlc5nnvjjrvjntrlnpvjltjjjljjjpr2OdcDnjplnpi2w5BB8arqglRQwE1i2Q5dds5i2S2F1c5lddtJRYzjjjwmq221i2A5Eawl2G1hs2yCU50aaqGqwp181Ij3wl0G1k0J190E5g2w462A4c2Md8qgk1wwR0F1g2w5Ma0k0wgkwIIFFIHFFHHFFKGFFGIIJFGHIFGFGJLLFK9k4G1k1wWgkwFFxEgUpMPxD3p280OjjUwo6Jc.GGWGWWGCqvsRvntoyo_1F3s6Ad5BdtdlBFMPxD3e6p380fe6scUpMPxD3e6sc"},
			{title: "Ashley's First Toast", data: "2s0k7l0egt1a2r1w01w11w21b0gigj2saoEb1gh8919989b2gr0011agbb3g00000000p082_j38WWo45dkA2CGCGQ5dgaXbGglSmwFGJFG1prjjjpjpjnjnl0QSkSkQQRQSlQSkRkQS0E1g2M50a0l0E1g2I50a0m0E1g1cvsQ50a0mwE1g2M50a0kwE1g2Q50a0pKjnjllljljjrjlnjljjntjlnjln9kRlQRnwE1g2Y50a0n0E1g2Q50a0m0E1g3ee6scp181dj3CiFFwWGqqF6CCGGCCKGCCGKCCGKCCKGCCGCA5I3i2GKA5lt8aGWgllQwGHF1lni0UpMPxD3e6scp281dj7S1FGFGFFFGFGFFFGj311g2w6i3b1g2z91B0E1g391B0E1g0dlmif8FOhV5eif8FOgD3e6scUpMMp380fe6scUpMPxD3e6sc"},
			{title: "Blockage Song", data: "2s6k7l0egt1a2r1w01w10w23b0gU09asF87b1g00000000b2g_019f906b3g_U09ah96p082Uj3A4y2Kg1maKA58agkwHH1maKA58aqqqGWgl2HF1i2CCCGKA5gGWgkwFFFGHF1l3OltJwagkQQRmQwGJJAHH0kwFFFJKF1lr0RSS0F1jjjlri2G.WKSM58aqqqHqglmnmmS0F1jjjrni2GWW.WM58aqqrrGglnTlSS0F1jjjlri2G.K.SM583xD3p180Kj37GF1n0QwGHF1lni2GKA5lt8aGWgllQwe6scUpMPxD3e6p281mj3C1F1n80G9QlwGHF1mjEHF1nm2Ekzjj80GJF1rq2ElJddE3xD3e6se.110M58aXE4430kwHCe110M5aqfoPxwp381e6C1sw2YLlk2EDtm6yI5oE1cjIA5JEqbgmyIPsA5BJ8abqrsM6hCV8aXqgkmQSVwczdOg73e6scUpMM"},
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
