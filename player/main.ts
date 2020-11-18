// Copyright (C) 2020 John Nesky, distributed under the MIT license.

import { Dictionary, DictionaryArray, EnvelopeType, InstrumentType, Transition, Chord, Envelope, Config } from "../synth/SynthConfig";
import { ColorConfig } from "../editor/ColorConfig";
import { NotePin, Note, Pattern, Instrument, Channel, Synth } from "../synth/synth";
import { HTML, SVG } from "imperative-html/dist/esm/elements-strict";

//namespace beepbox {
const { a, button, div, h1, input } = HTML;
const { svg, circle, rect, path } = SVG;

document.head.appendChild(HTML.style({ type: "text/css" }, `
		body {
			color: ${ColorConfig.primaryText};
			background: ${ColorConfig.editorBackground};
		}
		h1 {
			font-weight: bold;
			font-size: 14px;
			line-height: 22px;
			text-align: initial;
			margin: 0;
		}
		a {
			font-weight: bold;
			font-size: 12px;
			line-height: 22px;
			white-space: nowrap;
			color: ${ColorConfig.linkAccent};
		}
		button {
			margin: 0;
			padding: 0;
			position: relative;
			border: none;
			border-radius: 5px;
			background: ${ColorConfig.uiWidgetBackground};
			color: ${ColorConfig.primaryText};
			cursor: pointer;
			font-size: 14px;
			font-family: inherit;
		}
		button:hover, button:focus {
			background: ${ColorConfig.uiWidgetFocus};
		}
		.playButton, .pauseButton {
			padding-left: 24px;
			padding-right: 6px;
		}
		.playButton::before {
			content: "";
			position: absolute;
			left: 6px;
			top: 50%;
			margin-top: -6px;
			width: 12px;
			height: 12px;
			pointer-events: none;
			background: ${ColorConfig.primaryText};
			-webkit-mask-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="-6 -6 12 12"><path d="M 6 0 L -5 6 L -5 -6 z" fill="gray"/></svg>');
			-webkit-mask-repeat: no-repeat;
			-webkit-mask-position: center;
			mask-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="-6 -6 12 12"><path d="M 6 0 L -5 6 L -5 -6 z" fill="gray"/></svg>');
			mask-repeat: no-repeat;
			mask-position: center;
		}
		.pauseButton::before {
			content: "";
			position: absolute;
			left: 6px;
			top: 50%;
			margin-top: -6px;
			width: 12px;
			height: 12px;
			pointer-events: none;
			background: ${ColorConfig.primaryText};
			-webkit-mask-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="-6 -6 12 12"><rect x="-5" y="-6" width="3" height="12" fill="gray"/><rect x="2"  y="-6" width="3" height="12" fill="gray"/></svg>');
			-webkit-mask-repeat: no-repeat;
			-webkit-mask-position: center;
			mask-image: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="-6 -6 12 12"><rect x="-5" y="-6" width="3" height="12" fill="gray"/><rect x="2"  y="-6" width="3" height="12" fill="gray"/></svg>');
			mask-repeat: no-repeat;
			mask-position: center;
		}
		
		input[type=range] {
			-webkit-appearance: none;
			appearance: none;
			height: 16px;
			margin: 0;
			cursor: pointer;
			background-color: ${ColorConfig.editorBackground};
			touch-action: pan-y;
		}
		input[type=range]:focus {
			outline: none;
		}
		input[type=range]::-webkit-slider-runnable-track {
			width: 100%;
			height: 4px;
			cursor: pointer;
			background: ${ColorConfig.uiWidgetBackground};
		}
		input[type=range]::-webkit-slider-thumb {
			height: 16px;
			width: 4px;
			border-radius: 2px;
			background: ${ColorConfig.primaryText};
			cursor: pointer;
			-webkit-appearance: none;
			margin-top: -6px;
		}
		input[type=range]:focus::-webkit-slider-runnable-track, input[type=range]:hover::-webkit-slider-runnable-track {
			background: ${ColorConfig.uiWidgetFocus};
		}
		input[type=range]::-moz-range-track {
			width: 100%;
			height: 4px;
			cursor: pointer;
			background: ${ColorConfig.uiWidgetBackground};
		}
		input[type=range]:focus::-moz-range-track, input[type=range]:hover::-moz-range-track  {
			background: ${ColorConfig.uiWidgetFocus};
		}
		input[type=range]::-moz-range-thumb {
			height: 16px;
			width: 4px;
			border-radius: 2px;
			border: none;
			background: ${ColorConfig.primaryText};
			cursor: pointer;
		}
		input[type=range]::-ms-track {
			width: 100%;
			height: 4px;
			cursor: pointer;
			background: ${ColorConfig.uiWidgetBackground};
			border-color: transparent;
		}
		input[type=range]:focus::-ms-track, input[type=range]:hover::-ms-track {
			background: ${ColorConfig.uiWidgetFocus};
		}
		input[type=range]::-ms-thumb {
			height: 16px;
			width: 4px;
			border-radius: 2px;
			background: ${ColorConfig.primaryText};
			cursor: pointer;
		}
	`));

