import translationsEnglish from '../translations/CatCheck_Copy_English.json'
import translationsFrench from '../translations/CatCheck_Copy_French.json'
import translationsItalian from '../translations/CatCheck_Copy_Italian.json'
import translationsSpanish from '../translations/CatCheck_Copy_Spanish.json'
import translationsGerman from '../translations/CatCheck_Copy_German.json'
import translationsPortuguese from '../translations/CatCheck_Copy_Portuguese.json'
import translationsPolish from '../translations/CatCheck_Copy_Polish.json'
import translationsDutch from '../translations/CatCheck_Copy_Dutch.json'
import translationsCzech from '../translations/CatCheck_Copy_Czech.json'
import translationsSlovak from '../translations/CatCheck_Copy_Slovak.json'

// XR Extras capture configurator
import {configure} from '../myxrextras/mediarecorder/capture-config.js'

// Centralized translation mapping
const translationsMap = {
  en: translationsEnglish,
  fr: translationsFrench,
  it: translationsItalian,
  es: translationsSpanish,
  de: translationsGerman,
  pt: translationsPortuguese,
  pl: translationsPolish,
  nl: translationsDutch,
  cs: translationsCzech,
  sk: translationsSlovak,
}

const languagePicker = {
  init() {
    this.picker = document.querySelector('.js-language-picker')
    this.select = document.getElementById('language-picker-select')
    this.i18nElements = [...document.querySelectorAll('[data-i18n]')]

    const userLanguage = navigator.language || navigator.userLanguage || 'en'
    const storedLang = localStorage.getItem('selectedLanguage')

    // Normalize to base code (e.g., "en-GB" -> "en")
    const defaultLang = (storedLang || userLanguage).split('-')[0].toLowerCase()

    if (this.select) {
      this.select.value = defaultLang
    }

    // Apply on load
    this.updateLanguage(defaultLang)

    // Listen for picker changes
    if (this.select) {
      this.select.addEventListener('change', (event) => {
        const selectedLang = (event.target.value || 'en').split('-')[0].toLowerCase()
        localStorage.setItem('selectedLanguage', selectedLang)
        this.updateLanguage(selectedLang)
      })
    }
  },

  updateLanguage(language) {
    const base = (language || 'en').split('-')[0].toLowerCase()
    console.log(`Language changed to: ${base}`)

    // Keep <html lang=".."> in sync (enables :lang CSS, etc.)
    document.documentElement.lang = base

    // Update copy & graphics
    this.replaceText(base)
    this.updateTranslatedSVGs(base)

    // Update capture watermark
    // this.setWatermarkForLanguage(base)

    // Notify questionnaire for FR parasite toggle, etc.
    if (window.questions?.loadFacts) {
      window.questions.loadFacts(base)
    } else {
      console.warn('window.questions.loadFacts is not available.')
    }
  },

  setWatermarkForLanguage(lang) {
    const isFR = (lang || '').toLowerCase().startsWith('fr')
    const basePath = 'assets/UI/Felpreva'
    configure({
      watermarkImageUrl: isFR ? `${basePath}/French_Frame.svg` : `${basePath}/Frame.svg`,
      // Optional: localize file prefix if you want
      // fileNamePrefix: isFR ? 'felpreva-fr' : 'felpreva',
    })
  },

  replaceText(language) {
    const translations = translationsMap[language] || translationsMap['en']
    const catName = localStorage.getItem('name') || 'Unknown Cat'

    this.i18nElements.forEach((element) => {
      const key = element.getAttribute('data-i18n')
      let text = this.getTranslation(key, translations)

      const isMissing = (typeof text === 'string') && text.startsWith('MISSING:')
      if (isMissing) {
        element.style.display = 'none'
      } else {
        if (typeof text === 'string') {
          text = text.replace(/\[CAT NAME\]/g, `<span style="color:#d8006e" id="cat-name">${catName}</span>`)
        }
        element.innerHTML = text
        element.style.display = '' // unhide if previously hidden
      }
    })

    // Update placeholders for inputs
    const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]')
    placeholderElements.forEach((element) => {
      const key = element.getAttribute('data-i18n-placeholder')
      let text = this.getTranslation(key, translations)
      const isMissing = (typeof text === 'string') && text.startsWith('MISSING:')
      element.placeholder = isMissing ? '' : String(text).replace(/\[CAT NAME\]/g, catName)
    })
  },

  getTranslation(key, translations) {
    return key.split('.').reduce((obj, keyPart) => {
      if (!obj) return null
      const match = keyPart.match(/^([^\[]+)\[(\d+)]$/)
      if (match) {
        const arrayKey = match[1]
        const index = parseInt(match[2], 10)
        return Array.isArray(obj[arrayKey]) ? obj[arrayKey][index] : `MISSING: ${key}`
      }
      return obj[keyPart]
    }, translations) || `MISSING: ${key}`
  },

  updateTranslatedSVGs(language) {
    const base = (language || 'en').split('-')[0].toLowerCase()
    const allGraphics = document.querySelectorAll('[data-graphic]')

    // group by data-graphic
    const grouped = {}
    allGraphics.forEach(el => {
      const key = el.getAttribute('data-graphic')
      ;(grouped[key] ||= []).push(el)
    })

    // For each group, hide all and show only the ones matching base or 'all'
    Object.values(grouped).forEach(group => {
      group.forEach(el => {
        const langAttr = (el.getAttribute('data-lang') || '').toLowerCase()
        const langs = langAttr.split(/[\s,]+/).filter(Boolean)
        const show = langs.includes(base) || langs.includes('all')
        el.classList.toggle('hidden', !show)
      })
    })

    console.log(`✅ SVG graphics updated for language: ${base}`)
  },
}

// XR8 pipeline bootstrap
if (window.XR8) {
  XR8.addCameraPipelineModule({
    name: 'language-picker-init',
    onStart() {
      if (!window.languagePickerInitialized) {
        window.languagePickerInitialized = true
        languagePicker.init()
      }
    },
  })
}

export { languagePicker, translationsMap }
