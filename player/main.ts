// Copyright (C) 2019 John Nesky, distributed under the MIT license.

/// <reference path="../synth/SynthConfig.ts" />
/// <reference path="../editor/ColorConfig.ts" />
/// <reference path="../synth/synth.ts" />
/// <reference path="../editor/html.ts" />

namespace beepbox {
	const {a, button, div, h1, input} = HTML;
	const {svg, rect, path, text} = SVG;
	
	let prevHash: string | null = null;
	const textHeight: number = 12;
	let id: string = ((Math.random() * 0xffffffff) >>> 0).toString(16);
	let pauseButtonDisplayed: boolean = false;
	let animationRequest: number | null;
	
	const synth: Synth = new Synth();
	let titleText: HTMLHeadingElement = h1({style: "flex-grow: 1; margin: 0 1px;"}, "");
	let editLink: HTMLAnchorElement = a({target: "_top", style: "margin: 0 4px;"}, "✎ Edit");
	let copyLink: HTMLAnchorElement = a({href: "javascript:void(0)", style: "margin: 0 4px;"}, "⎘ Copy URL");
	let shareLink: HTMLAnchorElement = a({href: "javascript:void(0)", style: "margin: 0 4px;"}, "⤳ Share");
	let fullscreenLink: HTMLAnchorElement = a({target: "_top", style: "margin: 0 4px;"}, "⇱ Fullscreen");
	
	let draggingPlayhead: boolean = false;
	const playIcon: SVGSVGElement = svg({viewBox: "-50, -50, 100, 100", style: "width: 100%; height: 100%"},
		svg({y: -10, overflow: "visible"}, path({d: "M 25 0 L -15 21.65 L -15 -21.65 z", fill: "white"})),
		text({x: 0, y: 35, "text-anchor": "middle", "font-size":"22px", fill: "currentColor"}, "Play"),
	);
	const pauseIcon: SVGSVGElement = svg({viewBox: "-50, -50, 100, 100", style: "width: 100%; height: 100%"},
		rect({x: -15, y: -30, width: 10, height: 40, fill: "white"}),
		rect({x: 5, y: -30, width: 10, height: 40, fill: "white"}),
		text({x: 0, y: 35, "text-anchor": "middle", "font-size":"22px", fill: "currentColor"}, "Pause"),
	);
	const playButton: HTMLButtonElement = button({style: "width: 100%; height: 100%;"}, 
		playIcon,
		pauseIcon,
	);
	const playButtonContainer: HTMLDivElement = div({style: "flex-shrink: 0; padding: 2px; box-sizing: border-box;"},
		playButton,
	);
	const loopIcon: SVGPathElement = path({d: "M 4 2 L 4 0 L 7 3 L 4 6 L 4 4 Q 2 4 2 6 Q 2 8 4 8 L 4 10 Q 0 10 0 6 Q 0 2 4 2 M 8 10 L 8 12 L 5 9 L 8 6 L 8 8 Q 10 8 10 6 Q 10 4 8 4 L 8 2 Q 12 2 12 6 Q 12 10 8 10 z"});
	const loopButton: HTMLButtonElement = button({title: "loop", style: "background: none; flex: 0 0 12px; margin: 0 1px;"}, svg({viewBox: "0 0 12 12"},
		loopIcon,
	));
	const volumeIcon: SVGSVGElement = svg({style: "flex: 0 0 12px; margin: 0 1px;", viewBox: "0 0 12 12"},
		path({fill: "#444444", d: "M 1 9 L 1 3 L 4 3 L 7 0 L 7 12 L 4 9 L 1 9 M 9 3 Q 12 6 9 9 L 8 8 Q 10.5 6 8 4 L 9 3 z"}),
	);
	const volumeSlider: HTMLInputElement = input({title: "volume", type: "range", value: 75, min: 0, max: 100, step: 1, style: "width: 12vw; max-width: 100px; margin: 0 1px;"});
	const timeline: SVGSVGElement = svg({style: "min-width: 0; min-height: 0;"});
	const playhead: HTMLDivElement = div({style: "position: absolute; left: 0; top: 0; width: 2px; height: 100%; background: white; pointer-events: none;"});
	
	document.body.style.display = "flex";
	document.body.appendChild(playButtonContainer);
	document.body.appendChild(
		div({style: "display: flex; flex-direction: column; flex-grow: 1; align-items: stretch;"},
			div({style: "flex: 1 1 0; position: relative; width: 0; height: 0;"},
				timeline,
				playhead,
			),
			div({style: "flex: 0 0 12px; height: 12px; display: flex;"},
				loopButton,
				volumeIcon,
				volumeSlider,
				titleText,
				editLink,
				copyLink,
				shareLink,
				fullscreenLink,
			),
		),
	);
	
