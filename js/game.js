//COLORS
var THREE = require('three')
var Colors = {
    red:0xf25346,
    white:0xd8d0d1,
    brown:0x59332e,
    brownDark:0x23190f,
    pink:0xF5986E,
    yellow:0xf4ce93,
    blue:0x68c3c0,
    green:0x47c149,
};

///////////////

// GAME VARIABLES
var game;
var deltaTime = 0.01;
var newTime = new Date().getTime();
var oldTime = new Date().getTime();

function resetGame() {
  game = {
    speed:0.00002,
    defaultCamHeight:100,

    earthRadius:800,
    earthLength:800,
    earthRotationSpeed:0.006,

    wavesMinAmp : 4,
    wavesMaxAmp : 10,
    wavesMinSpeed : 0.001,
    wavesMaxSpeed : 0.003,
  };
}

//THREEJS RELATED VARIABLES

var scene,
    camera, fieldOfView, aspectRatio, nearPlane, farPlane,
    renderer,
    container,
    controls;

//SCREEN & MOUSE VARIABLES

var HEIGHT, WIDTH,
    mousePos = { x: 0, y: 0 };

//INIT THREE JS, SCREEN AND MOUSE EVENTS

function createScene() {

  HEIGHT = window.innerHeight;
  WIDTH = window.innerWidth;

  scene = new THREE.Scene();
  aspectRatio = WIDTH / HEIGHT;
  fieldOfView = 50;
  nearPlane = .1;
  farPlane = 1000000000;
  camera = new THREE.PerspectiveCamera(
    fieldOfView,
    aspectRatio,
    nearPlane,
    farPlane
    );
  scene.fog = new THREE.Fog(0xcacaca, 100, 2000);
  camera.position.x = 0;
  camera.position.z = 200;
  camera.position.y = game.defaultCamHeight * 1.3;

  renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(WIDTH, HEIGHT);

  renderer.shadowMap.enabled = true;

  container = document.getElementById('world');
  container.appendChild(renderer.domElement);

  window.addEventListener('resize', handleWindowResize, false);
}

function handleWindowResize() {
  HEIGHT = window.innerHeight;
  WIDTH = window.innerWidth;
  renderer.setSize(WIDTH, HEIGHT);
  camera.aspect = WIDTH / HEIGHT;
  camera.updateProjectionMatrix();
}

var ambientLight, hemisphereLight, sunLight, moonLight;

function createLights() {

  hemisphereLight = new THREE.HemisphereLight(0xaaaaaa,0x000000, .9)

  ambientLight = new THREE.AmbientLight(0xdc8874, .5);

  sunLight = new THREE.DirectionalLight(0xffffff, .9);
  sunLight.position.set(150, 350, 350);
  sunLight.castShadow = true;
  sunLight.shadow.camera.left = -400;
  sunLight.shadow.camera.right = 400;
  sunLight.shadow.camera.top = 400;
  sunLight.shadow.camera.bottom = -400;
  sunLight.shadow.camera.near = 1;
  sunLight.shadow.camera.far = 1000;
  sunLight.shadow.mapSize.width = 4096;
  sunLight.shadow.mapSize.height = 4096;

  moonLight = new THREE.DirectionalLight(0xaaaaff, .6);
  moonLight.position.set(0, 0, 350);
  moonLight.castShadow = true;
  moonLight.shadow.camera.left = -400;
  moonLight.shadow.camera.right = 400;
  moonLight.shadow.camera.top = 400;
  moonLight.shadow.camera.bottom = -400;
  moonLight.shadow.camera.near = 1;
  moonLight.shadow.camera.far = 1000;
  moonLight.shadow.mapSize.width = 4096;
  moonLight.shadow.mapSize.height = 4096;


  var ch = new THREE.CameraHelper(moonLight.shadow.camera);

  // scene.add(ch);
  scene.add(hemisphereLight);
  scene.add(sunLight);
  scene.add(ambientLight);
  scene.add(moonLight);
}

