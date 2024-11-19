// Copyright (c) John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

declare global {
	// Old versions of the TypeScript standard types don't have these properties. 
	// TODO: Update my TypeScript version and remove this.
	interface CSSStyleDeclaration {
		contentVisibility: string;
		zoom: string;
	}
	
	interface PointerEvent<T = any> {
		pointers?: EasyPointers;
		pointer?: Pointer<T>;
	}
}

export interface EasyPointersOptions {
	preventTouchGestureScrolling?: boolean,
	listenForTheseButtons?: Iterable<`${PointerButton}`>,
	listenForMultipleButtonsDown?: boolean,
	listenForMultiplePointers?: boolean,
	listenForPossiblyAccidentalPointers?: boolean,
	preventTextSelection?: boolean,
	preventContextMenu?: boolean,
	preventMiddleButtonScrolling?: boolean,
	moveMinDistance?: number,
	holdStillMinMillis?: number,
	deferInitialEvents?: boolean,
	stopEventsAfterTargetIsRemovedFromLayout?: boolean,
	prioritizeTargetOverNeighborsOnTouchScreen?: boolean,
}

function verifyBooleanOption(options: EasyPointersOptions, name: keyof EasyPointersOptions, defaultValue: boolean): boolean {
	const value: any = options[name];
	if (typeof value != "boolean" && value !== undefined) {
		throw new Error(`EasyPointers: The ${name} option, if provided, should be a boolean value.`);
	}
	return !!(value ?? defaultValue);
}

function elementIsInLayout(element: HTMLElement | SVGElement): boolean {
	// Returns true if the element is in the DOM, does not have display:none,
	// and is not otherwise removed from layout.
	return element.getClientRects().length > 0;
}

export class EasyPointers<UserData = unknown> {
	private static readonly _managedTargets: WeakSet<HTMLElement | SVGElement> = new WeakSet();
	//private static readonly _usingMac: boolean = navigator.userAgent.includes("Macintosh");
	
	public static readonly usingPrimarilyTouchDevice: boolean = matchMedia("(pointer:coarse)").matches;
	
	public deferInitialEvents: boolean;
	public preventTouchGestureScrolling: boolean;
	public preventTextSelection: boolean;
	public preventContextMenu: boolean;
	public preventMiddleButtonScrolling: boolean;
	
	public readonly dispose: () => void;
	
	private readonly _target: HTMLElement | SVGElement;
	public get target(): HTMLElement | SVGElement { return this._target; }
	
	private readonly _byId: Map<number, _InternalPointer<UserData>> = new Map();
	public get byId(): ReadonlyMap<number, Pointer<UserData>> { return this._byId; }
	
