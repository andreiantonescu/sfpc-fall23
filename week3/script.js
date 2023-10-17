let w, h, canvas
let PD = 1

let context, fmDevice
let gain, note, velocity, attackNote, decayNote, sustainNote, releaseNote, modRatio, modBright, attackMod, decayMod, sustainMod, releaseMod

var dispX1 = 69, dispX1Min = 0, dispX1Max = 150
var dispY1 = 72, dispY1Min = 0, dispY1Max = 150
var dispX2 = 68, dispX2Min = 0, dispX2Max = 150
var dispY2 = 61, dispY2Min = 0, dispY2Max = 150
var factorX = 9.271, factorXMin = 0.001, factorXMax = 100.0, factorXStep = 0.01
var factorY = 25, factorYMin = 0.001, factorYMax = 100.0, factorYStep = 0.01

var prevX, prevY, dAvg = 0, avgIter = 0
var histories = {}
const maxHistories = 10
const MOUSE_ID = "mouse"
const baseSize = 10
const baseMult = 2

let contextRunning = false

async function rnboSetup() {
  const WAContext = window.AudioContext || window.webkitAudioContext
  context = new WAContext()

  const outputNode = context.createGain()
  outputNode.connect(context.destination)

  let response = await fetch("export/FMThing.export.json")
  const fmPatcher = await response.json()

  fmDevice = await RNBO.createDevice({ context, patcher: fmPatcher })

  // Connect the devices in series
  fmDevice.node.connect(outputNode)
  
  //get parameters
  gain = fmDevice.parametersById.get("gain")
  note = fmDevice.parametersById.get("note")
  velocity = fmDevice.parametersById.get("velocity")

  attackNote = fmDevice.parametersById.get("attackNote")
  decayNote = fmDevice.parametersById.get("decayNote")
  sustainNote = fmDevice.parametersById.get("sustainNote")
  releaseNote = fmDevice.parametersById.get("releaseNote")

  modRatio = fmDevice.parametersById.get("modRatio")
  modBright = fmDevice.parametersById.get("modBright")

  attackMod = fmDevice.parametersById.get("attackMod")
  decayMod = fmDevice.parametersById.get("decayMod")
  sustainMod = fmDevice.parametersById.get("sustainMod")
  releaseMod = fmDevice.parametersById.get("releaseMod")
  
  gain.value = 0.5

  attackNote.value = 10
  decayNote.value = 500
  sustainNote.value = 1.0
  releaseNote.value = 2500

  modRatio.value = 5.0
  modBright.value = 10.0

  attackMod.value = 10
  decayMod.value = 500
  sustainMod.value = 1.0
  releaseMod.value = 2500

  context.suspend()
}

function setup() {
  w = window.innerWidth
  h = window.innerHeight

  canvas = createCanvas(w, h, WEBGL)

  startButton = createButton('Lets GOOOOO');
  startButton.position(w/2, h/2)
  startButton.mousePressed(resumeAudio)
  noStroke()

  pixelDensity(1)
  PD = 1

  gslsFunctions =  
  `
  vec2 sineWave(vec2 p, float dispX1, float dispY1, float dispX2, float dispY2 ,float constX, float constY, float factorX, float factorY, float time) {
      float x = sin(dispX1 * p.x + dispX2 * p.y + constX + time) * factorX;
      float y = sin(dispY1 * p.y + dispY2 * p.x + constY + time) * factorY;
      return vec2(p.x + x, p.y + y);
  }
  `
  use = `precision highp float; varying vec2 vPos;`
  vs = use + `
  attribute vec3 aPosition;
  
  void main() {
      vec4 positionVec4 = vec4(aPosition, 1.0);
      gl_Position = positionVec4;
  }
  `

  warp_FS = use + gslsFunctions +
  `
  uniform vec2 r;
  uniform sampler2D img;
  uniform float pr, dispX1, dispY1, dispX2, dispY2, constX, constY, factorX, factorY, time, mouseX, mouseY;

  void main() {
      vec2 uv = (gl_FragCoord.xy/r.xy)/pr;
      uv.y = 1.0 - uv.y;

      float d = distance(uv, vec2(mouseX, mouseY));
      gl_FragColor = texture2D(img, sineWave(uv, dispX1, dispY1, dispX2, dispY2, constX, constY, factorX/d, factorY/d, time));
    // gl_FragColor = texture2D(img, uv);
  }
  `
  
  drawLayer = createGraphics(w, h, WEBGL)

  warpLayer = createGraphics(w, h, WEBGL)
  warp = warpLayer.createShader(vs, warp_FS)

  // UI Debug Stuff
  // var gui = createGui('September')
  // gui.addGlobals('dispX1', 'dispY1', 'dispX2', 'dispY2', 'factorX', 'factorY')

  drawLayer.noStroke()
  drawLayer.background(15, 15, 15)

  rnboSetup()
}

