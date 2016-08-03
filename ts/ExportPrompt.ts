/*
Copyright (C) 2012 John Nesky

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

/// <reference path="synth.ts" />
/// <reference path="editor.ts" />
/// <reference path="SongEditor.ts" />

"use strict";

module beepbox {
	export interface ExportPrompt {
	}

	export function ExportPrompt(doc: SongDocument, songEditor: SongEditor): void {
		var container: HTMLElement = <HTMLElement>document.getElementById("exportPrompt");
		var enableIntro: HTMLInputElement = <HTMLInputElement>document.getElementById("enableIntro");
		var loopDropDown: HTMLInputElement = <HTMLInputElement>document.getElementById("loopDropDown");
		var enableOutro: HTMLInputElement = <HTMLInputElement>document.getElementById("enableOutro");
		var exportOkayButton: HTMLButtonElement = <HTMLButtonElement>document.getElementById("exportOkayButton");
		var exportCancelButton: HTMLButtonElement = <HTMLButtonElement>document.getElementById("exportCancelButton");
		
		function onClose(): void { 
			container.style.display = "none";
			songEditor.closePrompt();
			loopDropDown.removeEventListener("keypress", validateKey);
			loopDropDown.removeEventListener("blur", validateNumber);
			exportOkayButton.removeEventListener("click", onExport);
			exportCancelButton.removeEventListener("click", onClose);
		}
		
		function validateKey(event: KeyboardEvent): boolean {
			var charCode = (event.which) ? event.which : event.keyCode;
			if (charCode != 46 && charCode > 31 && (charCode < 48 || charCode > 57)) {
				event.preventDefault();
				return true;
			}
			return false;
		}
		
		function validateNumber(event: Event): void {
			var input: HTMLInputElement = <HTMLInputElement>event.target;
			input.value = Math.floor(Math.max(Number(input.min), Math.min(Number(input.max), Number(input.value)))) + "";
		}
		
		function onExport(): void {
			
			var synth: Synth = new Synth(doc.song)
			synth.enableIntro = enableIntro.checked;
			synth.enableOutro = enableOutro.checked;
			synth.loopCount = Number(loopDropDown.value);
			if (!synth.enableIntro) {
				for (var introIter: number = 0; introIter < doc.song.loopStart; introIter++) {
					synth.nextBar();
				}
			}
			var sampleFrames: number = synth.totalSamples;
			var recordedSamples: Float32Array = new Float32Array(sampleFrames);
			//var timer: number = performance.now();
			synth.synthesize(recordedSamples, sampleFrames);
			//console.log("export timer", (performance.now() - timer) / 1000.0);
			
			var srcChannelCount: number = 1;
			var wavChannelCount: number = 1;
			var sampleRate: number = 44100;
			var bytesPerSample: number = 2;
			var bitsPerSample: number = 8 * bytesPerSample;
			var sampleCount: number = wavChannelCount * sampleFrames;
			
			var totalFileSize: number = 44 + sampleCount * bytesPerSample;
			
			var index: number = 0;
			var arrayBuffer: ArrayBuffer = new ArrayBuffer(totalFileSize);
			var data: DataView = new DataView(arrayBuffer);
			data.setUint32(index, 0x52494646, false); index += 4;
			data.setUint32(index, 36 + sampleCount * bytesPerSample, true); index += 4; // size of remaining file
			data.setUint32(index, 0x57415645, false); index += 4;
			data.setUint32(index, 0x666D7420, false); index += 4;
			data.setUint32(index, 0x00000010, true); index += 4; // size of following header
			data.setUint16(index, 0x0001, true); index += 2; // not compressed
			data.setUint16(index, wavChannelCount, true); index += 2; // channel count
			data.setUint32(index, sampleRate, true); index += 4; // sample rate
			data.setUint32(index, sampleRate * bytesPerSample * wavChannelCount, true); index += 4; // bytes per second
			data.setUint16(index, bytesPerSample, true); index += 2; // sample rate
			data.setUint16(index, bitsPerSample, true); index += 2; // sample rate
			data.setUint32(index, 0x64617461, false); index += 4;
			data.setUint32(index, sampleCount * bytesPerSample, true); index += 4;
			var stride: number;
			var repeat: number;
			if (srcChannelCount == wavChannelCount) {
				stride = 1;
				repeat = 1;
			} else {
				stride = srcChannelCount;
				repeat = wavChannelCount;
			}
			
			var i: number;
			var j: number;
			var k: number;
			var val: number;
			if (bytesPerSample > 1) {
				// usually samples are signed. 
				for (i = 0; i < sampleFrames; i++) {
					val = Math.floor(recordedSamples[i * stride] * ((1 << (bitsPerSample - 1)) - 1));
					for (k = 0; k < repeat; k++) {
						if (bytesPerSample == 2) {
							data.setInt16(index, val, true); index += 2;
						} else if (bytesPerSample == 4) {
							data.setInt32(index, val, true); index += 4;
						} else {
							throw new Error("unsupported sample size");
						}
					}
				}
			} else {
				// 8 bit samples are a special case: they are unsigned.
				for (i = 0; i < sampleFrames; i++) {
					val = Math.floor(recordedSamples[i*stride] * 127 + 128);
					for (k = 0; k < repeat; k++) {
						data.setUint8(index, val > 255 ? 255 : (val < 0 ? 0 : val)); index++;
					}
				}
			}
			
			var blob = new Blob([arrayBuffer], {type: "audio/vnd.wav"}); // audio/vnd.wave ?
			saveAs(blob, "song.wav");
			
			onClose();
		}
		
		loopDropDown.value = "1";
		
		if (doc.song.loopStart == 0) {
			enableIntro.checked = false;
			enableIntro.disabled = true;
		} else {
			enableIntro.checked = true;
			enableIntro.disabled = false;
		}
		if (doc.song.loopStart + doc.song.loopLength == doc.song.bars) {
			enableOutro.checked = false;
			enableOutro.disabled = true;
		} else {
			enableOutro.checked = true;
			enableOutro.disabled = false;
		}
		
		loopDropDown.addEventListener("keypress", validateKey);
		loopDropDown.addEventListener("blur", validateNumber);
		exportOkayButton.addEventListener("click", onExport);
		exportCancelButton.addEventListener("click", onClose);
		
		container.style.display = "block";
	}
}

/*! @source https://github.com/eligrey/FileSaver.js/blob/master/FileSaver.min.js */
var saveAs=saveAs||function(e){"use strict";if(typeof e==="undefined"||typeof navigator!=="undefined"&&/MSIE [1-9]\./.test(navigator.userAgent)){return}var t=e.document,n=function(){return e.URL||e.webkitURL||e},r=t.createElementNS("http://www.w3.org/1999/xhtml","a"),o="download"in r,i=function(e){var t=new MouseEvent("click");e.dispatchEvent(t)},a=/constructor/i.test(e.HTMLElement),f=/CriOS\/[\d]+/.test(navigator.userAgent),u=function(t){(e.setImmediate||e.setTimeout)(function(){throw t},0)},d="application/octet-stream",s=1e3*40,c=function(e){var t=function(){if(typeof e==="string"){n().revokeObjectURL(e)}else{e.remove()}};setTimeout(t,s)},l=function(e,t,n){t=[].concat(t);var r=t.length;while(r--){var o=e["on"+t[r]];if(typeof o==="function"){try{o.call(e,n||e)}catch(i){u(i)}}}},p=function(e){if(/^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(e.type)){return new Blob([String.fromCharCode(65279),e],{type:e.type})}return e},v=function(t,u,s){if(!s){t=p(t)}var v=this,w=t.type,m=w===d,y,h=function(){l(v,"writestart progress write writeend".split(" "))},S=function(){if((f||m&&a)&&e.FileReader){var r=new FileReader;r.onloadend=function(){var t=f?r.result:r.result.replace(/^data:[^;]*;/,"data:attachment/file;");var n=e.open(t,"_blank");if(!n)e.location.href=t;t=undefined;v.readyState=v.DONE;h()};r.readAsDataURL(t);v.readyState=v.INIT;return}if(!y){y=n().createObjectURL(t)}if(m){e.location.href=y}else{var o=e.open(y,"_blank");if(!o){e.location.href=y}}v.readyState=v.DONE;h();c(y)};v.readyState=v.INIT;if(o){y=n().createObjectURL(t);setTimeout(function(){r.href=y;r.download=u;i(r);h();c(y);v.readyState=v.DONE});return}S()},w=v.prototype,m=function(e,t,n){return new v(e,t||e.name||"download",n)};if(typeof navigator!=="undefined"&&navigator.msSaveOrOpenBlob){return function(e,t,n){t=t||e.name||"download";if(!n){e=p(e)}return navigator.msSaveOrOpenBlob(e,t)}}w.abort=function(){};w.readyState=w.INIT=0;w.WRITING=1;w.DONE=2;w.error=w.onwritestart=w.onprogress=w.onwrite=w.onabort=w.onerror=w.onwriteend=null;return m}(typeof self!=="undefined"&&self||typeof window!=="undefined"&&window||this.content);if(typeof module!=="undefined"&&module.exports){module.exports.saveAs=saveAs}else if(typeof define!=="undefined"&&define!==null&&define.amd!==null){define([],function(){return saveAs})}