ColorConfig.setTheme("jummbox classic");

let prevHash: string | null = null;
let id: string = ((Math.random() * 0xffffffff) >>> 0).toString(16);
let pauseButtonDisplayed: boolean = false;
let animationRequest: number | null;
let zoomEnabled: boolean = false;
let timelineWidth: number = 1;
let outVolumeHistoricTimer: number = 0;
let outVolumeHistoricCap: number = 0;

const synth: Synth = new Synth();
let titleText: HTMLHeadingElement = h1({ style: "flex-grow: 1; margin: 0 1px; margin-left: 10px; overflow: hidden;" }, "");
let editLink: HTMLAnchorElement = a({ target: "_top", style: "margin: 0 4px;" }, "✎ Edit");
let copyLink: HTMLAnchorElement = a({ href: "javascript:void(0)", style: "margin: 0 4px;" }, "⎘ Copy URL");
let shareLink: HTMLAnchorElement = a({ href: "javascript:void(0)", style: "margin: 0 4px;" }, "⤳ Share");
let fullscreenLink: HTMLAnchorElement = a({ target: "_top", style: "margin: 0 4px;" }, "⇱ Fullscreen");

let draggingPlayhead: boolean = false;
const playButton: HTMLButtonElement = button({ style: "width: 100%; height: 100%; max-height: 50px;" });
const playButtonContainer: HTMLDivElement = div({ style: "flex-shrink: 0; display: flex; padding: 2px; width: 80px; height: 100%; box-sizing: border-box; align-items: center;" },
	playButton,
);
const loopIcon: SVGPathElement = path({ d: "M 4 2 L 4 0 L 7 3 L 4 6 L 4 4 Q 2 4 2 6 Q 2 8 4 8 L 4 10 Q 0 10 0 6 Q 0 2 4 2 M 8 10 L 8 12 L 5 9 L 8 6 L 8 8 Q 10 8 10 6 Q 10 4 8 4 L 8 2 Q 12 2 12 6 Q 12 10 8 10 z" });
const loopButton: HTMLButtonElement = button({ title: "loop", style: "background: none; flex: 0 0 12px; margin: 0 3px; width: 12px; height: 12px; display: flex;" }, svg({ width: 12, height: 12, viewBox: "0 0 12 12" },
	loopIcon,
));

const volumeIcon: SVGSVGElement = svg({ style: "flex: 0 0 12px; margin: 0 1px; width: 12px; height: 12px;", viewBox: "0 0 12 12" },
	path({ fill: ColorConfig.uiWidgetBackground, d: "M 1 9 L 1 3 L 4 3 L 7 0 L 7 12 L 4 9 L 1 9 M 9 3 Q 12 6 9 9 L 8 8 Q 10.5 6 8 4 L 9 3 z" }),
);
const volumeSlider: HTMLInputElement = input({ title: "volume", type: "range", value: 75, min: 0, max: 75, step: 1, style: "width: 12vw; max-width: 100px; margin: 0 1px;" });

