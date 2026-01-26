import {translationsMap} from './language-picker'  // or wherever it's exported from
import {shareLatestPhoto} from '../myxrextras/mediarecorder/record-button'

const reportComponent = {

  // Colours
  blue: '#264078',
  torquoise: '#00A7AD',
  pink: '#d8006e', 
  yellow: '#fbbc40',
  white: '#ffffff',

  // Bullet Points (initially empty)
  bulletAnswers: {},
  riskLevel: 'B',
  backgroundColour: null,
  _didSendAllAnswers: false,
  // Init
  init() {
    // const reportButton = document.getElementById('report-button')
    const closeButton = document.getElementById('closeButton')
    const saveButton = document.getElementById('report-button')
    const endScreenBack = document.getElementById('end-screen-back')
    const downloadButton = document.getElementById('end-screen-download')

    this.bulletAnswers = {
      Q1: {
        yes: document.getElementById('outdoor-access'),
        // yes: document.getElementById('supervised-access'),
        no: document.getElementById('no-outdoor-access'),
      },
      Q2: {
        yes: document.getElementById('outdoor-pets'),
        no: document.getElementById('no-outdoor-pets'),
      },
      Q3: {
        yes: document.getElementById('balcony-access'),
        no: document.getElementById('no-balcony-access'),
      },
      Q4: {
        weekly: document.getElementById('weekly-hunter'),
        monthly: document.getElementById('sometimes-hunter'),
        rarely: document.getElementById('non-hunter'),
        never: document.getElementById('non-hunter'),
      },
      Q5: {
        yes: document.getElementById('raw-meat'),
        no: document.getElementById('no-raw-meat'),
      },
      Q6: {
        yes: document.getElementById('high-risk'),
        no: document.getElementById('low-risk'),
      },
    }

    endScreenBack.addEventListener('click', () => {
      this.EndScreenBack()
    })

    downloadButton.addEventListener('click', () => {
      shareLatestPhoto()
    })

    saveButton.addEventListener('click', () => {
      this.ShareReport()
    })

    closeButton.addEventListener('click', () => {
      this.CloseReport()
    })

    window.report = this
  },
  async PrepareReport() {
    if (!this.screenshotReady) {
      // 1. Replace <img> with inline SVGs
      // await this.replaceImgSVGsWithInlineSVGs()

      // ❌ No longer converting SVGs to canvas
      // await this.replaceSVGwithCanvas(document.querySelectorAll('svg.injected-svg'))

      this.screenshotReady = true
    }

    await new Promise(resolve => setTimeout(resolve, 50))
    console.log('Screenshot ready')
  },
  async OpenReport() {
    const reportScreen = document.getElementById('report-screen')
    const loadingScreen = document.getElementById('loading-overlay')
    reportScreen.classList.remove('hidden')
    loadingScreen.classList.remove('hidden')

    await new Promise(r => requestAnimationFrame(r))

    // reportScreen.classList.remove('slide-down')
    // reportScreen.classList.add('slide-up')
    const pinch = document.getElementById('pinchContainer')
    pinch.classList.add('hidden')
    this.ConfigureReport()
    await this.PrepareReport()

    loadingScreen.classList.add('hidden')
  },
  CloseReport() {
    const reportScreen = document.getElementById('report-screen')
    // reportScreen.classList.remove('slide-up')
    // reportScreen.classList.add('slide-down')
    reportScreen.classList.add('hidden')

    // Wait for the animation to finish before hiding
    reportScreen.addEventListener('animationend', () => {
      reportScreen.classList.add('hidden')  // Add hidden class after animation ends
    }, {once: true})  // Ensure this only runs once
  },

  // Configure
  ConfigureReport() {
    const name = document.getElementById('report-name')
    const age = document.getElementById('report-age')
    const weight = document.getElementById('report-weight')
    const pregnancy = document.getElementById('report-pregnancy')
    const esccap = document.getElementById('ESCCAP-risk-header')
    const risk = document.getElementById('ESCCAP-risk-text')

    name.textContent = localStorage.getItem('name')
    this.CheckName(name.textContent)

    // safer, compact resolver for 8th Wall code style
    const getLanguage = () => {
      const normalize = c => (c || '').trim().replace('_', '-').toLowerCase()
      let lang = null

      // try localStorage first
      try {
        const stored = normalize(localStorage.getItem('selectedLanguage'))
        if (translationsMap[stored]) lang = stored
        else if (stored.includes('-')) {
          const base = stored.split('-')[0]
          if (translationsMap[base]) lang = base
        }
      } catch (e) {
        console.warn('localStorage unavailable')
      }

      // fallback to html lang
      if (!lang) {
        const htmlLang = normalize(document.documentElement.lang)
        if (translationsMap[htmlLang]) lang = htmlLang
        else if (htmlLang.includes('-')) {
          const base = htmlLang.split('-')[0]
          if (translationsMap[base]) lang = base
        }
      }

      // fallback to navigator
      if (!lang) {
        const navLangs = [...(navigator.languages || []), navigator.language]
        for (const n of navLangs) {
          const norm = normalize(n)
          if (translationsMap[norm]) { lang = norm; break }
          if (norm.includes('-')) {
            const base = norm.split('-')[0]
            if (translationsMap[base]) { lang = base; break }
          }
        }
      }

      // final fallback
      if (!lang) lang = 'en'

      // sync html lang + storage for next time
      document.documentElement.lang = lang
      try { localStorage.setItem('selectedLanguage', lang) } catch {}
      return lang
    }

    const language = getLanguage()
    const translations = translationsMap[language]


    const ageValue = Number(localStorage.getItem('age'))

    // const ageUnit =
    //   ageValue === 1 ? translations.results.ageUnitSingular : translations.results.ageUnitPlural

    // age.textContent = `${translations.results.age}: ${ageValue} ${ageUnit}`

    age.textContent = `Age: ${ageValue}`

    weight.textContent = `Weight: ${localStorage.getItem('weight')} kg`

    if (localStorage.getItem('pregnancy') === 'no') {
      pregnancy.classList.add('hidden-pregnancy')
    }

    const hunt = localStorage.getItem('Q4')

    // household immunosuppressed
    if (localStorage.getItem('Q1') === 'no' && localStorage.getItem('Q2') === 'no' && localStorage.getItem('Q3') === 'no' && localStorage.getItem('Q5') === 'no') {
      this.riskLevel = 'A'
    }

    // hunt regulalry
    if (hunt === 'weekly') {
      this.riskLevel = 'C'
      window.storeData.SaveData('riskLevel', this.riskLevel)
    } else if (hunt === 'monthly' && this.riskLevel === 'A') {
      this.riskLevel = 'B'
    }

    // household immunosuppressed
    if (localStorage.getItem('Q6') === 'yes') {
      this.riskLevel = 'C'
    }

    const displayRiskLevel = this.riskLevel === 'C' ? 'B' : this.riskLevel
    esccap.textContent += ` ${displayRiskLevel}`
    
    switch (this.riskLevel) {
      case 'A':
        this.ChangeTheme(this.torquoise)
        risk.textContent = (`${translations.results.risks[0]}`)
        localStorage.setItem('riskLevel', 'Lower')
        console.log('riskLevel: Lower')
        break
      case 'B':
        this.ChangeTheme(this.pink)
        risk.textContent = (`${translations.results.risks[1]}`)
        localStorage.setItem('riskLevel', 'Moderate')
        console.log('riskLevel: Moderate')
        break
      case 'C':
        this.ChangeTheme(this.yellow)
        risk.textContent = (`${translations.results.risks[2]}`)
        localStorage.setItem('riskLevel', 'Higher')
        console.log('riskLevel: Higher')
        break
      default:
        console.log("Invalid choice.")
    }

    const level = localStorage.getItem('riskLevel')
    console.log('Level:', level)

    // —— Call exactly once ——
    // if (!this._didSendAllAnswers && !localStorage.getItem('answers_sent')) {
    //   window.storeData.SendAnswers(true)
    // }

    Object.entries(this.bulletAnswers).forEach(([key]) => {
      const value = localStorage.getItem(key)
      this.ToggleElements(key, value)
    })
  },

  // Check Name Length
  CheckName(name) {
    const catNameElement = document.querySelector('.results_cat-name')
    console.log("Name Check")
    console.log("Name Length: " + name.length)
    // Adjust font size based on length
    if (name.length > 6) {
      catNameElement.style.fontSize = '1.5rem'  // Scale down for longer names
      console.log("Font: " + catNameElement.fontSize)
    } else {
      catNameElement.style.fontSize = '2rem'  // Default size for shorter names
      console.log("Font: " + catNameElement.fontSize)
    }
  },
  // Change Theme
  ChangeTheme(background) {
    const ears = document.querySelector('.results_content-ears')
    // console.log(ears)
    // const wrap = document.querySelector('.report-wrap')
    // console.log(wrap)
    const content = document.querySelector('.results_content-component')
    const wrap = document.querySelector('.results_content-wrap')
    
    const profile = document.getElementById('profile-heading')
    // console.log(content)
    const eyebrow = document.querySelector('.results_content-name-eyebrow')

    const name = document.getElementById('report-name')
    const age = document.getElementById('report-age')
    const weight = document.getElementById('report-weight')

    // const grade = document.getElementById('ESCCAP-risk-grade')
    const risk = document.getElementById('ESCCAP-risk-text')
    const riskBG = document.getElementById('ESCCAP-risk-container')

    this.backgroundColour = background

    riskBG.style.background = background
    ears.style.color = background
    content.style.backgroundColor = background

    if (background === this.pink) {
      name.style.color = this.white
      profile.style.color = this.white
      age.style.color = this.blue
      weight.style.color = this.blue
      risk.style.color = this.white
    } else if (background === this.torquoise) {
      name.style.color = this.white
      profile.style.color = this.white
      age.style.color = this.blue
      weight.style.color = this.blue
      risk.style.color = this.white
    } else if (background === this.yellow) {
      name.style.color = this.blue
      profile.style.color = this.blue
      age.style.color = this.blue
      weight.style.color = this.blue
      risk.style.color = this.blue
    }
  },

  // Toggle bullet points
  ToggleElements(questionType, response) {
    const questionElements = this.bulletAnswers[questionType]
    // console.log(questionElements)
    if (questionElements[response]) {
      questionElements[response].classList.add('active')
      console.log(questionElements[response])
    }
    else {
      console.log(questionElements[response])
    }
  },
  drawCoverImage(ctx, img, canvasWidth, canvasHeight) {
    const scaleFactor = canvasWidth / img.naturalWidth
    const drawWidth = canvasWidth
    const drawHeight = img.naturalHeight * scaleFactor
    const offsetX = 0
    const offsetY = -drawHeight / 8

    ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight)
  },
  async ShareReport() {
    const target = document.getElementById('report-card')
    const previewDiv = document.getElementById('small-preview')
    const loadingScreen = document.getElementById('loading-overlay')

    const wrap = document.querySelector('.results_content-wrap')
    wrap.style.backgroundColor = '#ffffff'

    loadingScreen.classList.remove('hidden')

    // 🛠 Ensure layout is not clipped
    target.style.height = 'auto'
    target.style.width = '75vw'
    target.style.overflow = 'visible'

    const bgUrl = getComputedStyle(previewDiv).backgroundImage
      .replace(/^url\(["']?/, '')
      .replace(/["']?\)$/, '')

    // Load the high-res image
    const img = new Image()
    img.src = bgUrl
    img.crossOrigin = 'anonymous'
    await new Promise((resolve, reject) => {
      if (img.complete) {
        // Defer to next frame so the overlay can paint
        requestAnimationFrame(resolve);
      } else {
        img.onload = () => requestAnimationFrame(resolve);
        img.onerror = reject
      }
    })

    // ⏳ Force layout to settle before measuring
    await new Promise(r => requestAnimationFrame(r))

    // 📏 Use precise rendered dimensions
    const width = previewDiv.offsetWidth
    const height = previewDiv.offsetHeight
    const scale = window.devicePixelRatio * 3

    const canvasOverlay = document.createElement('canvas')
    canvasOverlay.width = width * scale
    canvasOverlay.height = height * scale
    canvasOverlay.style.width = `100%`
    canvasOverlay.style.height = `${height}px`
    canvasOverlay.style.position = 'absolute'
    canvasOverlay.style.inset = '0'
    canvasOverlay.style.zIndex = '0'
    canvasOverlay.style.pointerEvents = 'none'

    // 🧪 Debug visuals
    // canvasOverlay.style.border = '2px dashed red'
    // canvasOverlay.style.background = 'rgba(255, 0, 0, 0.05)'
    // previewDiv.style.border = '2px solid lime'

    // 🔧 Temporarily remove clipping to diagnose
    canvasOverlay.style.borderRadius = '0'
    previewDiv.style.borderRadius = '0'
    previewDiv.style.overflow = 'visible'

    // 🖌️ Draw image using your drawCoverImage logic
    const ctx = canvasOverlay.getContext('2d')
    ctx.imageSmoothingEnabled = true
    this.drawCoverImage(ctx, img, canvasOverlay.width, canvasOverlay.height)

    // 🧩 Attach canvas over preview
    previewDiv.style.position = 'relative'
    previewDiv.style.backgroundImage = 'none'
    previewDiv.appendChild(canvasOverlay)

    // 📸 Capture screenshot
    const canvas = await html2canvas(target, {
      scale,
      useCORS: true,
      backgroundColor: this.backgroundColour || '#fbbc40',
    })

    // 🧹 Clean up overlay
    previewDiv.removeChild(canvasOverlay)
    previewDiv.style.backgroundImage = `url(${bgUrl})`

    // 🗃️ Save or share the canvas output
    // Export + track generate/share/download
    canvas.toBlob(async blob => {
      if (!blob) {
        console.error('Failed to generate blob')
        return
      }

      const fileName = 'report-screenshot.png'
      const file = new File([blob], fileName, { type: 'image/png'})
      const sizeKb = Math.round(blob.size / 1024)

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: 'Cat Report',
            text: 'Check out my cat’s parasite risk profile',
            files: [file],
          })
        } catch (err) {
          // User cancelled or share not available — do nothing analytics-wise
          // Optional: fallback to download on failure
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = fileName
          document.body.appendChild(a)
          a.click()
          a.remove()
          URL.revokeObjectURL(url)
        }
      } else {
        // Fallback: force a real download (better signal than window.open)
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = fileName
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)
      }
    })

    loadingScreen.classList.add('hidden')

    // ✅ Layout comparison log
    console.log('Canvas vs Preview:', {
      previewOffsetWidth: previewDiv.offsetWidth,
      previewClientWidth: previewDiv.clientWidth,
      canvasPixelWidth: canvasOverlay.width,
      canvasPixelHeight: canvasOverlay.height,
      unscaledCanvas: {
        width: canvasOverlay.width / scale,
        height: canvasOverlay.height / scale
      }
    })
    this.EndScreen()
  },
  EndScreen() {
    this.CloseReport()
    const endScreen = document.getElementById('end-screen')
    endScreen.classList.remove('hidden')
    window.storeData.TrackStep('end')
    window.storeData.SendAnswers()
  },
  EndScreenBack() {
    const endScreen = document.getElementById('end-screen')
    endScreen.classList.add('hidden')
    this.OpenReport()
  },
}

export {reportComponent}
