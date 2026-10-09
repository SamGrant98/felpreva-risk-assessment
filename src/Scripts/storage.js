// Bump when the analytics payload gains or changes fields, so the dashboard can
// tell old-build rows from new ones without relying on a deploy date
// (Cloudflare can serve the old build for up to 24h after a deploy).
const TRACKING_VERSION = 2

// Permission-free country guess. Timezone first (set by the OS, so it follows
// where the phone actually is); browser language region second (many phones
// default to en-US whatever the country, so it is the weaker signal).
const TZ_COUNTRY = {
  'Europe/Paris': 'FR', 'Europe/London': 'GB', 'Europe/Madrid': 'ES',
  'Atlantic/Canary': 'ES', 'Africa/Ceuta': 'ES', 'Europe/Monaco': 'MC',
  'Europe/Brussels': 'BE', 'Europe/Luxembourg': 'LU', 'Europe/Zurich': 'CH',
  'Europe/Dublin': 'IE', 'Europe/Lisbon': 'PT', 'Europe/Berlin': 'DE',
  'Europe/Rome': 'IT', 'Europe/Amsterdam': 'NL', 'Europe/Andorra': 'AD',
  'Indian/Reunion': 'RE', 'America/Martinique': 'MQ', 'America/Guadeloupe': 'GP',
}

function guessCountry(timezone, languages) {
  if (timezone && TZ_COUNTRY[timezone]) return TZ_COUNTRY[timezone]
  for (const lang of languages || []) {
    const m = /^[a-z]{2,3}[-_]([A-Z]{2})$/i.exec(lang || '')
    if (m) return m[1].toUpperCase()
  }
  return null
}

