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

interface ArrayBufferConstructor {
	transfer: any;
}

module beepbox {
	const {button, div, input, text} = html;
	
	// Polyfill for ArrayBuffer.transfer.
	///@TODO: Check if ArrayBuffer.transfer is widely implemented.
	if (!ArrayBuffer.transfer) {
		ArrayBuffer.transfer = function(source, length) {
			source = Object(source);
			const dest = new ArrayBuffer(length);
			if (!(source instanceof ArrayBuffer) || !(dest instanceof ArrayBuffer)) {
				throw new TypeError('Source and destination must be ArrayBuffer instances');
			}
			let nextOffset = 0;
			let leftBytes = Math.min(source.byteLength, dest.byteLength);
			const wordSizes = [8, 4, 2, 1];
			for (const wordSize of wordSizes) {
				if (leftBytes >= wordSize) {
					const done = transferWith(wordSize, source, dest, nextOffset, leftBytes);
					nextOffset = done.nextOffset;
					leftBytes = done.leftBytes;
				}
			}
			return dest;
			function transferWith(wordSize, source, dest, nextOffset, leftBytes) {
				let ViewClass = Uint8Array;
				switch (wordSize) {
					case 8:
						ViewClass = Float64Array;
						break;
					case 4:
						ViewClass = Float32Array;
						break;
					case 2:
						ViewClass = Uint16Array;
						break;
					case 1:
						ViewClass = Uint8Array;
						break;
					default:
						ViewClass = Uint8Array;
						break;
				}
				
				const view_source = new ViewClass(source, nextOffset, (leftBytes / wordSize) | 0);
				const view_dest = new ViewClass(dest, nextOffset, (leftBytes / wordSize) | 0);
				for (let i = 0; i < view_dest.length; i++) {
					view_dest[i] = view_source[i];
				}
				return {
					nextOffset : view_source.byteOffset + view_source.byteLength,
					leftBytes : leftBytes - view_dest.length * wordSize,
				}
			}
		};
	}
	export interface ExportPrompt {
	}

