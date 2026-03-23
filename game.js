import * as THREE from 'three';
import { EquirectangularReflectionMapping, PMREMGenerator } from 'three';
import { mergeVertices } from 'addons/utils/BufferGeometryUtils.js';

import { MTLLoader } from 'addons/loaders/MTLLoader.js';
import { OBJLoader } from 'addons/loaders/OBJLoader.js';


import { computeBoundsTree, disposeBoundsTree, acceleratedRaycast, MeshBVHHelper, MeshBVH } from 'three-mesh-bvh';

THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

//0513
import { OrbitControls } from 'addons/controls/OrbitControls.js'

const useOrbitControls = false;

var sky, coinsHolder, ennemiesHolder, particlesHolder;
let vignetteElement;
let flashEffectElement;
let shockwaveCounterElement;
let victoryMessage;

let gameOverBackgroundElement;
let victoryBackgroundElement;

//COLORS
var Colors = {
  red: 0xf25346,
  white: 0xd8d0d1,
  brown: 0x59332e,
  brownDark: 0x23190f,
  pink: 0xF5986E,
  yellow: 0xf4ce93,
  blue: 0x68c3c0,

};

//0525
const MOVE_DIST = 100;
const TILT_ANGLE = Math.PI / 1.5;

let isMoving = false;      // WASD 이동 중
let moveDir = null;       // 'w'|'a'|'s'|'d'
let originPos = new THREE.Vector3();   // 출발점(복귀용)
let startPos = new THREE.Vector3();   // 보간 시작
let targetPos = new THREE.Vector3();   // 보간 목표
let startQuat = new THREE.Quaternion();
let targetQuat = new THREE.Quaternion();
const endQuat = new THREE.Quaternion();  // 수평(Identity)
let progress = 0;           // 0 → 1 구간

const opposite = { w: 's', s: 'w', a: 'd', d: 'a' };


let cameraAnchor = null;  // 비행기 뒤에 따라붙을 보조 객체

//0620
// 전역 변수로 초기 위치와 회전 값을 저장할 변수 추가
let initialWhalePosition = new THREE.Vector3();
let initialWhaleQuaternion = new THREE.Quaternion();

//0622
let ennemyObjLoader;
let ennemyMtlLoader;
let loadedEnnemyObjects = {};
let ennemyModelLoaded = false;
let loadedCoinObject = null; // 로드된 코인 모델 원본
let coinModelLoaded = false; // 코인 모델 로드 완료 플래그
let coinPool = [];           // 코인 풀
let coinBvhHelperAdded = false;
let initialEnvironment = {};

const MAX_GAME_LEVEL = 10;

var particlesInUse = [];
let bvhHelperAdded = false;

///////////////

// GAME VARIABLES
var game;
var deltaTime = 0;
var newTime = new Date().getTime();
var oldTime = new Date().getTime();
var ennemiesPool = [];
var particlesPool = [];
var particlesInUse = [];



function resetGame() {
  isMoving = false;
  moveDir = null;
  progress = 0;
  nextQueuedKey = null;

  game = {
    speed: 0,
    initSpeed: .00035,
    baseSpeed: .00035,
    targetBaseSpeed: .00035,
    incrementSpeedByTime: .0000025,
    incrementSpeedByLevel: .000005,
    distanceForSpeedUpdate: 100,
    speedLastUpdate: 0,

    distance: 0,
    ratioSpeedDistance: 50,
    energy: 100,
    ratioSpeedEnergy: 3,

    level: 1,
    levelLastUpdate: 0,
    distanceForLevelUpdate: 1000,

    planeDefaultHeight: 100,
    planeAmpHeight: 80,
    planeAmpWidth: 75,
    planeMoveSensivity: 0.005,
    planeRotXSensivity: 0.0008,
    planeRotZSensivity: 0.0004,
    planeFallSpeed: .001,
    planeMinSpeed: 1.2,
    planeMaxSpeed: 1.6,
    planeSpeed: 0,
    planeCollisionDisplacementX: 0,
    planeCollisionSpeedX: 0,

    planeCollisionDisplacementY: 0,
    planeCollisionSpeedY: 0,

    seaRadius: 600,
    seaLength: 1600,
    //seaRotationSpeed:0.006,
    wavesMinAmp: 5,
    wavesMaxAmp: 20,
    wavesMinSpeed: 0.001,
    wavesMaxSpeed: 0.003,

    cameraFarPos: 500,
    cameraNearPos: 150,
    cameraSensivity: 0.002,

    coinDistanceTolerance: 15,
    coinValue: 10,
    coinsSpeed: .5,
    coinLastSpawn: 0,
    distanceForCoinsSpawn: 100,

    ennemyDistanceTolerance: 10,
    ennemyValue: 10,
    ennemiesSpeed: .6,
    ennemyLastSpawn: 0,
    distanceForEnnemiesSpawn: 50,

    status: "playing",

    isShaking: false,         // 현재 흔들리고 있는지 여부
    shakeStartTime: 0,        // 흔들림 시작 시간
    shakeDuration: 400,       // 흔들림 지속 시간 (ms 단위)
    shakeMagnitude: 25,       // 흔들림의 최대 진폭 (좌우 이동 거리)
    shakeFrequency: 20,       // 흔들림의 빈도 (얼마나 빠르게 떨리는지)

    invincibleTimer: 0,
    isFlashing: false,       // 현재 플래시 효과가 진행 중인지 여부
    flashDuration: 400,      // 플래시 지속 시간 (0.4초)
    flashTimer: 0,           // 플래시 진행 시간을 재는 타이머
    shockwaveCoinCounter: 0,

    level3BackgroundChanged: false,

  };
  if (whale && whale.mesh) {
    whale.mesh.position.copy(initialWhalePosition);
    whale.mesh.quaternion.copy(initialWhaleQuaternion);
    purePos.copy(initialWhalePosition); // WASD 이동의 기준점도 초기화

    // 충돌 시 변위 값도 초기화
    game.planeCollisionDisplacementX = 0;
    game.planeCollisionSpeedX = 0;
    game.planeCollisionDisplacementY = 0;
    game.planeCollisionSpeedY = 0;
  }

  if (initialEnvironment.background) {
    scene.background = initialEnvironment.background;
    scene.environment = initialEnvironment.environment;
    console.log("배경을 초기 상태로 되돌립니다.");
  }

  fieldLevel.innerHTML = Math.floor(game.level);


  if (coinsHolder) {
    // 모든 코인 제거 및 풀에 반환
    while (coinsHolder.coinsInUse.length > 0) {
      const coin = coinsHolder.coinsInUse.pop();
      coin.mesh.visible = false;
      coinsHolder.mesh.remove(coin.mesh);
      coinsPool.push(coin);
    }
  }
  if (ennemiesHolder) {
    // 모든 적 제거 및 풀에 반환
    while (ennemiesHolder.ennemiesInUse.length > 0) {
      const ennemy = ennemiesHolder.ennemiesInUse.pop();
      ennemy.mesh.visible = false;
      ennemiesHolder.mesh.remove(ennemy.mesh);
      ennemiesPool.push(ennemy); // 전역 ennemiesPool에 반환
    }
  }
  updateShockwaveUI();
}


var scene,
  camera, fieldOfView, aspectRatio, nearPlane, farPlane,
  renderer,
  container,
  controls;

var HEIGHT, WIDTH,
  mousePos = { x: 0, y: 0 };

function createScene() {

  HEIGHT = window.innerHeight;
  WIDTH = window.innerWidth;

  scene = new THREE.Scene();
  aspectRatio = WIDTH / HEIGHT;
  fieldOfView = 50;
  nearPlane = .1;
  farPlane = 10000;
  camera = new THREE.PerspectiveCamera(
    fieldOfView,
    aspectRatio,
    nearPlane,
    farPlane
  );

  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(WIDTH, HEIGHT);

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap; // 부드러운 그림자


  //0620
  cameraAnchor = new THREE.Object3D();
  scene.add(cameraAnchor);      // 월드에 보조 객체 추가
  cameraAnchor.add(camera);
  camera.up.set(0, 1, 0);       // 항상 y축 위쪽 유지

  if (useOrbitControls) {
    controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 100, 0); // 초기 타겟을 바다 높이 근처로 설정
    controls.enablePan = false;
    controls.enableDamping = true;
  }

  container = document.getElementById('world');
  container.appendChild(renderer.domElement);

  window.addEventListener('resize', handleWindowResize, false);

}

