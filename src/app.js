// Copyright (c) 2023 8th Wall, Inc.
//
// app.js is the main entry point for your 8th Wall app. Code here will execute after head.html
// is loaded, and before body.html is loaded.
import './index.css'

const onxrloaded = () => {
  XR8.CanvasScreenshot.configure({maxDimension: 1920, jpgCompression: 100})
}

window.XR8 ? onxrloaded() : window.addEventListener('xrloaded', onxrloaded)

import {startScreenComponent} from './Scripts/startscreen'
AFRAME.registerComponent('start-screen', startScreenComponent)

import {nextButtonComponent} from './Scripts/next-anim'
AFRAME.registerComponent('next-anim', nextButtonComponent)

import {AudioManager} from './Scripts/audio'
AFRAME.registerComponent('audio', AudioManager)

// Register custom A-Frame components in app.js before the scene in body.html has loaded.
import {tapPlaceComponent} from './Scripts/tap-place'
AFRAME.registerComponent('tap-place', tapPlaceComponent)

import {textureSwapComponent} from './Scripts/customisation'
// Register custom A-Frame components in app.js before the scene in body.html has loaded.
AFRAME.registerComponent('tex-swap', textureSwapComponent)

import {storeData} from './Scripts/storage'
// Register custom A-Frame components in app.js before the scene in body.html has loaded.
AFRAME.registerComponent('storage', storeData)

import {soundComponent} from './Scripts/sound'
AFRAME.registerComponent('mute-audio', soundComponent)

import {propSpawner} from './Scripts/prop-spawner'
AFRAME.registerComponent('prop-spawner', propSpawner)

import {questionnairComponent} from './Scripts/questionnair'
AFRAME.registerComponent('quiz', questionnairComponent)

import {recenterComponent} from './Scripts/recenter'
AFRAME.registerComponent('recenter', recenterComponent)

import {screenRotateComponent} from './Scripts/screen-rotate'
AFRAME.registerComponent('screen-rotate', screenRotateComponent)

import {reportComponent} from './Scripts/report'
AFRAME.registerComponent('report', reportComponent)

import {languagePicker} from './Scripts/language-picker'
AFRAME.registerComponent('language-picker', languagePicker)

import {XRExtras} from './myxrextras/xrextras.js'
window.XRExtras = XRExtras

import {permissionComponent} from './Scripts/permission-screen'
// Register custom A-Frame components in app.js before the scene in body.html has loaded.
AFRAME.registerComponent('permissions', permissionComponent)

AFRAME.registerComponent('start-context', {
  init() {
    const {el} = this
    document.getElementById('sound-on-btn').onclick = () => {
      el.components['atmoky-spatial-audio'].toggleContext()
    }
  },
})