	constructor(target: HTMLElement | SVGElement, options: EasyPointersOptions = {}) {
		if (!(target instanceof HTMLElement) && !(target instanceof SVGElement)) {
			throw new Error("EasyPointers: The target should be an HTMLElement or SVGElement.");
		}
		if (EasyPointers._managedTargets.has(target)) {
			throw new Error("EasyPointers: Cannot register EasyPointers twice for the same target element simultaneously. Try calling dispose() on the first one before creating another.");
		}
		EasyPointers._managedTargets.add(target);
		this._target = target;
		if (options.listenForTheseButtons !== undefined &&
			typeof options.listenForTheseButtons[Symbol.iterator] != "function")
		{
			throw new Error("EasyPointers: The listenForTheseButtons option, if provided, should be an iterable object, such as an array, that contains pointer button names.");
		}
		const listenForTheseButtons: Set<`${PointerButton}`> = new Set(options.listenForTheseButtons ?? [PointerButton.primary]);
		for (const button of listenForTheseButtons) {
			if (!_buttonSet.has(button)) {
				throw new Error("EasyPointers: Unrecognized pointer button name provided: " + button + ". Valid values are: " + [..._buttonSet].map(s => `"${s}"`).join(", "));
			}
		}
		
		const listenForTheseButtonIndices: Set<_ButtonIndex> = new Set([...listenForTheseButtons].map(button => _indexFromButton.get(button)!));
		const listenForTheseButtonsBitmask: number = [...listenForTheseButtons].map(button => _bitmaskFromButton.get(button)!).reduce((acc, bit) => acc | bit, 0);
		const listenForMultipleButtonsDown: boolean = verifyBooleanOption(options, "listenForMultipleButtonsDown", false);
		const listenForMultiplePointers: boolean = verifyBooleanOption(options, "listenForMultiplePointers", false);
		const listenForPossiblyAccidentalPointers: boolean = verifyBooleanOption(options, "listenForPossiblyAccidentalPointers", true);
		const moveMinDistance: number = options.moveMinDistance ?? 15; // In my experience, 15 is sufficient for scrolling to trigger (and cancel the pointer) before this threshold is crossed.
		if (typeof moveMinDistance != "number" || moveMinDistance < 0 || !Number.isFinite(moveMinDistance)) throw new Error(`EasyPointers: The moveMinDistance option, if provided, should be a nonnegative number value.`);
		const holdStillMinMillis: number = options.holdStillMinMillis ?? Infinity;
		if (typeof holdStillMinMillis != "number" || holdStillMinMillis <= 0 || Number.isNaN(holdStillMinMillis)) throw new Error(`EasyPointers: The holdStillMinMillis option, if provided, should be a positive number value.`);
		this.deferInitialEvents = verifyBooleanOption(options, "deferInitialEvents", false);
		this.preventTouchGestureScrolling = verifyBooleanOption(options, "preventTouchGestureScrolling", false);
		this.preventTextSelection = verifyBooleanOption(options, "preventTextSelection", listenForTheseButtons.has(PointerButton.primary));
		this.preventContextMenu = verifyBooleanOption(options, "preventContextMenu", listenForTheseButtons.has(PointerButton.secondary));
		this.preventMiddleButtonScrolling = verifyBooleanOption(options, "preventMiddleButtonScrolling", listenForTheseButtons.has(PointerButton.middle));
		const stopEventsAfterTargetIsRemovedFromLayout: boolean = verifyBooleanOption(options, "stopEventsAfterTargetIsRemovedFromLayout", true);
		const prioritizeTargetOverNeighborsOnTouchScreen: boolean = verifyBooleanOption(options, "prioritizeTargetOverNeighborsOnTouchScreen", true);
		
		this._latest = new _InternalPointer(this, 0, EasyPointers.usingPrimarilyTouchDevice ? "touch" : "mouse");
		this._latest._isInTarget = false;
		this._latest._isPresent = false;
		this._first = this._latest;
		
		const stop = (event: Event): void => event.stopImmediatePropagation();
		
		const syncEventAndPointer = (event: PointerEvent, pointer: _InternalPointer<UserData>): void => {
			// Assign references to the event for convenience if those properties don't already exist.
			if (!("pointers" in event)) event.pointers = this;
			if (!("pointer" in event)) event.pointer = pointer;
			
			this._latest = pointer;
			pointer._lastEvent = event;
			
			this._altKey = event.altKey;
			this._ctrlKey = event.ctrlKey;
			this._metaKey = event.metaKey;
			this._shiftKey = event.shiftKey;
			pointer._hasJustEntered = (event.type == "pointerenter");
			pointer._hasJustLeft = (event.type == "pointerleave");
			pointer._hasJustMoved = (event.type == "pointermove");
			pointer._hasJustBecomeDown = (event.type == "pointerdown");
			pointer._hasJustBecomeUp = (event.type == "pointerup");
			pointer._hasJustBeenCanceled = (event.type == "pointercancel");
		}
		
		const resetPresses = (pointer: _InternalPointer): void => {
			pointer._gesture = null;
			pointer._pressedButtons = _ButtonBitmask.none;
			pointer._pressingButtons = _ButtonBitmask.none;
			pointer._startedWithButton = _ButtonIndex.none;
			pointer._justPressedButton = _ButtonIndex.none;
			pointer._justReleasedButton = _ButtonIndex.none;
			pointer._startedWithAltKey = false;
			pointer._startedWithCtrlKey = false;
			pointer._startedWithMetaKey = false;
			pointer._startedWithShiftKey = false;
		}
		
		const internalEnter = (event: PointerEvent): void => {
			// The enter and leave events aren't bubbling, so ordinarily listeners
			// can assume that (event.target == event.currentTarget), but this is
			// listening in the capture phase so we have to check that manually.
			if (event.target != event.currentTarget) return;
			
			// PREVENT EVENT DEFAULTS: N/A
			
			// EVENT STOP CONDITIONS
			if (stopEventsAfterTargetIsRemovedFromLayout && !elementIsInLayout(this._target)) {
				if (this._byId.has(event.pointerId)) {
					this._dispatchPointerLeaveEvent(event.pointerId);
				}
				return stop(event);
			}
			if (!listenForMultiplePointers) {
				// If only one pointer is allowed at a time, and a different pointer
				// is trying to enter, and the new pointer is a different type,
				// (e.g. because a mouse present but the user touches the screen)
				// and the old pointer is not currently down, then remove the old
				// pointer to make room for the new one.
				for (const pointer of this._byId.values()) {
					if (pointer.id != event.pointerId &&
						pointer.type != event.pointerType &&
						!pointer._isDown)
					{
						this._dispatchPointerLeaveEvent(pointer.id);
					}
				}
			}
			if (!listenForMultiplePointers && this._byId.size > 0) return stop(event);
			if (!listenForPossiblyAccidentalPointers && this._byId.size == 0 && !event.isPrimary) {
				return stop(event);
			}
			
			// CHECK POINTER ASSUMPTIONS
			let pointer: _InternalPointer<UserData> | undefined = this._byId.get(event.pointerId);
			if (pointer && pointer._isPresent) return stop(event);
			
			// UPDATE POINTER
			pointer = new _InternalPointer(this, event.pointerId, event.pointerType);
			this._byId.set(event.pointerId, pointer);
			if (this._byId.size == 1) this._first = pointer;
			syncEventAndPointer(event, pointer);
			resetPresses(pointer);
			pointer._verifyValidity();
		};
		
		const internalLeave = (event: PointerEvent): void => {
			// The enter and leave events aren't bubbling, so ordinarily listeners
			// can assume that (event.target == event.currentTarget), but this is
			// listening in the capture phase so we have to check that manually.
			if (event.target != event.currentTarget) return;
			
			// PREVENT EVENT DEFAULTS: N/A
			
			// EVENT STOP CONDITIONS: N/A
			
			// CHECK POINTER ASSUMPTIONS
			let pointer: _InternalPointer<UserData> | undefined = this._byId.get(event.pointerId);
			if (!pointer || !pointer._isPresent) return stop(event);
			if (pointer._isDown) {
				this.dispatchPointerCancelEvent(event.pointerId);
				pointer = this._byId.get(event.pointerId);
				if (!pointer || !pointer._isPresent) return stop(event);
			}
			
			// UPDATE POINTER
			syncEventAndPointer(event, pointer);
			resetPresses(pointer);
			pointer._isInTarget = false;
			pointer._isPresent = false;
			pointer._verifyValidity();
			this._byId.delete(event.pointerId);
		};
		
		const internalMove = (event: PointerEvent): void => {
			// PREVENT EVENT DEFAULTS
			if (this.preventMiddleButtonScrolling &&
				event.button == _ButtonIndex.middle &&
				(event.buttons & _ButtonBitmask.middle) != 0)
			{
				// The middle button has been pressed, and could start the scrolling mode
				// on some platforms, but that should be prevented.
				event.preventDefault();
			}
			
			// EVENT STOP CONDITIONS
			if (stopEventsAfterTargetIsRemovedFromLayout && !elementIsInLayout(this._target)) {
				if (this._byId.has(event.pointerId)) {
					this._dispatchPointerLeaveEvent(event.pointerId);
				}
				return stop(event);
			}
			if (!this.preventContextMenu &&
				event.button == _ButtonIndex.secondary &&
				(event.buttons & _ButtonBitmask.secondary) == 0)
			{
				// The secondary button has been released, and will trigger a contextmenu event.
				// Macs do not dispatch a button release event before a contextmenu event.
				// For consistency, stop button release events on other platforms too.
				return stop(event);
			}
			
			// CHECK POINTER ASSUMPTIONS
			let pointer: _InternalPointer<UserData> | undefined = this._byId.get(event.pointerId);
			const pointerIsDown = (): boolean => (pointer?._isDown ?? false) || (pointer?._gesture?.deferringEvents ?? false);
			const pointerPressingButtons = (): number => (pointer?._gesture?.deferringEvents ?? false)
				? (pointer?._gesture?.pressingButtons ?? _ButtonBitmask.none)
				: (pointer?._pressingButtons ?? _ButtonBitmask.none);
			let changedButtonIndex: _ButtonIndex = listenForTheseButtonIndices.has(event.button)
				? event.button
				: _ButtonIndex.none;
			if (!listenForMultipleButtonsDown &&
				pointer &&
				pointerIsDown() &&
				changedButtonIndex != pointer._startedWithButton)
			{
				changedButtonIndex = _ButtonIndex.none;
			}
			let pressingButtons: number = pointerPressingButtons();
			let addedButton:   _ButtonIndex = _ButtonIndex.none;
			let removedButton: _ButtonIndex = _ButtonIndex.none;
			if (changedButtonIndex != _ButtonIndex.none) {
				const changedButtonBitmask: number | undefined = _bitmaskFromButton.get(_buttonFromIndex.get(changedButtonIndex)!);
				if (changedButtonBitmask == undefined) throw new Error("EasyPointers: Missing bitmask for button index: " + changedButtonIndex);
				const pressingChangedButton: boolean = (event.buttons & changedButtonBitmask) != 0;
				
				if (pressingChangedButton) {
					if ((pressingButtons & changedButtonBitmask) != 0) {
						this.dispatchPointerCancelEvent(event.pointerId);
						pointer = this._byId.get(event.pointerId);
						pressingButtons = pointerPressingButtons();
					}
					addedButton = changedButtonIndex;
					pressingButtons = (pressingButtons | changedButtonBitmask);
				}
				if (!pressingChangedButton && (pressingButtons & changedButtonBitmask) != 0) {
					removedButton = changedButtonIndex;
					pressingButtons = (pressingButtons & (~changedButtonBitmask));
				}
			}
			const pressingAnyMissingButtons: boolean = (pressingButtons & (~event.buttons)) != 0;
			if (pressingAnyMissingButtons) {
				this.dispatchPointerCancelEvent(event.pointerId);
				pointer = this._byId.get(event.pointerId);
				pressingButtons = pointerPressingButtons();
				addedButton   = _ButtonIndex.none;
				removedButton = _ButtonIndex.none;
			}
			if (addedButton != _ButtonIndex.none && !pointerIsDown()) {
				if (this._dispatchPointerDownEvent(event, addedButton).defaultPrevented) {
					// Make sure the browser knows the app wanted to prevent the default behavior.
					event.preventDefault();
				}
				return stop(event);
			}
			if (removedButton != _ButtonIndex.none && pointerIsDown() && pressingButtons == _ButtonBitmask.none) {
				if (this._dispatchPointerUpEvent(event, removedButton).defaultPrevented) {
					// Make sure the browser knows the app wanted to prevent the default behavior.
					event.preventDefault();
				}
				return stop(event);
			}
			if (!pointer || !pointer._isPresent) {
				if (addedButton != _ButtonIndex.none ||
					removedButton != _ButtonIndex.none ||
					pressingButtons != _ButtonBitmask.none)
				{
					throw new Error("EasyPointers: Cannot add or remove buttons on a missing pointer.");
				}
				this._dispatchPointerEnterEvent(event);
				pointer = this._byId.get(event.pointerId);
				if (!pointer || !pointer._isPresent) return stop(event);
			}
			const gesture: _Gesture | null = pointer._gesture;
			if (pointerIsDown() && gesture && !gesture.hasMovedFromStart) {
				// A rough estimate of the zoom level, to convert from viewport distance to touchscreen distance.
				const zoom: number = window.outerWidth / (visualViewport?.width ?? window.innerWidth);
				const dx: number = (event.clientX - gesture.startClientX) * zoom;
				const dy: number = (event.clientY - gesture.startClientY) * zoom;
				const distanceMoved: number = Math.sqrt(dx * dx + dy * dy);
				// As a heuristic, assume that if the touch moved past a certain threshold,
				// it's probably enough to determine whether it will start scrolling or not.
				if (distanceMoved > moveMinDistance) {
					gesture.hasMovedFromStart = true;
					// If the touch pointer would be canceled in favor of scrolling,
					// a pointercancel event will be dispatched, but not until immediately
					// after the pointermove event that crossed the threshold. Wait to see
					// if the pointercancel event is dispatched.
					if (gesture.deferringEvents) {
						setTimeout(() => {
							if (pointer &&
								gesture == pointer._gesture &&
								pointer._isPresent &&
								pointer == this._byId.get(event.pointerId) &&
								gesture.deferringEvents)
							{
								gesture.stopDeferring();
							}
						}, 10);
					}
				}
			}
			if (gesture && gesture.deferringEvents) {
				gesture.deferredEvents.push(event);
				gesture.pressingButtons = pressingButtons;
				return stop(event);
			}
			
			// UPDATE POINTER
			syncEventAndPointer(event, pointer);
			if (!pointer._isDown) resetPresses(pointer);
			pointer._isInTarget = target.contains(document.elementFromPoint(event.clientX, event.clientY));
			if (addedButton) pointer._pressedButtons = pressingButtons;
			pointer._pressingButtons = pressingButtons;
			pointer._justPressedButton = addedButton;
			pointer._justReleasedButton = removedButton;
			pointer._verifyValidity();
		};
		
		const internalDown = (event: PointerEvent): void => {
			// PREVENT EVENT DEFAULTS
			if (this.preventMiddleButtonScrolling && event.button == _ButtonIndex.middle) event.preventDefault();
			
			// EVENT STOP CONDITIONS
			if (stopEventsAfterTargetIsRemovedFromLayout && !elementIsInLayout(this._target)) {
				if (this._byId.has(event.pointerId)) {
					this._dispatchPointerLeaveEvent(event.pointerId);
				}
				return stop(event);
			}
			if (!listenForTheseButtonIndices.has(event.button)) return stop(event);
			
			// On Mac, contextmenu events immediately follow a pointerdown event, and no pointerup
			// or pointercancel will follow, but on Windows, a contextmenu event follows a pointerup
			// event. We allow the pointerdown event to propagate regardless, in case the application
			// needs to toggle preventContextMenu in response to the event:
			//const willOpenContextMenu: boolean = (event.button === _ButtonIndex.secondary || (event.ctrlKey && EasyPointers._usingMac));
			//if (!this.preventContextMenu && willOpenContextMenu) return stop(event);
			// But for consistency, any pointerup event should be replaced with a cancel event, and
			// if the pointer is still down when the contextmenu event is dispatched then the pointer
			// should be cancelled.
			
			// CHECK POINTER ASSUMPTIONS
			let pointer: _InternalPointer<UserData> | undefined = this._byId.get(event.pointerId);
			if (pointer && pointer._isDown) {
				this.dispatchPointerCancelEvent(event.pointerId);
				pointer = this._byId.get(event.pointerId);
			}
			if (!pointer || !pointer._isPresent) {
				if (!listenForMultiplePointers) {
					// If only one pointer is allowed at a time, and a new pointer
					// is being pressed, and the new pointer is a different type,
					// (e.g. because a mouse is present but the user touches the screen)
					// then remove the old pointer to make room for the new one.
					for (const pointer of this._byId.values()) {
						if (pointer.type != event.pointerType) {	
							this._dispatchPointerLeaveEvent(pointer.id);
						}
					}
				}
				this._dispatchPointerEnterEvent(event);
				pointer = this._byId.get(event.pointerId);
				if (!pointer || !pointer._isPresent) return stop(event);
			}
			let gesture: _Gesture | null = pointer._gesture;
			if (!(gesture?.dispatchingDeferredEvents ?? false)) {
				// If the gesture is in the process of dispatching deferred events,
				// preserve it, otherwise replace it with a new gesture.
				gesture = new _Gesture();
				pointer._gesture = gesture;
				gesture.startClientX = event.clientX;
				gesture.startClientY = event.clientY;
				if (Number.isFinite(holdStillMinMillis) && holdStillMinMillis > 0) {
					setTimeout(() => {
						if (pointer &&
							gesture &&
							gesture == pointer._gesture &&
							pointer._isPresent &&
							pointer == this._byId.get(event.pointerId) &&
							!gesture.wasHeldStill &&
							!gesture.hasMovedFromStart)
						{
							gesture.wasHeldStill = true;
							if (gesture.deferringEvents) {
								gesture.stopDeferring();
							}
						}
					}, holdStillMinMillis);
				}
				gesture.deferringEvents = this.deferInitialEvents || (event.pointerType == "touch" && !this.preventTouchGestureScrolling);
				if (gesture.deferringEvents) {
					gesture.deferredEvents.push(event);
					gesture.pressingButtons = event.buttons & listenForTheseButtonsBitmask;
					return stop(event);
				}
			}
			
			// UPDATE POINTER
			this._target.setPointerCapture(event.pointerId);
			syncEventAndPointer(event, pointer);
			pointer._isDown = true;
			pointer._isInTarget = true;
			pointer._pressedButtons     = event.buttons & listenForTheseButtonsBitmask;
			pointer._pressingButtons    = event.buttons & listenForTheseButtonsBitmask;
			pointer._startedWithButton  = event.button;
			pointer._justPressedButton  = event.button;
			pointer._justReleasedButton = _ButtonIndex.none;
			pointer._startedWithAltKey   = event.altKey;
			pointer._startedWithCtrlKey  = event.ctrlKey;
			pointer._startedWithMetaKey  = event.metaKey;
			pointer._startedWithShiftKey = event.shiftKey;
			pointer._verifyValidity();
			
			// Verify that a pointer that isn't down or in the target has left.
			// This condition can be temporarily violated when a pointer is in the 
			// process of becoming up, because the up event fires before the leave
			// event, but this condition should at least be true inside move event
			// listeners.
			if (!pointer._isDown && !pointer._isInTarget && pointer._isPresent) throw new Error("EasyPointers: A pointer that isn't down or in the target shouldn't be present.");
		};
		
		const internalUp = (event: PointerEvent): void => {
			// PREVENT EVENT DEFAULTS: N/A
			
			// EVENT STOP CONDITIONS
			if (stopEventsAfterTargetIsRemovedFromLayout && !elementIsInLayout(this._target)) {
				if (this._byId.has(event.pointerId)) {
					this._dispatchPointerLeaveEvent(event.pointerId);
				}
				return stop(event);
			}
			if (!this.preventContextMenu && event.button == _ButtonIndex.secondary) {
				// Macs do not dispatch a pointerup event before a contextmenu event.
				// For consistency, replace pointerup events with cancel events on other
				// platforms too.
				this.dispatchPointerCancelEvent(event.pointerId);
				return stop(event);
			}
			
			// CHECK POINTER ASSUMPTIONS
			let pointer: _InternalPointer<UserData> | undefined = this._byId.get(event.pointerId);
			if (pointer?._gesture?.deferringEvents ?? false) {
				pointer!._gesture!.stopDeferring();
				pointer = this._byId.get(event.pointerId);
			}
			if (!pointer || !pointer._isDown) return stop(event);
			
			// UPDATE POINTER
			this._target.releasePointerCapture(event.pointerId);
			syncEventAndPointer(event, pointer);
			pointer._pressingButtons = _ButtonBitmask.none;
			pointer._justPressedButton = _ButtonIndex.none;
			pointer._justReleasedButton = event.button;
			pointer._isDown = false;
			pointer._isInTarget = target.contains(document.elementFromPoint(event.clientX, event.clientY));
			pointer._verifyValidity();
		};
		
		const internalCancel = (event: PointerEvent): void => {
			// PREVENT EVENT DEFAULTS: N/A
			
			// EVENT STOP CONDITIONS
			
			// CHECK POINTER ASSUMPTIONS
			let pointer: _InternalPointer<UserData> | undefined = this._byId.get(event.pointerId);
			if (pointer) pointer._gesture = null;
			if (!pointer || !pointer._isDown) return stop(event);
			
			// UPDATE POINTER
			this._target.releasePointerCapture(event.pointerId);
			syncEventAndPointer(event, pointer);
			pointer._pressingButtons = _ButtonBitmask.none;
			pointer._justPressedButton = _ButtonIndex.none;
			pointer._justReleasedButton = _ButtonIndex.none;
			pointer._isDown = false;
			pointer._isInTarget = target.contains(document.elementFromPoint(event.clientX, event.clientY));
			pointer._verifyValidity();
		};
		
		const touchPreventScrolling = (event: TouchEvent): void => {
			// The event should be cancelable, but in some cases it might not be,
			// in which case this will log an error to the console...
			if (this.preventTouchGestureScrolling) {
				event.preventDefault();
			} else {
				for (const pointer of this._byId.values()) {
					const gesture: _Gesture | null = pointer._gesture;
					if (gesture && !gesture.deferringEvents) {
						event.preventDefault();
						break;
					}
				}
			}
		};
		
		// For presumably historical reasons, adding a mouse event listener
		// to an element forces mobile Chrome to treat it as an interactive
		// widget for the purposes of deciding which of the elements under
		// the finger to interact with. The listener doesn't actually have
		// to do anything.
		const emptyMousedownForTouchScreen = function(event: MouseEvent): void {};
		
		const selectDragListener = (event: Event): void => {
			if (this.preventTextSelection) event.preventDefault();
		};
		
		const contextmenu = (event: PointerEvent): void => {
			if (this.preventContextMenu) {
				event.preventDefault();
			} else {
				const pointer: _InternalPointer | undefined = this._byId.get(event.pointerId);
				if (pointer && pointer._isDown) {
					if (pointer._gesture && Number.isFinite(holdStillMinMillis)) {
						// If the long-press feature is being used, inhibit the context menu which might otherwise take over the long-press.
						event.preventDefault();
					} else {
						this.dispatchPointerCancelEvent(event.pointerId);
					}
				}
				// TODO: Should I just cancel all down pointers if there's a context menu?
			}
		}
		
		if (prioritizeTargetOverNeighborsOnTouchScreen) {
			target.addEventListener("mousedown", emptyMousedownForTouchScreen as EventListener);
		}
		target.addEventListener("touchstart", touchPreventScrolling as EventListener, {capture: true, passive: false});
		target.addEventListener("touchmove", touchPreventScrolling as EventListener, {capture: true, passive: false});
		target.addEventListener("selectstart", selectDragListener as EventListener, {capture: true});
		target.addEventListener("selectionchange", selectDragListener as EventListener, {capture: true});
		target.addEventListener("dragstart", selectDragListener as EventListener, {capture: true});
		target.addEventListener("contextmenu", contextmenu as EventListener, {capture: true});
		target.addEventListener("pointerenter", internalEnter as EventListener, {capture: true});
		target.addEventListener("pointerleave", internalLeave as EventListener, {capture: true});
		target.addEventListener("pointermove", internalMove as EventListener, {capture: true});
		target.addEventListener("pointerdown", internalDown as EventListener, {capture: true});
		target.addEventListener("pointerup", internalUp as EventListener, {capture: true});
		target.addEventListener("pointercancel", internalCancel as EventListener, {capture: true});
		
		this.dispose = () => {
			for (const pointer of this._byId.values()) {
				this._dispatchPointerLeaveEvent(pointer.id);
			}
			target.removeEventListener("mousedown", emptyMousedownForTouchScreen as EventListener);
			target.removeEventListener("touchstart", touchPreventScrolling as EventListener, {capture: true});
			target.removeEventListener("touchmove", touchPreventScrolling as EventListener, {capture: true});
			target.removeEventListener("selectstart", selectDragListener as EventListener, {capture: true});
			target.removeEventListener("selectionchange", selectDragListener as EventListener, {capture: true});
			target.removeEventListener("dragstart", selectDragListener as EventListener, {capture: true});
			target.removeEventListener("contextmenu", contextmenu as EventListener, {capture: true});
			target.removeEventListener("pointerenter", internalEnter as EventListener, {capture: true});
			target.removeEventListener("pointerleave", internalLeave as EventListener, {capture: true});
			target.removeEventListener("pointermove", internalMove as EventListener, {capture: true});
			target.removeEventListener("pointerdown", internalDown as EventListener, {capture: true});
			target.removeEventListener("pointerup", internalUp as EventListener, {capture: true});
			target.removeEventListener("pointercancel", internalCancel as EventListener, {capture: true});
			EasyPointers._managedTargets.delete(target);
		}
	}
	
