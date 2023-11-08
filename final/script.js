import * as THREE from 'three'

import Stats from 'three/addons/libs/stats.module.js';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RectAreaLightHelper } from 'three/addons/helpers/RectAreaLightHelper.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';

let renderer, scene, camera;
let stats, meshKnot;

init();

function init() {

  renderer = new THREE.WebGLRenderer( { antialias: true } );
  renderer.setPixelRatio( window.devicePixelRatio );
  renderer.setSize( window.innerWidth, window.innerHeight );
  renderer.setAnimationLoop( animation );
  document.body.appendChild( renderer.domElement );

  camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 1000 )
  camera.position.set(0, 1, -1)

  scene = new THREE.Scene()

  const geoFloor = new THREE.BoxGeometry( 2000, 0.1, 2000 );
  const matStdFloor = new THREE.MeshBasicMaterial( { color: 0xf012aa, roughness: 0.25, metalness: 0 } );
  const mshStdFloor = new THREE.Mesh( geoFloor, matStdFloor );

  // scene.add( mshStdFloor );

  // helpers
  const axesHelper = new THREE.AxesHelper(50)
  scene.add(axesHelper)

  const size = 50
  const divisions = 100
  const gridHelper = new THREE.GridHelper(size, divisions)
  scene.add(gridHelper)


  // add ROOM
  const materialArray = [
    new THREE.MeshBasicMaterial( { color: 0xffbcbc, side: THREE.BackSide  } ), // Left wall
    new THREE.MeshBasicMaterial( { color: 0xffbcbc, side: THREE.BackSide  } ), // Right wall
    new THREE.MeshBasicMaterial( { color: 0xbbbcbc, side: THREE.BackSide  } ), // Top wall
    new THREE.MeshBasicMaterial( { color: 0x222222, side: THREE.BackSide  } ), // Bottom wall
    new THREE.MeshBasicMaterial( { color: 0xcccccc, side: THREE.BackSide  } ), // Front wall
    new THREE.MeshBasicMaterial( { color: 0xaaaaaa, side: THREE.BackSide  } ), // Back wall
  ];

  const roomSize = 15
  const roomHeight = 4
  const directionalLight = new THREE.SpotLight(0xffffff);
  directionalLight.position.set(- 5, 5, 150); // Adjust the position accordingly
  directionalLight.castShadow = true
  scene.add(directionalLight)

  const roomWidth = roomSize * Math.random() + roomSize/2
  const roomDepth = roomSize * Math.random() + roomSize
  const roomGeometry = new THREE.BoxGeometry(roomWidth, roomHeight, roomDepth);
  // Create the room mesh
  const roomMesh = new THREE.Mesh(roomGeometry, materialArray);
  roomMesh.position.set(0, 0, 0);
  scene.add(roomMesh)

  // add WINDOW
  const windowWidth = roomWidth * Math.random()
  const windowHeight = roomHeight * Math.random()
  RectAreaLightUniformsLib.init()
  const rectLight1 = new THREE.RectAreaLight( 0xfff5ff, 1, windowWidth > 1 ? windowWidth : 1, windowHeight > 1 ? windowHeight : 1)
  rectLight1.position.set(0, 0, roomDepth/2 - 0.1)
  scene.add( rectLight1 )
  scene.add( new RectAreaLightHelper(rectLight1))

  const controls = new OrbitControls( camera, renderer.domElement )
  controls.target.set(0, 0, 0)


  window.addEventListener( 'resize', onWindowResize )

  stats = new Stats();
  document.body.appendChild( stats.dom )

  camera.lookAt(rectLight1.position)
}

function onWindowResize() {
  renderer.setSize( window.innerWidth, window.innerHeight );
  camera.aspect = ( window.innerWidth / window.innerHeight );
  camera.updateProjectionMatrix();
}

function animation( time ) {
  renderer.render( scene, camera )
  stats.update()
}
