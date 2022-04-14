// Copyright (c) 2012-2022 John Nesky and contributing authors, distributed under the MIT license, see accompanying the LICENSE.md file.

import {Scale, Config} from "../synth/SynthConfig";

export class Preferences {
	public static readonly defaultVisibleOctaves: number = 3;
	
	public autoPlay: boolean;
	public autoFollow: boolean;
	public enableNotePreview: boolean;
	public showFifth: boolean;
	public notesOutsideScale: boolean;
	public defaultScale: number;
	public showLetters: boolean;
	public showChannels: boolean;
	public showScrollBar: boolean;
	public alwaysShowSettings: boolean;
	public instrumentCopyPaste: boolean;
	public enableChannelMuting: boolean;
	public colorTheme: string;
	public layout: string;
	public displayBrowserUrl: boolean;
	public volume: number = 75;
	public visibleOctaves: number = Preferences.defaultVisibleOctaves;
	
	constructor() {
		this.reload();
	}
	
	public reload(): void {
		this.autoPlay = window.localStorage.getItem("autoPlay") == "true";
		this.autoFollow = window.localStorage.getItem("autoFollow") == "true";
		this.enableNotePreview = window.localStorage.getItem("enableNotePreview") != "false";
		this.showFifth = window.localStorage.getItem("showFifth") == "true";
		this.notesOutsideScale = window.localStorage.getItem("notesOutsideScale") == "true";
		this.showLetters = window.localStorage.getItem("showLetters") == "true";
		this.showChannels = window.localStorage.getItem("showChannels") == "true";
		this.showScrollBar = window.localStorage.getItem("showScrollBar") == "true";
		this.alwaysShowSettings = window.localStorage.getItem("alwaysShowSettings") == "true";
		this.instrumentCopyPaste = window.localStorage.getItem("instrumentCopyPaste") == "true";
		this.enableChannelMuting = window.localStorage.getItem("enableChannelMuting") == "true";
		this.displayBrowserUrl = window.localStorage.getItem("displayBrowserUrl") != "false";
		this.layout = window.localStorage.getItem("layout") || "small";
		this.colorTheme = window.localStorage.getItem("colorTheme") || "dark classic";
		this.visibleOctaves = ((<any>window.localStorage.getItem("visibleOctaves")) >>> 0) || Preferences.defaultVisibleOctaves;
		
		const defaultScale: Scale | undefined = Config.scales.dictionary[window.localStorage.getItem("defaultScale")!];
		this.defaultScale = (defaultScale != undefined) ? defaultScale.index : 0;
		
		if (window.localStorage.getItem("volume") != null) {
			this.volume = Math.min(<any>window.localStorage.getItem("volume") >>> 0, 75);
		}
		
		if (window.localStorage.getItem("fullScreen") != null) {
			if (window.localStorage.getItem("fullScreen") == "true") this.layout = "long";
			window.localStorage.removeItem("fullScreen");
		}
	}
	
	public save(): void {
		window.localStorage.setItem("autoPlay", this.autoPlay ? "true" : "false");
		window.localStorage.setItem("autoFollow", this.autoFollow ? "true" : "false");
		window.localStorage.setItem("enableNotePreview", this.enableNotePreview ? "true" : "false");
		window.localStorage.setItem("showFifth", this.showFifth ? "true" : "false");
		window.localStorage.setItem("notesOutsideScale", this.notesOutsideScale ? "true" : "false");
		window.localStorage.setItem("defaultScale", Config.scales[this.defaultScale].name);
		window.localStorage.setItem("showLetters", this.showLetters ? "true" : "false");
		window.localStorage.setItem("showChannels", this.showChannels ? "true" : "false");
		window.localStorage.setItem("showScrollBar", this.showScrollBar ? "true" : "false");
		window.localStorage.setItem("alwaysShowSettings", this.alwaysShowSettings ? "true" : "false");
		window.localStorage.setItem("enableChannelMuting", this.enableChannelMuting ? "true" : "false");
		window.localStorage.setItem("instrumentCopyPaste", this.instrumentCopyPaste ? "true" : "false");
		window.localStorage.setItem("displayBrowserUrl", this.displayBrowserUrl ? "true" : "false");
		window.localStorage.setItem("layout", this.layout);
		window.localStorage.setItem("colorTheme", this.colorTheme);
		window.localStorage.setItem("volume", String(this.volume));
		window.localStorage.setItem("visibleOctaves", String(this.visibleOctaves));
	}
}
