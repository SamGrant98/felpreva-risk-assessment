export const permissionComponent = {
  CONSENT_KEY: 'cookie_consent_v1',
  started: false,

  async init() {
    const acceptBtn = document.getElementById('permission-accept')
    const declineBtn = document.getElementById('permission-decline')
    const questionnaire = document.getElementById('sound-screen')
    const permissions = document.getElementById('permission-screen')

    if (!acceptBtn || !declineBtn || !questionnaire) {
      console.warn('Permission component: missing DOM elements')
      return
    }

    // If user already chose before, apply it and skip the gate
    const saved = localStorage.getItem(this.CONSENT_KEY)
    if (saved) {
      this.applyConsent(saved === 'granted')
      console.log('Saved')
      // questionnaire.classList.remove('hidden')
      permissions.classList.add('hidden')
      return
    }

    // Fresh visit: wait for a choice
    acceptBtn.addEventListener('click', () => {
      this.applyConsent(true)
      console.log('accept')
      questionnaire.classList.remove('hidden')
      permissions.classList.add('hidden')
    })

    declineBtn.addEventListener('click', () => {
      this.applyConsent(false)
      console.log('decline')
      questionnaire.classList.remove('hidden')
      permissions.classList.add('hidden')
    })
  },

  applyConsent(granted) {
    const value = granted ? 'granted' : 'denied'
    // Update Google Consent Mode (gtag stub must be present in <head>)
    window.dataLayer = window.dataLayer || []
    const gtag = (...args) => window.dataLayer.push(args)

    gtag('consent', 'update', {
      analytics_storage: value,
      ad_storage: 'denied',
    })

    localStorage.setItem(this.CONSENT_KEY, value)

    // Push a small event for debugging/auditing in GTM/GA4
    window.dataLayer.push({
      event: granted ? 'consent_accepted' : 'consent_declined',
      consent_value: value,
    })
  },
}
