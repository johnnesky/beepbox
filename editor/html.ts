// Copyright (C) 2019 John Nesky, distributed under the MIT license.

namespace beepbox {
	const classAttributeNames: Record<string, boolean> = { "class": true, "classList": true, "className": true };

	function applyElementArgs(elem: any, args: ReadonlyArray<any>): any {
		// TODO: In general, it would be nice to test more assumptions about all the arguments and print helpful warnings if those assumptions are violated.
		for (const arg of args) {
			if (Array.isArray(arg)) {
				applyElementArgs(elem, arg);
			} else if (arg instanceof Node) {
				elem.appendChild(arg);
			} else if (arg && arg.constructor === Object) {
				// If the argument is a literal Objects {}
				for (const key of Object.keys(arg)) {
					const value = arg[key];
					if (classAttributeNames[key]) {
						if (key === "classList") {
							const names = Array.isArray(value) ? value : value.split(" ");
							for (const name of names) elem.classList.add(name);
						} else {
							elem.setAttribute("class", Array.isArray(value) ? value.join(" ") : value);
						}
					} else if (key === "style") {
						if (value && value.constructor === Object) {
							for (const styleKey of Object.keys(value)) {
								if (styleKey.startsWith("--")) {
									// CSS variables start with -- and must be set with function.
									elem.style.setProperty(styleKey, value[styleKey]);
								} else if (elem.style.hasOwnProperty(styleKey)) {
									// camelCase and snake-case properties should exist on style object.
									elem.style[styleKey] = value[styleKey];
								} else {
									console.log("Unrecognized style property name: " + styleKey);
								}
							}
						} else {
							elem.setAttribute(key, value);
						}
					} else if (typeof (value) === "function") {
						// If value is a callback, set property.
						elem[key] = value;
					} else if (typeof (value) === "boolean") {
						// If value is boolean, set attribute if true, remove if false.
						if (value) elem.setAttribute(key, "");
						else elem.removeAttribute(key);
					} else {
						// Default to setting attribute, as if writing html directly.
						elem.setAttribute(key, value);
					}
				}
			} else {
				elem.appendChild(document.createTextNode(arg));
			}
		}
		return elem;
	}

