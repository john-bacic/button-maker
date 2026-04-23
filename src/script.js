import { ConvexHttpClient } from "https://esm.sh/convex@1.36.0/browser";

document.addEventListener("DOMContentLoaded", () => {
  const button = document.querySelector("#glow-button");
  const previewArea = document.querySelector(".preview-area");
  const cssOverlay = document.querySelector("#css-overlay");
  const cssOverlayContent = document.querySelector("#css-overlay-content");
  const GITHUB_CACHE_REFRESH_MS = 30 * 1000;
  const STORAGE_KEY = "glow-button-controls-v1";
  const VARIATIONS_KEY = "glow-button-variations-v1";
  const CONVEX_URL = window.CONVEX_URL || "https://formal-rat-848.convex.cloud";
  const convex = new ConvexHttpClient(CONVEX_URL);

  const parsePageBgToRgb = (raw) => {
    const s = String(raw || "").trim();
    const hex = s.match(/^#([\da-f]{3}|[\da-f]{6})$/i);
    if (hex) {
      let h = hex[1];
      if (h.length === 3) {
        h = h
          .split("")
          .map((ch) => ch + ch)
          .join("");
      }
      return {
        r: parseInt(h.slice(0, 2), 16),
        g: parseInt(h.slice(2, 4), 16),
        b: parseInt(h.slice(4, 6), 16),
      };
    }
    const rgb = s.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
    if (rgb) {
      return { r: Number(rgb[1]), g: Number(rgb[2]), b: Number(rgb[3]) };
    }
    return null;
  };

  const previewBackgroundLuminance = (r, g, b) => {
    const lin = (v) => {
      const x = v / 255;
      return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  };

  /** Must never be the keyword `none` when combined with other box-shadows (invalid CSS). */
  const CUSTOM_SHADOW_NONE = "0 0 0 0 rgba(0, 0, 0, 0)";

  const formatCustomShadowCssVar = (raw) => {
    const v = String(raw ?? "").trim();
    if (!v || v.toLowerCase() === "none") return CUSTOM_SHADOW_NONE;
    return v;
  };

  const parseCustomShadowFromDom = (raw) => {
    const v = String(raw ?? "").trim();
    if (!v || v === CUSTOM_SHADOW_NONE) return "none";
    return v;
  };

  const syncPreviewDotGrid = (pageBgCss) => {
    const root = document.body;
    if (!root) return;
    const fallback = "#0a0a0a";
    const surface = String(pageBgCss || "").trim() || fallback;
    const rgb = parsePageBgToRgb(surface);
    let dotRgba = "rgba(255, 255, 255, 0.16)";
    if (rgb) {
      const { r, g, b } = rgb;
      const L = previewBackgroundLuminance(r, g, b);
      const mix = (from, to, t) => Math.round(from * (1 - t) + to * t);
      if (L >= 0.52) {
        const dr = mix(r, 0, 0.34);
        const dg = mix(g, 0, 0.34);
        const db = mix(b, 0, 0.34);
        const alpha = Math.min(0.28, 0.1 + (1 - L) * 0.16);
        dotRgba = `rgba(${dr}, ${dg}, ${db}, ${alpha.toFixed(3)})`;
      } else {
        const dr = mix(r, 255, 0.4);
        const dg = mix(g, 255, 0.4);
        const db = mix(b, 255, 0.4);
        const alpha = Math.min(0.32, 0.14 + (1 - L) * 0.12);
        dotRgba = `rgba(${dr}, ${dg}, ${db}, ${alpha.toFixed(3)})`;
      }
    }
    root.style.setProperty("--page-dot-color", dotRgba);
    /* Fill under dots: color layer + single radial on top (do NOT put opaque gradient above the dots) */
    root.style.backgroundColor = surface;
    root.style.backgroundImage = `radial-gradient(circle at 50% 50%, ${dotRgba} 1px, transparent 1.6px)`;
    root.style.backgroundSize = "10px 10px";
    root.style.backgroundRepeat = "repeat";
    root.style.backgroundPosition = "0 0";
  };

  const controls = {
    text: document.querySelector("#text-control"),
    cssImport: document.querySelector("#css-import-control"),
    applyCssImport: document.querySelector("#apply-css-import-button"),
    applyDefaultEffect: document.querySelector("#apply-default-effect-button"),
    iconSvg: document.querySelector("#icon-svg-control"),
    iconColor: document.querySelector("#icon-color-control"),
    svgOnly: document.querySelector("#svg-only-control"),
    sidePadding: document.querySelector("#side-padding-control"),
    iconGap: document.querySelector("#icon-gap-control"),
    textFont: document.querySelector("#text-font-control"),
    bg: document.querySelector("#bg-control"),
    pageBg: document.querySelector("#page-bg-control"),
    glowColor: document.querySelector("#glow-color-control"),
    textColor: document.querySelector("#text-color-control"),
    fontSize: document.querySelector("#font-size-control"),
    lineHeight: document.querySelector("#line-height-control"),
    borderGlow: document.querySelector("#border-glow-control"),
    borderGlowColor: document.querySelector("#border-glow-color-control"),
    matchBorderGlowColor: document.querySelector("#match-border-glow-color-control"),
    borderGlowSize: document.querySelector("#border-glow-size-control"),
    borderThickness: document.querySelector("#border-thickness-control"),
    hugText: document.querySelector("#hug-text-control"),
    shape: document.querySelector("#shape-control"),
    width: document.querySelector("#width-control"),
    height: document.querySelector("#height-control"),
    radius: document.querySelector("#radius-control"),
    glowSize: document.querySelector("#glow-size-control"),
    speed: document.querySelector("#speed-control"),
    hoverLift: document.querySelector("#hover-lift-control"),
    hoverScale: document.querySelector("#hover-scale-control"),
    pressedDepth: document.querySelector("#pressed-depth-control"),
    pressedScale: document.querySelector("#pressed-scale-control"),
    pressedOpacity: document.querySelector("#pressed-opacity-control"),
    variationName: document.querySelector("#variation-name-control"),
    variationLastSaved: document.querySelector("#variation-last-saved"),
    variationSelect: document.querySelector("#variation-select"),
    saveVariation: document.querySelector("#save-variation-button"),
    deleteVariation: document.querySelector("#delete-variation-button"),
    githubDeployCode: document.querySelector("#github-deploy-code"),
    refreshGithubDeploy: document.querySelector("#refresh-github-deploy-button"),
    toggleCssOverlay: document.querySelector("#toggle-css-overlay-button"),
    cssOverlayClose: document.querySelector("#css-overlay-close-button"),
    copyCss: document.querySelector("#copy-css-button"),
    downloadCss: document.querySelector("#download-css-button"),
    reset: document.querySelector("#reset-button"),
    applyBorderAnimationEffect: document.querySelector("#apply-border-animation-effect-button"),
  };

  const valueLabels = {
    width: document.querySelector("#width-value"),
    height: document.querySelector("#height-value"),
    radius: document.querySelector("#radius-value"),
    fontSize: document.querySelector("#font-size-value"),
    lineHeight: document.querySelector("#line-height-value"),
    sidePadding: document.querySelector("#side-padding-value"),
    iconGap: document.querySelector("#icon-gap-value"),
    borderGlowSize: document.querySelector("#border-glow-size-value"),
    borderThickness: document.querySelector("#border-thickness-value"),
    glowSize: document.querySelector("#glow-size-value"),
    speed: document.querySelector("#speed-value"),
    hoverLift: document.querySelector("#hover-lift-value"),
    hoverScale: document.querySelector("#hover-scale-value"),
    pressedDepth: document.querySelector("#pressed-depth-value"),
    pressedScale: document.querySelector("#pressed-scale-value"),
    pressedOpacity: document.querySelector("#pressed-opacity-value"),
  };
  const controlGroups = {
    borderGlowColor: document.querySelector("#border-glow-color-group"),
    matchBorderGlowColor: document.querySelector("#match-border-glow-color-group"),
    borderGlowSize: document.querySelector("#border-glow-size-group"),
    width: document.querySelector("#width-control-group"),
    radius: document.querySelector("#radius-control-group"),
  };

  const setBorderGlowColorDisabledState = (isDisabled) => {
    controls.borderGlowColor.disabled = isDisabled;
    controlGroups.borderGlowColor.classList.toggle("is-disabled", isDisabled);
  };

  const setMatchBorderGlowColorDisabledState = (isDisabled) => {
    controls.matchBorderGlowColor.disabled = isDisabled;
    controlGroups.matchBorderGlowColor.classList.toggle("is-disabled", isDisabled);
  };

  const setBorderGlowSizeDisabledState = (isDisabled) => {
    controls.borderGlowSize.disabled = isDisabled;
    controlGroups.borderGlowSize.classList.toggle("is-disabled", isDisabled);
  };

  const setWidthDisabledState = (isDisabled) => {
    controls.width.disabled = isDisabled;
    controlGroups.width.classList.toggle("is-disabled", isDisabled);
  };

  const setRadiusDisabledState = (isDisabled) => {
    controls.radius.disabled = isDisabled;
    controlGroups.radius.classList.toggle("is-disabled", isDisabled);
  };

  const resolveFontSettings = (fontSelection) => {
    if (fontSelection === "Whitney Bold") {
      return { family: "Whitney", weight: "700" };
    }

    return { family: fontSelection, weight: "normal" };
  };

  const sanitizeSvgMarkup = (rawSvg) => {
    const markup = String(rawSvg || "").trim();
    if (!markup) return "";

    const template = document.createElement("template");
    template.innerHTML = markup;
    const svg = template.content.querySelector("svg");
    if (!svg) return "";

    const disallowed = ["script", "style", "iframe", "object", "embed", "foreignObject"];
    for (const selector of disallowed) {
      svg.querySelectorAll(selector).forEach((node) => node.remove());
    }

    const parseDimension = (raw) => {
      const value = String(raw || "").trim();
      const match = value.match(/^([0-9]*\.?[0-9]+)/);
      return match ? Number(match[1]) : NaN;
    };

    const widthValue = parseDimension(svg.getAttribute("width"));
    const heightValue = parseDimension(svg.getAttribute("height"));
    if (!svg.hasAttribute("viewBox") && Number.isFinite(widthValue) && Number.isFinite(heightValue)) {
      svg.setAttribute("viewBox", `0 0 ${widthValue} ${heightValue}`);
    }

    // Let CSS fully control icon box sizing.
    svg.removeAttribute("width");
    svg.removeAttribute("height");
    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");

    const walk = document.createTreeWalker(svg, NodeFilter.SHOW_ELEMENT);
    while (walk.nextNode()) {
      const el = walk.currentNode;
      for (const attr of Array.from(el.attributes)) {
        const attrName = attr.name.toLowerCase();
        const attrValue = String(attr.value || "");
        if (attrName.startsWith("on")) {
          el.removeAttribute(attr.name);
          continue;
        }
        if ((attrName === "href" || attrName === "xlink:href") && attrValue.trim().startsWith("javascript:")) {
          el.removeAttribute(attr.name);
        }
      }

      // Make icon color controllable from CSS by normalizing paint attributes.
      const normalizePaint = (value) => {
        const trimmed = String(value || "").trim().toLowerCase();
        if (!trimmed || trimmed === "none" || trimmed.startsWith("url(")) return value;
        return "currentColor";
      };

      if (el.hasAttribute("fill")) {
        el.setAttribute("fill", normalizePaint(el.getAttribute("fill")));
      }
      if (el.hasAttribute("stroke")) {
        el.setAttribute("stroke", normalizePaint(el.getAttribute("stroke")));
      }

      const inlineStyle = el.getAttribute("style");
      if (inlineStyle) {
        const updatedStyle = inlineStyle
          .replace(/fill\s*:\s*([^;]+)/gi, (match, paint) => {
            const normalized = normalizePaint(paint);
            return normalized === paint ? match : `fill:${normalized}`;
          })
          .replace(/stroke\s*:\s*([^;]+)/gi, (match, paint) => {
            const normalized = normalizePaint(paint);
            return normalized === paint ? match : `stroke:${normalized}`;
          });
        el.setAttribute("style", updatedStyle);
      }
    }

    return svg.outerHTML;
  };

  const renderButtonContent = (textValue, rawSvg, svgOnly) => {
    const text = String(textValue ?? "");
    const safeSvg = sanitizeSvgMarkup(rawSvg);

    const content = document.createElement("span");
    content.className = "button-content";

    if (safeSvg) {
      const icon = document.createElement("span");
      icon.className = "button-icon";
      icon.setAttribute("aria-hidden", "true");
      icon.innerHTML = safeSvg;
      content.appendChild(icon);
    }

    if (!svgOnly || !safeSvg) {
      const label = document.createElement("span");
      label.className = "button-label";
      label.textContent = text || " ";
      content.appendChild(label);
    }

    button.replaceChildren(content);
  };

  const getImportCssBlock = (cssText) => {
    const source = String(cssText || "");
    const customBlockMatch = source.match(/\.custom-glow-button\s*\{([\s\S]*?)\}/i);
    if (customBlockMatch?.[1]) return customBlockMatch[1];
    const firstBlockMatch = source.match(/\{([\s\S]*?)\}/);
    return firstBlockMatch?.[1] || source;
  };

  const parseCssDeclarations = (rawBlock) => {
    const declarations = new Map();
    const block = String(rawBlock || "").replace(/\/\*[\s\S]*?\*\//g, " ");
    const declarationPattern = /([a-z-]+)\s*:\s*([^;{}]+);/gi;
    for (const match of block.matchAll(declarationPattern)) {
      const key = String(match[1] || "").trim().toLowerCase();
      const value = String(match[2] || "").trim();
      if (key && value) {
        declarations.set(key, value);
      }
    }
    return declarations;
  };

  const extractRuleDeclarations = (cssText, selectorPatterns) => {
    const source = String(cssText || "");
    for (const pattern of selectorPatterns) {
      const match = source.match(pattern);
      if (match?.[1]) {
        return parseCssDeclarations(match[1]);
      }
    }
    return new Map();
  };

  const parseCssNumber = (rawValue) => {
    const value = Number.parseFloat(String(rawValue || "").trim());
    return Number.isFinite(value) ? value : null;
  };

  const parseCssColor = (rawValue) => {
    const value = String(rawValue || "").trim();
    if (!value) return null;
    if (/^#[0-9a-f]{3,8}$/i.test(value)) return value;
    if (/^(rgb|rgba|hsl|hsla)\(/i.test(value)) return value;
    if (/^(transparent|white|black|currentcolor)$/i.test(value)) return value;
    return null;
  };

  const extractColorToken = (rawValue) => {
    const value = String(rawValue || "").trim();
    if (!value) return null;
    const colorMatch = value.match(
      /(#[0-9a-f]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)|\btransparent\b|\bwhite\b|\bblack\b)/i
    );
    return colorMatch ? parseCssColor(colorMatch[1]) : null;
  };

  const clampToControl = (control, value) => {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return null;
    const min = Number.parseFloat(control.min);
    const max = Number.parseFloat(control.max);
    const withMin = Number.isFinite(min) ? Math.max(min, numeric) : numeric;
    const withBounds = Number.isFinite(max) ? Math.min(max, withMin) : withMin;
    return withBounds;
  };

  const normalizeFontFamily = (rawFont) => {
    const first = String(rawFont || "")
      .split(",")[0]
      .trim()
      .replace(/^['"]|['"]$/g, "");
    return first;
  };

  const resolveFontSelectionFromCss = (rawFamily, rawWeight) => {
    const family = normalizeFontFamily(rawFamily).toLowerCase();
    const weight = parseCssNumber(rawWeight) ?? 400;
    if (!family) return null;
    if (family.includes("whitney")) {
      if (family.includes("light")) return "Whitney Light";
      if (family.includes("book")) return "Whitney Book";
      if (family.includes("semi")) return "Whitney Semibold";
      if (family.includes("bold") || weight >= 700) return "Whitney Bold";
      return "Whitney";
    }

    const available = Array.from(controls.textFont.options).map((option) => option.value);
    return available.find((option) => option.toLowerCase() === family) || null;
  };

  const parseScaleFromTransform = (rawTransform) => {
    const match = String(rawTransform || "").match(/scale\(\s*([-+]?[0-9]*\.?[0-9]+)\s*\)/i);
    if (!match) return null;
    const parsed = Number.parseFloat(match[1]);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const parseTranslateYPxFromTransform = (rawTransform) => {
    const match = String(rawTransform || "").match(
      /translateY\(\s*([-+]?[0-9]*\.?[0-9]+)\s*(px)?\s*\)/i
    );
    if (!match) return null;
    const parsed = Number.parseFloat(match[1]);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const parseAnimationDurationSeconds = (rawAnimation) => {
    const match = String(rawAnimation || "").match(/([-+]?[0-9]*\.?[0-9]+)\s*s\b/i);
    if (!match) return null;
    const parsed = Number.parseFloat(match[1]);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const parseBorderShorthand = (rawBorder) => {
    const value = String(rawBorder || "").trim();
    if (!value) return { width: null, color: null };
    const widthMatch = value.match(/([-+]?[0-9]*\.?[0-9]+)\s*px/i);
    const width = widthMatch ? Number.parseFloat(widthMatch[1]) : null;
    const color = extractColorToken(value);
    return { width, color };
  };

  const parseHorizontalPadding = (rawPadding) => {
    const values = String(rawPadding || "")
      .trim()
      .split(/\s+/)
      .map((part) => parseCssNumber(part))
      .filter((part) => part !== null);

    if (!values.length) return null;
    if (values.length === 1) return values[0];
    if (values.length === 2) return values[1];
    if (values.length === 3) return values[1];
    return values[1];
  };

  const isIntrinsicWidthKeyword = (raw) => {
    const value = String(raw || "").trim().toLowerCase();
    if (!value) return false;
    return (
      /\bfit-content\b/.test(value) ||
      /\bmin-content\b/.test(value) ||
      /\bmax-content\b/.test(value) ||
      /\bhug\b/.test(value) ||
      /\bintrinsic\b/.test(value)
    );
  };

  const isFillContainerWidth = (raw) => {
    const value = String(raw || "").trim().toLowerCase();
    if (!value) return false;
    return (
      /\b100%\b/.test(value) ||
      /\bstretch\b/.test(value) ||
      /\bfill\b/.test(value) ||
      /\b100vw\b/.test(value)
    );
  };

  const isCssRuleSheet = (rawSource) => {
    const source = String(rawSource || "");
    if (/\.custom-glow-button\s*\{/i.test(source)) return true;
    return /(^|[\s;}])[#.][\w-]+\s*\{/.test(source) || /^@[\w-]+\s*\{/m.test(source.trim());
  };

  const extractFigmaLayerLabelForButtonText = (rawSource, layoutWidthPx) => {
    const source = String(rawSource || "");
    const layoutW = layoutWidthPx;
    const candidates = [];
    const re = /\/\*\s*([^*\r\n]{1,60}?)\s*\*\/\s*[\r\n]+\s*width:\s*(\d+(?:\.\d+)?)px/gi;
    let match;
    while ((match = re.exec(source)) !== null) {
      const label = match[1].trim();
      const widthValue = Number.parseFloat(match[2]);
      if (!label || /^(frame\s*\d+|auto layout|inside auto layout)/i.test(label)) continue;
      if (!Number.isFinite(widthValue)) continue;
      candidates.push({ label, widthValue });
    }
    if (!candidates.length) return null;
    if (layoutW !== null && Number.isFinite(layoutW)) {
      const inner = candidates.filter((entry) => entry.widthValue !== layoutW);
      if (inner.length) return inner[inner.length - 1].label;
    }
    return candidates[candidates.length - 1].label;
  };

  const clampLayoutOffset = (value) => {
    if (!Number.isFinite(value)) return 0;
    return Math.max(-400, Math.min(400, value));
  };

  const importCssToState = (cssText) => {
    const source = String(cssText || "");
    const isRuleBasedCss = isCssRuleSheet(source);
    const figmaTextSplit = source.split(/\/\*\s*send\s*\*\//i);
    const figmaLayoutText = figmaTextSplit[0] || source;
    const figmaLabelText = figmaTextSplit[1] || source;

    const declarations = isRuleBasedCss
      ? parseCssDeclarations(getImportCssBlock(source))
      : parseCssDeclarations(figmaLayoutText);
    const textDeclarations = isRuleBasedCss
      ? declarations
      : parseCssDeclarations(figmaLabelText);
    const hoverDeclarations = extractRuleDeclarations(source, [
      /\.custom-glow-button:hover\s*\{([\s\S]*?)\}/i,
      /[^\w-]:hover\s*\{([\s\S]*?)\}/i,
    ]);
    const activeDeclarations = extractRuleDeclarations(source, [
      /\.custom-glow-button:active\s*\{([\s\S]*?)\}/i,
      /[^\w-]:active\s*\{([\s\S]*?)\}/i,
    ]);
    if (!declarations.size) return null;

    const current = getStateFromControls();
    const next = {
      ...defaults,
      text: current.text,
      iconSvg: current.iconSvg,
      svgOnly: current.svgOnly,
      pageBg: current.pageBg,
    };
    const read = (key) => declarations.get(key.toLowerCase());
    const readText = (key) => textDeclarations.get(key.toLowerCase());
    const layoutWidthForLabel = parseCssNumber(read("width"));
    const extractedLayerLabel = extractFigmaLayerLabelForButtonText(source, layoutWidthForLabel);
    if (extractedLayerLabel) {
      next.text = extractedLayerLabel;
    }
    const applyNumeric = (key, control, targetProp) => {
      const raw = read(key);
      if (!raw) return;
      const parsed = parseCssNumber(raw);
      if (parsed === null) return;
      const clamped = clampToControl(control, parsed);
      if (clamped === null) return;
      next[targetProp] = clamped;
    };

    const bgColor = parseCssColor(read("--c"));
    if (bgColor) next.bg = bgColor;
    const glowColor = parseCssColor(read("--glow-color"));
    if (glowColor) next.glowColor = glowColor;
    const textColor = parseCssColor(read("--text-color"));
    if (textColor) next.textColor = textColor;
    const iconColor = parseCssColor(read("--icon-color"));
    if (iconColor) next.iconColor = iconColor;
    const backgroundColor = extractColorToken(read("background"));
    if (backgroundColor) {
      next.bg = backgroundColor;
    }
    const textColorFromRaw = extractColorToken(readText("color"));
    if (textColorFromRaw) next.textColor = textColorFromRaw;
    const textLineHeightFromRaw = parseCssNumber(readText("line-height"));
    if (textLineHeightFromRaw !== null) {
      const clampedLineHeight = clampToControl(controls.lineHeight, textLineHeightFromRaw);
      if (clampedLineHeight !== null) next.lineHeight = clampedLineHeight;
    }

    applyNumeric("--side-padding", controls.sidePadding, "sidePadding");
    applyNumeric("--icon-gap", controls.iconGap, "iconGap");
    applyNumeric("--text-size", controls.fontSize, "fontSize");
    applyNumeric("line-height", controls.lineHeight, "lineHeight");
    applyNumeric("--border-thickness", controls.borderThickness, "borderThickness");
    applyNumeric("--btn-height", controls.height, "height");
    applyNumeric("--btn-width", controls.width, "width");
    applyNumeric("--p", controls.glowSize, "glowSize");
    applyNumeric("--hover-lift", controls.hoverLift, "hoverLift");
    applyNumeric("--hover-scale", controls.hoverScale, "hoverScale");
    applyNumeric("--pressed-depth", controls.pressedDepth, "pressedDepth");
    applyNumeric("--pressed-scale", controls.pressedScale, "pressedScale");
    applyNumeric("--pressed-opacity", controls.pressedOpacity, "pressedOpacity");
    applyNumeric("--border-glow-size", controls.borderGlowSize, "borderGlowSize");
    applyNumeric("width", controls.width, "width");
    applyNumeric("height", controls.height, "height");
    applyNumeric("border-radius", controls.radius, "radius");
    applyNumeric("font-size", controls.fontSize, "fontSize");

    const rawGap = parseCssNumber(read("gap"));
    const rawColumnGap = parseCssNumber(read("column-gap"));
    const rawRowGap = parseCssNumber(read("row-gap"));
    const gapCandidate = [rawGap, rawColumnGap, rawRowGap].find((v) => v !== null);
    if (gapCandidate !== null && gapCandidate !== undefined) {
      const clampedGap = clampToControl(controls.iconGap, gapCandidate);
      if (clampedGap !== null) next.iconGap = clampedGap;
    }
    const rawPadding = parseHorizontalPadding(read("padding"));
    if (rawPadding !== null) {
      const clampedPadding = clampToControl(controls.sidePadding, rawPadding);
      if (clampedPadding !== null) next.sidePadding = clampedPadding;
    }

    const animationRaw = read("animation-duration") || read("animation");
    if (animationRaw) {
      const durationSeconds = parseAnimationDurationSeconds(animationRaw);
      if (durationSeconds && durationSeconds > 0) {
        const speedFromDuration = clampToControl(controls.speed, 2 / durationSeconds);
        if (speedFromDuration !== null) {
          next.speed = Number(speedFromDuration.toFixed(2));
        }
      }
    }

    const parseFlexGrowFromShorthand = (rawFlex) => {
      const flex = String(rawFlex || "").trim().toLowerCase();
      if (!flex) return null;
      if (flex === "none") return 0;
      if (flex === "auto") return 1;
      const parts = flex.split(/\s+/);
      return parseCssNumber(parts[0]);
    };

    const widthDecl = read("width");
    const displayDecl = read("display");
    const flexGrowDecl = read("flex-grow");
    const flexShrinkDecl = read("flex-shrink");
    const flexBasisDecl = read("flex-basis");
    const flexShorthand = read("flex");
    const isFlexLayout = /\bflex\b/.test(String(displayDecl || ""));

    const resolvedFlexGrow = (() => {
      const fromLonghand = parseCssNumber(flexGrowDecl);
      if (fromLonghand !== null) return fromLonghand;
      const fromShorthand = parseFlexGrowFromShorthand(flexShorthand);
      return fromShorthand;
    })();

    if (widthDecl) {
      if (isIntrinsicWidthKeyword(widthDecl)) {
        next.hugText = true;
      } else if (isFillContainerWidth(widthDecl)) {
        next.hugText = false;
        const widthValue = parseCssNumber(widthDecl);
        if (widthValue !== null) {
          const clampedWidth = clampToControl(controls.width, widthValue);
          if (clampedWidth !== null) next.width = clampedWidth;
        }
      } else {
        const widthValue = parseCssNumber(widthDecl);
        if (widthValue !== null) {
          const clampedWidth = clampToControl(controls.width, widthValue);
          if (clampedWidth !== null) {
            next.hugText = false;
            next.width = clampedWidth;
          }
        } else if (/\bauto\b/i.test(String(widthDecl)) && isFlexLayout) {
          const basis = String(flexBasisDecl || "").trim().toLowerCase();
          const basisIsAutoOrZero = !basis || basis === "auto" || basis === "0" || basis === "0px";
          const grow = resolvedFlexGrow;
          if (grow !== null && grow > 0 && basisIsAutoOrZero) {
            next.hugText = false;
          } else if (/\bauto\b/i.test(String(widthDecl)) && basisIsAutoOrZero && grow === 0) {
            next.hugText = true;
          }
        }
      }
    }

    const leftDecl = read("left");
    const topDecl = read("top");
    const leftValue = leftDecl !== undefined ? parseCssNumber(leftDecl) : null;
    const topValue = topDecl !== undefined ? parseCssNumber(topDecl) : null;
    if (leftValue !== null) {
      next.layoutOffsetX = clampLayoutOffset(leftValue);
    }
    if (topValue !== null) {
      next.layoutOffsetY = clampLayoutOffset(topValue);
    }

    const borderRadiusRaw = read("--btn-radius") || read("border-radius");
    if (borderRadiusRaw) {
      if (/9999|50%/i.test(borderRadiusRaw)) {
        next.shape = "circle";
      } else {
        const radiusValue = parseCssNumber(borderRadiusRaw);
        const clampedRadius = radiusValue === null ? null : clampToControl(controls.radius, radiusValue);
        if (clampedRadius !== null) {
          next.shape = "rectangle";
          next.radius = clampedRadius;
        }
      }
    }

    const borderGlowColorRaw = read("--border-glow-color");
    if (borderGlowColorRaw) {
      if (/var\(\s*--glow-color\s*\)/i.test(borderGlowColorRaw)) {
        next.matchBorderGlowColor = true;
      } else {
        const borderGlowColor = parseCssColor(borderGlowColorRaw);
        if (borderGlowColor) {
          next.matchBorderGlowColor = false;
          next.borderGlowColor = borderGlowColor;
        }
      }
    }

    const boxShadowRaw = read("box-shadow");
    if (boxShadowRaw) {
      next.customShadow = /\bnone\b/i.test(boxShadowRaw) ? "none" : boxShadowRaw;
      if (!isRuleBasedCss) {
        next.borderGlow = false;
      } else {
        next.borderGlow = !/\bnone\b/i.test(boxShadowRaw);
      }
    } else {
      next.customShadow = "none";
    }

    const borderValue = read("border");
    if (borderValue) {
      const parsedBorder = parseBorderShorthand(borderValue);
      if (parsedBorder.width !== null) {
        const clampedThickness = clampToControl(controls.borderThickness, parsedBorder.width);
        if (clampedThickness !== null) {
          next.borderThickness = clampedThickness;
        }
      }
      if (parsedBorder.color) {
        next.borderColor = parsedBorder.color;
      }
    }
    const borderColorRaw = extractColorToken(read("border-color"));
    if (borderColorRaw) {
      next.borderColor = borderColorRaw;
    }

    const textFontFamilyRaw = read("--text-font") || readText("font-family") || read("font-family");
    const textFontWeightRaw = read("--text-weight") || readText("font-weight") || read("font-weight");
    const textFontSelection = resolveFontSelectionFromCss(textFontFamilyRaw, textFontWeightRaw);
    if (textFontSelection) {
      next.textFont = textFontSelection;
    }

    const hoverTransform = hoverDeclarations.get("transform");
    if (hoverTransform) {
      const hoverScale = parseScaleFromTransform(hoverTransform);
      if (hoverScale !== null) {
        const clampedHoverScale = clampToControl(controls.hoverScale, hoverScale);
        if (clampedHoverScale !== null) {
          next.hoverScale = Number(clampedHoverScale.toFixed(2));
        }
      }
      const hoverTranslateY = parseTranslateYPxFromTransform(hoverTransform);
      if (hoverTranslateY !== null) {
        const clampedHoverLift = clampToControl(controls.hoverLift, Math.abs(hoverTranslateY));
        if (clampedHoverLift !== null) {
          next.hoverLift = Number(clampedHoverLift);
        }
      }
    }

    const activeTransform = activeDeclarations.get("transform");
    if (activeTransform) {
      const pressedScale = parseScaleFromTransform(activeTransform);
      if (pressedScale !== null) {
        const clampedPressedScale = clampToControl(controls.pressedScale, pressedScale);
        if (clampedPressedScale !== null) {
          next.pressedScale = Number(clampedPressedScale.toFixed(2));
        }
      }
      const pressedTranslateY = parseTranslateYPxFromTransform(activeTransform);
      if (pressedTranslateY !== null) {
        const clampedPressedDepth = clampToControl(controls.pressedDepth, Math.abs(pressedTranslateY));
        if (clampedPressedDepth !== null) {
          next.pressedDepth = Number(clampedPressedDepth);
        }
      }
    }

    const activeOpacity = parseCssNumber(activeDeclarations.get("opacity"));
    if (activeOpacity !== null) {
      const clampedPressedOpacity = clampToControl(controls.pressedOpacity, activeOpacity);
      if (clampedPressedOpacity !== null) {
        next.pressedOpacity = Number(clampedPressedOpacity.toFixed(2));
      }
    }

    if (!isRuleBasedCss) {
      next.shape = "rectangle";
      Object.assign(next, getDefaultBorderAnimationEffect());
    }

    ensureArcGlowContrastsBg(next);

    if (next.shape === "circle") {
      next.hugText = false;
      next.width = next.height;
    }

    return next;
  };

  const defaults = {
    text: "WHY CHOOSE US",
    iconSvg: "",
    iconColor: "#ffffff",
    svgOnly: false,
    sidePadding: 20,
    iconGap: 9,
    textFont: "Whitney",
    bg: "#171717",
    pageBg: "#171717",
    glowColor: "#ffffff",
    textColor: "#ffffff",
    fontSize: 16,
    lineHeight: 19,
    borderGlow: false,
    borderGlowColor: "#ffffff",
    matchBorderGlowColor: true,
    borderColor: "transparent",
    customShadow: "none",
    borderGlowSize: 18,
    borderThickness: 1,
    hugText: false,
    shape: "rectangle",
    width: 250,
    height: 80,
    radius: 48,
    glowSize: 10,
    speed: 1,
    hoverLift: 4,
    hoverScale: 1.03,
    pressedDepth: 3,
    pressedScale: 0.97,
    pressedOpacity: 0.9,
    layoutOffsetX: 0,
    layoutOffsetY: 0,
  };

  /** Conic border sweep is invisible when arc color equals fill; pick a contrasting default. */
  const ensureArcGlowContrastsBg = (state) => {
    if (!state || typeof state.bg !== "string" || typeof state.glowColor !== "string") return;
    const g = state.glowColor.trim().toLowerCase();
    const b = state.bg.trim().toLowerCase();
    if (g !== b) return;
    const rgb = parsePageBgToRgb(state.bg);
    if (!rgb) {
      state.glowColor = defaults.glowColor;
      return;
    }
    const L = previewBackgroundLuminance(rgb.r, rgb.g, rgb.b);
    state.glowColor = L < 0.5 ? defaults.glowColor : "#171717";
  };

  const getDefaultBorderAnimationEffect = () => ({
    glowSize: defaults.glowSize,
    speed: defaults.speed,
    glowColor: defaults.glowColor,
    hoverLift: defaults.hoverLift,
    hoverScale: defaults.hoverScale,
    pressedDepth: defaults.pressedDepth,
    pressedScale: defaults.pressedScale,
    pressedOpacity: defaults.pressedOpacity,
    matchBorderGlowColor: defaults.matchBorderGlowColor,
  });

  const getStateFromControls = () => ({
    text: controls.text.value,
    iconSvg: controls.iconSvg.value,
    iconColor: controls.iconColor.value,
    svgOnly: controls.svgOnly.checked,
    sidePadding: Number(controls.sidePadding.value),
    iconGap: Number(controls.iconGap.value),
    textFont: controls.textFont.value,
    bg: controls.bg.value,
    pageBg: controls.pageBg.value,
    glowColor: controls.glowColor.value,
    textColor: controls.textColor.value,
    fontSize: Number(controls.fontSize.value),
    lineHeight: Number(controls.lineHeight.value),
    borderGlow: controls.borderGlow.checked,
    borderGlowColor: controls.borderGlowColor.value,
    matchBorderGlowColor: controls.matchBorderGlowColor.checked,
    borderColor:
      button.style.getPropertyValue("--border-color").trim() || defaults.borderColor,
    customShadow: parseCustomShadowFromDom(
      button.style.getPropertyValue("--custom-shadow").trim() || CUSTOM_SHADOW_NONE
    ),
    borderGlowSize: Number(controls.borderGlowSize.value),
    borderThickness: Number(controls.borderThickness.value),
    hugText: controls.hugText.checked,
    shape: controls.shape.value,
    width: Number(controls.width.value),
    height: Number(controls.height.value),
    radius: Number(controls.radius.value),
    glowSize: Number(controls.glowSize.value),
    speed: Number(controls.speed.value),
    hoverLift: Number(controls.hoverLift.value),
    hoverScale: Number(controls.hoverScale.value),
    pressedDepth: Number(controls.pressedDepth.value),
    pressedScale: Number(controls.pressedScale.value),
    pressedOpacity: Number(controls.pressedOpacity.value),
    layoutOffsetX: (() => {
      const raw = button.style.getPropertyValue("--layout-offset-x").trim();
      const parsed = Number.parseFloat(raw);
      return Number.isFinite(parsed) ? parsed : defaults.layoutOffsetX;
    })(),
    layoutOffsetY: (() => {
      const raw = button.style.getPropertyValue("--layout-offset-y").trim();
      const parsed = Number.parseFloat(raw);
      return Number.isFinite(parsed) ? parsed : defaults.layoutOffsetY;
    })(),
  });

  const approxEqual = (a, b, tol = 1e-5) => Math.abs(Number(a) - Number(b)) < tol;

  const hasDefaultBorderAnimationEffect = (state) => {
    const ref = getDefaultBorderAnimationEffect();
    const glowHex = String(state.glowColor).trim().toLowerCase();
    const refGlowHex = String(ref.glowColor).trim().toLowerCase();
    return (
      Number(state.glowSize) === ref.glowSize &&
      approxEqual(state.speed, ref.speed, 0.0001) &&
      glowHex === refGlowHex &&
      Number(state.hoverLift) === ref.hoverLift &&
      approxEqual(state.hoverScale, ref.hoverScale, 1e-6) &&
      Number(state.pressedDepth) === ref.pressedDepth &&
      approxEqual(state.pressedScale, ref.pressedScale, 1e-6) &&
      approxEqual(state.pressedOpacity, ref.pressedOpacity, 1e-6) &&
      Boolean(state.matchBorderGlowColor) === Boolean(ref.matchBorderGlowColor)
    );
  };

  const syncApplyBorderAnimationOfferVisibility = () => {
    controls.applyBorderAnimationEffect.hidden = hasDefaultBorderAnimationEffect(
      getStateFromControls()
    );
  };

  const saveState = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(getStateFromControls()));
    cssOverlayContent.textContent = buildCssSnippet();
    syncApplyBorderAnimationOfferVisibility();
  };

  const renderGithubDeployCode = (payload) => {
    if (!payload) {
      controls.githubDeployCode.textContent = "GitHub Deploy Code: unavailable";
      return;
    }

    if (payload.status === "ok" && payload.sha) {
      controls.githubDeployCode.textContent = `GitHub Deploy Code: ${payload.sha}`;
      return;
    }

    if (payload.status === "rate_limited") {
      controls.githubDeployCode.textContent = "GitHub Deploy Code: rate limited";
      return;
    }

    if (payload.status === "network_error") {
      controls.githubDeployCode.textContent = "GitHub Deploy Code: network unavailable";
      return;
    }

    controls.githubDeployCode.textContent = "GitHub Deploy Code: unavailable";
  };

  const loadGithubDeployCode = async () => {
    try {
      const cached = await convex.query("githubDeploy:getCached", {});
      renderGithubDeployCode(cached);
    } catch {
      controls.githubDeployCode.textContent = "GitHub Deploy Code: unavailable";
    }
  };

  const refreshGithubDeployCode = async () => {
    try {
      const payload = await convex.action("githubDeploy:refresh", {});
      renderGithubDeployCode(payload);
    } catch {
      controls.githubDeployCode.textContent = "GitHub Deploy Code: network unavailable";
    }
  };

  const loadVariations = () => {
    try {
      const parsed = JSON.parse(localStorage.getItem(VARIATIONS_KEY) || "[]");
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(
        (item) =>
          item &&
          typeof item.id === "string" &&
          typeof item.name === "string" &&
          (item.updatedAt === undefined || Number.isFinite(Number(item.updatedAt))) &&
          item.state &&
          typeof item.state === "object"
      );
    } catch {
      return [];
    }
  };

  const saveVariations = (variations) => {
    localStorage.setItem(VARIATIONS_KEY, JSON.stringify(variations));
  };

  const parseStateJson = (stateJson) => {
    try {
      const parsed = JSON.parse(stateJson);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      return null;
    }
  };

  const normalizeRemoteVariation = (entry) => {
    const state = parseStateJson(entry.stateJson);
    if (!state) return null;
    return {
      id: String(entry.id),
      name: entry.name,
      updatedAt: Number(entry.updatedAt),
      state,
    };
  };

  const formatVariationTimestamp = (timestampMs) => {
    if (!Number.isFinite(Number(timestampMs))) return "";
    const timestamp = Number(timestampMs);
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return "";

    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const setVariationLastSaved = (timestampMs) => {
    const label = formatVariationTimestamp(timestampMs);
    controls.variationLastSaved.textContent = `Last saved: ${label || "--"}`;
  };

  const syncShapeLayout = () => {
    const isCircle = controls.shape.value === "circle";
    button.classList.toggle("shape-circle", isCircle);

    if (isCircle) {
      controls.hugText.checked = false;
      controls.hugText.disabled = true;
      setWidthDisabledState(true);
      setRadiusDisabledState(true);

      const size = Number(controls.height.value);
      controls.width.value = String(size);
      valueLabels.width.textContent = String(size);
      button.style.width = "";
      button.style.setProperty("--btn-width", `${size}px`);
      button.style.setProperty("--btn-radius", "9999px");
      return;
    }

    controls.hugText.disabled = false;
    setRadiusDisabledState(false);
    setWidthDisabledState(Boolean(controls.hugText.checked));
    button.style.setProperty("--btn-radius", `${controls.radius.value}px`);

    if (controls.hugText.checked) {
      button.style.width = "fit-content";
    } else {
      button.style.width = "";
      button.style.setProperty("--btn-width", `${controls.width.value}px`);
    }
  };

  const syncVariationsFromCloud = async () => {
    try {
      const cloudRows = await convex.query("variations:list", {});
      const normalized = cloudRows
        .map(normalizeRemoteVariation)
        .filter((entry) => entry !== null);
      variations = normalized;
      saveVariations(variations);
      renderVariations(variations, "");
    } catch {
      // Fall back to local cache when cloud is unavailable.
      renderVariations(variations, "");
    }
  };

  const saveVariationToCloud = async (name, state) => {
    const response = await convex.mutation("variations:save", {
      name,
      stateJson: JSON.stringify(state),
    });
    const normalized = normalizeRemoteVariation(response);
    if (!normalized) throw new Error("Invalid cloud response");
    return normalized;
  };

  const removeVariationFromCloud = async (id) => {
    await convex.mutation("variations:remove", { id });
  };

  const renderVariations = (variations, selectedId = "") => {
    controls.variationSelect.innerHTML = "";
    const placeholder = document.createElement("option");
    placeholder.value = "";
    placeholder.textContent = "Select variation...";
    controls.variationSelect.appendChild(placeholder);

    for (const variation of variations) {
      const option = document.createElement("option");
      option.value = variation.id;
      const timestampLabel = formatVariationTimestamp(variation.updatedAt);
      option.textContent = timestampLabel
        ? `${variation.name} - ${timestampLabel}`
        : variation.name;
      controls.variationSelect.appendChild(option);
    }

    controls.variationSelect.value = selectedId;
    controls.deleteVariation.disabled = !selectedId;

    if (selectedId) {
      const selectedVariation = variations.find((entry) => entry.id === selectedId);
      if (selectedVariation) {
        controls.variationName.value = selectedVariation.name;
        setVariationLastSaved(selectedVariation.updatedAt);
      }
      return;
    }

    setVariationLastSaved(undefined);
  };

  const applyState = (incomingState) => {
    const state = { ...defaults, ...incomingState };
    ensureArcGlowContrastsBg(state);
    const fontSettings = resolveFontSettings(state.textFont);

    controls.text.value = state.text;
    controls.textFont.value = state.textFont;
    controls.iconColor.value = state.iconColor;
    controls.svgOnly.checked = Boolean(state.svgOnly);
    controls.sidePadding.value = String(state.sidePadding);
    controls.iconGap.value = String(state.iconGap);
    controls.bg.value = state.bg;
    controls.pageBg.value = state.pageBg;
    controls.glowColor.value = state.glowColor;
    controls.textColor.value = state.textColor;
    controls.fontSize.value = String(state.fontSize);
    controls.lineHeight.value = String(state.lineHeight);
    controls.borderGlow.checked = Boolean(state.borderGlow);
    controls.matchBorderGlowColor.checked = Boolean(state.matchBorderGlowColor);
    controls.borderGlowColor.value = controls.matchBorderGlowColor.checked
      ? state.glowColor
      : state.borderGlowColor;
    controls.borderGlowSize.value = String(state.borderGlowSize);
    controls.borderThickness.value = String(state.borderThickness);
    controls.hugText.checked = Boolean(state.hugText);
    controls.shape.value = state.shape;
    controls.width.value = String(state.width);
    controls.height.value = String(state.height);
    controls.radius.value = String(state.radius);
    controls.glowSize.value = String(state.glowSize);
    controls.speed.value = String(state.speed);
    controls.hoverLift.value = String(state.hoverLift);
    controls.hoverScale.value = String(state.hoverScale);
    controls.pressedDepth.value = String(state.pressedDepth);
    controls.pressedScale.value = String(state.pressedScale);
    controls.pressedOpacity.value = String(state.pressedOpacity);

    controls.iconSvg.value = state.iconSvg;
    renderButtonContent(state.text, state.iconSvg, Boolean(state.svgOnly));
    button.style.setProperty("--c", state.bg);
    button.style.setProperty("--text-font", `"${fontSettings.family}"`);
    button.style.setProperty("--text-weight", fontSettings.weight);
    button.style.setProperty("--glow-color", state.glowColor);
    button.style.setProperty("--text-color", state.textColor);
    button.style.setProperty("--icon-color", state.iconColor);
    button.style.setProperty("--side-padding", `${state.sidePadding}px`);
    button.style.setProperty("--icon-gap", `${state.iconGap}px`);
    button.style.setProperty("--text-size", `${state.fontSize}px`);
    button.style.setProperty("--text-line-height", `${state.lineHeight}px`);
    button.style.setProperty("--btn-height", `${state.height}px`);
    button.style.setProperty("--btn-width", `${state.width}px`);
    button.style.setProperty("--p", `${state.glowSize}%`);
    button.style.setProperty("--hover-lift", `${state.hoverLift}px`);
    button.style.setProperty("--hover-scale", String(state.hoverScale));
    button.style.setProperty("--pressed-depth", `${state.pressedDepth}px`);
    button.style.setProperty("--pressed-scale", String(state.pressedScale));
    button.style.setProperty("--pressed-opacity", String(state.pressedOpacity));
    const resolvedBorderGlowColor = controls.matchBorderGlowColor.checked
      ? state.glowColor
      : state.borderGlowColor;
    button.style.setProperty("--border-glow-color", resolvedBorderGlowColor);
    button.style.setProperty("--border-color", state.borderColor || "transparent");
    button.style.setProperty("--custom-shadow", formatCustomShadowCssVar(state.customShadow));
    button.style.setProperty("--border-glow-size", `${state.borderGlowSize}px`);
    button.style.setProperty("--border-thickness", `${state.borderThickness}px`);
    button.style.setProperty(
      "--layout-offset-x",
      `${Number.isFinite(Number(state.layoutOffsetX)) ? state.layoutOffsetX : 0}px`
    );
    button.style.setProperty(
      "--layout-offset-y",
      `${Number.isFinite(Number(state.layoutOffsetY)) ? state.layoutOffsetY : 0}px`
    );
    button.classList.toggle("border-glow-enabled", Boolean(state.borderGlow));
    setMatchBorderGlowColorDisabledState(!state.borderGlow);
    setBorderGlowColorDisabledState(!state.borderGlow || controls.matchBorderGlowColor.checked);
    setBorderGlowSizeDisabledState(!state.borderGlow);
    syncPreviewDotGrid(state.pageBg);
    syncShapeLayout();

    valueLabels.width.textContent = String(state.width);
    valueLabels.height.textContent = String(state.height);
    valueLabels.radius.textContent = String(state.radius);
    valueLabels.fontSize.textContent = String(state.fontSize);
    valueLabels.lineHeight.textContent = String(state.lineHeight);
    valueLabels.sidePadding.textContent = String(state.sidePadding);
    valueLabels.iconGap.textContent = String(state.iconGap);
    valueLabels.borderGlowSize.textContent = String(state.borderGlowSize);
    valueLabels.borderThickness.textContent = String(state.borderThickness);
    valueLabels.glowSize.textContent = String(state.glowSize);
    valueLabels.speed.textContent = Number(state.speed).toFixed(1);
    valueLabels.hoverLift.textContent = String(state.hoverLift);
    valueLabels.hoverScale.textContent = Number(state.hoverScale).toFixed(2);
    valueLabels.pressedDepth.textContent = String(state.pressedDepth);
    valueLabels.pressedScale.textContent = Number(state.pressedScale).toFixed(2);
    valueLabels.pressedOpacity.textContent = Number(state.pressedOpacity).toFixed(2);
    speedMultiplier = Number(state.speed);
    button.style.setProperty(
      "--glow-rotate-duration",
      `${Math.max(0.1, 2 / speedMultiplier).toFixed(2)}s`
    );
    syncApplyBorderAnimationOfferVisibility();
  };

  const loadState = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (!saved || typeof saved !== "object") {
        return defaults;
      }

      return {
        text: typeof saved.text === "string" ? saved.text : defaults.text,
        iconSvg: typeof saved.iconSvg === "string" ? saved.iconSvg : defaults.iconSvg,
        iconColor: typeof saved.iconColor === "string" ? saved.iconColor : defaults.iconColor,
        svgOnly: Boolean(saved.svgOnly),
        sidePadding: Number.isFinite(Number(saved.sidePadding))
          ? Number(saved.sidePadding)
          : defaults.sidePadding,
        iconGap: Number.isFinite(Number(saved.iconGap))
          ? Number(saved.iconGap)
          : defaults.iconGap,
        textFont: typeof saved.textFont === "string" ? saved.textFont : defaults.textFont,
        bg: typeof saved.bg === "string" ? saved.bg : defaults.bg,
        pageBg: typeof saved.pageBg === "string" ? saved.pageBg : defaults.pageBg,
        glowColor: typeof saved.glowColor === "string" ? saved.glowColor : defaults.glowColor,
        textColor: typeof saved.textColor === "string" ? saved.textColor : defaults.textColor,
        fontSize: Number.isFinite(Number(saved.fontSize))
          ? Number(saved.fontSize)
          : defaults.fontSize,
        lineHeight: Number.isFinite(Number(saved.lineHeight))
          ? Number(saved.lineHeight)
          : defaults.lineHeight,
        borderGlow: Boolean(saved.borderGlow),
        borderGlowColor:
          typeof saved.borderGlowColor === "string"
            ? saved.borderGlowColor
            : defaults.borderGlowColor,
        matchBorderGlowColor:
          typeof saved.matchBorderGlowColor === "boolean"
            ? saved.matchBorderGlowColor
            : defaults.matchBorderGlowColor,
        borderColor:
          typeof saved.borderColor === "string" ? saved.borderColor : defaults.borderColor,
        customShadow:
          typeof saved.customShadow === "string" ? saved.customShadow : defaults.customShadow,
        borderGlowSize: Number.isFinite(Number(saved.borderGlowSize))
          ? Number(saved.borderGlowSize)
          : defaults.borderGlowSize,
        borderThickness: Number.isFinite(Number(saved.borderThickness))
          ? Number(saved.borderThickness)
          : defaults.borderThickness,
        hugText: Boolean(saved.hugText),
        shape: saved.shape === "circle" ? "circle" : defaults.shape,
        width: Number.isFinite(Number(saved.width)) ? Number(saved.width) : defaults.width,
        height: Number.isFinite(Number(saved.height)) ? Number(saved.height) : defaults.height,
        radius: Number.isFinite(Number(saved.radius)) ? Number(saved.radius) : defaults.radius,
        glowSize: Number.isFinite(Number(saved.glowSize)) ? Number(saved.glowSize) : defaults.glowSize,
        speed: Number.isFinite(Number(saved.speed)) ? Number(saved.speed) : defaults.speed,
        hoverLift: Number.isFinite(Number(saved.hoverLift))
          ? Number(saved.hoverLift)
          : defaults.hoverLift,
        hoverScale: Number.isFinite(Number(saved.hoverScale))
          ? Number(saved.hoverScale)
          : defaults.hoverScale,
        pressedDepth: Number.isFinite(Number(saved.pressedDepth))
          ? Number(saved.pressedDepth)
          : defaults.pressedDepth,
        pressedScale: Number.isFinite(Number(saved.pressedScale))
          ? Number(saved.pressedScale)
          : defaults.pressedScale,
        pressedOpacity: Number.isFinite(Number(saved.pressedOpacity))
          ? Number(saved.pressedOpacity)
          : defaults.pressedOpacity,
        layoutOffsetX: Number.isFinite(Number(saved.layoutOffsetX))
          ? Number(saved.layoutOffsetX)
          : defaults.layoutOffsetX,
        layoutOffsetY: Number.isFinite(Number(saved.layoutOffsetY))
          ? Number(saved.layoutOffsetY)
          : defaults.layoutOffsetY,
      };
    } catch {
      return defaults;
    }
  };

  let keepApplyEffectOfferVisible = false;

  const syncApplyEffectButtonVisibility = () => {
    const raw = controls.cssImport.value.trim();
    const flat = Boolean(raw && !isCssRuleSheet(controls.cssImport.value));
    controls.applyDefaultEffect.hidden = !(flat || keepApplyEffectOfferVisible);
  };

  let speedMultiplier = Number(controls.speed.value);
  let variations = loadVariations();

  controls.text.addEventListener("input", () => {
    renderButtonContent(controls.text.value, controls.iconSvg.value, controls.svgOnly.checked);
    saveState();
  });

  controls.iconSvg.addEventListener("input", () => {
    renderButtonContent(controls.text.value, controls.iconSvg.value, controls.svgOnly.checked);
    saveState();
  });

  controls.svgOnly.addEventListener("change", () => {
    renderButtonContent(controls.text.value, controls.iconSvg.value, controls.svgOnly.checked);
    saveState();
  });

  controls.iconColor.addEventListener("input", () => {
    button.style.setProperty("--icon-color", controls.iconColor.value);
    saveState();
  });

  controls.sidePadding.addEventListener("input", () => {
    const value = controls.sidePadding.value;
    button.style.setProperty("--side-padding", `${value}px`);
    valueLabels.sidePadding.textContent = value;
    saveState();
  });

  controls.iconGap.addEventListener("input", () => {
    const value = controls.iconGap.value;
    button.style.setProperty("--icon-gap", `${value}px`);
    valueLabels.iconGap.textContent = value;
    saveState();
  });

  controls.textFont.addEventListener("input", () => {
    const fontSettings = resolveFontSettings(controls.textFont.value);
    button.style.setProperty("--text-font", `"${fontSettings.family}"`);
    button.style.setProperty("--text-weight", fontSettings.weight);
    saveState();
  });

  controls.bg.addEventListener("input", () => {
    button.style.setProperty("--c", controls.bg.value);
    // Button and page backgrounds are intentionally independent.
    saveState();
  });

  controls.pageBg.addEventListener("input", () => {
    syncPreviewDotGrid(controls.pageBg.value);
    saveState();
  });

  controls.glowColor.addEventListener("input", () => {
    button.style.setProperty("--glow-color", controls.glowColor.value);
    if (controls.matchBorderGlowColor.checked) {
      controls.borderGlowColor.value = controls.glowColor.value;
      button.style.setProperty("--border-glow-color", controls.glowColor.value);
    }
    saveState();
  });

  controls.textColor.addEventListener("input", () => {
    button.style.setProperty("--text-color", controls.textColor.value);
    saveState();
  });

  controls.fontSize.addEventListener("input", () => {
    const value = controls.fontSize.value;
    button.style.setProperty("--text-size", `${value}px`);
    valueLabels.fontSize.textContent = value;
    saveState();
  });

  controls.lineHeight.addEventListener("input", () => {
    const value = controls.lineHeight.value;
    button.style.setProperty("--text-line-height", `${value}px`);
    valueLabels.lineHeight.textContent = value;
    saveState();
  });

  controls.borderGlow.addEventListener("change", () => {
    button.classList.toggle("border-glow-enabled", controls.borderGlow.checked);
    setMatchBorderGlowColorDisabledState(!controls.borderGlow.checked);
    setBorderGlowColorDisabledState(
      !controls.borderGlow.checked || controls.matchBorderGlowColor.checked
    );
    setBorderGlowSizeDisabledState(!controls.borderGlow.checked);
    saveState();
  });

  controls.borderGlowColor.addEventListener("input", () => {
    button.style.setProperty("--border-glow-color", controls.borderGlowColor.value);
    saveState();
  });

  controls.matchBorderGlowColor.addEventListener("change", () => {
    setBorderGlowColorDisabledState(
      !controls.borderGlow.checked || controls.matchBorderGlowColor.checked
    );
    if (controls.matchBorderGlowColor.checked) {
      controls.borderGlowColor.value = controls.glowColor.value;
      button.style.setProperty("--border-glow-color", controls.glowColor.value);
    } else {
      button.style.setProperty("--border-glow-color", controls.borderGlowColor.value);
    }
    saveState();
  });

  controls.borderGlowSize.addEventListener("input", () => {
    const value = controls.borderGlowSize.value;
    button.style.setProperty("--border-glow-size", `${value}px`);
    valueLabels.borderGlowSize.textContent = value;
    saveState();
  });

  controls.borderThickness.addEventListener("input", () => {
    const value = controls.borderThickness.value;
    button.style.setProperty("--border-thickness", `${value}px`);
    valueLabels.borderThickness.textContent = value;
    saveState();
  });

  controls.hugText.addEventListener("change", () => {
    syncShapeLayout();
    saveState();
  });

  controls.shape.addEventListener("change", () => {
    syncShapeLayout();
    saveState();
  });

  controls.width.addEventListener("input", () => {
    if (controls.shape.value === "circle") return;
    if (controls.hugText.checked) {
      controls.hugText.checked = false;
      setWidthDisabledState(false);
    }
    const value = controls.width.value;
    button.style.setProperty("--btn-width", `${value}px`);
    valueLabels.width.textContent = value;
    syncShapeLayout();
    saveState();
  });

  controls.height.addEventListener("input", () => {
    const value = controls.height.value;
    button.style.setProperty("--btn-height", `${value}px`);
    if (controls.shape.value === "circle") {
      controls.width.value = value;
      button.style.setProperty("--btn-width", `${value}px`);
      valueLabels.width.textContent = value;
    }
    valueLabels.height.textContent = value;
    saveState();
  });

  controls.radius.addEventListener("input", () => {
    if (controls.shape.value === "circle") return;
    const value = controls.radius.value;
    button.style.setProperty("--btn-radius", `${value}px`);
    valueLabels.radius.textContent = value;
    saveState();
  });

  controls.glowSize.addEventListener("input", () => {
    const value = controls.glowSize.value;
    button.style.setProperty("--p", `${value}%`);
    valueLabels.glowSize.textContent = value;
    saveState();
  });

  controls.speed.addEventListener("input", () => {
    speedMultiplier = Number(controls.speed.value);
    valueLabels.speed.textContent = speedMultiplier.toFixed(1);
    button.style.setProperty(
      "--glow-rotate-duration",
      `${Math.max(0.1, 2 / speedMultiplier).toFixed(2)}s`
    );
    saveState();
  });

  controls.hoverLift.addEventListener("input", () => {
    const value = controls.hoverLift.value;
    button.style.setProperty("--hover-lift", `${value}px`);
    valueLabels.hoverLift.textContent = value;
    saveState();
  });

  controls.hoverScale.addEventListener("input", () => {
    const value = Number(controls.hoverScale.value).toFixed(2);
    button.style.setProperty("--hover-scale", value);
    valueLabels.hoverScale.textContent = value;
    saveState();
  });

  controls.pressedDepth.addEventListener("input", () => {
    const value = controls.pressedDepth.value;
    button.style.setProperty("--pressed-depth", `${value}px`);
    valueLabels.pressedDepth.textContent = value;
    saveState();
  });

  controls.pressedScale.addEventListener("input", () => {
    const value = Number(controls.pressedScale.value).toFixed(2);
    button.style.setProperty("--pressed-scale", value);
    valueLabels.pressedScale.textContent = value;
    saveState();
  });

  controls.pressedOpacity.addEventListener("input", () => {
    const value = Number(controls.pressedOpacity.value).toFixed(2);
    button.style.setProperty("--pressed-opacity", value);
    valueLabels.pressedOpacity.textContent = value;
    saveState();
  });

  const buildCssSnippet = () => {
    const fontSettings = resolveFontSettings(controls.textFont.value);
    const widthCss =
      controls.shape.value === "circle"
        ? `  width: ${controls.height.value}px;`
        : controls.hugText.checked
          ? "  width: fit-content;"
          : "  width: var(--btn-width);";
    const radiusCss =
      controls.shape.value === "circle" ? "9999px" : `${controls.radius.value}px`;
    const exportBorderGlowColor = controls.matchBorderGlowColor.checked
      ? "var(--glow-color)"
      : controls.borderGlowColor.value;
    const borderGlowCss = controls.borderGlow.checked
      ? `\n  --border-glow-color: ${exportBorderGlowColor};\n  --border-glow-size: ${controls.borderGlowSize.value}px;\n  box-shadow: 0 0 var(--border-glow-size) color-mix(in srgb, var(--border-glow-color) 75%, transparent);`
      : "";
    const exportBorderColor =
      button.style.getPropertyValue("--border-color").trim() || "transparent";
    const rawCustomShadow = button.style.getPropertyValue("--custom-shadow").trim();
    const exportCustomShadow = parseCustomShadowFromDom(rawCustomShadow);
    const exportLayoutOffsetX =
      button.style.getPropertyValue("--layout-offset-x").trim() || "0px";
    const exportLayoutOffsetY =
      button.style.getPropertyValue("--layout-offset-y").trim() || "0px";

    return `.custom-glow-button {
  --c: ${controls.bg.value};
  --text-font: "${fontSettings.family}";
  --text-weight: ${fontSettings.weight};
  --icon-color: ${controls.iconColor.value};
  --side-padding: ${controls.sidePadding.value}px;
  --icon-gap: ${controls.iconGap.value}px;
  --text-size: ${controls.fontSize.value}px;
  --text-line-height: ${controls.lineHeight.value}px;
  --hover-lift: ${controls.hoverLift.value}px;
  --hover-scale: ${Number(controls.hoverScale.value).toFixed(2)};
  --pressed-depth: ${controls.pressedDepth.value}px;
  --pressed-scale: ${Number(controls.pressedScale.value).toFixed(2)};
  --pressed-opacity: ${Number(controls.pressedOpacity.value).toFixed(2)};
  --p: ${controls.glowSize.value}%;
  --glow-color: ${controls.glowColor.value};
  --text-color: ${controls.textColor.value};
  --border-color: ${exportBorderColor};
  --custom-shadow: ${exportCustomShadow};
  --layout-offset-x: ${exportLayoutOffsetX};
  --layout-offset-y: ${exportLayoutOffsetY};
  --border-thickness: ${controls.borderThickness.value}px;
  --btn-width: ${controls.shape.value === "circle" ? controls.height.value : controls.width.value}px;
  --btn-height: ${controls.height.value}px;
  --btn-radius: ${radiusCss};
${widthCss}
  height: var(--btn-height);
  padding-inline: var(--side-padding);
  color: var(--text-color);
  font-size: var(--text-size);
  line-height: var(--text-line-height);
  font-family: var(--text-font), sans-serif;
  font-weight: var(--text-weight);
  border: var(--border-thickness) solid var(--border-color);
  border-radius: var(--btn-radius);
  background: linear-gradient(var(--c), var(--c)) padding-box,
    conic-gradient(
      from var(--gradient-angle, 0deg),
      transparent,
      var(--glow-color) var(--p),
      transparent calc(var(--p) * 2)
    ) border-box;
  box-shadow: var(--custom-shadow);${borderGlowCss}
}

/* Animation */
@keyframes glow-rotate {
  from {
    --gradient-angle: 0deg;
  }
  to {
    --gradient-angle: 360deg;
  }
}

.custom-glow-button {
  animation: glow-rotate ${Math.max(0.1, (2 / speedMultiplier).toFixed(2))}s linear infinite;
}

.custom-glow-button:hover {
  transform: translate(
      var(--layout-offset-x),
      calc(var(--layout-offset-y) + -1 * var(--hover-lift))
    )
    scale(var(--hover-scale));
}

.custom-glow-button:active {
  transform: translate(
      var(--layout-offset-x),
      calc(var(--layout-offset-y) + var(--pressed-depth))
    )
    scale(var(--pressed-scale));
  opacity: var(--pressed-opacity);
}`;
  };

  controls.copyCss.addEventListener("click", async () => {
    const originalLabel = controls.copyCss.textContent;

    try {
      await navigator.clipboard.writeText(buildCssSnippet());
      controls.copyCss.textContent = "Copied!";
    } catch (error) {
      controls.copyCss.textContent = "Copy failed";
    }

    setTimeout(() => {
      controls.copyCss.textContent = originalLabel;
    }, 1200);
  });

  const setCssOverlayOpen = (open) => {
    cssOverlay.classList.toggle("visible", open);
    previewArea.classList.toggle("css-overlay-open", open);
    cssOverlay.setAttribute("aria-hidden", String(!open));
    controls.toggleCssOverlay.textContent = open ? "Hide CSS" : "Show CSS";
  };

  controls.toggleCssOverlay.addEventListener("click", () => {
    setCssOverlayOpen(!cssOverlay.classList.contains("visible"));
  });

  controls.cssOverlayClose.addEventListener("click", () => {
    setCssOverlayOpen(false);
  });

  controls.downloadCss.addEventListener("click", () => {
    const cssText = buildCssSnippet();
    const blob = new Blob([cssText], { type: "text/css;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "custom-glow-button.css";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  controls.applyCssImport.addEventListener("click", () => {
    const originalLabel = controls.applyCssImport.textContent;
    const imported = importCssToState(controls.cssImport.value);
    if (!imported) {
      controls.applyCssImport.textContent = "Invalid CSS";
      setTimeout(() => {
        controls.applyCssImport.textContent = originalLabel;
      }, 1000);
      return;
    }

    applyState(imported);
    saveState();
    const src = controls.cssImport.value.trim();
    keepApplyEffectOfferVisible = Boolean(src && !isCssRuleSheet(controls.cssImport.value));
    syncApplyEffectButtonVisibility();
    controls.applyCssImport.textContent = "Applied";
    setTimeout(() => {
      controls.applyCssImport.textContent = originalLabel;
    }, 1000);
  });

  controls.applyDefaultEffect.addEventListener("click", () => {
    keepApplyEffectOfferVisible = false;
    applyState({ ...getStateFromControls(), ...getDefaultBorderAnimationEffect() });
    saveState();
    syncApplyEffectButtonVisibility();
  });

  let applyBorderAnimationFeedbackTimer;
  controls.applyBorderAnimationEffect.addEventListener("click", () => {
    const btn = controls.applyBorderAnimationEffect;
    const originalLabel = btn.textContent;
    applyState({ ...getStateFromControls(), ...getDefaultBorderAnimationEffect() });
    saveState();
    btn.hidden = false;
    btn.textContent = "✓";
    btn.classList.add("apply-border-animation-success");
    btn.disabled = true;
    if (applyBorderAnimationFeedbackTimer) {
      clearTimeout(applyBorderAnimationFeedbackTimer);
    }
    applyBorderAnimationFeedbackTimer = setTimeout(() => {
      btn.textContent = originalLabel;
      btn.classList.remove("apply-border-animation-success");
      btn.disabled = false;
      applyBorderAnimationFeedbackTimer = undefined;
      syncApplyBorderAnimationOfferVisibility();
    }, 900);
  });

  controls.cssImport.addEventListener("input", () => {
    const raw = controls.cssImport.value.trim();
    if (raw && isCssRuleSheet(controls.cssImport.value)) {
      keepApplyEffectOfferVisible = false;
    }
    syncApplyEffectButtonVisibility();
  });

  controls.reset.addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY);
    keepApplyEffectOfferVisible = false;
    applyState(defaults);
    syncApplyEffectButtonVisibility();
  });

  controls.refreshGithubDeploy.addEventListener("click", () => {
    controls.githubDeployCode.textContent = "GitHub Deploy Code: refreshing...";
    refreshGithubDeployCode();
  });

  controls.variationSelect.addEventListener("change", () => {
    const selectedId = controls.variationSelect.value;
    controls.deleteVariation.disabled = !selectedId;
    if (!selectedId) return;

    const selectedVariation = variations.find((entry) => entry.id === selectedId);
    if (!selectedVariation) return;
    controls.variationName.value = selectedVariation.name;
    setVariationLastSaved(selectedVariation.updatedAt);
    applyState(selectedVariation.state);
    saveState();
  });

  let saveVariationFeedbackTimer;
  const showSaveVariationFeedback = (isSuccess) => {
    const originalLabel = controls.saveVariation.textContent;
    controls.saveVariation.textContent = isSuccess ? "✓" : "✕";
    controls.saveVariation.classList.toggle("save-feedback-error", !isSuccess);
    controls.saveVariation.disabled = true;

    if (saveVariationFeedbackTimer) {
      clearTimeout(saveVariationFeedbackTimer);
    }

    saveVariationFeedbackTimer = setTimeout(() => {
      controls.saveVariation.textContent = originalLabel;
      controls.saveVariation.classList.remove("save-feedback-error");
      controls.saveVariation.disabled = false;
    }, 900);
  };

  controls.saveVariation.addEventListener("click", async () => {
    const trimmedName = controls.variationName.value.trim();
    if (!trimmedName) return;
    const now = Date.now();
    const existing = variations.find(
      (entry) => entry.name.toLowerCase() === trimmedName.toLowerCase()
    );
    const snapshot = getStateFromControls();

    if (existing) {
      existing.state = snapshot;
      existing.name = trimmedName;
      existing.updatedAt = now;
    }

    try {
      const saved = await saveVariationToCloud(trimmedName, snapshot);
      const existingById = variations.find((entry) => entry.id === saved.id);
      if (existingById) {
        existingById.name = saved.name;
        existingById.state = saved.state;
        existingById.updatedAt = saved.updatedAt;
      } else {
        const existingByName = variations.find(
          (entry) => entry.name.toLowerCase() === saved.name.toLowerCase()
        );
        if (existingByName) {
          existingByName.id = saved.id;
          existingByName.state = saved.state;
          existingByName.name = saved.name;
          existingByName.updatedAt = saved.updatedAt;
        } else {
          variations.push(saved);
        }
      }
      saveVariations(variations);
      renderVariations(variations, saved.id);
      showSaveVariationFeedback(true);
      return;
    } catch {
      if (existing) {
        try {
          saveVariations(variations);
          renderVariations(variations, existing.id);
          showSaveVariationFeedback(true);
        } catch {
          showSaveVariationFeedback(false);
        }
        return;
      }

      const newVariation = {
        id: crypto.randomUUID(),
        name: trimmedName,
        updatedAt: now,
        state: snapshot,
      };
      try {
        variations.push(newVariation);
        saveVariations(variations);
        renderVariations(variations, newVariation.id);
        showSaveVariationFeedback(true);
      } catch {
        variations = variations.filter((entry) => entry.id !== newVariation.id);
        showSaveVariationFeedback(false);
      }
    }
  });

  controls.deleteVariation.addEventListener("click", async () => {
    const selectedId = controls.variationSelect.value;
    if (!selectedId) return;
    const selectedVariation = variations.find((entry) => entry.id === selectedId);
    if (!selectedVariation) return;

    const confirmed = window.confirm(
      `Delete variation "${selectedVariation.name}"?\n\nThis action cannot be undone.`
    );
    if (!confirmed) return;

    const verification = window.prompt(
      `Type "${selectedVariation.name}" to permanently delete this variation:`,
      ""
    );
    if (verification === null) return;
    if (verification.trim() !== selectedVariation.name) {
      window.alert("Deletion canceled. Variation name did not match.");
      return;
    }

    try {
      await removeVariationFromCloud(selectedId);
    } catch {
      // If cloud removal fails, still remove from local cache.
    }

    variations = variations.filter((entry) => entry.id !== selectedId);
    saveVariations(variations);
    renderVariations(variations, "");
    controls.variationName.value = "";
    setVariationLastSaved(undefined);
  });

  cssOverlayContent.textContent = buildCssSnippet();
  loadGithubDeployCode();
  setInterval(loadGithubDeployCode, GITHUB_CACHE_REFRESH_MS);
  renderVariations(variations, "");
  syncVariationsFromCloud();
  applyState(loadState());
  syncApplyEffectButtonVisibility();
});
