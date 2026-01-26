const soundComponent = {
  async init() {
    // Get the buttons and all audio elements in the scene
    const soundOnBtn = document.getElementById('sound-on-btn')
    const soundOffBtn = document.getElementById('sound-off-btn')

    // Event listener for enabling sound
    soundOnBtn.addEventListener('click', () => {
      this.Sound('sound-on')
    })

    // Event listener for muting sound
    soundOffBtn.addEventListener('click', () => {
      this.Sound('sound-off')
    })
  },
  async Sound(response) {
    const soundScreen = document.getElementById('sound-screen')
    const customisationScreen = document.getElementById('texture-screen')
    const pinch = document.getElementById('pinchContainer')
    if (!pinch.classList.contains('hidden')) {
      pinch.classList.add('hidden')
    }
    window.playAnim.Play('_purr')
    window.audio.Play('purr')
    // Check if a sound preference is saved in localStorage
    const soundPreference = localStorage.getItem('soundPreference')

    localStorage.setItem('soundPreference', response)
    soundScreen.classList.add('hidden')
    window.questions.UpdateDYK(0)

    await this.delay(4000)
    window.questions.CloseDYK()
    customisationScreen.classList.remove('hidden')
  },
  delay(ms) {
    return new Promise(resolve => {
      const start = Date.now()
      const check = () => {
        if (window.questions.skipDelay) {
          window.questions.skipDelay = false // reset it for future stages
          resolve()
        } else if (Date.now() - start >= ms) {
          resolve()
        } else {
          requestAnimationFrame(check)
        }
      }
      check()
    })
  }
}
export {soundComponent}