	export function ExportPrompt(doc: SongDocument, songEditor: SongEditor): void {
		const enableIntro: HTMLInputElement = input({type: "checkbox"});
		const loopDropDown: HTMLInputElement = input({style:"width: 40px; height: 16px;", type: "number", min: "1", max: "4", step: "1"});
		const enableOutro: HTMLInputElement = input({type: "checkbox"});
		const exportWavButton: HTMLButtonElement = button({style: "width:200px;", type: "button"}, [text("Export to .wav")]);
		const exportCancelButton: HTMLButtonElement = button({style: "width:200px;", type: "button"}, [text("Cancel")]);
		
		const container: HTMLDivElement = div({style: "position: absolute;"}, [
			div({style: "display: table-cell; vertical-align: middle; width: 700px; height: 645px;"}, [
				div({style: "margin: auto; text-align: center; background: #000000; width: 200px; border-radius: 15px; border: 4px solid #444444; color: #ffffff; font-size: 12px; padding: 20px;"}, [
					div({style: "font-size: 30px"}, [text("Export Options")]),
					div({style: "height: 30px;"}),
					div({style: "display: table; width: 200px;"}, [
						div({style: "display: table-row;"}, [
							div({style: "display: table-cell;"}, [text("Intro:")]),
							div({style: "display: table-cell;"}, [text("Loop Count:")]),
							div({style: "display: table-cell;"}, [text("Outro:")]),
						]),
						div({style: "display: table-row; height: 30px;"}, [
							div({style: "display: table-cell; vertical-align: middle;"}, [enableIntro]),
							div({style: "display: table-cell; vertical-align: middle;"}, [loopDropDown]),
							div({style: "display: table-cell; vertical-align: middle;"}, [enableOutro]),
						]),
					]),
					div({style: "height: 20px;"}),
					exportWavButton,
					div({style: "height: 20px;"}),
					exportCancelButton,
				]),
			]),
		]);
		
		beepboxEditorContainer.children[0].appendChild(container);
		
		function onClose(): void { 
			beepboxEditorContainer.children[0].removeChild(container);
			songEditor.closePrompt();
			loopDropDown.removeEventListener("keypress", validateKey);
			loopDropDown.removeEventListener("blur", validateNumber);
			exportWavButton.removeEventListener("click", onExportToWav);
			exportCancelButton.removeEventListener("click", onClose);
		}
		
		function validateKey(event: KeyboardEvent): boolean {
			const charCode = (event.which) ? event.which : event.keyCode;
			if (charCode != 46 && charCode > 31 && (charCode < 48 || charCode > 57)) {
				event.preventDefault();
				return true;
			}
			return false;
		}
		
		function validateNumber(event: Event): void {
			const input: HTMLInputElement = <HTMLInputElement>event.target;
			input.value = Math.floor(Math.max(Number(input.min), Math.min(Number(input.max), Number(input.value)))) + "";
		}
		
		function onExportToWav(): void {
			
			const synth: Synth = new Synth(doc.song)
			synth.enableIntro = enableIntro.checked;
			synth.enableOutro = enableOutro.checked;
			synth.loopCount = Number(loopDropDown.value);
			if (!synth.enableIntro) {
				for (let introIter: number = 0; introIter < doc.song.loopStart; introIter++) {
					synth.nextBar();
				}
			}
			const sampleFrames: number = synth.totalSamples;
			const recordedSamples: Float32Array = new Float32Array(sampleFrames);
			//const timer: number = performance.now();
			synth.synthesize(recordedSamples, sampleFrames);
			//console.log("export timer", (performance.now() - timer) / 1000.0);
			
			const srcChannelCount: number = 1;
			const wavChannelCount: number = 1;
			const sampleRate: number = 44100;
			const bytesPerSample: number = 2;
			const bitsPerSample: number = 8 * bytesPerSample;
			const sampleCount: number = wavChannelCount * sampleFrames;
			
			const totalFileSize: number = 44 + sampleCount * bytesPerSample;
			
			let index: number = 0;
			const arrayBuffer: ArrayBuffer = new ArrayBuffer(totalFileSize);
			const data: DataView = new DataView(arrayBuffer);
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
			let stride: number;
			let repeat: number;
			if (srcChannelCount == wavChannelCount) {
				stride = 1;
				repeat = 1;
			} else {
				stride = srcChannelCount;
				repeat = wavChannelCount;
			}
			
			let val: number;
			if (bytesPerSample > 1) {
				// usually samples are signed. 
				for (let i: number = 0; i < sampleFrames; i++) {
					val = Math.floor(recordedSamples[i * stride] * ((1 << (bitsPerSample - 1)) - 1));
					for (let k: number = 0; k < repeat; k++) {
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
				for (let i: number = 0; i < sampleFrames; i++) {
					val = Math.floor(recordedSamples[i*stride] * 127 + 128);
					for (let k: number = 0; k < repeat; k++) {
						data.setUint8(index, val > 255 ? 255 : (val < 0 ? 0 : val)); index++;
					}
				}
			}
			
			const blob = new Blob([arrayBuffer], {type: "audio/wav"});
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
		exportWavButton.addEventListener("click", onExportToWav);
		exportCancelButton.addEventListener("click", onClose);
		
		container.style.display = "block";
	}
}

/*! @source https://github.com/eligrey/FileSaver.js/blob/master/FileSaver.min.js */
var saveAs=saveAs||function(e){"use strict";if(typeof e==="undefined"||typeof navigator!=="undefined"&&/MSIE [1-9]\./.test(navigator.userAgent)){return}let t=e.document,n=function(){return e.URL||e.webkitURL||e},r=t.createElementNS("http://www.w3.org/1999/xhtml","a"),o="download"in r,i=function(e){let t=new MouseEvent("click");e.dispatchEvent(t)},a=/constructor/i.test(e.HTMLElement),f=/CriOS\/[\d]+/.test(navigator.userAgent),u=function(t){(e.setImmediate||e.setTimeout)(function(){throw t},0)},d="application/octet-stream",s=1e3*40,c=function(e){let t=function(){if(typeof e==="string"){n().revokeObjectURL(e)}else{e.remove()}};setTimeout(t,s)},l=function(e,t,n){t=[].concat(t);let r=t.length;while(r--){let o=e["on"+t[r]];if(typeof o==="function"){try{o.call(e,n||e)}catch(i){u(i)}}}},p=function(e){if(/^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(e.type)){return new Blob([String.fromCharCode(65279),e],{type:e.type})}return e},v=function(t,u,s){if(!s){t=p(t)}let v=this,w=t.type,m=w===d,y,h=function(){l(v,"writestart progress write writeend".split(" "))},S=function(){if((f||m&&a)&&e.FileReader){let r=new FileReader;r.onloadend=function(){let t=f?r.result:r.result.replace(/^data:[^;]*;/,"data:attachment/file;");let n=e.open(t,"_blank");if(!n)e.location.href=t;t=undefined;v.readyState=v.DONE;h()};r.readAsDataURL(t);v.readyState=v.INIT;return}if(!y){y=n().createObjectURL(t)}if(m){e.location.href=y}else{let o=e.open(y,"_blank");if(!o){e.location.href=y}}v.readyState=v.DONE;h();c(y)};v.readyState=v.INIT;if(o){y=n().createObjectURL(t);setTimeout(function(){r.href=y;r.download=u;i(r);h();c(y);v.readyState=v.DONE});return}S()},w=v.prototype,m=function(e,t,n){return new v(e,t||e.name||"download",n)};if(typeof navigator!=="undefined"&&navigator.msSaveOrOpenBlob){return function(e,t,n){t=t||e.name||"download";if(!n){e=p(e)}return navigator.msSaveOrOpenBlob(e,t)}}w.abort=function(){};w.readyState=w.INIT=0;w.WRITING=1;w.DONE=2;w.error=w.onwritestart=w.onprogress=w.onwrite=w.onabort=w.onerror=w.onwriteend=null;return m}(typeof self!=="undefined"&&self||typeof window!=="undefined"&&window||this.content);if(typeof module!=="undefined"&&module.exports){module.exports.saveAs=saveAs}else if(typeof define!=="undefined"&&define!==null&&define.amd!==null){define([],function(){return saveAs})}