	function hashUpdatedExternally(): void {
		let myHash: string = location.hash;
		if (prevHash == myHash || myHash == "") return;
		
		prevHash = myHash;
		
		if (myHash.charAt(0) == "#") {
			myHash = myHash.substring(1);
		}
		
		//titleText.textContent = "";
		
		fullscreenLink.setAttribute("href", location.href);
		
		for (const parameter of myHash.split("&")) {
			let equalsIndex: number = parameter.indexOf("=");
			if (equalsIndex != -1) {
				let paramName: string = parameter.substring(0, equalsIndex);
				let value: string = parameter.substring(equalsIndex + 1);
				switch (paramName) {
					case "song":
						synth.setSong(value);
						synth.snapToStart();
						editLink.setAttribute("href", "../#" + value);
						break;
					//case "title":
					//	titleText.textContent = decodeURIComponent(value);
					//	break;
					case "loop":
						synth.loopRepeatCount = (value != "1") ? 0 : -1;
						renderLoopIcon();
						break;
				}
			} else {
				synth.setSong(myHash);
				synth.snapToStart();
				editLink.setAttribute("href", "../#" + myHash);
			}
		}
		
		renderTimeline();
	}
	
	function computePlayerHeight(): number {
		return Math.min(Math.min(window.innerHeight, window.innerWidth / 4), textHeight + 3 * Config.windowPitchCount + 1);
	}
	
	function computeTimelineWidth(): number {
		return window.innerWidth - computePlayerHeight();
	}
	
	function onWindowResize(): void {
		renderTimeline();
	}
	
	function animate(): void {
		if (synth.playing) {
			animationRequest = requestAnimationFrame(animate);
			if (localStorage.getItem("playerId") != id) {
				onTogglePlay();
			}
			renderPlayhead();
		}
		
		if (pauseButtonDisplayed != synth.playing) {
			renderPlayButton();
		}
	}
	
	function onTogglePlay(): void {
		if (synth.song != null) {
			if (animationRequest != null) cancelAnimationFrame(animationRequest);
			animationRequest = null;
			if (synth.playing) {
				synth.pause();
			} else {
				synth.play();
				localStorage.setItem("playerId", id);
				animate();
			}
		}
		renderPlayButton();
	}
	
	function onToggleLoop(): void {
		if (synth.loopRepeatCount == -1) {
			synth.loopRepeatCount = 0;
		} else {
			synth.loopRepeatCount = -1;
		}
		renderLoopIcon();
	}
	
	function onVolumeChange(): void {
		localStorage.setItem("volume", volumeSlider.value);
		setSynthVolume();
	}
	
	function onTimelineMouseDown(event: MouseEvent): void {
		draggingPlayhead = true;
		onTimelineMouseMove(event);
	}
	
	function onTimelineMouseUp(event: MouseEvent): void {
		draggingPlayhead = false;
	}
	
	function onTimelineMouseMove(event: MouseEvent): void {
		if (draggingPlayhead) {
			if (synth.song != null) {
				const boundingRect: ClientRect = timeline.getBoundingClientRect();
				const mouseX = ((event.clientX || event.pageX) - boundingRect.left);
				synth.playhead = synth.song.barCount * mouseX / (boundingRect.right - boundingRect.left);
			}
			renderPlayhead();
		}
	}
	
	function setSynthVolume(): void {
		const volume: number = +volumeSlider.value;
		synth.volume = Math.min(1.0, Math.pow(volume / 50.0, 0.5)) * Math.pow(2.0, (volume - 75.0) / 25.0);
	}
	
	function renderPlayhead(): void {
		if (synth.song != null) {
			const timelineWidth: number = computeTimelineWidth();
			let pos: number = timelineWidth * synth.playhead / synth.song.barCount;
			playhead.style.left = pos + "px";
		}
	}
	
