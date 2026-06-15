export const textureSwapComponent = {
  init() {
    const loader = new THREE.TextureLoader()
    let stage = 0

    // Keep the question UI above the on-screen keyboard on mobile (esp. iOS Safari).
    //
    // The screens are `position: fixed`, so two iOS behaviours fight each other:
    //   1. Safari auto-scrolls the layout viewport to reveal the focused input,
    //      which drags the whole fixed UI upward ("the page moves up").
    //   2. `position: fixed` is anchored to the layout viewport, not the visual
    //      viewport, so on its own `.content-bottom` sits behind the keyboard.
    // Depending on timing you get one or the other — hence the inconsistency.
    //
    // We pin `.content-bottom` to the bottom of the *visual* viewport on every
    // resize AND scroll, and cancel Safari's competing auto-scroll while the
    // keyboard is open so the page never drifts.
    const vv = window.visualViewport
    let keyboardOpen = false

    const applyKeyboardOffset = () => {
      if (!vv) return
      const offsetBottom = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
      document.querySelectorAll('.content-bottom').forEach(element => {
        element.style.bottom = offsetBottom > 0 ? `${offsetBottom}px` : ''
      })
    }

    if (vv) {
      vv.addEventListener('resize', applyKeyboardOffset)
      vv.addEventListener('scroll', () => {
        // Undo Safari's auto-scroll so the fixed UI never drifts upward, then
        // re-pin. The guard stops this from looping once we're back at the top.
        if (keyboardOpen && (vv.offsetTop !== 0 || window.scrollY !== 0)) {
          window.scrollTo(0, 0)
        }
        applyKeyboardOffset()
      })
    }

    // Track keyboard state and re-pin on focus — covers screen transitions while
    // the keyboard is already open (no resize fires) and the animate-in period
    // (no single reliable event, so sample a couple of times).
    document.querySelectorAll('.styled-input').forEach(input => {
      input.addEventListener('focus', () => {
        keyboardOpen = true
        setTimeout(applyKeyboardOffset, 100)
        setTimeout(applyKeyboardOffset, 300)
      })
      input.addEventListener('blur', () => {
        keyboardOpen = false
        applyKeyboardOffset()
      })
    })

    const confirmButtons = [
      document.getElementById('colour-confirm'),
      document.getElementById('name-confirm'),
      document.getElementById('age-confirm'),
      document.getElementById('weight-confirm'),
      // document.getElementById('pregnant-confirm'),
    ]

    confirmButtons.forEach(element => {
      element.addEventListener('click', (event) => {
        stage++
        this.UpdateStage(stage)
      })
    })

    // Attach event listeners to the radio buttons
    document.querySelectorAll('.circle-input').forEach((radio) => {
      radio.addEventListener('change', (event) => {
        const button = event.target  // The selected radio button
        const index = parseInt(button.id.replace('pattern', ''), 10) - 1
        this.SwapTexture(index)
        window.storeData.SaveData('texture', index)
        confirmButtons[0].classList.remove('hidden')
      })
    })

    let name

    const nameInput = document.getElementById('name-input')
    const catNameElement = document.querySelector('.cat-name')
    const leftEar = document.getElementById('left-ear')
    const rightEar = document.getElementById('right-ear')

    function calculateEarPositions(numLetters) {
      let increment
      let yTranslation

      if (numLetters < 7) {
        increment = 17
        yTranslation = 0
      } else if (numLetters < 9) {
        increment = 13
        yTranslation = 10
      } else if (numLetters < 11) {
        increment = 10
        yTranslation = 15
      } else {
        increment = 5
        yTranslation = 30
      }
      // Calculate left ear position based on number of letters
      const leftEarX = 90 - increment * (numLetters - 4)
      // Calculate right ear position based on number of letters
      const rightEarX = 280 + increment * (numLetters - 4)

       // Adjust font size based on the length of the name
      if (numLetters > 11) {
        catNameElement.style.fontSize = '2rem'  // Scale down for longer names
      } else if (numLetters > 10) {
        catNameElement.style.fontSize = '2.5rem'  // Default size for very short names
      } else if (numLetters > 7) {
        catNameElement.style.fontSize = '3rem'  // Default size for very short names
      } else {
        catNameElement.style.fontSize = '3.5rem'  // Default size for very short names
      }

      // Calculate ear size based on font size
      const fontSize = parseFloat(getComputedStyle(catNameElement).fontSize)  // Get the current font size in pixels
      const earSize = fontSize / 40  // Adjust this ratio based on your visual preference
      return {leftEarX, rightEarX, yTranslation, earSize}
    }

    nameInput.addEventListener('input', (event) => {
      // Get the value of the input
      name = nameInput.value

      // Limit the input to a maximum of 12 characters
      if (name.length > 12) {
        name = name.substring(0, 12)
        nameInput.value = name  // Update the input value to reflect the maximum length
      }

      // Calculate the number of letters and adjust ear positions
      const numLetters = name.length
      const {leftEarX, rightEarX, yTranslation, earSize} = calculateEarPositions(numLetters)

      // Update the ear positions and size dynamically
      leftEar.setAttribute('transform', `translate(${leftEarX}, ${yTranslation}) scale(${earSize})`)
      rightEar.setAttribute('transform', `translate(${rightEarX}, ${yTranslation}) scale(${earSize})`)

      // Call a function to update the name wherever necessary
      this.ChangeName(name)
      window.storeData.SaveData('name', name)

      // Enable or disable the confirm button based on the input length
      if (name.length > 0 && name.length <= 12) {
        confirmButtons[1].classList.remove('disabled-button')  // Enable the button
      } else {
        confirmButtons[1].classList.add('disabled-button')  // Disable the button
      }
    })

    let age
    const ageInput = document.getElementById('age-input')
    const minAge = 0
    const maxAge = 38

    ageInput.addEventListener('input', (event) => {
      // Get the value from the input
      age = ageInput.value

      // Check if the input value is a valid number and within the age range
      if (!Number.isNaN(age) && age.trim() !== '' && age >= minAge && age <= maxAge) {
        // Update age and call your functions
        this.ChangeAge(age)
        window.storeData.SaveData('age', age)

        // Show the confirm button
        confirmButtons[2].classList.remove('disabled-button')
      } else {
        // Hide the confirm button if the input is not a valid number or out of range
        confirmButtons[2].classList.add('disabled-button')
      }
    })

    let weight
    const weightInput = document.getElementById('weight-input')
    const minWeight = 0
    const maxWeight = 20

    weightInput.addEventListener('input', (event) => {
      weight = weightInput.value
      // Check if the input value is a valid number
      if (!Number.isNaN(weight) && weight.trim() !== '' && weight >= minWeight && weight <= maxWeight) {
        // Update age and call your functions
        this.ChangeAge(weight)
        window.storeData.SaveData('weight', weight)
        // Show the confirm button
        confirmButtons[3].classList.remove('disabled-button')
      } else {
        // Hide the confirm button if the input is not a number
        confirmButtons[3].classList.add('disabled-button')
      }
    })

    let pregnant
    const preganantYes = document.getElementById('pregnant-yes')
    const preganantNo = document.getElementById('pregnant-no')
    preganantYes.addEventListener('click', (event) => {
      pregnant = 'yes'
      window.storeData.SaveData('pregnancy', pregnant)
      // confirmButtons[4].classList.remove('hidden')
      this.UpdateStage(5)
    })
    preganantNo.addEventListener('click', (event) => {
      pregnant = 'no'
      window.storeData.SaveData('pregnancy', pregnant)
      // confirmButtons[4].classList.remove('hidden')
      this.UpdateStage(5)
    })
    window.customisation = textureSwapComponent
  },
  UpdateStage(stage) {
    const stages = [
      document.getElementById('texture-screen'),
      document.getElementById('name-screen'),
      document.getElementById('age-screen'),
      document.getElementById('weight-screen'),
      document.getElementById('pregnant-screen'),
      document.getElementById('your-cat-screen'),
    ]
    stages[stage - 1].classList.add('hidden')

    if (stage < stages.length) {
      stages[stage].classList.remove('hidden')
    }

    if (stage === 5) {
      window.audio.Play('purrBreow')
    }
  },
  SwapTexture(index) {
    const textures = [
      document.getElementById('catTexture1').getAttribute('src'),
      document.getElementById('catTexture2').getAttribute('src'),
      document.getElementById('catTexture3').getAttribute('src'),
      document.getElementById('catTexture4').getAttribute('src'),
      document.getElementById('catTexture5').getAttribute('src'),
      document.getElementById('catTexture6').getAttribute('src'),
      document.getElementById('catTexture7').getAttribute('src'),
      document.getElementById('catTexture8').getAttribute('src'),
      document.getElementById('catTexture9').getAttribute('src'),
    ]

    const src = textures[index]
    const loader = new THREE.TextureLoader()
    const confirm = document.getElementById('colour-confirm')

    confirm.classList.remove('disabled-button')
    console.log(index)
    // Traverse through the object's children and apply the texture
    document.getElementById('Cat').object3D.traverse((child) => {
      if (child.isMesh) {
        // Load the textures
        const texture = loader.load(src)
        texture.flipY = false
        // Set encoding for texture
        texture.encoding = THREE.sRGBEncoding
        child.material.map = texture
        // Ensure the material updates
        child.material.needsUpdate = true
      }
    })
  },
  ChangeName(name) {
    const yourCat = document.getElementById('your-cat-name')

    yourCat.textContent = name

    // Attach event listeners to the radio buttons
    document.querySelectorAll('[id=cat-name]').forEach((txt) => {
      txt.textContent = name
    })
  },
  ChangeAge(age) {
  },
  ChangeWeight(weight) {
  },
  ChangePregnancy(pregnant) {
  },
}