const zoomIcon: SVGSVGElement = svg({ width: 12, height: 12, viewBox: "0 0 12 12" },
	circle({ cx: "5", cy: "5", r: "4.5", "stroke-width": "1", stroke: "currentColor", fill: "none" }),
	path({ stroke: "currentColor", "stroke-width": "2", d: "M 8 8 L 11 11 M 5 2 L 5 8 M 2 5 L 8 5", fill: "none" }),
);
const zoomButton: HTMLButtonElement = button({ title: "zoom", style: "background: none; flex: 0 0 12px; margin: 0 3px; width: 12px; height: 12px; display: flex;" },
	zoomIcon,
);

const timeline: SVGSVGElement = svg({ style: "min-width: 0; min-height: 0; touch-action: pan-y pinch-zoom;" });
const playhead: HTMLDivElement = div({ style: `position: absolute; left: 0; top: 0; width: 2px; height: 100%; background: ${ColorConfig.playhead}; pointer-events: none;` });
const timelineContainer: HTMLDivElement = div({ style: "display: flex; flex-grow: 1; flex-shrink: 1; position: relative;" }, timeline, playhead);
const visualizationContainer: HTMLDivElement = div({ style: "display: flex; flex-grow: 1; flex-shrink: 1; height: 0; position: relative; align-items: center; overflow: hidden;" }, timelineContainer);

const outVolumeBarBg: SVGRectElement = SVG.rect({ "pointer-events": "none", width: "90%", height: "50%", x: "5%", y: "25%", fill: ColorConfig.uiWidgetBackground });
const outVolumeBar: SVGRectElement = SVG.rect({ "pointer-events": "none", height: "50%", width: "0%", x: "5%", y: "25%", fill: "url('#volumeGrad2')" });
const outVolumeCap: SVGRectElement = SVG.rect({ "pointer-events": "none", width: "2px", height: "50%", x: "5%", y: "25%", fill: ColorConfig.uiWidgetFocus });
const stop1: SVGStopElement = SVG.stop({ "stop-color": "lime", offset: "60%" });
const stop2: SVGStopElement = SVG.stop({ "stop-color": "orange", offset: "90%" });
const stop3: SVGStopElement = SVG.stop({ "stop-color": "red", offset: "100%" });
const gradient: SVGGradientElement = SVG.linearGradient({ id: "volumeGrad2", gradientUnits: "userSpaceOnUse" }, stop1, stop2, stop3);
const defs: SVGDefsElement = SVG.defs({}, gradient);
const volumeBarContainer: SVGSVGElement = SVG.svg({ style: `touch-action: none; overflow: hidden; margin: auto;`, width: "160px", height: "10px", preserveAspectRatio: "none" },
	defs,
	outVolumeBarBg,
	outVolumeBar,
	outVolumeCap,
);

document.body.appendChild(visualizationContainer);
document.body.appendChild(
	div({ style: `flex-shrink: 0; height: 20vh; min-height: 22px; max-height: 70px; display: flex; align-items: center;` },
		playButtonContainer,
		loopButton,
		volumeIcon,
		volumeSlider,
		zoomButton,
		volumeBarContainer,
		titleText,
		editLink,
		copyLink,
		shareLink,
		fullscreenLink,
	),
);

function hashUpdatedExternally(): void {
	let myHash: string = location.hash;
	if (prevHash == myHash || myHash == "") return;

	prevHash = myHash;

	if (myHash.charAt(0) == "#") {
		myHash = myHash.substring(1);
	}

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
					if (synth.song) {
						titleText.textContent = synth.song.title;
					}
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

		volumeUpdate();
	}

	if (pauseButtonDisplayed != synth.playing) {
		renderPlayButton();
	}

}

