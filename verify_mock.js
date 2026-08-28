
global.window = {
  addEventListener: () => {},
  location: { search: "" },
  performance: { now: () => Date.now() }
};
global.document = {
  addEventListener: () => {},
  getElementById: () => ({
    addEventListener: () => {},
    appendChild: () => {},
    classList: { add: () => {}, remove: () => {} },
    style: {},
    querySelector: () => ({ style: {}, querySelectorAll: () => [], innerHTML: "" }),
    querySelectorAll: () => [],
    clientWidth: 800,
    clientHeight: 600
  }),
  createElement: () => ({
    getContext: () => ({ fillRect: () => {} }),
    width: 0,
    height: 0
  })
};
global.THREE = {
  Vector3: function() { this.set = () => {}; this.clone = () => this; this.copy = () => {}; },
  Color: function() { this.set = () => {}; this.getHex = () => 0xffffff; },
  Group: function() { this.position = { set: () => {}, clone: () => ({}), copy: () => {} }; this.scale = { set: () => {} }; this.add = () => {}; this.remove = () => {}; this.children = []; },
  Scene: function() { this.add = () => {}; },
  PerspectiveCamera: function() { this.position = { set: () => {} }; this.rotation = { set: () => {} }; },
  WebGLRenderer: function() { this.setSize = () => {}; this.shadowMap = {}; this.domElement = {}; },
  AmbientLight: function() {},
  DirectionalLight: function() { this.position = { set: () => {} }; },
  Clock: function() {},
  MeshStandardMaterial: function() {},
  MeshToonMaterial: function() {},
  MeshBasicMaterial: function() {},
  BoxGeometry: function() {},
  CylinderGeometry: function() {},
  TorusGeometry: function() {},
  IcosahedronGeometry: function() {},
  PlaneGeometry: function() {},
  GridHelper: function() { this.position = {}; },
  FogExp2: function() {},
  CanvasTexture: function() {},
  Raycaster: function() { this.setFromCamera = () => {}; }
};
global.SoundFX = {
  playTone: () => {},
  playClick: () => {}
};

require("./data.js");

if (!global.GameState) {
  global.GameState = {
    loadout: { primary: "SHIFT_AR", secondary: "RECON_PIS", melee: "COMBAT_KNIFE", explosive: "TACTICAL_GRENADE", armor: "KEVLAR_VEST", skin: "HACKER" },
    stats: { kills: 0, deaths: 0, matchesPlayed: 0, matchesWon: 0, accuracyCount: 0, accuracyTotal: 0, targetsHit: 0, botKills: 0 }
  };
}

try {
  require("./app.js");
  console.log("SUCCESS: app.js loaded successfully!");
} catch (e) {
  console.error("ERROR in app.js:", e.stack);
}
try {
  require("./game.js");
  console.log("SUCCESS: game.js loaded successfully!");
} catch (e) {
  console.error("ERROR in game.js:", e.stack);
}