	function renderTimeline(): void {
		const playerHeight: number = computePlayerHeight();
		const timelineWidth: number = computeTimelineWidth();
		const timelineHeight: number = playerHeight - textHeight;
		
		playButtonContainer.style.width = playerHeight + "px";
		playButtonContainer.style.height = playerHeight + "px";
		
		timeline.innerHTML = "";
		if (synth.song == null) return;
		
		timeline.style.width = timelineWidth + "px";
		timeline.style.height = timelineHeight + "px";
		
		let barWidth: number = timelineWidth / synth.song.barCount;
		let partWidth: number = barWidth / (synth.song.beatsPerBar * Config.partsPerBeat);
		let wavePitchHeight: number = (timelineHeight-1) / Config.windowPitchCount;
		let drumPitchHeight: number =  (timelineHeight-1) / Config.drumCount;
		
		for (let octave: number = 0; octave < 4; octave++) {
			timeline.appendChild(rect({x: 0, y: octave * 12 * wavePitchHeight, width: timelineWidth, height: wavePitchHeight + 1, fill: "#664933"}));
		}
		
		for (let bar: number = 0; bar < synth.song.barCount + 1; bar++) {
			const color: string = (bar == synth.song.loopStart || bar == synth.song.loopStart + synth.song.loopLength) ? "#8866ff" : "#444444"
			timeline.appendChild(rect({x: bar * barWidth - 1, y: 0, width: 2, height: timelineHeight, fill: color}));
		}
		
		for (let channel: number = synth.song.channels.length - 1; channel >= 0; channel--) {
			const isNoise: boolean = synth.song.getChannelIsNoise(channel);
			let pitchHeight: number = isNoise ? drumPitchHeight : wavePitchHeight;
			let offsetY: number = synth.song.channels[channel].octave * pitchHeight * 12 + timelineHeight - pitchHeight * 0.5 - 0.5;
			
			for (let bar: number = 0; bar < synth.song.barCount; bar++) {
				let pattern: Pattern | null = synth.song.getPattern(channel, bar);
				if (pattern == null) continue;
				let offsetX: number = bar * barWidth;
				
				for (let i: number = 0; i < pattern.notes.length; i++) {
					let note: Note = pattern.notes[i];
					
					for (const pitch of note.pitches) {
						const d: string = drawNote(pitch, note.start, note.pins, (pitchHeight + 1) / 2, offsetX, offsetY, partWidth, pitchHeight);
						timeline.appendChild(path({d: d, fill: ColorConfig.getChannelColor(synth.song, channel).channelBright}));
					}
				}
			}
		}
		
		renderPlayhead();
	}
	
	function drawNote(pitch: number, start: number, pins: NotePin[], radius: number, offsetX: number, offsetY: number, partWidth: number, pitchHeight: number): string {
		let d: string = `M ${offsetX + partWidth * (start + pins[0].time)} ${offsetY - pitch * pitchHeight + radius * (pins[0].volume / 3.0)} `; 
		for (let i: number = 0; i < pins.length; i++) {
			const pin: NotePin = pins[i];
			const x:   number = offsetX + partWidth * (start + pin.time);
			const y: number = offsetY - pitchHeight * (pitch + pin.interval);
			const expression: number = pin.volume / 3.0;
			d += `L ${x} ${y - radius * expression} `;
		}
		for (let i: number = pins.length - 1; i >= 0; i--) {
			const pin: NotePin = pins[i];
			const x:   number = offsetX + partWidth * (start + pin.time);
			const y: number = offsetY - pitchHeight * (pitch + pin.interval);
			const expression: number = pin.volume / 3.0;
			d += `L ${x} ${y + radius * expression} `;
		}
		return d;
	}
	
	function renderPlayButton(): void {
		if (synth.playing) {
			playIcon.style.display = "none";
			pauseIcon.style.display = "";
		} else {
			playIcon.style.display = "";
			pauseIcon.style.display = "none";
		}
		pauseButtonDisplayed = synth.playing;
	}
	
	function renderLoopIcon(): void {
		loopIcon.setAttribute("fill", (synth.loopRepeatCount == -1) ? "#8866ff" : "#444444");
	}
	
	function onKeyPressed(event: KeyboardEvent): void {
		switch (event.keyCode) {
			case 32: // space
				onTogglePlay();
				event.preventDefault();
				break;
			case 219: // left brace
				synth.prevBar();
				renderPlayhead();
				event.preventDefault();
				break;
			case 221: // right brace
				synth.nextBar();
				renderPlayhead();
				event.preventDefault();
				break;
		}
	}
	
	function onCopyClicked(): void {
		const text: HTMLInputElement = document.createElement("input");
		document.body.appendChild(text);
		text.value = location.href;
		text.select();
		text.setSelectionRange(0, 99999); // For mobile devices
		document.execCommand("copy");
		document.body.removeChild(text);
	}
	
	function onShareClicked(): void {
		(<any>navigator).share({ url: location.href });
	}
	
	if ( top !== self ) {
		// In an iframe.
		copyLink.style.display = "none";
		shareLink.style.display = "none";
	} else {
		// Fullscreen.
		fullscreenLink.style.display = "none";
		if (!("share" in navigator)) shareLink.style.display = "none";
	}
	
	if (localStorage.getItem("volume") != null) {
		volumeSlider.value = localStorage.getItem("volume")!;
	}
	setSynthVolume();
	
	window.addEventListener("resize", onWindowResize);
	window.addEventListener("keydown", onKeyPressed);
	timeline.addEventListener("mousedown", onTimelineMouseDown);
	window.addEventListener("mouseup", onTimelineMouseUp);
	window.addEventListener("mousemove", onTimelineMouseMove);
	playButton.addEventListener("click", onTogglePlay);
	loopButton.addEventListener("click", onToggleLoop);
	volumeSlider.addEventListener("input", onVolumeChange);
	copyLink.addEventListener("click", onCopyClicked);
	shareLink.addEventListener("click", onShareClicked);
	window.addEventListener("hashchange", hashUpdatedExternally);
	
	hashUpdatedExternally();
	renderLoopIcon();
	renderPlayButton();
}
