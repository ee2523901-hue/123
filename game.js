// GUNFIGHT 3D 遊戲引擎 (Three.js)

const GameEngine = {
  // 3D 核心元件
  container: null,
  scene: null,
  camera: null,
  renderer: null,
  clock: null,

  // 遊戲狀態
  isTraining: false,
  mapId: "SLUMS",
  matchTimer: 900, // 15分鐘 = 900秒
  timerInterval: null,
  blueScore: 0,
  redScore: 0,
  isGameOver: false,

  // 玩家控制
  player: {
    height: 1.6,
    speed: 0.1,
    velocity: new THREE.Vector3(),
    health: 100,
    maxHealth: 100,
    armor: 100,
    maxArmor: 100,
    equipped: {
      primary: null,
      secondary: null,
      melee: null,
      explosive: null,
      armorItem: null
    },
    activeSlot: "primary", // "primary", "secondary", "melee"
    ammo: {
      primary: 0,
      primaryReserve: 0,
      secondary: 0,
      secondaryReserve: 0
    },
    isReloading: false,
    lastShotTime: 0,
    kills: 0,
    deaths: 0,
    shotsFired: 0,
    shotsHit: 0
  },

  // 輸入狀態
  keys: { w: false, a: false, s: false, d: false, Shift: false },
  mouse: { x: 0, y: 0 },
  isLocked: false,

  // 遊戲實體
  obstacles: [],     // 障礙物碰撞體 (AABB)
  bots: [],          // 敵我 AI 清單
  targets: [],       // 靶場靶子清單
  bullets: [],       // 彈道軌跡線
  particles: [],     // 爆炸與受傷粒子
  damageFloats: [],  // 傷害飄字 HTML elements
  grenades: [],      // 投擲炸彈

  // 槍枝 3D 模型物件
  gunGroup: null,
  recoilOffset: new THREE.Vector3(),
  gunBasePosition: new THREE.Vector3(0.25, -0.25, -0.5),
  meleeSwingAnimTime: 0,
  saberRing: null,
  grenadeTrack1: null,
  grenadeTrack2: null,

  // 出生點
  blueSpawn: new THREE.Vector3(-18, 0.5, 0),
  redSpawn: new THREE.Vector3(18, 0.5, 0),

  init() {
    this.container = document.getElementById("three-game-container");
    this.clock = new THREE.Clock();

    // 設置 Pointer Lock
    const lockPrompt = document.getElementById("lock-prompt");
    this.container.addEventListener("click", () => {
      if (!this.isLocked && !this.isGameOver) {
        this.container.requestPointerLock();
      }
    });

    document.addEventListener("pointerlockchange", () => {
      if (document.pointerLockElement === this.container) {
        this.isLocked = true;
        lockPrompt.style.display = "none";
      } else {
        this.isLocked = false;
        if (!this.isGameOver) {
          lockPrompt.style.display = "flex";
        }
      }
    });

    // 鍵盤與滑鼠事件
    window.addEventListener("keydown", (e) => this.onKeyDown(e));
    window.addEventListener("keyup", (e) => this.onKeyUp(e));
    window.addEventListener("mousemove", (e) => this.onMouseMove(e));
    window.addEventListener("mousedown", (e) => this.onMouseDown(e));
    window.addEventListener("mouseup", (e) => this.onMouseUp(e));
    window.addEventListener("contextmenu", (e) => {
      if (this.isLocked) e.preventDefault();
    });

    // 靶場結束按鈕
    document.getElementById("btn-end-training").addEventListener("click", (e) => {
      e.stopPropagation();
      this.endMatch();
    });

    // 暫停提示介面結束戰鬥按鈕 (解決滑鼠鎖定時點不到 Exit 按鈕的問題)
    const exitBtn = document.getElementById("btn-lock-prompt-exit");
    if (exitBtn) {
      exitBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.endMatch();
      });
    }
  },

  start(isTraining = false, mapId = "SLUMS") {
    this.isTraining = isTraining;
    this.mapId = mapId;
    this.isGameOver = false;
    this.blueScore = 0;
    this.redScore = 0;
    this.matchTimer = 900;
    this.currentRound = 1;

    // 清空舊實體
    this.bots = [];
    this.obstacles = [];
    this.targets = [];
    this.bullets = [];
    this.particles = [];
    this.damageFloats = [];
    this.grenades = [];

    // 初始化玩家裝備
    this.initPlayerLoadout();

    // 顯示遊戲容器
    this.container.classList.add("active");
    document.getElementById("lock-prompt").style.display = "flex";
    
    // 初始化 Three.js 場景
    this.buildScene();

    // 啟動倒數計時器
    if (this.timerInterval) clearInterval(this.timerInterval);
    if (!isTraining) {
      document.getElementById("training-panel").classList.remove("active");
      this.timerInterval = setInterval(() => {
        if (this.isLocked && !this.isGameOver && this.isRoundActive) {
          this.matchTimer--;
          this.updateHUDTimer();
          if (this.matchTimer <= 0) {
            this.endMatch();
          }
        }
      }, 1000);
    } else {
      document.getElementById("training-panel").classList.add("active");
      this.updateTrainingHUD();
    }

    // 重設 HUD 分數與血量
    this.updateHUDScore();
    this.updateHUDPlayerStats();

    // 開始首回合 (Roblox Rivals 風格)
    this.startNewRound();

    // 開始繪製動畫
    this.animate();
  },

  startNewRound() {
    this.isRoundActive = false;
    this.isRoundOver = false;
    this.roundCountdown = 3.2;

    // 重置玩家血量、護甲與位置
    this.player.health = 100;
    this.player.armor = this.player.equipped.armorItem ? this.player.equipped.armorItem.armorValue : 50;
    this.camera.position.set(this.blueSpawn.x, this.player.height, this.blueSpawn.z);
    this.camera.rotation.set(0, -Math.PI / 2, 0);

    // 補充子彈
    this.player.ammo.primary = this.player.equipped.primary.mag;
    this.player.ammo.primaryReserve = this.player.equipped.primary.ammo;
    this.player.ammo.secondary = this.player.equipped.secondary.mag;
    this.player.ammo.secondaryReserve = this.player.equipped.secondary.ammo;
    this.updateHUDPlayerStats();

    // 清空舊子彈/手榴彈
    this.bullets.forEach(b => this.scene.remove(b.mesh));
    this.bullets = [];
    this.grenades.forEach(g => this.scene.remove(g.mesh));
    this.grenades = [];

    // 重置機器人
    if (!this.isTraining) {
      this.bots.forEach(bot => this.scene.remove(bot.group));
      this.bots = [];
      this.spawnBots();
    } else {
      this.targets.forEach(tg => this.scene.remove(tg.mesh));
      this.targets = [];
      this.spawnTargets();
    }

    // 播放開局提示音
    SoundFX.playTone(330, 0.15, "triangle", false, 0.08);

    // 更新分數與面板
    this.updateHUDScore();
  },

  endRound(winnerTeam) {
    this.isRoundOver = true;
    this.isRoundActive = false;

    if (winnerTeam === "blue") {
      this.blueScore++; // 增加藍隊回合分數
      SoundFX.playTone(523, 0.15, "triangle", false, 0.1);
      setTimeout(() => SoundFX.playTone(659, 0.3, "sine", true, 0.1), 150);
      this.showRoundResultBanner("ROUND WON", "blue");
    } else {
      this.redScore++;
      SoundFX.playTone(220, 0.3, "sawtooth", true, 0.15);
      this.showRoundResultBanner("ROUND LOST", "red");
    }

    this.updateHUDScore();

    // 三戰兩勝 (第一到 3 回合勝利勝出，Rivals 競技對決)
    const winsToWin = 3;
    if (this.blueScore >= winsToWin || this.redScore >= winsToWin) {
      setTimeout(() => {
        this.endMatch();
      }, 3000);
    } else {
      // 3 秒後開啟下一回合
      setTimeout(() => {
        this.currentRound++;
        this.startNewRound();
      }, 3000);
    }
  },

  showRoundResultBanner(text, team) {
    const banner = document.getElementById("round-result-banner");
    if (!banner) return;
    banner.style.display = "block";
    const textEl = banner.querySelector(".result-banner-text");
    textEl.textContent = text;
    textEl.style.color = team === "blue" ? "var(--cyan)" : "var(--neon-red)";
    textEl.style.textShadow = team === "blue" ? "0 0 20px var(--cyan-glow)" : "0 0 20px var(--neon-red-glow)";

    setTimeout(() => {
      banner.style.display = "none";
    }, 2800);
  },

  showFightBanner() {
    const banner = document.getElementById("round-result-banner");
    if (!banner) return;
    banner.style.display = "block";
    const textEl = banner.querySelector(".result-banner-text");
    textEl.textContent = "FIGHT!";
    textEl.style.color = "var(--neon-green)";
    textEl.style.textShadow = "0 0 20px var(--neon-green-glow)";
    SoundFX.playTone(660, 0.3, "sine", true, 0.1);

    setTimeout(() => {
      banner.style.display = "none";
    }, 1000);
  },

  initPlayerLoadout() {
    const l = GameState.loadout;
    this.player.equipped.primary = GUNFIGHT_DATA.weapons.find(w => w.id === l.primary);
    this.player.equipped.secondary = GUNFIGHT_DATA.weapons.find(w => w.id === l.secondary);
    this.player.equipped.melee = GUNFIGHT_DATA.defense.find(d => d.id === l.melee);
    this.player.equipped.explosive = GUNFIGHT_DATA.explosives.find(e => e.id === l.explosive);
    
    const armorItem = GUNFIGHT_DATA.defense.find(d => d.id === l.armor);
    this.player.equipped.armorItem = armorItem;

    this.player.health = 100;
    this.player.maxHealth = 100;
    this.player.armor = armorItem ? armorItem.armorValue : 50;
    this.player.maxArmor = this.player.armor;

    // 裝填彈藥
    this.player.ammo.primary = this.player.equipped.primary.mag;
    this.player.ammo.primaryReserve = this.player.equipped.primary.ammo;
    this.player.ammo.secondary = this.player.equipped.secondary.mag;
    this.player.ammo.secondaryReserve = this.player.equipped.secondary.ammo;

    this.player.activeSlot = "primary";
    this.player.isReloading = false;
    this.player.isAiming = false;
    this.player.kills = 0;
    this.player.deaths = 0;
    this.player.shotsFired = 0;
    this.player.shotsHit = 0;
  },

  buildScene() {
    this.scene = new THREE.Scene();
    
    // 天空與霧氣 - 二次元明亮晴空
    this.scene.background = new THREE.Color(0xa7dbfc);
    this.scene.fog = new THREE.FogExp2(0xa7dbfc, 0.015);

    // 視訊相機
    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(65, aspect, 0.1, 1000);
    this.camera.position.set(this.blueSpawn.x, this.player.height, this.blueSpawn.z);
    this.camera.rotation.set(0, -Math.PI / 2, 0);
    this.camera.rotation.order = 'YXZ'; // 防止旋轉顛倒 (Gimbal Lock)
    this.scene.add(this.camera);

    // 渲染器
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // 清空並重新放置 Canvas
    const canvasContainer = document.getElementById("canvas-mount");
    canvasContainer.innerHTML = "";
    canvasContainer.appendChild(this.renderer.domElement);

    // 燈光 - 陽光與環境光 (Toon 著色器必需)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.3);
    dirLight.position.set(15, 30, 15);
    this.scene.add(dirLight);

    // 建立 3D 槍械模型（放置在相機前方）
    this.createGunModel();

    // 生成地圖
    this.generateMap();

    // 依照模式生成 Bot 或 靶子
    if (this.isTraining) {
      this.spawnTargets();
    } else {
      this.spawnBots();
    }
  },

  createGunModel() {
    // 清理舊槍模
    if (this.gunGroup) {
      this.camera.remove(this.gunGroup);
      this.gunGroup.traverse(child => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach(m => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    }

    this.gunGroup = new THREE.Group();
    this.gunGroup.position.copy(this.gunBasePosition);
    this.camera.add(this.gunGroup);

    const slot = this.player.activeSlot;
    const skinData = GUNFIGHT_DATA.skins.find(s => s.id === GameState.loadout.skin);
    const accentColorHex = skinData ? skinData.color : "#00f0ff";
    const accentColor = new THREE.Color(accentColorHex);

    // 建立卡通色階
    const createToonGradient = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 4; canvas.height = 1;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#111111'; ctx.fillRect(0, 0, 1, 1);
      ctx.fillStyle = '#666666'; ctx.fillRect(1, 0, 1, 1);
      ctx.fillStyle = '#bbbbbb'; ctx.fillRect(2, 0, 1, 1);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(3, 0, 1, 1);
      const texture = new THREE.CanvasTexture(canvas);
      texture.minFilter = THREE.NearestFilter;
      texture.magFilter = THREE.NearestFilter;
      return texture;
    };

    const gradientMap = createToonGradient();
    const glowMat = new THREE.MeshToonMaterial({ color: accentColor, gradientMap, roughness: 0.3 });
    const outlineMat = new THREE.MeshBasicMaterial({ color: 0x1c1a27, side: THREE.BackSide });

    // 寫實槍模材質 - 加強 Rivals 金屬質感與高反光烤漆
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x8e929a, metalness: 0.95, roughness: 0.12 });
    const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x18191c, metalness: 0.9, roughness: 0.15 });
    const polymerMat = new THREE.MeshStandardMaterial({ color: 0x242528, metalness: 0.2, roughness: 0.45 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x82542a, metalness: 0.05, roughness: 0.75 });
    const glassMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.55 });

    const activeWep = this.player.equipped[slot];
    const weapon = activeWep || { id: "RECON_PIS", subType: "pistol", dmg: 20 };
    const sub = weapon.subType || "ar";

    // 第一人稱持槍偏移常數 (對齊右側視角)
    const xP = 0.06;
    const yP = -0.08;
    const zOffset = -0.2;

    const addPart = (mesh, scaleFactor = 1.15) => {
      this.gunGroup.add(mesh);
      const outline = new THREE.Mesh(mesh.geometry.clone(), outlineMat);
      outline.position.copy(mesh.position);
      outline.rotation.copy(mesh.rotation);
      outline.scale.copy(mesh.scale).multiplyScalar(scaleFactor);
      this.gunGroup.add(outline);
    };

    if (slot === "melee") {
      // 統一使用鮭魚生魚片太刀模型模板
      const salmon = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.04, 0.28), salmonMat);
      salmon.position.set(xP, yP, -0.38 + zOffset);
      addPart(salmon, 1.15);

      const stripe1 = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.003, 0.24), riceMat);
      stripe1.position.set(xP, yP + 0.021, -0.38 + zOffset);
      this.gunGroup.add(stripe1);
    } else if (slot === "explosive") {
      // 統一使用白糖大饅頭模型模板
      const bun = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 10), riceMat);
      bun.scale.set(1.1, 0.85, 1.1); // 捏成微扁的包子形狀
      bun.position.set(xP, yP, -0.26 + zOffset);
      addPart(bun, 1.15);
    } else {
      // 統一使用醬料瓶槍械本體 (使用武器專屬色澤)
      const bottleColor = new THREE.Color(weapon.color || "#ff0000");
      const localGlowMat = new THREE.MeshToonMaterial({ color: bottleColor, roughness: 0.3 });

      // 醬料瓶本體 (Cylinder)
      const bottleGeo = new THREE.CylinderGeometry(0.035, 0.042, 0.18, 12);
      const bottle = new THREE.Mesh(bottleGeo, localGlowMat);
      bottle.rotation.x = Math.PI / 2;
      bottle.position.set(xP, yP, -0.24 + zOffset);
      addPart(bottle, 1.15);

      // 擠壓噴嘴 (Cone)
      const nozzleGeo = new THREE.ConeGeometry(0.018, 0.07, 8);
      const nozzle = new THREE.Mesh(nozzleGeo, polymerMat);
      nozzle.rotation.x = -Math.PI / 2;
      nozzle.position.set(xP, yP, -0.36 + zOffset);
      addPart(nozzle, 1.2);

      // 瓶蓋螺紋
      const capGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.018, 10);
      const cap = new THREE.Mesh(capGeo, darkMetalMat);
      cap.rotation.x = Math.PI / 2;
      cap.position.set(xP, yP, -0.32 + zOffset);
      addPart(cap);

      // 握持瓶身把手 (Trigger Grip)
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.08, 0.04), darkMetalMat);
      grip.position.set(xP, yP - 0.05, -0.16 + zOffset);
      grip.rotation.x = Math.PI / 8;
      addPart(grip, 1.25);
    }  },
  generateMap() {
    // 網格地板
    const floorGeo = new THREE.PlaneGeometry(80, 80);
    
    // 依據地圖風格微調地板色彩
    const currentMap = GUNFIGHT_DATA.maps.find(m => m.id === this.mapId) || GUNFIGHT_DATA.maps[0];
    const gridColor = currentMap.theme;
    
    // 動態地板色調
    let floorColor = 0x06050b; // 賽博朋克黑
    const floorMat = new THREE.MeshStandardMaterial({ 
      color: floorColor,
      roughness: 0.7,
      metalness: 0.2
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    this.scene.add(floor);

    // 亮眼的地板輔助網格 (Rivals 賽博風)
    const gridHelper = new THREE.GridHelper(80, 40, new THREE.Color(gridColor), new THREE.Color(0x110e22));
    gridHelper.position.y = 0.01;
    this.scene.add(gridHelper);

    // 【新增】賽博全景虛擬網格穹頂 (Cyber Dome Skygrid)
    const domeGeo = new THREE.SphereGeometry(65, 12, 12, 0, Math.PI * 2, 0, Math.PI / 2);
    const domeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(gridColor), wireframe: true, transparent: true, opacity: 0.08 });
    const dome = new THREE.Mesh(domeGeo, domeMat);
    dome.position.y = -5;
    this.scene.add(dome);

    // 【新增】動態漂移星空粒子矩陣 (Drifting Starfield)
    const starCount = 250;
    const starGeo = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      starPositions[i * 3] = (Math.random() - 0.5) * 120;
      starPositions[i * 3 + 1] = 4 + Math.random() * 26; // 4 to 30高
      starPositions[i * 3 + 2] = (Math.random() - 0.5) * 120;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({ color: new THREE.Color(gridColor), size: 0.16, transparent: true, opacity: 0.75 });
    const starfield = new THREE.Points(starGeo, starMat);
    this.scene.add(starfield);
    this.skyStars = starfield;
    // 生成外圍邊界牆壁 (AABB)
    const wallHeight = 6;
    const borderWalls = [
      { size: [80, wallHeight, 2], pos: [0, wallHeight/2, 40] },
      { size: [80, wallHeight, 2], pos: [0, wallHeight/2, -40] },
      { size: [2, wallHeight, 80], pos: [40, wallHeight/2, 0] },
      { size: [2, wallHeight, 80], pos: [-40, wallHeight/2, 0] }
    ];

    const wallMat = new THREE.MeshToonMaterial({ color: 0xffdbe5, roughness: 0.8 });
    const outlineMat = new THREE.MeshBasicMaterial({ color: 0x1c1a27, side: THREE.BackSide });

    borderWalls.forEach(wall => {
      const wallGeo = new THREE.BoxGeometry(...wall.size);
      const mesh = new THREE.Mesh(wallGeo, wallMat);
      mesh.position.set(...wall.pos);
      mesh.isObstacle = true;
      this.scene.add(mesh);

      // 牆面黑框
      const outline = new THREE.Mesh(wallGeo.clone(), outlineMat);
      outline.position.set(...wall.pos);
      outline.scale.set(
        1 + 0.15 / wall.size[0],
        1 + 0.15 / wall.size[1],
        1 + 0.15 / wall.size[2]
      );
      this.scene.add(outline);

      // 加個霓虹發光裝飾條
      const glowGeo = new THREE.BoxGeometry(wall.size[0], 0.1, wall.size[2] === 2 ? 0.1 : wall.size[2]);
      const glowMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(gridColor) });
      const glowMesh = new THREE.Mesh(glowGeo, glowMat);
      glowMesh.position.set(wall.pos[0], wallHeight - 1, wall.pos[2]);
      this.scene.add(glowMesh);

      // 加入碰撞盒
      this.obstacles.push(new THREE.Box3().setFromObject(mesh));
    });

    // 依據地圖ID放置內部障礙物
    this.buildMapObstacles(this.mapId, gridColor);
  },

  buildMapObstacles(mapId, themeColorStr) {
    const obColor = new THREE.Color(themeColorStr);
    const boxColorHex = obColor.getHex();
    const boxMat = new THREE.MeshToonMaterial({ color: boxColorHex, roughness: 0.8 });
    const wireMat = new THREE.MeshBasicMaterial({ color: obColor, wireframe: true, transparent: true, opacity: 0.35 });
    const outlineMat = new THREE.MeshBasicMaterial({ color: 0x1c1a27, side: THREE.BackSide });
    
    // 清空舊障礙物
    this.obstacles = [];

    let configs = [];

    if (mapId === "SLUMS" || mapId === "DOWNTOWN" || mapId === "GARDEN") {
      // 霓虹都市風格：高聳霓虹柱與發光站台
      configs = [
        { type: "box", size: [4, 4, 4], pos: [0, 2, 0] },
        { type: "cylinder", size: [0.8, 0.8, 6, 8], pos: [-8, 3, -8] },
        { type: "cylinder", size: [0.8, 0.8, 6, 8], pos: [8, 3, 8] },
        { type: "box", size: [3, 5, 3], pos: [-12, 2.5, 12] },
        { type: "box", size: [3, 5, 3], pos: [12, 2.5, -12] },
        { type: "cylinder", size: [1.2, 1.2, 4, 8], pos: [-20, 2, 0] },
        { type: "cylinder", size: [1.2, 1.2, 4, 8], pos: [20, 2, 0] },
        { type: "box", size: [2, 3, 8], pos: [0, 1.5, -16] },
        { type: "box", size: [2, 3, 8], pos: [0, 1.5, 16] }
      ];
    } else if (mapId === "NEXUS" || mapId === "VAULT" || mapId === "GRID") {
      // 太空軌道樞紐：巨型中央環狀反應爐 + 浮空能量節點
      configs = [
        { type: "ring", size: [3.5, 0.5, 8, 16], pos: [0, 1.8, 0] }, // 環狀核心
        { type: "cylinder", size: [2, 2, 5, 10], pos: [0, 2.5, -12] },
        { type: "cylinder", size: [2, 2, 5, 10], pos: [0, 2.5, 12] },
        { type: "box", size: [2, 5, 10], pos: [-15, 2.5, 0] },
        { type: "box", size: [2, 5, 10], pos: [15, 2.5, 0] },
        { type: "cylinder", size: [0.6, 0.6, 4, 8], pos: [-22, 2, -15] },
        { type: "cylinder", size: [0.6, 0.6, 4, 8], pos: [22, 2, 15] }
      ];
    } else if (mapId === "ABYSS" || mapId === "LAVA") {
      // 發光礦場與熔岩核心：巨型發光能量水晶雙錐體 + 岩石箱
      configs = [
        { type: "crystal", size: [2.5, 5], pos: [0, 2.5, 0] }, // 中央水晶
        { type: "box", size: [4, 3, 4], pos: [-10, 1.5, -10] },
        { type: "box", size: [4, 3, 4], pos: [10, 1.5, 10] },
        { type: "crystal", size: [1.2, 3], pos: [-12, 1.5, 12] },
        { type: "crystal", size: [1.2, 3], pos: [12, 1.5, -12] },
        { type: "box", size: [5, 2, 2], pos: [-22, 1, 0] },
        { type: "box", size: [5, 2, 2], pos: [22, 1, 0] }
      ];
    } else if (mapId === "ICEFIELD" || mapId === "SUBBASE" || mapId === "BIOLAB") {
      // 極地冰原與深海科研所：透光冰川冰山 + 圓形防護筒
      configs = [
        { type: "ice", size: [3.5, 3.5, 5], pos: [0, 2.5, 0] }, // 中央大冰山
        { type: "cylinder", size: [1.5, 1.5, 4, 8], pos: [-8, 2, -8] },
        { type: "cylinder", size: [1.5, 1.5, 4, 8], pos: [8, 2, 8] },
        { type: "ice", size: [2, 2, 4], pos: [-12, 2, 12] },
        { type: "ice", size: [2, 2, 4], pos: [12, 2, -12] },
        { type: "box", size: [4, 3, 4], pos: [-22, 1.5, 0] },
        { type: "box", size: [4, 3, 4], pos: [22, 1.5, 0] }
      ];
    } else {
      // 預設前哨要塞 (OUTPOST, FORTRESS, TEMPLE, SPACEPORT 等)：機械集裝箱 + 能量柱
      configs = [
        { type: "box", size: [5, 4, 5], pos: [0, 2, 10] },
        { type: "box", size: [5, 4, 5], pos: [0, 2, -10] },
        { type: "cylinder", size: [1.2, 1.2, 5, 8], pos: [-15, 2.5, 15] },
        { type: "cylinder", size: [1.2, 1.2, 5, 8], pos: [15, 2.5, -15] },
        { type: "box", size: [6, 2, 2], pos: [-25, 1, -5] },
        { type: "box", size: [6, 2, 2], pos: [25, 1, 5] }
      ];
    }

    configs.forEach(cfg => {
      let geo, mat = boxMat;

      if (cfg.type === "cylinder") {
        geo = new THREE.CylinderGeometry(cfg.size[0], cfg.size[1], cfg.size[2], cfg.size[3]);
      } else if (cfg.type === "ring") {
        geo = new THREE.TorusGeometry(cfg.size[0], cfg.size[1], cfg.size[2], cfg.size[3]);
        geo.rotateX(Math.PI / 2);
        mat = new THREE.MeshStandardMaterial({ color: boxColorHex, metalness: 0.9, roughness: 0.1 });
      } else if (cfg.type === "crystal") {
        geo = new THREE.ConeGeometry(cfg.size[0], cfg.size[1], 4);
        mat = new THREE.MeshBasicMaterial({ color: 0x8b00ff, transparent: true, opacity: 0.85 });
      } else if (cfg.type === "ice") {
        geo = new THREE.BoxGeometry(cfg.size[0], cfg.size[1], cfg.size[2]);
        mat = new THREE.MeshPhysicalMaterial({ color: 0x80f0ff, transparent: true, opacity: 0.6, roughness: 0.1, transmission: 0.8, thickness: 0.8 });
      } else {
        geo = new THREE.BoxGeometry(...cfg.size);
      }

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(...cfg.pos);
      mesh.isObstacle = true;
      this.scene.add(mesh);

      // 卡通描邊 (水晶與冰山等透光物件不描邊以維持質感)
      if (cfg.type !== "crystal" && cfg.type !== "ice") {
        const outline = new THREE.Mesh(geo.clone(), outlineMat);
        outline.position.set(...cfg.pos);
        if (cfg.type === "ring") {
          outline.scale.set(1.04, 1.15, 1.04);
        } else if (cfg.type === "cylinder") {
          outline.scale.set(1.15, 1.02, 1.15);
        } else {
          outline.scale.set(
            1 + 0.15 / cfg.size[0],
            1 + 0.15 / cfg.size[1],
            1 + 0.15 / cfg.size[2]
          );
        }
        this.scene.add(outline);
      }

      // 機械發光線條
      if (cfg.type === "box" || cfg.type === "cylinder") {
        const wire = new THREE.Mesh(geo, wireMat);
        wire.scale.set(1.005, 1.005, 1.005);
        wire.position.set(...cfg.pos);
        this.scene.add(wire);
      }

      // 儲存碰撞盒
      this.obstacles.push(new THREE.Box3().setFromObject(mesh));
    });

    // 【新增】生成橫跨連通管道與賽博空橋 (Overhead Pipelines & Cyber Bridges)
    const bridgeMat = new THREE.MeshStandardMaterial({ color: 0x222328, metalness: 0.7, roughness: 0.35 });
    const beamColor = new THREE.Color(themeColorStr);
    const laserMat = new THREE.MeshBasicMaterial({ color: beamColor, transparent: true, opacity: 0.4 });

    if (mapId === "SLUMS" || mapId === "DOWNTOWN" || mapId === "GARDEN") {
      // 橫跨大都市的霓虹連接發光光束梁
      const pipeGeo = new THREE.CylinderGeometry(0.12, 0.12, 24, 8);
      const pipe1 = new THREE.Mesh(pipeGeo, laserMat);
      pipe1.rotation.z = Math.PI / 2;
      pipe1.position.set(0, 4.8, 12);
      this.scene.add(pipe1);
      const pipe2 = pipe1.clone();
      pipe2.position.set(0, 4.8, -12);
      this.scene.add(pipe2);
    } else if (mapId === "NEXUS" || mapId === "VAULT" || mapId === "GRID") {
      // 四向連通核管道
      for (let j = 0; j < 4; j++) {
        const rad = (j * Math.PI) / 2;
        const conduit = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 14, 8), bridgeMat);
        conduit.rotation.z = Math.PI / 2;
        conduit.rotation.y = rad;
        conduit.position.set(Math.cos(rad) * 9, 2.8, Math.sin(rad) * 9);
        this.scene.add(conduit);
        const outline = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 14.1, 8), outlineMat);
        outline.rotation.copy(conduit.rotation);
        outline.position.copy(conduit.position);
        this.scene.add(outline);
      }
    } else if (mapId === "ABYSS" || mapId === "LAVA") {
      // 環繞母晶漂浮的科幻結晶碎片
      for (let j = 0; j < 4; j++) {
        const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.4, 0), new THREE.MeshBasicMaterial({ color: 0x8b00ff }));
        const angle = (j * Math.PI) / 2;
        shard.position.set(Math.cos(angle) * 3, 3.5, Math.sin(angle) * 3);
        this.scene.add(shard);
      }
    } else if (mapId === "ICEFIELD" || mapId === "SUBBASE" || mapId === "BIOLAB") {
      // 科考站高架通道欄杆
      const pathGeo = new THREE.BoxGeometry(0.6, 0.08, 18);
      const path = new THREE.Mesh(pathGeo, bridgeMat);
      path.position.set(-15, 3.2, 0);
      this.scene.add(path);
      const pathR = path.clone();
      pathR.position.x = 15;
      this.scene.add(pathR);
    }
  },
  // 靶場專屬：生成移動與靜止的靶子
  spawnTargets() {
    const targetCount = 6;
    const tgMat = new THREE.MeshToonMaterial({ color: 0xff0055 });
    const outlineMat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide });

    for (let i = 0; i < targetCount; i++) {
      // 建立圓形發光標靶
      const tgGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.05, 16);
      tgGeo.rotateX(Math.PI / 2);
      const mesh = new THREE.Mesh(tgGeo, tgMat);
      
      // 隨機擺放在靶場前方
      const x = (Math.random() - 0.5) * 20;
      const y = 1.0 + Math.random() * 1.5;
      const z = -10 - Math.random() * 15;
      mesh.position.set(x, y, z);
      this.scene.add(mesh);

      // 漫畫黑框描邊
      const outline = new THREE.Mesh(tgGeo.clone(), outlineMat);
      outline.scale.set(1.15, 1.15, 1.15);
      mesh.add(outline);

      // 加入自訂屬性
      this.targets.push({
        mesh: mesh,
        health: 1,
        initialPos: mesh.position.clone(),
        moveSpeed: 0.02 + Math.random() * 0.03,
        moveRange: 3 + Math.random() * 3,
        direction: Math.random() > 0.5 ? 1 : -1
      });
    }
  },

  // 5v5 對戰專屬：生成 4 個盟友與 5 個敵人 Bot
  spawnBots() {
    // 盟友 AI (藍隊，隊友 names: ALPHA, BETA, GAMMA, DELTA)
    const allyNames = ["ALPHA", "BETA", "GAMMA", "DELTA"];
    allyNames.forEach((name, i) => {
      this.createBotEntity(name, "blue", new THREE.Vector3(this.blueSpawn.x + (i + 1) * 2, 0.8, this.blueSpawn.z + (i % 2 === 0 ? 3 : -3)));
    });

    // 敵方 AI (紅隊，敵軍 names: OMEGA, SIGMA, ZETA, THETA, KAPPA)
    const enemyNames = ["OMEGA", "SIGMA", "ZETA", "THETA", "KAPPA"];
    enemyNames.forEach((name, i) => {
      this.createBotEntity(name, "red", new THREE.Vector3(this.redSpawn.x - i * 2, 0.8, this.redSpawn.z + (i % 2 === 0 ? 3 : -3)));
    });
  },

  createBotEntity(name, team, spawnPos) {
    const group = new THREE.Group();
    group.position.copy(spawnPos);
    this.scene.add(group);

    // 建立漫畫色階 (Toon Gradient Steps) 與網點 (Screentone) 紋理
    const createToonGradient = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 4; canvas.height = 1;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#111111'; ctx.fillRect(0, 0, 1, 1);
      ctx.fillStyle = '#666666'; ctx.fillRect(1, 0, 1, 1);
      ctx.fillStyle = '#bbbbbb'; ctx.fillRect(2, 0, 1, 1);
      ctx.fillStyle = '#ffffff'; ctx.fillRect(3, 0, 1, 1);
      const texture = new THREE.CanvasTexture(canvas);
      texture.minFilter = THREE.NearestFilter;
      texture.magFilter = THREE.NearestFilter;
      return texture;
    };

    const createScreentone = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 32; canvas.height = 32;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 32, 32);
      ctx.fillStyle = '#e8e8ff'; // 漫畫網點
      for (let x = 2; x < 32; x += 8) {
        for (let y = 2; y < 32; y += 8) {
          ctx.beginPath(); ctx.arc(x, y, 1.2, 0, Math.PI*2); ctx.fill();
        }
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(4, 4);
      return texture;
    };

    const gradientMap = createToonGradient();
    const screentoneMap = createScreentone();

    // 根據姓名對應專屬造型 ID (荒野亂鬥豐富人設角色)
    const nameToSkin = {
      "ALPHA": "HACKER",
      "BETA": "REBEL",
      "GAMMA": "CYCLONE",
      "DELTA": "SPECTRE",
      "OMEGA": "PREDATOR",
      "SIGMA": "OVERLORD",
      "ZETA": "ONI",
      "THETA": "GHOST_RIDER",
      "KAPPA": "TITAN"
    };
    const skinId = nameToSkin[name] || "CADET";
    const skin = GUNFIGHT_DATA.skins.find(s => s.id === skinId);
    
    // 機器人本體 - 荒野亂鬥二頭身比例 Q 版配色與網點
    const skinColorStr = skin ? skin.color : (team === "blue" ? "#33ccff" : "#ff3366");
    const skinColor = new THREE.Color(skinColorStr);
    
    const bodyMat = new THREE.MeshToonMaterial({ 
      color: skinColor, 
      roughness: 0.8,
      gradientMap: gradientMap,
      map: screentoneMap
    });

    const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x222326, metalness: 0.7, roughness: 0.35 });
    const outlineMat = new THREE.MeshBasicMaterial({ color: 0x1c1a27, side: THREE.BackSide });

    const addBotPart = (mesh, scaleFactor = 1.15) => {
      group.add(mesh);
      const outline = new THREE.Mesh(mesh.geometry.clone(), outlineMat);
      outline.position.copy(mesh.position);
      outline.rotation.copy(mesh.rotation);
      outline.scale.copy(mesh.scale).multiplyScalar(scaleFactor);
      group.add(outline);
    };

    // 1. 腿部：二頭身胖胖腿 (所有的食物共用雙腿跑步行走)
    const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.32, 6), bodyMat);
    legL.position.set(-0.12, 0.16, 0);
    addBotPart(legL, 1.25);

    const legR = legL.clone();
    legR.position.x = 0.12;
    addBotPart(legR, 1.25);

    // 食物特有材質 (動態定義於 Bot 的 Three.js)
    const bobaMat = new THREE.MeshStandardMaterial({ color: 0x7c5a3c, roughness: 0.6 }); // 奶茶色
    const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, roughness: 0.1, transmission: 0.9, thickness: 0.5 }); // 玻璃杯
    const breadMat = new THREE.MeshStandardMaterial({ color: 0xd2b48c, roughness: 0.8 }); // 麵包
    const sausageMat = new THREE.MeshStandardMaterial({ color: 0xbf3030, roughness: 0.5 }); // 香腸
    const cheeseMat = new THREE.MeshStandardMaterial({ color: 0xffd700, roughness: 0.6 }); // 起司
    const lettuceMat = new THREE.MeshStandardMaterial({ color: 0x228b22, roughness: 0.9 }); // 生菜
    const beefMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 }); // 牛肉
    const tomatoMat = new THREE.MeshStandardMaterial({ color: 0xff0000, roughness: 0.5 }); // 番茄/草莓
    const pizzaMat = new THREE.MeshStandardMaterial({ color: 0xffcc33, roughness: 0.8 }); // 披薩起司
    const crustMat = new THREE.MeshStandardMaterial({ color: 0xcd853f, roughness: 0.9 }); // 披薩餅皮
    const chocolateMat = new THREE.MeshStandardMaterial({ color: 0x3d2314, roughness: 0.3 }); // 巧克力
    const riceMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 }); // 壽司米
    const salmonMat = new THREE.MeshStandardMaterial({ color: 0xff7f50, roughness: 0.5 }); // 鮭魚
    const noriMat = new THREE.MeshStandardMaterial({ color: 0x1c2b1c, roughness: 0.9 }); // 海苔
    const paperMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 }); // 紙盒/紙杯
    const popcornMat = new THREE.MeshStandardMaterial({ color: 0xfffff0, roughness: 0.9 }); // 爆米花
    const waffleMat = new THREE.MeshStandardMaterial({ color: 0xde9b52, roughness: 0.9 }); // 華夫餅

    // 2. 依據 Bot 造型 ID 生成 3D 食物身體與特色配飾 (對齊大廳)
    if (skinId === "CADET") {
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.18, 0.6, 12), glassMat);
      cup.position.set(0, 0.6, 0);
      group.add(cup);

      const tea = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.17, 0.5, 10), bobaMat);
      tea.position.set(0, 0.55, 0);
      addBotPart(tea, 1.05);

      const straw = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 6), new THREE.MeshBasicMaterial({ color: 0xff00ff }));
      straw.position.set(0.05, 0.8, -0.05);
      straw.rotation.z = Math.PI / 12;
      addBotPart(straw, 1.15);

      for (let j = 0; j < 5; j++) {
        const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.038, 4, 4), darkMetalMat);
        pearl.position.set((Math.random() - 0.5) * 0.22, 0.35 + Math.random() * 0.1, (Math.random() - 0.5) * 0.22);
        group.add(pearl);
      }
    } else if (skinId === "VANGUARD") {
      const bunL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.28, 0.54), breadMat);
      bunL.position.set(-0.15, 0.56, 0);
      bunL.rotation.y = Math.PI / 2;
      addBotPart(bunL, 1.12);

      const bunR = bunL.clone();
      bunR.position.x = 0.15;
      addBotPart(bunR, 1.12);

      const sausage = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.58, 8), sausageMat);
      sausage.rotation.x = Math.PI / 2;
      sausage.position.set(0, 0.6, 0);
      addBotPart(sausage, 1.15);

      const mustard = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.015, 4, 12), cheeseMat);
      mustard.position.set(0, 0.68, 0);
      group.add(mustard);
    } else if (skinId === "HACKER") {
      const bunBottom = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.06, 12), breadMat);
      bunBottom.position.set(0, 0.35, 0);
      addBotPart(bunBottom);

      const patty1 = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.07, 10), beefMat);
      patty1.position.set(0, 0.43, 0);
      addBotPart(patty1);

      const cheese = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.01, 0.35), cheeseMat);
      cheese.position.set(0, 0.48, 0);
      cheese.rotation.y = Math.PI / 4;
      addBotPart(cheese);

      const patty2 = patty1.clone();
      patty2.position.y = 0.53;
      addBotPart(patty2);

      const lettuce = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.03, 0.3), lettuceMat);
      lettuce.position.set(0, 0.58, 0);
      group.add(lettuce);

      const bunTop = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 12, 0, Math.PI*2, 0, Math.PI/2), breadMat);
      bunTop.position.set(0, 0.6, 0);
      addBotPart(bunTop);
    } else if (skinId === "REBEL") {
      const pizza = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.52, 3), pizzaMat);
      pizza.rotation.x = Math.PI / 2;
      pizza.position.set(0, 0.58, 0);
      addBotPart(pizza, 1.12);

      const crust = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.56, 6), crustMat);
      crust.rotation.z = Math.PI / 2;
      crust.position.set(0, 0.58, 0.24);
      addBotPart(crust);

      for (let j = 0; j < 3; j++) {
        const sal = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.01, 6), tomatoMat);
        sal.position.set((j - 1) * 0.08, 0.6, -0.06 * j);
        sal.rotation.x = Math.PI / 2;
        group.add(sal);
      }
    } else if (skinId === "PREDATOR") {
      const donut = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.09, 8, 16), breadMat);
      donut.position.set(0, 0.58, 0);
      donut.rotation.x = Math.PI / 2.5;
      addBotPart(donut, 1.15);

      const icing = new THREE.Mesh(new THREE.TorusGeometry(0.205, 0.07, 6, 16), chocolateMat);
      icing.position.set(0, 0.6, -0.01);
      icing.rotation.x = Math.PI / 2.5;
      group.add(icing);

      for (let j = 0; j < 6; j++) {
        const sprinkle = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.04, 0.012), new THREE.MeshBasicMaterial({ color: Math.random() * 0xffffff }));
        sprinkle.position.set((Math.random() - 0.5) * 0.24, 0.64, (Math.random() - 0.5) * 0.24);
        group.add(sprinkle);
      }
    } else if (skinId === "INFILTRATOR") {
      const rice = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.16, 0.38), riceMat);
      rice.position.set(0, 0.44, 0);
      addBotPart(rice, 1.15);

      const salmon = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.44), salmonMat);
      salmon.position.set(0, 0.54, 0);
      addBotPart(salmon, 1.15);

      const nori = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.18, 0.08), noriMat);
      nori.position.set(0, 0.48, 0);
      addBotPart(nori, 1.12);
    } else if (skinId === "ENFORCER") {
      const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.2, 0.44, 10), paperMat);
      bucket.position.set(0, 0.52, 0);
      addBotPart(bucket, 1.12);

      const redBarL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.44, 0.262), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
      redBarL.position.set(-0.15, 0.52, 0);
      group.add(redBarL);
      const redBarR = redBarL.clone();
      redBarR.position.x = 0.15;
      group.add(redBarR);

      for (let j = 0; j < 8; j++) {
        const corn = new THREE.Mesh(new THREE.SphereGeometry(0.065, 4, 4), popcornMat);
        corn.position.set((Math.random() - 0.5) * 0.24, 0.74 + Math.random()*0.06, (Math.random() - 0.5) * 0.24);
        group.add(corn);
      }
    } else if (skinId === "SHADOW") {
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.18, 0.48, 10), darkMetalMat);
      cup.position.set(0, 0.54, 0);
      addBotPart(cup, 1.12);

      const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.05, 10), polymerMat);
      lid.position.set(0, 0.78, 0);
      addBotPart(lid);
    } else if (skinId === "CYCLONE") {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.38, 6), waffleMat);
      cone.rotation.x = Math.PI;
      cone.position.set(0, 0.44, 0);
      addBotPart(cone, 1.18);

      const scoop = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), new THREE.MeshStandardMaterial({ color: 0x80ffb0, roughness: 0.7 }));
      scoop.position.set(0, 0.68, 0);
      addBotPart(scoop, 1.15);
    } else if (skinId === "SPECTRE") {
      const loaf = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.58, 6), breadMat);
      loaf.rotation.z = Math.PI / 4;
      loaf.position.set(0, 0.55, 0);
      addBotPart(loaf, 1.15);

      const butter = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.48, 0.08), cheeseMat);
      butter.position.set(0.02, 0.58, 0.01);
      butter.rotation.z = Math.PI / 4;
      group.add(butter);
    } else if (skinId === "CHRONO") {
      const shell1 = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.08, 10), new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, roughness: 0.15 }));
      shell1.position.set(0, 0.44, 0);
      addBotPart(shell1);

      const filling = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.06, 10), bobaMat);
      filling.position.set(0, 0.51, 0);
      group.add(filling);

      const shell2 = shell1.clone();
      shell2.position.y = 0.58;
      addBotPart(shell2);
    } else if (skinId === "OVERLORD") {
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), crustMat);
      body.scale.set(1, 0.8, 1.25);
      body.position.set(0, 0.54, 0);
      addBotPart(body, 1.12);

      const boneL = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.16, 6), riceMat);
      boneL.position.set(-0.12, 0.44, 0.26);
      boneL.rotation.x = Math.PI / 4;
      addBotPart(boneL);
      const boneR = boneL.clone();
      boneR.position.x = 0.12;
      addBotPart(boneR);
    } else if (skinId === "ECLIPSE") {
      for (let j = -1; j <= 1; j++) {
        const strip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.52, 0.06), sausageMat);
        strip.position.set(j * 0.08, 0.56, -j * 0.02);
        strip.rotation.z = j * 0.15;
        addBotPart(strip, 1.2);
      }
    } else if (skinId === "VALKYRIE") {
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.38, 6), waffleMat);
      cone.rotation.x = Math.PI;
      cone.position.set(0, 0.44, 0);
      addBotPart(cone, 1.18);

      const scoop = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), tomatoMat);
      scoop.position.set(0, 0.68, 0);
      addBotPart(scoop, 1.15);

      const wL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.06, 0.01), new THREE.MeshBasicMaterial({ color: 0xff00ff }));
      wL.position.set(-0.25, 0.72, 0);
      wL.rotation.z = -Math.PI / 8;
      group.add(wL);
      const wR = wL.clone();
      wR.position.x = 0.25;
      wR.rotation.z = Math.PI / 8;
      group.add(wR);
    } else if (skinId === "NEON_ASSASSIN") {
      const wrap = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.22), new THREE.MeshStandardMaterial({ color: 0xff00ff, roughness: 0.3 }));
      wrap.position.set(0, 0.52, 0);
      wrap.rotation.z = Math.PI / 12;
      addBotPart(wrap, 1.12);

      const tieL = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.14, 4), new THREE.MeshBasicMaterial({ color: 0x00ffff }));
      tieL.rotation.z = -Math.PI / 2;
      tieL.position.set(-0.18, 0.54, 0);
      group.add(tieL);
      const tieR = tieL.clone();
      tieR.rotation.z = Math.PI / 2;
      tieR.position.x = 0.18;
      group.add(tieR);
    } else if (skinId === "GHOST_RIDER") {
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.22, 0.32, 10), paperMat);
      cup.position.set(0, 0.48, 0);
      addBotPart(cup, 1.12);

      const brulee = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.05, 10), new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.1 }));
      brulee.position.set(0, 0.63, 0);
      addBotPart(brulee);

      const fire = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 4), new THREE.MeshBasicMaterial({ color: 0x00ffff }));
      fire.position.set(0, 0.74, 0);
      group.add(fire);
    } else if (skinId === "TITAN") {
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.35, 0.16), tomatoMat);
      box.position.set(0, 0.48, 0);
      addBotPart(box, 1.12);

      for (let j = 0; j < 6; j++) {
        const fry = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.34, 0.045), cheeseMat);
        fry.position.set((j - 2.5) * 0.048, 0.65 + Math.random()*0.05, (Math.random() - 0.5)*0.06);
        fry.rotation.z = (j - 2.5) * 0.05;
        addBotPart(fry, 1.15);
      }
    } else if (skinId === "ZEUS") {
      const ball1 = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), breadMat);
      ball1.position.set(-0.1, 0.46, -0.05);
      addBotPart(ball1, 1.15);

      const ball2 = ball1.clone();
      ball2.position.set(0.1, 0.46, -0.05);
      addBotPart(ball2, 1.15);

      const ball3 = ball1.clone();
      ball3.position.set(0, 0.64, 0);
      addBotPart(ball3, 1.15);

      const line = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.015, 0.15), new THREE.MeshBasicMaterial({ color: 0x00e5ff }));
      line.position.set(0, 0.72, 0.02);
      group.add(line);
    } else if (skinId === "ONI") {
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.18, 0.28, 10), tomatoMat);
      bowl.position.set(0, 0.48, 0);
      addBotPart(bowl, 1.12);

      const noodles = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.04, 10), cheeseMat);
      noodles.position.set(0, 0.6, 0);
      addBotPart(noodles);

      const egg = new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 5), riceMat);
      egg.position.set(0.08, 0.63, 0.06);
      group.add(egg);
      const yolk = new THREE.Mesh(new THREE.SphereGeometry(0.034, 4, 4), cheeseMat);
      yolk.position.set(0.08, 0.65, 0.06);
      group.add(yolk);
    } else {
      const layer1 = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.14, 10), riceMat);
      layer1.position.set(0, 0.4, 0);
      addBotPart(layer1);

      const layer2 = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.12, 10), new THREE.MeshStandardMaterial({ color: 0xffc0cb, roughness: 0.7 }));
      layer2.position.set(0, 0.52, 0);
      addBotPart(layer2);

      const layer3 = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.1, 10), new THREE.MeshStandardMaterial({ color: 0xe0ffff, roughness: 0.7 }));
      layer3.position.set(0, 0.62, 0);
      addBotPart(layer3);

      const strawberry = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), tomatoMat);
      strawberry.position.set(0, 0.7, 0);
      addBotPart(strawberry, 1.15);
    }
    // 戰術飛行噴射包 (Backpack Jetpack)
    const jetpack = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.38, 0.12), darkMetalMat);
    jetpack.position.set(0, 0.52, 0.14);
    addBotPart(jetpack, 1.15);

    // 噴射器噴嘴
    const nozzleL = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.015, 0.08, 8), darkMetalMat);
    nozzleL.position.set(-0.08, 0.3, 0.14);
    nozzleL.rotation.x = -Math.PI / 10;
    group.add(nozzleL);
    const nozzleR = nozzleL.clone();
    nozzleR.position.x = 0.08;
    group.add(nozzleR);

    // 建立機器人的手部持槍 (簡化成前端雷射槍口)
    const botGunGeo = new THREE.BoxGeometry(0.06, 0.06, 0.32);
    const botGunMat = new THREE.MeshToonMaterial({ 
      color: 0x1c1a27, 
      roughness: 0.8,
      gradientMap: gradientMap,
      map: screentoneMap
    });
    const botGun = new THREE.Mesh(botGunGeo, botGunMat);
    botGun.position.set(0.24, 0.45, -0.28);
    addBotPart(botGun, 1.2);

    const botObj = {
      name: `${team === "blue" ? "盟友" : "敵人"}_${name}`,
      team: team,
      group: group,
      health: 100,
      maxHealth: 100,
      spawnPos: spawnPos.clone(),
      isDead: false,
      respawnTimer: 0,
      velocity: new THREE.Vector3(),
      target: null,
      lastShotTime: 0,
      patrolTarget: this.getRandomPatrolPoint(),
      raycaster: new THREE.Raycaster()
    };

    this.bots.push(botObj);
  },
  getRandomPatrolPoint() {
    return new THREE.Vector3(
      (Math.random() - 0.5) * 60,
      0.8,
      (Math.random() - 0.5) * 60
    );
  },

  // 鍵盤與滑鼠事件
  onKeyDown(e) {
    if (!this.isLocked || this.isGameOver) return;
    if (e.key === 'w' || e.key === 'W') this.keys.w = true;
    if (e.key === 's' || e.key === 'S') this.keys.s = true;
    if (e.key === 'a' || e.key === 'A') this.keys.a = true;
    if (e.key === 'd' || e.key === 'D') this.keys.d = true;
    if (e.key === 'Shift') this.keys.Shift = true;

    // 快速切換武器 (1: 主武器, 2: 副手槍, 3: 近戰武器, 4: 手榴彈/戰術炸彈)
    if (e.key === '1') this.switchWeaponSlot("primary");
    if (e.key === '2') this.switchWeaponSlot("secondary");
    if (e.key === '3') this.switchWeaponSlot("melee");
    if (e.key === '4') this.switchWeaponSlot("explosive");

    // R: 裝彈
    if ((e.key === 'r' || e.key === 'R') && !this.player.isReloading) {
      this.reloadActiveWeapon();
    }

    // Space: 跳躍
    if (e.key === ' ' || e.code === 'Space') {
      if (this.player.isOnGround) {
        this.player.velocity.y = 8.5; // 跳躍向上初速
        this.player.isOnGround = false;
        SoundFX.playTone(200, 0.1, "sine", true, 0.03); // 跳躍微弱音效
      }
    }
  },

  onKeyUp(e) {
    if (e.key === 'w' || e.key === 'W') this.keys.w = false;
    if (e.key === 's' || e.key === 'S') this.keys.s = false;
    if (e.key === 'a' || e.key === 'A') this.keys.a = false;
    if (e.key === 'd' || e.key === 'D') this.keys.d = false;
    if (e.key === 'Shift') this.keys.Shift = false;
  },

  onMouseMove(e) {
    if (!this.isLocked || this.isGameOver) return;

    const sensitivity = 0.0022;
    this.camera.rotation.y -= e.movementX * sensitivity;
    this.camera.rotation.x -= e.movementY * sensitivity;

    // 限制垂直旋轉幅度，避免頭轉過頭
    this.camera.rotation.x = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.camera.rotation.x));
    this.camera.rotation.z = 0; // 強制將 Z 軸設定為 0，防止畫面翻轉傾斜！
  },

  onMouseDown(e) {
    if (!this.isLocked || this.isGameOver) return;
    if (e.button === 0) { // 左鍵開火
      this.playerFire();
    } else if (e.button === 2) { // 右鍵開鏡
      const slot = this.player.activeSlot;
      if (slot === "primary" || slot === "secondary") {
        this.player.isAiming = true;
        const scopeOverlay = document.getElementById("scope-overlay");
        if (scopeOverlay) scopeOverlay.classList.add("active");
      }
    }
  },

  onMouseUp(e) {
    if (!this.isLocked || this.isGameOver) return;
    if (e.button === 2) { // 右鍵放開關鏡
      this.player.isAiming = false;
      const scopeOverlay = document.getElementById("scope-overlay");
      if (scopeOverlay) scopeOverlay.classList.remove("active");
    }
  },

  switchWeaponSlot(slot) {
    if (this.player.isReloading) return;
    this.player.activeSlot = slot;
    this.player.isAiming = false;
    const scopeOverlay = document.getElementById("scope-overlay");
    if (scopeOverlay) scopeOverlay.classList.remove("active");
    SoundFX.playClick();
    this.updateHUDPlayerStats();
    
    // 重建對應的 3D 酷炫武器模型
    this.createGunModel();
  },

  reloadActiveWeapon() {
    const slot = this.player.activeSlot;
    if (slot !== "primary" && slot !== "secondary") return;

    const ammo = this.player.ammo;
    const weapon = this.player.equipped[slot];
    
    const reserve = slot === "primary" ? ammo.primaryReserve : ammo.secondaryReserve;
    const current = slot === "primary" ? ammo.primary : ammo.secondary;

    if (current === weapon.mag || reserve <= 0) return;

    this.player.isReloading = true;
    this.player.reloadStartTime = performance.now();
    document.getElementById("reload-prompt").style.display = "none";

    // 播放裝彈音效
    SoundFX.playTone(400, 0.15, "triangle", false, 0.05);
    setTimeout(() => SoundFX.playTone(300, 0.15, "triangle", false, 0.05), 200);
    setTimeout(() => SoundFX.playTone(600, 0.2, "sine", true, 0.06), 650);

    // 裝彈延遲
    setTimeout(() => {
      if (this.isGameOver) return;
      const need = weapon.mag - current;
      const fill = Math.min(need, reserve);

      if (slot === "primary") {
        this.player.ammo.primary += fill;
        this.player.ammo.primaryReserve -= fill;
      } else {
        this.player.ammo.secondary += fill;
        this.player.ammo.secondaryReserve -= fill;
      }

      this.player.isReloading = false;
      this.updateHUDPlayerStats();
    }, 1200);
  },

  playerFire() {
    const slot = this.player.activeSlot;
    
    // 如果是投擲手榴彈
    if (slot === "explosive") {
      this.throwGrenade();
      return;
    }

    // 如果是近戰砍擊
    if (slot === "melee") {
      const now = performance.now();
      const meleeItem = this.player.equipped.melee;
      if (!meleeItem) return;
      if (now - this.player.lastShotTime < meleeItem.fr) return;
      this.player.lastShotTime = now;

      // 觸發近戰揮刀動畫時間
      this.meleeSwingAnimTime = 0.25; 

      // 播放揮擊音效
      SoundFX.playTone(800, 0.1, "sine", true, 0.05);

      // 近戰射線檢測 (距離較短，3.5 單位)
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
      
      let hitSomething = false;
      let closestBot = null;
      let minDist = 3.5;

      if (!this.isTraining) {
        this.bots.forEach(bot => {
          if (bot.isDead) return;
          const intersects = raycaster.intersectObject(bot.group, true);
          if (intersects.length > 0 && intersects[0].distance < minDist) {
            if (bot.team === "red") {
              minDist = intersects[0].distance;
              closestBot = bot;
            }
          }
        });

        if (closestBot) {
          this.hitBot(closestBot, meleeItem.dmg);
          SoundFX.playTone(200, 0.12, "sawtooth", true, 0.12);
        }
      } else {
        let closestTg = null;
        this.targets.forEach(tg => {
          if (tg.health <= 0) return;
          const intersects = raycaster.intersectObject(tg.mesh);
          if (intersects.length > 0 && intersects[0].distance < minDist) {
            minDist = intersects[0].distance;
            closestTg = tg;
          }
        });
        if (closestTg) {
          this.hitTarget(closestTg);
          SoundFX.playTone(200, 0.12, "sawtooth", true, 0.12);
        }
      }

      this.player.shotsFired++;
      this.updateHUDPlayerStats();
      return;
    }

    const weapon = this.player.equipped[slot];
    if (!weapon) return;

    const ammo = slot === "primary" ? this.player.ammo.primary : this.player.ammo.secondary;
    const now = performance.now();

    // 檢查彈藥與射速
    if (ammo <= 0) {
      document.getElementById("reload-prompt").style.display = "block";
      SoundFX.playTone(180, 0.1, "sine", true, 0.05); // 空槍音效
      return;
    }

    if (now - this.player.lastShotTime < weapon.fr) return;

    // 攻擊方式 1: 三連發步槍 (3-Round Burst)
    if (weapon.id === "BURST_RIFLE" && !this.player.isFiringBurst) {
      this.player.isFiringBurst = true;
      let fired = 0;
      const fireBurst = () => {
        if (fired >= 3 || this.isGameOver) {
          this.player.isFiringBurst = false;
          return;
        }
        const currentAmmo = slot === "primary" ? this.player.ammo.primary : this.player.ammo.secondary;
        if (currentAmmo <= 0) {
          this.player.isFiringBurst = false;
          return;
        }

        // 扣彈與射擊
        if (slot === "primary") this.player.ammo.primary--;
        else this.player.ammo.secondary--;
        
        this.player.shotsFired++;
        this.player.lastShotTime = performance.now();
        this.recoilOffset.set(0, 0.015, 0.04);
        SoundFX.playShoot(true);
        this.executeSingleRaycast(weapon, slot);
        this.updateHUDPlayerStats();

        fired++;
        setTimeout(fireBurst, 70);
      };
      fireBurst();
      return;
    }

    // 排除連發時的重複點擊
    if (this.player.isFiringBurst) return;

    this.player.lastShotTime = now;

    // 扣彈
    if (slot === "primary") this.player.ammo.primary--;
    else this.player.ammo.secondary--;
    
    this.player.shotsFired++;
    this.updateHUDPlayerStats();

    // 攻擊方式 2: 散彈槍散射方式 (Shotgun Pellet Spread - 8顆彈丸發散)
    if (weapon.subType === "shotgun") {
      this.recoilOffset.set(0, 0.04, 0.12); // 更重的後座力
      SoundFX.playShoot(true);
      
      const pelletCount = 8;
      const spreadCone = 0.055;
      for (let i = 0; i < pelletCount; i++) {
        const spreadX = (Math.random() - 0.5) * spreadCone;
        const spreadY = (Math.random() - 0.5) * spreadCone;
        this.executeSingleRaycast(weapon, slot, new THREE.Vector2(spreadX, spreadY));
      }
      return;
    }

    // 攻擊方式 3: 一般單發與全自動 (AR, SMG, LMG, Pistol)
    this.recoilOffset.set(0, 0.02, 0.08);
    SoundFX.playShoot(true);
    this.executeSingleRaycast(weapon, slot);
  },

  // 獨立射線碰撞與彈道繪製輔助方法
  executeSingleRaycast(weapon, slot, spreadOffset = null) {
    const raycaster = new THREE.Raycaster();
    const coords = spreadOffset || new THREE.Vector2(0, 0);
    raycaster.setFromCamera(coords, this.camera);

    let hitSomething = false;
    let hitPoint = new THREE.Vector3();
    let hitDistance = 999;

    // 1. 檢測牆壁與障礙物 (繪製精準彈道)
    const wallIntersects = raycaster.intersectObjects(this.scene.children, true);
    let firstWall = null;
    for (let inter of wallIntersects) {
      if (inter.object.isObstacle && inter.object.parent !== this.gunGroup && inter.object.parent !== this.camera) {
        firstWall = inter;
        break;
      }
    }

    if (firstWall) {
      hitPoint.copy(firstWall.point);
      hitDistance = firstWall.distance;
      hitSomething = true;
    }

    // 2. 檢測靶子 (訓練模式)
    if (this.isTraining) {
      this.targets.forEach(tg => {
        const intersects = raycaster.intersectObject(tg.mesh);
        if (intersects.length > 0 && intersects[0].distance < hitDistance) {
          hitPoint.copy(intersects[0].point);
          hitDistance = intersects[0].distance;
          hitSomething = true;
          this.hitTarget(tg);
        }
      });
    } else {
      // 3. 檢測敵軍 Bot (5v5模式)
      this.bots.forEach(bot => {
        if (bot.isDead) return;
        const intersects = raycaster.intersectObject(bot.group, true);
        if (intersects.length > 0 && intersects[0].distance < hitDistance) {
          if (bot.team === "red") {
            hitPoint.copy(intersects[0].point);
            hitDistance = intersects[0].distance;
            hitSomething = true;
            this.hitBot(bot, weapon.dmg);
          }
        }
      });
    }

    if (!hitSomething) {
      const dir = new THREE.Vector3();
      this.camera.getWorldDirection(dir);
      hitPoint.copy(this.camera.position).addScaledVector(dir, 100);
    }

    // 彈道色彩客製
    let tracerColor = slot === "primary" ? 0x00f0ff : 0x39ff14;
    if (weapon.subType === "sniper" || weapon.subType === "dmr") {
      tracerColor = 0xffab00; // 狙擊軌道為金色光
    }
    
    this.drawBulletTracer(
      this.camera.position.clone().add(new THREE.Vector3(0.15, -0.15, -0.3).applyQuaternion(this.camera.quaternion)), 
      hitPoint, 
      slot,
      tracerColor
    );
  },
  drawBulletTracer(start, end, slot, customColor = null) {
    const points = [start, end];
    const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
    const color = customColor || (slot === "primary" ? 0x00f0ff : 0x39ff14);
    const lineMat = new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: 0.8 });
    const line = new THREE.Line(lineGeo, lineMat);
    this.scene.add(line);

    this.bullets.push({
      mesh: line,
      timer: 0.08 // 0.08 秒後淡出消失
    });

    // 在擊中點產生小火花粒子
    this.createHitSpark(end, color);
  },

  createHitSpark(pos, colorHex) {
    const sparkCount = 8;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(sparkCount * 3);
    const velocities = [];

    for (let i = 0; i < sparkCount; i++) {
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;

      velocities.push(new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      ));
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const pMat = new THREE.PointsMaterial({
      color: colorHex,
      size: 0.08,
      transparent: true,
      opacity: 0.9
    });
    const pSystem = new THREE.Points(particleGeo, pMat);
    this.scene.add(pSystem);

    this.particles.push({
      mesh: pSystem,
      positions: positions,
      velocities: velocities,
      timer: 0.3 // 0.3秒後消失
    });
  },

  hitTarget(target) {
    // 擊中靶子
    SoundFX.playTone(800, 0.1, "sine", true, 0.05);
    this.player.shotsHit++;
    GameState.stats.targetsHit++;
    
    // 扣血 (靶子只有1血)
    target.health = 0;
    
    // 浮動傷害字
    this.spawnDamageFloat(target.mesh.position, "HIT", false);

    // 靶子碎裂粒子
    this.createHitSpark(target.mesh.position, 0xff0055);

    // 重置靶子位置
    setTimeout(() => {
      if (this.isGameOver) return;
      target.mesh.position.set(
        (Math.random() - 0.5) * 20,
        1.0 + Math.random() * 1.5,
        -10 - Math.random() * 15
      );
      target.health = 1;
    }, 1500);

    this.updateTrainingHUD();
  },

  hitBot(bot, damage) {
    if (bot.isDead) return;

    SoundFX.playTone(600, 0.08, "triangle", true, 0.08);
    this.player.shotsHit++;
    bot.health -= damage;

    // 浮動傷害字
    this.spawnDamageFloat(bot.group.position, damage.toString(), false);

    if (bot.health <= 0) {
      this.killBot(bot, "PLAYER");
    }

    this.updateTrainingHUD();
  },

  spawnDamageFloat(worldPos, text, isPlayerHurt) {
    const el = document.createElement("div");
    el.style.position = "absolute";
    el.style.pointerEvents = "none";
    el.style.zIndex = "65";

    // 隨機選取漫畫特效字
    let word = "BANG!";
    const slot = this.player.activeSlot;
    if (slot === "melee") {
      const words = ["SLASH!", "SWIPE!", "WHACK!", "SPLAT!"];
      word = words[Math.floor(Math.random() * words.length)];
    } else if (slot === "explosive") {
      const words = ["BOOM!", "KABOOM!", "BAM!", "BLAST!"];
      word = words[Math.floor(Math.random() * words.length)];
    } else {
      const words = ["BANG!", "POW!", "PEW!", "ZAP!", "CRACK!"];
      word = words[Math.floor(Math.random() * words.length)];
    }

    el.className = "comic-burst-dmg";
    if (isPlayerHurt) {
      el.classList.add("player-hurt");
      el.innerHTML = `<span class="comic-word">OUCH!</span> <span class="comic-val">${text}</span>`;
    } else {
      el.innerHTML = `<span class="comic-word">${word}</span> <span class="comic-val">-${text}</span>`;
    }

    document.body.appendChild(el);

    // 隨機旋轉角度 (-12度 到 12度)
    const rot = (Math.random() - 0.5) * 24;
    el.style.transform = `translate(-50%, -50%) rotate(${rot}deg)`;

    this.damageFloats.push({
      element: el,
      pos: worldPos.clone().add(new THREE.Vector3(0, 1.2, 0)),
      timer: 0.5 // 0.5秒後直接消失，不作飄浮
    });
  },

  killBot(bot, killerName) {
    bot.isDead = true;
    bot.health = 0;
    bot.group.visible = false;
    SoundFX.playKill();

    // 產生大量碎裂粒子
    this.createHitSpark(bot.group.position, bot.team === "blue" ? 0x00f0ff : 0xff2a2a);

    // 擊殺通知欄 (Kill Feed)
    const killerTeam = killerName === "PLAYER" ? "blue" : (killerName.includes("盟友") ? "blue" : "red");
    this.pushKillFeed(killerName, bot.name, killerTeam);

    if (killerName === "PLAYER") {
      this.player.kills++;
      GameState.stats.kills++;
    }
  },

  pushKillFeed(killer, victim, killerTeam) {
    const feed = document.getElementById("hud-killfeed");
    const item = document.createElement("div");
    item.className = "killfeed-item";
    item.style.borderRightColor = killerTeam === "blue" ? "var(--cyan)" : "var(--neon-red)";

    const kClass = killerTeam === "blue" ? "ally" : "enemy";
    const vClass = killerTeam === "blue" ? "enemy" : "ally";

    const cleanKiller = killer.replace("盟友_", "").replace("敵人_", "");
    const cleanVictim = victim.replace("盟友_", "").replace("敵人_", "");

    item.innerHTML = `
      <span class="killfeed-killer ${kClass}">${cleanKiller}</span>
      <span class="killfeed-weapon">TACOPS</span>
      <span class="killfeed-victim ${vClass}">${cleanVictim}</span>
    `;

    feed.appendChild(item);

    // 4 秒後自動移除通知
    setTimeout(() => {
      item.remove();
    }, 4000);
  },

  throwGrenade() {
    if (this.player.isReloading) return;
    const now = performance.now();
    if (now - this.player.lastShotTime < 1500) return; // 1.5s 投擲冷卻
    this.player.lastShotTime = now;

    // 投擲音效
    SoundFX.playTone(300, 0.3, "triangle", true, 0.05);

    // 建立 3D 手榴彈球體
    const grGeo = new THREE.SphereGeometry(0.1, 10, 10);
    grGeo.scale(1.1, 0.85, 1.1);
    const grMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9 });
    const mesh = new THREE.Mesh(grGeo, grMat);
    
    // 起始位置為相機偏前方
    const dir = new THREE.Vector3();
    this.camera.getWorldDirection(dir);
    
    mesh.position.copy(this.camera.position).addScaledVector(dir, 0.5);
    this.scene.add(mesh);

    // 給予拋物線初速
    const force = 12;
    const vel = dir.clone().multiplyScalar(force);
    vel.y += 3; // 向上拋

    this.grenades.push({
      mesh: mesh,
      velocity: vel,
      gravity: -9.8,
      timer: 2.0 // 2秒後引爆
    });
  },

  explodeGrenade(grenade) {
    const pos = grenade.mesh.position;
    this.scene.remove(grenade.mesh);

    // 播放爆炸巨響 (低頻重音 + 白噪音)
    SoundFX.playTone(100, 0.6, "sawtooth", true, 0.3);
    SoundFX.playTone(200, 0.3, "triangle", true, 0.15);

    // 產生爆炸閃光粒子
    this.createHitSpark(pos, 0xff5500);
    this.createHitSpark(pos, 0xffaa00);

    // 區域傷害判定 (對所有 Bot 以及玩家)
    const range = 6.0;
    const maxDmg = 150;

    if (!this.isTraining) {
      this.bots.forEach(bot => {
        if (bot.isDead) return;
        const dist = bot.group.position.distanceTo(pos);
        if (dist < range) {
          const dmg = Math.round(maxDmg * (1 - dist / range));
          if (dmg > 10) {
            bot.health -= dmg;
            this.spawnDamageFloat(bot.group.position, dmg.toString(), false);
            if (bot.health <= 0) {
              this.killBot(bot, "PLAYER 手榴彈");
            }
          }
        }
      });

      // 玩家自身傷害判定 (炸到自己)
      const playerDist = this.camera.position.distanceTo(pos);
      if (playerDist < range) {
        const dmg = Math.round((maxDmg / 2) * (1 - playerDist / range));
        if (dmg > 5) {
          this.damagePlayer(dmg);
        }
      }
    } else {
      // 訓練靶場引爆靶子
      this.targets.forEach(tg => {
        if (tg.health <= 0) return;
        const dist = tg.mesh.position.distanceTo(pos);
        if (dist < range) {
          this.hitTarget(tg);
        }
      });
    }
  },

  damagePlayer(dmg) {
    if (this.isGameOver) return;

    SoundFX.playHurt();
    
    // 紅邊受傷閃爍
    const hurt = document.getElementById("hurt-overlay");
    hurt.classList.add("active");
    setTimeout(() => hurt.classList.remove("active"), 150);

    // 先扣護甲，再扣血
    if (this.player.armor > 0) {
      const absorb = Math.min(this.player.armor, dmg);
      this.player.armor -= absorb;
      dmg -= absorb;
    }

    if (dmg > 0) {
      this.player.health -= dmg;
    }

    this.player.health = Math.max(0, this.player.health);
    this.updateHUDPlayerStats();

    // 傷害飄字
    this.spawnDamageFloat(this.camera.position, `-${Math.round(dmg)}`, true);

    if (this.player.health <= 0) {
      this.killPlayer();
    }
  },

  killPlayer() {
    this.player.deaths++;
    GameState.stats.deaths++;
    this.updateHUDPlayerStats();

    // 播放陣亡聲音
    SoundFX.playTone(180, 0.4, "sawtooth", true, 0.2);

    const lockPrompt = document.getElementById("lock-prompt");
    document.exitPointerLock();

    if (this.isTraining) {
      // 訓練模式下 3 秒重生
      lockPrompt.querySelector(".lock-title").textContent = "您已陣亡 (WASTED)";
      lockPrompt.querySelector(".lock-desc").innerHTML = "戰術系統重建中... 3 秒後重生。<br>請點擊畫面繼續鎖定視角。";
      lockPrompt.style.display = "flex";

      setTimeout(() => {
        if (this.isGameOver) return;
        this.player.health = 100;
        this.player.armor = this.player.equipped.armorItem ? this.player.equipped.armorItem.armorValue : 50;
        
        // 回到出生點
        this.camera.position.set(this.blueSpawn.x, this.player.height, this.blueSpawn.z);
        this.camera.rotation.set(0, -Math.PI/2, 0);

        this.updateHUDPlayerStats();
        
        lockPrompt.querySelector(".lock-title").textContent = "視角已被釋放";
        lockPrompt.querySelector(".lock-desc").innerHTML = "點擊畫面鎖定視角，以滑鼠進行瞄準射擊。<br>WASD 移動 / R 裝彈 / 1,2,3 切換裝備 / ESC 解鎖滑鼠。";
        lockPrompt.style.display = "none";
        this.container.requestPointerLock();
      }, 3000);
    } else {
      // 5v5 回合對戰下，陣亡後進入觀戰/等待回合重置
      lockPrompt.querySelector(".lock-title").textContent = "您已陣亡 (ELIMINATED)";
      lockPrompt.querySelector(".lock-desc").innerHTML = "等待隊友與對手分出勝負... 下一回合將在重置後開始。";
      lockPrompt.style.display = "flex";
    }
  },

  // 更新 HUD 面板數值
  updateHUDTimer() {
    const mins = Math.floor(this.matchTimer / 60);
    const secs = this.matchTimer % 60;
    document.getElementById("hud-time").textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  },

  updateHUDScore() {
    document.getElementById("score-blue").textContent = this.blueScore;
    document.getElementById("score-red").textContent = this.redScore;
  },

  updateHUDPlayerStats() {
    document.getElementById("hud-hp").style.width = `${this.player.health}%`;
    document.getElementById("hud-hp-val").textContent = this.player.health;

    document.getElementById("hud-shield").style.width = `${this.player.armor}%`;
    document.getElementById("hud-shield-val").textContent = this.player.armor;

    const slot = this.player.activeSlot;
    const w = this.player.equipped[slot];

    const displayAmmoCurrent = document.getElementById("hud-ammo-curr");
    const displayAmmoMax = document.getElementById("hud-ammo-max");
    const displayName = document.getElementById("hud-weapon-name");
    const displayType = document.getElementById("hud-weapon-type");

    if (slot === "explosive") {
      displayName.textContent = "高爆手榴彈";
      displayType.textContent = "TACTICAL BOMB";
      displayAmmoCurrent.textContent = "1";
      displayAmmoMax.textContent = "1";
    } else if (slot === "melee") {
      displayName.textContent = w ? w.name : "近戰武器";
      displayType.textContent = "MELEE WEAPON";
      displayAmmoCurrent.textContent = "∞";
      displayAmmoMax.textContent = "∞";
    } else {
      displayName.textContent = w ? w.name.split(" (")[0] : "未知武器";
      displayType.textContent = w ? w.subType.toUpperCase() : "FIREARM";
      displayAmmoCurrent.textContent = slot === "primary" ? this.player.ammo.primary : this.player.ammo.secondary;
      displayAmmoMax.textContent = slot === "primary" ? this.player.ammo.primaryReserve : this.player.ammo.secondaryReserve;
    }
  },

  updateTrainingHUD() {
    const s = this.player;
    const accuracy = s.shotsFired > 0 ? ((s.shotsHit / s.shotsFired) * 100).toFixed(1) : "0.0";
    
    document.getElementById("train-accuracy").textContent = `${accuracy}%`;
    document.getElementById("train-hits").textContent = s.shotsHit;
    document.getElementById("train-kills").textContent = this.isTraining ? s.shotsHit : s.kills;
  },

  // 結束戰局
  endMatch() {
    this.isGameOver = true;
    if (this.timerInterval) clearInterval(this.timerInterval);
    document.exitPointerLock();

    // 隱藏 3D 渲染容器
    this.container.classList.remove("active");

    // 計算結算與發放 CR 點數
    let victory = this.blueScore >= this.redScore;
    if (this.isTraining) victory = true; // 訓練模式預設為結算成功

    const crBonus = this.isTraining ? 
      Math.round(this.player.shotsHit * 30) : 
      Math.round((victory ? 1200 : 500) + (this.player.kills * 150));

    // 發放獎勵
    GameState.addCR(crBonus);

    // 累積統計數值存檔
    GameState.stats.matchesPlayed++;
    if (victory && !this.isTraining) GameState.stats.matchesWon++;
    GameState.stats.accuracyTotal += this.player.shotsFired > 0 ? (this.player.shotsHit / this.player.shotsFired) * 100 : 0;
    GameState.stats.accuracyCount++;
    if (this.isTraining) {
      GameState.stats.targetsHit += this.player.shotsHit;
    } else {
      GameState.stats.botKills += (this.blueScore + this.redScore - this.player.kills); // 模擬其他隊友擊殺
    }
    GameState.save();

    // 彈出結算卡片
    const resultOverlay = document.getElementById("match-result-overlay");
    const resultTitle = document.getElementById("result-title");
    const statsGrid = document.getElementById("result-stats-details");
    const crDisplay = document.getElementById("result-cr-earned-value");

    resultOverlay.classList.add("active");
    
    if (this.isTraining) {
      resultTitle.className = "result-title victory";
      resultTitle.textContent = "訓練完成 (TRAINING COMPLETE)";
      statsGrid.innerHTML = `
        <div class="result-stat-box">
          <span class="result-stat-label">擊破目標 TARGETS</span>
          <span class="result-stat-value">${this.player.shotsHit}</span>
        </div>
        <div class="result-stat-box">
          <span class="result-stat-label">精準度 ACCURACY</span>
          <span class="result-stat-value">${this.player.shotsFired > 0 ? ((this.player.shotsHit / this.player.shotsFired) * 100).toFixed(0) : 0}%</span>
        </div>
      `;
    } else {
      if (victory) {
        resultTitle.className = "result-title victory";
        resultTitle.textContent = "任務成功 (VICTORY)";
        SoundFX.playTone(523, 0.15, "triangle", false, 0.1);
        setTimeout(() => SoundFX.playTone(659, 0.3, "sine", true, 0.1), 150);
      } else {
        resultTitle.className = "result-title defeat";
        resultTitle.textContent = "戰敗 (DEFEAT)";
        SoundFX.playTone(220, 0.3, "sawtooth", true, 0.15);
      }

      statsGrid.innerHTML = `
        <div class="result-stat-box">
          <span class="result-stat-label">擊殺數 KILLS</span>
          <span class="result-stat-value">${this.player.kills}</span>
        </div>
        <div class="result-stat-box">
          <span class="result-stat-label">陣亡數 DEATHS</span>
          <span class="result-stat-value">${this.player.deaths}</span>
        </div>
        <div class="result-stat-box">
          <span class="result-stat-label">藍隊勝出回合 BLUE ROUNDS</span>
          <span class="result-stat-value">${this.blueScore}</span>
        </div>
        <div class="result-stat-box">
          <span class="result-stat-label">紅隊勝出回合 RED ROUNDS</span>
          <span class="result-stat-value">${this.redScore}</span>
        </div>
      `;
    }

    crDisplay.textContent = `+${crBonus} CR`;
  },

  // 繪製與遊戲主迴圈
  animate() {
    if (this.isGameOver || this.activeScreen === "lobby") return;

    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();

    // 處理回合倒數計時 (Rivals 風格)
    if (this.roundCountdown > 0) {
      this.roundCountdown -= delta;
      const overlay = document.getElementById("round-countdown-overlay");
      if (overlay) {
        overlay.style.display = "flex";
        const title = overlay.querySelector(".countdown-title");
        const subtitle = overlay.querySelector(".countdown-subtitle");
        
        if (this.roundCountdown > 2.0) {
          title.textContent = `ROUND ${this.currentRound}`;
          subtitle.textContent = "準備戰鬥 READY...";
        } else if (this.roundCountdown > 1.0) {
          title.textContent = "2";
          subtitle.textContent = "GET READY";
        } else {
          title.textContent = "1";
          subtitle.textContent = "GO!";
        }
      }
    } else {
      const overlay = document.getElementById("round-countdown-overlay");
      if (overlay && overlay.style.display !== "none") {
        overlay.style.display = "none";
        this.isRoundActive = true;
        this.showFightBanner();
      }
    }

    if (this.isLocked) {
      // 處理開鏡 (Aim Down Sights) 漸變
      const targetFov = this.player.isAiming ? 32 : 65;
      this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, 0.15);
      this.camera.updateProjectionMatrix();

      const targetGunPos = this.player.isAiming 
        ? new THREE.Vector3(-0.06, -0.15, -0.42) // 醬料瓶移至準心中央對齊
        : new THREE.Vector3(0.25, -0.25, -0.5); // 回歸右側持瓶位置
      this.gunBasePosition.lerp(targetGunPos, 0.15);
      // 1. 物理移動與碰撞判定
      if (this.isRoundActive && !this.isRoundOver) {
        this.updatePlayerMovement(delta);
      }

      // 2. 槍枝與近戰揮砍動畫與後座力衰減
      if (this.meleeSwingAnimTime > 0) {
        this.meleeSwingAnimTime -= delta;
        const progress = (0.25 - this.meleeSwingAnimTime) / 0.25; // 0 to 1
        if (progress < 0.5) {
          this.gunGroup.rotation.y = -Math.PI / 2.5 * (progress * 2);
          this.gunGroup.rotation.z = -Math.PI / 4 * (progress * 2);
          this.gunGroup.position.copy(this.gunBasePosition).add(new THREE.Vector3(-0.1, 0, -0.1));
        } else {
          this.gunGroup.rotation.y = -Math.PI / 2.5 * (1 - (progress - 0.5) * 2);
          this.gunGroup.rotation.z = -Math.PI / 4 * (1 - (progress - 0.5) * 2);
          this.gunGroup.position.copy(this.gunBasePosition).add(new THREE.Vector3(-0.1 * (1 - (progress - 0.5) * 2), 0, -0.1 * (1 - (progress - 0.5) * 2)));
        }
      } else if (this.player.isReloading) {
        // 第一人稱順滑裝彈動畫 (手持醬料瓶向下擺動裝填)
        const reloadElapsed = (performance.now() - this.player.reloadStartTime) / 1000;
        const progress = Math.min(reloadElapsed / 1.2, 1.0);
        this.gunGroup.position.copy(this.gunBasePosition).add(new THREE.Vector3(0.02 * Math.sin(progress * Math.PI), -0.15 * Math.sin(progress * Math.PI), -0.05 * Math.sin(progress * Math.PI)));
        this.gunGroup.rotation.x = -Math.PI / 4 * Math.sin(progress * Math.PI);
        this.gunGroup.rotation.y = Math.PI / 6 * Math.sin(progress * Math.PI);
      } else {
        if (this.gunGroup) {
          this.gunGroup.rotation.set(0, 0, 0);
          this.recoilOffset.lerp(new THREE.Vector3(), 0.1);
          this.gunGroup.position.copy(this.gunBasePosition).add(this.recoilOffset);
        }
      }

      // 3D 武器組件動態效果
      if (this.saberRing) {
        this.saberRing.rotation.z += 0.05;
      }
      if (this.grenadeTrack1 && this.grenadeTrack2) {
        this.grenadeTrack1.rotation.x += 0.02;
        this.grenadeTrack1.rotation.y += 0.03;
        this.grenadeTrack2.rotation.y -= 0.02;
        this.grenadeTrack2.rotation.z += 0.04;
      }

      // 3. AI 行為運算
      if (!this.isTraining && this.isRoundActive && !this.isRoundOver) {
        this.updateBotAI(delta);
      }

      // 檢查回合勝負
      if (this.isRoundActive && !this.isRoundOver && !this.isTraining) {
        const redAlive = this.bots.some(b => b.team === "red" && !b.isDead);
        const blueAlive = this.bots.some(b => b.team === "blue" && !b.isDead);
        const playerAlive = this.player.health > 0;

        if (!redAlive) {
          this.endRound("blue");
        } else if (!playerAlive && !blueAlive) {
          this.endRound("red");
        }
      }

      // 4. 靶場標靶移動
      if (this.isTraining) {
        this.updateTargetsMovement();
      }

      // 5. 子彈軌跡與手榴彈物理
      this.updateProjectiles(delta);

      // 6. 傷害飄字對齊 3D 空間位置
      this.updateDamageFloats(delta);

      // 7. 更新 2D 雷達小地圖
      this.updateRadar();

      // 【新增】更新星空粒子漂移 (Drifting Sky Stars)
      if (this.skyStars) {
        const pos = this.skyStars.geometry.attributes.position.array;
        for (let i = 0; i < 250; i++) {
          pos[i * 3 + 1] -= 0.04 * delta; // 緩慢向下漂移
          if (pos[i * 3 + 1] < 2) {
            pos[i * 3 + 1] = 26; // 循環包裝
          }
        }
        this.skyStars.geometry.attributes.position.needsUpdate = true;
      }
    }

    // 渲染 Three.js 畫面
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  },

  updatePlayerMovement(delta) {
    const moveVector = new THREE.Vector3();
    
    if (this.keys.w) moveVector.z -= 1;
    if (this.keys.s) moveVector.z += 1;
    if (this.keys.a) moveVector.x -= 1;
    if (this.keys.d) moveVector.x += 1;

    moveVector.normalize();

    // 處理跑步 Speed
    const runMultiplier = this.keys.Shift ? 1.5 : 1.0;
    const finalSpeed = this.player.speed * runMultiplier;

    // 將移動向量轉換為玩家相機方向 (水平面上)
    const direction = moveVector.applyQuaternion(this.camera.quaternion);
    direction.y = 0; // 鎖定在平面
    direction.normalize().multiplyScalar(finalSpeed);

    // 處理重力與跳躍物理
    if (this.player.velocity === undefined) {
      this.player.velocity = new THREE.Vector3();
    }

    const gravity = 22.0; // 重力加速度
    if (this.camera.position.y > this.player.height) {
      this.player.velocity.y -= gravity * delta;
      this.player.isOnGround = false;
    } else {
      this.player.velocity.y = 0;
      this.camera.position.y = this.player.height;
      this.player.isOnGround = true;
    }

    // 更新垂直位置
    const nextY = this.camera.position.y + this.player.velocity.y * delta;

    // 碰撞檢測 AABB (水平移動)
    const nextPos = this.camera.position.clone().add(direction);
    nextPos.y = nextY;
    
    // 建立玩家臨時碰撞盒 (膠囊寬度約 0.6，高度適配當前 y)
    const yMin = nextPos.y - this.player.height + 0.1;
    const yMax = nextPos.y + 0.4;
    const playerBox = new THREE.Box3(
      new THREE.Vector3(nextPos.x - 0.3, yMin, nextPos.z - 0.3),
      new THREE.Vector3(nextPos.x + 0.3, yMax, nextPos.z + 0.3)
    );

    let collision = false;
    for (let box of this.obstacles) {
      if (playerBox.intersectsBox(box)) {
        collision = true;
        break;
      }
    }

    // 地圖界外硬碰撞
    if (nextPos.x < -39 || nextPos.x > 39 || nextPos.z < -39 || nextPos.z > 39) {
      collision = true;
    }

    if (!collision) {
      this.camera.position.copy(nextPos);
    } else {
      // 如果發生碰撞，至少保留垂直位置更新（允許在障礙物旁跳躍落回）
      this.camera.position.y = nextY;
      if (this.camera.position.y < this.player.height) {
        this.camera.position.y = this.player.height;
        this.player.velocity.y = 0;
        this.player.isOnGround = true;
      }
    }
  },
  updateBotAI(delta) {
    const now = performance.now();

    this.bots.forEach(bot => {
      if (bot.isDead) return;

      // 1. 垂直重力與跳躍物理 (與玩家一致)
      if (bot.velocity === undefined) bot.velocity = new THREE.Vector3();
      if (bot.isOnGround === undefined) bot.isOnGround = true;

      const gravity = 22.0;
      if (bot.group.position.y > 0.8) {
        bot.velocity.y -= gravity * delta;
        bot.isOnGround = false;
      } else {
        bot.velocity.y = 0;
        bot.group.position.y = 0.8;
        bot.isOnGround = true;
      }

      // 更新垂直位移
      bot.group.position.y += bot.velocity.y * delta;
      if (bot.group.position.y < 0.8) {
        bot.group.position.y = 0.8;
        bot.velocity.y = 0;
        bot.isOnGround = true;
      }

      // 搜尋目標：對立陣營中最近的活人
      let closestTarget = null;
      let minDist = 999;

      if (bot.team === "red") {
        // 紅隊目標是 Player 或 藍隊 Bot
        const playerDist = bot.group.position.distanceTo(this.camera.position);
        if (this.player.health > 0) {
          closestTarget = this.camera;
          minDist = playerDist;
        }

        this.bots.forEach(b => {
          if (b.team === "blue" && !b.isDead) {
            const dist = bot.group.position.distanceTo(b.group.position);
            if (dist < minDist) {
              closestTarget = b;
              minDist = dist;
            }
          }
        });
      } else {
        // 藍隊目標是 紅隊 Bot
        this.bots.forEach(b => {
          if (b.team === "red" && !b.isDead) {
            const dist = bot.group.position.distanceTo(b.group.position);
            if (dist < minDist) {
              closestTarget = b;
              minDist = dist;
            }
          }
        });
      }

      bot.target = closestTarget;

      // 行動決策
      if (bot.target) {
        const targetPos = bot.target === this.camera ? this.camera.position.clone() : bot.target.group.position.clone();
        const dist = bot.group.position.distanceTo(targetPos);

        // 轉向朝向目標
        bot.group.lookAt(new THREE.Vector3(targetPos.x, bot.group.position.y, targetPos.z));

        // 擬真玩家戰術位移決策 (尋求包抄、挺進、或後撤，拒絕死板左右來回走)
        if (!bot.behaviorTimer || now - bot.behaviorTimer > (1500 + Math.random() * 1500)) {
          bot.behaviorTimer = now;
          // 隨機選定戰術模式:
          // - "flank_left" (30% 橫移左包抄)
          // - "flank_right" (30% 橫移右包抄)
          // - "retreat" (20% 邊打邊退)
          // - "press_forward" (20% 衝鋒壓制)
          const rand = Math.random();
          if (rand < 0.3) bot.behavior = "flank_left";
          else if (rand < 0.6) bot.behavior = "flank_right";
          else if (rand < 0.8) bot.behavior = "retreat";
          else bot.behavior = "press_forward";

          // 戰鬥跳躍：當切換戰術且在地面時，有 25% 概率起跳避彈！
          if (Math.random() < 0.25 && bot.isOnGround) {
            bot.velocity.y = 7.5;
            bot.isOnGround = false;
            SoundFX.playTone(180, 0.1, "sine", true, 0.015);
          }
        }

        const forward = new THREE.Vector3().subVectors(targetPos, bot.group.position).normalize();
        forward.y = 0;
        const left = new THREE.Vector3(-forward.z, 0, forward.x);
        const right = new THREE.Vector3(forward.z, 0, -forward.x);

        let moveDir = new THREE.Vector3();
        let botSpeed = 0.045;

        // 當距離太近，強制後撤拉開槍線
        if (dist < 5) {
          moveDir.copy(forward).multiplyScalar(-1).normalize();
          botSpeed = 0.038;
        } else if (dist > 25) {
          // 距離太遠，直接朝向目標衝鋒
          moveDir.copy(forward).normalize();
          botSpeed = 0.055;
        } else {
          // 在合理戰鬥距離內，執行擬真戰術包抄/壓制/退卻
          if (bot.behavior === "flank_left") {
            moveDir.addVectors(forward.clone().multiplyScalar(0.4), left.clone().multiplyScalar(0.8)).normalize();
          } else if (bot.behavior === "flank_right") {
            moveDir.addVectors(forward.clone().multiplyScalar(0.4), right.clone().multiplyScalar(0.8)).normalize();
          } else if (bot.behavior === "retreat") {
            moveDir.addVectors(forward.clone().multiplyScalar(-0.6), left.clone().multiplyScalar(0.4 * (Math.random() > 0.5 ? 1 : -1))).normalize();
            botSpeed = 0.032;
          } else {
            // press_forward
            moveDir.addVectors(forward.clone().multiplyScalar(0.8), right.clone().multiplyScalar(0.2 * (Math.random() > 0.5 ? 1 : -1))).normalize();
            botSpeed = 0.048;
          }
        }

        // 執行水平位移
        this.moveBotEntity(bot, moveDir, botSpeed);

        // 開火射擊 (每 1.2 秒到 1.8 秒射擊一次)
        const shotInterval = bot.team === "red" ? 1200 : 1500;
        if (now - bot.lastShotTime > shotInterval && dist < 30) {
          bot.lastShotTime = now;
          this.botFire(bot, targetPos);
        }
      } else {
        // 無目標時巡邏巡航
        const distToPatrol = bot.group.position.distanceTo(bot.patrolTarget);
        if (distToPatrol < 2) {
          bot.patrolTarget = this.getRandomPatrolPoint();
        } else {
          const dir = new THREE.Vector3().subVectors(bot.patrolTarget, bot.group.position).normalize();
          dir.y = 0;
          bot.group.lookAt(new THREE.Vector3(bot.patrolTarget.x, bot.group.position.y, bot.patrolTarget.z));
          this.moveBotEntity(bot, dir, 0.04);
        }
      }
    });
  },
  moveBotEntity(bot, direction, speed) {
    const nextPos = bot.group.position.clone().addScaledVector(direction, speed);
    
    // Bot AABB 碰撞
    const botBox = new THREE.Box3(
      new THREE.Vector3(nextPos.x - 0.35, 0.1, nextPos.z - 0.35),
      new THREE.Vector3(nextPos.x + 0.35, 1.8, nextPos.z + 0.35)
    );

    let collision = false;
    for (let box of this.obstacles) {
      if (botBox.intersectsBox(box)) {
        collision = true;
        break;
      }
    }

    // 地圖界限
    if (nextPos.x < -38 || nextPos.x > 38 || nextPos.z < -38 || nextPos.z > 38) {
      collision = true;
    }

    if (!collision) {
      bot.group.position.copy(nextPos);
    } else {
      // 碰到障礙換個巡邏點
      bot.patrolTarget = this.getRandomPatrolPoint();
    }
  },

  botFire(bot, targetPos) {
    // 繪製彈道
    const startPos = bot.group.position.clone().add(new THREE.Vector3(0.2, 0.7, -0.3).applyQuaternion(bot.group.quaternion));
    
    // 微幅散射偏移 (模擬彈道誤差)
    const scatter = new THREE.Vector3(
      (Math.random() - 0.5) * 1.5,
      (Math.random() - 0.5) * 0.8,
      (Math.random() - 0.5) * 1.5
    );
    const finalEnd = targetPos.clone().add(scatter);

    // 進行射線檢測判定是否有牆壁阻擋
    const rayDir = new THREE.Vector3().subVectors(finalEnd, startPos).normalize();
    const raycaster = new THREE.Raycaster(startPos, rayDir);
    
    const targetDist = startPos.distanceTo(finalEnd);
    let hitPoint = finalEnd.clone();
    let isBlocked = false;

    const intersects = raycaster.intersectObjects(this.scene.children, true);
    for (let inter of intersects) {
      if (inter.object.isObstacle && inter.distance < targetDist) {
        hitPoint.copy(inter.point);
        isBlocked = true;
        break;
      }
    }

    // 開槍聲音 (Bot 開槍音量減半)
    SoundFX.playShoot(false);

    // 繪製雷射子彈 (到撞擊點而非穿過牆壁)
    const points = [startPos, hitPoint];
    const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
    const color = bot.team === "blue" ? 0x00aaff : 0xff2a2a;
    const lineMat = new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: 0.6 });
    const line = new THREE.Line(lineGeo, lineMat);
    this.scene.add(line);

    this.bullets.push({ mesh: line, timer: 0.08 });
    this.createHitSpark(hitPoint, color);

    // 如果沒有被牆壁阻擋，才進行扣血判定
    if (!isBlocked) {
      if (bot.target === this.camera) {
        // 射擊玩家 (機率判定命中，減少被AI爆頭的打擊感)
        const hitChance = this.keys.Shift ? 0.25 : 0.4;
        if (Math.random() < hitChance) {
          this.damagePlayer(15);
        }
      } else {
        // 射擊其他 Bot
        const enemyBot = bot.target;
        if (enemyBot && Math.random() < 0.5) {
          enemyBot.health -= 18;
          this.spawnDamageFloat(enemyBot.group.position, "18", false);
          if (enemyBot.health <= 0) {
            this.killBot(enemyBot, bot.name);
          }
        }
      }
    }
  },
  updateTargetsMovement() {
    this.targets.forEach(tg => {
      tg.mesh.position.x += tg.moveSpeed * tg.direction;
      const offset = tg.mesh.position.x - tg.initialPos.x;
      if (Math.abs(offset) > tg.moveRange) {
        tg.direction *= -1;
      }
    });
  },

  updateProjectiles(delta) {
    // 1. 子彈彈道淡出
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const b = this.bullets[i];
      b.timer -= delta;
      if (b.timer <= 0) {
        this.scene.remove(b.mesh);
        b.mesh.geometry.dispose();
        b.mesh.material.dispose();
        this.bullets.splice(i, 1);
      }
    }

    // 2. 擊中與受傷火花粒子漂散
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.timer -= delta;
      
      const pos = p.mesh.geometry.attributes.position.array;
      const count = pos.length / 3;

      for (let j = 0; j < count; j++) {
        const vel = p.velocities[j];
        pos[j * 3] += vel.x * delta * 5;
        pos[j * 3 + 1] += vel.y * delta * 5;
        pos[j * 3 + 2] += vel.z * delta * 5;
      }
      p.mesh.geometry.attributes.position.needsUpdate = true;

      if (p.timer <= 0) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        p.mesh.material.dispose();
        this.particles.splice(i, 1);
      }
    }

    // 3. 手榴彈重力模擬
    for (let i = this.grenades.length - 1; i >= 0; i--) {
      const g = this.grenades[i];
      g.timer -= delta;

      // 應用重力與速度
      g.velocity.y += g.gravity * delta;
      g.mesh.position.addScaledVector(g.velocity, delta);

      // 地面阻擋
      if (g.mesh.position.y < 0.1) {
        g.mesh.position.y = 0.1;
        g.velocity.set(0, 0, 0); // 地面靜止
      }

      // 引爆
      if (g.timer <= 0) {
        this.explodeGrenade(g);
        this.grenades.splice(i, 1);
      }
    }
  },

  updateDamageFloats(delta) {
    const tempV = new THREE.Vector3();
    const widthHalf = window.innerWidth / 2;
    const heightHalf = window.innerHeight / 2;

    for (let i = this.damageFloats.length - 1; i >= 0; i--) {
      const df = this.damageFloats[i];
      df.timer -= delta; // 扣除當前幀的真實時間增量

      // 投影到 2D 視窗座標 (不累加 Y 軸偏量，使其固定顯示在擊中位置)
      tempV.copy(df.pos).project(this.camera);

      // 檢查是否在相機正前方 (Z座標介於 -1 到 1 之間)
      if (tempV.z > 1 || tempV.z < -1) {
        df.element.style.display = "none";
      } else {
        df.element.style.display = "block";
        const x = (tempV.x * widthHalf) + widthHalf;
        const y = -(tempV.y * heightHalf) + heightHalf;
        df.element.style.left = `${x}px`;
        df.element.style.top = `${y}px`;
        df.element.style.opacity = Math.max(0, df.timer / 0.35); // 快速淡出
      }

      if (df.timer <= 0) {
        df.element.remove();
        this.damageFloats.splice(i, 1);
      }
    }
  },

  updateRadar() {
    const canvas = document.getElementById("radar-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const center = canvas.width / 2;
    const radius = canvas.width / 2;

    // 清空雷達
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 繪製掃描綠格背景
    ctx.fillStyle = "rgba(11, 12, 14, 0.6)";
    ctx.beginPath();
    ctx.arc(center, center, radius - 2, 0, Math.PI * 2);
    ctx.fill();

    // 繪製同心圓
    ctx.strokeStyle = "rgba(0, 240, 255, 0.15)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(center, center, radius * 0.4, 0, Math.PI * 2);
    ctx.arc(center, center, radius * 0.7, 0, Math.PI * 2);
    ctx.stroke();

    // 繪製雷達轉動掃描線
    const angle = (Date.now() * 0.003) % (Math.PI * 2);
    ctx.strokeStyle = "rgba(0, 240, 255, 0.25)";
    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.lineTo(center + Math.cos(angle) * radius, center + Math.sin(angle) * radius);
    ctx.stroke();

    // 取得玩家自身的 Y 軸朝向 (二維平面向量)
    const playerDir = new THREE.Vector3();
    this.camera.getWorldDirection(playerDir);
    const playerAngle = Math.atan2(playerDir.z, playerDir.x);

    // 雷達縮放比例 (地圖 80x80，雷達半徑對應地圖 30 單位)
    const radarScale = radius / 30;

    // 繪製自己 (位於正中心)
    ctx.fillStyle = "var(--neon-green)";
    ctx.beginPath();
    ctx.arc(center, center, 4, 0, Math.PI * 2);
    ctx.fill();

    // 繪製玩家的小箭頭朝向
    ctx.strokeStyle = "var(--neon-green)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.lineTo(center + Math.cos(0) * 8, center + Math.sin(0) * 8); // 固定頭部為雷達中心上方，或利用旋轉
    ctx.stroke();

    // 繪製 AI 點
    this.bots.forEach(bot => {
      if (bot.isDead) return;

      // 取得相對於玩家的偏移量
      const offset = new THREE.Vector3().subVectors(bot.group.position, this.camera.position);

      // 根據玩家視角方向旋轉偏移向量，使雷達頂部永遠朝向玩家前方
      const rotX = offset.x * Math.cos(-playerAngle - Math.PI/2) - offset.z * Math.sin(-playerAngle - Math.PI/2);
      const rotZ = offset.x * Math.sin(-playerAngle - Math.PI/2) + offset.z * Math.cos(-playerAngle - Math.PI/2);

      // 計算雷達畫布上的座標
      const canvasX = center + rotX * radarScale;
      const canvasY = center + rotZ * radarScale;

      // 如果超出雷達邊界就不畫
      const dist = Math.sqrt((canvasX - center) * (canvasX - center) + (canvasY - center) * (canvasY - center));
      if (dist < radius - 5) {
        ctx.fillStyle = bot.team === "blue" ? "var(--cyan)" : "var(--neon-red)";
        ctx.shadowColor = bot.team === "blue" ? "var(--cyan-glow)" : "var(--neon-red-glow)";
        ctx.shadowBlur = 4;
        ctx.beginPath();
        ctx.arc(canvasX, canvasY, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0; // 重置發光
      }
    });
  }
};

window.addEventListener("DOMContentLoaded", () => {
  GameEngine.init();
  window.GameEngine = GameEngine; // 掛在 window 下供 app.js 調用
});
