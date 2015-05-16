package beepbox.avatar {
    import flash.display.*;
    import flash.events.*;
    public class Avatar extends Sprite {
		private var data: BitmapData = new BitmapData(16, 16, false, 0x000000);
		private var bitmap: Bitmap = new Bitmap(data);
		
        public function Avatar() {
            addChild(bitmap);
        	generate();
        }
        
        private function makeColor(hue: Number, scale: Number, offset: Number, flip: Boolean): int {
            hue -= int(hue/3.0) * 3.0;
            var redRatio: Number = hue < 1.0 ? (1.0 - hue) : (hue > 2.0 ? hue - 2.0 : 0.0);
            var greenRatio: Number = hue > 0.0 && hue < 2.0 ? 1.0 - Math.abs(hue - 1.0) : 0.0;
            var blueRatio: Number = hue > 1.0 && hue < 3.0 ? 1.0 - Math.abs(hue - 2.0) : 0.0;
            redRatio *= 0.8;
            greenRatio *= 0.6;
            if (flip) {
                redRatio = 1.0 - redRatio;
                greenRatio = 1.0 - greenRatio;
                blueRatio = 1.0 - blueRatio;
            }
            redRatio = redRatio * scale + offset;
            greenRatio = greenRatio * scale + offset;
            blueRatio = blueRatio * scale + offset;
            return (redRatio * 255 << 16) + (greenRatio * 255 << 8) + (blueRatio * 255 << 0);
        }
        
        private function generate(): void {
            var i: int;
            var j: int;
            
            var hueAxis1: Number = 3.0 * Math.random();
            var hueAxis2: Number = 3.0 * Math.random();
            
            var dark: int = makeColor(hueAxis1, 0.7, 0.1, false);
            var light: int = makeColor(hueAxis2, 0.7, 0.2, true);
            
            var background: Boolean = Math.random() > 0.5;
            var pattern: Array = [];
            pattern.length = 9 * 9;
            for (i = 0; i < 9; i++) {
                pattern[i] = background;
            }
            for (j = 1; j < 8; j++) {
                pattern[j * 9] = background;
                for (i = 1; i < 5; i++) {
                    pattern[j * 9 + i] = pattern[j * 9 + 8 - i] = Math.random() > 0.5;
                }
                pattern[j * 9 + 8] = background;
            }
            for (i = 0; i < 9; i++) {
                pattern[8 * 9 + i] = background;
            }
            
            var noise: Array = [];
            for (j = 0; j < 8; j++) {
                noise[j * 8] = background;
                for (i = 0; i < 8; i++) {
                    noise[j * 8 + i] = Math.random() > 0.5;
                }
            }
            
            data.lock();
            for (j = 0; j < 16; j++) {
                for (i = 0; i < 16; i++) {
                    var patternOn: Boolean = pattern[((j+1)>>1) * 9 + ((i+1)>>1)];
                    var noiseOn: Boolean = noise[(j>>1) * 8 + (i>>1)];
                    var color: int = patternOn ? (noiseOn ? 0xffffff : light) : (noiseOn ? dark : 0x000000);
                    data.setPixel(i, j, color);
                }
            }
            data.unlock();
        }
    }
}