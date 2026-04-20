const screenRotateComponent = {
  init() {
    window.addEventListener('resize', this.CheckOrientation)
    this.CheckOrientation()
  },
  CheckOrientation() {
    console.log('Rotated')
    const turnPhoneContainer = document.getElementById('rotatedScreen')
    if (window.innerHeight < window.innerWidth) {
      // Landscape mode: show the overlay
      turnPhoneContainer.classList.remove('hidden')
    } else {
      // Portrait mode: hide the overlay
      turnPhoneContainer.classList.add('hidden')
    }
  },
}
export {screenRotateComponent}
