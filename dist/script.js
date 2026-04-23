document.addEventListener('DOMContentLoaded', () => {
  const button = document.querySelector('#glow-button')
  const previewArea = document.querySelector('.preview-area')
  const cssOverlay = document.querySelector('#css-overlay')
  const cssOverlayContent = document.querySelector('#css-overlay-content')
  const STORAGE_KEY = 'glow-button-controls-v1'
  const VARIATIONS_KEY = 'glow-button-variations-v1'

  const controls = {
    text: document.querySelector('#text-control'),
    bg: document.querySelector('#bg-control'),
    pageBg: document.querySelector('#page-bg-control'),
    glowColor: document.querySelector('#glow-color-control'),
    borderGlow: document.querySelector('#border-glow-control'),
    borderGlowColor: document.querySelector('#border-glow-color-control'),
    matchBorderGlowColor: document.querySelector(
      '#match-border-glow-color-control',
    ),
    borderGlowSize: document.querySelector('#border-glow-size-control'),
    borderThickness: document.querySelector('#border-thickness-control'),
    hugText: document.querySelector('#hug-text-control'),
    width: document.querySelector('#width-control'),
    height: document.querySelector('#height-control'),
    radius: document.querySelector('#radius-control'),
    glowSize: document.querySelector('#glow-size-control'),
    speed: document.querySelector('#speed-control'),
    variationSelect: document.querySelector('#variation-select'),
    saveVariation: document.querySelector('#save-variation-button'),
    deleteVariation: document.querySelector('#delete-variation-button'),
    toggleCssOverlay: document.querySelector('#toggle-css-overlay-button'),
    copyCss: document.querySelector('#copy-css-button'),
    downloadCss: document.querySelector('#download-css-button'),
    reset: document.querySelector('#reset-button'),
  }

  const valueLabels = {
    width: document.querySelector('#width-value'),
    height: document.querySelector('#height-value'),
    radius: document.querySelector('#radius-value'),
    borderGlowSize: document.querySelector('#border-glow-size-value'),
    borderThickness: document.querySelector('#border-thickness-value'),
    glowSize: document.querySelector('#glow-size-value'),
    speed: document.querySelector('#speed-value'),
  }
  const controlGroups = {
    borderGlowColor: document.querySelector('#border-glow-color-group'),
    matchBorderGlowColor: document.querySelector(
      '#match-border-glow-color-group',
    ),
    borderGlowSize: document.querySelector('#border-glow-size-group'),
    width: document.querySelector('#width-control-group'),
  }

  const setBorderGlowColorDisabledState = (isDisabled) => {
    controls.borderGlowColor.disabled = isDisabled
    controlGroups.borderGlowColor.classList.toggle('is-disabled', isDisabled)
  }

  const setMatchBorderGlowColorDisabledState = (isDisabled) => {
    controls.matchBorderGlowColor.disabled = isDisabled
    controlGroups.matchBorderGlowColor.classList.toggle(
      'is-disabled',
      isDisabled,
    )
  }

  const setBorderGlowSizeDisabledState = (isDisabled) => {
    controls.borderGlowSize.disabled = isDisabled
    controlGroups.borderGlowSize.classList.toggle('is-disabled', isDisabled)
  }

  const setWidthDisabledState = (isDisabled) => {
    controls.width.disabled = isDisabled
    controlGroups.width.classList.toggle('is-disabled', isDisabled)
  }

  const defaults = {
    text: 'WHY CHOOSE US',
    bg: '#171717',
    pageBg: '#171717',
    glowColor: '#ffffff',
    borderGlow: false,
    borderGlowColor: '#ffffff',
    matchBorderGlowColor: true,
    borderGlowSize: 18,
    borderThickness: 1,
    hugText: false,
    width: 250,
    height: 80,
    radius: 48,
    glowSize: 10,
    speed: 1,
  }

  const getStateFromControls = () => ({
    text: controls.text.value,
    bg: controls.bg.value,
    pageBg: controls.pageBg.value,
    glowColor: controls.glowColor.value,
    borderGlow: controls.borderGlow.checked,
    borderGlowColor: controls.borderGlowColor.value,
    matchBorderGlowColor: controls.matchBorderGlowColor.checked,
    borderGlowSize: Number(controls.borderGlowSize.value),
    borderThickness: Number(controls.borderThickness.value),
    hugText: controls.hugText.checked,
    width: Number(controls.width.value),
    height: Number(controls.height.value),
    radius: Number(controls.radius.value),
    glowSize: Number(controls.glowSize.value),
    speed: Number(controls.speed.value),
  })

  const saveState = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(getStateFromControls()))
    cssOverlayContent.textContent = buildCssSnippet()
  }

  const loadVariations = () => {
    try {
      const parsed = JSON.parse(localStorage.getItem(VARIATIONS_KEY) || '[]')
      if (!Array.isArray(parsed)) return []
      return parsed.filter(
        (item) =>
          item &&
          typeof item.id === 'string' &&
          typeof item.name === 'string' &&
          item.state &&
          typeof item.state === 'object',
      )
    } catch {
      return []
    }
  }

  const saveVariations = (variations) => {
    localStorage.setItem(VARIATIONS_KEY, JSON.stringify(variations))
  }

  const renderVariations = (variations, selectedId = '') => {
    controls.variationSelect.innerHTML = ''
    const placeholder = document.createElement('option')
    placeholder.value = ''
    placeholder.textContent = 'Select variation...'
    controls.variationSelect.appendChild(placeholder)

    for (const variation of variations) {
      const option = document.createElement('option')
      option.value = variation.id
      option.textContent = variation.name
      controls.variationSelect.appendChild(option)
    }

    controls.variationSelect.value = selectedId
    controls.deleteVariation.disabled = !selectedId
  }

  const applyState = (state) => {
    controls.text.value = state.text
    controls.bg.value = state.bg
    controls.pageBg.value = state.pageBg
    controls.glowColor.value = state.glowColor
    controls.borderGlow.checked = Boolean(state.borderGlow)
    controls.matchBorderGlowColor.checked = Boolean(state.matchBorderGlowColor)
    controls.borderGlowColor.value = controls.matchBorderGlowColor.checked
      ? state.glowColor
      : state.borderGlowColor
    controls.borderGlowSize.value = String(state.borderGlowSize)
    controls.borderThickness.value = String(state.borderThickness)
    controls.hugText.checked = Boolean(state.hugText)
    controls.width.value = String(state.width)
    controls.height.value = String(state.height)
    controls.radius.value = String(state.radius)
    controls.glowSize.value = String(state.glowSize)
    controls.speed.value = String(state.speed)

    button.textContent = state.text || ' '
    button.style.setProperty('--c', state.bg)
    button.style.setProperty('--glow-color', state.glowColor)
    button.style.setProperty('--btn-width', `${state.width}px`)
    button.style.setProperty('--btn-height', `${state.height}px`)
    button.style.setProperty('--btn-radius', `${state.radius}px`)
    button.style.setProperty('--p', `${state.glowSize}%`)
    const resolvedBorderGlowColor = controls.matchBorderGlowColor.checked
      ? state.glowColor
      : state.borderGlowColor
    button.style.setProperty('--border-glow-color', resolvedBorderGlowColor)
    button.style.setProperty('--border-glow-size', `${state.borderGlowSize}px`)
    button.style.setProperty('--border-thickness', `${state.borderThickness}px`)
    button.classList.toggle('border-glow-enabled', Boolean(state.borderGlow))
    setMatchBorderGlowColorDisabledState(!state.borderGlow)
    setBorderGlowColorDisabledState(
      !state.borderGlow || controls.matchBorderGlowColor.checked,
    )
    setBorderGlowSizeDisabledState(!state.borderGlow)
    document.body.style.backgroundColor = state.pageBg
    setWidthDisabledState(Boolean(state.hugText))
    if (state.hugText) {
      button.style.width = 'fit-content'
      button.style.paddingInline = '1.8rem'
    } else {
      button.style.width = ''
      button.style.paddingInline = ''
    }

    valueLabels.width.textContent = String(state.width)
    valueLabels.height.textContent = String(state.height)
    valueLabels.radius.textContent = String(state.radius)
    valueLabels.borderGlowSize.textContent = String(state.borderGlowSize)
    valueLabels.borderThickness.textContent = String(state.borderThickness)
    valueLabels.glowSize.textContent = String(state.glowSize)
    valueLabels.speed.textContent = Number(state.speed).toFixed(1)
    speedMultiplier = Number(state.speed)
  }

  const loadState = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
      if (!saved || typeof saved !== 'object') {
        return defaults
      }

      return {
        text: typeof saved.text === 'string' ? saved.text : defaults.text,
        bg: typeof saved.bg === 'string' ? saved.bg : defaults.bg,
        pageBg:
          typeof saved.pageBg === 'string' ? saved.pageBg : defaults.pageBg,
        glowColor:
          typeof saved.glowColor === 'string'
            ? saved.glowColor
            : defaults.glowColor,
        borderGlow: Boolean(saved.borderGlow),
        borderGlowColor:
          typeof saved.borderGlowColor === 'string'
            ? saved.borderGlowColor
            : defaults.borderGlowColor,
        matchBorderGlowColor:
          typeof saved.matchBorderGlowColor === 'boolean'
            ? saved.matchBorderGlowColor
            : defaults.matchBorderGlowColor,
        borderGlowSize: Number.isFinite(Number(saved.borderGlowSize))
          ? Number(saved.borderGlowSize)
          : defaults.borderGlowSize,
        borderThickness: Number.isFinite(Number(saved.borderThickness))
          ? Number(saved.borderThickness)
          : defaults.borderThickness,
        hugText: Boolean(saved.hugText),
        width: Number.isFinite(Number(saved.width))
          ? Number(saved.width)
          : defaults.width,
        height: Number.isFinite(Number(saved.height))
          ? Number(saved.height)
          : defaults.height,
        radius: Number.isFinite(Number(saved.radius))
          ? Number(saved.radius)
          : defaults.radius,
        glowSize: Number.isFinite(Number(saved.glowSize))
          ? Number(saved.glowSize)
          : defaults.glowSize,
        speed: Number.isFinite(Number(saved.speed))
          ? Number(saved.speed)
          : defaults.speed,
      }
    } catch {
      return defaults
    }
  }

  let speedMultiplier = Number(controls.speed.value)
  let angle = 0
  let variations = loadVariations()

  controls.text.addEventListener('input', () => {
    button.textContent = controls.text.value || ' '
    saveState()
  })

  controls.bg.addEventListener('input', () => {
    button.style.setProperty('--c', controls.bg.value)
    // Button and page backgrounds are intentionally independent.
    saveState()
  })

  controls.pageBg.addEventListener('input', () => {
    document.body.style.backgroundColor = controls.pageBg.value
    saveState()
  })

  controls.glowColor.addEventListener('input', () => {
    button.style.setProperty('--glow-color', controls.glowColor.value)
    if (controls.matchBorderGlowColor.checked) {
      controls.borderGlowColor.value = controls.glowColor.value
      button.style.setProperty('--border-glow-color', controls.glowColor.value)
    }
    saveState()
  })

  controls.borderGlow.addEventListener('change', () => {
    button.classList.toggle('border-glow-enabled', controls.borderGlow.checked)
    setMatchBorderGlowColorDisabledState(!controls.borderGlow.checked)
    setBorderGlowColorDisabledState(
      !controls.borderGlow.checked || controls.matchBorderGlowColor.checked,
    )
    setBorderGlowSizeDisabledState(!controls.borderGlow.checked)
    saveState()
  })

  controls.borderGlowColor.addEventListener('input', () => {
    button.style.setProperty(
      '--border-glow-color',
      controls.borderGlowColor.value,
    )
    saveState()
  })

  controls.matchBorderGlowColor.addEventListener('change', () => {
    setBorderGlowColorDisabledState(
      !controls.borderGlow.checked || controls.matchBorderGlowColor.checked,
    )
    if (controls.matchBorderGlowColor.checked) {
      controls.borderGlowColor.value = controls.glowColor.value
      button.style.setProperty('--border-glow-color', controls.glowColor.value)
    } else {
      button.style.setProperty(
        '--border-glow-color',
        controls.borderGlowColor.value,
      )
    }
    saveState()
  })

  controls.borderGlowSize.addEventListener('input', () => {
    const value = controls.borderGlowSize.value
    button.style.setProperty('--border-glow-size', `${value}px`)
    valueLabels.borderGlowSize.textContent = value
    saveState()
  })

  controls.borderThickness.addEventListener('input', () => {
    const value = controls.borderThickness.value
    button.style.setProperty('--border-thickness', `${value}px`)
    valueLabels.borderThickness.textContent = value
    saveState()
  })

  controls.hugText.addEventListener('change', () => {
    setWidthDisabledState(controls.hugText.checked)
    if (controls.hugText.checked) {
      button.style.width = 'fit-content'
      button.style.paddingInline = '1.8rem'
    } else {
      button.style.width = ''
      button.style.paddingInline = ''
      button.style.setProperty('--btn-width', `${controls.width.value}px`)
    }
    saveState()
  })

  controls.width.addEventListener('input', () => {
    if (controls.hugText.checked) return
    const value = controls.width.value
    button.style.setProperty('--btn-width', `${value}px`)
    valueLabels.width.textContent = value
    saveState()
  })

  controls.height.addEventListener('input', () => {
    const value = controls.height.value
    button.style.setProperty('--btn-height', `${value}px`)
    valueLabels.height.textContent = value
    saveState()
  })

  controls.radius.addEventListener('input', () => {
    const value = controls.radius.value
    button.style.setProperty('--btn-radius', `${value}px`)
    valueLabels.radius.textContent = value
    saveState()
  })

  controls.glowSize.addEventListener('input', () => {
    const value = controls.glowSize.value
    button.style.setProperty('--p', `${value}%`)
    valueLabels.glowSize.textContent = value
    saveState()
  })

  controls.speed.addEventListener('input', () => {
    speedMultiplier = Number(controls.speed.value)
    valueLabels.speed.textContent = speedMultiplier.toFixed(1)
    saveState()
  })

  const rotateGradient = () => {
    angle = (angle + speedMultiplier) % 360
    button.style.setProperty('--gradient-angle', `${angle}deg`)
    requestAnimationFrame(rotateGradient)
  }

  const buildCssSnippet = () => {
    const widthCss = controls.hugText.checked
      ? '  width: fit-content;\n  padding-inline: 1.8rem;'
      : '  width: var(--btn-width);'
    const exportBorderGlowColor = controls.matchBorderGlowColor.checked
      ? 'var(--glow-color)'
      : controls.borderGlowColor.value
    const borderGlowCss = controls.borderGlow.checked
      ? `\n  --border-glow-color: ${exportBorderGlowColor};\n  --border-glow-size: ${controls.borderGlowSize.value}px;\n  box-shadow: 0 0 var(--border-glow-size) color-mix(in srgb, var(--border-glow-color) 75%, transparent);`
      : ''

    return `.custom-glow-button {
  --c: ${controls.bg.value};
  --p: ${controls.glowSize.value}%;
  --glow-color: ${controls.glowColor.value};
  --border-thickness: ${controls.borderThickness.value}px;
  --btn-width: ${controls.width.value}px;
  --btn-height: ${controls.height.value}px;
  --btn-radius: ${controls.radius.value}px;
${widthCss}
  height: var(--btn-height);
  color: white;
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
}`
  }

  controls.copyCss.addEventListener('click', async () => {
    const originalLabel = controls.copyCss.textContent

    try {
      await navigator.clipboard.writeText(buildCssSnippet())
      controls.copyCss.textContent = 'Copied!'
    } catch (error) {
      controls.copyCss.textContent = 'Copy failed'
    }

    setTimeout(() => {
      controls.copyCss.textContent = originalLabel
    }, 1200)
  })

  controls.toggleCssOverlay.addEventListener('click', () => {
    const isVisible = cssOverlay.classList.toggle('visible')
    previewArea.classList.toggle('css-overlay-open', isVisible)
    cssOverlay.setAttribute('aria-hidden', String(!isVisible))
    controls.toggleCssOverlay.textContent = isVisible ? 'Hide CSS' : 'Show CSS'
  })

  controls.downloadCss.addEventListener('click', () => {
    const cssText = buildCssSnippet()
    const blob = new Blob([cssText], { type: 'text/css;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'custom-glow-button.css'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  })

  controls.reset.addEventListener('click', () => {
    localStorage.removeItem(STORAGE_KEY)
    applyState(defaults)
  })

  controls.variationSelect.addEventListener('change', () => {
    const selectedId = controls.variationSelect.value
    controls.deleteVariation.disabled = !selectedId
    if (!selectedId) return

    const selectedVariation = variations.find(
      (entry) => entry.id === selectedId,
    )
    if (!selectedVariation) return
    applyState(selectedVariation.state)
    saveState()
  })

  controls.saveVariation.addEventListener('click', () => {
    const suggestedName = controls.variationSelect.value
      ? variations.find((entry) => entry.id === controls.variationSelect.value)
          ?.name || ''
      : ''
    const name = window.prompt('Variation name:', suggestedName)
    if (!name) return

    const trimmedName = name.trim()
    if (!trimmedName) return
    const existing = variations.find(
      (entry) => entry.name.toLowerCase() === trimmedName.toLowerCase(),
    )
    const snapshot = getStateFromControls()

    if (existing) {
      existing.state = snapshot
      existing.name = trimmedName
      saveVariations(variations)
      renderVariations(variations, existing.id)
      return
    }

    const newVariation = {
      id: crypto.randomUUID(),
      name: trimmedName,
      state: snapshot,
    }
    variations.push(newVariation)
    saveVariations(variations)
    renderVariations(variations, newVariation.id)
  })

  controls.deleteVariation.addEventListener('click', () => {
    const selectedId = controls.variationSelect.value
    if (!selectedId) return
    variations = variations.filter((entry) => entry.id !== selectedId)
    saveVariations(variations)
    renderVariations(variations, '')
  })

  cssOverlayContent.textContent = buildCssSnippet()
  renderVariations(variations, '')
  applyState(loadState())
  rotateGradient()
})