// MOUSE AND SCREEN EVENTS

function handleWindowResize() {
  HEIGHT = window.innerHeight;
  WIDTH = window.innerWidth;
  renderer.setSize(WIDTH, HEIGHT);
  camera.aspect = WIDTH / HEIGHT;
  camera.updateProjectionMatrix();
}

function handleMouseMove(event) {
  var tx = -1 + (event.clientX / WIDTH) * 2;
  var ty = 1 - (event.clientY / HEIGHT) * 2;
  mousePos = { x: tx, y: ty };
}

function handleTouchMove(event) {
  event.preventDefault();
  var tx = -1 + (event.touches[0].pageX / WIDTH) * 2;
  var ty = 1 - (event.touches[0].pageY / HEIGHT) * 2;
  mousePos = { x: tx, y: ty };
}

function handleMouseUp(event) {
  if (game.status == "waitingReplay" || game.status == "victory") {
    // '승리' 또는 '게임 오버' 후에는 페이지를 완전히 새로고침하여 처음부터 시작
    window.location.reload();
  }
}

function handleTouchEnd(event) {
  if (game.status == "waitingReplay" || game.status == "victory") {
    // '승리' 또는 '게임 오버' 후에는 페이지를 완전히 새로고침하여 처음부터 시작
    window.location.reload();
  }
}

// LIGHTS

var ambientLight, hemisphereLight, shadowLight;




function createEnvironmentBackground() {
  textureLoader.load('img/space1.png', function (texture) {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    texture.colorSpace = THREE.SRGBColorSpace;

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envMap = pmremGenerator.fromEquirectangular(texture).texture;

    initialEnvironment.background = texture;
    initialEnvironment.environment = envMap;

    // 씬에 첫 배경
    scene.background = initialEnvironment.background;

    pmremGenerator.dispose();
  });
}

function changeEnvironment(imageUrl) {
  if (!renderer) return;

  textureLoader.load(
    imageUrl,
    function (newTexture) {
      newTexture.mapping = THREE.EquirectangularReflectionMapping;
      newTexture.colorSpace = THREE.SRGBColorSpace;

      scene.background = newTexture;

      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      const newEnvMap = pmremGenerator.fromEquirectangular(newTexture).texture;
      scene.environment = newEnvMap;

      pmremGenerator.dispose();
    },
    undefined,
    function (error) {
      console.error(`새 배경 로딩 실패: ${imageUrl}`, error);
    }
  );
}


function createLights() {

  hemisphereLight = new THREE.HemisphereLight(0xaaaaaa, 0x000000, .9)

  ambientLight = new THREE.AmbientLight(0xdc8874, 1);

  shadowLight = new THREE.DirectionalLight(0xffffff, 5.9);
  shadowLight.position.set(150, 350, 350);
  shadowLight.castShadow = true;
  //0620 400 -> 800으로 수정
  shadowLight.shadow.camera.left = -800;
  shadowLight.shadow.camera.right = 800;
  shadowLight.shadow.camera.top = 800;
  shadowLight.shadow.camera.bottom = -800;
  shadowLight.shadow.camera.near = 1;
  shadowLight.shadow.camera.far = 1000;
  shadowLight.shadow.mapSize.width = 2048;
  shadowLight.shadow.mapSize.height = 2048;


  /*
  //0620 조명 카메라 헬처로 범위를 시각적으로 확인하기
  const shadowCameraHelper = new THREE.CameraHelper(shadowLight.shadow.camera);
  scene.add(shadowCameraHelper);*/

  var ch = new THREE.CameraHelper(shadowLight.shadow.camera);

  //scene.add(ch);
  scene.add(hemisphereLight);
  scene.add(shadowLight);
  scene.add(ambientLight);
}




// CG:0513
let delta_variation = 0;


// 0620 
// 텍스처 로더 생성
const textureLoader = new THREE.TextureLoader();
const groundTexture = textureLoader.load('img/texture.png');


// 필터링 설정
groundTexture.magFilter = THREE.LinearFilter; // 확대될 때 부드럽게
groundTexture.minFilter = THREE.LinearMipmapLinearFilter; // 축소될 때 밉맵 사용 (가장 부드러움)


let my_uniforms = {
  'my_color': { value: new THREE.Vector3(1, 0, 0) },
  'wavesMinAmp': { value: 5.0 },
  'wavesMaxAmp': { value: 20.0 },
  'delta': { value: delta_variation },
  'u_texture': { value: groundTexture } // 새로 추가된 텍스처 uniform
};


let my_vtxShader = `
    uniform float wavesMinAmp;
    uniform float wavesMaxAmp;
    uniform float delta;
    varying vec2 vUv;

    // position.xz 로 seed
    float random(vec2 st) {
        return fract(sin(dot(st, vec2(12.9898,78.233))) * 43758.5453123);
    }

    void main() {
      // 1) uv는 그대로 넘겨서 fragShader 에서 색 계산에 사용
      vUv = uv;

      // 2) position 기반 seed (실린더 끊김 없음)
      vec2 seed = position.xz * 0.1;

      float baseAng = random(seed) * 6.28318530718; // 2*PI
      float amp     = wavesMinAmp + random(seed + 37.1) * (wavesMaxAmp - wavesMinAmp);

      float flowFactor = position.x * 0.05 + delta * 0.5;


      float ang = baseAng + delta;


      vec3 pos_new = position;
      pos_new.x += cos(ang) * amp;
      pos_new.y += sin(ang) * amp;

      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos_new, 1.0);
    }
`;



let my_fragShader = `
    uniform sampler2D u_texture; // 새로운 uniform 변수: 텍스처 샘플러
    varying vec2 vUv;

    void main()
    {
      gl_FragColor = texture2D(u_texture, vUv); // 텍스처 이미지에서 색상 샘플링
    }
`;


const my_material = new THREE.ShaderMaterial({
  uniforms: my_uniforms,
  vertexShader: my_vtxShader,
  fragmentShader: my_fragShader

});



function Sky() {
  this.mesh = new THREE.Object3D();

  this.nClouds = 20;
  this.clouds = [];
  var stepAngle = Math.PI * 2 / this.nClouds;
  for (var i = 0; i < this.nClouds; i++) {
    var c = new Cloud();
    this.clouds.push(c);
    var a = stepAngle * i;
    var h = game.seaRadius + 600 + Math.random() * 200;
    c.mesh.position.y = Math.sin(a) * h;
    c.mesh.position.x = Math.cos(a) * h;
    c.mesh.position.z = Math.random() * 1200 - 600;
    c.mesh.rotation.z = a + Math.PI / 2;
    var s = 1 + Math.random() * 2;
    c.mesh.scale.set(s, s, s);
    this.mesh.add(c.mesh);
  }
}


Sky.prototype.moveClouds = function () {
  for (var i = 0; i < this.nClouds; i++) {
    var c = this.clouds[i];
    c.rotate();
  }
  this.mesh.rotation.z += game.speed * deltaTime;

}



function Sea() {
  let geom = new THREE.CylinderGeometry(game.seaRadius, game.seaRadius, game.seaLength, 40, 10);
  geom.rotateX(-Math.PI / 2);


  this.mesh = new THREE.Mesh(geom, my_material);
  this.mesh.name = "waves";

  this.mesh.receiveShadow = false; // 그림자를 받지 않음
  this.mesh.castShadow = false;    // 그림자를 만들지 않음

}


Sea.prototype.moveWaves = function () {
  // CG:0513
  //my_uniforms['delta'] = xxxx;
  return;
}


function createShadowPlane() {
  let geom = new THREE.CylinderGeometry(game.seaRadius, game.seaRadius, game.seaLength, 40, 10);
  geom.rotateX(-Math.PI / 2);

  // 그림자만 받는 특수 재질인 ShadowMaterial을 사용
  let mat = new THREE.ShadowMaterial();
  mat.opacity = .5; // 그림자의 농도를 조절 (0 ~ 1 사이)

  // 메쉬 생성
  let shadowPlane = new THREE.Mesh(geom, mat);

  // 그림자를 받도록 설정
  shadowPlane.receiveShadow = true;

  // 바다와 똑같은 위치
  shadowPlane.position.y = -game.seaRadius;

  // 씬에 추가
  scene.add(shadowPlane);
}


