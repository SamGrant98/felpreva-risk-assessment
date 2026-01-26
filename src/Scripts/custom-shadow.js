AFRAME.registerComponent('custom-shadow', {
  schema: {
    cast: {type: 'boolean', default: true},
    receive: {type: 'boolean', default: true},
    applyToChildren: {type: 'boolean', default: true},

  },
  multiple: false,
  init() {
    this.applyShadow()
    this.el.addEventListener('object3dset', this.applyShadow.bind(this))
  },
  applyShadow() {
    const data    = this.data
    const mesh    = this.el.getObject3D('mesh')

    if (!mesh) return
    mesh.traverse((node) => {
      node.castShadow = data.cast
      node.receiveShadow = data.receive

      if (data.applyToChildren) {
        return
      }
    })
  },
  update(oldData) {
    this.applyShadow.bind(this)
  },
})
