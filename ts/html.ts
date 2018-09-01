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
	export namespace html {
		export function element(type: string, attributes?: Record<string, string | number>, children?: Node[]): HTMLElement {
			const elem: HTMLElement = document.createElement(type);
			if (attributes) for (const key of Object.keys(attributes)) {
				if (key == "style") elem.setAttribute(key, <string>attributes[key]); else (<any>elem)[key] = attributes[key];
			}
			if (children) for (const child of children) elem.appendChild(child);
			return elem;
		}
		export function button(attributes?: Record<string, string | number>, children?: Node[]): HTMLButtonElement {
			return <HTMLButtonElement> element("button", attributes, children);
		}
		export function p(attributes?: Record<string, string | number>, children?: Node[]): HTMLParagraphElement {
			return <HTMLParagraphElement> element("p", attributes, children);
		}
		export function div(attributes?: Record<string, string | number>, children?: Node[]): HTMLDivElement {
			return <HTMLDivElement> element("div", attributes, children);
		}
		export function span(attributes?: Record<string, string | number>, children?: Node[]): HTMLSpanElement {
			return <HTMLSpanElement> element("span", attributes, children);
		}
		export function select(attributes?: Record<string, string | number>, children?: Node[]): HTMLSelectElement {
			return <HTMLSelectElement> element("select", attributes, children);
		}
		export function option(value: string | number, display: string | number, selected = false, disabled = false, hidden = false): HTMLOptionElement {
			const o = <HTMLOptionElement> document.createElement("option");
			o.value = <string> value;
			o.selected = selected;
			o.disabled = disabled;
			o.hidden = hidden;
			o.appendChild(text(<string> display));
			return o;
		}
		export function canvas(attributes?: Record<string, string | number>): HTMLCanvasElement {
			return <HTMLCanvasElement> element("canvas", attributes);
		}
		export function input(attributes?: Record<string, string | number>): HTMLInputElement {
			return <HTMLInputElement> element("input", attributes);
		}
		export function br(): HTMLBRElement {
			return <HTMLBRElement> element("br");
		}
		export function text(content: string): Text {
			return document.createTextNode(content);
		}
	}
	
	const svgNS: string = "http://www.w3.org/2000/svg";
	export function svgElement(type: string, attributes?: Record<string, string | number>, children?: Node[]): SVGElement {
		const elem: SVGElement = <SVGElement> document.createElementNS(svgNS, type);
		if (attributes) for (const key of Object.keys(attributes)) elem.setAttribute(key, <string>attributes[key]);
		if (children) for (const child of children) elem.appendChild(child);
		return elem;
	}
}
