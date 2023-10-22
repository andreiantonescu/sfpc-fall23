let w, h, canvas
let PD = 1

let context, fmDevice
let gain, note, velocity, attackNote, decayNote, sustainNote, releaseNote, modRatio, modBright, attackMod, decayMod, sustainMod, releaseMod

let focalX, focalY

var prevX, prevY, dAvg = 0, avgIter = 0
var histories = {}
const maxHistories = 20
const MOUSE_ID = "mouse"
const baseSize = 10
const baseMult = 2

let allowMousePress = true
let contextRunning = false
let mouseWasPressed = false

let touchIDInPlayback = {}
let mouseID = 0
let mouseIDArray = [], colorsPerTouch = []

const colors = {mono: ["#151F47", "#2C4194", "#5370C0", "#9D92CC", "#5A9F82", "#C67BD0", "#B5E8C9"]}
let backgroundColor

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
  releaseNote.value = 250

  modRatio.value = 5.0
  modBright.value = 10.0

  attackMod.value = 10
  decayMod.value = 500
  sustainMod.value = 1.0
  releaseMod.value = 500

  context.suspend()
}

function setup() {
  w = window.innerWidth
  h = window.innerHeight

  canvas = createCanvas(w, h, WEBGL)
  noStroke()

  pixelDensity(1)
  PD = 1

  focalX = random(0.25, 0.75)
  focalY = random(0.25, 0.75)

  gslsFunctions =  
  `
  #define CL(T) clamp(T, 0.0, 1.0)
  vec3 lv(vec3 c, float i, float g, float a) {
    return pow(min(max(c-vec3(i), vec3(0.0)) / (vec3(a) - vec3(i)), vec3(1.0)), vec3(1.0/g));
  }
  float lv(float c, float i, float g, float a) {
    return(lv(vec3(c), i, g, a).r);
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

  bloom_FS = use + gslsFunctions +
  `
  uniform vec2 r;
  uniform sampler2D img;
  uniform float pr;

  void main() {
      vec2 uv = (gl_FragCoord.xy/r.xy)/pr;
      uv.y = 1.0 - uv.y;

      vec4 fragColor = texture2D(img, uv);
      float brightness = dot(fragColor.xyz, vec3(0.2126, 0.7152, 0.0722));

      if(brightness > 0.6) {
          gl_FragColor = texture2D(img, uv);
      } else {
          gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
      }
  }
  `

  additiveBlend_FS = use + gslsFunctions +
  `
  uniform vec2 r;
  uniform sampler2D img1, img2;
  uniform float pr;

  void main() {
      vec2 uv = (gl_FragCoord.xy/r.xy)/pr;
      uv.y = 1.0 - uv.y;

      const float factor = 3.0;

      vec3 img1Col = texture2D(img1, uv).rgb;
      vec3 img2Col = texture2D(img2, uv).rgb;

      vec3 result = img1Col + img2Col/factor;

      gl_FragColor = vec4(result, 1.0);
  }
  `

  blur_FS = use + gslsFunctions +
  `
  uniform vec2 r;
  uniform sampler2D img;
  uniform float pr, fx, fy, dispX1, dispY1, dispX2, dispY2, constX, constY, factorX, factorY, time, mouseX, mouseY;
  uniform bool isBloom;
  

  void main() {
      vec2 uv = (gl_FragCoord.xy/r.xy)/pr;
      uv.y = 1.0 - uv.y;

    vec2 fPoint = vec2(fx, fy);
    float dToFPoint = distance(uv, fPoint);
    float testV = lv(dToFPoint, 0.0, 0.85, 0.9);
    float brMask = CL(testV);

    const float Directions = 12.0; // BLUR DIRECTIONS (Default 16.0 - More is better but slower)
    const float Quality = 6.0; // BLUR QUALITY (Default 4.0 - More is better but slower)
    const float Size = 8.0; // BLUR SIZE (Radius)

    vec2 Radius = Size/r.xy;
    vec4 Color = texture2D(img, uv);

    const float Pi = 6.28318530718;

    for(float d=0.0; d<6.28318530718; d+=Pi/Directions) {
        for(float i=1.0/Quality; i<=1.0; i+=1.0/Quality) {
            Color += texture2D(img, uv+vec2(cos(d),sin(d))*Radius*i * (brMask*4.0 + 0.025));		
        }
    }

    Color /= Quality * Directions - 15.0;
    vec4 OriginalColor = texture2D(img, uv);
    gl_FragColor = Color;
    // gl_FragColor = texture2D(img, uv);
  }
  `
  
  drawLayer = createGraphics(w, h, WEBGL)

  blurLayer = createGraphics(w, h, WEBGL)
  blur = blurLayer.createShader(vs, blur_FS)

  drawLayer.noStroke()
  drawLayer.clear()

  rnboSetup()
  backgroundColor = getRandomRGBA(colors.mono, 255)
  drawLayer.background(backgroundColor)
  
  noLoop()
}

let playbackQueue = []

function draw() {
  if(mouseIsPressed && touches.length == 0 && contextRunning) {
    touchIDInPlayback[mouseID] = false
    if(!colorsPerTouch[mouseID]) { colorsPerTouch[mouseID] = getRandomRGBA(colors.mono, 75)}
    updateAndDraw(mouseX, mouseY, mouseID, colorsPerTouch[mouseID])
    mouseWasPressed = true
  }

  for (let i = 0; i < touches.length; i++) {
    let touch = touches[i]
    let touchID = touch.id
    touchIDInPlayback[touch.id] = false
    updateAndDraw(touch.x, touch.y, touchID)
  }

  for (let id in histories) {
    // cleanup touches no longer active
    if (!touches.some(t => t.id === Number(id)) && !mouseIDArray.includes(Number(id))) {
      if (touchIDInPlayback[id] == false && !mouseIDArray.includes(Number(id))) {
        endAndStartPlayback(id)
       }
    }
  }

  if(playbackQueue.length > 0) {
    const activePlaybackCount = Object.values(touchIDInPlayback).filter(val => val === true).length 
    for(let i = 0; i < activePlaybackCount && playbackQueue.length > 0; i++) {
      let playbackEvent = playbackQueue.shift()
      updateMod(playbackEvent.modData)
      drawEllipse({x: playbackEvent.ellipseData.x, y: playbackEvent.ellipseData.y, avgDist: playbackEvent.ellipseData.avgDist, color: playbackEvent.color})
      if (playbackEvent.noteOff) {
        sendNoteOff(playbackEvent.id)
        delete histories[playbackEvent.id]
        delete touchIDInPlayback[playbackEvent.id]
        allowMousePress = true
      }
    }
  }
  
  blurLayer.shader(blur)
  blur.setUniform("r", [w, h])
  blur.setUniform("pr", PD)
  blur.setUniform("iResolution", [w, h])
  blur.setUniform("img", drawLayer)
  blur.setUniform("time", frameCount/10)
  blur.setUniform("fx", focalX)
  blur.setUniform("fy", focalY)
  blurLayer.quad(-1, -1, 1, -1, 1, 1, -1, 1)

  image(blurLayer, -w/2, -h/2)
}

function resumeAudio() {
  document.getElementById('start').style.opacity = 0
  context.resume()
  contextRunning = true
  loop()
}

function mousePressed() {
  mouseID++
  mouseIDArray.push(mouseID)
}

function mouseReleased() {
    endAndStartPlayback(mouseID)
}

function updateAndDraw(x, y, id, color) { 
  if (contextRunning == false) { return }
  let d
  if (histories[id] && histories[id].positions.length > 0) {
      let lastPos = histories[id].positions[histories[id].positions.length - 1];
      d = dist(x, y, lastPos.x, lastPos.y)
  } else {
      d = 0
  }
  
  if (!histories[id]) {
    histories[id] = { positions: [], fullPositions: [], note: null }
  }
  histories[id].positions.push({ x: x, y: y, d: d })

  if (histories[id].positions.length > maxHistories) {
    histories[id].positions.shift()
  }

  let avgDist = average(histories[id].positions.map(item => item.d))
  histories[id].fullPositions.push({ x: x, y: y, d: avgDist, time: millis(), color: color})

  updateMod({y: y, avgDist: avgDist})
  if(histories[id].positions.length <= 1) {
    let note = floor(map(x, 0, w, 12, 115))
    histories[id].note = note
    playNote(note)
  }

  drawEllipse({x: x, y: y, avgDist: avgDist, color: color})
}

function playBackPosition(position, delay, noteOff, id) {
  // if(random()>0.5 && !id) { return }
  setTimeout(() => {
      playbackQueue.push({
        modData: {y: position.y, avgDist: position.d},
        ellipseData: {x: position.x, y: position.y, avgDist: position.d},
        noteOff: noteOff,
        id: id,
        color: position.color
      })
  }, delay)
}

function playback(id) {
  if(histories[id] && histories[id].fullPositions.length > 0) {
      let reversedHistories = [...histories[id].fullPositions].reverse()
      let accumulatedDelay = 0

      playNote(histories[id].note)

      for(let i = 0; i < reversedHistories.length - 1; i++) {
          let currentPos = reversedHistories[i]
          let nextPos = reversedHistories[i + 1]
          
          let timeDiff = currentPos.time - nextPos.time; // difference in time between positions
          
          playBackPosition(currentPos, accumulatedDelay, noteOff = false)
          accumulatedDelay += timeDiff;
      }
      playBackPosition(reversedHistories[reversedHistories.length - 1], accumulatedDelay, noteOff = true, id = id) //last
  }
}

function sendNoteOff(id) {
  if(histories[id] && histories[id].positions.length > 0) {
    let note = histories[id].note
    stopNote(note)
  }
}

function playNote(note) {
  let noteOnMessage = [
    144 + 0,
    note,
    100
  ]
  let noteOnEvent = new RNBO.MIDIEvent(context.currentTime, 0, noteOnMessage)
  fmDevice.scheduleEvent(noteOnEvent)
  // console.log("play ", note)
}

function stopNote(note) {
  let noteOffMessage = [
    128 + 0,
    note,
    0
  ]
  let noteOffEvent = new RNBO.MIDIEvent(context.currentTime, 0, noteOffMessage)
  fmDevice.scheduleEvent(noteOffEvent)
  // console.log("stop ", note)
}

function drawEllipse(pos, color) {
  drawLayer.fill(pos.color)
  let posElX = pos.x - w/2 - baseSize/2
  let posElY = pos.y - h/2 - baseSize/2
  drawLayer.ellipse(posElX, posElY, pos.avgDist * baseMult + baseSize)
  for(let i=0; i<50; i++){
    let varX = random(-10, 10) * pos.avgDist/5
    let varY = random(-10, 10) * pos.avgDist/5
    drawLayer.ellipse(posElX + varX, posElY + varY, random(baseSize*4))
  }
}

function updateMod(pos) {
  modRatio.value = map(pos.y, 0, h, 1, 32)
  modBright.value = map(pos.avgDist, 0, w/10, 1, 32)
}

async function endAndStartPlayback(id) {
  touchIDInPlayback[id] = true
  sendNoteOff(id)
  allowMousePress = false
  setTimeout(() => {
    playback(id)
  }, random(1000))
}

function average(arr) {
  let sum = arr.reduce((acc, val) => acc + val, 0)
  return sum / arr.length
}

function getRandomRGBA(colorArray, opacity = 255) {
  let randomHexColor = random(colorArray)

  let col = color(randomHexColor)
  let r = red(col)
  let g = green(col)
  let b = blue(col)

  return color(r, g, b, opacity)
}