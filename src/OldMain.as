package {
	import flash.display.*;
	import flash.events.*;
	import flash.geom.*;
	import flash.media.*;
	import flash.text.*;
	import flash.utils.*;
	import flash.ui.*;
	
	[SWF(width='640', height='480', backgroundColor='#808080', frameRate='60')]
	public class OldMain extends Sprite {
		
		public static const WIDTH: Number = 640;
		public static const HEIGHT: Number = 480;
		
		private var game: Game;
		
		private static var text: TextField;
		public static var debugText: Array = [];
		
		private var keys: Dictionary = new Dictionary();
		
		private static const startLives: int = 4;
		public static var lives: int = startLives;
		
		[Embed(source="art/Shelf.png")]
		private static var shelf: Class;
		[Embed(source="art/redTable.png")]
		private static var redTable: Class;
		[Embed(source="art/blueTable.png")]
		private static var blueTable: Class;
		[Embed(source="art/Grassyfield.png")]
		private static var grassyField: Class;
		[Embed(source="art/Leafbackground.png")]
		private static var leafbackground: Class;
		[Embed(source="art/Flowerssss.png")]
		private static var flowers: Class;
		
		private var levels: Array = [
			[Lady,      Net,      leafbackground, null,    20],
			[Ant,       Spatula,  blueTable,      null,    20],
			[Fly,       Spatula,  redTable,       null,    20],
			[Spider,    Spatula2, shelf,          DeadFly, 20],
			[Bee,       Net,      flowers,        null,    20],
			[Hopper,    Net,      grassyField,    null,    20],
			[Butterfly, Net,      leafbackground, null,    20],
		];
		
		private var level: int = 0;
		
		public function OldMain() {
			init();
		}
		
		public function init(): void {
			var format: TextFormat = new TextFormat();
			format.align = TextFormatAlign.LEFT;
			format.bold = true;
			format.font = "Arial";
			format.size = 12;
			text = new TextField();
			text.width = Main.WIDTH;
			text.x = 0
			text.height = Main.HEIGHT;
			text.y = 0;
			text.wordWrap = true;
			text.type = TextFieldType.DYNAMIC;
			text.textColor = 0x000000;
			text.selectable = false;
			text.mouseEnabled = false;
			text.defaultTextFormat = format;
			text.text = "";
			
			stage.scaleMode = StageScaleMode.NO_SCALE;
			stage.align = StageAlign.TOP; // top-centered
			stage.focus = stage;
			
			/// TODO: Automatically pause the game when the user's focus shifts 
			/// away from Flash.
			//stage.addEventListener(Event.DEACTIVATE, onDeactivate);
			//stage.addEventListener(Event.ACTIVATE, onActivate);
			
			Music.play(Music.beat);
			
			startNewGame();
			stage.addEventListener(Event.ENTER_FRAME, onEnterFrame);
			stage.addEventListener(MouseEvent.MOUSE_DOWN, onMousePressed);
			stage.addEventListener(MouseEvent.MOUSE_UP, onMouseReleased);
			stage.addEventListener(KeyboardEvent.KEY_DOWN, onKeyPressed);
			stage.addEventListener(KeyboardEvent.KEY_UP, onKeyReleased);
			
			graphics.lineStyle(1);
			graphics.drawRect(0, 0, WIDTH, HEIGHT);
		}
		
		private function onEnterFrame(event: Event): void {
			if (game != null) game.onEnterFrame();
		}
		
		private function onMousePressed(event: MouseEvent): void {
			if (game != null) game.onMousePressed();
		}
		
		private function onMouseReleased(event: MouseEvent): void {
			if (game != null) game.onMouseReleased();
		}
		
		private function onKeyPressed(event: KeyboardEvent): void {
			if (event.keyCode == 80) {
				onLifeLost();
				return;
			}
			if (keys[event.keyCode] == true) return;
			if (game != null) game.onKeyPressed(event.keyCode);
			keys[event.keyCode] = true;
			
			//trace(event.keyCode, String.fromCharCode(event.charCode));
		}
		
		private function onKeyReleased(event: KeyboardEvent): void {
			if (keys[event.keyCode] == undefined) return;
			if (game != null) game.onKeyReleased(event.keyCode);
			delete keys[event.keyCode];
		}
		
		private function onLifeLost(): void {
			//showDebug("onLifeLost " + level + " " + new Error().getStackTrace());
			removeChild(game);
			game = null;
			lives--;
			if (lives == 0) {
				startNewGame();
			} else {
				startLevel();
			}
		}
		
		private function onLevelPassed(): void {
			//showDebug("onLevelPassed " + level + " " + new Error().getStackTrace());
			removeChild(game);
			game = null;
			level++;
			if (level >= levels.length) {
				startNewGame();
			} else {
				showVSScreen();
			}
		}
		
		private function showVSScreen(): void {
			addChild(new VSScreen(startLevel, levels[level][0], levels[level][1]));
		}
		
		private function startLevel(): void {
			//showDebug("startLevel " + level);
			game = new Game(stage, onLifeLost, onLevelPassed, levels[level]);
			addChild(game);
			addChild(text);
			keys = new Dictionary();
		}
		
		private function startNewGame(): void {
			lives = startLives;
			level = 0;
			addChild(new TitleScreen(showVSScreen));
		}
		
		public static function showDebug(debug: String): void {
			debugText = debugText.concat(debug.split("\n"));
			while(debugText.length > 30) debugText.shift();
			text.text = debugText.join("\n");
		}
	}
}