	interface HTMLElementFactory {
		element(name: string, ...args: Array<any>): HTMLElement;
		a(...args: Array<any>): HTMLAnchorElement;
		abbr(...args: Array<any>): HTMLElement;
		address(...args: Array<any>): HTMLElement;
		area(...args: Array<any>): HTMLAreaElement;
		article(...args: Array<any>): HTMLElement;
		aside(...args: Array<any>): HTMLElement;
		audio(...args: Array<any>): HTMLAudioElement;
		b(...args: Array<any>): HTMLElement;
		base(...args: Array<any>): HTMLBaseElement;
		bdi(...args: Array<any>): HTMLElement;
		bdo(...args: Array<any>): HTMLElement;
		blockquote(...args: Array<any>): HTMLQuoteElement;
		br(...args: Array<any>): HTMLBRElement;
		button(...args: Array<any>): HTMLButtonElement;
		canvas(...args: Array<any>): HTMLCanvasElement;
		caption(...args: Array<any>): HTMLTableCaptionElement;
		cite(...args: Array<any>): HTMLElement;
		code(...args: Array<any>): HTMLElement;
		col(...args: Array<any>): HTMLTableColElement;
		colgroup(...args: Array<any>): HTMLTableColElement;
		datalist(...args: Array<any>): HTMLDataListElement;
		dd(...args: Array<any>): HTMLElement;
		del(...args: Array<any>): HTMLModElement;
		details(...args: Array<any>): HTMLDetailsElement;
		dfn(...args: Array<any>): HTMLElement;
		dialog(...args: Array<any>): HTMLDialogElement;
		div(...args: Array<any>): HTMLDivElement;
		dl(...args: Array<any>): HTMLDListElement;
		dt(...args: Array<any>): HTMLElement;
		em(...args: Array<any>): HTMLElement;
		embed(...args: Array<any>): HTMLEmbedElement;
		fieldset(...args: Array<any>): HTMLFieldSetElement;
		figcaption(...args: Array<any>): HTMLElement;
		figure(...args: Array<any>): HTMLElement;
		footer(...args: Array<any>): HTMLElement;
		form(...args: Array<any>): HTMLFormElement;
		h1(...args: Array<any>): HTMLHeadingElement;
		h2(...args: Array<any>): HTMLHeadingElement;
		h3(...args: Array<any>): HTMLHeadingElement;
		h4(...args: Array<any>): HTMLHeadingElement;
		h5(...args: Array<any>): HTMLHeadingElement;
		h6(...args: Array<any>): HTMLHeadingElement;
		header(...args: Array<any>): HTMLElement;
		hr(...args: Array<any>): HTMLHRElement;
		i(...args: Array<any>): HTMLElement;
		iframe(...args: Array<any>): HTMLIFrameElement;
		img(...args: Array<any>): HTMLImageElement;
		input(...args: Array<any>): HTMLInputElement;
		ins(...args: Array<any>): HTMLModElement;
		kbd(...args: Array<any>): HTMLElement;
		label(...args: Array<any>): HTMLLabelElement;
		legend(...args: Array<any>): HTMLLegendElement;
		li(...args: Array<any>): HTMLLIElement;
		link(...args: Array<any>): HTMLLinkElement;
		main(...args: Array<any>): HTMLElement;
		map(...args: Array<any>): HTMLMapElement;
		mark(...args: Array<any>): HTMLElement;
		menu(...args: Array<any>): HTMLMenuElement;
		menuitem(...args: Array<any>): HTMLUnknownElement;
		meta(...args: Array<any>): HTMLMetaElement;
		meter(...args: Array<any>): HTMLMeterElement;
		nav(...args: Array<any>): HTMLElement;
		noscript(...args: Array<any>): HTMLElement;
		object(...args: Array<any>): HTMLObjectElement;
		ol(...args: Array<any>): HTMLOListElement;
		optgroup(...args: Array<any>): HTMLOptGroupElement;
		option(...args: Array<any>): HTMLOptionElement;
		output(...args: Array<any>): HTMLOutputElement;
		p(...args: Array<any>): HTMLParagraphElement;
		param(...args: Array<any>): HTMLParamElement;
		picture(...args: Array<any>): HTMLPictureElement;
		pre(...args: Array<any>): HTMLPreElement;
		progress(...args: Array<any>): HTMLProgressElement;
		q(...args: Array<any>): HTMLQuoteElement;
		rp(...args: Array<any>): HTMLElement;
		rt(...args: Array<any>): HTMLElement;
		ruby(...args: Array<any>): HTMLElement;
		s(...args: Array<any>): HTMLElement;
		samp(...args: Array<any>): HTMLElement;
		script(...args: Array<any>): HTMLScriptElement;
		section(...args: Array<any>): HTMLElement;
		select(...args: Array<any>): HTMLSelectElement;
		small(...args: Array<any>): HTMLElement;
		source(...args: Array<any>): HTMLSourceElement;
		span(...args: Array<any>): HTMLSpanElement;
		strong(...args: Array<any>): HTMLElement;
		style(...args: Array<any>): HTMLStyleElement;
		sub(...args: Array<any>): HTMLElement;
		summary(...args: Array<any>): HTMLElement;
		sup(...args: Array<any>): HTMLElement;
		table(...args: Array<any>): HTMLTableElement;
		tbody(...args: Array<any>): HTMLTableSectionElement;
		td(...args: Array<any>): HTMLTableCellElement;
		template(...args: Array<any>): HTMLTemplateElement;
		textarea(...args: Array<any>): HTMLTextAreaElement;
		tfoot(...args: Array<any>): HTMLTableSectionElement;
		th(...args: Array<any>): HTMLTableCellElement;
		thead(...args: Array<any>): HTMLTableSectionElement;
		time(...args: Array<any>): HTMLTimeElement;
		title(...args: Array<any>): HTMLTitleElement;
		tr(...args: Array<any>): HTMLTableRowElement;
		track(...args: Array<any>): HTMLTrackElement;
		u(...args: Array<any>): HTMLElement;
		ul(...args: Array<any>): HTMLUListElement;
		var(...args: Array<any>): HTMLElement;
		video(...args: Array<any>): HTMLVideoElement;
		wbr(...args: Array<any>): HTMLElement;
	}

