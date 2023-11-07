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

  camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 1000 );
  camera.position.set( 0, 5, - 15 );
  camera.lookAt(- 5, 5, 150)

  scene = new THREE.Scene();

  RectAreaLightUniformsLib.init();

  const rectLight1 = new THREE.RectAreaLight( 0xfff5ff, 1, 5, 50 )
  rectLight1.position.set(- 5, 5, 150)
  scene.add( rectLight1 )

  scene.add( new RectAreaLightHelper( rectLight1 ) );

  const geoFloor = new THREE.BoxGeometry( 2000, 0.1, 2000 );
  const matStdFloor = new THREE.MeshStandardMaterial( { color: 0xbcbcbc, roughness: 0.25, metalness: 0 } );
  const mshStdFloor = new THREE.Mesh( geoFloor, matStdFloor );

  scene.add( mshStdFloor );

  const materialArray = [
    new THREE.MeshPhongMaterial( { color: 0xffbcbc, side: THREE.BackSide  } ), // Left wall
    new THREE.MeshPhongMaterial( { color: 0xffbcbc, side: THREE.BackSide  } ), // Right wall
    new THREE.MeshPhongMaterial( { color: 0xffbcbc, side: THREE.BackSide  } ), // Top wall
    new THREE.MeshPhongMaterial( { color: 0xffbcbc, side: THREE.BackSide  } ), // Bottom wall
    new THREE.MeshPhongMaterial( { color: 0xffbcbc, side: THREE.BackSide  } ), // Front wall
    new THREE.MeshPhongMaterial( { color: 0xffbcbc, side: THREE.BackSide  } ), // Back wall
  ];

  const directionalLight = new THREE.SpotLight(0xffffff, 1000);
  directionalLight.position.set(- 5, 5, 150); // Adjust the position accordingly
  directionalLight.castShadow = true
  scene.add(directionalLight);
  const roomGeometry = new THREE.BoxGeometry(250, 250, 500);
  // Create the room mesh
  const roomMesh = new THREE.Mesh(roomGeometry, materialArray);
  roomMesh.position.set(0, 50, 10);
  scene.add(roomMesh);

  const controls = new OrbitControls( camera, renderer.domElement );
  controls.update();
  

  window.addEventListener( 'resize', onWindowResize );

  stats = new Stats();
  document.body.appendChild( stats.dom );

}

function onWindowResize() {

  renderer.setSize( window.innerWidth, window.innerHeight );
  camera.aspect = ( window.innerWidth / window.innerHeight );
  camera.updateProjectionMatrix();

}

function animation( time ) {

  renderer.render( scene, camera );

  stats.update();

}