Earth = function() {
  var geom = new THREE.CylinderGeometry(game.earthRadius,game.earthRadius,game.earthLength,40,10);
  geom.applyMatrix(new THREE.Matrix4().makeRotationX(-Math.PI/2));
  geom.mergeVertices();
  var l = geom.vertices.length;

  this.waves = [];

  for (var i=0;i<l;i++) {
    var v = geom.vertices[i];
    this.waves.push({y:v.y,
                     x:v.x,
                     z:v.z,
                     ang:Math.random()*Math.PI*2,
                     amp:game.wavesMinAmp + Math.random()*(game.wavesMaxAmp-game.wavesMinAmp),
                     speed:game.wavesMinSpeed + Math.random()*(game.wavesMaxSpeed - game.wavesMinSpeed)
                    });
  };
  var mat = new THREE.MeshPhongMaterial({
    color:Colors.green,
    transparent:true,
    opacity:1,
    shading:THREE.FlatShading,

  });

  this.mesh = new THREE.Mesh(geom, mat);
  this.mesh.name = "Earth";
  this.mesh.receiveShadow = true;
}

Earth.prototype.moveSurface = function () {
  var verts = this.mesh.geometry.vertices;
  var l = verts.length;
  for (var i=0; i<l; i++) {
    var v = verts[i];
    var vprops = this.waves[i];
    v.x =  vprops.x + Math.cos(vprops.ang/10)*vprops.amp;
    v.y = vprops.y + Math.sin(vprops.ang/10)*vprops.amp;
    vprops.ang += vprops.speed*deltaTime;
    this.mesh.geometry.verticesNeedUpdate=true;
  }
}

Stars = function() {
    this.particleCount = 4000;
     
    this.particles = new THREE.Geometry();
 
    for (var p = 0; p < this.particleCount; p++) {
        var x = Math.random() *  4000 - 2000;
        var y = Math.random() *  800 - 200;
        var z = Math.random() * -200 - 400;
               
        var particle = new THREE.Vector3(x, y, z);
         
        this.particles.vertices.push(particle);
    }

    this.particleMaterial = new THREE.PointsMaterial({
      color: 0xffffff, 
      size: 2,
      blending: THREE.AdditiveBlending,
      transparent: true,
    });
      
    this.particleSystem = new THREE.Points(this.particles, this.particleMaterial);
    this.stars = this.particleSystem;
}

Sun = function() {
  this.mesh = new THREE.Object3D();
  this.mesh.name = "sun";
  var geom = new THREE.OctahedronGeometry(24, 3);
  var sunTexture = new THREE.TextureLoader().load( "resources/images/sunbig.jpg" );
  var mat = new THREE.MeshBasicMaterial({
    map: sunTexture,
    shading:THREE.FlatShading
  });

  var spriteMap = new THREE.TextureLoader().load( "resources/images/glow.png" );
  var spriteMaterial = new THREE.SpriteMaterial( {
    map: spriteMap,
    color: Colors.yellow,
    transparent: true,
    blending: THREE.AdditiveBlending
  } );
  var sprite = new THREE.Sprite( spriteMaterial );
  sprite.scale.set(100, 100, 1)
  this.mesh.add(sprite); // this centers the glow at the mesh

  this.mesh.position.x = 0;
  this.mesh.position.z = -500;
  this.mesh.position.y = game.defaultCamHeight*2.5;

  this.mesh.add(new THREE.Mesh(geom, mat));
}