	interface SVGElementFactory {
		element(name: string, ...args: Array<any>): SVGElement;
		a(...args: Array<any>): SVGAElement;
		altGlyph(...args: Array<any>): SVGElement;
		altGlyphDef(...args: Array<any>): SVGElement;
		altGlyphItem(...args: Array<any>): SVGElement;
		animate(...args: Array<any>): SVGAnimateElement;
		animateMotion(...args: Array<any>): SVGAnimateMotionElement;
		animateTransform(...args: Array<any>): SVGAnimateTransformElement;
		circle(...args: Array<any>): SVGCircleElement;
		clipPath(...args: Array<any>): SVGClipPathElement;
		"color-profile"(...args: Array<any>): SVGElement;
		cursor(...args: Array<any>): SVGElement;
		defs(...args: Array<any>): SVGDefsElement;
		desc(...args: Array<any>): SVGDescElement;
		discard(...args: Array<any>): SVGElement;
		ellipse(...args: Array<any>): SVGEllipseElement;
		feBlend(...args: Array<any>): SVGFEBlendElement;
		feColorMatrix(...args: Array<any>): SVGFEColorMatrixElement;
		feComponentTransfer(...args: Array<any>): SVGFEComponentTransferElement;
		feComposite(...args: Array<any>): SVGFECompositeElement;
		feConvolveMatrix(...args: Array<any>): SVGFEConvolveMatrixElement;
		feDiffuseLighting(...args: Array<any>): SVGFEDiffuseLightingElement;
		feDisplacementMap(...args: Array<any>): SVGFEDisplacementMapElement;
		feDistantLight(...args: Array<any>): SVGFEDistantLightElement;
		feDropShadow(...args: Array<any>): SVGElement;
		feFlood(...args: Array<any>): SVGFEFloodElement;
		feFuncA(...args: Array<any>): SVGFEFuncAElement;
		feFuncB(...args: Array<any>): SVGFEFuncBElement;
		feFuncG(...args: Array<any>): SVGFEFuncGElement;
		feFuncR(...args: Array<any>): SVGFEFuncRElement;
		feGaussianBlur(...args: Array<any>): SVGFEGaussianBlurElement;
		feImage(...args: Array<any>): SVGFEImageElement;
		feMerge(...args: Array<any>): SVGFEMergeElement;
		feMergeNode(...args: Array<any>): SVGFEMergeNodeElement;
		feMorphology(...args: Array<any>): SVGFEMorphologyElement;
		feOffset(...args: Array<any>): SVGFEOffsetElement;
		fePointLight(...args: Array<any>): SVGFEPointLightElement;
		feSpecularLighting(...args: Array<any>): SVGFESpecularLightingElement;
		feSpotLight(...args: Array<any>): SVGFESpotLightElement;
		feTile(...args: Array<any>): SVGFETileElement;
		feTurbulence(...args: Array<any>): SVGFETurbulenceElement;
		filter(...args: Array<any>): SVGFilterElement;
		font(...args: Array<any>): SVGElement;
		"font-face"(...args: Array<any>): SVGElement;
		"font-face-format"(...args: Array<any>): SVGElement;
		"font-face-name"(...args: Array<any>): SVGElement;
		"font-face-src"(...args: Array<any>): SVGElement;
		"font-face-uri"(...args: Array<any>): SVGElement;
		foreignObject(...args: Array<any>): SVGForeignObjectElement;
		g(...args: Array<any>): SVGGElement;
		glyph(...args: Array<any>): SVGElement;
		glyphRef(...args: Array<any>): SVGElement;
		hkern(...args: Array<any>): SVGElement;
		image(...args: Array<any>): SVGImageElement;
		line(...args: Array<any>): SVGLineElement;
		linearGradient(...args: Array<any>): SVGLinearGradientElement;
		marker(...args: Array<any>): SVGMarkerElement;
		mask(...args: Array<any>): SVGMaskElement;
		metadata(...args: Array<any>): SVGMetadataElement;
		"missing-glyph"(...args: Array<any>): SVGElement;
		mpath(...args: Array<any>): SVGElement;
		path(...args: Array<any>): SVGPathElement;
		pattern(...args: Array<any>): SVGPatternElement;
		polygon(...args: Array<any>): SVGPolygonElement;
		polyline(...args: Array<any>): SVGPolylineElement;
		radialGradient(...args: Array<any>): SVGRadialGradientElement;
		rect(...args: Array<any>): SVGRectElement;
		script(...args: Array<any>): SVGScriptElement;
		set(...args: Array<any>): SVGElement;
		stop(...args: Array<any>): SVGStopElement;
		style(...args: Array<any>): SVGStyleElement;
		svg(...args: Array<any>): SVGSVGElement;
		switch(...args: Array<any>): SVGSwitchElement;
		symbol(...args: Array<any>): SVGSymbolElement;
		text(...args: Array<any>): SVGTextElement;
		textPath(...args: Array<any>): SVGTextPathElement;
		title(...args: Array<any>): SVGTitleElement;
		tref(...args: Array<any>): SVGElement;
		tspan(...args: Array<any>): SVGTSpanElement;
		use(...args: Array<any>): SVGUseElement;
		view(...args: Array<any>): SVGViewElement;
		vkern(...args: Array<any>): SVGElement;
	}