	private _dispatchSyntheticEvent(type: string, modelEvent: PointerEvent, overrides: Partial<PointerEvent>): PointerEvent {
		const proxy = new Proxy(modelEvent, {
			get(_, key) { return Object.prototype.hasOwnProperty.call(overrides, key) ? (overrides as any)[key] : (modelEvent as any)[key]; },
		});
		let newEvent: PointerEvent = new PointerEvent(type, proxy);
		// TODO: Are there situations when I need to be able to override target? Bubbling enter/leave events?
		if (newEvent.bubbles && this._target.contains(modelEvent.target as Node)) {
			modelEvent.target!.dispatchEvent(newEvent);
		} else {
			this._target.dispatchEvent(newEvent);
		}
		return newEvent;
	};
	
	private _dispatchPointerEnterEvent(modelEvent: PointerEvent): PointerEvent {
		return this._dispatchSyntheticEvent("pointerenter", modelEvent, {
			bubbles: false,
			button: _ButtonIndex.none,
			buttons: _ButtonBitmask.none,
		});
	}
	
	private _dispatchPointerLeaveEvent(pointerId: number): PointerEvent | null {
		const pointer: _InternalPointer | undefined = this._byId.get(pointerId);
		if (!pointer) return null;
		return this._dispatchSyntheticEvent("pointerleave", pointer._lastEvent!, {
			bubbles: false,
			button: _ButtonIndex.none,
			buttons: _ButtonBitmask.none,
			relatedTarget: null,
		});
	}
	
	// I'm not dispatching any synthetic move events currently...
	
	private _dispatchPointerDownEvent(modelEvent: PointerEvent, button: _ButtonIndex): PointerEvent {
		return this._dispatchSyntheticEvent("pointerdown", modelEvent, {
			bubbles: true,
			button: button,
			buttons: _bitmaskFromButton.get(_buttonFromIndex.get(button)!),
			relatedTarget: null,
		});
	}
	
	private _dispatchPointerUpEvent(modelEvent: PointerEvent, button: _ButtonIndex): PointerEvent {
		return this._dispatchSyntheticEvent("pointerup", modelEvent, {
			bubbles: true,
			button: button,
			buttons: _ButtonBitmask.none,
			relatedTarget: null,
		});
	}
	
	public dispatchPointerCancelEvent(pointerId: number): PointerEvent | null {
		const pointer: _InternalPointer | undefined = this._byId.get(pointerId);
		if (!pointer) return null;
		return this._dispatchSyntheticEvent("pointercancel", pointer._lastEvent!, {
			bubbles: true,
			button: _ButtonIndex.none,
			buttons: _ButtonBitmask.none,
			relatedTarget: null,
		});
	}
	
	private _latest: _InternalPointer<UserData>;
	public get latest(): Pointer<UserData> { return this._latest; }
	
	private _first: _InternalPointer<UserData>;
	public get first(): Pointer<UserData> { return this._first; }
	
	public [Symbol.iterator](): Iterator<Pointer<UserData>> { return this._byId.values(); }
	public get count(): number { return this._byId.size; }
	public get downCount(): number {
		let result: number = 0;
		for (const pointer of this._byId.values()) {
			if (pointer._isDown) result++;
		}
		return result;
	}
	
	public get anyDown(): boolean {
		for (const pointer of this._byId.values()) {
			if (pointer.isDown) return true;
		}
		return false;
	}
	
	public get anyPresent(): boolean {
		return this._byId.size > 0;
	}
	
	public get anyHovering(): boolean {
		for (const pointer of this._byId.values()) {
			if (pointer.isHovering) return true;
		}
		return false;
	}
	