function volumeUpdate(): void {
	if (synth.song == null) {
		outVolumeCap.setAttribute("x", "5%");
		outVolumeBar.setAttribute("width", "0%");
		return;
	}
	outVolumeHistoricTimer--;
	if (outVolumeHistoricTimer <= 0) {
		outVolumeHistoricCap -= 0.03;
	}
	if (synth.song.outVolumeCap > outVolumeHistoricCap) {
		outVolumeHistoricCap = synth.song.outVolumeCap;
		outVolumeHistoricTimer = 50;
	}

	animateVolume(synth.song.outVolumeCap, outVolumeHistoricCap);

	if (!synth.playing) {
		outVolumeCap.setAttribute("x", "5%");
		outVolumeBar.setAttribute("width", "0%");
	}
}

function animateVolume(useOutVolumeCap: number, historicOutCap: number): void {
	outVolumeBar.setAttribute("width", "" + Math.min(144, useOutVolumeCap * 144));
	outVolumeCap.setAttribute("x", "" + (8 + Math.min(144, historicOutCap * 144)));
}

function onTogglePlay(): void {
	if (synth.song != null) {
		if (animationRequest != null) cancelAnimationFrame(animationRequest);
		animationRequest = null;
		if (synth.playing) {
			synth.pause();
			volumeUpdate();
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

function onToggleZoom(): void {
	zoomEnabled = !zoomEnabled;
	renderZoomIcon();
	renderTimeline();
}

function onTimelineMouseDown(event: MouseEvent): void {
	draggingPlayhead = true;
	onTimelineMouseMove(event);
}

function onTimelineMouseMove(event: MouseEvent): void {
	event.preventDefault();
	onTimelineCursorMove(event.clientX || event.pageX);
}

function onTimelineTouchDown(event: TouchEvent): void {
	draggingPlayhead = true;
	onTimelineTouchMove(event);
}

function onTimelineTouchMove(event: TouchEvent): void {
	onTimelineCursorMove(event.touches[0].clientX);
}

function onTimelineCursorMove(mouseX: number): void {
	if (draggingPlayhead && synth.song != null) {
		const boundingRect: ClientRect = visualizationContainer.getBoundingClientRect();
		synth.playhead = synth.song.barCount * (mouseX - boundingRect.left) / (boundingRect.right - boundingRect.left);
		synth.computeLatestModValues();
		renderPlayhead();
	}
}

function onTimelineCursorUp(): void {
	draggingPlayhead = false;
}

function setSynthVolume(): void {
	const volume: number = +volumeSlider.value;
	synth.volume = Math.min(1.0, Math.pow(volume / 50.0, 0.5)) * Math.pow(2.0, (volume - 75.0) / 25.0);
}

function renderPlayhead(): void {
	if (synth.song != null) {
		let pos: number = synth.playhead / synth.song.barCount;
		playhead.style.left = (timelineWidth * pos) + "px";

		const boundingRect: ClientRect = visualizationContainer.getBoundingClientRect();
		visualizationContainer.scrollLeft = pos * (timelineWidth - boundingRect.width);
	}
}

function renderTimeline(): void {
	timeline.innerHTML = "";
	if (synth.song == null) return;

	const boundingRect: ClientRect = visualizationContainer.getBoundingClientRect();

	let timelineHeight: number;
	let windowOctaves: number;
	let windowPitchCount: number;

	if (zoomEnabled) {
		timelineHeight = boundingRect.height;
		windowOctaves = Math.max(3, Math.min(Config.pitchOctaves, Math.round(timelineHeight / (12 * 2))));
		windowPitchCount = windowOctaves * 12 + 1;
		const semitoneHeight: number = (timelineHeight - 1) / windowPitchCount;
		const targetBeatWidth: number = Math.max(8, semitoneHeight * 4);
		timelineWidth = Math.max(boundingRect.width, targetBeatWidth * synth.song.barCount * synth.song.beatsPerBar);
	} else {
		timelineWidth = boundingRect.width;
		const targetSemitoneHeight: number = Math.max(1, timelineWidth / (synth.song.barCount * synth.song.beatsPerBar) / 6.0);
		timelineHeight = Math.min(boundingRect.height, targetSemitoneHeight * (Config.maxPitch + 1) + 1);
		windowOctaves = Math.max(3, Math.min(Config.pitchOctaves, Math.round(timelineHeight / (12 * targetSemitoneHeight))));
		windowPitchCount = windowOctaves * 12 + 1;
	}

	timelineContainer.style.width = timelineWidth + "px";
	timelineContainer.style.height = timelineHeight + "px";
	timeline.style.width = timelineWidth + "px";
	timeline.style.height = timelineHeight + "px";

	const barWidth: number = timelineWidth / synth.song.barCount;
	const partWidth: number = barWidth / (synth.song.beatsPerBar * Config.partsPerBeat);

	const wavePitchHeight: number = (timelineHeight - 1) / windowPitchCount;
	const drumPitchHeight: number = (timelineHeight - 1) / Config.drumCount;

	for (let bar: number = 0; bar < synth.song.barCount + 1; bar++) {
		const color: string = (bar == synth.song.loopStart || bar == synth.song.loopStart + synth.song.loopLength) ? ColorConfig.loopAccent : ColorConfig.uiWidgetBackground;
		timeline.appendChild(rect({ x: bar * barWidth - 1, y: 0, width: 2, height: timelineHeight, fill: color }));
	}

	for (let octave: number = 0; octave <= windowOctaves; octave++) {
		timeline.appendChild(rect({ x: 0, y: octave * 12 * wavePitchHeight, width: timelineWidth, height: wavePitchHeight + 1, fill: ColorConfig.tonic, opacity: 0.75 }));
	}

	for (let channel: number = synth.song.channels.length - 1 - synth.song.modChannelCount; channel >= 0; channel--) {

		const isNoise: boolean = synth.song.getChannelIsNoise(channel);
		const pitchHeight: number = isNoise ? drumPitchHeight : wavePitchHeight;

		const configuredOctaveScroll: number = synth.song.channels[channel].octave;
		const octavesToMove: number = (windowOctaves - 3) / 2;
		const newScrollableOctaves: number = Config.pitchOctaves - windowOctaves;
		const oldCenter: number = 5 / 2;
		const newCenter: number = newScrollableOctaves / 2;
		let distanceFromCenter: number = configuredOctaveScroll - oldCenter;
		if (Math.abs(distanceFromCenter) <= octavesToMove) {
			distanceFromCenter = 0;
		} else if (distanceFromCenter < 0) {
			distanceFromCenter += octavesToMove;
		} else {
			distanceFromCenter -= octavesToMove;
		}
		const newOctaveScroll = Math.max(0, Math.min(newScrollableOctaves, Math.round(newCenter + distanceFromCenter)));

		const offsetY: number = newOctaveScroll * pitchHeight * 12 + timelineHeight - pitchHeight * 0.5 - 0.5;

		for (let bar: number = 0; bar < synth.song.barCount; bar++) {
			const pattern: Pattern | null = synth.song.getPattern(channel, bar);
			if (pattern == null) continue;
			const offsetX: number = bar * barWidth;

			for (let i: number = 0; i < pattern.notes.length; i++) {
				const note: Note = pattern.notes[i];

				for (const pitch of note.pitches) {
					const d: string = drawNote(pitch, note.start, note.pins, (pitchHeight + 1) / 2, offsetX, offsetY, partWidth, pitchHeight);
					const noteElement: SVGPathElement = path({ d: d, fill: ColorConfig.getChannelColor(synth.song, channel).primaryChannel });
					if (isNoise) noteElement.style.opacity = String(0.6);
					timeline.appendChild(noteElement);
				}
			}
		}
	}

	renderPlayhead();
}

function drawNote(pitch: number, start: number, pins: NotePin[], radius: number, offsetX: number, offsetY: number, partWidth: number, pitchHeight: number): string {
	let d: string = `M ${offsetX + partWidth * (start + pins[0].time)} ${offsetY - pitch * pitchHeight + radius * (pins[0].volume / 6.0)} `;
	for (let i: number = 0; i < pins.length; i++) {
		const pin: NotePin = pins[i];
		const x: number = offsetX + partWidth * (start + pin.time);
		const y: number = offsetY - pitchHeight * (pitch + pin.interval);
		const expression: number = pin.volume / 6.0;
		d += `L ${x} ${y - radius * expression} `;
	}
	for (let i: number = pins.length - 1; i >= 0; i--) {
		const pin: NotePin = pins[i];
		const x: number = offsetX + partWidth * (start + pin.time);
		const y: number = offsetY - pitchHeight * (pitch + pin.interval);
		const expression: number = pin.volume / 6.0;
		d += `L ${x} ${y + radius * expression} `;
	}
	return d;
}

function renderPlayButton(): void {
	if (synth.playing) {
		playButton.classList.remove("playButton");
		playButton.classList.add("pauseButton");
		playButton.title = "Pause (Space)";
		playButton.innerText = "Pause";
	} else {
		playButton.classList.remove("pauseButton");
		playButton.classList.add("playButton");
		playButton.title = "Play (Space)";
		playButton.innerText = "Play";
	}
	pauseButtonDisplayed = synth.playing;
}

function renderLoopIcon(): void {
	loopIcon.setAttribute("fill", (synth.loopRepeatCount == -1) ? ColorConfig.linkAccent : ColorConfig.uiWidgetBackground);
}

function renderZoomIcon(): void {
	zoomIcon.style.color = zoomEnabled ? ColorConfig.linkAccent : ColorConfig.uiWidgetBackground;
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
	// Set as any to allow compilation without clipboard types (since, uh, I didn't write this bit and don't know the proper types library) -jummbus
	let nav: any;
	nav = navigator;

	if (nav.clipboard && nav.clipboard.writeText) {
		nav.clipboard.writeText(location.href).catch(() => {
			window.prompt("Copy to clipboard:", location.href);
		});
		return;
	}
	const textField: HTMLTextAreaElement = document.createElement("textarea");
	textField.innerText = location.href;
	document.body.appendChild(textField);
	textField.select();
	const succeeded: boolean = document.execCommand("copy");
	textField.remove();
	if (!succeeded) window.prompt("Copy this:", location.href);
}

function onShareClicked(): void {
	(<any>navigator).share({ url: location.href });
}

if (top !== self) {
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
window.addEventListener("mousemove", onTimelineMouseMove);
window.addEventListener("mouseup", onTimelineCursorUp);
timeline.addEventListener("touchstart", onTimelineTouchDown);
timeline.addEventListener("touchmove", onTimelineTouchMove);
timeline.addEventListener("touchend", onTimelineCursorUp);
timeline.addEventListener("touchcancel", onTimelineCursorUp);

playButton.addEventListener("click", onTogglePlay);
loopButton.addEventListener("click", onToggleLoop);
volumeSlider.addEventListener("input", onVolumeChange);
zoomButton.addEventListener("click", onToggleZoom);
copyLink.addEventListener("click", onCopyClicked);
shareLink.addEventListener("click", onShareClicked);
window.addEventListener("hashchange", hashUpdatedExternally);

hashUpdatedExternally();
renderLoopIcon();
renderZoomIcon();
renderPlayButton();

// When compiling synth.ts as a standalone module named "beepbox", expose these classes as members to JavaScript:
export { Dictionary, DictionaryArray, EnvelopeType, InstrumentType, Transition, Chord, Envelope, Config, NotePin, Note, Pattern, Instrument, Channel, Synth };
//}
