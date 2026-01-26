export const propSpawner = {
  props: [
    {
      name: 'flower',
      rotation: new THREE.Vector3(0, 0, 0),
      scale: new THREE.Vector3(1, 1, 1),
      offset: new THREE.Vector3(-0.2, 0, 0),
    },
    {
      name: 'flower',
      rotation: new THREE.Vector3(0, 0, 0),
      scale: new THREE.Vector3(1, 1, 1),
      offset: new THREE.Vector3(0.2, 0, -0.3),
    },
    {
      name: 'table',
      rotation: new THREE.Vector3(0, 180, 0),
      scale: new THREE.Vector3(0.8, 0.8, 0.8),
      offset: new THREE.Vector3(-0.25, 0, -0.25),
    },
    {
      name: 'bowl',
      rotation: new THREE.Vector3(0, 180, 0),
      scale: new THREE.Vector3(1, 1, 1),
      offset: new THREE.Vector3(0.2, 0, 0),
    },
    {
      name: 'welly',
      rotation: new THREE.Vector3(0, 0, 0),
      scale: new THREE.Vector3(1, 1, 1),
      offset: new THREE.Vector3(0.75, 0, -0.5),
    },
    {
      name: 'snailMove',
      rotation: new THREE.Vector3(0, 180, 0),
      scale: new THREE.Vector3(1, 1, 1),
      offset: new THREE.Vector3(-0.2, 0, 0.2),
    },
    {
      name: 'mouse',
      rotation: new THREE.Vector3(0, 180, 0),
      scale: new THREE.Vector3(0.1, 0.1, 0.1),
      offset: new THREE.Vector3(0.1, 0, 0.5),
    },
    {
      name: 'meat',
      rotation: new THREE.Vector3(0, 180, 0),
      scale: new THREE.Vector3(1, 1, 1),
      offset: new THREE.Vector3(0.3, 0, -0.2),
    },
  ],

  init() {
    window.propSpawner = this
  },

  SpawnProp(index) {
  // Destructure the properties of the current prop
    const {name, model: modelName, rotation, scale, offset} = this.props[index]

    // Use a proper template literal to set the model
    const model = `#${name}`

    const cat = document.getElementById('Cat')

    this.prop = document.createElement('a-entity')
    this.prop.setAttribute('id', `spawned-${name}`)
    this.prop.setAttribute('gltf-model', model)

    // Set the prop's position based on the offset (local to the cat)
    const positionStr = `${offset.x} ${offset.y} ${offset.z}`
    const scaleStr = `${scale.x} ${scale.y} ${scale.z}`
    this.prop.setAttribute('position', positionStr)
    this.prop.setAttribute('scale', scaleStr)
    this.prop.setAttribute('rotation', rotation)
    this.prop.setAttribute('visible', 'true')
    this.prop.setAttribute('frustumCulled', 'false')
    this.prop.setAttribute('reflections', 'type: realtime')
    this.prop.setAttribute('animation-mixer', 'clip: *; loop: once; clampWhenFinished: true; timeScale: 1')

    this.prop.setAttribute('shadow', 'cast: true; receive: false')
    // Append the prop as a child of the 'Cat' entity to maintain scaling
    cat.appendChild(this.prop)

    // Add an event listener for the 'model-loaded' event
    this.el.addEventListener('model-loaded', (event) => {
      const loadedModel = event.detail.model  // Get the loaded model from event details
      this.Traverse(loadedModel)
      this.el.removeEventListener('model-loaded', this.Traverse)  // Remove the listener after handling
    })
  },
  DeleteProp(index) {
    // Destructure the properties of the current prop
    const {name} = this.props[index]

    // Find the spawned entity by its ID
    const spawnedProp = document.getElementById(`spawned-${name}`)

    if (spawnedProp) {
      // Remove the entity from the scene
      spawnedProp.parentNode.removeChild(spawnedProp)
      console.log(`Spawned prop with ID "${name}" deleted.`)
    } else {
      console.warn(`Spawned prop with ID "${name}" not found. Nothing to delete.`)
    }
  },
  Traverse(loadedModel) {
    loadedModel.traverse((child) => {
      // Only apply properties if the child is a THREE.Mesh
      if (child instanceof THREE.Mesh) {
        child.frustumCulled = false

        if (child.name.includes('footprint')) {
          child.castShadow = false
          child.receiveShadow = false
        }
        // console.log(`Updated child properties: ${child.name}`)
      }
    })
  },
}