	public get firstHasJustEntered(): boolean {
		return this._byId.size == 1 && this._latest.hasJustEntered;
	}
	public get firstHasJustBecomeDown(): boolean {
		return this.downCount == 1 && this._latest.hasJustBecomeDown;
	}
	public get lastHasJustLeft(): boolean {
		return this._byId.size == 0 && this._latest.hasJustLeft;
	}
	public get lastHasJustBecomeUp(): boolean {
		return this.downCount == 0 && this._latest.hasJustBecomeUp;
	}
	
	public get isUsingMouse(): boolean {
		for (const pointer of this._byId.values()) {
			if (pointer.isMouse) return true;
		}
		if (this._latest.isMouse) return true;
		return false;
	}
	
	public get isUsingTouch(): boolean {
		for (const pointer of this._byId.values()) {
			if (pointer.isTouch) return true;
		}
		if (this._latest.isTouch) return true;
		return false;
	}
	
	private _altKey: boolean = false;
	public get altKeyIsDown(): boolean { return this._altKey; }
	private _ctrlKey: boolean = false;
	public get ctrlKeyIsDown(): boolean { return this._ctrlKey; }
	private _metaKey: boolean = false;
	public get metaKeyIsDown(): boolean { return this._metaKey; }
	private _shiftKey: boolean = false;
	public get shiftKeyIsDown(): boolean { return this._shiftKey; }
	public get ctrlOrMetaKeyIsDown(): boolean { return this._ctrlKey || this._metaKey; }
}

export const enum PointerButton {
	none      = "none",
	primary   = "primary",
	secondary = "secondary",
	middle    = "middle",
	back      = "back",
	forward   = "forward",
	eraser    = "eraser",
}
const _buttonSet: Set<`${PointerButton}`> = new Set([
	PointerButton.primary,
	PointerButton.secondary,
	PointerButton.middle,
	PointerButton.back,
	PointerButton.forward,
	PointerButton.eraser,
]);

// https://w3c.github.io/pointerevents/#the-button-property
const enum _ButtonIndex {
	none      = -1,
	primary   =  0,
	secondary =  2, // Not a typo! 
	middle    =  1,
	back      =  3,
	forward   =  4,
	eraser    =  5,
}
// https://w3c.github.io/pointerevents/#the-buttons-property
const enum _ButtonBitmask {
	none      =  0,
	primary   =  1,
	secondary =  2,
	middle    =  4,
	back      =  8,
	forward   = 16,
	eraser    = 32,
}
const _indexFromButton: Map<`${PointerButton}`, _ButtonIndex> = new Map([
	[PointerButton.none,      _ButtonIndex.none     ],
	[PointerButton.primary,   _ButtonIndex.primary  ],
	[PointerButton.secondary, _ButtonIndex.secondary],
	[PointerButton.middle,    _ButtonIndex.middle   ],
	[PointerButton.back,      _ButtonIndex.back     ],
	[PointerButton.forward,   _ButtonIndex.forward  ],
	[PointerButton.eraser,    _ButtonIndex.eraser   ],
]);
const _buttonFromIndex: Map<_ButtonIndex, PointerButton> = new Map(Array.from(_indexFromButton, entry => entry.reverse()) as Array<[_ButtonIndex, PointerButton]>);
const _bitmaskFromButton: Map<`${PointerButton}`, _ButtonBitmask> = new Map([
	[PointerButton.none,      _ButtonBitmask.none     ],
	[PointerButton.primary,   _ButtonBitmask.primary  ],
	[PointerButton.secondary, _ButtonBitmask.secondary],
	[PointerButton.middle,    _ButtonBitmask.middle   ],
	[PointerButton.back,      _ButtonBitmask.back     ],
	[PointerButton.forward,   _ButtonBitmask.forward  ],
	[PointerButton.eraser,    _ButtonBitmask.eraser   ],
]);
const _buttonFromBitmask: Map<_ButtonBitmask, PointerButton> = new Map(Array.from(_bitmaskFromButton, entry => entry.reverse()) as Array<[_ButtonBitmask, PointerButton]>);
function _buttonSetFromBitmask(buttons: number): Set<PointerButton> {
	const result: Set<PointerButton> = new Set();
	for (const bitmask of _buttonFromBitmask.keys()) {
		if (buttons & bitmask) {
			result.add(_buttonFromBitmask.get(bitmask)!);
		}
	}
	return result;
}

export interface Pointer<UserData = unknown> {
	readonly id: number;
	readonly type: string;
	
	data?: UserData;
	
	get isPresent(): boolean;
	get isInTarget(): boolean;
	get isDown(): boolean;
	get isMouse(): boolean;
	get isTouch(): boolean;
	get isHovering(): boolean;
	get hasJustEntered(): boolean;
	get hasJustLeft(): boolean;
	get hasJustMoved(): boolean;
	get hasJustBecomeDown(): boolean;
	get hasJustBecomeUp(): boolean;
	get hasJustBeenCanceled(): boolean;
	get hasMovedFromStart(): boolean;
	get wasHeldStill(): boolean;
	
	get pageX(): number
	get pageY(): number
	get pointInPage(): Point2d
	get viewportX(): number
	get viewportY(): number
	get pointInViewport(): Point2d
	getPointIn(element: HTMLElement | SVGElement, box?: `${ElementBox}`): Point2d
	getPointInNormalized(element: HTMLElement, box?: `${ElementBox}`): Point2d
	get pressedButtons(): Set<PointerButton>;
	get hadPressedPrimaryButton(): boolean;
	get hadPressedSecondaryButton(): boolean;
	get hadPressedMiddleButton(): boolean;
	get hadPressedOnlyPrimaryButton(): boolean;
	get hadPressedOnlySecondaryButton(): boolean;
	get hadPressedOnlyMiddleButton(): boolean;
	hadPressedAny(...buttons: `${PointerButton}`[]): boolean;
	hadPressedAll(...buttons: `${PointerButton}`[]): boolean;
	hadPressedExactly(...buttons: `${PointerButton}`[]): boolean;
	get pressingButtons(): Set<PointerButton>;
	get isPressingPrimaryButton(): boolean;
	get isPressingSecondaryButton(): boolean;
	get isPressingMiddleButton(): boolean;
	get isPressingOnlyPrimaryButton(): boolean;
	get isPressingOnlySecondaryButton(): boolean;
	get isPressingOnlyMiddleButton(): boolean;
	isPressingAny(...buttons: `${PointerButton}`[]): boolean;
	isPressingAll(...buttons: `${PointerButton}`[]): boolean;
	isPressingExactly(...buttons: `${PointerButton}`[]): boolean;
	get startedWithButton(): PointerButton;
	get startedWithPrimaryButton(): boolean;
	get startedWithSecondaryButton(): boolean;
	get startedWithMiddleButton(): boolean;
	get justPressedButton(): PointerButton;
	get hasJustPressedPrimaryButton(): boolean;
	get hasJustPressedSecondaryButton(): boolean;
	get hasJustPressedMiddleButton(): boolean;
	get justReleasedButton(): PointerButton;
	get hasJustReleasedPrimaryButton(): boolean;
	get hasJustReleasedSecondaryButton(): boolean;
	get hasJustReleasedMiddleButton(): boolean;
	get startedWithAltKey(): boolean;
	get startedWithCtrlKey(): boolean;
	get startedWithMetaKey(): boolean;
	get startedWithShiftKey(): boolean;
	cancel(): void;
}

class _Gesture {
	public startClientX: number = 0;
	public startClientY: number = 0;
	public deferredEvents: PointerEvent[] = [];
	public deferringEvents: boolean = true;
	public dispatchingDeferredEvents: boolean = false;
	public pressingButtons: number = _ButtonBitmask.none;
	public hasMovedFromStart: boolean = false;
	public wasHeldStill: boolean = false;
	
	public stopDeferring(): void {
		this.deferringEvents = false;
		this.dispatchingDeferredEvents = true;
		for (const event of this.deferredEvents) {
			event.target!.dispatchEvent(event);
		}
		this.dispatchingDeferredEvents = false;
		this.deferredEvents.length = 0;
	}
}

class _InternalPointer<UserData = unknown> implements Pointer<UserData> {
	public _lastEvent: PointerEvent | null = null;
	public _gesture: _Gesture | null = null;
	
	constructor(
		private readonly _pointers: EasyPointers,
		public readonly id: number,
		public readonly type: string) {}
	
	public data?: UserData;
	
	public _isPresent: boolean = true;
	public get isPresent(): boolean { return this._isPresent; }
	
	public _isInTarget: boolean = true;
	public get isInTarget(): boolean { return this._isInTarget && this._isPresent; }
	
	public _isDown: boolean = false;
	public get isDown(): boolean { return this._isDown; }
	
	public get isMouse(): boolean { return (this.type == "mouse"); }
	public get isTouch(): boolean { return (this.type == "touch"); }
	
	public get isHovering(): boolean {
		return (this._isInTarget && !this._isDown && this.type != "touch");
	}
	
	public _hasJustEntered: boolean = false;
	public get hasJustEntered(): boolean { return this._hasJustEntered; }
	public _hasJustLeft: boolean = false;
	public get hasJustLeft(): boolean { return this._hasJustLeft; }
	public _hasJustMoved: boolean = false;
	public get hasJustMoved(): boolean { return this._hasJustMoved; }
	public _hasJustBecomeDown: boolean = false;
	public get hasJustBecomeDown(): boolean { return this._hasJustBecomeDown; }
	public _hasJustBecomeUp: boolean = false;
	public get hasJustBecomeUp(): boolean { return this._hasJustBecomeUp; }
	public _hasJustBeenCanceled: boolean = false;
	public get hasJustBeenCanceled(): boolean { return this._hasJustBeenCanceled; }
	
	public get hasMovedFromStart(): boolean { return this._gesture?.hasMovedFromStart ?? false; }
	public get wasHeldStill(): boolean { return this._gesture?.wasHeldStill ?? false; }
	
	public _pressedButtons: number = _ButtonBitmask.none;
	public get pressedButtons(): Set<PointerButton> { return _buttonSetFromBitmask(this._pressedButtons); }
	public get hadPressedPrimaryButton():       boolean { return (this._pressedButtons & _ButtonBitmask.primary) != 0; }
	public get hadPressedSecondaryButton():     boolean { return (this._pressedButtons & _ButtonBitmask.secondary) != 0; }
	public get hadPressedMiddleButton():        boolean { return (this._pressedButtons & _ButtonBitmask.middle) != 0; }
	public get hadPressedOnlyPrimaryButton():   boolean { return (this._pressedButtons == _ButtonBitmask.primary); }
	public get hadPressedOnlySecondaryButton(): boolean { return (this._pressedButtons == _ButtonBitmask.secondary); }
	public get hadPressedOnlyMiddleButton():    boolean { return (this._pressedButtons == _ButtonBitmask.middle); }
	public hadPressedAny(...buttons: `${PointerButton}`[]): boolean {
		for (const button of buttons) {
			if (this._pressedButtons & _bitmaskFromButton.get(button)!) return true;
		}
		return false;
	}
	public hadPressedAll(...buttons: `${PointerButton}`[]): boolean {
		for (const button of buttons) {
			if (!(this._pressedButtons & _bitmaskFromButton.get(button)!)) return false;
		}
		return true;
	}
	public hadPressedExactly(...buttons: `${PointerButton}`[]): boolean {
		let mask: number = 0;
		for (const button of buttons) mask |= _bitmaskFromButton.get(button)!;
		return (this._pressedButtons == mask);
	}
	
