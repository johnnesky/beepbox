// Copyright (C) 2019 John Nesky, distributed under the MIT license.
var beepbox;
(function (beepbox) {
    const classAttributeNames = { "class": true, "classList": true, "className": true };
    function applyElementArgs(elem, args) {
        // TODO: In general, it would be nice to test more assumptions about all the arguments and print helpful warnings if those assumptions are violated.
        for (const arg of args) {
            if (Array.isArray(arg)) {
                applyElementArgs(elem, arg);
            }
            else if (arg instanceof Node) {
                elem.appendChild(arg);
            }
            else if (arg && arg.constructor === Object) {
                // If the argument is a literal Objects {}
                for (const key of Object.keys(arg)) {
                    const value = arg[key];
                    if (classAttributeNames[key]) {
                        if (key === "classList") {
                            const names = Array.isArray(value) ? value : value.split(" ");
                            for (const name of names)
                                elem.classList.add(name);
                        }
                        else {
                            elem.setAttribute("class", Array.isArray(value) ? value.join(" ") : value);
                        }
                    }
                    else if (key === "style") {
                        if (value && value.constructor === Object) {
                            for (const styleKey of Object.keys(value)) {
                                if (styleKey.startsWith("--")) {
                                    // CSS variables start with -- and must be set with function.
                                    elem.style.setProperty(styleKey, value[styleKey]);
                                }
                                else if (elem.style.hasOwnProperty(styleKey)) {
                                    // camelCase and snake-case properties should exist on style object.
                                    elem.style[styleKey] = value[styleKey];
                                }
                                else {
                                    console.log("Unrecognized style property name: " + styleKey);
                                }
                            }
                        }
                        else {
                            elem.setAttribute(key, value);
                        }
                    }
                    else if (typeof (value) === "function") {
                        // If value is a callback, set property.
                        elem[key] = value;
                    }
                    else if (typeof (value) === "boolean") {
                        // If value is boolean, set attribute if true, remove if false.
                        if (value)
                            elem.setAttribute(key, "");
                        else
                            elem.removeAttribute(key);
                    }
                    else {
                        // Default to setting attribute, as if writing html directly.
                        elem.setAttribute(key, value);
                    }
                }
            }
            else {
                elem.appendChild(document.createTextNode(arg));
            }
        }
        return elem;
    }
    const svgNS = "http://www.w3.org/2000/svg";
    beepbox.HTML = function () { };
    beepbox.HTML.element = function (name, ...args) {
        return applyElementArgs(document.createElement(name), args);
    };
    beepbox.SVG = function () { };
    beepbox.SVG.element = function (name, ...args) {
        return applyElementArgs(document.createElementNS(svgNS, name), args);
    };
    for (const name of "a abbr address area article aside audio b base bdi bdo blockquote br button canvas caption cite code col colgroup datalist dd del details dfn dialog div dl dt em embed fieldset figcaption figure footer form h1 h2 h3 h4 h5 h6 header hr i iframe img input ins kbd label legend li link main map mark menu menuitem meta meter nav noscript object ol optgroup option output p param picture pre progress q rp rt ruby s samp script section select small source span strong style sub summary sup table tbody td template textarea tfoot th thead time title tr track u ul var video wbr".split(" ")) {
        beepbox.HTML[name] = function (...args) {
            return applyElementArgs(document.createElement(name), args);
        };
    }
    for (const name of "a altGlyph altGlyphDef altGlyphItem animate animateMotion animateTransform circle clipPath color-profile cursor defs desc discard ellipse feBlend feColorMatrix feComponentTransfer feComposite feConvolveMatrix feDiffuseLighting feDisplacementMap feDistantLight feDropShadow feFlood feFuncA feFuncB feFuncG feFuncR feGaussianBlur feImage feMerge feMergeNode feMorphology feOffset fePointLight feSpecularLighting feSpotLight feTile feTurbulence filter font font-face font-face-format font-face-name font-face-src font-face-uri foreignObject g glyph glyphRef hkern image line linearGradient marker mask metadata missing-glyph mpath path pattern polygon polyline radialGradient rect script set stop style svg switch symbol text textPath title tref tspan use view vkern".split(" ")) {
        beepbox.SVG[name] = function (...args) {
            return applyElementArgs(document.createElementNS(svgNS, name), args);
        };
    }
    function prettyNumber(value) {
        return value.toFixed(2).replace(/\.?0*$/, "");
    }
    beepbox.prettyNumber = prettyNumber;
})(beepbox || (beepbox = {}));
//# sourceMappingURL=html.js.map