export const storeData = {
  // =========================
  // Analytics state
  // =========================
  _analytics: {
    sessionId: null,
    startedAt: null,      // ms since epoch
    enterTimes: {},       // { stepId: secondsFromStart }
    durations: {},        // { stepId: secondsSpent }
    lastStep: null,
    lastEnterWall: null,  // ms since epoch (wall clock)
    completed: false,
  },

  // =========================
  // Public lifecycle
  // =========================
  init() {
    window.storeData = this
    this.InitAnalytics()
    this.WatchSessionEnd()
    this.CaptureEnvironment()
    this.WatchXR()
    this.RequestLocation()

    const restart = document.getElementById('restart-button')
    if (restart) restart.addEventListener('click', () => this.ClearData())

    // examples (call at the right times in your app):
    // this.TrackStep('placed')
    // this.TrackStep('results')
    // this.TrackStep('end')
  },

  InitAnalytics() {
    const saved = sessionStorage.getItem('cc_session_v1')
    if (saved) {
      this._analytics = JSON.parse(saved)
      // never carry an in-flight timer across reloads
      delete this._analytics.lastEnterPerf
      this._analytics.lastEnterWall = null
    } else {
      this._analytics = {
        sessionId: crypto.randomUUID(),
        startedAt: Date.now(),
        enterTimes: {},
        durations: {},
        lastStep: null,
        lastEnterWall: null,
        completed: false,
      }
      sessionStorage.setItem('cc_session_v1', JSON.stringify(this._analytics))
    }
  },

  // =========================
  // Timing helpers
  // =========================
  _finalizeCurrentStep() {
    const A = this._analytics
    const nowMs = Date.now()

    if (A.lastStep && A.lastEnterWall != null) {
      const deltaMs = nowMs - A.lastEnterWall
      // guard against negatives / absurd jumps
      if (deltaMs > 0 && deltaMs < 3_600_000) {
        const spent = deltaMs / 1000
        const prev = Number(A.durations[A.lastStep]) || 0
        A.durations[A.lastStep] = Math.max(0, prev + spent)
      } else {
        console.warn('⏱ timing anomaly ignored', {step: A.lastStep, deltaMs})
      }
    }

    A.lastEnterWall = null
    sessionStorage.setItem('cc_session_v1', JSON.stringify(A))
  },

  _serializeTimes(obj) {
    // include only finite, non-negative numbers; round to 2 dp
    const out = {}
    for (const k in obj) {
      const n = Number(obj[k])
      if (!Number.isFinite(n) || n < 0) continue
      out[k] = Math.round(n * 100) / 100
    }
    return out
  },

  _sanitizeTimes() {
    const A = this._analytics
    for (const k of Object.keys(A.durations)) {
      const n = Number(A.durations[k])
      if (!Number.isFinite(n) || n < 0) delete A.durations[k]
    }
    for (const k of Object.keys(A.enterTimes)) {
      const n = Number(A.enterTimes[k])
      if (!Number.isFinite(n) || n < 0) delete A.enterTimes[k]
    }
  },

  _canonBranchId(stepId) {
    const s = String(stepId).toUpperCase()
    return (s === 'Q9' || s === 'Q10' || s === 'Q11') ? 'Q11' : stepId
  },

  _canonicalizeQ11Branch() {
    const A = this._analytics
    const ks = ['Q9', 'Q10', 'Q11']

    // durations → sum into Q11
    let sum = 0
    let have = false
    for (const k of ks) {
      const n = Number(A.durations[k])
      if (Number.isFinite(n) && n >= 0) {
        sum += n; have = true
      }
    }
    if (have) A.durations.Q11 = sum
    ks.forEach(k => { if (k !== 'Q11') delete A.durations[k] })

    // enterTimes → earliest among the three
    let minET = Infinity
    ks.forEach(k => {
      const n = Number(A.enterTimes[k])
      if (Number.isFinite(n) && n >= 0 && n < minET) minET = n
    })
    if (minET !== Infinity) A.enterTimes.Q11 = minET
    ks.forEach(k => { if (k !== 'Q11') delete A.enterTimes[k] })

    // lastStep normalization
    const ls = String(A.lastStep || '').toUpperCase()
    if (ks.includes(ls)) A.lastStep = 'Q11'
  },

  // =========================
  // Tracking
  // =========================
  TrackStep(stepId) {  // generic for any stage (questions + non-question stages)
    stepId = this._canonBranchId(stepId)
    const A = this._analytics
    const nowMs = Date.now()

    // close previous step
    if (A.lastStep && A.lastEnterWall != null) {
      const deltaMs = nowMs - A.lastEnterWall
      if (deltaMs > 0 && deltaMs < 3_600_000) {
        const spent = deltaMs / 1000
        const prev = Number(A.durations[A.lastStep]) || 0
        A.durations[A.lastStep] = Math.max(0, prev + spent)
      } else {
        console.warn('⏱ timing anomaly ignored', {step: A.lastStep, deltaMs})
      }
    }

    // open new step
    A.lastStep = stepId
    if (A.enterTimes[stepId] == null) {
      A.enterTimes[stepId] = (nowMs - A.startedAt) / 1000
    }
    A.lastEnterWall = nowMs

    sessionStorage.setItem('cc_session_v1', JSON.stringify(A))
    console.log(`last step:${stepId}`)
  },

  MarkCompleted() {
    this._finalizeCurrentStep()
    const A = this._analytics
    A.completed = true
    sessionStorage.setItem('cc_session_v1', JSON.stringify(A)) // << fix: sessionStorage
  },

  // =========================
  // Session end watchers
  // =========================
  WatchSessionEnd() {
    const flush = () => {
      if (!this._analytics.completed) this.SendAnswers()  // send partial on hide/unload
    }
    window.addEventListener('pagehide', flush, {capture: true})
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush()
    })
    window.addEventListener('beforeunload', flush)
  },

  // =========================
  // Location
  // =========================
  // Records WHY a session has no country, instead of only warning in the console.
  // geo_status values, in the order a session moves through them:
  //   unsupported   - no navigator.geolocation
  //   pending       - asked, no answer yet (prompt ignored or still showing)
  //   denied        - user or browser refused (typical of in-app browsers / iframes)
  //   unavailable   - permission given but the device could not get a fix
  //   timeout       - permission given but no fix within 15s
  //   lookup_pending- got coordinates, waiting on the reverse-geocode
  //   lookup_failed - reverse-geocode errored or returned no country
  //   ok            - country stored
  _setGeoStatus(status) {
    this._geoStatus = status
    try { sessionStorage.setItem('cc_geo_status_v1', status) } catch (e) {}
  },

  CaptureEnvironment() {
    let timezone = null
    try { timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || null } catch (e) {}

    const languages = (navigator.languages && navigator.languages.length)
      ? Array.from(navigator.languages)
      : [navigator.language].filter(Boolean)

    let inIframe = false
    try { inIframe = window.top !== window.self } catch (e) { inIframe = true } // cross-origin parent

    this._env = {
      timezone,
      browserLang: languages[0] || null,
      fallbackCountry: guessCountry(timezone, languages),
      userAgent: (navigator.userAgent || '').slice(0, 512),
      inIframe,
    }

    // Permission state before we ask: 'denied' here means the environment
    // (or an earlier visit) has already blocked location.
    this._geoPermission = null
    try {
      if (navigator.permissions && navigator.permissions.query) {
        navigator.permissions.query({name: 'geolocation'})
          .then((p) => { this._geoPermission = p.state })
          .catch(() => { this._geoPermission = 'query_failed' })
      } else {
        this._geoPermission = 'unsupported'
      }
    } catch (e) {
      this._geoPermission = 'query_failed'
    }
  },

  // 8th Wall engine diagnostics. Everything is wrapped so a failure here can
  // never stop the AR from running.
  //   xr_loaded / xr_load_s - did the engine finish loading, and how long it took
  //                           (seconds since page load). Not loaded = left during loading.
  //   xr_compatible         - 8th Wall's own verdict, using the scene's config (allowedDevices: any)
  //   xr_incompatible_reasons - e.g. UNSUPPORTED_BROWSER, MISSING_USER_MEDIA
  //   xr_device             - deviceEstimate() + incompatibleReasonDetails(),
  //                           including 8th Wall's inAppBrowser / inAppBrowserType
  //   camera_status         - last camera pipeline status: requesting / hasStream /
  //                           hasVideo / failed (null = camera never requested)
  WatchXR() {
    this._xr = {
      loaded: false, loadS: null, compatible: null, reasons: null,
      device: null, cameraStatus: null, cameraReason: null,
    }

    const onLoaded = () => {
      try {
        this._xr.loaded = true
        this._xr.loadS = Math.round(performance.now() / 100) / 10

        const D = XR8.XrDevice
        const any = (XR8.XrConfig && XR8.XrConfig.device && XR8.XrConfig.device().ANY) || 'any'
        const cfg = {allowedDevices: any}

        this._xr.compatible = Boolean(D.isDeviceBrowserCompatible(cfg))

        const names = {}
        Object.entries(D.IncompatibilityReasons || {}).forEach(([k, v]) => { names[v] = k })
        this._xr.reasons = (D.incompatibleReasons(cfg) || []).map(r => names[r] || String(r))

        const est = D.deviceEstimate() || {}
        this._xr.device = {
          os: est.os ?? null,
          osVersion: est.osVersion ?? null,
          manufacturer: est.manufacturer ?? null,
          model: est.model ?? null,
          browser: est.browser ?? null,
          details: D.incompatibleReasonDetails(cfg) || null,
        }
      } catch (e) {
        console.warn('XR diagnostics failed:', e)
      }

      try {
        XR8.addCameraPipelineModule({
          name: 'cc-camera-status',
          onCameraStatusChange: ({status, reason}) => {
            this._xr.cameraStatus = status || null
            if (reason) {
              let r = reason
              try { r = typeof reason === 'string' ? reason : (reason.name || reason.message || JSON.stringify(reason)) } catch (e) { r = String(reason) }
              this._xr.cameraReason = String(r).slice(0, 200)
            }
          },
        })
      } catch (e) {
        console.warn('Camera status module failed:', e)
      }
    }

    if (window.XR8) onLoaded()
    else window.addEventListener('xrloaded', onLoaded, {once: true})
  },

  RequestLocation() {
    console.log('📍 Requesting location...')
    if (!('geolocation' in navigator)) {
      this._setGeoStatus('unsupported')
      return
    }
    this._setGeoStatus('pending')

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this._setGeoStatus('lookup_pending')
        const lat = pos.coords.latitude
        const lon = pos.coords.longitude
        localStorage.setItem('latitude', lat)
        localStorage.setItem('longitude', lon)

        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`)
          .then((res) => {
            if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`)
            return res.json()
          })
          .then((locationData) => {
            const countryCode = locationData.address?.country_code?.toUpperCase() || null
            const city =
              locationData.address?.city ||
              locationData.address?.town ||
              locationData.address?.village ||
              null
            // Borough/district-level detail (e.g. "Westminster"), for disambiguating
            // cities that share a name. Not every Nominatim result includes one of
            // these fields, particularly outside larger cities.
            const area =
              locationData.address?.city_district ||
              locationData.address?.borough ||
              locationData.address?.suburb ||
              locationData.address?.neighbourhood ||
              null

            if (!countryCode) {
              this._setGeoStatus('lookup_failed')
              console.warn('🌐 Reverse geolocation returned no country')
              return
            }

            localStorage.setItem('location_country', countryCode)
            localStorage.setItem('location_city', city)
            localStorage.setItem('location_area', area)
            this._setGeoStatus('ok')
            console.log(`🌍 Country: ${countryCode}, 🏙️ City: ${city}, 📍 Area: ${area}`)
          })
          .catch((err) => {
            this._setGeoStatus('lookup_failed')
            console.warn('🌐 Reverse geolocation failed:', err)
          })
      },
      (error) => {
        const byCode = {1: 'denied', 2: 'unavailable', 3: 'timeout'}
        this._setGeoStatus(byCode[error && error.code] || 'error')
        console.warn('❌ Geolocation failed or denied:', error)
      },
      // timeout only starts once permission is granted; an ignored prompt stays 'pending'
      {enableHighAccuracy: false, timeout: 15000, maximumAge: 10 * 60 * 1000}
    )
  },

  // =========================
  // Debug / Local data helpers
  // =========================
  DebugLocalStorage() {
    const fields = [
      'name', 'age', 'weight', 'pregnancy',
      'Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6',
      'Q8', 'Q12', 'Q13',
      'location_country', 'location_city', 'location_area', 'latitude', 'longitude',
    ]
    console.log('🔎 Debugging stored data:')
    fields.forEach((field) => {
      const value = localStorage.getItem(field)
      if (value !== null) console.log(`✅ ${field}:`, value)
      else console.warn(`⚠️ ${field} is missing or null`)
    })
  },

  GetData() {
    const dataNames = [
      'texture', 'name', 'age', 'weight', 'pregnancy',
      'Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q8', 'Q11', 'Q12', 'Q13', 'riskLevel',
    ]
    let index = 0
    const savedData = {}
    if (localStorage.getItem('Q13') !== null) {
      dataNames.forEach((name) => {
        savedData[index] = localStorage.getItem(name)
        if (savedData[index]) this.LoadData(index, savedData[index])
        index++
      })
    }
    this.DebugLocalStorage()
  },

  SaveData(data, value) {
    localStorage.setItem(data, value)
    this.TrackStep(data)  // keep timing correct for each answer step
  },

  LoadData(index, data) {
    const soundScreen = document.getElementById('sound-screen')
    const permissionScreen = document.getElementById('permission-screen')

    switch (index) {
      case 0: window.customisation?.SwapTexture?.(data); break
      case 1: window.customisation?.ChangeName?.(data); break
      case 2: window.customisation?.ChangeAge?.(data); break
      case 3: window.customisation?.ChangeWeight?.(data); break
      case 4: window.customisation?.ChangePregnancy?.(data); break
      case 5:
        if (data === 'free' || data === 'yes') {
          window.propSpawner?.SpawnProp?.(0)
          window.propSpawner?.SpawnProp?.(1)
          window.propSpawner?.SpawnProp?.(4)
        } else {
          window.propSpawner?.SpawnProp?.(2)
          window.propSpawner?.SpawnProp?.(4)
        }
        break
      case 6: if (data === 'yes') window.propSpawner?.SpawnProp?.(3); break
      case 7: if (data === 'yes') window.propSpawner?.SpawnProp?.(5); break
      case 9: if (data === 'yes') window.propSpawner?.SpawnProp?.(7); break
      case 12: case 13: case 14: case 15:
        if (soundScreen) soundScreen.classList.add('hidden')
        if (permissionScreen) permissionScreen.classList.add('hidden')
        window.questions?.Capture?.()
        break
    }
  },

  ClearData() {
    localStorage.clear()
    sessionStorage.clear()
    window.location.reload()
  },

  // =========================
  // Submit
  // =========================
  SendAnswers() {
    const A = this._analytics

    // finalize & sanitize BEFORE reading
    this._finalizeCurrentStep()
    this._canonicalizeQ11Branch()
    this._sanitizeTimes()

    // helpers to avoid sending nulls
    const vStr = (k) => {
      const v = localStorage.getItem(k)
      return (v == null || v === '') ? undefined : v
    }
    const vNum = (k) => {
      const v = localStorage.getItem(k)
      if (v == null || v === '') return undefined
      const n = Number(v)
      return Number.isFinite(n) ? n : undefined
    }

    // Complete if Q13 is present & non-empty
    const q13 = (localStorage.getItem('Q13') || '').trim()
    const isComplete = q13 !== ''

    // order by first-enter time
    const stepOrder = Object.keys(A.enterTimes).sort((a, b) => A.enterTimes[a] - A.enterTimes[b])

    const q11Merged = localStorage.getItem('Q9') ?? localStorage.getItem('Q10') ?? localStorage.getItem('Q11') ?? undefined

    // clean timings once (no duplicates)
    const durationsClean  = this._serializeTimes(A.durations)
    const enterTimesClean = this._serializeTimes(A.enterTimes)
    const activeTotal     = Object.values(durationsClean).reduce((a, v) => a + v, 0)

    const payload = {
      sessionId: A.sessionId,
      timestamp: Date.now(),

      name: vStr('name'),
      age: vNum('age'),
      weight: vNum('weight'),
      pregnant: vStr('pregnancy'),

      Q1: vStr('Q1'),
      Q2: vStr('Q2'),
      Q3: vStr('Q3'),
      Q4: vStr('Q4'),
      Q5: vStr('Q5'),
      Q6: vStr('Q6'),
      Q8: vStr('Q8'),
      Q11: q11Merged,
      Q12: vStr('Q12'),
      Q13: vStr('Q13'),
      riskLevel: vStr('riskLevel'),

      location_country: vStr('location_country'),
      location_city: vStr('location_city'),
      location_area: vStr('location_area'),

      // timings
      startedAt: A.startedAt,
      totalTime: Math.round(activeTotal * 100) / 100,
      enterTimes: enterTimesClean,
      durations:  durationsClean,
      stepOrder,
      lastStep: A.lastStep,
      completed: isComplete,

      // diagnostics (tracking v2)
      tracking_version: TRACKING_VERSION,
      geo_status: this._geoStatus || null,
      geo_permission: this._geoPermission || null,
      client_tz: this._env?.timezone ?? null,
      browser_lang: this._env?.browserLang ?? null,
      fallback_country: this._env?.fallbackCountry ?? null,
      user_agent: this._env?.userAgent ?? null,
      in_iframe: this._env?.inIframe ?? null,

      xr_loaded: this._xr?.loaded ?? null,
      xr_load_s: this._xr?.loadS ?? null,
      xr_compatible: this._xr?.compatible ?? null,
      xr_incompatible_reasons: this._xr?.reasons ?? null,
      xr_device: this._xr?.device ?? null,
      camera_status: this._xr?.cameraStatus ?? null,
      camera_fail_reason: this._xr?.cameraReason ?? null,
    }

    if (isComplete) {
      // we've already finalized; just mark completed to avoid double-add
      A.completed = true
      sessionStorage.setItem('cc_session_v1', JSON.stringify(A))
    }

    this.SendPayload(payload)
  },

  async SendPayload(payload) {
  try {
    // allow multiple partials; only block repeat finals
    if (localStorage.getItem('cc_submitted_v1') === '1' && payload.completed) {
      console.warn('Submit skipped: already sent final for this session.')
      return
    }

    // IMPORTANT: this is the BASE, not the endpoint
    // Your endpoint is: /felpreva-dashboard-backend/api/entries
    const API_BASE = window.API_BASE_URL

    const endpoint = `${API_BASE}/felpreva-dashboard-backend/api/entries`;

    // Required by your backend (idempotency)
    const idemKey = crypto.randomUUID();

    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-idempotency-key': idemKey,

        // Optional: only if you set CLIENT_KEY on the backend
        // 'x-client-key': window.CLIENT_KEY,
      },
      body: JSON.stringify(payload),
      keepalive: true,
    });

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`API failed ${resp.status}: ${errText}`);
    }

    if (payload.completed) localStorage.setItem('cc_submitted_v1', '1');

    const text = await resp.text();
    console.log('✅ Submitted:', text);
  } catch (err) {
    console.error('❌ Error sending data:', err);
  }
}
}
