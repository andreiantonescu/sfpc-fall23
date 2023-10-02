let video, w, h
let loadedVideo = false, loadedAudio = false
let PD = 1

let videoAspectRatio = 1080/1920

let context
let gain, starty, dtime1, dtime2, feedback, wetdry, pbspeed

let increment = true
let ctrlValue = 0
let minV = 0
let maxV = 0.99
let damp = 2500
let speedThresh = 0.25

var dispX1 = Math.random(100)*150 + 10, dispX1Min = 0, dispX1Max = 150
var dispY1 = Math.random(100)*150 + 10, dispY1Min = 0, dispY1Max = 150
var dispX2 = Math.random(100)*150 + 10, dispX2Min = 0, dispX2Max = 150
var dispY2 = Math.random(100)*150 + 10, dispY2Min = 0, dispY2Max = 150
var factorX = 0.011, factorXMin = 0.001, factorXMax = 1.0, factorXStep = 0.01
var factorY = 0.001, factorYMin = 0.001, factorYMax = 1.0, factorYStep = 0.01

const src = ['IMG_1141']
const srcNo = Math.floor(Math.random() * src.length)

function preload() {
  video = createVideo(['video/' + src[srcNo] + '.mp4'], videoLoaded)
  video.hide()
}

function videoLoaded() {
  loadedVideo = true
}

async function rnboSetup() {
  const WAContext = window.AudioContext || window.webkitAudioContext
  context = new WAContext()

  const outputNode = context.createGain()
  outputNode.connect(context.destination)

  let response = await fetch("export/playback-fx.export.json");
  const delayPatcher = await response.json();

  const delayDevice = await RNBO.createDevice({ context, patcher: delayPatcher });
  
  // Load the exported dependencies.json file
  let dependencies = await fetch("export/dependencies.json")
  dependencies = await dependencies.json()
  dependencies[0].file = 'audio/' + src[srcNo] + '.mp3'

  // Load the dependencies into the device
  const results = await delayDevice.loadDataBufferDependencies(dependencies)
  results.forEach(result => {
      if (result.type === "success") {
          console.log(`Successfully loaded buffer with id ${result.id}`)
          loadedAudio = true
      } else {
          console.log(`Failed to load buffer with id ${result.id}, ${result.error}`)
      }
  });

  // Connect the devices in series
  delayDevice.node.connect(outputNode)
  
  //get parameters
  gain = delayDevice.parametersById.get("gain")
  starty = delayDevice.parametersById.get("on-off")
  dtime1 = delayDevice.parametersById.get("delay-time-1")
  dtime2 = delayDevice.parametersById.get("delay-time-2")
  feedback = delayDevice.parametersById.get("feedback")
  wetdry = delayDevice.parametersById.get("wet-dry")
  pbspeed = delayDevice.parametersById.get("pb-speed")
  
  gain.value = 1.0
  feedback.value = 0.0
  dtime1.value = 25.0
  dtime2.value = 35.0
  wetdry.value = 0.0
  starty.enumValue = "one"
  pbspeed.value = 1

  context.suspend()
}

function setup() {
  setupAspectRatio(window.innerHeight, window.innerWidth)

  createCanvas(w, h, WEBGL)
  noStroke()

  PD = displayDensity()

  gslsFunctions =  
  `
  vec2 sineWave(vec2 p, float dispX1, float dispY1, float dispX2, float dispY2 ,float constX, float constY, float factorX, float factorY, float time) {
      float x = sin(dispX1 * p.x + dispX2 * p.y + constX + time) * factorX;
      float y = sin(dispY1 * p.y + dispY2 * p.x + constY + time) * factorY;
      return vec2(p.x + x, p.y + y);
  }

  vec3 saturation(vec3 rgb, float adjustment) {
      // Algorithm from Chapter 16 of OpenGL Shading Language
      const vec3 W = vec3(0.2125, 0.7154, 0.0721);
      vec3 intensity = vec3(dot(rgb, W));
      return mix(intensity, rgb, adjustment);
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
  uniform float pr, dispX1, dispY1, dispX2, dispY2, constX, constY, factorX, factorY, time;

  void main() {
      vec2 uv = (gl_FragCoord.xy/r.xy)/pr;
      uv.y = 1.0 - uv.y;

      vec4 color = texture2D(img, sineWave(uv, dispX1, dispY1, dispX2, dispY2, constX, constY, factorX, factorY, time));
      gl_FragColor = vec4(saturation(color.xyz, 1.0 + factorX * 250.0), 1.0);
    // gl_FragColor = texture2D(img, uv);
  }
  `
  
  layer1 = createGraphics(w, h, WEBGL)
  warp = layer1.createShader(vs, warp_FS)

  // UI Debug Stuff
  // var gui = createGui('September')
  // gui.addGlobals('dispX1', 'dispY1', 'dispX2', 'dispY2', 'factorX', 'factorY')

  rnboSetup()
  noLoop()
}

function setupAspectRatio(width, height) {
  let localAspectRatio = height / width
  if(videoAspectRatio > localAspectRatio) {
    w = window.innerWidth
    h = w * 1/videoAspectRatio
  } else {
    h = window.innerHeight
    w = h * 1/videoAspectRatio
  }
}

function draw() {
    if (increment && frameCount > 300) {
      ctrlValue += 1/damp
      if (ctrlValue >= maxV) {
          increment = false
      }
    } else if (frameCount > 300) {
      ctrlValue -= 1/damp
        if (ctrlValue <= minV) {
            increment = true
        }
    }
    
    if(ctrlValue > speedThresh) {    
      pbspeed.value = 1-ctrlValue + speedThresh
      video.speed(1-ctrlValue + speedThresh)
    }

    if(feedback != undefined && wetdry != undefined) {
      feedback.value = ctrlValue
      wetdry.value = ctrlValue
    }

    layer1.shader(warp)
    warp.setUniform("r", [w, h])
    warp.setUniform("pr", PD)
    warp.setUniform("iResolution", [w, h])
    warp.setUniform("img", video)
    warp.setUniform("time", frameCount/100)
    warp.setUniform("dispX1", dispX1)
    warp.setUniform("dispY1", dispY1)
    warp.setUniform("dispX2", dispX2)
    warp.setUniform("dispY2", dispY2)
    warp.setUniform("factorX", ctrlValue / 65)
    warp.setUniform("factorY", ctrlValue / 75)
    layer1.quad(-1, -1, 1, -1, 1, 1, -1, 1)

    image(layer1, -w/2, -h/2)
}

function start() {
  if (loadedVideo == false || loadedAudio == false) { return }
  video.volume(0)
  context.resume()
  video.loop()
  loop()
  document.getElementById('intro').style.opacity = 0
}

function mousePressed() {
  start()
}

function touchStarted() {
  start()
  return false
}