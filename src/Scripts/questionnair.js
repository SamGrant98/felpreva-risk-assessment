import {translationsMap} from './language-picker'

const questionnairComponent = {
  facts: [],
  stages: [],
  bothBool: false,
  currentLanguage: document.documentElement.lang || 'en',
  parasitesEnabled: true,
  lastStage: 0,
  async init() {
    window.questions = this
    await this.loadFacts(this.currentLanguage)
    const startQuiz = document.getElementById('start-quiz')
    this.skipDelay = false

    this.stages = [
      document.getElementById('question-1'),
      document.getElementById('question-2'),
      document.getElementById('question-3'),
      document.getElementById('question-4'),
      document.getElementById('question-5'),
      document.getElementById('question-6'),
      document.getElementById('data-intro'),
      document.getElementById('question-7'),
      document.getElementById('question-8'),
      document.getElementById('question-9'),
      document.getElementById('question-10'),
      document.getElementById('question-11'),
      document.getElementById('question-12'),
    ]

    startQuiz.addEventListener('click', (event) => {
      this.StartQuiz()
    })
    document.querySelectorAll('.button, .small-button').forEach((button) => {
    // Check if the element has exactly the class 'button' and no other classes
      if (button.dataset.question) {
        button.addEventListener('click', (event) => {
          const questionIndex = parseInt(button.dataset.question, 10)
          const answer = button.dataset.answer
          console.log('Q' + questionIndex + ': ' + answer)
          window.storeData.SaveData('Q' + questionIndex, answer)
          this.UpdateQuestion(questionIndex, answer)
        })
      }
    })
    document.querySelectorAll('.back-button').forEach((button) => {
    // Check if the element has exactly the class 'button' and no other classes
      if (button.dataset.answer) {
        button.addEventListener('click', (event) => {
          const questionIndex = parseInt(button.dataset.question, 10)
          const answer = button.dataset.answer
          window.storeData.SaveData('Q' + questionIndex, answer)
          this.UpdateQuestion(questionIndex, answer)
        })
      }
    })
    const skipButton = document.getElementById('skip-button')
    if (skipButton) {
      skipButton.addEventListener('click', () => {
        this.skipDelay = true
      })
    }
  },
  async loadFacts(language) {
    try {
      // keep a normalized language handy
      this.currentLanguage = (language || 'en').toLowerCase()

      // disable parasites for French (handles fr, fr-FR, fr-CA, etc.)
      this.parasitesEnabled = !this.currentLanguage.startsWith('fr')

      // if we just turned them off, clean up any on-screen particles
      if (!this.parasitesEnabled) {
        this.ClearParticles()
      }

      const translations = translationsMap[language] || translationsMap['en']
      if (translations?.placement) {
        this.facts = [
          translations.placement.multiple_cat,
          translations.questions.outdoor_warning,
          translations.questions.other_pets_warning,
          translations.questions.balcony_warning,
          translations.questions.hunting_warning,
          translations.questions.raw_meat_warning,
          translations.questions.household_warning,
          translations.treatment.options_risk_worms,
          translations.treatment.options_risk_fleas,
          translations.treatment.options_risk_parasites,
        ];
      } else {
        console.error("Translations object is missing required properties.")
      }
    } catch (error) {
      console.error("Error loading translations:", error)
    }
  },
  async StartQuiz() {
    const currentScreen = document.getElementById('your-cat-screen')
    currentScreen.classList.add('hidden')

    const riskIntro = document.getElementById('risk-intro')
    riskIntro.classList.remove('hidden')

    await this.delay(5200)

    riskIntro.classList.add('hidden')
    const questionOne = document.getElementById('question-1')
    questionOne.classList.remove('hidden')
  },
  async UpdateQuestion(index, answer) {
    let delay
    let stage = index

    if (answer === 'back') {
      this.stages[this.lastStage].classList.add('hidden')
      switch (stage) {
        case 0:
          window.propSpawner.DeleteProp(0)
          window.propSpawner.DeleteProp(1)
          window.propSpawner.DeleteProp(2)
          window.propSpawner.DeleteProp(4)
          break
        case 1:
          window.propSpawner.DeleteProp(3)
          break
        case 2:
          window.propSpawner.DeleteProp(5)
          break
        case 3:
          window.propSpawner.DeleteProp(6)
          break
        case 4:
          window.propSpawner.DeleteProp(7)
          break
        default:
      }
      this.stages[stage].classList.remove('hidden')
      this.lastStage = stage
    } else {
      this.stages[this.lastStage].classList.add('hidden')

      if (stage < this.stages.length) {
        switch (stage) {
          case 0:
            window.audio.Play('chirup')
            break
          case 1:
          // Does XXX go outside?
            window.playAnim.Play('_head_tilt')  // tilt
            window.audio.Play('chirup')
            if (answer === 'no') {
              window.propSpawner.SpawnProp(2)  // Spawns Table
              this.UpdateDYK(1)
              window.propSpawner.SpawnProp(4)  // Spawns wellies
              delay = 5200
            } else {
              window.propSpawner.SpawnProp(0)  // Spawns flowers
              window.propSpawner.SpawnProp(1)  // Spawns flowers
              this.UpdateDYK(1)
              window.propSpawner.SpawnProp(4)  // Spawns wellies
              delay = 5200
            }
            break
          case 2:
          // Does XXX live with any other pets that go outside?
            if (answer === 'no') {
              window.playAnim.Play('_purr')  // purr
              window.audio.Play('purr')
              delay = 1000
            } else {
              window.propSpawner.SpawnProp(3)  // Spawns bowl
              window.playAnim.Play('_head_tilt')  // tilt
              window.audio.Play('breow')
              this.UpdateDYK(2)
              delay = 5200
            }
            break
          case 3:
          // Does XXX have access to a balcony or terrace?
            if (answer === 'no') {
              window.playAnim.Play('_nono')  // shakes head
              delay = 1000
            } else {
              window.playAnim.Play('_snail')  // watch snail
              window.audio.Play('chirup')
              window.propSpawner.SpawnProp(5)  // Spawns snail
              this.UpdateDYK(3)
              delay = 5200
            }
            break
          case 4:
          // Does XXX regularly hunt?
            if (answer === 'never') {
              window.playAnim.Play('_nono')  // shakes head
              window.propSpawner.SpawnProp(6)  // Spawns mouse
              delay = 5200
            } else {
              window.propSpawner.SpawnProp(6)  // Spawns mouse
              window.playAnim.Play('_hunt_loop')  // hunting
              window.audio.Play('breow')
              this.UpdateDYK(4)
              delay = 5200
            }
            break
          case 5:
          // Does XXX eat raw meat?
            if (answer === 'no') {
              window.playAnim.Play('_nono')  // shakes head
              delay = 1000
            } else {
              window.propSpawner.SpawnProp(7)  // Spawns meat
              window.playAnim.Play('_purr')  // purr
              window.audio.Play('purr')
              this.UpdateDYK(5)
              delay = 5200
            }
            break
          case 6:
          // Is anyone in your household under the age of 8, pregnant or immunosuppressed?
            if (answer === 'no') {
              window.playAnim.Play('_nono')  // shakes head
              delay = 1000
            } else {
              window.playAnim.Play('_happy_meow')  // happy meow
              window.audio.Play('breow')
              this.UpdateDYK(6)
              delay = 5200
            }
            break
            case 7:
            // PAWSOME!
            window.playAnim.Play('_head_tilt')
            window.audio.Play('purrBreow')
            delay = 1000
              break
          case 8:
          // What type of parasite protection do you use on XXX?
            window.playAnim.Play('_happy_meow')  // happy meow
            window.audio.Play('breow')
            delay = 5200
            if (answer === 'both') {
              stage = 9
              this.bothBool = true
            } else if (answer === 'wormer') {
              stage = 9
              this.UpdateDYK(8)
              window.questions.SpawnParticles('#parasiteIcon1', 0)
              window.questions.SpawnParticles('#parasiteIcon3', 2)
              window.questions.SpawnParticles('#parasiteIcon6', 5)
            } else if (answer === 'flea & tick') {
              stage = 10
              this.UpdateDYK(7)
              window.questions.SpawnParticles('#parasiteIcon2', 1)
              window.questions.SpawnParticles('#parasiteIcon4', 3)
              window.questions.SpawnParticles('#parasiteIcon5', 4)
            } else if (answer === 'none') {
              stage = 11
              this.UpdateDYK(9)
              window.questions.SpawnParticles('#parasiteIcon1', 0)
              window.questions.SpawnParticles('#parasiteIcon2', 1)
              window.questions.SpawnParticles('#parasiteIcon3', 2)
              window.questions.SpawnParticles('#parasiteIcon4', 3)
              window.questions.SpawnParticles('#parasiteIcon5', 4)
              window.questions.SpawnParticles('#parasiteIcon6', 5)
            } else if (answer === 'all-in-one') {
              stage = 8
            } else if (answer === 'dont know') {
              stage = 11
            }
            break
          case 9:
          // How often do you treat XXX for parasites?
            window.playAnim.Play('_tail')  // tail
            window.audio.Play('chirup')
            delay = 1000
            stage = 11
            break
          case 10:
          // How often do you treat XXX for worms?
            window.playAnim.Play('_ear')  // ear
            window.audio.Play('purr')
            if (!this.bothBool) {
              stage = 11
              delay = 1000
            } else {
              delay = 1000
            }
            break
          case 11:
          // How often do you treat XXX for fleas and ticks?
            window.playAnim.Play('_ear')  // ear
            window.audio.Play('chirup')
            delay = 1000
            break
          case 12:
          // How frequently would you like to treat XXX for parasites? 
            window.playAnim.Play('_ear')  // ear
            window.audio.Play('breow')
            delay = 1000
            break
          case 13:
          // What type of parasite treatment would you prefer to use on XXX?
            window.playAnim.Play('_ear')  // ear
            window.audio.Play('chirup')
            delay = 1000
            break
          default:
        }
        // Add a delay before showing the next stage
        await this.delay(delay)  // 500ms delay (adjust as needed)
        this.stages[stage].classList.remove('hidden')
        console.log('Stage: ' + stage)
        this.lastStage = stage
        this.CloseDYK()
        this.ClearParticles()
      } else {
        this.Capture()
        window.playAnim.Play('_ear')
        window.audio.Play('purrBreow')
      }
    }
  },
  delay(ms) {
    return new Promise(resolve => {
      const start = Date.now()
      const check = () => {
        if (this.skipDelay) {
          this.skipDelay = false // reset it for future stages
          resolve()
        } else if (Date.now() - start >= ms) {
          resolve()
        } else {
          requestAnimationFrame(check)
        }
      }
      check()
    })
  },
  Capture() {
    const record = document.getElementById('recorder')
    record.classList.remove('hidden')
    const thanks = document.getElementById('thanks-screen')
    thanks.classList.remove('hidden')
    const recenter = document.getElementById('resetButton')
    recenter.classList.remove('hidden')
    window.playAnim.Play('_ear')  // ear
    
    window.storeData.TrackStep('results')
  },
  SpawnParticles(texture, index) {

    if (!this.parasitesEnabled) return

    // Predefined offset positions relative to the cat
    const predefinedOffsets = [
      {x: 4, y: 2, z: 0},  // Right of the cat
      {x: -4, y: 2, z: 0},  // Left of the cat
      {x: -2, y: 0, z: 4},  // Front of the cat
      {x: 0, y: 2, z: -4},  // Behind the cat
      {x: 3, y: -1, z: 2},  // Diagonal right front
      {x: -3, y: 4, z: -2},  // Diagonal left back
    ]

    const parasiteParticles = document.createElement('a-image')
    const parasitePos = document.getElementById('Cat').getAttribute('position')
    const parasiteRot = document.getElementById('Cat').getAttribute('rotation')

    // Select the offset position based on the passed index or random if not provided
    const offset = predefinedOffsets[index] || predefinedOffsets[Math.floor(Math.random() * predefinedOffsets.length)]

    // Calculate the actual position based on the cat's position and the selected offset
    const initPos = {
      x: parasitePos.x + offset.x,  // Use the cat's position + offset x
      y: parasitePos.y + offset.y + 3,  // Fixed height above the cat
      z: parasitePos.z + offset.z,  // Use the cat's position + offset z
    }

    // Set the attributes for the particle
    parasiteParticles.setAttribute('class', 'parasite')
    parasiteParticles.setAttribute('rotation', parasiteRot)
    parasiteParticles.setAttribute('position', `${initPos.x} ${initPos.y} ${initPos.z}`)
    parasiteParticles.setAttribute('src', texture)
    parasiteParticles.setAttribute('scale', '1.5 1.5 1.5')  // Changed scale to 1.5
    parasiteParticles.setAttribute('material', 'shader: flat; transparent: true;')

    // Add animation attributes
    parasiteParticles.setAttribute('animation', {
      property: 'position',
      dir: 'alternate',
      dur: 3000,  // Duration of the animation in milliseconds
      to: this.GetRandomPosition(initPos),  // Get random position for animation
      loop: true,
      easing: 'easeInOutSine',
    })
    // Append the particle to the scene
    this.el.sceneEl.appendChild(parasiteParticles)
  },
  // Function to generate a random position around the given position
  GetRandomPosition(initPos) {
    const offset = 1  // Adjust this value to control the floating range
    const x = initPos.x + (Math.random() * offset * 2 - offset)
    const y = initPos.y + (Math.random() * offset * 2 - offset)
    const z = initPos.z + (Math.random() * offset * 2 - offset)
    return `${x} ${y} ${z}`
  },
  // Function to clear all spawned particles from the scene
  ClearParticles() {
    // Select all parasite elements in the scene
    const parasites = this.el.sceneEl.querySelectorAll('.parasite')

    parasites.forEach(particle => {
      // Remove the particle from the scene
      this.el.sceneEl.removeChild(particle)
    })

    // Debug: Log confirmation of clearing
    // console.log('All parasite particles have been cleared from the scene.')
  },
  UpdateDYK(index) {
    const dyk = document.getElementById('didYouKnow')
    const dykText = document.getElementById('dkyText')

    dykText.textContent = this.facts[index]
    dyk.classList.remove('hidden')
  },
  CloseDYK() {
    const dyk = document.getElementById('didYouKnow')
    dyk.classList.add('hidden')
    // window.playAnim.Play(1)
  },
}

export {questionnairComponent}
