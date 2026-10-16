import qrcode from './vendor/qrcode-generator'

// Rotate / incompatible-device overlay (#rotatedScreen).
//
//   'rotate'  - compatible phone: overlay only shows in landscape, asking the
//               user to rotate back to portrait.
//   'qr'      - desktop / laptop: overlay always shows, with a QR code that
//               opens this same URL (incl. query params) on a phone.
//   'browser' - phone/tablet that can't run the AR, usually an in-app browser
//               (Instagram, Facebook...): overlay always shows, asking the user
//               to open the link in Safari / Chrome, with a copy-link button.
//
// A quick touch check picks the mode straight away so desktop never flashes
// "rotate your screen"; it's then confirmed with 8th Wall once XR8 loads.
// The scene itself allows any device, so here we check against MOBILE: the
// question is "can this run the phone AR experience?", not "can XR8 start".

const MOBILE_OS = ['iOS', 'Android']

// Module-level, because A-Frame gives the component its own `this`.
let started = false

const screenRotateComponent = {
  // Runs once, as early as possible (see the DOMContentLoaded hook at the
  // bottom), so desktop users see the QR straight away instead of the loading
  // screen. The A-Frame component init just calls this again and it no-ops.
  init() {
    if (started) return
    started = true
    this.mode = this.GuessMode()
    this.qrRendered = false

    this.CheckOrientation = this.CheckOrientation.bind(this)
    window.addEventListener('resize', this.CheckOrientation)
    this.SetupCopyButton()
    this.CheckOrientation()

    const onXR = () => this.RefineWithXR()
    if (window.XR8) onXR()
    else window.addEventListener('xrloaded', onXR, {once: true})
  },

  // Before XR8 has loaded: no touch support at all means desktop.
  GuessMode() {
    const hasTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints || 0) > 0
    return hasTouch ? 'rotate' : 'qr'
  },

  RefineWithXR() {
    try {
      const D = XR8.XrDevice
      const devices = (XR8.XrConfig && XR8.XrConfig.device && XR8.XrConfig.device()) || {}
      const cfg = {allowedDevices: devices.MOBILE || 'mobile'}

      if (D.isDeviceBrowserCompatible(cfg)) {
        this.mode = 'rotate'
      } else {
        const os = (D.deviceEstimate() || {}).os
        this.mode = MOBILE_OS.includes(os) ? 'browser' : 'qr'
      }
    } catch (e) {
      console.warn('screen-rotate: compatibility check failed, keeping initial guess', e)
    }
    this.CheckOrientation()
  },

  CheckOrientation() {
    const container = document.getElementById('rotatedScreen')
    if (!container) return

    const rotateText = document.getElementById('rotateText')
    const qrPanel = document.getElementById('qrPanel')
    const browserPanel = document.getElementById('openInBrowserPanel')

    const isLandscape = window.innerHeight < window.innerWidth
    const show = this.mode !== 'rotate' || isLandscape

    container.classList.toggle('hidden', !show)
    container.classList.toggle('is-incompatible', this.mode !== 'rotate')
    rotateText && rotateText.classList.toggle('hidden', this.mode !== 'rotate')
    qrPanel && qrPanel.classList.toggle('hidden', this.mode !== 'qr')
    browserPanel && browserPanel.classList.toggle('hidden', this.mode !== 'browser')

    if (this.mode === 'qr') this.RenderQR()
  },

  RenderQR() {
    if (this.qrRendered) return
    const target = document.getElementById('qrCode')
    if (!target) return

    try {
      qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8']
      const qr = qrcode(0, 'M') // 0 = smallest version that fits the URL
      qr.addData(window.location.href)
      qr.make()
      target.innerHTML = qr.createSvgTag({cellSize: 4, margin: 0, scalable: true})
      this.qrRendered = true
    } catch (e) {
      console.warn('screen-rotate: QR generation failed', e)
    }
  },

  SetupCopyButton() {
    const button = document.getElementById('copyLinkButton')
    if (!button) return

    const label = document.getElementById('copyLinkLabel')
    const done = document.getElementById('copyLinkDone')

    button.addEventListener('click', async () => {
      const url = window.location.href
      let ok = false
      try {
        await navigator.clipboard.writeText(url)
        ok = true
      } catch (e) {
        // Older / in-app webviews: fall back to a hidden textarea + execCommand
        try {
          const ta = document.createElement('textarea')
          ta.value = url
          ta.setAttribute('readonly', '')
          ta.style.position = 'fixed'
          ta.style.opacity = '0'
          document.body.appendChild(ta)
          ta.select()
          ok = document.execCommand('copy')
          document.body.removeChild(ta)
        } catch (err) { ok = false }
      }

      if (ok && label && done) {
        label.classList.add('hidden')
        done.classList.remove('hidden')
        setTimeout(() => {
          label.classList.remove('hidden')
          done.classList.add('hidden')
        }, 2500)
      }
    })
  },
}

// Start before A-Frame / the scene has loaded. Component methods are called
// with the component as `this`, so the early call uses the object itself and
// the later A-Frame init returns immediately via the `started` flag.
const startEarly = () => {
  screenRotateComponent.init.call(screenRotateComponent)
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startEarly, {once: true})
} else {
  startEarly()
}

export {screenRotateComponent}
