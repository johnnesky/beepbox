// Copyright (C) 2020 John Nesky, distributed under the MIT license.

import { HTML } from "imperative-html/dist/esm/elements-strict";
import { ColorConfig } from "./ColorConfig";

//namespace beepbox {
export class Layout {
	private static readonly _normalLayout: string = `
		`;

	private static readonly _wideFullScreenLayout: string = `
			/* wide full screen (jummbox) */
			@media (min-width: 1001px) {
				#beepboxEditorContainer {
					max-width: initial;
					height: 100vh;
				}
				.beepboxEditor {
					width: 100%;
					min-height: 100vh;
					grid-template-columns: 512px minmax(0, 1fr) 30em; /* minmax(0, 1fr) min-content; Chrome 80 grid layout regression. https://bugs.chromium.org/p/chromium/issues/detail?id=1050307 */
					grid-template-rows: minmax(481px, 1fr) min-content;
					grid-template-areas: "track-area pattern-area settings-area";
				}
				.beepboxEditor .track-area {
					width: 100%;
					max-height: 100%;
					overflow-y: auto;
				}
				.beepboxEditor .pattern-area {
					width: 100%;
					height: 100%;
				}
				.beepboxEditor .editor-widget-column {
					flex: 0;
				}
				.beepboxEditor .instrument-settings-area {
					overflow-y: auto;
					position: relative;
				}
				.beepboxEditor .instrument-settings-area > .editor-controls {
					position: absolute;
					width: 100%;
				}
				.beepboxEditor .song-settings-area {
					overflow-y: auto;
				}
				
				.beepboxEditor .settings-area {
					width: 30em;
					grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
					grid-template-rows: auto auto auto minmax(0, 1fr);
					grid-template-areas:
						"instrument-settings-area version-area"
						"instrument-settings-area play-pause-area"
						"instrument-settings-area menu-area"
						"instrument-settings-area song-settings-area";
				}
				.beepboxEditor .trackAndMuteContainer {
					max-height: calc( 100vh - 20px );
				}

				.beepboxEditor .barScrollBar {
					position: absolute !important;
				}

			}
		`;

	private static readonly _fullScreenLayout: string = `
			/* full screen (beepbox) */
			@media (min-width: 701px) {
				#beepboxEditorContainer {
					max-width: initial;
					height: 100vh;
				}
				.beepboxEditor {
					width: 100%;
					min-height: 100vh;
					grid-template-columns: minmax(0, 1fr) 30em; /* minmax(0, 1fr) min-content; Chrome 80 grid layout regression. https://bugs.chromium.org/p/chromium/issues/detail?id=1050307 */
					grid-template-rows: minmax(481px, 1fr) min-content;
					grid-template-areas: "pattern-area settings-area" "track-area track-area";
				}
				.beepboxEditor .pattern-area {
					width: 100%;
					height: 100%;
				}
				.beepboxEditor .track-area {
					width: 100%;
					overflow-y: auto;
				}
				.beepboxEditor .editor-widget-column {
					flex: 0;
				}
				.beepboxEditor .trackAndMuteContainer {
					width: 100%;
				}
				.beepboxEditor .instrument-settings-area {
					overflow-y: auto;
					position: relative;
				}
				.beepboxEditor .instrument-settings-area > .editor-controls {
					position: absolute;
					width: 100%;
				}
				.beepboxEditor .song-settings-area {
					overflow-y: auto;
				}
				
				.beepboxEditor .settings-area {
					width: 30em;
					grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
					grid-template-rows: auto auto auto minmax(0, 1fr);
					grid-template-areas:
						"instrument-settings-area version-area"
						"instrument-settings-area play-pause-area"
						"instrument-settings-area menu-area"
						"instrument-settings-area song-settings-area";
				}
				
				.beepboxEditor .barScrollBar {
					display: none;
				}
				.beepboxEditor.selectRow {
					height: 2em;
				}
				.beepboxEditor .operatorRow {
					heiht: 2em;
				}
				.beepboxEditor .trackAndMuteContainer {
					max-height: 446px;
				}

				.beepboxEditor .trackContainer {
					overflow-x: auto;
					scrollbar-width: auto;
					scrollbar-color: ${ColorConfig.uiWidgetBackground} ${ColorConfig.editorBackground};
				}
				.beepboxEditor .trackContainer::-webkit-scrollbar {
					width: 20px;
					height: 20px;
				}
				.beepboxEditor .trackContainer::-webkit-scrollbar-track {
					background: ${ColorConfig.editorBackground};
				}
				.beepboxEditor .trackContainer::-webkit-scrollbar-thumb {
					background-color: ${ColorConfig.uiWidgetBackground};
					border: 3px solid ${ColorConfig.editorBackground};
				}
			}
		`;

	private static readonly _styleElement: HTMLStyleElement = document.head.appendChild(HTML.style({ type: "text/css" }));

	public static setFullScreen(layout: string): void {
		switch (layout) {
			case "normal":
				this._styleElement.textContent = this._normalLayout;
				break;
			case "fullscreen":
				this._styleElement.textContent = this._fullScreenLayout;
				break;
			case "widefullscreen":
				this._styleElement.textContent = this._wideFullScreenLayout;
				break;
		}
	}
}
//}
