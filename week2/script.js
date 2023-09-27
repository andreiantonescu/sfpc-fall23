let video
let w = window.innerWidth
let h = window.innerHeight
let loaded = false
let PD = 1

let context
let gain, starty, dtime1, feedback, wetdry

let increment = true
let ctrlValue = 0
let minV = 0
let maxV = 0.99
let damp = 1000

var dispX1 = 75, dispX1Min = 0, dispX1Max = 200
var dispY1 = 46, dispY1Min = 0, dispY1Max = 200
var dispX2 = 66, dispX2Min = 0, dispX2Max = 200
var dispY2 = 29, dispY2Min = 0, dispY2Max = 200
var factorX = 0.011, factorXMin = 0.001, factorXMax = 1.0, factorXStep = 0.01
var factorY = 0.001, factorYMin = 0.001, factorYMax = 1.0, factorYStep = 0.01

function preload() {
  video = createVideo(['video/IMG_1091.mp4'], videoLoaded);
}

function videoLoaded() {
    loaded = true
    // video.loop()
}

async function rnboSetup() {
  const WAContext = window.AudioContext || window.webkitAudioContext;
  context = new WAContext();
  /* Create "gain" node (volume) and connect it to the audio output
  This is Web Audio API
  */
  // Fetch the exported patchers
  let response = await fetch("export/playback-fx.export.json");
  const playerPatcher = await response.json();

  // Create the devices
  const playerDevice = await RNBO.createDevice({ context, patcher: playerPatcher });
  
  // Load the exported dependencies.json file
  let dependencies = await fetch("export/dependencies.json")
  dependencies = await dependencies.json()

  // Load the dependencies into the device
  const results = await playerDevice.loadDataBufferDependencies(dependencies)
  results.forEach(result => {
      if (result.type === "success") {
          console.log(`Successfully loaded buffer with id ${result.id}`)
      } else {
          console.log(`Failed to load buffer with id ${result.id}, ${result.error}`)
      }
  });

  // Connect the devices in series
  playerDevice.node.connect(context.destination)
  
  //get parameters
  gain = playerDevice.parametersById.get("gain")
  starty = playerDevice.parametersById.get("on-off")
  dtime1 = playerDevice.parametersById.get("delay-time-1")
  feedback = playerDevice.parametersById.get("feedback")
  wetdry = playerDevice.parametersById.get("wet-dry")
  
  gain.value = 1.0
  feedback.value = 0.0
  dtime1.value = 2000
  wetdry.value = 0.0
  starty.enumValue = "one"

  context.suspend()
}

function setup() {
  createCanvas(w, h, WEBGL)
  noStroke()

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
  uniform float pr, dispX1, dispY1, dispX2, dispY2, constX, constY, factorX, factorY, time;

  void main() {
      vec2 uv = (gl_FragCoord.xy/r.xy)/pr;
      uv.y = 1.0 - uv.y;

      gl_FragColor = texture2D(img, sineWave(uv, dispX1, dispY1, dispX2, dispY2, constX, constY, factorX, factorY, time));
    // gl_FragColor = texture2D(img, uv);
  }
  `
  
  layer1 = createGraphics(w, h, WEBGL)
  warp = layer1.createShader(vs, warp_FS)

  var gui = createGui('September24')
  gui.addGlobals('dispX1', 'dispY1', 'dispX2', 'dispY2', 'factorX', 'factorY')

  rnboSetup()
  noLoop()
}

function draw() {
    // if(frameCount%20==0) { console.log(floor(frameRate()))}

    if (increment) {
      ctrlValue += 1/damp
      if (ctrlValue >= maxV) {
          increment = false
      }
    } else {
      ctrlValue -= 1/damp
        if (ctrlValue <= minV) {
            increment = true
        }
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
    warp.setUniform("factorX", ctrlValue / 75)
    warp.setUniform("factorY", ctrlValue / 75)
    layer1.quad(-1, -1, 1, -1, 1, 1, -1, 1)

    image(layer1, -w/2, -h/2)
}

function mousePressed() {
    if (loaded == false) { return }
    video.hide()
    video.volume(0)
    video.loop()
    context.resume()
    loop()
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight)
    w = windowWidth
    h = windowHeight
  }