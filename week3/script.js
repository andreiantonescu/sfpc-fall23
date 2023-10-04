let w, h, canvas
let PD = 1

let context
let gain, starty, dtime1, dtime2, feedback, wetdry, pbspeed

let increment = true
let ctrlValue = 0
let minV = 0
let maxV = 0.99
let damp = 2500
let speedThresh = 0.25

var dispX1 = 69, dispX1Min = 0, dispX1Max = 150
var dispY1 = 72, dispY1Min = 0, dispY1Max = 150
var dispX2 = 68, dispX2Min = 0, dispX2Max = 150
var dispY2 = 61, dispY2Min = 0, dispY2Max = 150
var factorX = 5.271, factorXMin = 0.001, factorXMax = 10.0, factorXStep = 0.01
var factorY = 3.671, factorYMin = 0.001, factorYMax = 10.0, factorYStep = 0.01

var prevX, prevY, dAvg = 0, avgIter = 0
var histories = {}
const maxHistories = 10
const MOUSE_ID = "mouse"
const baseSize = 50
const baseMult = 4

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
  w = window.innerWidth
  h = window.innerHeight

  canvas = createCanvas(w, h, WEBGL)
  // canvas.mouseOver(drawEllipse)
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
  var gui = createGui('September')
  gui.addGlobals('dispX1', 'dispY1', 'dispX2', 'dispY2', 'factorX', 'factorY')

  // rnboSetup()dfs
  // noLoop()
  drawLayer.noStroke()
}

function draw() {
  drawLayer.background('red')
  if(mouseIsPressed) {
    updateAndDraw(mouseX, mouseY, MOUSE_ID)
  }

  for (let i = 0; i < touches.length; i++) {
    let touch = touches[i]
    let touchID = touch.id

    updateAndDraw(touch.x, touch.y, touchID)
  }

  for (let id in histories) {
    // cleanup touches no longer active
    if (!touches.some(t => t.id === id) && id !== MOUSE_ID) {
      delete histories[id];
    }
  }

  warpLayer.shader(warp)
  warp.setUniform("r", [w, h])
  warp.setUniform("pr", PD)
  warp.setUniform("iResolution", [w, h])
  warp.setUniform("img", drawLayer)
  warp.setUniform("time", frameCount/100)
  warp.setUniform("dispX1", dispX1)
  warp.setUniform("dispY1", dispY1)
  warp.setUniform("dispX2", dispX2)
  warp.setUniform("dispY2", dispY2)
  warp.setUniform("factorX", factorX)
  warp.setUniform("factorY", factorY)
  warp.setUniform("mouseX", -w/2)
  warp.setUniform("mouseY", -h/2)

  warpLayer.quad(-1, -1, 1, -1, 1, 1, -1, 1)
  image(warpLayer, -w/2, -h/2)
  // fill('yellow')
  // ellipse(0, 0, 100)
}

function updateAndDraw(x, y, id) {
  let d
  if (histories[id] && histories[id].length > 0) {
      let lastPos = histories[id][histories[id].length - 1];
      d = dist(x, y, lastPos.x, lastPos.y)
  } else {
      d = 0
  }
  
  if (!histories[id]) {
    histories[id] = []
  }

  histories[id].push({ x: x, y: y, d: d })

  if (histories[id].length > maxHistories) {
    histories[id].shift()
  }

  let avgDist = average(histories[id].map(item => item.d))

  drawLayer.ellipse(x - w/2 - baseSize/2, y - h/2 - baseSize/2, avgDist * baseMult + baseSize)
}

function average(arr) {
  let sum = arr.reduce((acc, val) => acc + val, 0)
  return sum / arr.length
}