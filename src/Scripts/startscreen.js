const startScreenComponent = {
  schema: {
    disableWorldTracking: {type: 'bool', default: false},
    requestGyro: {type: 'bool', default: false},
  },
  xrLoaded: false,
  init() {
    const startscreen = document.getElementById('startScreen')
    const start = document.getElementById('startButton')
    const startText = document.getElementById('startText')
    const loadText = document.getElementById('loadText')

    // Detect device type
    this.isMobile = /Mobi|Android|iPhone|iPad|iPod/.test(navigator.userAgent);

    const onxrloaded = () => {
      startText.classList.remove('hidden')
      loadText.classList.add('hidden')
    }

    if (window.XR8) {
      onxrloaded()
    } else {
      this.xrLoaded = true
      window.addEventListener('xrloaded', onxrloaded)
    }

    document.addEventListener('dblclick', (event) => {
      event.preventDefault()
    }, {passive: false})

    const addXRWeb = () => {
      if (this.isMobile) {
        if (this.data.requestGyro === true && this.data.disableWorldTracking === true) {
          XR8.addCameraPipelineModule({
            name: 'request-gyro',
            requiredPermissions: () => ([XR8.XrPermissions.permissions().DEVICE_ORIENTATION]),
          })
        }
        // Pause XR8 when the tab is hidden (e.g. phone screen locks or user switches apps)
        // and resume when it becomes visible again — prevents WebGL "deleted object" errors
        XR8.addCameraPipelineModule(window.XRExtras.PauseOnHidden.pipelineModule())
        this.el.sceneEl.setAttribute('xrweb', `allowedDevices: any; disableWorldTracking: ${this.data.disableWorldTracking}`)
      }

      // Whether mobile or desktop, hide the start screen
      startscreen.classList.add('hidden')
    }

    startscreen.onclick = addXRWeb
  },
}

export {startScreenComponent}
