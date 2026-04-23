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

  const controls = {
    text: document.querySelector("#text-control"),
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
    copyCss: document.querySelector("#copy-css-button"),
    downloadCss: document.querySelector("#download-css-button"),
    reset: document.querySelector("#reset-button"),
  };

  const valueLabels = {
    width: document.querySelector("#width-value"),
    height: document.querySelector("#height-value"),
    radius: document.querySelector("#radius-value"),
    fontSize: document.querySelector("#font-size-value"),
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
    borderGlow: false,
    borderGlowColor: "#ffffff",
    matchBorderGlowColor: true,
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
  };

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
    borderGlow: controls.borderGlow.checked,
    borderGlowColor: controls.borderGlowColor.value,
    matchBorderGlowColor: controls.matchBorderGlowColor.checked,
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
  });

  const saveState = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(getStateFromControls()));
    cssOverlayContent.textContent = buildCssSnippet();
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
    button.style.setProperty("--border-glow-size", `${state.borderGlowSize}px`);
    button.style.setProperty("--border-thickness", `${state.borderThickness}px`);
    button.classList.toggle("border-glow-enabled", Boolean(state.borderGlow));
    setMatchBorderGlowColorDisabledState(!state.borderGlow);
    setBorderGlowColorDisabledState(!state.borderGlow || controls.matchBorderGlowColor.checked);
    setBorderGlowSizeDisabledState(!state.borderGlow);
    document.body.style.backgroundColor = state.pageBg;
    syncShapeLayout();

    valueLabels.width.textContent = String(state.width);
    valueLabels.height.textContent = String(state.height);
    valueLabels.radius.textContent = String(state.radius);
    valueLabels.fontSize.textContent = String(state.fontSize);
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
        borderGlow: Boolean(saved.borderGlow),
        borderGlowColor:
          typeof saved.borderGlowColor === "string"
            ? saved.borderGlowColor
            : defaults.borderGlowColor,
        matchBorderGlowColor:
          typeof saved.matchBorderGlowColor === "boolean"
            ? saved.matchBorderGlowColor
            : defaults.matchBorderGlowColor,
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
      };
    } catch {
      return defaults;
    }
  };

  let speedMultiplier = Number(controls.speed.value);
  let angle = 0;
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
    document.body.style.backgroundColor = controls.pageBg.value;
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
    if (controls.hugText.checked || controls.shape.value === "circle") return;
    const value = controls.width.value;
    button.style.setProperty("--btn-width", `${value}px`);
    valueLabels.width.textContent = value;
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

  const rotateGradient = () => {
    angle = (angle + speedMultiplier) % 360;
    button.style.setProperty("--gradient-angle", `${angle}deg`);
    requestAnimationFrame(rotateGradient);
  };

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

    return `.custom-glow-button {
  --c: ${controls.bg.value};
  --text-font: "${fontSettings.family}";
  --text-weight: ${fontSettings.weight};
  --icon-color: ${controls.iconColor.value};
  --side-padding: ${controls.sidePadding.value}px;
  --icon-gap: ${controls.iconGap.value}px;
  --text-size: ${controls.fontSize.value}px;
  --hover-lift: ${controls.hoverLift.value}px;
  --hover-scale: ${Number(controls.hoverScale.value).toFixed(2)};
  --pressed-depth: ${controls.pressedDepth.value}px;
  --pressed-scale: ${Number(controls.pressedScale.value).toFixed(2)};
  --pressed-opacity: ${Number(controls.pressedOpacity.value).toFixed(2)};
  --p: ${controls.glowSize.value}%;
  --glow-color: ${controls.glowColor.value};
  --text-color: ${controls.textColor.value};
  --border-thickness: ${controls.borderThickness.value}px;
  --btn-width: ${controls.shape.value === "circle" ? controls.height.value : controls.width.value}px;
  --btn-height: ${controls.height.value}px;
  --btn-radius: ${radiusCss};
${widthCss}
  height: var(--btn-height);
  padding-inline: var(--side-padding);
  color: var(--text-color);
  font-size: var(--text-size);
  font-family: var(--text-font), sans-serif;
  font-weight: var(--text-weight);
  border: var(--border-thickness) solid transparent;
  border-radius: var(--btn-radius);
  background: linear-gradient(var(--c), var(--c)) padding-box,
    conic-gradient(
      from var(--gradient-angle, 0deg),
      transparent,
      var(--glow-color) var(--p),
      transparent calc(var(--p) * 2)
    ) border-box;${borderGlowCss}
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
  transform: translateY(calc(-1 * var(--hover-lift))) scale(var(--hover-scale));
}

.custom-glow-button:active {
  transform: translateY(var(--pressed-depth)) scale(var(--pressed-scale));
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

  controls.toggleCssOverlay.addEventListener("click", () => {
    const isVisible = cssOverlay.classList.toggle("visible");
    previewArea.classList.toggle("css-overlay-open", isVisible);
    cssOverlay.setAttribute("aria-hidden", String(!isVisible));
    controls.toggleCssOverlay.textContent = isVisible ? "Hide CSS" : "Show CSS";
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

  controls.reset.addEventListener("click", () => {
    localStorage.removeItem(STORAGE_KEY);
    applyState(defaults);
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
      return;
    } catch {
      if (existing) {
        saveVariations(variations);
        renderVariations(variations, existing.id);
        return;
      }

      const newVariation = {
        id: crypto.randomUUID(),
        name: trimmedName,
        updatedAt: now,
        state: snapshot,
      };
      variations.push(newVariation);
      saveVariations(variations);
      renderVariations(variations, newVariation.id);
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
  rotateGradient();
});