function Cloud() {
  this.mesh = new THREE.Object3D();
  this.mesh.name = "cloud";
  var geom = new THREE.BoxGeometry(20, 20, 20);
  var mat = new THREE.MeshPhongMaterial({
    color: Colors.white,

  });


  var nBlocs = 3 + Math.floor(Math.random() * 3);
  for (var i = 0; i < nBlocs; i++) {
    var m = new THREE.Mesh(geom.clone(), mat);
    m.position.x = i * 15;
    m.position.y = Math.random() * 10;
    m.position.z = Math.random() * 10;
    m.rotation.z = Math.random() * Math.PI * 2;
    m.rotation.y = Math.random() * Math.PI * 2;
    var s = .1 + Math.random() * .9;
    m.scale.set(s, s, s);
    this.mesh.add(m);
    m.castShadow = true;
    m.receiveShadow = true;

  }

}

Cloud.prototype.rotate = function () {
  var l = this.mesh.children.length;
  for (var i = 0; i < l; i++) {
    var m = this.mesh.children[i];
    m.rotation.z += Math.random() * .005 * (i + 1);
    m.rotation.y += Math.random() * .002 * (i + 1);
  }
}
function Ennemy() {
  var geom = new THREE.TetrahedronGeometry(8, 2); // OBJ 모델로 대체될 지오메트리
  var mat = new THREE.MeshPhongMaterial({
    color: Colors.red,
    shininess: 0,
    specular: 0xffffff,
    flatShading: true
  });

  // 모델 로드가 불확실할 때를 위한 안전장치
  this.mesh = new THREE.Object3D();
  this.angle = 0;
  this.dist = 0;
  this.isLoaded = false; // 모델 로드 여부 플래그 (loadEnnemyModels에서 설정됨)
  this.type = '';

  // --- Ennemy 생성자에 다음 속성들을 추가하세요 ---
  this.swayTime = Math.random() * Math.PI * 2; // 각 적마다 고유한 시작 위상 (0~2π)
  this.swayAmplitude = Math.PI / 16 + Math.random() * (Math.PI / 8); // 끄덕이는 최대 각도 (약 11.25도 ~ 33.75도)
  this.swayFrequency = 0.001 + Math.random() * 0.001; // 끄덕이는 속도 (작게)
  // --- 추가 끝 ---
}

function EnnemiesHolder() {
  this.mesh = new THREE.Object3D();
  this.ennemiesInUse = [];
}


