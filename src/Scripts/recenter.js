const recenterComponent = {
  init() {
    const recenter = document.getElementById('resetButton')

    recenter.addEventListener('click', () => {
      this.Recenter()
    })
  },
  Recenter() {
    const scene = this.el.sceneEl
    scene.emit('recenter')
    console.log('recenter')
  },
}
export {recenterComponent}