function draw() {
  drawLayer.background(15, 15, 15, 10)
  if(mouseIsPressed && touches.length == 0) {
    updateAndDraw(mouseX, mouseY, MOUSE_ID)
  }

  for (let i = 0; i < touches.length; i++) {
    let touch = touches[i]
    let touchID = touch.id

    updateAndDraw(touch.x, touch.y, touchID)
  }

  for (let id in histories) {
    // cleanup touches no longer active
    if (!touches.some(t => t.id === Number(id)) && id !== MOUSE_ID) {
      sendNoteOff(id)
      delete histories[id]
    }
  }

  warpLayer.shader(warp)
  warp.setUniform("r", [w, h])
  warp.setUniform("pr", PD)
  warp.setUniform("iResolution", [w, h])
  warp.setUniform("img", drawLayer)
  warp.setUniform("time", frameCount/10)
  warp.setUniform("dispX1", dispX1)
  warp.setUniform("dispY1", dispY1)
  warp.setUniform("dispX2", dispX2)
  warp.setUniform("dispY2", dispY2)
  warp.setUniform("factorX", map(mouseY, 0, h, 0, 50))
  warp.setUniform("factorY", map(mouseY, 0, h, 0, 50))
  warp.setUniform("mouseX", -w/2)
  warp.setUniform("mouseY", -h/2)

  warpLayer.quad(-1, -1, 1, -1, 1, 1, -1, 1)
  image(warpLayer, -w/2, -h/2)
}

function resumeAudio() {
  context.resume()
  contextRunning = true
}

function mouseReleased() {
  sendNoteOff(MOUSE_ID)
  delete histories[MOUSE_ID]
}

function updateAndDraw(x, y, id) {
  // if (contextRunning == false) { return }
  let d
  if (histories[id] && histories[id].positions.length > 0) {
      let lastPos = histories[id].positions[histories[id].positions.length - 1];
      d = dist(x, y, lastPos.x, lastPos.y)
  } else {
      d = 0
  }
  
  if (!histories[id]) {
    histories[id] = { positions: [], note: null }
  }
  if(histories[id].positions.length < 1) {
    let note = floor(map(x, 0, w, 12, 115))
    histories[id].note = note
    let noteOnMessage = [
      144 + 0,
      note,
      100
    ]
    let noteOnEvent = new RNBO.MIDIEvent(context.currentTime, 0, noteOnMessage)
    fmDevice.scheduleEvent(noteOnEvent)
  }

  histories[id].positions.push({ x: x, y: y, d: d })

  if (histories[id].positions.length > maxHistories) {
    histories[id].positions.shift()
  }

  let avgDist = average(histories[id].positions.map(item => item.d))

  modRatio.value = map(y, 0, h, 0, 32)
  modBright.value = map(avgDist, 0, w/10, 0, 32)

  drawLayer.ellipse(x - w/2 - baseSize/2, y - h/2 - baseSize/2, avgDist * baseMult + baseSize)
}

function sendNoteOff(id) {
  if(histories[id] && histories[id].positions.length > 0) {
    let note = histories[id].note
    let noteOffMessage = [
      128 + 0,
      note,
      0
    ]
    let noteOffEvent = new RNBO.MIDIEvent(context.currentTime, 0, noteOffMessage)
    fmDevice.scheduleEvent(noteOffEvent)
  }
}

function average(arr) {
  let sum = arr.reduce((acc, val) => acc + val, 0)
  return sum / arr.length
}