Moon = function() {
  this.mesh = new THREE.Object3D();
  this.mesh.name = "moon";
  var geom = new THREE.OctahedronGeometry(24, 3);
  var sunTexture = new THREE.TextureLoader().load( "resources/images/moon.jpg" );
  var mat = new THREE.MeshBasicMaterial({
    map: sunTexture,
    shading:THREE.FlatShading
  });

  var spriteMap = new THREE.TextureLoader().load( "resources/images/glow.png" );
  var spriteMaterial = new THREE.SpriteMaterial( {
    map: spriteMap,
    color: Colors.white,
    transparent: true,
    blending: THREE.AdditiveBlending
  } );
  var sprite = new THREE.Sprite( spriteMaterial );
  sprite.scale.set(80, 80, 1)
  this.mesh.add(sprite); // this centers the glow at the mesh

  this.mesh.add(new THREE.Mesh(geom, mat));
}

// 3D Models
var earth;
var sun;
var moon;
var stars;
var clouds;

function createStars() {
  stars = new Stars();
  scene.add(stars.stars);
}

function createSun() {
  sun = new Sun();
  scene.add(sun.mesh)
}

function createMoon() {
  moon = new Moon();
  scene.add(moon.mesh);
}

function createEarth() {
  earth = new Earth();
  earth.mesh.position.y = -game.earthRadius;
  scene.add(earth.mesh);
}

function createClouds() {
  clouds = new Clouds();
  scene.add(clouds.mesh);
}


