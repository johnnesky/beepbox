package {
	import flash.display.*;
	import flash.events.*;
	import flash.filters.*;
	import flash.geom.*;
	import flash.media.*;
	import flash.text.*;
	import flash.utils.*;
	import flash.ui.*;
	
	public class Game extends Sprite {
		[Embed(source="art/heart1.png")]
		private static var heart1: Class;
		[Embed(source="art/heart2.png")]
		private static var heart2: Class;
		[Embed(source="art/heart3.png")]
		private static var heart3: Class;
		[Embed(source="art/heart4.png")]
		private static var heart4: Class;
		private static var heartClasses: Array = [heart1, heart3, heart2, heart4];
		
		[Embed(source="art/0.png")]
		private static var timer0: Class;
		[Embed(source="art/1.png")]
		private static var timer1: Class;
		[Embed(source="art/2.png")]
		private static var timer2: Class;
		[Embed(source="art/3.png")]
		private static var timer3: Class;
		[Embed(source="art/4.png")]
		private static var timer4: Class;
		[Embed(source="art/5.png")]
		private static var timer5: Class;
		[Embed(source="art/6.png")]
		private static var timer6: Class;
		[Embed(source="art/7.png")]
		private static var timer7: Class;
		[Embed(source="art/8.png")]
		private static var timer8: Class;
		[Embed(source="art/9.png")]
		private static var timer9: Class;
		private static var timerClasses: Array = [timer0, timer1, timer2, timer3, timer4, timer5, timer6, timer7, timer8, timer9];
		
		[Embed(source="art/timer.png")]
		private static var timerClass: Class;
		
		[Embed(source="art/web_left.png")]
		private static var web_left: Class;
		[Embed(source="art/web_right.png")]
		private static var web_right: Class;
		
		private static const timePerStep: Number = 1/60;
		private static const maxTimePerFrame: Number = timePerStep * 3.99;
		private var accumulator: Number;
		private var prevTicks: int;
		private var curTicks: int;
		private var onGameOver: Function;
		private var onGameFinished: Function;
		
		private var playerLayer: Sprite;
		private var player: Player;
		private var enemy: Enemy;
		private var ended: Boolean = false;
		private var endTimer: Number = 5;
		private var survived: Boolean = false;
		private var gameTime: Number = 0;
		private var maxGameTime: Number;
		private var hudLayer: Sprite;
		private var timerLayer: Sprite;
		private var timerString: String = "";
		private var prizeClass: Class;
		private var prize: Prize;
		private var prizeTimer: Number;
		private var prizeTimerMax: Number;
		
		private var webLeft: Bitmap;
		private var webRight: Bitmap;
		
		private var background: DisplayObject;
		
		public function Game(stage: Stage, onGameOver: Function, onGameFinished: Function, klasses: Array) {
			this.onGameOver = onGameOver;
			this.onGameFinished = onGameFinished;
			this.maxGameTime = klasses[4];
			
			background = new klasses[2];
			addChild(background);
			
			if (klasses[0] == Spider) {
				webLeft = new web_left();
				addChild(webLeft);
				webRight = new web_right();
				webRight.x = Main.WIDTH - webRight.width;
				addChild(webRight);
			}
			
			playerLayer = new Sprite();
			addChild(playerLayer);
			player = new klasses[0](Main.WIDTH * 3 / 4 + 25, Main.HEIGHT / 2);
			enemy = new klasses[1](Main.WIDTH / 4 + 25, Main.HEIGHT / 2);
			playerLayer.addChild(player);
			playerLayer.addChild(enemy);
			hudLayer = new Sprite();
			addChild(hudLayer);
			timerLayer = new Sprite();
			timerLayer.scaleX = timerLayer.scaleY = 0.5;
			timerLayer.x = Main.WIDTH - 137 * timerLayer.scaleX;
			var timerSprite: Bitmap = new timerClass();
			timerLayer.addChild(timerSprite);
			
			redrawHud();
			
			accumulator = 0;
			prevTicks = getTimer();
			
			prizeClass = klasses[3];
			prizeTimerMax = maxGameTime / 2;
			prizeTimer = prizeTimerMax;
		}
		
		public function onMousePressed(): void {}
		public function onMouseReleased(): void {}
		
		public function onKeyPressed(keyCode: int): void {
			switch (keyCode) {
				case Keyboard.UP:
				case 87: // W
				case 90: // Z
					player.onInputPressed(Player.MOVE_UP);
					break;
				case Keyboard.DOWN:
				case 83: // S
					player.onInputPressed(Player.MOVE_DOWN);
					break;
				case Keyboard.LEFT:
				case 65: // A
				case 81: // Q
					player.onInputPressed(Player.MOVE_LEFT);
					break;
				case Keyboard.RIGHT:
				case 68: // D
					player.onInputPressed(Player.MOVE_RIGHT);
					break;
				case Keyboard.SPACE:
					player.onInputPressed(Player.ACTION);
					break;
				case 49:
					ended = true;
					break;
				case 50:
					gameTime += 5.0;
					break;
				case 51:
					gameTime = maxGameTime;
					break;
			}
		}
		
		public function onKeyReleased(keyCode: int): void {
			switch (keyCode) {
				case Keyboard.UP:
				case 87: // W
				case 90: // Z
					player.onInputReleased(Player.MOVE_UP);
					break;
				case Keyboard.DOWN:
				case 83: // S
					player.onInputReleased(Player.MOVE_DOWN);
					break;
				case Keyboard.LEFT:
				case 65: // A
				case 81: // Q
					player.onInputReleased(Player.MOVE_LEFT);
					break;
				case Keyboard.RIGHT:
				case 68: // D
					player.onInputReleased(Player.MOVE_RIGHT);
					break;
				case Keyboard.SPACE:
					player.onInputReleased(Player.ACTION);
					break;
			}
		}
		
		public function onEnterFrame(): void {
			curTicks = getTimer();
			var deltaTicks: int = curTicks - prevTicks;
			prevTicks = curTicks;
			accumulator += deltaTicks * .001; // convert from milliseconds to seconds
			accumulator = Math.min(maxTimePerFrame, accumulator);
			
			while (accumulator >= timePerStep) {
				if (visible) {
					step(timePerStep);
				}
				accumulator -= timePerStep;
			}
			
			//render();
		}
		
		private function lerp(a: Number, b: Number, c: Number): Number {
			a = Math.max(0, Math.min(1, a));
			return b * (1-a) + c * a;
		}
		
		private function step(dt: Number): void {
			if (endTimer <= 0) {
				// do nothing!
			} else if (ended) {
				endTimer -= dt;
				if (endTimer <= 0) {
					if (survived) onGameFinished(); else onGameOver();
				} else {
					background.alpha -= 1 * dt;
					
					if (survived) {
						var timeScaled: Number = Math.max(0, endTimer - 2);
						player.scaleX = player.scaleY = Math.min(3, player.scaleY * 1.01);
						player.x = lerp((3-timeScaled) * dt, player.x, 500 - timeScaled * timeScaled * 60);
						player.y = lerp((3-timeScaled) * dt, player.y, 200 + timeScaled * timeScaled * 60);
						enemy.scaleX *= 0.99;  enemy.scaleY *= 0.99;
						enemy.x = lerp(0.5 * dt, enemy.x, 140);
						enemy.y = lerp(0.5 * dt, enemy.y, 240);
						graphics.clear();
						graphics.beginFill(0xffffff);
						graphics.drawRect(0, 0, Main.WIDTH, Main.HEIGHT);
						graphics.endFill();
					} else {
						graphics.clear();
						graphics.beginFill(0x000000);
						graphics.drawRect(0, 0, Main.WIDTH, Main.HEIGHT);
						graphics.endFill();
						enemy.alpha -= 0.5 * dt;
					}
				}
			} else {
				player.step(dt);
				
				if (player is Spider) {
					var spider: Spider = player as Spider;
					if (spider.mode == Spider.FALLING) {
						if (spider.x < Main.WIDTH / 2) {
							if (webLeft != null) {
								removeChild(webLeft);
								webLeft = null;
							}
						} else {
							if (webRight != null) {
								removeChild(webRight);
								webRight = null;
							}
						}
					}
				}
				
				var newTimerString: String = String(Math.max(Math.ceil(maxGameTime - gameTime), 0));
				if (timerString != newTimerString) {
					timerString = newTimerString;
					
					//trace(timerString);
					//Main.showDebug(timerString + "\n");
					
					while (timerLayer.numChildren > 1) timerLayer.removeChildAt(1);
					
					for (var i: int = 0; i < timerString.length; i++) {
					  var digit: String = timerString.charAt(i);
					  var klass: Class = Game["timer" + digit];
					  var bitmap: Bitmap = new klass();
					  bitmap.x = 137/2 - 10 - timerString.length * 20 + i * 40;
					  bitmap.y = 122/2 - bitmap.height/2;
					  timerLayer.addChild(bitmap);
					}
				}
				
				if (prizeClass != null) {
					if (prize == null) {
						prizeTimer -= dt;
						if (prizeTimer <= 0) {
							prize = new prizeClass();
							addChild(prize);
						}
					} else {
						var dx: Number = prize.x - player.x;
						var dy: Number = prize.y - player.y;
						var distance: Number = Math.sqrt(dx * dx + dy * dy);
						if (distance < player.radius + prize.radius) {
							removeChild(prize);
							prize = null;
							prizeTimer = prizeTimerMax;
							Main.lives++;
							redrawHud();
						}
					}
				}
				
				ended = enemy.step(dt, player);
				if (!ended && gameTime > maxGameTime) {
					ended = true;
					survived = true;
					playerLayer.addChildAt(enemy, 0);
					enemy.frustrate();
				}
				if (ended) {
					player.stopAnim();
					removeChild(hudLayer);
				}
			}
			gameTime += dt;
		}
		
		private function redrawHud(): void {
			while (hudLayer.numChildren < 0) hudLayer.removeChildAt(0);
			hudLayer.addChild(timerLayer);
			for (var i: int = 0; i < Main.lives; i++) {
				var heart: Bitmap = new heartClasses[i%4]();
				heart.y = 10;
				heart.x = 10 + 60 * i;
				heart.width = 50;
				heart.scaleY = heart.scaleX;
				heart.smoothing = true;
				hudLayer.addChild(heart);
			}
		}
	}
}