	const svgNS: string = "http://www.w3.org/2000/svg";

	export const HTML: HTMLElementFactory = <HTMLElementFactory><unknown>function () { };
	(<any>HTML).element = function (name: string, ...args: Array<any>): HTMLElement {
		return applyElementArgs(document.createElement(name), args);
	};

	export const SVG: SVGElementFactory = <SVGElementFactory><unknown>function () { };
	(<any>SVG).element = function (name: string, ...args: Array<any>): SVGElement {
		return applyElementArgs(document.createElementNS(svgNS, name), args);
	};

	for (const name of "a abbr address area article aside audio b base bdi bdo blockquote br button canvas caption cite code col colgroup datalist dd del details dfn dialog div dl dt em embed fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6 header hr i iframe img input ins kbd label legend li link main map mark menu menuitem meta meter nav noscript object ol optgroup option output p param picture pre progress q rp rt ruby s samp script section select small source span strong style sub summary sup table tbody td template textarea tfoot th thead time title tr track u ul var video wbr".split(" ")) {
		(<any>HTML)[name] = function (...args: Array<any>) {
			return applyElementArgs(document.createElement(name), args);
		};
	}

	for (const name of "a altGlyph altGlyphDef altGlyphItem animate animateMotion animateTransform circle clipPath color-profile cursor defs desc discard ellipse feBlend feColorMatrix feComponentTransfer feComposite feConvolveMatrix feDiffuseLighting feDisplacementMap feDistantLight feDropShadow feFlood feFuncA feFuncB feFuncG feFuncR feGaussianBlur feImage feMerge feMergeNode feMorphology feOffset fePointLight feSpecularLighting feSpotLight feTile feTurbulence filter font font-face font-face-format font-face-name font-face-src font-face-uri foreignObject g glyph glyphRef hkern image line linearGradient marker mask metadata missing-glyph mpath path pattern polygon polyline radialGradient rect script set stop style svg switch symbol text textPath title tref tspan use view vkern".split(" ")) {
		(<any>SVG)[name] = function (...args: Array<any>) {
			return applyElementArgs(document.createElementNS(svgNS, name), args);
		};
	}

	export function prettyNumber(value: number): string {
		return value.toFixed(2).replace(/\.?0*$/, "");
	}
}