function loop() {

  newTime = new Date().getTime();
  deltaTime = newTime-oldTime;
  oldTime = newTime;

  if ( earth.mesh.rotation.z > 2*Math.PI)  earth.mesh.rotation.z -= 2*Math.PI;

  earth.moveSurface();

  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

function render() {
  renderer.render(scene, camera);
}

function initSky(effectController) {
  // Add Sky Mesh
  sky = new THREE.Sky();
  scene.add( sky.mesh );
  // Add Sun Helper
  sunSphere = new THREE.Mesh(
    new THREE.SphereBufferGeometry( 160, 16, 16 ),
    new THREE.MeshBasicMaterial( { color: 0xff00ff } )
  );
  sunSphere.visible = true;
  scene.add( sunSphere );

  function updateLightColors() {
    if (effectController.timeOfDay < 0.25 || effectController.timeOfDay > 0.75 ) {      
      sunLight.color = new THREE.Color(0x010321);
      ambientLight.color = new THREE.Color(0x010321);
      hemisphereLight.color = new THREE.Color(0x010321);
      if (stars)
        stars.stars.material.opacity = 0.8;
    }
    else if (effectController.timeOfDay < 0.28 && effectController.timeOfDay > 0.2 ) {
      sunLight.color = new THREE.Color(0x351304);
      ambientLight.color = new THREE.Color(0x351304);
      hemisphereLight.color = new THREE.Color(0x351304);
      if (stars)
        stars.stars.material.opacity = 0.2;
    }
    else if (effectController.timeOfDay < 0.31 && effectController.timeOfDay >= 0.28 ) {
      sunLight.color = new THREE.Color(0xd1a287);
      ambientLight.color = new THREE.Color(0xd1a287);
      hemisphereLight.color = new THREE.Color(0xd1a287);
      if (stars)
        stars.stars.material.opacity = 0;
    }
    else if (effectController.timeOfDay < 0.72 && effectController.timeOfDay >= 0.68 ) {
      sunLight.color = new THREE.Color(0xd1a287);
      ambientLight.color = new THREE.Color(0xd1a287);
      hemisphereLight.color = new THREE.Color(0xd1a287);
      if (stars)
        stars.stars.material.opacity = 0;
    }
    else if (effectController.timeOfDay < 0.75 && effectController.timeOfDay >= 0.72 ) {
      sunLight.color = new THREE.Color(0x351304);
      ambientLight.color = new THREE.Color(0x351304);
      hemisphereLight.color = new THREE.Color(0x351304);
      if (stars)
        stars.stars.material.opacity = 0.2;
    }
    else {
      sunLight.color = new THREE.Color(0xffffff);
      ambientLight.color = new THREE.Color(0xdc8874);
      hemisphereLight.color = new THREE.Color(0xaaaaaa);
      if (stars)
        stars.stars.material.opacity = 0;
    }
  }

  function guiChanged() {
    var uniforms = sky.uniforms;
    uniforms.turbidity.value = effectController.turbidity;
    uniforms.rayleigh.value = effectController.rayleigh;
    uniforms.luminance.value = effectController.luminance;
    uniforms.mieCoefficient.value = effectController.mieCoefficient;
    uniforms.mieDirectionalG.value = effectController.mieDirectionalG;
    sunSphere.position.x = Math.sin((effectController.timeOfDay * 2 * Math.PI) - (Math.PI))*250;
    sunSphere.position.y = -50 + Math.cos((effectController.timeOfDay * 2 * Math.PI) - (Math.PI))*500;
    sunSphere.position.z = -600;

    if (moon) {
      moon.mesh.position.x = Math.sin((effectController.timeOfDay * 2 * Math.PI))*250 * 1.2;
      moon.mesh.position.y = -50 + Math.cos((effectController.timeOfDay * 2 * Math.PI))*500*1.1 - 100;
      moon.mesh.position.z = -600;
      moonLight.position.x = moon.mesh.position.x;
      moonLight.position.y = moon.mesh.position.y;
    }
    if (sun) {
      sun.mesh.position.x = sunSphere.position.x*1.2;
      sun.mesh.position.y = sunSphere.position.y*1.1 - 100;
    }
    updateLightColors();
    sunLight.position.x = sunSphere.position.x;
    sunLight.position.y = sunSphere.position.y;
    sunSphere.visible = effectController.sun;
    sky.uniforms.sunPosition.value.copy( sunSphere.position );
    renderer.render( scene, camera );
  }
  var gui = new dat.GUI();
  gui.add( effectController, "turbidity", 1.0, 20.0, 0.1 ).onChange( guiChanged );
  gui.add( effectController, "rayleigh", 0.0, 4, 0.001 ).onChange( guiChanged );
  gui.add( effectController, "mieCoefficient", 0.0, 0.1, 0.001 ).onChange( guiChanged );
  gui.add( effectController, "mieDirectionalG", 0.0, 1, 0.001 ).onChange( guiChanged );
  gui.add( effectController, "luminance", 0.0, 2 ).onChange( guiChanged );
  gui.add( effectController, "timeOfDay", 0, 1, 0.0001 ).onChange( guiChanged );
  gui.add( effectController, "sun" ).onChange( guiChanged );
  guiChanged();
}

function init(event) {

  // UI
  var date = new Date();
  var current_hour = date.getHours();
  resetGame();
  createScene();

  var weather = new Weather();
  window.addEventListener('weatherLoaded', function() {
    var effectController  = {
      turbidity: 10,
      rayleigh: 2,
      mieCoefficient: 0.005,
      mieDirectionalG: 0.261,
      luminance: 1,
      timeOfDay: 0.5,
      sun: false
    };
    var sunrise = weather.weatherData.sys.sunrise;
    var sunset = weather.weatherData.sys.sunset;
    var now = Date.now() / 1000;
    console.log(sunrise, sunset, now);
    if (now >= sunrise && now <= sunset) {
      effectController.timeOfDay = 0.25 + (now - sunrise) / (2 * (sunset - sunrise));
    }
    else if (now > sunset) {
      effectController.timeOfDay = 0.75 + (now - sunset) / (2 * ((sunrise + 86400) - sunset));
    }
    else if (now < sunrise) {
      effectController.timeOfDay = (now - (sunset - 86400)) / (2 * (sunrise - (sunset - 86400)))
    }

    if (weather.weatherData.clouds.all < 80) {
      createMoon();
      createStars();
      createSun();
    }
    else {
      createClouds();
    }
    createLights();
    createEarth();
    initSky(effectController);
    loop();
  });
}

window.addEventListener('load', init, false);