	public _pressingButtons: number = _ButtonBitmask.none;
	public get pressingButtons(): Set<PointerButton> { return _buttonSetFromBitmask(this._pressingButtons); }
	public get isPressingPrimaryButton():       boolean { return (this._pressingButtons & _ButtonBitmask.primary) != 0; }
	public get isPressingSecondaryButton():     boolean { return (this._pressingButtons & _ButtonBitmask.secondary) != 0; }
	public get isPressingMiddleButton():        boolean { return (this._pressingButtons & _ButtonBitmask.middle) != 0; }
	public get isPressingOnlyPrimaryButton():   boolean { return (this._pressingButtons == _ButtonBitmask.primary); }
	public get isPressingOnlySecondaryButton(): boolean { return (this._pressingButtons == _ButtonBitmask.secondary); }
	public get isPressingOnlyMiddleButton():    boolean { return (this._pressingButtons == _ButtonBitmask.middle); }
	public isPressingAny(...buttons: `${PointerButton}`[]): boolean {
		for (const button of buttons) {
			if (this._pressingButtons & _bitmaskFromButton.get(button)!) return true;
		}
		return false;
	}
	public isPressingAll(...buttons: `${PointerButton}`[]): boolean {
		for (const button of buttons) {
			if (!(this._pressingButtons & _bitmaskFromButton.get(button)!)) return false;
		}
		return true;
	}
	public isPressingExactly(...buttons: `${PointerButton}`[]): boolean {
		let mask: number = 0;
		for (const button of buttons) mask |= _bitmaskFromButton.get(button)!;
		return (this._pressingButtons == mask);
	}
	
	public _startedWithButton: _ButtonIndex = _ButtonIndex.none;
	public get startedWithButton(): PointerButton { return _buttonFromIndex.get(this._startedWithButton)!; }
	public get startedWithPrimaryButton():   boolean { return this._startedWithButton == _ButtonIndex.primary; }
	public get startedWithSecondaryButton(): boolean { return this._startedWithButton == _ButtonIndex.secondary; }
	public get startedWithMiddleButton():    boolean { return this._startedWithButton == _ButtonIndex.middle; }
	
	public _justPressedButton: _ButtonIndex = _ButtonIndex.none;
	public get justPressedButton(): PointerButton { return _buttonFromIndex.get(this._justPressedButton)!; }
	public get hasJustPressedPrimaryButton():   boolean { return this._justPressedButton == _ButtonIndex.primary; }
	public get hasJustPressedSecondaryButton(): boolean { return this._justPressedButton == _ButtonIndex.secondary; }
	public get hasJustPressedMiddleButton():    boolean { return this._justPressedButton == _ButtonIndex.middle; }
	
	public _justReleasedButton: _ButtonIndex = _ButtonIndex.none;
	public get justReleasedButton(): PointerButton { return _buttonFromIndex.get(this._justReleasedButton)!; }
	public get hasJustReleasedPrimaryButton():   boolean { return this._justReleasedButton == _ButtonIndex.primary; }
	public get hasJustReleasedSecondaryButton(): boolean { return this._justReleasedButton == _ButtonIndex.secondary; }
	public get hasJustReleasedMiddleButton():    boolean { return this._justReleasedButton == _ButtonIndex.middle; }
	
	public get pageX(): number { return this._lastEvent!.clientX + window.scrollX; }
	public get pageY(): number { return this._lastEvent!.clientY + window.scrollY; }
	public get pointInPage(): Point2d { return new Point2d(this._lastEvent!.clientX + window.scrollX, this._lastEvent!.clientY + window.scrollY); }
	public get viewportX(): number { return this._lastEvent!.clientX; }
	public get viewportY(): number { return this._lastEvent!.clientY; }
	public get pointInViewport(): Point2d { return new Point2d(this._lastEvent!.clientX, this._lastEvent!.clientY); }
	public getPointIn(element: HTMLElement | SVGElement, box?: `${ElementBox}`): Point2d {
		if (!elementIsInLayout(element)) return new Point2d(NaN, NaN);
		return projectPointToPlane(
			this._lastEvent?.clientX || 0,
			this._lastEvent?.clientY || 0,
			getElementMatrix(element, box, DisplayBox.viewport));
	}
	public getPointInNormalized(element: HTMLElement, box?: `${ElementBox}`): Point2d {
		if (!elementIsInLayout(element)) return new Point2d(NaN, NaN);
		const point: Point2d = projectPointToPlane(
			this._lastEvent?.clientX || 0,
			this._lastEvent?.clientY || 0,
			getElementMatrix(element, box, DisplayBox.viewport));
		const dimensions = getElementDimensions(element, box);
		point.x = (point.x / dimensions.width) || 0;
		point.y = (point.y / dimensions.height) || 0;
		return point;
	}
	
	public _startedWithAltKey: boolean = false;
	public get startedWithAltKey(): boolean { return this._startedWithAltKey; }
	public _startedWithCtrlKey: boolean = false;
	public get startedWithCtrlKey(): boolean { return this._startedWithCtrlKey; }
	public _startedWithMetaKey: boolean = false;
	public get startedWithMetaKey(): boolean { return this._startedWithMetaKey; }
	public _startedWithShiftKey: boolean = false;
	public get startedWithShiftKey(): boolean { return this._startedWithShiftKey; }
	
	public cancel(): void {
		this._pointers.dispatchPointerCancelEvent(this.id);
	}
	
	public _verifyValidity(): void {
		if (this._lastEvent == null) throw new Error("EasyPointers: A pointer is missing _lastEvent.");
		// TODO: I may need to adjust this next constraint if a target should be isolated from any of its descendents?
		if ((this._isDown || this._isInTarget) && !this._isPresent) throw new Error("EasyPointers: A pointer that is down or in the target shouldn't have left.");
		if (this._isDown != (this._pressingButtons != _ButtonBitmask.none)) throw new Error("EasyPointers: Whether pointer is down should correspond to whether it is pressing at least one button.");
		if ((this._pressingButtons & this._pressedButtons) != this._pressingButtons) throw new Error("EasyPointers: A pointer is pressing buttons that were not recorded has having been pressed.");
		if ((this._startedWithButton != _ButtonIndex.none) != (this._pressedButtons != _ButtonBitmask.none)) throw new Error("EasyPointers: Whether pointer is has a started button should correspond to whether it has pressed any buttons.");
	}
}

// A helper element for determining the location of the corners of an element's padding box.
// It may be temporarily appended to an element and positioned at the corners.
const _cornerMarker = document.createElement("div");
_cornerMarker.id = "easy-pointers-corner-marker";
_cornerMarker.setAttribute("style", "border: none !important; margin: 0 !important; padding: 0 !important; width: 0 !important; min-width: 0 !important; height: 0 !important; min-height: 0 !important; position: absolute !important; display: block !important; float: none !important; clear: none !important; zoom: none !important; translate: none !important; rotate: none !important; scale: none !important; offset: none !important; transform: none !important;");

// Determine the DOMMatrix of the provided element by measuring the position of a child element.
// This function cannot measure the z axis so it can't be used if the element has preserve-3d.
function _derive2dMatrixOfTransformedElementByAppendingChild(element: HTMLElement): DOMMatrix {
	let clientWidth: number = element.clientWidth;
	let clientHeight: number = element.clientHeight;
	element.appendChild(_cornerMarker);
	_cornerMarker.style.top = "0";
	_cornerMarker.style.left = "0";
	_cornerMarker.style.bottom = "auto";
	_cornerMarker.style.right = "auto";
	const p0: DOMRect = _cornerMarker.getBoundingClientRect();
	const x0: number = p0.x;
	const y0: number = p0.y;
	_cornerMarker.style.left = "auto";
	_cornerMarker.style.right = "0";
	const p1: DOMRect = _cornerMarker.getBoundingClientRect();
	const x1: number = p1.x;
	const y1: number = p1.y;
	_cornerMarker.style.top = "auto";
	_cornerMarker.style.bottom = "0";
	if (element == document.documentElement || element == document.body) {
		// For some reason, the root html element's client dimensions are reported as the viewport
		// dimensions instead, but we can determine the correct dimensions by checking the
		// position of _cornerMarker when it's in the bottom right corner.
		// Also Firefox reports the body element's client dimensions weirdly.
		clientWidth = _cornerMarker.offsetLeft;
		clientHeight = _cornerMarker.offsetTop;
	}
	const p2: DOMRect = _cornerMarker.getBoundingClientRect();
	const x2: number = p2.x;
	const y2: number = p2.y;
	_cornerMarker.style.right = "auto";
	_cornerMarker.style.left = "0";
	const p3: DOMRect = _cornerMarker.getBoundingClientRect();
	const x3: number = p3.x;
	const y3: number = p3.y;
	_cornerMarker.remove();
	
	// See:
	// http://graphics.cs.cmu.edu/courses/15-463/2006_fall/www/Papers/proj.pdf
	// Projective Mappings for Image Warping
	// Paul Heckbert
	// 15-869, Image-Based Modeling and Rendering
	// 13 Sept 1999
	const dx1: number = x1 - x2;
	const dy1: number = y1 - y2;
	const dx2: number = x3 - x2;
	const dy2: number = y3 - y2;
	const sx: number = x0 - x1 + x2 - x3;
	const sy: number = y0 - y1 + y2 - y3;
	let matrix: DOMMatrix;
	if (sx == 0 && sy == 0) {
		const a: number = x1 - x0;
		const b: number = x3 - x0;
		const c: number = x0;
		const d: number = y1 - y0;
		const e: number = y3 - y0;
		const f: number = y0;
		matrix = new DOMMatrix([
			a, d, 0, 0,
			b, e, 0, 0,
			0, 0, 1, 0,
			c, f, 0, 1,
		]);
	} else {
		const denom: number = dx1 * dy2 - dy1 * dx2;
		const g: number = (sx * dy2 - sy * dx2) / denom;
		const h: number = (dx1 * sy - dy1 * sx) / denom;
		const a: number = x1 - x0 + g * x1;
		const b: number = x3 - x0 + h * x3;
		const c: number = x0;
		const d: number = y1 - y0 + g * y1;
		const e: number = y3 - y0 + h * y3;
		const f: number = y0;
		matrix = new DOMMatrix([
			a, d, 0, g,
			b, e, 0, h,
			0, 0, 1, 0,
			c, f, 0, 1,
		]);
	}
	
	matrix.scaleSelf(1/clientWidth, 1/clientHeight);
	
	// The absolutely positioned child provided the padding box dimensions.
	// Convert from padding box to border box since that's what most code expects.
	matrix.translateSelf(-element.clientLeft, -element.clientTop);
	if (element != document.documentElement) {
		matrix.translateSelf(element.scrollLeft, element.scrollTop);
	}
	
	return matrix;
}

