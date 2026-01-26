export const tapPlaceComponent = {
  schema: {},
  init() {
    const questionnair = document.getElementById('sound-screen')
    const tapPlace = document.getElementById('place-screen')
    const pinch = document.getElementById('pinchContainer')

    this.isMobile = /Mobi|Android|iPhone|iPad|iPod/.test(navigator.userAgent)

    // Create a ghost cursor with a ring
    this.ghostCursorRing = document.createElement('a-ring')
    this.ghostCursorRing.setAttribute('radius-inner', '0.9')
    this.ghostCursorRing.setAttribute('radius-outer', '1')
    this.ghostCursorRing.setAttribute('color', '#ff0084')
    this.ghostCursorRing.setAttribute('opacity', '0.5')  // Set transparency for the ring
    this.ghostCursorRing.setAttribute('rotation', '-90 0 0')  // Flat on the ground
    this.ghostCursorRing.setAttribute('position', '0 0 0')  // Default position
    this.el.sceneEl.appendChild(this.ghostCursorRing)

    // Create a solid circle in the center of the ring
    this.ghostCursorCircle = document.createElement('a-circle')
    this.ghostCursorCircle.setAttribute('radius', '0.7')
    this.ghostCursorCircle.setAttribute('color', '#ff0084')  // Same color as the ring or different if preferred
    this.ghostCursorCircle.setAttribute('opacity', '0.5')  // Set transparency for the circle
    this.ghostCursorCircle.setAttribute('rotation', '-90 0 0')  // Flat on the ground
    this.ghostCursorCircle.setAttribute('position', '0 0 0')  // Default position
    this.el.sceneEl.appendChild(this.ghostCursorCircle)

    this.camera = document.querySelector('[camera]')
    this.raycaster = new THREE.Raycaster()
    this.threeCamera = this.camera.getObject3D('camera')

    if (this.isMobile) {
      this.groundObject = document.getElementById('ground')
    } else {
      this.groundObject = document.createElement('a-entity')
      this.groundObject.setAttribute('geometry', 'primitive: plane; width: 100; height: 100')
      this.groundObject.setAttribute('rotation', '-90 0 0')
      this.groundObject.setAttribute('material', 'color: #ccc; opacity: 0.2')
      this.groundObject.setAttribute('position', '0 0 0')
      this.el.sceneEl.appendChild(this.groundObject)
    }

    this.cursorLocation = new THREE.Vector3(0, 0, 0)
    this.tempObject = new THREE.Object3D()
    this.tempVector3 = new THREE.Euler()
    this.initialYPos = 0.1

    this.hasPlacedModel = false

    this.objectToPlace = document.createElement('a-entity')
    this.objectToPlace.setAttribute('id', 'cat')
    this.objectToPlace.setAttribute('gltf-model', '#catModel')
    this.objectToPlace.setAttribute('xrextras-pinch-scale', 'min: 0.5; max: 3; scale: 8')
    // this.objectToPlace.setAttribute('xrextras-hold-drag', '')
    // this.objectToPlace.setAttribute('xrextras-two-finger-rotate', '')
    this.objectToPlace.setAttribute('reflections', 'type: realtime')
    // this.objectToPlace.setAttribute('shadow')
    this.objectToPlace.setAttribute('custom-shadow')
    this.objectToPlace.setAttribute('visible', 'false')
    this.el.sceneEl.appendChild(this.objectToPlace)

    this.handlePlacement = async () => {
      if (!this.hasPlacedModel) {
        window.storeData.TrackStep('placed')
        // Place the object at the cursor's current position
        this.objectToPlace.setAttribute('id', 'Cat')
        this.objectToPlace.setAttribute('class', 'cantap')
        this.objectToPlace.setAttribute('position', this.cursorLocation)
        // console.log(`Position: ${this.cursorLocation.x} ${this.cursorLocation.y} ${this.cursorLocation.z}`)
        this.objectToPlace.setAttribute('visible', 'true')
        // Attach the custom component with audio
        this.objectToPlace.setAttribute('atmoky-source', {
          src: '#cat-sounds',
          loop: false,
          autoplay: true,
          reverb: 0.2,
        })
        // Get the camera's position
        const cameraPosition = new THREE.Vector3()
        this.camera.object3D.getWorldPosition(cameraPosition)

        // Calculate the direction from the object to the camera
        const direction = new THREE.Vector3().subVectors(cameraPosition, this.cursorLocation)
        const rotationY = Math.atan2(direction.x, direction.z) * (180 / Math.PI)

        // Set the rotation to face the camera
        this.objectToPlace.setAttribute('rotation', `0 ${rotationY} 0`)
        // Animate the object popping in
        this.objectToPlace.setAttribute('animation', {
          property: 'scale',
          to: '8 8 8',
          easing: 'easeOutElastic',
          dur: 800,
        })

        this.objectToPlace.setAttribute('next-anim', '')

        // Set the animation mixer for the object
        this.objectToPlace.setAttribute('animation-mixer', 'clip: _sit_loop; loop: repeat')

        this.objectToPlace.object3D.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.frustumCulled = false
            child.castShadow = true
            child.receiveShadow = true
          }
        })

        // Remove the cursor after placing the object
        this.ghostCursorRing.parentNode.removeChild(this.ghostCursorRing)
        this.ghostCursorCircle.parentNode.removeChild(this.ghostCursorCircle)
        this.ghostCursorRing = null
        this.ghostCursorCircle = null

        this.hasPlacedModel = true
        questionnair.classList.remove('hidden')
        tapPlace.classList.add('hidden')
        window.storeData.GetData()
        window.playAnim.Play('_ear')
        window.audio.Play('breow')

        pinch.classList.remove('hidden')

        // Hide automatically after 4 seconds
        await this.delay(4000)
        if (!pinch.classList.contains('hidden')) {
          pinch.classList.add('hidden')
        }
      }
    }

    this.el.sceneEl.addEventListener('click', this.handlePlacement)
  },
  tick() {
    if (this.hasPlacedModel) return

    // Calculate cursor position based on camera view and screen center
    const screenCenter = new THREE.Vector2(0, -0.25)  // Center of the screen
    const mouseVector = new THREE.Vector3(screenCenter.x, screenCenter.y, 0.5)  // Default depth

    // Convert screen position to world coordinates
    this.raycaster.setFromCamera(mouseVector, this.threeCamera)
    const intersects = this.raycaster.intersectObject(this.groundObject.object3D, true)

    if (intersects.length > 0) {
      this.cursorLocation.copy(intersects[0].point)
    }

    // Keep the cursor on the ground
    this.cursorLocation.y = this.initialYPos
    if (this.ghostCursorRing) {  // Check if cursor exists before updating
      this.ghostCursorRing.object3D.position.copy(this.cursorLocation)
      this.ghostCursorCircle.object3D.position.copy(this.cursorLocation)

      // Align the cursor rotation to be flat on the ground, facing the camera
      const cameraPosition = new THREE.Vector3()
      this.camera.object3D.getWorldPosition(cameraPosition)

      // Calculate direction from cursor to camera
      const direction = new THREE.Vector3().subVectors(cameraPosition, this.cursorLocation)
      const rotationY = Math.atan2(direction.x, direction.z) * (180 / Math.PI)

      // Set the cursor's rotation to be flat and face the camera
      this.ghostCursorRing.object3D.rotation.set(-Math.PI / 2, rotationY * (Math.PI / 180), 0)
      this.ghostCursorCircle.object3D.rotation.set(-Math.PI / 2, rotationY * (Math.PI / 180), 0)
    }
  },
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  },
}
