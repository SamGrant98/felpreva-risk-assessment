const nextButtonComponent = {
  el: this,
  audio: false,
  init() {
    window.playAnim = this
    this.el.addEventListener('animation-loop', this.onAnimationFinished.bind(this))
  },
  Play(name) {
    const animationName = name
    let morphTargetIndex
    let object = null

    // Set animation mixer with cross-fade and loop options
    this.el.setAttribute('animation-mixer', {
      clip: animationName,
      loop: 'repeat',
      clampWhenFinished: false,
      crossFadeDuration: 0.4,
    })
    document.getElementById('Cat').object3D.traverse((child) => {
      if (child.isMesh && child.morphTargetDictionary && child.name === 'Mesh') {
        object = child
      }
    })
    if (object && object.morphTargetDictionary && object.morphTargetInfluences) {
      if (animationName === '_meow') {
        morphTargetIndex = object.morphTargetDictionary.happy_meow
        this.Blend(object, morphTargetIndex)
      } else if (animationName === '_hunt_loop') {
        morphTargetIndex = object.morphTargetDictionary.hunt_eye
        this.Blend(object, morphTargetIndex)
      }
    }
  },
  Blend(object, morphTargetIndex) {
    if (morphTargetIndex !== undefined) {
      let currentFrame = 0
      const totalFrames = 100  // Set the total frames for a complete 0 → 1 → 0 cycle

      // Function to animate the blend shape once
      const animateBlendShape = () => {
        const progress = currentFrame / totalFrames
        const blendValue = progress <= 0.5
          ? progress * 2  // 0 → 1 for the first half
          : 2 - progress * 2  // 1 → 0 for the second half

        object.morphTargetInfluences[morphTargetIndex] = blendValue

        currentFrame++
        if (currentFrame <= totalFrames) {
          requestAnimationFrame(animateBlendShape)  // Continue until the animation completes
        } else {
          object.morphTargetInfluences[morphTargetIndex] = 0  // Reset to 0 when animation ends
        }
      }
      animateBlendShape()  // Start the blend shape animation
    }
  },
  onAnimationFinished(event) {
    // console.log(event.detail.action._clip.name)
    this.el.setAttribute('animation-mixer', {
      clip: '_sit_loop',
      loop: 'true',
      crossFadeDuration: 0.4,
    })
  },
}

export {nextButtonComponent}
