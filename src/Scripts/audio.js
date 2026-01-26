const AudioManager = {
  categories: {
    breow: ['breow1', 'breow2', 'breow3', 'breow4'],
    chirup: ['chirup1', 'chirup2', 'chirup3', 'chirup4', 'chirup5'],
    purr: ['purr1', 'purr2', 'purr3'],
    purrBreow: ['purrBreow1', 'purrBreow2', 'purrBreow3'],
    cameraShutter: ['cameraShutter1', 'cameraShutter2'],
  },
  init() {
    window.audio = this
  },
  Play(category) {
    if (localStorage.getItem('soundPreference') === 'sound-on') {
      const categoryArray = this.categories[category]
      if (!categoryArray || categoryArray.length === 0) {
        console.warn(`No audio found for category: ${category}`)
        return
      }

      const randomIndex = Math.floor(Math.random() * categoryArray.length)
      const selectedAudioId = categoryArray[randomIndex]
      const audioElement = document.getElementById(selectedAudioId)

      if (audioElement) {
        audioElement.currentTime = 0  // Reset playback to the start
        audioElement.play()
          .then(() => console.log(`Playing audio: ${selectedAudioId}`))
          .catch(error => console.error('Audio playback failed:', error))
      } else {
        console.error(`Audio element with ID "${selectedAudioId}" not found`)
      }
    }
  },
}

export {AudioManager}
