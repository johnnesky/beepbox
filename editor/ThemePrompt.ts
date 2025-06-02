// Copyright (c) John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

import { HTML } from "imperative-html/dist/esm/elements-strict.js";
import { SongDocument } from "./SongDocument.js";
import { Prompt } from "./Prompt.js";
import { ColorConfig } from "./ColorConfig.js"; 
	const {button, div, form, label, input } = HTML;

	export class ThemePrompt implements Prompt {
		public hasChanged = false;
		private readonly _closeButton: HTMLButtonElement = button({style:"flex: 1; width: 0;"},"Close");
		private readonly _previewButton: HTMLButtonElement = button({style:"flex: 1; width: 0;"},"Preview");
		private readonly _previewText: HTMLDivElement = div({style:"opacity: 0; position:absolute; left: 8px; top: 24px; font-size: 32px; font-weight:bold;"},"Previewing...")
		public readonly previewExit: HTMLDivElement = div({style: "width: 100vw; height: 100vh; position: fixed; left: 0; top: -2vh; display: flex; pointer-events: none;"},this._previewText);
		
		private _form: HTMLFormElement = form({style: "display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; max-height:265px; overflow-y: scroll; overflow-x: hidden;"},
			label({title:"BeepBox Dark", class: "theme-option"},
				input({type: "radio", name: "theme", value: "dark classic", style:"display:none;"}),
				div({style:"display: flex; flex-direction: column; gap: 3px; align-items: center;"},
					div({style:"background: black; width: 64px; height: 64px; border-radius: 35px; border: solid; border-color:currentColor; display: flex; align-items: center; justify-content: center;"},
						div({style:"width: 58px; height: 58px; background: #606060; border-radius: 35px;"}),
					),
					div({style:"text-wrap:wrap; max-width: 64px; color:currentColor;"},"BeepBox Dark"),
				),
			),
			label({title:"BeepBox Light", class: "theme-option"},
				input({type: "radio", name: "theme", value: "light classic",style:"display:none;"}),
				div({style:"display: flex; flex-direction: column; gap: 3px; align-items: center;"},
					div({style:"background: black; width: 64px; height: 64px; border-radius: 35px; border: solid; border-color:currentColor; display: flex; align-items: center; justify-content: center;"},
						div({style:"width: 58px; height: 58px; background: #f0d6b6; border-radius: 35px;"}),
					),
					div({style:"text-wrap:wrap; max-width: 64px; color:currentColor;"},"BeepBox Light"),
				),
			),
			label({title:"BeepBox Competitive", class: "theme-option"},
				input({type: "radio", name: "theme", value: "dark competition",style:"display:none;"}),
				div({style:"display: flex; flex-direction: column; gap: 3px; align-items: center;"},
					div({style:"background: black; width: 64px; height: 64px; border-radius: 35px; border: solid; border-color:currentColor; display: flex; align-items: center; justify-content: center;"},
						div({style:"width: 58px; height: 58px; background: #884a44; border-radius: 35px;"}),
					),
					div({style:"text-wrap:wrap; max-width: 64px; color:currentColor;"},"BeepBox Competitive"),
				),
			),
			label({title:"Marine", class: "theme-option"},
				input({type: "radio", name: "theme", value: "marine",style:"display:none;"}),
				div({style:"display: flex; flex-direction: column; gap: 3px; align-items: center;"},
					div({style:"background: black; width: 64px; height: 64px; border-radius: 35px; border: solid; border-color:currentColor; display: flex; align-items: center; justify-content: center;"},
						div({style:"width: 58px; height: 58px; background: #444baf; border-radius: 35px;"}),
					),
					div({style:"text-wrap:wrap; max-width: 64px; color:currentColor;"},"Marine"),
				),
			),
			label({title:"Ruby", class: "theme-option"},
				input({type: "radio", name: "theme", value: "ruby",style:"display:none;"}),
				div({style:"display: flex; flex-direction: column; gap: 3px; align-items: center;"},
					div({style:"background: black; width: 64px; height: 64px; border-radius: 35px; border: solid; border-color:currentColor; display: flex; align-items: center; justify-content: center;"},
						div({style:"width: 58px; height: 58px; background: #b42a2a; border-radius: 35px;"}),
					),
					div({style:"text-wrap:wrap; max-width: 64px; color:currentColor;"},"Ruby"),
				),
			),
			label({title:"Amber", class: "theme-option"},
				input({type: "radio", name: "theme", value: "amber",style:"display:none;"}),
				div({style:"display: flex; flex-direction: column; gap: 3px; align-items: center;"},
					div({style:"background: black; width: 64px; height: 64px; border-radius: 35px; border: solid; border-color:currentColor; display: flex; align-items: center; justify-content: center;"},
						div({style:"width: 58px; height: 58px; background: #b36c2f; border-radius: 35px;"}),
					),
					div({style:"text-wrap:wrap; max-width: 64px; color:currentColor;"},"Amber"),
				),
			),
			label({title:"Emerald", class: "theme-option"},
				input({type: "radio", name: "theme", value: "emerald",style:"display:none;"}),
				div({style:"display: flex; flex-direction: column; gap: 3px; align-items: center;"},
					div({style:"background: black; width: 64px; height: 64px; border-radius: 35px; border: solid; border-color:currentColor; display: flex; align-items: center; justify-content: center;"},
						div({style:"width: 58px; height: 58px; background: #0b8317; border-radius: 35px;"}),
					),
					div({style:"text-wrap:wrap; max-width: 64px; color:currentColor;"},"Emerald"),
				),
			),
			label({title:"Amethyst", class: "theme-option"},
				input({type: "radio", name: "theme", value: "amethyst",style:"display:none;"}),
				div({style:"display: flex; flex-direction: column; gap: 3px; align-items: center;"},
					div({style:"background: black; width: 64px; height: 64px; border-radius: 35px; border: solid; border-color:currentColor; display: flex; align-items: center; justify-content: center;"},
						div({style:"width: 58px; height: 58px; background: #a967bf; border-radius: 35px;"}),
					),
					div({style:"text-wrap:wrap; max-width: 64px; color:currentColor;"},"Amethyst"),
				),
			),
		);
		
		
		public readonly themeContainer: HTMLDivElement = div({class: "prompt", style: "width: 330px; max-height: 600px;"}, 
                div({ style: "font-size: 2em" }, div("Themes")),
				this._form,
				div({style:"display:flex; flex-direction:row; width:100%; gap: 16px;"},
			this._previewButton,
			this._closeButton),
        );
		public readonly container: HTMLDivElement = div({}, 
			this.themeContainer,
			this.previewExit,
        );

			constructor(private _doc: SongDocument) {
				this._closeButton.addEventListener("click", this._close);
				this._previewButton.addEventListener("click", this._previewTheme);
				this.previewExit.addEventListener("click", this._exitPreview);
				this._form.addEventListener("change", this._themeChange);
				if (window.localStorage.getItem("colorTheme") != null) {
					(<any> this._form.elements)["theme"].value = window.localStorage.getItem("colorTheme");
				}
			}

			private _close = (): void => { 
				if (this.hasChanged == false) {
					if (window.localStorage.getItem("colorTheme")){
						ColorConfig.setTheme(String(window.localStorage.getItem("colorTheme")));
					} else {
						ColorConfig.setTheme("default");
					}
					this._doc.prompt = null;
					this._doc.undo(); 
				} else {
					window.localStorage.setItem("colorTheme", (<any> this._form.elements)["theme"].value);
					this._doc.prompt = null;
					this._doc.undo();	
				}
			}

			private _themeChange = (): void => {
				ColorConfig.setTheme((<any> this._form.elements)["theme"].value);
				
				if ((<any> this._form.elements)["theme"].value != window.localStorage.getItem("colorTheme")) {
				this.hasChanged = true;
				this._closeButton.innerHTML = "Save"; 
			} else {
				this.hasChanged = false;
				this._closeButton.innerHTML = "Cancel"; 
				}
			}

			private _previewTheme = (): void => { 
				this.themeContainer.style.opacity = "0";
				this.previewExit.style.pointerEvents = "";
				this._previewText.style.opacity = "1";
			}

			private _exitPreview = (): void => { 
				this.themeContainer.style.opacity = "1";
				this.previewExit.style.pointerEvents = "none";
				this._previewText.style.opacity = "0";
			}
			
			public cleanUp = (): void => { 
				this._closeButton.removeEventListener("click", this._close);
            };
    }