/*
// The classic way to project from display coordinates to element coordinates is
// to invert the matrix. But we can do better.
export function projectPointToPlane(px: number, py: number, matrix: DOMMatrix): Point2d {
	const point: DOMPoint = new DOMPoint(px, py, 0);
	const deeperPoint: DOMPoint = new DOMPoint(px, py, 1);
	const inverseMatrix: DOMMatrix = matrix.inverse();
	const transformedPoint: DOMPoint = point.matrixTransform(inverseMatrix);
	const transformedDeeperPoint: DOMPoint = deeperPoint.matrixTransform(inverseMatrix);
	transformedPoint.x /= transformedPoint.w;
	transformedPoint.y /= transformedPoint.w;
	transformedPoint.z /= transformedPoint.w;
	transformedDeeperPoint.x /= transformedDeeperPoint.w;
	transformedDeeperPoint.y /= transformedDeeperPoint.w;
	transformedDeeperPoint.z /= transformedDeeperPoint.w;
	const ratio: number = transformedPoint.z / (transformedPoint.z - transformedDeeperPoint.z);
	const result: DOMPoint = new Point2d(
		transformedPoint.x + (transformedDeeperPoint.x - transformedPoint.x) * ratio || 0,
		transformedPoint.y + (transformedDeeperPoint.y - transformedPoint.y) * ratio || 0,
	);
	return result;
}
/*/
// Project from display coordinates to an element's local coordinates given the element's matrix.
// If the element has a perspective transformation, the element's plane may have a horizon,
// in which case it's possible that the projected ray may point at the "sky", so there are no
// corresponding coordinates and NaNs are returned.
export function projectPointToPlane(px: number, py: number, matrix: DOMMatrix): Point2d {
	// Compute which the x and y coordinates in the box represented by the matrix
	// map to the provided display coordinates.
	let x: number = (
		matrix.m21 * (matrix.m42 - matrix.m44 * py) +
		matrix.m22 * (matrix.m44 * px - matrix.m41) +
		matrix.m24 * (matrix.m41 * py - matrix.m42 * px)
	) / (
		matrix.m11 * (matrix.m22 - matrix.m24 * py) +
		matrix.m12 * (matrix.m24 * px - matrix.m21) +
		matrix.m14 * (matrix.m21 * py - matrix.m22 * px)
	);
	let y: number = (py * (matrix.m14 * x + matrix.m44) - matrix.m12 * x - matrix.m42) / (matrix.m22 - matrix.m24 * py);
	if (isNaN(y)) {
		y = (px * (matrix.m14 * x + matrix.m44) - matrix.m11 * x - matrix.m41) / (matrix.m21 - matrix.m24 * px);
	}
	if (!(x * matrix.m14 + y * matrix.m24 + matrix.m44 >= 0)) {
		// The camera ray is above the horizon and doesn't move toward the plane.
		return new Point2d(NaN, NaN);
	}
	return new Point2d(x, y);
}
//*/

// Possible values of the contain style that force an element to be an offset parent.
const _containStylesForOffsetParent: Set<string> = new Set(["paint", "content", "strict", "layout"]);

// Possible values of the will-change style that force an element to be an offset parent.
const _willChangeStylesForOffsetParent: Set<string> = new Set(["transform", "rotate", "scale", "translate", "perspective", "transform-style", "offset-path", "contain", "filter", "backdrop-filter"]);

function _couldBeOffsetParent(childPosition: string, ancestor: HTMLElement | SVGElement, ancestorStyle: CSSStyleDeclaration): boolean {
	if (ancestor instanceof SVGElement) return true;
	const display: string = ancestorStyle.display;
	if (display == "contents") return false;
	if (childPosition != "fixed") {
		if (ancestorStyle.position != "static") return true;
		if (childPosition != "absolute") {
			if (ancestor == document.documentElement) {
				// If the child isn't fixed or absolute, but no positioned ancestor is found, the root element is the offsetParent.
				return true;
			}
			if (ancestor == document.body) {
				// Parents with transforms would be ordinarily be considered to be offsetParents for static and relative children, but body elements with transforms seem to be an exception even though the body's transform will affect the child's position.
				if (display != "inline") {
					if ((ancestorStyle.zoom ?? "1") != "1" ||
						(ancestorStyle.translate ?? "none") != "none" ||
						(ancestorStyle.rotate ?? "none") != "none" ||
						(ancestorStyle.scale ?? "none") != "none" ||
						ancestorStyle.transform != "none" ||
						(ancestorStyle.offsetPath ?? "none") != "none")
					{
						// Due to a collection of browser misfeatures, transformed body elements are not supported. static and relative child elements report offsets relative to the root html element rather than the body element even if the body has a transform that affects the child element's position, and the body does not report its own offsets so I can't just subtract those from the child's offsets, so there's no way to know the child's offsets from the transformed body, and if the child is static then I can't use the technique of appending children to it to determine its location either.
						throw new Error("EasyPointers: Sorry, EasyPointers does not support body elements with css transforms unless the body element is also a positioned element, e.g. position: relative.");
					}
				}
				return false;
			}
		}
	}
	
	if (display != "inline") {
		if (ancestor != document.documentElement && (ancestorStyle.zoom ?? "1") != "1") {
			throw new Error("EasyPointers: Sorry, EasyPointers does not support elements with css zoom unless the element is also a positioned element, e.g. position: relative.");
		}
		if (ancestorStyle.perspective != "none" ||
			(ancestorStyle.translate ?? "none") != "none" ||
			(ancestorStyle.rotate ?? "none") != "none" ||
			(ancestorStyle.scale ?? "none") != "none" ||
			ancestorStyle.transform != "none" ||
			ancestorStyle.transformStyle != "flat" ||
			(ancestorStyle.offsetPath ?? "none") != "none")
		{
			return true;
		}
	}
	
	return (
		ancestorStyle.filter != "none" ||
		(ancestorStyle.backdropFilter ?? "none") != "none" ||
		(ancestorStyle.contentVisibility ?? "visible") != "visible" ||
		(ancestorStyle.containerType ?? "normal") != "normal" ||
		(ancestorStyle.contain ?? "none").split(" ").some(s => _containStylesForOffsetParent.has(s)) ||
		ancestorStyle.willChange.split(", ").some(s => _willChangeStylesForOffsetParent.has(s))
	);
}

function _getOffsetParent(childPosition: string, element: HTMLElement | SVGElement): HTMLElement | SVGElement | null {
	// See a similar implementation that I used as a reference at:
	// https://github.com/josepharhar/offsetparent-polyfills/blob/main/offsetParent-polyfill.js
	let ancestor: HTMLElement | SVGElement | null = element;
	while (true) {
		if (ancestor.assignedSlot) {
			ancestor = ancestor.assignedSlot;
		} else if (ancestor.parentNode instanceof ShadowRoot) {
			ancestor = ancestor.parentNode.host as HTMLElement | SVGElement;
		} else {
			ancestor = ancestor.parentElement;
		}
		if (ancestor == null) break;
		// TODO: Can I make this style available to the calling function so that it doesn't have to redundantly call getComputedStyle on the same element?
		const ancestorStyle: CSSStyleDeclaration = getComputedStyle(ancestor);
		if (_couldBeOffsetParent(childPosition, ancestor, ancestorStyle)) {
			return ancestor;
		}
	}
	return null;
}

export const enum ElementBox {
	borderBox = "borderBox",
	insideBorder = "insideBorder",
	paddingBox = "paddingBox",
	contentBox = "contentBox",
	imagePixels = "imagePixels",
	svgTransform = "svgTransform",
}

export const enum DisplayBox {
	viewport = "viewport",
	page = "page",
}

function _parseObjectPositionComponent(positionComponent: string, unusedSize: number): number {
	// Possible forms are "___%", "___px", or "calc(100% - ___px)".
	if (positionComponent.charCodeAt(0) == 99) { // "c"
		// Starts with "calc(100% - " and ends with "px)".
		const endOffset: string | undefined = positionComponent.match(/calc\(100% - (.+)px\)/)?.[1];
		return (endOffset == null) ? 0 : unusedSize - parseFloat(endOffset);
	} else if (positionComponent.charCodeAt(positionComponent.length - 1) == 37) { // "%"
		// Ends with a percent, based on unused size.
		return unusedSize * parseFloat(positionComponent) / 100;
	} else {
		// Ends with px, parse as-is.
		return parseFloat(positionComponent);
	}
}

