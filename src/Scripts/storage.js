import {submitViaProxy} from 'felpreva-backend'

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
  RequestLocation() {
    console.log('📍 Requesting location...')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lon = pos.coords.longitude
        localStorage.setItem('latitude', lat)
        localStorage.setItem('longitude', lon)

        fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`)
          .then(res => res.json())
          .then((locationData) => {
            const countryCode = locationData.address?.country_code?.toUpperCase() || null
            const city =
              locationData.address?.city ||
              locationData.address?.town ||
              locationData.address?.village ||
              null

            localStorage.setItem('location_country', countryCode)
            localStorage.setItem('location_city', city)
            console.log(`🌍 Country: ${countryCode}, 🏙️ City: ${city}`)
          })
          .catch(err => console.warn('🌐 Reverse geolocation failed:', err))
      },
      error => console.warn('❌ Geolocation failed or denied:', error)
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
      'location_country', 'location_city', 'latitude', 'longitude',
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

      // timings
      startedAt: A.startedAt,
      totalTime: Math.round(activeTotal * 100) / 100,
      enterTimes: enterTimesClean,
      durations:  durationsClean,
      stepOrder,
      lastStep: A.lastStep,
      completed: isComplete,
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
      const resp = await submitViaProxy('/submit', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify(payload),
      })
      if (!resp.ok) {
        const errText = await resp.text()
        throw new Error(`Proxy failed ${resp.status}: ${errText}`)
      }
      if (payload.completed) localStorage.setItem('cc_submitted_v1', '1')
      const data = await resp.text()
      console.log('✅ Submitted via 8th Wall proxy:', data)
    } catch (err) {
      console.error('❌ Error sending data via proxy:', err)
    }
  },
}
