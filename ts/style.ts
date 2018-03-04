/*
Copyright (C) 2018 John Nesky

Permission is hereby granted, free of charge, to any person obtaining a copy of 
this software and associated documentation files (the "Software"), to deal in 
the Software without restriction, including without limitation the rights to 
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies 
of the Software, and to permit persons to whom the Software is furnished to do 
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all 
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR 
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, 
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE 
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER 
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, 
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE 
SOFTWARE.
*/

namespace beepbox {

const styleSheet = document.createElement('style');
styleSheet.type = "text/css";
styleSheet.appendChild(document.createTextNode(`

.beepboxEditor {
	display: flex;
	-webkit-touch-callout: none;
	-webkit-user-select: none;
	-khtml-user-select: none;
	-moz-user-select: none;
	-ms-user-select: none;
	user-select: none;
	position: relative;
	touch-action: manipulation;
	cursor: default;
	font-size: small;
	overflow: hidden;
}

.beepboxEditor div {
	margin: 0;
	padding: 0;
}

.beepboxEditor .promptContainer {
	position: absolute;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	background: rgba(0,0,0,0.5);
	display: flex;
	justify-content: center;
	align-items: center;
}

.beepboxEditor .prompt {
	margin: auto;
	text-align: center;
	background: #000;
	border-radius: 15px;
	border: 4px solid #444;
	color: #fff;
	padding: 20px;
	display: flex;
	flex-direction: column;
}

.beepboxEditor .prompt > *:not(:first-child) {
	margin-top: 1.5em;
}

/* Use psuedo-elements to add cross-browser up & down arrows to select elements: */
.beepboxEditor .selectContainer {
	position: relative;
}
.beepboxEditor .selectContainer:not(.menu)::before {
	content: "";
	position: absolute;
	right: 0.3em;
	top: 0.4em;
	border-bottom: 0.4em solid currentColor;
	border-left: 0.3em solid transparent;
	border-right: 0.3em solid transparent;
	pointer-events: none;
}
.beepboxEditor .selectContainer:not(.menu)::after {
	content: "";
	position: absolute;
	right: 0.3em;
	bottom: 0.4em;
	border-top: 0.4em solid currentColor;
	border-left: 0.3em solid transparent;
	border-right: 0.3em solid transparent;
	pointer-events: none;
}
.beepboxEditor .selectContainer.menu::after {
	content: "";
	position: absolute;
	right: 0.7em;
	margin: auto;
	top: 0;
	bottom: 0;
	height: 0;
	border-top: 0.4em solid currentColor;
	border-left: 0.3em solid transparent;
	border-right: 0.3em solid transparent;
	pointer-events: none;
}
.beepboxEditor select {
	margin: 0;
	padding: 0 0.3em;
	display: block;
	height: 2em;
	border: none;
	border-radius: 0.4em;
	background: #444444;
	color: inherit;
	font-size: inherit;
	cursor: pointer;
	font-family: inherit;

	-webkit-appearance:none;
	-moz-appearance: none;
	appearance: none;
}
.beepboxEditor .menu select {
	padding: 0 2em;
}
.beepboxEditor select:focus {
	background: #777777;
	outline: none;
}
.beepboxEditor .menu select {
	text-align: center;
	text-align-last: center;
}

/* This makes it look better in firefox on my computer... What about others?
@-moz-document url-prefix() {
	.beepboxEditor select { padding: 0 2px; }
}
*/
.beepboxEditor button {
	margin: 0;
	position: relative;
	height: 2em;
	border: none;
	border-radius: 0.4em;
	background: #444;
	color: inherit;
	font-size: inherit;
	font-family: inherit;
	cursor: pointer;
}
.beepboxEditor button:focus {
	background: #777;
	outline: none;
}
.beepboxEditor button.playButton, .beepboxEditor button.pauseButton {
	padding-left: 2em;
}
.beepboxEditor button.playButton::before {
	content: "";
	position: absolute;
	left: 0.7em;
	top: 50%;
	margin-top: -0.65em;
	border-left: 1em solid currentColor;
	border-top: 0.65em solid transparent;
	border-bottom: 0.65em solid transparent;
	pointer-events: none;
}
.beepboxEditor button.pauseButton::before {
	content: "";
	position: absolute;
	left: 0.7em;
	top: 50%;
	margin-top: -0.65em;
	width: 0.3em;
	height: 1.3em;
	background: currentColor;
	pointer-events: none;
}
.beepboxEditor button.pauseButton::after {
	content: "";
	position: absolute;
	left: 1.4em;
	top: 50%;
	margin-top: -0.65em;
	width: 0.3em;
	height: 1.3em;
	background: currentColor;
	pointer-events: none;
}

.beepboxEditor button.prevBarButton::before {
	content: "";
	position: absolute;
	left: 50%;
	top: 50%;
	margin-left: -0.5em;
	margin-top: -0.5em;
	width: 0.2em;
	height: 1em;
	background: currentColor;
	pointer-events: none;
}
.beepboxEditor button.prevBarButton::after {
	content: "";
	position: absolute;
	left: 50%;
	top: 50%;
	margin-left: -0.3em;
	margin-top: -0.5em;
	border-right: 0.8em solid currentColor;
	border-top: 0.5em solid transparent;
	border-bottom: 0.5em solid transparent;
	pointer-events: none;
}

.beepboxEditor button.nextBarButton::before {
	content: "";
	position: absolute;
	left: 50%;
	top: 50%;
	margin-left: -0.5em;
	margin-top: -0.5em;
	border-left: 0.8em solid currentColor;
	border-top: 0.5em solid transparent;
	border-bottom: 0.5em solid transparent;
	pointer-events: none;
}
.beepboxEditor button.nextBarButton::after {
	content: "";
	position: absolute;
	left: 50%;
	top: 50%;
	margin-left: 0.3em;
	margin-top: -0.5em;
	width: 0.2em;
	height: 1em;
	background: currentColor;
	pointer-events: none;
}

.beepboxEditor canvas {
	overflow: hidden;
	position: absolute;
	display: block;
}

.beepboxEditor .trackContainer {
	overflow-x: hidden;
}

.beepboxEditor .selectRow {
	margin: 0;
	height: 2.5em;
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: space-between;
}

.beepboxEditor .selectRow > span {
	color: #999;
}

.beepboxEditor .operatorRow {
	margin: 0;
	height: 2.5em;
	display: flex;
	flex-direction: row;
	align-items: center;
}

.beepboxEditor .operatorRow > * {
	flex-grow: 1;
	flex-shrink: 1;
}

.beepboxEditor .editor-widget-column {
	display: flex;
	flex-direction: column;
}

.beepboxEditor .editor-widgets {
	display: flex;
	flex-direction: column;
}

.beepboxEditor .editor-controls {
	display: flex;
	flex-direction: column;
}

.beepboxEditor .editor-menus {
	display: flex;
	flex-direction: column;
}

.beepboxEditor .editor-settings {
	display: flex;
	flex-direction: column;
}

.beepboxEditor .editor-song-settings {
	display: flex;
	flex-direction: column;
}

.beepboxEditor .editor-instrument-settings {
	display: flex;
	flex-direction: column;
}

.beepboxEditor .editor-right-side-top > *, .beepboxEditor .editor-right-side-bottom > * {
	flex-shrink: 0;
}

.beepboxEditor input[type=text], .beepboxEditor input[type=number] {
	font-size: inherit;
	background: transparent;
	border: 1px solid #777;
	color: white;
}

.beepboxEditor input[type=checkbox] {
  transform: scale(1.5);
}

.beepboxEditor input[type=range] {
	-webkit-appearance: none;
	color: inherit;
	width: 100%;
	height: 2em;
	font-size: inherit;
	margin: 0;
	cursor: pointer;
	background-color: black;
	touch-action: pan-y;
}
.beepboxEditor input[type=range]:focus {
	outline: none;
}
.beepboxEditor input[type=range]::-webkit-slider-runnable-track {
	width: 100%;
	height: 0.5em;
	cursor: pointer;
	background: #444;
}
.beepboxEditor input[type=range]::-webkit-slider-thumb {
	height: 2em;
	width: 0.5em;
	border-radius: 0.25em;
	background: currentColor;
	cursor: pointer;
	-webkit-appearance: none;
	margin-top: -0.75em;
}
.beepboxEditor input[type=range]:focus::-webkit-slider-runnable-track {
	background: #777;
}
.beepboxEditor input[type=range]::-moz-range-track {
	width: 100%;
	height: 0.5em;
	cursor: pointer;
	background: #444;
}
.beepboxEditor input[type=range]:focus::-moz-range-track {
	background: #777;
}
.beepboxEditor input[type=range]::-moz-range-thumb {
	height: 2em;
	width: 0.5em;
	border-radius: 0.25em;
	border: none;
	background: currentColor;
	cursor: pointer;
}
.beepboxEditor input[type=range]::-ms-track {
	width: 100%;
	height: 0.5em;
	cursor: pointer;
	background: #444;
	border-color: transparent;
}
.beepboxEditor input[type=range]:focus::-ms-track {
	background: #777;
}
.beepboxEditor input[type=range]::-ms-thumb {
	height: 2em;
	width: 0.5em;
	border-radius: 0.25em;
	background: currentColor;
	cursor: pointer;
}

/* wide screen */
@media (min-width: 701px) {
	#beepboxEditorContainer {
		display: table;
	}
	.beepboxEditor {
		flex-direction: row;
	}
	.beepboxEditor:focus-within {
		outline: 3px solid #555;
	}
	.beepboxEditor .trackContainer {
		width: 512px;
	}
	.beepboxEditor .trackSelectBox {
		display: none;
	}
	.beepboxEditor .playback-controls {
		display: flex;
		flex-direction: column;
	}
	.beepboxEditor .playback-bar-controls {
		display: flex;
		flex-direction: row;
		margin: .2em 0;
	}
	.beepboxEditor .playback-volume-controls {
		display: flex;
		flex-direction: row;
		margin: .2em 0;
		align-items: center;
	}
	.beepboxEditor .pauseButton, .beepboxEditor .playButton {
		flex-grow: 1;
	}
	.beepboxEditor .nextBarButton, .beepboxEditor .prevBarButton {
		flex-grow: 1;
		margin-left: 10px;
	}
	.beepboxEditor .editor-widget-column {
		margin-left: 6px;
		width: 14em;
		flex-direction: column;
	}
	.beepboxEditor .editor-widgets {
		flex-grow: 1;
	}
	.beepboxEditor .editor-settings input, .beepboxEditor .editor-settings select {
		width: 9em;
	}
	.beepboxEditor .editor-menus > * {
		flex-grow: 1;
		margin: .2em 0;
	}
	.beepboxEditor .editor-menus > button {
		padding: 0 2em;
		white-space: nowrap;
	}
}

/* narrow screen */
@media (max-width: 700px) {
	.beepboxEditor {
		flex-direction: column;
	}
	.beepboxEditor:focus-within {
		outline: none;
	}
	.beepboxEditor .editorBox {
		max-height: 75vh;
	}
	.beepboxEditor .editor-menus {
		flex-direction: row;
	}
	.beepboxEditor .editor-menus > * {
		flex-grow: 1;
		margin: .2em;
	}
	.beepboxEditor .editor-menus > button {
		padding-left: 2em;
		white-space: nowrap;
	}
	.beepboxEditor .trackContainer {
		overflow-x: auto;
	}
	.beepboxEditor .barScrollBar {
		display: none;
	}
	.beepboxEditor .playback-controls {
		display: flex;
		flex-direction: row;
		margin: .2em 0;
	}
	.beepboxEditor .playback-bar-controls {
		display: flex;
		flex-direction: row;
		flex-grow: 1;
	}
	.beepboxEditor .playback-volume-controls {
		display: flex;
		flex-direction: row;
		align-items: center;
		flex-grow: 1;
		margin: 0 .2em;
	}
	.beepboxEditor .editor-widget-column {
		flex-direction: column-reverse;
	}
	.beepboxEditor .editor-settings {
		flex-direction: row;
	}
	.beepboxEditor .pauseButton, .beepboxEditor .playButton,
	.beepboxEditor .nextBarButton, .beepboxEditor .prevBarButton {
		flex-grow: 1;
		margin: 0 .2em;
	}
	.beepboxEditor .editor-song-settings, .beepboxEditor .editor-instrument-settings {
		flex-grow: 1;
		margin: 0 .2em;
	}
	.beepboxEditor .editor-settings input, .beepboxEditor .editor-settings .selectContainer {
		width: 60%;
	}
	.beepboxEditor .editor-settings select {
		width: 100%;
	}
	.fullWidthOnly {
		display: none;
	}
	p {
		margin: 1em 0.5em;
	}
}

`));

document.head.appendChild(styleSheet);
	
}