function _imageElementContainsSvg(element: HTMLImageElement): boolean {
	if (element.src.startsWith("data:")) {
		return element.src.startsWith("data:image/svg+xml,");
	} else {
		// Checking the file extension isn't a foolproof way to guess the MIME type, but there isn't really an efficient way to properly check it.
		const fileExtension: string | undefined = (element instanceof HTMLImageElement) ? element.src.match(/\.([^\.?#/]+)(\?.*)?(\#.*)?$/)?.[1]?.toLowerCase() : undefined;
		return (fileExtension == "svg" || fileExtension == "svg");
	}
}

export function getElementMatrix(element: HTMLElement | SVGElement, elementBox?: `${ElementBox}`, displayBox?: `${DisplayBox}`): DOMMatrix {
	const styles: CSSStyleDeclaration = getComputedStyle(element);
	const matrix: DOMMatrix = _getBorderBoxMatrix(element, styles);
	
	if (elementBox == undefined) {	
		elementBox = (element instanceof SVGElement) ? ElementBox.svgTransform : ElementBox.paddingBox;
	}
	
	if (element instanceof SVGElement && elementBox != ElementBox.svgTransform) {
		// TODO: Support borderBox, paddingBox, etc for the SVG root element.
		// (This is difficult, because SVG elements don't have client offsets!)
		throw new Error("EasyPointers: The element box must be svgTransform for SVG elements.");
	}
	
	if (element instanceof HTMLElement) {
		switch (elementBox) {
			case ElementBox.borderBox: {
				// This is already the current coordinate system, nothing left to do.
			} break;
			case ElementBox.insideBorder: {
				matrix.translateSelf(parseFloat(styles.borderLeft), parseFloat(styles.borderTop));
			} break;
			case ElementBox.paddingBox: {
				if (styles.display == "inline") {
					// For inline elements, the reported clientLeft and clientTop are always zero even if there's a border.
					matrix.translateSelf(parseFloat(styles.borderLeft), parseFloat(styles.borderTop));
				} else {
					matrix.translateSelf(
						element.clientLeft - element.scrollLeft,
						element.clientTop - element.scrollTop);
				}
			} break;
			case ElementBox.contentBox: {
				if (styles.display == "inline") {
					matrix.translateSelf(
						parseFloat(styles.borderLeft) + parseFloat(styles.paddingLeft),
						parseFloat(styles.borderTop) + parseFloat(styles.paddingTop));
				} else {
					matrix.translateSelf(
						parseFloat(styles.paddingLeft) + element.clientLeft - element.scrollLeft,
						parseFloat(styles.paddingTop) + element.clientTop - element.scrollTop);
				}
			} break;
			case ElementBox.imagePixels: {
				// SVGs are weird, so try to detect if the image is an SVG.
				let isSvg: boolean = false;
				let intrinsicWidth: number, intrinsicHeight: number, availableWidth: number, availableHeight: number;
				if (element instanceof HTMLImageElement) {
					isSvg = _imageElementContainsSvg(element);
					intrinsicWidth = element.naturalWidth;
					intrinsicHeight = element.naturalHeight;
					availableWidth = element.width;
					availableHeight = element.height;
				} else if (element instanceof HTMLCanvasElement) {
					intrinsicWidth = element.width;
					intrinsicHeight = element.height;
					availableWidth = element.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight);
					availableHeight = element.clientHeight - parseFloat(styles.paddingTop) - parseFloat(styles.paddingBottom);
				} else {
					throw new Error("EasyPointers: Unsupported element type for image box: " + element.tagName);
				}
				
				let renderedWidth: number, renderedHeight: number;
				switch (styles.objectFit) {
					case "fill": {
						if (isSvg) {
							// If the svg's preserveAspectRatio is xMidYMid (which is the default) then its actual behavior is closer to "contain". We can't actually read the preserveAspectRatio so just assume the default.
							const scale: number = Math.min(availableWidth / intrinsicWidth, availableHeight / intrinsicHeight);
							renderedWidth = intrinsicWidth * scale;
							renderedHeight = intrinsicHeight * scale;
						} else {
							// Stretch image to match content box.
							renderedWidth = availableWidth;
							renderedHeight = availableHeight;
						}
					} break;
					case "contain": {
						// Scale image to fit entirely inside content box.
						const scale: number = Math.min(availableWidth / intrinsicWidth, availableHeight / intrinsicHeight);
						renderedWidth = intrinsicWidth * scale;
						renderedHeight = intrinsicHeight * scale;
					} break;
					case "cover": {
						// Scale image to entirely enclose content box.
						const scale: number = Math.max(availableWidth / intrinsicWidth, availableHeight / intrinsicHeight);
						renderedWidth = intrinsicWidth * scale;
						renderedHeight = intrinsicHeight * scale;
					} break;
					case "none": {
						// Display image at natural width.
						renderedWidth = intrinsicWidth;
						renderedHeight = intrinsicHeight;
					} break;
					case "scale-down": {
						// The smaller of "contain" or "none".
						const scale: number = Math.min(1, Math.min(availableWidth / intrinsicWidth, availableHeight / intrinsicHeight));
						renderedWidth = intrinsicWidth * scale;
						renderedHeight = intrinsicHeight * scale;
					} break;
					default: throw new Error("EasyPointers: Unrecognized object-fit style value:" + styles.objectFit);
				}
				
				const stylePosMatch: RegExpMatchArray | null = styles.objectPosition.match(/(calc\([^\)]*\)|[^\(]+%|[^\(]*px)\s+(calc\([^\)]*\)|[^\(]+%|[^\(]*px)/);
				const posLeft: number = _parseObjectPositionComponent(stylePosMatch?.[1] ?? "50%", availableWidth - renderedWidth);
				const posTop: number = _parseObjectPositionComponent(stylePosMatch?.[2] ?? "50%", availableHeight - renderedHeight);
				const contentLeft: number = parseFloat(styles.paddingLeft) + element.clientLeft;
				const contentTop: number = parseFloat(styles.paddingTop) + element.clientTop;
				const imageLeft: number = contentLeft + posLeft;
				const imageTop: number = contentTop + posTop;
				
				matrix.translateSelf(imageLeft, imageTop);
				matrix.scaleSelf(renderedWidth / intrinsicWidth, renderedHeight / intrinsicHeight);
			} break;
			case ElementBox.svgTransform: {
				throw new Error("EasyPointers: svgTransform unsupported for HTML elements.");
			}// break; // unreachable code because of the throw.
			default: throw new Error("EasyPointers: Unrecognized element box: " + elementBox);
		}
	}
	
	switch (displayBox ?? DisplayBox.viewport) {
		case DisplayBox.viewport: {
			// Already in viewport coordinates by default.
		} break;
		case DisplayBox.page: {
			matrix.preMultiplySelf(new DOMMatrix().translateSelf(
					window.scrollX, window.scrollY));
		} break;
		default: throw new Error("EasyPointers: Unrecognized display box: " + displayBox);
	}
	
	return matrix;
}

export function getElementDimensions(element: HTMLElement, elementBox: `${ElementBox}` = ElementBox.paddingBox): {width: number, height: number} {
	const styles: CSSStyleDeclaration = getComputedStyle(element);
	switch (elementBox) {
		case ElementBox.borderBox: {
			return {width: element.offsetWidth, height: element.offsetHeight};
		} break;
		case ElementBox.insideBorder: {
			return {
				width: element.offsetWidth - parseFloat(styles.borderLeft) - parseFloat(styles.borderRight),
				height: element.offsetHeight - parseFloat(styles.borderTop) - parseFloat(styles.borderBottom),
			};
		} break;
		case ElementBox.paddingBox: {
			if (styles.display == "inline") {
				// For inline elements, the reported scrollWidth and scrollHeight are always zero even if there's a border.
				return {
					width: element.offsetWidth - parseFloat(styles.borderLeft) - parseFloat(styles.borderRight),
					height: element.offsetHeight - parseFloat(styles.borderTop) - parseFloat(styles.borderBottom),
				};
			} else {
				return {width: element.scrollWidth, height: element.scrollHeight};
			}
		} break;
		case ElementBox.contentBox: {
			if (styles.display == "inline") {
				return {
					width: element.offsetWidth - parseFloat(styles.borderLeft) - parseFloat(styles.borderRight) - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight),
					height: element.offsetHeight - parseFloat(styles.borderTop) - parseFloat(styles.borderBottom) - parseFloat(styles.paddingTop) - parseFloat(styles.paddingBottom),
				};
			} else {
				return {
					width: element.scrollWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight),
					height: element.scrollHeight - parseFloat(styles.paddingTop) - parseFloat(styles.paddingBottom),
				};
			}
		} break;
		case ElementBox.imagePixels: {
			if (element instanceof HTMLImageElement) {
				return {width: element.naturalWidth, height: element.naturalHeight};
			} else if (element instanceof HTMLCanvasElement) {
				return {width: element.width, height: element.height};
			} else {
				throw new Error("EasyPointers: Unsupported element type for image box: " + element.tagName);
			}
		} break;
		case ElementBox.svgTransform: {
			throw new Error("EasyPointers: svgTransform unsupported for HTML elements.");
		}// break; // unreachable code because of the throw.
		default: throw new Error("EasyPointers: Unrecognized element box: " + elementBox);
	}
}

// Apparently void elements allow you to use JavaScript to append children and many of them will even render the child!
//const _voidElements: Set<string> = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "keygen", "link", "meta", "param", "source", "track", "wbr"]);
const _elementsThatDoNotRenderChildren: Set<string> = new Set(["audio", "br", "canvas", "embed", "iframe", "img", "input", "object", "optgroup", "option", "progress", "select", "textarea", "video", "wbr"]);

function _getBorderBoxMatrix(element: HTMLElement | SVGElement, styles: CSSStyleDeclaration): DOMMatrix {
	if (element instanceof SVGElement) {
		const svgMatrix: SVGMatrix | DOMMatrix | null = (element as SVGGraphicsElement).getScreenCTM?.();
	if (!svgMatrix) throw new Error("EasyPointers: Could not get transform matrix of SVG Element.");
		const domMatrix: DOMMatrix = ((svgMatrix as any) instanceof DOMMatrix) ? svgMatrix : new DOMMatrix([svgMatrix.a, svgMatrix.b, svgMatrix.c, svgMatrix.d, svgMatrix.e, svgMatrix.f]);
		if (element instanceof SVGForeignObjectElement) {
			const bbox: DOMRect = element.getBBox();
			domMatrix.translateSelf(bbox.x, bbox.y);
		}
		return domMatrix;
	}
	
	const position: string = styles.position;
	
	/*
	// If we knew that the element's ancestors did not have any shadow doms, then we could rely on its offsetParent property, except for the case of the body element or html element.
	let offsetParent = element.offsetParent ?? document.body;
	let parentStyle = offsetParent ? getComputedStyle(offsetParent) : null;
	if (offsetParent == document.body) {
		// The spec says that an element's offsetParent property should return the body element if there isn't any positioned ancestor. Unfortunately, that means that if body is returned, that doesn't tell us whether the body is actually the offsetParent or whether there isn't any! We have to guess based on the parent's styles.
		if (!_couldBeOffsetParent(position, offsetParent, parentStyle)) {
			offsetParent = document.documentElement;
			parentStyle = getComputedStyle(offsetParent);
			if (!_couldBeOffsetParent(position, offsetParent, parentStyle)) {
				offsetParent = null;
				parentStyle = null;
			}
		}
	}
	/*/
	// Unfortunately, element.offsetParent pretends that shadow DOMs don't exist, so the logic for determining the offsetParent has to be reimplemented entirely. :(
	const offsetParent: HTMLElement | SVGElement | null = _getOffsetParent(position, element);
	const parentStyle: CSSStyleDeclaration | null = offsetParent ? getComputedStyle(offsetParent) : null;
	//*/
	
	
	let perspective: number | null = null;
	let perspectiveOriginX: number | null = null;
	let perspectiveOriginY: number | null = null;
	const parentPerspective: string = parentStyle?.perspective ?? "none";
	if (parentPerspective != "none") {
		perspective = parseFloat(parentPerspective);
		const perspectiveOrigin: string[] = (parentStyle?.perspectiveOrigin ?? "0px 0px").split(" ");
		perspectiveOriginX = parseFloat(perspectiveOrigin[0]);
		perspectiveOriginY = parseFloat(perspectiveOrigin[1]);
	}
	
	// It turns out that manually zooming and high-dpi screens affect the root element's zoom, but event.clientX&Y already takes this into account, so we should just ignore it apparently?
	const zoom: string = (element == document.documentElement)
		? "1"
		: styles.zoom ?? "1";
	const translate: string = styles.translate ?? "none";
	const rotate: string = styles.rotate ?? "none";
	const scale: string = styles.scale ?? "none";
	const transform: string = styles.transform;
	const hasOffsetPath: boolean = (styles.offsetPath ?? "none") != "none";
	const displayIsInline: boolean = (styles.display == "inline");
	const usesTransforms: boolean = !displayIsInline && (
		zoom != "1" ||
		translate != "none" ||
		rotate != "none" ||
		scale != "none" ||
		transform != "none" ||
		perspective != null ||
		hasOffsetPath
	);
	
	let preserve3d: boolean = false;
	if (styles.transformStyle == "preserve-3d") {
		const supportsPreserve3d: boolean = 
			["visible", "clip"].includes(styles.overflow) &&
			styles.opacity == "1" &&
			styles.filter == "none" &&
			(styles.backdropFilter ?? "none") == "none" &&
			(styles.clip ?? "auto") == "auto" &&
			(styles.clipPath ?? "none") == "none" &&
			styles.isolation != "isolate" &&
			styles.mixBlendMode == "normal" &&
			(styles.contentVisibility ?? "visible") == "visible";
		if (supportsPreserve3d) {
			preserve3d = true;
		}
	}
	
	const hasReportedOffsets: boolean = (element != document.body && element != document.documentElement && element instanceof HTMLElement);
	// If an element doesn't have reliable offsets, we can still use getBoundingClientRect to find its position, unless it has transforms.
	// In theory we could reimplement offsetPath but it's not worth the effort, just use a fall-back strategy in that case too.
	let mustDeriveTransformFromChildren: boolean = (!hasReportedOffsets && usesTransforms) || hasOffsetPath;
	
	if (element == document.body && !usesTransforms) {
		// As a special case, if the root html element has transforms, those should affect the body too even if the body doesn't have any transforms and doesn't report the html element as an offsetParent.
		const htmlStyles: CSSStyleDeclaration = getComputedStyle(document.documentElement);
		if (htmlStyles.perspective != "none" ||
				(htmlStyles.translate ?? "none") != "none" ||
				(htmlStyles.rotate ?? "none") != "none" ||
				(htmlStyles.scale ?? "none") != "none" ||
				htmlStyles.transform != "none" ||
				(htmlStyles.offsetPath ?? "none") != "none")
		{
			if (position == "static") {
				throw new Error("EasyPointers: Can't determine how the root html element's transform affects the body element if the body isn't a positioned element.");
			} else {
				mustDeriveTransformFromChildren = true;
			}
		}
	}
	
	if (mustDeriveTransformFromChildren) {
		// It won't tell you about z-axis translation, which means this technique isn't compatible with preserve-3d. Throw an error if you encounter this case? If possible, the error should describe which combination of things resulted in taking the code path that ended in the error, e.g. is it because the element is a body element or because it has offset-path and also it has preserve-3d?
		const canDeriveTransformFromChildren: boolean = (usesTransforms || position != "static") && !_elementsThatDoNotRenderChildren.has(element.tagName.toLowerCase()) && !preserve3d;
		if (!canDeriveTransformFromChildren) {
			throw new Error("EasyPointers: Can't compute the transform of a the element: " + element.tagName + "#" + element.id + "." + element.className);
		}
		return _derive2dMatrixOfTransformedElementByAppendingChild(element);
	}
	
	let offsetLeft: number = 0;
	let offsetTop: number = 0;
	if (hasReportedOffsets) {
		offsetLeft = element.offsetLeft;
		offsetTop = element.offsetTop;
		// Unfortunately, if the true offset parent is inside of a shadow dom, the element's reported offset position will be inaccurate, so we have to subtract the offset positions of some ancestors.
		// See a similar implementation that I used as a reference at:
		// https://github.com/josepharhar/offsetparent-polyfills/blob/main/offsetParent-polyfill.js
		const domScopes: Set<Node> = new Set();
		for (let scope = element.getRootNode(); scope; scope = (scope as ShadowRoot).host?.getRootNode()) {
			domScopes.add(scope);
		}
		let offsetAncestor: HTMLElement | SVGElement | null = offsetParent;
		while (offsetAncestor && !domScopes.has(offsetAncestor.getRootNode())) {
			if (offsetAncestor instanceof SVGElement) throw new Error("EasyPointers: Can't determine matrix of an HTMLElement that is in the slot of a shadow dom that contains SVGElements.");
			offsetLeft -= offsetAncestor.offsetLeft;
			offsetTop -= offsetAncestor.offsetTop;
			// TODO: Can I reuse this computed value from somewhere else?
			const ancestorPosition: string = getComputedStyle(offsetAncestor).position ?? "static";
			offsetAncestor = _getOffsetParent(ancestorPosition, offsetAncestor);
		}
	}
	
	let parentPaddingX: number = 0;
	let parentPaddingY: number = 0;
	let matrix: DOMMatrix;
	if (!hasReportedOffsets) {
		// Fall back on getBoundingClientRect() for elements that don't have reliable offset information. Note that this won't work with transforms.
		const bounds = element.getBoundingClientRect();
		offsetLeft = bounds.left;
		offsetTop = bounds.top;
		matrix = new DOMMatrix();
	} else if (offsetParent != null) {
		matrix = _getBorderBoxMatrix(offsetParent, parentStyle!);
		// Convert to padding box, child position is relative to that.
		parentPaddingX += offsetParent.clientLeft;
		parentPaddingY += offsetParent.clientTop;
		if (offsetParent != document.documentElement) {
			parentPaddingX -= offsetParent.scrollLeft;
			parentPaddingY -= offsetParent.scrollTop;
		}
		
		let parent: HTMLElement | null = element.parentElement;
		while (parent != null && parent != document.documentElement && parent != offsetParent) {
			offsetLeft -= parent.scrollLeft;
			offsetTop	-= parent.scrollTop;
			parent = parent.parentElement;
		}
	} else {
		// Elements with position: fixed; do not have an offsetParent but may have offsetLeft/Top relative to the viewport.
		//parentPaddingX += element.offsetLeft;
		//parentPaddingY += element.offsetTop;
		matrix = new DOMMatrix();
		if (position != "fixed") {
			// Absolute elements, on the other hand, are affected by scrolling.
			parentPaddingX -= window.scrollX;
			parentPaddingY -= window.scrollY;
		}
	}
	
	if (!usesTransforms) {
		matrix.translateSelf(parentPaddingX + offsetLeft, parentPaddingY + offsetTop);
	} else {
		
		let combinedTransform: string = "";
		
		if (perspective != null) {
			combinedTransform += `translate(${perspectiveOriginX}px, ${perspectiveOriginY}px) `;
			combinedTransform += `perspective(${perspective}px) `;
			combinedTransform += `translate(${-perspectiveOriginX!}px, ${-perspectiveOriginY!}px) `;
		}
		
		if (parentPaddingX != 0 || parentPaddingY != 0) {
			combinedTransform += `translate(${parentPaddingX}px, ${parentPaddingY}px) `;
		}
		
		if (zoom != "1") {
			combinedTransform += `scale(${zoom}) `;
		}
		
		if (offsetLeft != 0 || offsetTop != 0) {
			combinedTransform += `translate(${offsetLeft}px, ${offsetTop}px) `;
		}
		
		const transformOrigin: string[] = styles.transformOrigin.split(" ");
		const negatedOrigin: string[] = transformOrigin.map(c => c.charCodeAt(0) == 45 /* "-" */ ? c.slice(1) : "-" + c);
		let originTranslate = `translate(${transformOrigin.slice(0, 2).join(", ")}) `;
		let reverseTranslate = `translate(${negatedOrigin.slice(0, 2).join(", ")}) `;
		if (transformOrigin.length == 3) originTranslate += ` translateZ(${transformOrigin[2]})`;
		if (negatedOrigin.length == 3) reverseTranslate += ` translateZ(${negatedOrigin[2]})`;
		
		combinedTransform += originTranslate;
		
		if (translate != "none") {
			const components: string[] = translate.split(" ");
			if (components[0].charCodeAt(components[0].length - 1) == 37) { // "%"
				components[0] = parseFloat(components[0]) / 100 * element.offsetWidth + "px";
			}
			if (components.length >= 2 && components[1].charCodeAt(components[1].length - 1) == 37) { // "%"
				components[1] = parseFloat(components[1]) / 100 * element.offsetHeight + "px";
			}
			if (components.length < 3) {
				combinedTransform += `translate(${components.join(", ")}) `;
			} else if (components.length == 3) {
				combinedTransform += `translate3d(${components.join(", ")}) `;
			}
		}
		
		if (rotate != "none") {
			const components: string[] = rotate.split(" ");
			if (components.length == 1) {
				combinedTransform += `rotate(${components[0]}) `;
			} else if (components.length == 2) {
				combinedTransform += `rotate${components[0].toUpperCase()}(${components[1]}) `;
			} else if (components.length == 4) {
				combinedTransform += `rotate3d(${components.join(", ")}) `;
			}
		}
		
		if (scale != "none") {
			const components: string[] = scale.split(" ");
			if (components.length < 3) {
				combinedTransform += `scale(${components.join(", ")}) `;
			} else if (components.length == 3) {
				combinedTransform += `scale3d(${components.join(", ")}) `;
			}
		}
		
		if (transform != "none") {
			combinedTransform += transform;
		}
		
		combinedTransform += reverseTranslate;
		
		matrix.multiplySelf(new DOMMatrix(combinedTransform));
		
		if (!preserve3d) {
			matrix.m13 = matrix.m23 = matrix.m43 = matrix.m31 = matrix.m32 = matrix.m34 = 0;
			matrix.m33 = 1;
		}
	}
	
	return matrix;
}

type _Point = {x: number, y: number};

export class Point2d extends DOMPoint {
	constructor(x: number, y: number) {
		super(x, y);
	}
	public static copyOf(other: _Point): Point2d {
		return new Point2d(other.x, other.y);
	}
	public equals(other: _Point | number, y?: number): boolean {
		if (typeof other == "number") {
			return this.x == other && this.y == (y ?? 0);
		} else {
			return this.x == other.x && this.y == other.y;
		}
	}
	public distanceFrom(other: _Point | number, y?: number): number {
		if (typeof other == "number") {
			const dx: number = this.x - other;
			const dy: number = this.y - (y ?? 0);
			return Math.sqrt(dx * dx + dy * dy);
		} else {
			const dx: number = this.x - other.x;
			const dy: number = this.y - other.y;
			return Math.sqrt(dx * dx + dy * dy);
		}
	}
	public addToSelf(other: _Point | number, y?: number): this {
		if (typeof other == "number") {
			this.x += other;
			this.y += y ?? 0;
		} else {
			this.x += other.x;
			this.y += other.y;
		}
		return this;
	}
	public subtractFromSelf(other: _Point | number, y?: number): this {
		if (typeof other == "number") {
			this.x -= other;
			this.y -= y ?? 0;
		} else {
			this.x -= other.x;
			this.y -= other.y;
		}
		return this;
	}
	public scaleSelfBy(v: number): this {
		this.x *= v;
		this.y *= v;
		return this;
	}
}
