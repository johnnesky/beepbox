package {
	public class ChangeStroke extends Change {
		public function ChangeStroke() {
			super(false);
		}
		
		public function updateStroke(x: Number, y: Number): void {
			throw new Error("ChangeStroke.updateStroke(): Override me.");
		}
		
		public function finalize(): void {
			// some stroke changes may not need any final processing. 
		}
	}
}