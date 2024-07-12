// Copyright (c) John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

import {ColorConfig} from "./ColorConfig.js";
import {HTML} from "imperative-html/dist/esm/elements-strict.js";


function scrollBarTestFunc(): void {
	// Determine if the user's browser/OS adds scrollbars that occupy space by default.
	// See: https://www.filamentgroup.com/lab/scrollbars/
	// Or: https://web.archive.org/web/20240109124348/https://www.filamentgroup.com/lab/scrollbars/
	const scrollBarTest: HTMLDivElement = document.body.appendChild(HTML.div({style: "width:30px; height:30px; overflow: auto;"},
		HTML.div({style: "width:100%; height:40px"}),
	));
	if ((<any>scrollBarTest).firstChild.clientWidth < 30) {
		document.documentElement.classList.add("has-classic-scrollbars");
	}
	document.body.removeChild(scrollBarTest);
}
if (document.body) {
	scrollBarTestFunc();
} else {
	// Wait until the document body is present to perform the scrollBarTestFunc.
	const observer: MutationObserver = new MutationObserver(function(): void {
		if (document.body) {
			scrollBarTestFunc();
			observer.disconnect();
		}
	});
	observer.observe(document.documentElement, {childList: true});
}


document.head.appendChild(HTML.style({type: "text/css"}, `

/* Note: "#" symbols need to be encoded as "%23" in SVG data urls, otherwise they are interpreted as fragment identifiers! */
:root {
	--button-size: 26px;
	--settings-area-width: 192px;
	--play-symbol: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="-13 -13 26 26"><path d="M -5 -8 L -5 8 L 8 0 z" fill="gray"/></svg>');
	--pause-symbol: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="-13 -13 26 26"><rect x="-5" y="-7" width="4" height="14" fill="gray"/><rect x="3" y="-7" width="4" height="14" fill="gray"/></svg>');
	--record-symbol: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="-13 -13 26 26"><circle cx="0" cy="0" r="6" fill="gray"/></svg>');
	--stop-symbol: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="-13 -13 26 26"><rect x="-6" y="-6" width="12" height="12" fill="gray"/></svg>');
	--prev-bar-symbol: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="-13 -13 26 26"><rect x="-6" y="-6" width="2" height="12" fill="gray"/><path d="M 6 -6 L 6 6 L -3 0 z" fill="gray"/></svg>');
	--next-bar-symbol: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="-13 -13 26 26"><rect x="4" y="-6" width="2" height="12" fill="gray"/><path d="M -6 -6 L -6 6 L 3 0 z" fill="gray"/></svg>');
	--volume-symbol: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26"><path d="M 4 16 L 4 10 L 8 10 L 13 5 L 13 21 L 8 16 z M 15 11 L 16 10 A 7.2 7.2 0 0 1 16 16 L 15 15 A 5.8 5.8 0 0 0 15 12 z M 18 8 L 19 7 A 11.5 11.5 0 0 1 19 19 L 18 18 A 10.1 10.1 0 0 0 18 8 z" fill="gray"/></svg>');
	--unmuted-symbol: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="3 3 20 20"><path d="M 4 16 L 4 10 L 8 10 L 13 5 L 13 21 L 8 16 z M 15 11 L 16 10 A 7.2 7.2 0 0 1 16 16 L 15 15 A 5.8 5.8 0 0 0 15 12 z M 18 8 L 19 7 A 11.5 11.5 0 0 1 19 19 L 18 18 A 10.1 10.1 0 0 0 18 8 z" fill="gray"/></svg>');
	--muted-symbol: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="3 3 20 20"><path d="M 4 16 L 4 10 L 8 10 L 13 5 L 13 21 L 8 16 z" fill="gray"/></svg>');
	--menu-down-symbol: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="-13 -13 26 26"><path d="M -4 -2 L 4 -2 L 0 3 z" fill="gray"/></svg>');
	--select-arrows-symbol: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="-13 -13 26 26"><path d="M -4 -3 L 4 -3 L 0 -8 z M -4 3 L 4 3 L 0 8 z" fill="gray"/></svg>');
	--file-page-symbol: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="-5 -21 26 26"><path d="M 2 0 L 2 -16 L 10 -16 L 14 -12 L 14 0 z M 3 -1 L 13 -1 L 13 -11 L 9 -11 L 9 -15 L 3 -15 z" fill="gray"/></svg>');
	--edit-pencil-symbol: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="-5 -21 26 26"><path d="M 0 0 L 1 -4 L 4 -1 z M 2 -5 L 10 -13 L 13 -10 L 5 -2 zM 11 -14 L 13 -16 L 14 -16 L 16 -14 L 16 -13 L 14 -11 z" fill="gray"/></svg>');
	--preferences-gear-symbol: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="-13 -13 26 26"><path d="M 5.78 -1.6 L 7.93 -0.94 L 7.93 0.94 L 5.78 1.6 L 4.85 3.53 L 5.68 5.61 L 4.21 6.78 L 2.36 5.52 L 0.27 5.99 L -0.85 7.94 L -2.68 7.52 L -2.84 5.28 L -4.52 3.95 L -6.73 4.28 L -7.55 2.59 L -5.9 1.07 L -5.9 -1.07 L -7.55 -2.59 L -6.73 -4.28 L -4.52 -3.95 L -2.84 -5.28 L -2.68 -7.52 L -0.85 -7.94 L 0.27 -5.99 L 2.36 -5.52 L 4.21 -6.78 L 5.68 -5.61 L 4.85 -3.53 M 2.92 0.67 L 2.92 -0.67 L 2.35 -1.87 L 1.3 -2.7 L 0 -3 L -1.3 -2.7 L -2.35 -1.87 L -2.92 -0.67 L -2.92 0.67 L -2.35 1.87 L -1.3 2.7 L -0 3 L 1.3 2.7 L 2.35 1.87 z" fill="gray"/></svg>');
	--customize-dial-symbol: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="-13 -13 26 26"> \
			<g transform="translate(0,1)" fill="gray"> \
				<circle cx="0" cy="0" r="6.5" stroke="gray" stroke-width="1" fill="none"/> \
				<rect x="-1" y="-5" width="2" height="4" transform="rotate(30)"/> \
				<circle cx="-7.79" cy="4.5" r="0.75"/> \
				<circle cx="-9" cy="0" r="0.75"/> \
				<circle cx="-7.79" cy="-4.5" r="0.75"/> \
				<circle cx="-4.5" cy="-7.79" r="0.75"/> \
				<circle cx="0" cy="-9" r="0.75"/> \
				<circle cx="4.5" cy="-7.79" r="0.75"/> \
				<circle cx="7.79" cy="-4.5" r="0.75"/> \
				<circle cx="9" cy="0" r="0.75"/> \
				<circle cx="7.79" cy="4.5" r="0.75"/> \
			</g> \
		</svg>');
	--instrument-copy-symbol: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="-5 -21 26 26"><path d="M 0 -15 L 1 -15 L 1 0 L 13 0 L 13 1 L 0 1 L 0 -15 z M 2 -1 L 2 -17 L 10 -17 L 14 -13 L 14 -1 z M 3 -2 L 13 -2 L 13 -12 L 9 -12 L 9 -16 L 3 -16 z" fill="currentColor"></path></svg>');
	--instrument-paste-symbol: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26"><path d="M 8 18 L 6 18 L 6 5 L 17 5 L 17 7 M 9 8 L 16 8 L 20 12 L 20 22 L 9 22 z" stroke="currentColor" fill="none"></path><path d="M 9 3 L 14 3 L 14 6 L 9 6 L 9 3 z M 16 8 L 20 12 L 16 12 L 16 8 z" fill="currentColor"></path></svg>');
	--export-symbol: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="-13 -13 26 26"><path fill="gray" d="M -8 3 L -8 8 L 8 8 L 8 3 L 6 3 L 6 6 L -6 6 L -6 3 z M 0 2 L -4 -2 L -1 -2 L -1 -8 L 1 -8 L 1 -2 L 4 -2 z"/></svg>');
	--close-symbol: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="-13 -13 26 26"><path fill="gray" d="M -7.07 -5.66 L -5.66 -7.07 L 0 -1.4 L 5.66 -7.07 L 7.07 -5.66 L 1.4 0 L 7.07 5.66 L 5.66 7.07 L 0 1.4 L -5.66 7.07 L -7.07 5.66 L -1.4 0 z"/></svg>');
	--add-symbol: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="-13 -13 26 26"><path fill="gray" d="M -8 -1 L -1 -1 L -1 -8  L 1 -8 L 1 -1 L 8 -1 L 8 1 L 1 1 L 1 8 L -1 8 L -1 1 L -8 1 z"/></svg>');
	--zoom-in-symbol: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="-10 -10 20 20"><circle cx="-1" cy="-1" r="6" stroke-width="2" stroke="gray" fill="none"></circle><path stroke="gray" stroke-width="2" d="M 3 3 L 7 7 M -1 -4 L -1 2 M -4 -1 L 2 -1" fill="none"></path></svg>');
	--zoom-out-symbol: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="-10 -10 20 20"><circle cx="-1" cy="-1" r="6" stroke-width="2" stroke="gray" fill="none"></circle><path stroke="gray" stroke-width="2" d="M 3 3 L 7 7 M -4 -1 L 2 -1" fill="none"></path></svg>');
	--checkmark-symbol: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="-13 -13 26 26"><path fill="gray" d="M -9 -2 L -8 -3 L -3 2 L 9 -8 L 10 -7 L -3 8 z"/></svg>');
	--drum-symbol: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40"> \
			<defs> \
				<linearGradient id="gold1" x1="0%" y1="0%" x2="100%" y2="0%"> \
					<stop offset="0%" stop-color="%237e3302"/> \
					<stop offset="40%" stop-color="%23ffec6b"/> \
					<stop offset="100%" stop-color="%237e3302"/> \
				</linearGradient> \
				<linearGradient id="gold2" x1="0%" y1="0%" x2="100%" y2="0%"> \
					<stop offset="0%" stop-color="%23faaf7d"/> \
					<stop offset="15%" stop-color="%23fffba9"/> \
					<stop offset="40%" stop-color="%23ffffe3"/> \
					<stop offset="65%" stop-color="%23fffba9"/> \
					<stop offset="100%" stop-color="%23faaf7d"/> \
				</linearGradient> \
				<radialGradient id="gold3" cx="0%" cy="0%" r="100%"> \
					<stop offset="0%" stop-color="%23ffffe3"/> \
					<stop offset="50%" stop-color="%23ffec6b"/> \
					<stop offset="100%" stop-color="%237e3302"/> \
				</radialGradient> \
				<linearGradient id="red" x1="0%" y1="0%" x2="100%" y2="0%"> \
					<stop offset="0%" stop-color="%23641919"/> \
					<stop offset="40%" stop-color="%23cd2c2c"/> \
					<stop offset="100%" stop-color="%23641919"/> \
				</linearGradient> \
				<radialGradient id="membrane"> \
					<stop offset="10%" stop-color="%23cccccc" /> \
					<stop offset="90%" stop-color="%23f6f6f7" /> \
					<stop offset="100%" stop-color="%23999" /> \
				</radialGradient> \
			</defs> \
			<ellipse cx="16" cy="26" rx="16" ry="14" fill="rgba(0,0,0,0.5)"/> \
			<ellipse cx="16" cy="25" rx="16" ry="14" fill="url(%23gold1)"/> \
			<rect x="0" y="23" width="32" height="2" fill="url(%23gold1)"/> \
			<ellipse cx="16" cy="23" rx="16" ry="14" fill="url(%23gold2)"/> \
			<ellipse cx="16" cy="23" rx="15" ry="13" fill="url(%23red)"/> \
			<rect x="1" y="17" width="30" height="6" fill="url(%23red)"/> \
			<rect x="5" y="27" width="1" height="5" rx="0.5" fill="rgba(0,0,0,0.5)"/> \
			<rect x="15" y="31" width="2" height="5" rx="1" fill="rgba(0,0,0,0.5)"/> \
			<rect x="26" y="27" width="1" height="5" rx="0.5" fill="rgba(0,0,0,0.5)"/> \
			<rect x="5" y="26" width="1" height="5" rx="0.5" fill="url(%23gold3)"/> \
			<rect x="15" y="30" width="2" height="5" rx="1" fill="url(%23gold3)"/> \
			<rect x="26" y="26" width="1" height="5" rx="0.5" fill="url(%23gold3)"/> \
			<ellipse cx="16" cy="18" rx="15" ry="13" fill="rgba(0,0,0,0.5)"/> \
			<ellipse cx="16" cy="16" rx="16" ry="14" fill="url(%23gold1)"/> \
			<rect x="0" y="14" width="32" height="2" fill="url(%23gold1)"/> \
			<ellipse cx="16" cy="14" rx="16" ry="14" fill="url(%23gold2)"/> \
			<ellipse cx="16" cy="14" rx="15" ry="13" fill="url(%23membrane)"/> \
		</svg>');
	--piano-key-symbol: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="32" height="15" preserveAspectRatio="none" viewBox="0 -1 32 15"> \
			<defs> \
				<linearGradient id="shadow" x1="0%" y1="0%" x2="100%" y2="0%"> \
					<stop offset="0%" stop-color="rgba(0,0,0,0.5)"/> \
					<stop offset="100%" stop-color="transparent"/> \
				</linearGradient> \
			</defs> \
			<rect x="-1" y="1" width="31" height="1" rx="0.6" fill="rgba(255,255,255,0.4)"/> \
			<path d="M -1 11 L 30 11 L 30 2 L 33 -1 L 33 14 L -1 14 z" fill="rgba(0,0,0,0.7)"/> \
			<rect x="-1" y="-1" width="19" height="15" fill="url(%23shadow)"/> \
		</svg>');
}


.has-classic-scrollbars, .has-classic-scrollbars *, .prefers-classic-scrollbars {
	scrollbar-width: thin;
	scrollbar-color: ${ColorConfig.uiWidgetBackground} ${ColorConfig.editorBackground};
}
.prefers-big-scrollbars {
	scrollbar-width: auto;
	scrollbar-color: ${ColorConfig.uiWidgetBackground} ${ColorConfig.editorBackground};
}
.has-classic-scrollbars::-webkit-scrollbar, .has-classic-scrollbars *::-webkit-scrollbar, .prefers-classic-scrollbars::-webkit-scrollbar {
	width: 12px;
	height: 12px;
}
.prefers-big-scrollbars::-webkit-scrollbar {
	width: 20px;
	height: 20px;
}
.has-classic-scrollbars::-webkit-scrollbar-track, .has-classic-scrollbars *::-webkit-scrollbar-track, .prefers-classic-scrollbars::-webkit-scrollbar-track, .prefers-big-scrollbars::-webkit-scrollbar-track {
	background: ${ColorConfig.editorBackground};
}
.has-classic-scrollbars::-webkit-scrollbar-thumb, .has-classic-scrollbars *::-webkit-scrollbar-thumb, .prefers-classic-scrollbars::-webkit-scrollbar-thumb, .prefers-big-scrollbars::-webkit-scrollbar-thumb {
	background-color: ${ColorConfig.uiWidgetBackground};
	border: 3px solid ${ColorConfig.editorBackground};
}
.has-classic-scrollbars::-webkit-scrollbar-corner, .has-classic-scrollbars *::-webkit-scrollbar-corner, .prefers-classic-scrollbars::-webkit-scrollbar-corner, .prefers-big-scrollbars::-webkit-scrollbar-corner {
	background-color: ${ColorConfig.editorBackground};
}



.beepboxEditor {
	display: grid;
    grid-template-columns: minmax(0, 1fr) max-content;
    grid-template-rows: max-content 1fr; /* max-content minmax(0, 1fr); Chrome 80 grid layout regression. https://bugs.chromium.org/p/chromium/issues/detail?id=1050307 */
    grid-template-areas: "pattern-area settings-area" "track-area settings-area";
	grid-column-gap: 6px;
	grid-row-gap: 6px;
	position: relative;
	touch-action: manipulation;
	cursor: default;
	font-size: 13px;
	overflow: hidden;
	color: ${ColorConfig.primaryText};
	background: ${ColorConfig.editorBackground};
}

.beepboxEditor .noSelection {
	-webkit-touch-callout: none;
	-webkit-user-select: none;
	-moz-user-select: none;
	-ms-user-select: none;
	user-select: none;
}

.beepboxEditor div {
	margin: 0;
	padding: 0;
}

.beepboxEditor .pattern-area {
	grid-area: pattern-area;
	height: 481px;
	display: flex;
	flex-direction: row;
	position: relative;
}

.beepboxEditor .track-area {
	grid-area: track-area;
}

.beepboxEditor .loopEditor {
	height: 20px;
	position: sticky;
	bottom: 0;
	padding: 5px 0;
	background-color: ${ColorConfig.editorBackground};
}

.beepboxEditor .settings-area {
	grid-area: settings-area;
	display: grid;
    grid-template-columns: auto;
    grid-template-rows: min-content min-content min-content min-content min-content;
    grid-template-areas: "version-area" "play-pause-area" "menu-area" "song-settings-area" "instrument-settings-area";
	grid-column-gap: 6px;
}

.beepboxEditor .version-area{ grid-area: version-area; }
.beepboxEditor .play-pause-area{ grid-area: play-pause-area; }
.beepboxEditor .menu-area{ grid-area: menu-area; }
.beepboxEditor .song-settings-area{ grid-area: song-settings-area; }
.beepboxEditor .instrument-settings-area{ grid-area: instrument-settings-area; }

.beepboxEditor .tip {
	cursor: help;
	color: ${ColorConfig.secondaryText};
	text-decoration: none;
}

.beepboxEditor .tip:hover {
	color: ${ColorConfig.linkAccent};
	text-decoration: underline;
}
.beepboxEditor .tip:active {
	color: ${ColorConfig.primaryText};
}

.beepboxEditor .volume-speaker {
	flex-shrink: 0;
	width: var(--button-size);
	height: var(--button-size);
	background: ${ColorConfig.secondaryText};
	-webkit-mask-image: var(--volume-symbol);
	-webkit-mask-repeat: no-repeat;
	-webkit-mask-position: center;
	mask-image: var(--volume-symbol);
	mask-repeat: no-repeat;
	mask-position: center;
}

.beepboxEditor .drum-button {
	flex: 1;
	background-color: transparent;
	background-image: var(--drum-symbol);
	background-repeat: no-repeat;
	background-position: center;
}

.beepboxEditor .piano-button {
	flex: 1;
	position: relative;
	display: flex;
	align-items: center;
}
.beepboxEditor .piano-button::before {
	content: "";
	position: absolute;
	left: 0;
	top: 0;
	width: 100%;
	height: 100%;
	pointer-events: none;
	background-image: var(--piano-key-symbol);
	background-repeat: no-repeat;
	background-position: center;
	background-size: 100% 115.38%;
}
.beepboxEditor .piano-button.disabled::after {
	content: "";
	position: absolute;
	right: 0;
	top: 0;
	width: 70%;
	height: 100%;
	pointer-events: none;
	background: ${ColorConfig.editorBackground};
	-webkit-mask-image: linear-gradient(90deg, transparent 0%, gray 70%, gray 100%);
	-webkit-mask-repeat: no-repeat;
	-webkit-mask-position: center;
	mask-image: linear-gradient(90deg, transparent 0%, gray 70%, gray 100%);
	mask-repeat: no-repeat;
	mask-position: center;
}

.beepboxEditor .piano-button.pressed, .beepboxEditor .drum-button.pressed {
	filter: brightness(0.5);
}

.beepboxEditor .customize-instrument {
	margin: 2px 0;
}
.beepboxEditor .customize-instrument::before {
	content: "";
	flex-shrink: 0;
	position: absolute;
	left: 0;
	top: 50%;
	transform: translateY(-50%);
	pointer-events: none;
	width: var(--button-size);
	height: var(--button-size);
	background: currentColor;
	-webkit-mask-image: var(--customize-dial-symbol);
	-webkit-mask-repeat: no-repeat;
	-webkit-mask-position: center;
	mask-image: var(--customize-dial-symbol);
	mask-repeat: no-repeat;
	mask-position: center;
}

.beepboxEditor .instrumentCopyPasteRow {
	gap: 2px;
}

.beepboxEditor .copy-instrument {
	margin: 2px 0;
	flex-grow: 1;
}
.beepboxEditor .copy-instrument::before {
	content: "";
	flex-shrink: 0;
	position: absolute;
	left: 0;
	top: 50%;
	transform: translateY(-50%);
	pointer-events: none;
	width: var(--button-size);
	height: var(--button-size);
	background: currentColor;
	-webkit-mask-image: var(--instrument-copy-symbol);
	-webkit-mask-repeat: no-repeat;
	-webkit-mask-position: center;
	mask-image: var(--instrument-copy-symbol);
	mask-repeat: no-repeat;
	mask-position: center;
}

.beepboxEditor .paste-instrument {
	margin: 2px 0;
	flex-grow: 1;
}
.beepboxEditor .paste-instrument::before {
	content: "";
	flex-shrink: 0;
	position: absolute;
	left: 0;
	top: 50%;
	transform: translateY(-50%);
	pointer-events: none;
	width: var(--button-size);
	height: var(--button-size);
	background: currentColor;
	-webkit-mask-image: var(--instrument-paste-symbol);
	-webkit-mask-repeat: no-repeat;
	-webkit-mask-position: center;
	mask-image: var(--instrument-paste-symbol);
	mask-repeat: no-repeat;
	mask-position: center;
}

.beepboxEditor .envelopeEditor {
	display: flex;
	flex-direction: column;
}

.beepboxEditor .envelope-row {
	display: flex;
	margin: 2px 0;
	gap: 2px;
}

.beepboxEditor .add-envelope {
	width: var(--button-size);
}
.beepboxEditor .add-envelope::before {
	content: "";
	position: absolute;
	width: var(--button-size);
	height: var(--button-size);
	left: 0;
	top: 0;
	pointer-events: none;
	background: currentColor;
	mask-image: var(--add-symbol);
	mask-repeat: no-repeat;
	mask-position: center;
	-webkit-mask-image: var(--add-symbol);
	-webkit-mask-repeat: no-repeat;
	-webkit-mask-position: center;
}
.beepboxEditor .add-envelope:disabled {
	visibility: hidden;
}

.beepboxEditor .effects-menu {
	width: var(--button-size);
	position: relative;
}
.beepboxEditor .effects-menu::before {
	content: "";
	position: absolute;
	width: var(--button-size);
	height: var(--button-size);
	left: 0;
	top: 0;
	pointer-events: none;
	background: currentColor;
	mask-image: var(--menu-down-symbol);
	mask-repeat: no-repeat;
	mask-position: center;
	-webkit-mask-image: var(--menu-down-symbol);
	-webkit-mask-repeat: no-repeat;
	-webkit-mask-position: center;
}

.beepboxEditor .zoomInButton, .beepboxEditor .zoomOutButton {
	width: var(--button-size);
	position: absolute;
	right: 10px;
}
.beepboxEditor .zoomInButton {
	top: 10px;
}
.beepboxEditor .zoomOutButton {
	top: 50px;
}
.beepboxEditor .zoomInButton::before {
	content: "";
	position: absolute;
	width: var(--button-size);
	height: var(--button-size);
	left: 0;
	top: 0;
	pointer-events: none;
	background: currentColor;
	mask-image: var(--zoom-in-symbol);
	mask-repeat: no-repeat;
	mask-position: center;
	-webkit-mask-image: var(--zoom-in-symbol);
	-webkit-mask-repeat: no-repeat;
	-webkit-mask-position: center;
}
.beepboxEditor .zoomOutButton::before {
	content: "";
	position: absolute;
	width: var(--button-size);
	height: var(--button-size);
	left: 0;
	top: 0;
	pointer-events: none;
	background: currentColor;
	mask-image: var(--zoom-out-symbol);
	mask-repeat: no-repeat;
	mask-position: center;
	-webkit-mask-image: var(--zoom-out-symbol);
	-webkit-mask-repeat: no-repeat;
	-webkit-mask-position: center;
}

.beepboxEditor .delete-envelope {
	width: var(--button-size);
	flex-shrink: 0;
	flex-grow: 0;
}
.beepboxEditor .delete-envelope::before {
	content: "";
	position: absolute;
	width: var(--button-size);
	height: var(--button-size);
	left: 0;
	top: 0;
	pointer-events: none;
	background: currentColor;
	mask-image: var(--close-symbol);
	mask-repeat: no-repeat;
	mask-position: center;
	-webkit-mask-image: var(--close-symbol);
	-webkit-mask-repeat: no-repeat;
	-webkit-mask-position: center;
}
.beepboxEditor .delete-envelope:disabled {
	visibility: hidden;
}

.beepboxEditor .menu.file::before {
	content: "";
	flex-shrink: 0;
	position: absolute;
	left: 0;
	top: 50%;
	transform: translateY(-50%);
	pointer-events: none;
	width: var(--button-size);
	height: var(--button-size);
	background: currentColor;
	-webkit-mask-image: var(--file-page-symbol);
	-webkit-mask-repeat: no-repeat;
	-webkit-mask-position: center;
	mask-image: var(--file-page-symbol);
	mask-repeat: no-repeat;
	mask-position: center;
}

.beepboxEditor .menu.edit::before {
	content: "";
	flex-shrink: 0;
	position: absolute;
	left: 0;
	top: 50%;
	transform: translateY(-50%);
	pointer-events: none;
	width: var(--button-size);
	height: var(--button-size);
	background: currentColor;
	-webkit-mask-image: var(--edit-pencil-symbol);
	-webkit-mask-repeat: no-repeat;
	-webkit-mask-position: center;
	mask-image: var(--edit-pencil-symbol);
	mask-repeat: no-repeat;
	mask-position: center;
}

.beepboxEditor .menu.preferences::before {
	content: "";
	flex-shrink: 0;
	position: absolute;
	left: 0;
	top: 50%;
	transform: translateY(-50%);
	pointer-events: none;
	width: var(--button-size);
	height: var(--button-size);
	background: currentColor;
	-webkit-mask-image: var(--preferences-gear-symbol);
	-webkit-mask-repeat: no-repeat;
	-webkit-mask-position: center;
	mask-image: var(--preferences-gear-symbol);
	mask-repeat: no-repeat;
	mask-position: center;
}

.beepboxEditor .mute-button::before {
	content: "";
	pointer-events: none;
	width: 100%;
	height: 100%;
	background: ${ColorConfig.primaryText};
	display: inline-block;
	-webkit-mask-image: var(--unmuted-symbol);
	-webkit-mask-repeat: no-repeat;
	-webkit-mask-position: center;
	-webkit-mask-size: contain;
	mask-image: var(--unmuted-symbol);
	mask-repeat: no-repeat;
	mask-position: center;
	mask-size: contain;
}

.beepboxEditor .mute-button.muted::before {
	background: ${ColorConfig.editorBackground};
	-webkit-mask-image: var(--muted-symbol);
	mask-image: var(--muted-symbol);
}

.beepboxEditor .promptContainer {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	display: flex;
	justify-content: center;
	align-items: center;
	z-index: 100;
}

.beepboxEditor .promptContainer::before {
	content: "";
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	background: ${ColorConfig.editorBackground};
	opacity: 0.5;
	display: flex;
}

.beepboxEditor .prompt {
	margin: auto;
	text-align: center;
	background: ${ColorConfig.editorBackground};
	border-radius: 15px;
	border: 4px solid ${ColorConfig.uiWidgetBackground};
	color: ${ColorConfig.primaryText};
	padding: 20px;
	display: flex;
	flex-direction: column;
	position: relative;
	box-shadow: 5px 5px 20px 10px rgba(0,0,0,0.5);
}

.beepboxEditor .prompt > *:not(:first-child):not(.cancelButton) {
	margin-top: 1.5em;
}

.beepboxEditor .prompt h2 {
	font-size: 2em;
	margin: 0 16px;
	font-weight: normal;
}

.beepboxEditor .prompt p {
	text-align: left;
	margin: 1em 0;
}

.beepboxEditor .prompt label {
	cursor: pointer;
}

.beepboxEditor .prompt.recordingSetupPrompt p {
	margin-top: 0.75em;
	margin-bottom: 0;
}

.beepboxEditor .prompt.recordingSetupPrompt > label:not(:first-child):not(.cancelButton) {
	margin: 2px 0;
}

.beepboxEditor .layout-option {
	display: flex;
	flex-direction: column;
	flex: 1;
	cursor: pointer;
	color: ${ColorConfig.secondaryText};
}

.beepboxEditor .layout-option input {
	display: none;
}

.beepboxEditor .layout-option input:checked ~ * {
	color: ${ColorConfig.primaryText};
}

.beepboxEditor .selectContainer {
	position: relative;
}
.beepboxEditor .selectContainer:not(.menu)::after {
	content: "";
	flex-shrink: 0;
	position: absolute;
	right: 0;
	top: 50%;
	transform: translateY(-50%);
	pointer-events: none;
	width: 14px;
	height: var(--button-size);
	background: currentColor;
	-webkit-mask-image: var(--select-arrows-symbol);
	-webkit-mask-repeat: no-repeat;
	-webkit-mask-position: center;
	mask-image: var(--select-arrows-symbol);
	mask-repeat: no-repeat;
	mask-position: center;
}
.beepboxEditor .selectContainer.menu::after {
	content: "";
	flex-shrink: 0;
	position: absolute;
	right: 0;
	top: 50%;
	transform: translateY(-50%);
	pointer-events: none;
	width: var(--button-size);
	height: var(--button-size);
	background: currentColor;
	-webkit-mask-image: var(--menu-down-symbol);
	-webkit-mask-repeat: no-repeat;
	-webkit-mask-position: center;
	mask-image: var(--menu-down-symbol);
	mask-repeat: no-repeat;
	mask-position: center;
}
.beepboxEditor select {
	margin: 0;
	padding: 0 4px;
	display: block;
	height: var(--button-size);
	border: none;
	border-radius: 5px;
	background: ${ColorConfig.uiWidgetBackground};
	color: inherit;
	font-size: inherit;
	cursor: pointer;
	font-family: inherit;
	font-weight: inherit;

	-webkit-appearance:none;
	-moz-appearance: none;
	appearance: none;
}
.beepboxEditor .menu select {
	padding: 0 var(--button-size);
}
.beepboxEditor select:focus {
	background: ${ColorConfig.uiWidgetFocus};
	outline: none;
}
.beepboxEditor .menu select {
	text-align: center;
	text-align-last: center;
}
.beepboxEditor .settings-area select {
       width: 100%;
}

/* This makes it look better in firefox on my computer... What about others?
@-moz-document url-prefix() {
	.beepboxEditor select { padding: 0 2px; }
}
*/
.beepboxEditor button {
	margin: 0;
	position: relative;
	height: var(--button-size);
	border: none;
	border-radius: 5px;
	background: ${ColorConfig.uiWidgetBackground};
	color: inherit;
	font-size: inherit;
	font-family: inherit;
	font-weight: inherit;
	cursor: pointer;
}
.beepboxEditor button:focus {
	background: ${ColorConfig.uiWidgetFocus};
	outline: none;
}

.beepboxEditor button.cancelButton {
	float: right;
	width: var(--button-size);
	position: absolute;
	top: 8px;
	right: 8px;
}

.beepboxEditor .playback-bar-controls {
	display: grid;
	grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr);
	grid-template-rows: min-content;
	grid-column-gap: 4px;
}

.beepboxEditor button.playButton::before {
	content: "";
	flex-shrink: 0;
	position: absolute;
	left: 0;
	top: 50%;
	transform: translateY(-50%);
	pointer-events: none;
	width: var(--button-size);
	height: var(--button-size);
	background: currentColor;
	-webkit-mask-image: var(--play-symbol);
	-webkit-mask-repeat: no-repeat;
	-webkit-mask-position: center;
	mask-image: var(--play-symbol);
	mask-repeat: no-repeat;
	mask-position: center;
}
.beepboxEditor button.pauseButton::before {
	content: "";
	flex-shrink: 0;
	position: absolute;
	left: 0;
	top: 50%;
	transform: translateY(-50%);
	pointer-events: none;
	width: var(--button-size);
	height: var(--button-size);
	background: currentColor;
	-webkit-mask-image: var(--pause-symbol);
	-webkit-mask-repeat: no-repeat;
	-webkit-mask-position: center;
	mask-image: var(--pause-symbol);
	mask-repeat: no-repeat;
	mask-position: center;
}
.beepboxEditor button.recordButton::before {
	content: "";
	flex-shrink: 0;
	position: absolute;
	left: 0;
	top: 50%;
	transform: translateY(-50%);
	pointer-events: none;
	width: var(--button-size);
	height: var(--button-size);
	background: currentColor;
	-webkit-mask-image: var(--record-symbol);
	-webkit-mask-repeat: no-repeat;
	-webkit-mask-position: center;
	mask-image: var(--record-symbol);
	mask-repeat: no-repeat;
	mask-position: center;
}
.beepboxEditor button.stopButton::before {
	content: "";
	flex-shrink: 0;
	position: absolute;
	left: 0;
	top: 50%;
	transform: translateY(-50%);
	pointer-events: none;
	width: var(--button-size);
	height: var(--button-size);
	background: currentColor;
	-webkit-mask-image: var(--stop-symbol);
	-webkit-mask-repeat: no-repeat;
	-webkit-mask-position: center;
	mask-image: var(--stop-symbol);
	mask-repeat: no-repeat;
	mask-position: center;
}

.beepboxEditor button.prevBarButton::before {
	content: "";
	flex-shrink: 0;
	position: absolute;
	left: 50%;
	top: 50%;
	transform: translate(-50%, -50%);
	pointer-events: none;
	width: var(--button-size);
	height: var(--button-size);
	background: currentColor;
	-webkit-mask-image: var(--prev-bar-symbol);
	-webkit-mask-repeat: no-repeat;
	-webkit-mask-position: center;
	mask-image: var(--prev-bar-symbol);
	mask-repeat: no-repeat;
	mask-position: center;
}

.beepboxEditor button.nextBarButton::before {
	content: "";
	flex-shrink: 0;
	position: absolute;
	left: 50%;
	top: 50%;
	transform: translate(-50%, -50%);
	pointer-events: none;
	width: var(--button-size);
	height: var(--button-size);
	background: currentColor;
	-webkit-mask-image: var(--next-bar-symbol);
	-webkit-mask-repeat: no-repeat;
	-webkit-mask-position: center;
	mask-image: var(--next-bar-symbol);
	mask-repeat: no-repeat;
	mask-position: center;
}

.beepboxEditor button.playButton, .beepboxEditor button.pauseButton, .beepboxEditor button.recordButton, .beepboxEditor button.stopButton, .beepboxEditor button.okayButton, .beepboxEditor button.exportButton {
	padding-left: var(--button-size);
}
.beepboxEditor button.playButton, .beepboxEditor button.pauseButton, .beepboxEditor button.recordButton {
	grid-column-start: 1;
	grid-column-end: 3;
}
.beepboxEditor button.stopButton {
	grid-column-start: 1;
	grid-column-end: 5;
}
.beepboxEditor button.prevBarButton {
	grid-column-start: 3;
	grid-column-end: 4;
}
.beepboxEditor button.nextBarButton {
	grid-column-start: 4;
	grid-column-end: 5;
}

.beepboxEditor button.playButton.shrunk, .beepboxEditor button.recordButton.shrunk {
	padding: 0;
}
.beepboxEditor button.playButton.shrunk::before, .beepboxEditor button.recordButton.shrunk::before {
	left: 50%;
	top: 50%;
	transform: translate(-50%, -50%);
}
.beepboxEditor button.playButton.shrunk span, .beepboxEditor button.recordButton.shrunk span {
	display: none;
}
.beepboxEditor button.playButton.shrunk {
	grid-column-start: 1;
	grid-column-end: 2;
}
.beepboxEditor button.recordButton.shrunk {
	grid-column-start: 2;
	grid-column-end: 3;
}

.beepboxEditor button.cancelButton::before {
	content: "";
	position: absolute;
	width: var(--button-size);
	height: var(--button-size);
	left: 0;
	top: 0;
	pointer-events: none;
	background: currentColor;
	mask-image: var(--close-symbol);
	mask-repeat: no-repeat;
	mask-position: center;
	-webkit-mask-image: var(--close-symbol);
	-webkit-mask-repeat: no-repeat;
	-webkit-mask-position: center;
}

.beepboxEditor button.okayButton::before {
	content: "";
	position: absolute;
	width: var(--button-size);
	height: var(--button-size);
	left: 0;
	top: 0;
	pointer-events: none;
	background: currentColor;
	-webkit-mask-image: var(--checkmark-symbol);
	-webkit-mask-repeat: no-repeat;
	-webkit-mask-position: center;
	mask-image: var(--checkmark-symbol);
	mask-repeat: no-repeat;
	mask-position: center;
}

.beepboxEditor button.exportButton::before {
	content: "";
	position: absolute;
	width: var(--button-size);
	height: var(--button-size);
	left: 0;
	top: 0;
	pointer-events: none;
	background: currentColor;
	mask-image: var(--export-symbol);
	mask-repeat: no-repeat;
	mask-position: center;
	-webkit-mask-image: var(--export-symbol);
	-webkit-mask-repeat: no-repeat;
	-webkit-mask-position: center;
}

.beepboxEditor .instrument-bar {
	display: flex;
	gap: 2px;
}

.beepboxEditor .instrument-bar button {
	flex-grow: 1;
	min-width: 0;
	padding: 0;
	flex-basis: 0;
	display: flex;
	align-items: center;
	justify-content: center;
	color: var(--text-color-lit);
}

.beepboxEditor .instrument-bar .remove-instrument, .beepboxEditor .instrument-bar .add-instrument {
	max-width: var(--button-size);
}

.beepboxEditor .instrument-bar > :not(:first-child) {
	border-top-left-radius: 0;
	border-bottom-left-radius: 0;
}

.beepboxEditor .instrument-bar > :not(.last-button) {
	border-top-right-radius: 0;
	border-bottom-right-radius: 0;
}

.beepboxEditor .instrument-bar .selected-instrument {
	background: var(--background-color-lit);
	color: ${ColorConfig.invertedText};
}

.beepboxEditor .instrument-bar .deactivated {
	background: ${ColorConfig.editorBackground};
	color: var(--text-color-dim);
}

.beepboxEditor .instrument-bar .deactivated.selected-instrument {
	background: var(--background-color-dim);
	color: ${ColorConfig.invertedText};
}

.beepboxEditor .instrument-bar .remove-instrument::before {
	content: "";
	position: absolute;
	width: 100%;
	height: var(--button-size);
	left: 0;
	top: 0;
	pointer-events: none;
	background: currentColor;
	mask-image: var(--close-symbol);
	mask-repeat: no-repeat;
	mask-position: center;
	-webkit-mask-image: var(--close-symbol);
	-webkit-mask-repeat: no-repeat;
	-webkit-mask-position: center;
}

.beepboxEditor .instrument-bar .add-instrument::before {
	content: "";
	position: absolute;
	width: 100%;
	height: var(--button-size);
	left: 0;
	top: 0;
	pointer-events: none;
	background: currentColor;
	mask-image: var(--add-symbol);
	mask-repeat: no-repeat;
	mask-position: center;
	-webkit-mask-image: var(--add-symbol);
	-webkit-mask-repeat: no-repeat;
	-webkit-mask-position: center;
}

.beepboxEditor canvas {
	overflow: hidden;
	position: absolute;
	display: block;
}

.beepboxEditor .trackContainer {
	flex-grow: 1;
}

.beepboxEditor .trackAndMuteContainer {
	display: flex;
	align-items: flex-start;
	width: 100%;
	min-height: 0;
	flex: 1;
	overflow-x: hidden;
	position: relative;
}

.beepboxEditor .channelRow {
	display: flex;
}

.beepboxEditor .channelBox {
	display: flex;
	text-align: center;
	align-items: center;
	justify-content: center;
	box-sizing: border-box;
	padding-top: 1px;
}

.beepboxEditor .channelBoxLabel {
	font-size: 20px;
	font-family: sans-serif;
	font-weight: bold;
}

.beepboxEditor .muteEditor {
	width: 32px;
	flex-shrink: 0;
	display: flex;
	flex-direction: column;
	align-items: stretch;
	position: sticky;
	left: 0;
	z-index: 1;
	background: ${ColorConfig.editorBackground};
}

.beepboxEditor .selectRow, .beepboxEditor .instrumentCopyPasteRow {
	margin: 2px 0;
	height: var(--button-size);
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
}

.beepboxEditor .selectRow > :last-child {
	width: 62.5%;
	flex-shrink: 0;
}

.beepboxEditor .menu-area {
	display: flex;
	flex-direction: column;
}
.beepboxEditor .menu-area > * {
	margin: 2px 0;
}
.beepboxEditor .menu-area > button {
	padding: 0 var(--button-size);
	white-space: nowrap;
}

.beepboxEditor .song-settings-area {
	display: flex;
	flex-direction: column;
}

.beepboxEditor .editor-controls {
	flex-shrink: 0;
	display: flex;
	flex-direction: column;
}

.beepboxEditor .instrument-settings-area {
	display: flex;
	flex-direction: column;
}

.beepboxEditor .editor-right-side-top > *, .beepboxEditor .editor-right-side-bottom > * {
	flex-shrink: 0;
}

.beepboxEditor .pitchShiftMarkerContainer {
	box-sizing: border-box;
	display: flex;
	height: 100%;
	left: 3px;
	right: 3px;
	position: absolute;
	align-items: center;
	pointer-events: none;
}

.beepboxEditor .pitchShiftMarker {
	width: 0;
	height: 0;
	position: absolute;
}

.beepboxEditor .pitchShiftMarker::before {
	content: "";
	width: 2px;
	height: 20px;
	transform: translate(-50%, -50%);
	position: absolute;
	background: currentColor;
	border-radius: 3px;
}

.beepboxEditor input[type=text], .beepboxEditor input[type=number] {
	font-size: inherit;
	font-weight: inherit;
	font-family: inherit;
	background: transparent;
	border: 1px solid ${ColorConfig.uiWidgetFocus};
	color: ${ColorConfig.primaryText};
}

.beepboxEditor input[type=text]::selection, .beepboxEditor input[type=number]::selection {
	background-color: ${ColorConfig.textSelection};
	color: ${ColorConfig.primaryText};
}

.beepboxEditor input[type=checkbox] {
  transform: scale(1.5);
}

.beepboxEditor input[type=range] {
	-webkit-appearance: none;
	color: inherit;
	width: 100%;
	height: var(--button-size);
	font-size: inherit;
	margin: 0;
	cursor: pointer;
	background: none;
	touch-action: pan-y;
}
.beepboxEditor input[type=range]:focus {
	outline: none;
}
.beepboxEditor input[type=range]::-webkit-slider-runnable-track {
	width: 100%;
	height: 6px;
	cursor: pointer;
	background: ${ColorConfig.uiWidgetBackground};
}
.beepboxEditor input[type=range]::-webkit-slider-thumb {
	height: var(--button-size);
	width: 6px;
	border-radius: 3px;
	background: currentColor;
	cursor: pointer;
	-webkit-appearance: none;
	margin-top: -10px;
}
.beepboxEditor input[type=range]:focus::-webkit-slider-runnable-track {
	background: ${ColorConfig.uiWidgetFocus};
}
.beepboxEditor input[type=range]::-moz-range-track {
	width: 100%;
	height: 6px;
	cursor: pointer;
	background: ${ColorConfig.uiWidgetBackground};
}
.beepboxEditor input[type=range]:focus::-moz-range-track {
	background: ${ColorConfig.uiWidgetFocus};
}
.beepboxEditor input[type=range]::-moz-range-thumb {
	height: var(--button-size);
	width: 6px;
	border-radius: 3px;
	border: none;
	background: currentColor;
	cursor: pointer;
}
.beepboxEditor input[type=range]::-ms-track {
	width: 100%;
	height: 6px;
	cursor: pointer;
	background: ${ColorConfig.uiWidgetBackground};
	border-color: transparent;
}
.beepboxEditor input[type=range]:focus::-ms-track {
	background: ${ColorConfig.uiWidgetFocus};
}
.beepboxEditor input[type=range]::-ms-thumb {
	height: var(--button-size);
	width: 6px;
	border-radius: 3px;
	background: currentColor;
	cursor: pointer;
}

/* wide screen */
@media (min-width: 711px) {
	#beepboxEditorContainer {
		display: table;
	}
	.beepboxEditor {
		flex-direction: row;
	}
	.beepboxEditor:focus-within {
		outline: 3px solid ${ColorConfig.uiWidgetBackground};
	}
	.beepboxEditor .trackAndMuteContainer {
		width: 512px;
	}
	.beepboxEditor .play-pause-area {
		display: flex;
		flex-direction: column;
	}
	.beepboxEditor .playback-bar-controls {
		margin: 2px 0;
	}
	.beepboxEditor .playback-volume-controls {
		display: flex;
		flex-direction: row;
		margin: 2px 0;
		align-items: center;
	}
	.beepboxEditor .settings-area {
		width: var(--settings-area-width);
	}
}

/* narrow screen */
@media (max-width: 710px) {
	.beepboxEditor {
		grid-template-columns: minmax(0, 1fr);
		grid-template-rows: min-content 6px min-content min-content;
		grid-template-areas: "pattern-area" "." "track-area" "settings-area";
		grid-row-gap: 0;
	}
	.beepboxEditor .settings-area {
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		grid-template-rows: min-content min-content 1fr min-content;
		grid-template-areas:
			"play-pause-area play-pause-area"
			"menu-area instrument-settings-area"
			"song-settings-area instrument-settings-area"
			"version-area version-area";
		grid-column-gap: 8px;
		margin: 0 4px;
	}
	.beepboxEditor:focus-within {
		outline: none;
	}
	.beepboxEditor .pattern-area {
		max-height: 75vh;
	}
	.beepboxEditor .trackAndMuteContainer {
		overflow-x: auto;
	}
	.beepboxEditor .barScrollBar {
		display: none;
	}
	.beepboxEditor .play-pause-area {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
		grid-column-gap: 8px;
		margin: 2px 0;
	}
	.beepboxEditor .playback-bar-controls {
		flex-grow: 1;
	}
	.beepboxEditor .playback-volume-controls {
		display: flex;
		flex-direction: row;
		align-items: center;
		flex-grow: 1;
	}
}

`));