function loadEnnemyModels(manager) {
  return new Promise((resolve, reject) => {
    const mtlLoader = new MTLLoader(manager);
    mtlLoader.setPath('model/shark/');
    mtlLoader.load('shark.mtl', function (materials) {
      materials.preload();
      const objLoader = new OBJLoader(manager);
      objLoader.setMaterials(materials);
      objLoader.setPath('model/shark/');
      objLoader.load('shark.obj', function (object) {
        object.scale.set(50, 50, 50); // 상어 크기를 50으로 조정
        object.rotation.y = -Math.PI / 2;


        object.traverse(child => {
          if (child.isMesh) {
            child.geometry.computeBoundsTree();
          }
        });

        object.traverse(function (child) {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        ennemyModelLoaded = true;
        console.log("Shark model with BVH loaded. Filling pool.");

        for (let i = 0; i < 30; i++) {
          const newEnnemy = new Ennemy();
          newEnnemy.mesh = object.clone();
          newEnnemy.mesh.visible = false;
          newEnnemy.isLoaded = true;
          newEnnemy.type = 'shark';
          ennemiesPool.push(newEnnemy);
        }

        resolve();

      }, undefined, reject);
    }, undefined, reject);
  });
}

//0622
EnnemiesHolder.prototype.spawnEnnemies = function () {
  if (!ennemyModelLoaded || ennemiesPool.length === 0) {
    console.warn("Ennemy pool not ready or exhausted. Skipping spawn.");
    return;
  }

  var nEnnemies = game.level; // 현재 레벨에 따른 적의 수

  for (var i = 0; i < nEnnemies; i++) {
    var ennemy;
    if (ennemiesPool.length > 0) {
      const randomIndex = Math.floor(Math.random() * ennemiesPool.length);
      ennemy = ennemiesPool.splice(randomIndex, 1)[0];
    } else {
      console.warn("Ennemy pool completely exhausted! Cannot spawn more ennemies for this cycle.");
      break;
    }

    if (ennemy && ennemy.mesh) {
      ennemy.angle = - (i * 0.1);
      ennemy.distance = game.seaRadius + game.planeDefaultHeight + (-1 + Math.random() * 2) * (game.planeAmpHeight - 20);
      ennemy.mesh.position.y = -game.seaRadius + Math.sin(ennemy.angle) * ennemy.distance;
      ennemy.mesh.position.x = Math.cos(ennemy.angle) * ennemy.distance;

      // Z축 위치 생성 로직 (50% 확률로 고래 위치, 50% 확률로 고래 주변 랜덤)
      if (Math.random() < 0.5) {
        ennemy.mesh.position.z = purePos.z;
      } else {
        ennemy.mesh.position.z = purePos.z + (-0.5 + Math.random()) * MOVE_DIST * 2;
      }


      ennemy.mesh.visible = true; // 보이게 설정
      this.mesh.add(ennemy.mesh);
      this.ennemiesInUse.push(ennemy);
    }
  }
};



EnnemiesHolder.prototype.rotateEnnemies = function () {
  for (var i = 0; i < this.ennemiesInUse.length; i++) {
    var ennemy = this.ennemiesInUse[i];
    if (!ennemy.mesh.visible) continue;

    ennemy.angle += game.speed * deltaTime * game.ennemiesSpeed;
    if (ennemy.angle > Math.PI * 2) ennemy.angle -= Math.PI * 2;
    ennemy.mesh.position.y = -game.seaRadius + Math.sin(ennemy.angle) * ennemy.distance;
    ennemy.mesh.position.x = Math.cos(ennemy.angle) * ennemy.distance;

    // 끄덕이는 애니메이션 (기존과 동일)
    ennemy.swayTime += deltaTime * ennemy.swayFrequency;
    ennemy.mesh.rotation.x = ennemy.swayAmplitude * Math.sin(ennemy.swayTime);
    ennemy.mesh.rotation.z = 0;


    const whaleColliderGroup = whale.collider; // 고래의 복합 콜라이더 그룹
    const enemyMesh = ennemy.mesh;             // 상어 메쉬 (BVH 포함)

    whaleColliderGroup.updateWorldMatrix(true, false);
    enemyMesh.updateWorldMatrix(true, false);

    let collisionDetected = false;

    whaleColliderGroup.children.forEach(whalePart => {
      if (collisionDetected) return;

      enemyMesh.traverse(enemyPart => {
        if (enemyPart.isMesh && enemyPart.geometry.boundsTree) {
          const matrix = new THREE.Matrix4()
            .copy(enemyPart.matrixWorld)
            .invert()
            .multiply(whalePart.matrixWorld);

          // 겹침 확인 실행
          if (enemyPart.geometry.boundsTree.intersectsGeometry(whalePart.geometry, matrix)) {
            collisionDetected = true;
          }
        }
      });
    });

    if (collisionDetected) {
      // [충돌 발생 시] 기존과 동일한 충돌 효과를 실행
      particlesHolder.spawnParticles(ennemy.mesh.position.clone(), 15, Colors.red, 3);

      ennemiesPool.unshift(this.ennemiesInUse.splice(i, 1)[0]);
      this.mesh.remove(ennemy.mesh);
      game.planeCollisionSpeedX = 100 * (whale.mesh.position.x - ennemy.mesh.position.x) / 10;
      game.planeCollisionSpeedY = 100 * (whale.mesh.position.y - ennemy.mesh.position.y) / 10;
      ambientLight.intensity = 2;

      if (!game.isShaking) {
        game.isShaking = true;
        game.shakeStartTime = oldTime;
      }

      removeEnergy();
      i--;

    } else if (ennemy.angle > Math.PI) {
      // [충돌하지 않고 화면 뒤로 사라졌을 때]
      ennemy.mesh.visible = false;
      ennemiesPool.unshift(this.ennemiesInUse.splice(i, 1)[0]);
      this.mesh.remove(ennemy.mesh);
      i--;
    }
  }
};


function loadCoinModel(manager) {
  return new Promise((resolve, reject) => {
    const mtlLoader = new MTLLoader(manager);
    mtlLoader.setPath('model/star/');
    mtlLoader.load('star.mtl', function (materials) {
      materials.preload();

      const objLoader = new OBJLoader(manager);
      objLoader.setMaterials(materials);
      objLoader.setPath('model/star/');
      objLoader.load('star.obj', function (object) {
        object.scale.set(20, 20, 20);

        // --- 코인 모델에 BVH 생성 ---
        object.traverse(child => {
          if (child.isMesh) {
            child.geometry.computeBoundsTree();
          }
        });

        // 그림자 설정
        object.traverse(function (child) {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        loadedCoinObject = object;
        coinModelLoaded = true;
        for (let i = 0; i < 20; i++) {
          const newCoin = new Coin();
          newCoin.mesh = loadedCoinObject.clone(); // BVH가 적용된 모델 복제
          newCoin.mesh.visible = false;
          newCoin.isLoaded = true;
          coinPool.push(newCoin);
        }
        console.log("Coin model with BVH loaded and pool filled.");
        resolve();
      }, undefined, (error) => reject(error));
    }, undefined, (error) => reject(error));
  });
}


function Particle() {
  var geom = new THREE.TetrahedronGeometry(3, 0);
  var mat = new THREE.MeshPhongMaterial({
    color: 0x009999,
    shininess: 0,
    specular: 0xffffff,
    //shading:THREE.FlatShading
    flatShading: true
  });
  this.mesh = new THREE.Mesh(geom, mat);
}



Particle.prototype.explode = function (pos, color, scale) {
  var _this = this;
  var _p = this.mesh.parent;
  this.mesh.material.color = new THREE.Color(color);
  this.mesh.material.needsUpdate = true;
  this.mesh.scale.set(scale, scale, scale);

  var targetX = pos.x + (-1 + Math.random() * 2) * 50;
  var targetY = pos.y + (-1 + Math.random() * 2) * 50;
  var targetZ = pos.z + (-1 + Math.random() * 2) * 50; // Z축 목표 지점 추가

  var speed = .6 + Math.random() * .2;
  TweenMax.to(this.mesh.rotation, speed, { x: Math.random() * 12, y: Math.random() * 12 });
  TweenMax.to(this.mesh.scale, speed, { x: .1, y: .1, z: .1 });

  TweenMax.to(this.mesh.position, speed, {
    x: targetX,
    y: targetY,
    z: targetZ, // Z축 애니메이션 추가
    delay: Math.random() * .1,
    ease: Power2.easeOut,
    onComplete: function () {
      if (_p) _p.remove(_this.mesh);
      _this.mesh.scale.set(1, 1, 1);
      particlesPool.unshift(_this);
    }
  });
}

function ParticlesHolder() {
  this.mesh = new THREE.Object3D();
  this.particlesInUse = [];
}



ParticlesHolder.prototype.spawnParticles = function (pos, density, color, scale) {
  var nPArticles = density;
  for (var i = 0; i < nPArticles; i++) {
    var particle;
    if (particlesPool.length) {
      particle = particlesPool.pop();
    } else {
      particle = new Particle();
    }
    this.mesh.add(particle.mesh);
    particle.mesh.visible = true;

    particle.mesh.position.copy(pos);
    // --- ▲▲▲ 수정 끝 ▲▲▲ ---

    particle.explode(pos, color, scale);
  }
}



//0622
function Coin() {
  this.mesh = new THREE.Object3D(); // 빈 Object3D로 시작
  this.mesh.castShadow = true;     // 그림자 설정
  this.angle = 0;
  this.dist = 0;
  this.isLoaded = false;           // 모델 로드 여부 플래그
}


function CoinsHolder() {
  this.mesh = new THREE.Object3D();
  this.coinsInUse = [];
}


CoinsHolder.prototype.spawnCoins = function () {
  // 코인 모델 로딩 및 풀 확인
  if (!coinModelLoaded || coinPool.length === 0) return;

  // 한 번에 생성할 코인 개수
  var nCoins = 2;

  for (var i = 0; i < nCoins; i++) {
    var coin;
    if (coinPool.length > 0) {
      const randomIndex = Math.floor(Math.random() * coinPool.length);
      coin = coinPool.splice(randomIndex, 1)[0];
    } else {
      continue; // 풀이 비었으면 생성하지 않음
    }

    coin.angle = (Math.random() - 0.5) * (Math.PI / 2);

    var d = game.seaRadius + game.planeDefaultHeight + (-1 + Math.random() * 2) * (game.planeAmpHeight - 20);
    var amplitude = 10 + Math.round(Math.random() * 10);
    coin.distance = d + amplitude;

    coin.mesh.position.y = -game.seaRadius + Math.sin(coin.angle) * coin.distance;
    coin.mesh.position.x = Math.cos(coin.angle) * coin.distance;
    coin.mesh.position.z = purePos.z + (-0.5 + Math.random()) * MOVE_DIST * 2;

    // --- ▲▲▲ 랜덤화 로직 끝 ▲▲▲ ---

    coin.mesh.visible = true;
    this.mesh.add(coin.mesh);
    this.coinsInUse.push(coin);
  }
};

CoinsHolder.prototype.rotateCoins = function () {
  for (var i = 0; i < this.coinsInUse.length; i++) {
    var coin = this.coinsInUse[i];
    if (coin.exploding || !coin.mesh.visible) continue;

    // Y축으로 계속 회전
    coin.mesh.rotation.y += 0.05;

    // 바다 표면의 곡선 경로를 따라 자연스럽게 움직이도록 X와 Y 위치를 모두 업데이트
    coin.angle += game.speed * deltaTime * game.coinsSpeed;
    if (coin.angle > Math.PI * 2) coin.angle -= Math.PI * 2;
    coin.mesh.position.x = Math.cos(coin.angle) * coin.distance;
    coin.mesh.position.y = -game.seaRadius + Math.sin(coin.angle) * coin.distance;

    // --- BVH 기반 충돌 감지 로직 ---
    const whaleColliderGroup = whale.collider;
    const coinMesh = coin.mesh;

    whaleColliderGroup.updateWorldMatrix(true, false);
    coinMesh.updateWorldMatrix(true, false);

    let collisionDetected = false;

    whaleColliderGroup.children.forEach(whalePart => {
      if (collisionDetected) return;

      coinMesh.traverse(coinPart => {
        if (coinPart.isMesh && coinPart.geometry.boundsTree) {
          const matrix = new THREE.Matrix4()
            .copy(coinPart.matrixWorld)
            .invert()
            .multiply(whalePart.matrixWorld);

          if (coinPart.geometry.boundsTree.intersectsGeometry(whalePart.geometry, matrix)) {
            collisionDetected = true;
          }
        }
      });
    });

    if (collisionDetected) {
      // [충돌 발생 시]
      particlesHolder.spawnParticles(coin.mesh.position.clone(), 5, Colors.yellow, .8);
      addEnergy();
      coin.mesh.visible = false;
      coinPool.unshift(this.coinsInUse.splice(i, 1)[0]);
      this.mesh.remove(coin.mesh);
      i--;
    } else if (coin.angle > Math.PI) {
      // [화면 뒤로 사라졌을 때]
      coin.mesh.visible = false;
      coinPool.unshift(this.coinsInUse.splice(i, 1)[0]);
      this.mesh.remove(coin.mesh);
      i--;
    }
  }
};

// 3D Models
var sea;
var whale;

function createSea() {
  groundTexture.wrapS = THREE.RepeatWrapping;
  groundTexture.wrapT = THREE.RepeatWrapping;
  const circumference = 2 * Math.PI * game.seaRadius;
  const length = game.seaLength;
  const repeatY = 10;
  const repeatX = (circumference / length) * repeatY;
  groundTexture.repeat.set(repeatX, repeatY);

  sea = new Sea();
  sea.mesh.position.y = -game.seaRadius;
  scene.add(sea.mesh);
}

function createSky() {
  sky = new Sky();
  sky.mesh.position.y = -game.seaRadius;
  scene.add(sky.mesh);
}

function createCoins() {

  coinsHolder = new CoinsHolder(20);
  scene.add(coinsHolder.mesh)
}

function createEnnemies() {
  //0622
  ennemiesHolder = new EnnemiesHolder();
  scene.add(ennemiesHolder.mesh)
}

function createParticles() {
  for (var i = 0; i < 10; i++) {
    var particle = new Particle();
    particlesPool.push(particle);
  }
  particlesHolder = new ParticlesHolder();
  scene.add(particlesHolder.mesh)
}


function loop() {
  // 카메라 업데이트 및 시간차 계산 (기존과 동일)
  if (useOrbitControls) {
    if (controls) controls.update();
  } else {
    gamesystem();
  }
  newTime = new Date().getTime();
  deltaTime = newTime - oldTime;
  oldTime = newTime;


  if (game.status == "playing") {
    updateWASD(deltaTime);

    if (Math.floor(game.distance) % game.distanceForCoinsSpawn == 0 && Math.floor(game.distance) > game.coinLastSpawn) {
      game.coinLastSpawn = Math.floor(game.distance);
      coinsHolder.spawnCoins();
    }
    if (Math.floor(game.distance) % game.distanceForSpeedUpdate == 0 && Math.floor(game.distance) > game.speedLastUpdate) {
      game.speedLastUpdate = Math.floor(game.distance);
      game.targetBaseSpeed += game.incrementSpeedByTime * deltaTime;
    }
    if (Math.floor(game.distance) % game.distanceForEnnemiesSpawn == 0 && Math.floor(game.distance) > game.ennemyLastSpawn) {
      game.ennemyLastSpawn = Math.floor(game.distance);
      ennemiesHolder.spawnEnnemies();
    }
    if (Math.floor(game.distance) % game.distanceForLevelUpdate == 0 && Math.floor(game.distance) > game.levelLastUpdate) {
      game.levelLastUpdate = Math.floor(game.distance);
      game.level = Math.min(game.level + 1, MAX_GAME_LEVEL);
      fieldLevel.innerHTML = Math.floor(game.level);
      game.targetBaseSpeed = game.initSpeed + game.incrementSpeedByLevel * game.level;
    }

    updateWhale();
    updateDistance();
    updateEnergy();
    game.baseSpeed += (game.targetBaseSpeed - game.baseSpeed) * deltaTime * 0.02;
    game.speed = game.baseSpeed * game.planeSpeed;

    sea.mesh.rotation.z += game.speed * deltaTime;
    if (sea.mesh.rotation.z > 2 * Math.PI) sea.mesh.rotation.z -= 2 * Math.PI;
    sky.mesh.rotation.z += game.speed * deltaTime;



    scene.backgroundRotation.z += game.speed;

    coinsHolder.rotateCoins();
    ennemiesHolder.rotateEnnemies();
    sky.moveClouds();

    if (game.level === 3 && !game.level3BackgroundChanged) {
      changeEnvironment('img/space2.png');

      game.level3BackgroundChanged = true;
    }
    if (game.distance >= 4000) {
      game.status = "victory";
    }

  } else if (game.status == "gameover") {
    // 'gameover' 상태 로직 (기존과 동일)
    game.speed *= .99;
    whale.mesh.rotation.z += (-Math.PI / 2 - whale.mesh.rotation.z) * .0002 * deltaTime;
    whale.mesh.rotation.x += 0.0003 * deltaTime;
    game.planeFallSpeed *= 1.05;
    whale.mesh.position.y -= game.planeFallSpeed * deltaTime;
    sea.mesh.rotation.z += game.speed * deltaTime;
    sky.mesh.rotation.z += game.speed * deltaTime;

    if (gameOverBackgroundElement) {
      const currentOpacity = parseFloat(gameOverBackgroundElement.style.opacity) || 0;
      if (currentOpacity < 1.0) {
        gameOverBackgroundElement.style.opacity = Math.min(1, currentOpacity + 0.005);
      }
    }

    if (whale.mesh.position.y < -200) {
      showReplay();
      game.status = "waitingReplay";
    }

  } else if (game.status == "victory") {
    if (victoryBackgroundElement) {
      const currentOpacity = parseFloat(victoryBackgroundElement.style.opacity) || 0;
      if (currentOpacity < 1.0) {
        victoryBackgroundElement.style.opacity = Math.min(1, currentOpacity + 0.005);
      } else {
        if (victoryMessage && victoryMessage.style.display !== 'block') {
          victoryMessage.style.display = 'block';
        }
        game.status = "waitingReplay";
      }
    } else {
      game.status = "waitingReplay";
    }
  } else if (game.status == "waitingReplay") {
    if (gameOverBackgroundElement) {
      const currentOpacity = parseFloat(gameOverBackgroundElement.style.opacity) || 0;
      if (currentOpacity < 1.0) {
        gameOverBackgroundElement.style.opacity = Math.min(1, currentOpacity + 0.005);
      }
    }

  }

  sea.moveWaves();
  ambientLight.intensity += (.5 - ambientLight.intensity) * deltaTime * 0.005;
  delta_variation += deltaTime * 0.001;
  my_uniforms.delta.value = delta_variation;

  if (game.isFlashing) {
    game.flashTimer += deltaTime;
    const progress = Math.min(game.flashTimer / game.flashDuration, 1);
    const opacity = 0.4 * (1 - progress);
    flashEffectElement.style.opacity = opacity;
    if (progress >= 1) {
      game.isFlashing = false;
    }
  }

  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

function updateDistance() {
  game.distance += game.speed * deltaTime * game.ratioSpeedDistance;
  fieldDistance.innerHTML = Math.floor(game.distance);
  var d = 502 * (1 - (game.distance % game.distanceForLevelUpdate) / game.distanceForLevelUpdate);
  levelCircle.setAttribute("stroke-dashoffset", d);

}


function updateEnergy() {
  game.energy -= game.speed * deltaTime * game.ratioSpeedEnergy;
  game.energy = Math.max(0, game.energy);
  energyBar.style.right = (100 - game.energy) + "%";
  energyBar.style.backgroundColor = (game.energy < 50) ? "#f25346" : "#68c3c0";

  if (game.energy < 30) {
    energyBar.style.animationName = "blinking";
  } else {
    energyBar.style.animationName = "none";
  }

  if (vignetteElement) {
    // 에너지가 33.3% 이하일 때
    if (game.energy <= 100 / 3) {
      const pulse = (Math.sin(Date.now() * 0.008) + 1) / 2;
      vignetteElement.style.opacity = pulse;
    } else {
      vignetteElement.style.opacity = '0';
    }
  }

  if (game.energy < 1) {
    game.status = "gameover";
  }
}

function addEnergy() {
  game.energy += game.coinValue;
  game.energy = Math.min(game.energy, 100);

  if (!game.isFlashing) {
    game.isFlashing = true; // 플래시 상태를 'ON'으로 설정
    game.flashTimer = 0;    // 타이머를 0으로 리셋
  }

  // 무적 효과는 그대로 유지
  game.isInvincible = true;
  game.invincibleTimer = game.invincibleTime;

  // --- 충격파 로직 수정 ---
  game.shockwaveCoinCounter++;
  updateShockwaveUI(); // 

  if (game.shockwaveCoinCounter >= 5) {
    game.shockwaveCoinCounter = 0;
    updateShockwaveUI(); // 

    const shockwaveRadius = 400; // 충격파 반경 설정
    for (let i = ennemiesHolder.ennemiesInUse.length - 1; i >= 0; i--) {
      const ennemy = ennemiesHolder.ennemiesInUse[i];
      const distance = whale.mesh.position.distanceTo(ennemy.mesh.position);

      // 충격파 반경 안에 있는 장애물일 경우
      if (distance < shockwaveRadius) {
        // 파괴 파티클 생성
        particlesHolder.spawnParticles(ennemy.mesh.position.clone(), 15, Colors.red, 3);

        ennemiesPool.unshift(ennemiesHolder.ennemiesInUse.splice(i, 1)[0]);
        ennemiesHolder.mesh.remove(ennemy.mesh);
      }
    }

    if (shockwaveMesh) {
      shockwaveMesh.position.copy(whale.mesh.position); // 충격파의 중심을 고래 위치로
      shockwaveMesh.position.y = 0; // 충격파가 바다 표면에 생기도록 Y축 고정

      // 초기 상태로 리셋
      shockwaveMesh.scale.set(0.1, 0.1, 0.1);
      shockwaveMesh.material.opacity = 1;
      shockwaveMesh.visible = true;

      // GSAP(TweenMax)을 이용해 애니메이션 실행
      const finalScale = shockwaveRadius / 10; // 링의 외부반지름(10)에 맞춰 스케일 계산

      // 0.8초 동안 커지는 애니메이션
      TweenMax.to(shockwaveMesh.scale, 0.8, {
        x: finalScale, y: finalScale, z: finalScale,
        ease: Power2.easeOut
      });
      // 0.8초 동안 투명해지며 사라지는 애니메이션
      TweenMax.to(shockwaveMesh.material, 0.8, {
        opacity: 0,
        ease: Power2.easeOut,
        onComplete: () => {
          shockwaveMesh.visible = false; // 애니메이션 끝나면 숨기기
        }
      });
    }
  }
}

function removeEnergy() {
  game.energy -= game.ennemyValue;
  game.energy = Math.max(0, game.energy);
}

const Y_LEVELS = {
  HIGH: 300,  // 가장 높은 Y 위치
  MID: 150,   // 중간 Y 위치 (초기 위치)
  LOW: 50,   // 가장 낮은 Y 위치 (바다 표면 위)
  SURFACE: -650 + 50 // 바다 표면 바로 위
};


function dirVector(key) {
  switch (key) {
    case 'w': return new THREE.Vector3(0, 1, 0);  // 위쪽
    case 's': return new THREE.Vector3(0, -1, 0); // 아래쪽
    case 'a': return new THREE.Vector3(0, 0, -1); // 왼쪽
    case 'd': return new THREE.Vector3(0, 0, 1);  // 오른쪽
    default: return new THREE.Vector3(0, 0, 0);
  }
}
function tiltAxis(key) {
  // W/S 는 Z-축 , A/D 는 X-축 
  return (key === 'w' || key === 's') ? new THREE.Vector3(0, 0, 1)
    : new THREE.Vector3(1, 0, 0);
}
function newTiltQuat(key) {
  const axis = tiltAxis(key);
  const angle = (key === 'w' || key === 'd') ? TILT_ANGLE : -TILT_ANGLE;
  return new THREE.Quaternion().setFromAxisAngle(axis, angle);
}

function makeReturnQuat(currentQuat, key) {
  const axis = tiltAxis(key);
  const angle = (key === 'w' || key === 'd') ? -TILT_ANGLE : TILT_ANGLE;
  const returnTilt = new THREE.Quaternion().setFromAxisAngle(axis, angle);
  return currentQuat.clone().multiply(returnTilt);
}


let nextQueuedKey = null;

function handleMoveKey(key) {
  key = key.toLowerCase();
  if (!'wasd'.includes(key)) return;

  if (isMoving) {
    // 반대 방향이면 즉시 복귀
    if (key === opposite[moveDir]) {
      moveDir = null;
      startPos.copy(whale.mesh.position);
      startQuat.copy(whale.mesh.quaternion);
      targetPos.copy(originPos);

      // 현재 회전 상태에서 "기울어짐 제거 회전"을 적용해서 최종 회전 만들기
      const inverseTilt = newTiltQuat(key).invert(); // 반대 방향 기울임
      targetQuat.copy(startQuat).multiply(inverseTilt);
      progress = 0;
    } else {
      // 동일/직교 방향은 예약만 (중복 저장은 방지)
      if (!nextQueuedKey) {
        nextQueuedKey = key;
      }
    }
    return;
  }
  // 새 이동 시작 
  startMove(key);
}

function startMove(key) {
  isMoving = true;
  moveDir = key;
  originPos.copy(purePos);
  startPos.copy(originPos);
  startQuat.copy(whale.mesh.quaternion);

  const direction = dirVector(key);
  targetPos.copy(originPos).addScaledVector(direction, MOVE_DIST);
  targetPos.y = THREE.MathUtils.clamp(targetPos.y, Y_LEVELS.LOW, Y_LEVELS.HIGH);
  const Z_BOUND = 600;
  targetPos.z = THREE.MathUtils.clamp(targetPos.z, -Z_BOUND, Z_BOUND);

  targetQuat.copy(startQuat).multiply(newTiltQuat(key));
  progress = 0;
}

function updateWASD(dt) {
  if (!isMoving) return;

  progress = Math.min(progress + dt * 0.0015, 1);


  //위치 보간 
  whale.mesh.position.lerpVectors(startPos, targetPos, progress);
  purePos.copy(whale.mesh.position);          // ← 순수 위치 기록

  //회전 보간 
  if (progress < 0.3) {
    let q1 = startQuat;
    let q2 = targetQuat;
    let q2s = q2.clone();
    if (q1.dot(q2) < 0) {
      q2s.set(-q2.x, -q2.y, -q2.z, -q2.w);  // negate와 동일한 결과
    }

    whale.mesh.quaternion.slerpQuaternions(q1, q2s, progress / 0.3);

  } else if (progress < 0.7) {
    whale.mesh.quaternion.copy(targetQuat);

  } else {
    let q1 = targetQuat;
    let q2 = endQuat;
    let q2s = q2.clone(); // ← 먼저 clone을 따로 실행하고
    if (q1.dot(q2) < 0) {
      q2s.set(-q2.x, -q2.y, -q2.z, -q2.w);  // negate와 동일한 결과
    }

    whale.mesh.quaternion.slerpQuaternions(q1, q2s, (progress - 0.7) / 0.3);
  }
  // 완료 
  if (progress >= 1) {
    whale.mesh.position.copy(targetPos);
    whale.mesh.quaternion.copy(endQuat);
    isMoving = false;
    moveDir = null;

    // 도착 후 예약된 이동이 있다면 즉시 실행
    if (nextQueuedKey) {
      const keyToMove = nextQueuedKey;
      nextQueuedKey = null;
      startMove(keyToMove);
    }
  }
}



const purePos = new THREE.Vector3();   // WASD 로 얻은 “흔들림 없는” 위치

function updateWhale() {
  // 모델이 아직 로드되지 않았으면 아무것도 하지 않음
  if (!whale) return;

  game.planeSpeed = (game.planeMinSpeed + game.planeMaxSpeed) * 0.5;

  // 1. "유유히 헤엄치는" Y축 움직임 계산
  const swayAmplitude = 10; // 고래가 위아래로 흔들리는 최대 높이
  const swaySpeed = 0.002;  // 고래가 흔들리는 속도
  // 시간을 기반으로 -1과 1 사이를 반복하는 sin 값을 만들어 부드러운 움직임을 구현
  const swayOffset = Math.sin(Date.now() * swaySpeed) * swayAmplitude;

  // 2. 충돌 시 흔들림 효과 (기존 코드)
  game.planeCollisionDisplacementX += (0 - game.planeCollisionDisplacementX) * deltaTime * 0.005;
  game.planeCollisionDisplacementY += (0 - game.planeCollisionDisplacementY) * deltaTime * 0.005;


  let shakeOffsetZ = 0;
  if (game.isShaking) {
    const elapsedTime = oldTime - game.shakeStartTime;

    if (elapsedTime < game.shakeDuration) {
      // 시간이 지남에 따라 진폭이 감소하도록 progress 계산 (0 -> 1)
      const progress = elapsedTime / game.shakeDuration;
      // 1에서 시작하여 0으로 끝나는 감쇠 계수
      const dampingFactor = 1 - progress;
      // 현재 프레임의 진폭
      const currentMagnitude = game.shakeMagnitude * dampingFactor;
      // sin 함수를 이용해 좌우로 빠르게 흔들리는 효과 생성
      shakeOffsetZ = currentMagnitude * Math.sin(progress * game.shakeFrequency * Math.PI * 2);
    } else {
      // 흔들림 시간이 끝나면 상태를 리셋
      game.isShaking = false;
    }
  }



  //0622 sea 아래로 안 내려가게
  const minWhaleY = -game.seaRadius + 70;

  // 3. 최종 위치 설정

  whale.mesh.position.set(
    purePos.x + game.planeCollisionDisplacementX,
    Math.max(purePos.y + game.planeCollisionDisplacementY + swayOffset, minWhaleY),
    purePos.z + shakeOffsetZ
  );

}


function showReplay() {
  replayMessage.style.display = "block";
}


function normalize(v, vmin, vmax, tmin, tmax) {
  var nv = Math.max(Math.min(v, vmax), vmin);
  var dv = vmax - vmin;
  var pc = (nv - vmin) / dv;
  var dt = tmax - tmin;
  var tv = tmin + (pc * dt);
  return tv;
}

var fieldDistance, energyBar, replayMessage, fieldLevel, levelCircle;


function loadWhaleModel(manager) {
  return new Promise((resolve, reject) => {
    const mtlLoader = new MTLLoader(manager);
    mtlLoader.setPath('model/whale/');
    mtlLoader.load('gw.mtl', function (materials) {
      materials.preload();
      const objLoader = new OBJLoader(manager);
      objLoader.setMaterials(materials);
      objLoader.setPath('model/whale/');
      objLoader.load('gw.obj', function (object) {
        // 고래 모델 기본 설정 (기존과 동일)
        object.scale.set(60, 60, 60);
        object.position.y = 150;
        purePos.copy(object.position);
        initialWhalePosition.copy(object.position);
        initialWhaleQuaternion.copy(object.quaternion);

        object.traverse(function (child) {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        const compoundCollider = new THREE.Group();
        object.add(compoundCollider);

        const colliderMaterial = new THREE.MeshBasicMaterial({
          color: 0x00ff00,
          wireframe: true,
          visible: false
        });

        // 몸통 콜라이더
        const bodyGeometry = new THREE.BoxGeometry(2.0, 0.6, 0.6);
        const bodyCollider = new THREE.Mesh(bodyGeometry, colliderMaterial);
        bodyCollider.position.set(-0.1, 0, 0);
        compoundCollider.add(bodyCollider);

        // 꼬리 콜라이더
        const tailGeometry = new THREE.BoxGeometry(0.5, 0.15, 0.8);
        const tailCollider = new THREE.Mesh(tailGeometry, colliderMaterial);
        tailCollider.position.set(-1.0, 0.0, 0);
        compoundCollider.add(tailCollider);

        // 왼쪽 지느러미 콜라이더
        const leftFinGeometry = new THREE.BoxGeometry(0.4, 0.1, 0.3);
        const leftFinCollider = new THREE.Mesh(leftFinGeometry, colliderMaterial);
        leftFinCollider.position.set(0.4, -0.1, -0.4);
        leftFinCollider.rotation.z = Math.PI / 8;
        compoundCollider.add(leftFinCollider);

        // 오른쪽 지느러미 콜라이더
        const rightFinGeometry = new THREE.BoxGeometry(0.4, 0.1, 0.3);
        const rightFinCollider = new THREE.Mesh(rightFinGeometry, colliderMaterial);
        rightFinCollider.position.set(0.4, -0.1, 0.4);
        rightFinCollider.rotation.z = Math.PI / 8;
        compoundCollider.add(rightFinCollider);

        scene.add(object);
        whale = {
          mesh: object,
          collider: compoundCollider
        };

        resolve();

      }, undefined, reject);
    }, undefined, reject);
  });
}

let shockwaveMesh;

function init(event) {
  document.body.style.background = 'none';
  document.body.style.backgroundColor = 'transparent';

  const gameHolder = document.getElementById('gameHolder');
  if (gameHolder) {
    gameHolder.style.backgroundColor = 'transparent';
  }

  const worldContainer = document.getElementById('world');
  if (worldContainer) {
    worldContainer.style.position = 'absolute';
    worldContainer.style.top = '0';
    worldContainer.style.left = '0';
    worldContainer.style.width = '100%';
    worldContainer.style.height = '100%';
    worldContainer.style.zIndex = '1';
  }

  const headerElement = document.querySelector('.header');
  if (headerElement) {
    headerElement.style.position = 'absolute'; // 위치 기준을 body로 변경
    headerElement.style.top = '50';
    headerElement.style.left = '0';
    headerElement.style.width = '100%';
    headerElement.style.backgroundColor = 'transparent'; // 배경 투명 처리
    headerElement.style.zIndex = '10'; // 캔버스(z-index: 1)보다 위에 있도록 설정
  }


  vignetteElement = document.createElement('div');
  vignetteElement.id = 'vignette';
  vignetteElement.style.position = 'fixed';
  vignetteElement.style.top = '0';
  vignetteElement.style.left = '0';
  vignetteElement.style.width = '100%';
  vignetteElement.style.height = '100%';
  // 가운데는 투명하고 가장자리는 붉은색인 그라데이션 효과
  vignetteElement.style.background = 'radial-gradient(ellipse at center, rgba(255,0,0,0) 0%, rgba(255,0,0,0.35) 100%)';
  vignetteElement.style.opacity = '0'; // 초기에는 투명하게
  vignetteElement.style.zIndex = '5';  // 게임 UI(10)보다는 아래, 캔버스(1)보다는 위에 위치
  vignetteElement.style.pointerEvents = 'none'; // 마우스 클릭을 방해하지 않도록 설정

  document.body.appendChild(vignetteElement);

  // --- ▼▼▼ 화면 플래시 효과용 div 생성 (수정) ▼▼▼ ---
  flashEffectElement = document.createElement('div');
  flashEffectElement.style.position = 'fixed';
  flashEffectElement.style.top = '0';
  flashEffectElement.style.left = '0';
  flashEffectElement.style.width = '100%';
  flashEffectElement.style.height = '100%';
  flashEffectElement.style.backgroundColor = 'rgba(255, 220, 0, 1)'; // 노란색
  flashEffectElement.style.opacity = '0';
  flashEffectElement.style.pointerEvents = 'none';
  flashEffectElement.style.zIndex = '999';
  document.body.appendChild(flashEffectElement);

  shockwaveCounterElement = document.createElement('div');
  shockwaveCounterElement.style.position = 'fixed';
  shockwaveCounterElement.style.bottom = '20px'; // 하단에 위치
  shockwaveCounterElement.style.left = '20px';   // 왼쪽에 위치
  shockwaveCounterElement.style.color = 'white';
  shockwaveCounterElement.style.fontSize = '22px';
  shockwaveCounterElement.style.fontFamily = 'sans-serif';
  shockwaveCounterElement.style.textShadow = '1px 1px 2px black'; // 글자 가독성 향상
  shockwaveCounterElement.style.zIndex = '1000';
  document.body.appendChild(shockwaveCounterElement);

  fieldDistance = document.getElementById("distValue");
  energyBar = document.getElementById("energyBar");
  replayMessage = document.getElementById("replayMessage");
  fieldLevel = document.getElementById("levelValue");
  levelCircle = document.getElementById("levelCircleStroke");

  replayMessage = document.createElement('div');
  replayMessage.id = 'replayMessage';

  // 스타일 설정 (화면 중앙 하단)
  replayMessage.style.position = 'absolute';
  replayMessage.style.bottom = '15%';             // 화면 하단에서 15% 위에 위치
  replayMessage.style.left = '50%';
  replayMessage.style.transform = 'translateX(-50%)'; // X축 기준으로만 중앙 정렬
  replayMessage.style.color = 'black';            // 글자색: 검은색
  replayMessage.style.fontSize = '2.5em';         // 글자 크기
  replayMessage.style.fontWeight = 'bold';        // 글자 굵기
  replayMessage.style.textShadow = '0 0 8px white, 0 0 5px white'; // 가독성을 위한 그림자
  replayMessage.style.textAlign = 'center';
  replayMessage.style.zIndex = '1001';             // 다른 UI 요소들 위에 표시
  replayMessage.style.display = 'none';           // 처음에는 숨겨둡니다.

  replayMessage.innerHTML = 'GAME OVER<br><span style="font-size: 0.7em; font-weight: normal;">CLICK TO RESTART</span>';

  if (gameHolder) {
    gameHolder.appendChild(replayMessage);
  } else {
    document.body.appendChild(replayMessage);
  }


  // 이전에 HTML에서 찾으려 했던 요소를 이제 JS로 만듭니다.
  victoryMessage = document.createElement('div');
  victoryMessage.id = 'victoryMessage'; // ID 부여

  // 다른 메시지들과 스타일 통일성을 위해 클래스 추가
  victoryMessage.classList.add('message');

  // 스타일 설정 (화면 정중앙에 위치하도록)
  victoryMessage.style.position = 'absolute';
  victoryMessage.style.left = '50%';
  victoryMessage.style.top = '70%';
  victoryMessage.style.transform = 'translateX(-50%)';
  victoryMessage.style.color = 'black';
  victoryMessage.style.fontSize = '2.5em';
  victoryMessage.style.fontWeight = 'bold';
  victoryMessage.style.textShadow = '0px 0px 8px white, 0 0 5px white';
  victoryMessage.style.textAlign = 'center';
  victoryMessage.style.zIndex = '1002'; // 다른 UI 위에 표시
  victoryMessage.style.display = 'none';

  victoryMessage.innerHTML = 'VICTORY!<br><span style="font-size: 0.4em; font-weight: normal;">CLICK TO RESTART</span>';

  // --- ▼▼▼ 게임오버 배경용 div 생성 ▼▼▼ ---
  gameOverBackgroundElement = document.createElement('div');
  gameOverBackgroundElement.id = 'gameOverBackground';

  // 스타일 설정
  gameOverBackgroundElement.style.position = 'fixed';
  gameOverBackgroundElement.style.top = '0';
  gameOverBackgroundElement.style.left = '0';
  gameOverBackgroundElement.style.width = '100%';
  gameOverBackgroundElement.style.height = '100%';
  gameOverBackgroundElement.style.backgroundImage = 'url(img/gameover_ai.png)';
  gameOverBackgroundElement.style.backgroundSize = 'cover';
  gameOverBackgroundElement.style.backgroundPosition = 'center';
  gameOverBackgroundElement.style.opacity = '0'; // 처음에는 완전히 투명
  gameOverBackgroundElement.style.pointerEvents = 'none'; // 클릭 방해하지 않음
  // z-index: 캔버스(1)보다는 위, 글씨(1001)보다는 아래에 위치
  gameOverBackgroundElement.style.zIndex = '1000';
  document.body.appendChild(gameOverBackgroundElement);


  victoryBackgroundElement = document.createElement('div');
  victoryBackgroundElement.id = 'victoryBackground';
  victoryBackgroundElement.style.position = 'fixed';
  victoryBackgroundElement.style.top = '0';
  victoryBackgroundElement.style.left = '0';
  victoryBackgroundElement.style.width = '100%';
  victoryBackgroundElement.style.height = '100%';
  victoryBackgroundElement.style.backgroundImage = 'url(img/victory_ai.png)';
  victoryBackgroundElement.style.backgroundSize = 'cover';
  victoryBackgroundElement.style.backgroundPosition = 'center';
  victoryBackgroundElement.style.opacity = '0'; // 처음에는 완전히 투명
  victoryBackgroundElement.style.pointerEvents = 'none'; // 클릭 방해하지 않음
  // z-index: 게임오버 배경과 동일한 레벨
  victoryBackgroundElement.style.zIndex = '1000';
  document.body.appendChild(victoryBackgroundElement);




  if (gameHolder) {
    gameHolder.appendChild(victoryMessage);
  } else {
    document.body.appendChild(victoryMessage);
  }

  resetGame();
  createScene();
  createLights();
  //0622
  createEnvironmentBackground();


  const loadingManager = new THREE.LoadingManager();


  loadingManager.onProgress = function (item, loaded, total) {
    console.log(`Loading: ${item} ${loaded}/${total}`);

  };


  loadingManager.onLoad = function () {
    console.log("All models loaded successfully! Starting game loop.");

    loop();
  };

  // 모델 로딩 중 오류가 발생했을 때 실행될 콜백 함수입니다.
  loadingManager.onError = function (url) {
    console.error('Error loading: ' + url + '. Please check the file path and network connection.');
  };

  createSea();
  createShadowPlane();
  createSky();
  createCoins();
  createEnnemies();
  createParticles();

  const shockwaveGeo = new THREE.RingGeometry(5, 10, 64); // (내부반지름, 외부반지름, 분할 수)
  const shockwaveMat = new THREE.MeshBasicMaterial({
    color: Colors.yellow,
    transparent: true,
    opacity: 1
  });
  shockwaveMesh = new THREE.Mesh(shockwaveGeo, shockwaveMat);
  // 링이 바닥에 퍼져나가도록 X축으로 90도 회전
  shockwaveMesh.rotation.x = -Math.PI / 2;
  shockwaveMesh.visible = false; // 처음엔 보이지 않게 설정
  scene.add(shockwaveMesh);

  // 3. 로딩 화면 표시
  showLoadingScreen();

  // 4. 모든 로딩 작업을 Promise로 관리
  loadingManager.onProgress = function (url, itemsLoaded, itemsTotal) {
    const progress = Math.round((itemsLoaded / itemsTotal) * 100);
    updateLoadingProgress(progress);
  };

  const loadingPromises = [
    loadWhaleModel(loadingManager),
    loadEnnemyModels(loadingManager),
    loadCoinModel(loadingManager)
  ];

  // 5. 모든 로딩이 완료되면 게임 시작
  Promise.all(loadingPromises)
    .then(() => {
      console.log("All assets are loaded and pools are filled. Starting the game!");
      // 로딩이 완료되면 0.5초 후 화면을 보여주고 게임 시작
      setTimeout(() => {
        hideLoadingScreen();
      }, 500);
    })
    .catch(error => {
      console.error("Failed to load assets:", error);
    });

  document.addEventListener('mouseup', handleMouseUp, false);
  document.addEventListener('touchend', handleTouchEnd, false);

  loop();
}




window.addEventListener('load', init, false);

function updateShockwaveUI() {
  if (!shockwaveCounterElement) return;

  const count = game.shockwaveCoinCounter;
  const maxCount = 5;

  let stars = '';
  for (let i = 0; i < maxCount; i++) {
    stars += (i < count) ? '★' : '☆'; // 채워진 별, 빈 별로 진행도 표시
  }

  shockwaveCounterElement.textContent = `SHOCKWAVE: ${stars}`;
}

//0525

document.addEventListener('keydown', (e) => {
  if (game.status === "playing") {
    handleMoveKey(e.key);
  }
});


// gamesystem 함수에서는 카메라 업데이트만 처리합니다.
function gamesystem() {
  updateCamera();
  // 기존 카메라 업데이트 코드는 모두 대체됩니다.
}

function updateCamera() {
  if (!whale) return;
  const P = whale.mesh.position;

  const DISTANCE_BACK = 500;   // 뒤로 떨어질 거리
  const HEIGHT = 50;    // 위로 띄울 높이
  cameraAnchor.position.set(
    P.x - DISTANCE_BACK,
    P.y + HEIGHT,
    P.z
  );

  const LOOK_AHEAD = 100;
  camera.lookAt(
    new THREE.Vector3(
      P.x + LOOK_AHEAD,
      cameraAnchor.position.y,
      P.z
    )
  );
}

let loadingScreenElement;

// 로딩 화면을 생성하고 표시하는 함수
function showLoadingScreen() {
  loadingScreenElement = document.createElement('div');
  loadingScreenElement.style.position = 'fixed';
  loadingScreenElement.style.top = '0';
  loadingScreenElement.style.left = '0';
  loadingScreenElement.style.width = '100%';
  loadingScreenElement.style.height = '100%';
  loadingScreenElement.style.backgroundColor = '#1a1a1a';
  loadingScreenElement.style.color = 'white';
  loadingScreenElement.style.display = 'flex';
  loadingScreenElement.style.justifyContent = 'center';
  loadingScreenElement.style.alignItems = 'center';
  loadingScreenElement.style.zIndex = '999';
  loadingScreenElement.style.fontSize = '2em';
  loadingScreenElement.style.fontFamily = 'sans-serif';
  loadingScreenElement.style.transition = 'opacity 0.5s';

  const loadingText = document.createElement('p');
  loadingText.id = 'loadingText';
  loadingText.textContent = 'Loading... 0%';
  loadingScreenElement.appendChild(loadingText);

  document.body.appendChild(loadingScreenElement);
}

// 로딩 진행률을 업데이트하는 함수
function updateLoadingProgress(progress) {
  const loadingText = document.getElementById('loadingText');
  if (loadingText) {
    loadingText.textContent = `Loading... ${progress}%`;
  }
}

// 로딩 화면을 서서히 사라지게 하고 제거하는 함수
function hideLoadingScreen() {
  if (loadingScreenElement) {
    loadingScreenElement.style.opacity = '0';
    setTimeout(() => {
      loadingScreenElement.remove();
    }, 500); // transition 시간과 동일하게 설정
  }
}

