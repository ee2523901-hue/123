// GUNFIGHT 應用程式管理與 UI 控制器

// Web Audio API 賽博朋克音效合成器
const SoundFX = {
  ctx: null,
  musicSource: null,
  musicGain: null,
  isPlayingMusic: false,

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
  },

  playTone(freq, duration, type = "sine", decay = true, startVolume = 0.1) {
    this.init();
    try {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      const osc = this.ctx.createOscillator();
      const gainNode = this.ctx.createGain();

      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      
      gainNode.gain.setValueAtTime(startVolume, this.ctx.currentTime);
      if (decay) {
        gainNode.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
      } else {
        gainNode.gain.setValueAtTime(startVolume, this.ctx.currentTime + duration - 0.05);
        gainNode.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
      }

      osc.connect(gainNode);
      gainNode.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      console.warn("音效撥放失敗:", e);
    }
  },

  playClick() {
    this.playTone(800, 0.08, "triangle", true, 0.05);
    setTimeout(() => this.playTone(1200, 0.05, "sine", true, 0.03), 30);
  },

  playHover() {
    this.playTone(600, 0.05, "sine", true, 0.02);
  },

  playBuy() {
    this.playTone(400, 0.15, "triangle", false, 0.1);
    setTimeout(() => {
      this.playTone(600, 0.15, "triangle", false, 0.1);
      this.playTone(800, 0.3, "sine", true, 0.08);
    }, 100);
  },

  playHurt() {
    this.playTone(150, 0.25, "sawtooth", true, 0.15);
  },

  playShoot(isPlayer = true) {
    this.init();
    try {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(isPlayer ? 500 : 350, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.15);
      
      gain.gain.setValueAtTime(isPlayer ? 0.15 : 0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(now + 0.16);
    } catch(e) {}
  },

  playKill() {
    this.playTone(440, 0.1, "sine", false, 0.08);
    setTimeout(() => {
      this.playTone(880, 0.2, "sine", true, 0.1);
    }, 80);
  },

  playLobbyMusic() {
    this.init();
    if (this.isPlayingMusic) return;
    this.isPlayingMusic = true;

    try {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(0.015, this.ctx.currentTime); // 輕柔背景音量
      this.musicGain.connect(this.ctx.destination);

      const playSynthBar = () => {
        if (!this.isPlayingMusic) return;
        const now = this.ctx.currentTime;
        // 熱血硬派的二次元機甲電子旋律 (D3 - D3 - E3 - D3 - G3 - D3 - F3 - E3)
        const notes = [146.83, 146.83, 164.81, 146.83, 196.00, 146.83, 174.61, 164.81];
        
        notes.forEach((freq, index) => {
          const osc = this.ctx.createOscillator();
          const g = this.ctx.createGain();
          osc.type = "triangle"; // 使用電子感更強的 triangle 三角波
          osc.frequency.setValueAtTime(freq, now + index * 0.25);
          
          // 明亮清脆的高通/低通濾波器
          const filter = this.ctx.createBiquadFilter();
          filter.type = "lowpass";
          filter.frequency.setValueAtTime(800, now);

          g.gain.setValueAtTime(0.1, now + index * 0.25);
          g.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.25 + 0.2);

          osc.connect(filter);
          filter.connect(g);
          g.connect(this.musicGain);

          osc.start(now + index * 0.25);
          osc.stop(now + index * 0.25 + 0.3);
        });

        // 循環播放
        setTimeout(playSynthBar, 2000);
      };

      playSynthBar();
    } catch(e) {
      console.warn("背景音樂撥放失敗:", e);
    }
  },

  stopLobbyMusic() {
    this.isPlayingMusic = false;
    if (this.musicGain) {
      try {
        this.musicGain.disconnect();
      } catch(e){}
    }
  }
};

// 遊戲狀態與存檔
const GameState = {
  cr: 5000, // 初始點數，供玩家自由選購
  unlockedItems: {
    RECON_PIS: true,
    SHIFT_AR: true,
    LIGHT_VEST: true,
    COMBAT_KNIFE: true,
    GRENADE: true,
    CADET: true
  },
  loadout: {
    primary: "SHIFT_AR",
    secondary: "RECON_PIS",
    armor: "LIGHT_VEST",
    melee: "COMBAT_KNIFE",
    explosive: "GRENADE",
    skin: "CADET"
  },
  stats: {
    matchesPlayed: 0,
    matchesWon: 0,
    kills: 0,
    deaths: 0,
    accuracyTotal: 0,
    accuracyCount: 0,
    targetsHit: 0,
    botKills: 0
  },

  load() {
    try {
      const saved = localStorage.getItem("GUNFIGHT_SAVE_DATA");
      if (saved) {
        const parsed = JSON.parse(saved);
        this.cr = parsed.cr !== undefined ? parsed.cr : this.cr;
        this.unlockedItems = parsed.unlockedItems || this.unlockedItems;
        this.loadout = parsed.loadout || this.loadout;
        this.stats = parsed.stats || this.stats;
      }
    } catch(e) {
      console.warn("讀取存檔失敗，使用預設值。");
    }
    this.save();
  },

  save() {
    try {
      localStorage.setItem("GUNFIGHT_SAVE_DATA", JSON.stringify({
        cr: this.cr,
        unlockedItems: this.unlockedItems,
        loadout: this.loadout,
        stats: this.stats
      }));
    } catch(e) {
      console.warn("儲存失敗：", e);
    }
    this.updateHUD();
  },

  updateHUD() {
    document.querySelectorAll(".credits-amount").forEach(el => {
      el.textContent = this.cr.toLocaleString();
    });
  },

  addCR(amount) {
    this.cr += amount;
    this.save();
  }
};

// 全景 UI 管理
const AppUI = {
  activeScreen: "lobby",
  currentTab: "weapons",
  selectedItemId: null,
  lobbyThree: null, // Lobby 3D 預覽物件

  init() {
    GameState.load();
    this.setupEventListeners();
    this.switchScreen("lobby");
    this.renderStats();

    // 延遲載入大廳 3D 旋轉全息特務
    setTimeout(() => {
      this.initLobby3DHologram();
    }, 500);

    // 大廳音樂點擊啟動（網頁安全機制需由使用者互動觸發）
    document.body.addEventListener('click', () => {
      SoundFX.playLobbyMusic();
    }, { once: true });
  },

  switchScreen(screenId) {
    SoundFX.playClick();
    
    // 隱藏/顯示全球頂部導航欄
    const globalHeader = document.getElementById("global-nav-header");
    if (screenId === "game") {
      if (globalHeader) globalHeader.style.display = "none";
    } else {
      if (globalHeader) globalHeader.style.display = "flex";
    }

    // 更新導航欄 Active 狀態
    document.querySelectorAll(".nav-tab").forEach(tab => {
      tab.classList.remove("active");
      if (tab.dataset.target === screenId) {
        tab.classList.add("active");
      }
    });

    document.querySelectorAll(".screen").forEach(screen => {
      screen.classList.remove("active");
    });
    const target = document.getElementById(`${screenId}-screen`);
    if (target) {
      target.classList.add("active");
    }
    this.activeScreen = screenId;

    // HUD 顯示控制
    const gameHUD = document.getElementById("game-hud");
    if (screenId === "game") {
      gameHUD.classList.add("active");
      SoundFX.stopLobbyMusic();
    } else {
      gameHUD.classList.remove("active");
      if (screenId !== "result") {
        SoundFX.playLobbyMusic();
      }
    }

    // 當切換回大廳時，重新渲染大廳資訊
    if (screenId === "lobby") {
      this.renderLobbyOperatorDetails();
      if (this.lobbyThree && this.lobbyThree.updateColor) {
        const equippedSkin = GUNFIGHT_DATA.skins.find(s => s.id === GameState.loadout.skin);
        this.lobbyThree.updateColor(equippedSkin ? equippedSkin.id : "CADET");
      }
    }

    if (screenId === "store") {
      this.switchStoreTab(this.currentTab);
      // 初始化 3D 商店武器預覽
      setTimeout(() => {
        this.initStore3DPreview();
        if (this.selectedItemId) {
          this.updateStore3DPreview(this.selectedItemId);
        }
      }, 100);
    }
    
    if (screenId === "maps") {
      this.renderMaps();
    }

    if (screenId === "stats") {
      this.renderStats();
    }
  },

  setupEventListeners() {
    // 綁定全球頂部導航欄 (Roblox Rivals 風格)
    document.querySelectorAll(".nav-tab").forEach(tab => {
      tab.addEventListener("click", (e) => {
        const target = e.currentTarget.dataset.target;
        this.switchScreen(target);
      });
    });

    // 綁定大廳選單按鈕
    document.querySelector(".btn-battle").addEventListener("click", () => this.switchScreen("maps"));
    document.querySelector(".btn-store").addEventListener("click", () => this.switchScreen("store"));
    document.querySelector(".btn-training").addEventListener("click", () => {
      this.switchScreen("game");
      // 啟動靶場
      if (window.GameEngine) {
        window.GameEngine.start(true);
      }
    });
    document.querySelector(".btn-stats").addEventListener("click", () => this.switchScreen("stats"));

    // 綁定返回大廳按鈕
    document.querySelectorAll(".back-to-lobby-btn").forEach(btn => {
      btn.addEventListener("click", () => this.switchScreen("lobby"));
    });

    // 綁定商店分頁切換
    document.querySelectorAll(".store-tab-btn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        const tab = e.target.dataset.tab;
        this.switchStoreTab(tab);
      });
    });

    // 綁定開始戰鬥按鈕
    document.querySelector(".start-battle-btn").addEventListener("click", () => {
      const selectedMap = document.querySelector(".map-card.selected");
      if (!selectedMap) return;
      const mapId = selectedMap.dataset.id;
      
      this.switchScreen("game");
      if (window.GameEngine) {
        window.GameEngine.start(false, mapId);
      }
    });

    // 綁定結算畫面返回大廳
    document.querySelector(".btn-result-close").addEventListener("click", () => {
      this.switchScreen("lobby");
      document.getElementById("match-result-overlay").classList.remove("active");
    });
  },

  // 渲染大廳 Operator 卡片
  renderLobbyOperatorDetails() {
    const skinId = GameState.loadout.skin;
    const skin = GUNFIGHT_DATA.skins.find(s => s.id === skinId) || GUNFIGHT_DATA.skins[0];
    
    const card = document.querySelector(".operator-details-card");
    if (!card) return;

    card.innerHTML = `
      <div class="operator-rarity rarity-${skin.rarity}">${skin.rarity}</div>
      <div class="operator-name" style="color: ${skin.accent}">${skin.name}</div>
      <div class="operator-desc">${skin.desc}</div>
      <div style="margin-top: 15px; font-size: 11px; color: var(--text-muted); display: flex; justify-content: space-between;">
        <span>主武器: ${GUNFIGHT_DATA.weapons.find(w => w.id === GameState.loadout.primary).name.split(" ")[0]}</span>
        <span>護甲: ${GUNFIGHT_DATA.defense.find(d => d.id === GameState.loadout.armor).name}</span>
      </div>
    `;
  },

  // 3D 商店武器旋轉展示 (Roblox Rivals 風格)
  initStore3DPreview() {
    const container = document.getElementById("store-3d-preview-container");
    if (!container) return;
    container.innerHTML = "";

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 10);
    camera.position.set(0, 0, 1.3);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight.position.set(2, 4, 3);
    scene.add(dirLight);

    const previewGroup = new THREE.Group();
    scene.add(previewGroup);

    this.storePreviewThree = { scene, camera, renderer, group: previewGroup };

    const animatePreview = () => {
      if (this.activeScreen !== "store" || !this.storePreviewThree) return;
      requestAnimationFrame(animatePreview);
      previewGroup.rotation.y += 0.015;
      previewGroup.rotation.x = Math.sin(Date.now() * 0.001) * 0.08;
      renderer.render(scene, camera);
    };
    animatePreview();
  },

  updateStore3DPreview(itemId) {
    if (!this.storePreviewThree) return;
    const group = this.storePreviewThree.group;
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }

    let item = GUNFIGHT_DATA.weapons.find(w => w.id === itemId) ||
               GUNFIGHT_DATA.defense.find(d => d.id === itemId) ||
               GUNFIGHT_DATA.explosives.find(e => e.id === itemId) ||
               GUNFIGHT_DATA.skins.find(s => s.id === itemId);
    if (!item) return;

    const accentColor = new THREE.Color(item.color || "#00e5ff");
    // 寫實金屬漆面與拋光外觀材質
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x8e929a, metalness: 0.95, roughness: 0.12 });
    const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x18191c, metalness: 0.9, roughness: 0.15 });
    const polymerMat = new THREE.MeshStandardMaterial({ color: 0x242528, metalness: 0.2, roughness: 0.45 });
    const woodMat = new THREE.MeshStandardMaterial({ color: 0x82542a, metalness: 0.05, roughness: 0.75 });
    const glowMat = new THREE.MeshBasicMaterial({ color: accentColor });
    const glassMat = new THREE.MeshBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.55 });
    const outlineMat = new THREE.MeshBasicMaterial({ color: 0x1c1a27, side: THREE.BackSide });

    // 建立組件添加與描邊的輔助函數 (為商店提供與遊戲一致的 Toon 描邊)
    const addPart = (mesh, scaleFactor = 1.15) => {
      group.add(mesh);
      const outline = new THREE.Mesh(mesh.geometry.clone(), outlineMat);
      outline.position.copy(mesh.position);
      outline.rotation.copy(mesh.rotation);
      outline.scale.copy(mesh.scale).multiplyScalar(scaleFactor);
      group.add(outline);
    };

    if (item.type === "firearm") {
      // 統一醬料瓶模板 (使用該武器專屬色澤)
      const bottleColor = new THREE.Color(item.color || "#ff0000");
      const localGlowMat = new THREE.MeshToonMaterial({ color: bottleColor, roughness: 0.3 });

      // 1. 醬料瓶本體 (Cylinder)
      const bottleGeo = new THREE.CylinderGeometry(0.045, 0.055, 0.22, 12);
      const bottle = new THREE.Mesh(bottleGeo, localGlowMat);
      bottle.position.set(0, 0.04, 0);
      addPart(bottle, 1.15);

      // 2. 擠壓噴嘴 (Cone)
      const nozzleGeo = new THREE.ConeGeometry(0.022, 0.08, 8);
      const nozzle = new THREE.Mesh(nozzleGeo, polymerMat);
      nozzle.position.set(0, 0.18, 0);
      addPart(nozzle, 1.2);

      // 3. 瓶蓋螺紋
      const capGeo = new THREE.CylinderGeometry(0.032, 0.032, 0.02, 10);
      const cap = new THREE.Mesh(capGeo, darkMetalMat);
      cap.position.set(0, 0.14, 0);
      addPart(cap);

      // 4. 握持瓶身把手 (Trigger Grip)
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.12, 0.05), darkMetalMat);
      grip.position.set(0, -0.06, 0.04);
      grip.rotation.x = Math.PI / 8;
      addPart(grip, 1.25);
    } else if (item.type === "melee") {
      // 統一使用鮭魚生魚片太刀模型模板
      const salmon = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.06, 0.32), salmonMat);
      salmon.position.set(0, 0.08, 0);
      addPart(salmon, 1.15);

      const stripe1 = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.005, 0.28), riceMat);
      stripe1.position.set(0.001, 0.02, 0);
      charGroup.add(stripe1);
    } else if (item.type === "armor") {
      // 統一使用切片土司模型模板
      const toast = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.04), breadMat);
      toast.position.set(0, 0, 0);
      addPart(toast, 1.15);
    } else if (item.type === "explosive") {
      // 統一使用白糖大饅頭模型模板
      const bun = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 10), riceMat);
      bun.scale.set(1.1, 0.9, 1.1); // 捏成微扁的包子形狀
      bun.position.set(0, 0, 0);
      addPart(bun, 1.15);
    } else if (GUNFIGHT_DATA.skins.some(s => s.id === item.id)) {
      this.buildCharacterMesh(item.id, group, 0.28, true);
    }
  },
  buildCharacterMesh(skinId, group, scale = 1.0, isStore = false) {
    const skin = GUNFIGHT_DATA.skins.find(s => s.id === skinId) || GUNFIGHT_DATA.skins[0];
    const skinColor = new THREE.Color(skin ? skin.color : "#00e5ff");

    // 材質
    const metalMat = new THREE.MeshStandardMaterial({ color: 0x8e929a, metalness: 0.85, roughness: 0.25 });
    const darkMetalMat = new THREE.MeshStandardMaterial({ color: 0x222326, metalness: 0.7, roughness: 0.35 });
    const polymerMat = new THREE.MeshStandardMaterial({ color: 0x28282c, metalness: 0.1, roughness: 0.55 });
    const outlineMat = new THREE.MeshBasicMaterial({ color: 0x1c1a27, side: THREE.BackSide });
    
    // 食物專用材質
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

    const charGroup = new THREE.Group();
    charGroup.scale.set(scale, scale, scale);

    const addOutline = (mesh, scaleFactor = 1.15) => {
      const outline = new THREE.Mesh(mesh.geometry.clone(), outlineMat);
      outline.position.copy(mesh.position);
      outline.rotation.copy(mesh.rotation);
      outline.scale.copy(mesh.scale).multiplyScalar(scaleFactor);
      charGroup.add(outline);
    };

    const addPart = (mesh, scaleFactor = 1.15) => {
      charGroup.add(mesh);
      addOutline(mesh, scaleFactor);
    };

    // 1. 雙腿 (二頭身胖胖小腳行走，所有食物共用，顯得極其滑稽可愛)
    const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.32, 6), darkMetalMat);
    legL.position.set(-0.12, 0.16, 0);
    addPart(legL, 1.25);

    const legR = legL.clone();
    legR.position.x = 0.12;
    addPart(legR, 1.25);

    // 2. 依照造型 ID 動態建模各種驚艷 3D 食物本體
    if (skinId === "CADET") {
      // 珍珠奶茶：透明大塑料杯 + 奶茶 + 珍珠 + 吸管
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.18, 0.6, 12), glassMat);
      cup.position.set(0, 0.6, 0);
      charGroup.add(cup);

      const tea = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.17, 0.5, 10), bobaMat);
      tea.position.set(0, 0.55, 0);
      addPart(tea, 1.05);

      // 吸管
      const straw = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.5, 6), new THREE.MeshBasicMaterial({ color: 0xff00ff }));
      straw.position.set(0.05, 0.8, -0.05);
      straw.rotation.z = Math.PI / 12;
      addPart(straw, 1.15);

      // 黑糖珍珠
      for (let j = 0; j < 5; j++) {
        const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.038, 4, 4), polymerMat);
        pearl.position.set((Math.random() - 0.5) * 0.22, 0.35 + Math.random() * 0.1, (Math.random() - 0.5) * 0.22);
        charGroup.add(pearl);
      }
    } else if (skinId === "VANGUARD") {
      // 熱狗堡：麵包 + 巨大熱狗香腸 + 黃芥末醬
      const bunL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.28, 0.54), breadMat);
      bunL.position.set(-0.15, 0.56, 0);
      bunL.rotation.y = Math.PI / 2;
      addPart(bunL, 1.12);

      const bunR = bunL.clone();
      bunR.position.x = 0.15;
      addPart(bunR, 1.12);

      const sausage = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.58, 8), sausageMat);
      sausage.rotation.x = Math.PI / 2;
      sausage.position.set(0, 0.6, 0);
      addPart(sausage, 1.15);

      // 黃芥末醬線圈
      const mustard = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.015, 4, 12), cheeseMat);
      mustard.position.set(0, 0.68, 0);
      charGroup.add(mustard);
    } else if (skinId === "HACKER") {
      // 雙層漢堡：上下麵包 + 雙層牛肉 + 起司 + 生菜
      const bunBottom = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.06, 12), breadMat);
      bunBottom.position.set(0, 0.35, 0);
      addPart(bunBottom);

      const patty1 = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.07, 10), beefMat);
      patty1.position.set(0, 0.43, 0);
      addPart(patty1);

      const cheese = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.01, 0.35), cheeseMat);
      cheese.position.set(0, 0.48, 0);
      cheese.rotation.y = Math.PI / 4;
      addPart(cheese);

      const patty2 = patty1.clone();
      patty2.position.y = 0.53;
      addPart(patty2);

      const lettuce = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.03, 0.3), lettuceMat);
      lettuce.position.set(0, 0.58, 0);
      charGroup.add(lettuce);

      const bunTop = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 12, 0, Math.PI*2, 0, Math.PI/2), breadMat);
      bunTop.position.set(0, 0.6, 0);
      addPart(bunTop);
    } else if (skinId === "REBEL") {
      // 披薩：三角形披薩片 + 融化起司 + 薩拉米臘腸圓片
      const pizza = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.52, 3), pizzaMat);
      pizza.rotation.x = Math.PI / 2;
      pizza.position.set(0, 0.58, 0);
      addPart(pizza, 1.12);

      const crust = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.56, 6), crustMat);
      crust.rotation.z = Math.PI / 2;
      crust.position.set(0, 0.58, 0.24);
      addPart(crust);

      // 薩拉米臘腸
      for (let j = 0; j < 3; j++) {
        const sal = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.01, 6), tomatoMat);
        sal.position.set((j - 1) * 0.08, 0.6, -0.06 * j);
        sal.rotation.x = Math.PI / 2;
        charGroup.add(sal);
      }
    } else if (skinId === "PREDATOR") {
      // 甜甜圈：巧克力甜甜圈 + 彩色糖針
      const donut = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.09, 8, 16), breadMat);
      donut.position.set(0, 0.58, 0);
      donut.rotation.x = Math.PI / 2.5;
      addPart(donut, 1.15);

      const icing = new THREE.Mesh(new THREE.TorusGeometry(0.205, 0.07, 6, 16), chocolateMat);
      icing.position.set(0, 0.6, -0.01);
      icing.rotation.x = Math.PI / 2.5;
      charGroup.add(icing);

      // 灑落彩虹糖針
      for (let j = 0; j < 6; j++) {
        const sprinkle = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.04, 0.012), new THREE.MeshBasicMaterial({ color: Math.random() * 0xffffff }));
        sprinkle.position.set((Math.random() - 0.5) * 0.24, 0.64, (Math.random() - 0.5) * 0.24);
        charGroup.add(sprinkle);
      }
    } else if (skinId === "INFILTRATOR") {
      // 鮭魚壽司：醋飯 + 鮭魚片 + 海苔綁帶
      const rice = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.16, 0.38), riceMat);
      rice.position.set(0, 0.44, 0);
      addPart(rice, 1.15);

      const salmon = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.44), salmonMat);
      salmon.position.set(0, 0.54, 0);
      addPart(salmon, 1.15);

      const nori = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.18, 0.08), noriMat);
      nori.position.set(0, 0.48, 0);
      addPart(nori, 1.12);
    } else if (skinId === "ENFORCER") {
      // 爆米花筒：紅白條紋紙桶 + 爆米花滿溢
      const bucket = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.2, 0.44, 10), paperMat);
      bucket.position.set(0, 0.52, 0);
      addPart(bucket, 1.12);

      // 紅白相間貼圖模擬 (手繪兩根紅白柱)
      const redBarL = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.44, 0.262), new THREE.MeshBasicMaterial({ color: 0xff0000 }));
      redBarL.position.set(-0.15, 0.52, 0);
      charGroup.add(redBarL);
      const redBarR = redBarL.clone();
      redBarR.position.x = 0.15;
      charGroup.add(redBarR);

      // 爆米花球體
      for (let j = 0; j < 8; j++) {
        const corn = new THREE.Mesh(new THREE.SphereGeometry(0.065, 4, 4), popcornMat);
        corn.position.set((Math.random() - 0.5) * 0.24, 0.74 + Math.random()*0.06, (Math.random() - 0.5) * 0.24);
        charGroup.add(corn);
      }
    } else if (skinId === "SHADOW") {
      // 黑咖啡紙杯：黑咖啡 + 深灰色外帶杯
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.18, 0.48, 10), darkMetalMat);
      cup.position.set(0, 0.54, 0);
      addPart(cup, 1.12);

      const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.05, 10), polymerMat);
      lid.position.set(0, 0.78, 0);
      addPart(lid);
    } else if (skinId === "CYCLONE") {
      // 薄荷霜淇淋甜筒：霜淇淋 + 甜筒
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.38, 6), waffleMat);
      cone.rotation.x = Math.PI;
      cone.position.set(0, 0.44, 0);
      addPart(cone, 1.18);

      const scoop = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), new THREE.MeshStandardMaterial({ color: 0x80ffb0, roughness: 0.7 })); // 薄荷綠
      scoop.position.set(0, 0.68, 0);
      addPart(scoop, 1.15);
    } else if (skinId === "SPECTRE") {
      // 香蒜長棍遊俠：斜切法國麵包
      const loaf = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.58, 6), breadMat);
      loaf.rotation.z = Math.PI / 4;
      loaf.position.set(0, 0.55, 0);
      addPart(loaf, 1.15);

      // 大蒜奶油發光條
      const butter = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.48, 0.08), cheeseMat);
      butter.position.set(0.02, 0.58, 0.01);
      butter.rotation.z = Math.PI / 4;
      charGroup.add(butter);
    } else if (skinId === "CHRONO") {
      // 焦糖馬卡龍：雙層黃金餅 + 焦糖夾心
      const shell1 = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.08, 10), new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.9, roughness: 0.15 }));
      shell1.position.set(0, 0.44, 0);
      addPart(shell1);

      const filling = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.21, 0.06, 10), bobaMat);
      filling.position.set(0, 0.51, 0);
      charGroup.add(filling);

      const shell2 = shell1.clone();
      shell2.position.y = 0.58;
      addPart(shell2);
    } else if (skinId === "OVERLORD") {
      // 烤火雞：肥碩金黃烤火雞 + 兩根小雞腿骨
      const body = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), crustMat);
      body.scale.set(1, 0.8, 1.25);
      body.position.set(0, 0.54, 0);
      addPart(body, 1.12);

      // 雞腿骨
      const boneL = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.16, 6), riceMat);
      boneL.position.set(-0.12, 0.44, 0.26);
      boneL.rotation.x = Math.PI / 4;
      addPart(boneL);
      const boneR = boneL.clone();
      boneR.position.x = 0.12;
      addPart(boneR);
    } else if (skinId === "ECLIPSE") {
      // 辣條使徒：三根交錯的紅油長辣條
      for (let j = -1; j <= 1; j++) {
        const strip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.52, 0.06), sausageMat);
        strip.position.set(j * 0.08, 0.56, -j * 0.02);
        strip.rotation.z = j * 0.15;
        addPart(strip, 1.2);
      }
    } else if (skinId === "VALKYRIE") {
      // 華夫餅草莓甜筒 + 糖衣小翅膀
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.38, 6), waffleMat);
      cone.rotation.x = Math.PI;
      cone.position.set(0, 0.44, 0);
      addPart(cone, 1.18);

      const scoop = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 8), tomatoMat);
      scoop.position.set(0, 0.68, 0);
      addPart(scoop, 1.15);

      // 糖衣小翅膀 (糖果片)
      const wL = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.06, 0.01), new THREE.MeshBasicMaterial({ color: 0xff00ff }));
      wL.position.set(-0.25, 0.72, 0);
      wL.rotation.z = -Math.PI / 8;
      charGroup.add(wL);
      const wR = wL.clone();
      wR.position.x = 0.25;
      wR.rotation.z = Math.PI / 8;
      charGroup.add(wR);
    } else if (skinId === "NEON_ASSASSIN") {
      // 霓虹水果包裝糖果：包裝紙側角 + 包裝本體
      const wrap = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.22), new THREE.MeshStandardMaterial({ color: 0xff00ff, roughness: 0.3 }));
      wrap.position.set(0, 0.52, 0);
      wrap.rotation.z = Math.PI / 12;
      addPart(wrap, 1.12);

      // 扭結
      const tieL = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.14, 4), new THREE.MeshBasicMaterial({ color: 0x00ffff }));
      tieL.rotation.z = -Math.PI / 2;
      tieL.position.set(-0.18, 0.54, 0);
      charGroup.add(tieL);
      const tieR = tieL.clone();
      tieR.rotation.z = Math.PI / 2;
      tieR.position.x = 0.18;
      charGroup.add(tieR);
    } else if (skinId === "GHOST_RIDER") {
      // 烤布蕾：焦糖脆皮杯 + 冒出的小火苗
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.22, 0.32, 10), paperMat);
      cup.position.set(0, 0.48, 0);
      addPart(cup, 1.12);

      const brulee = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.05, 10), new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.1 }));
      brulee.position.set(0, 0.63, 0);
      addPart(brulee);

      // 幽藍發光粒子火苗
      const fire = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 4), new THREE.MeshBasicMaterial({ color: 0x00ffff }));
      fire.position.set(0, 0.74, 0);
      charGroup.add(fire);
    } else if (skinId === "TITAN") {
      // 薯條盒：紅色紙盒 + 數根探出的金色黃薯條 (French Fries)
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.35, 0.16), tomatoMat); // 紅盒
      box.position.set(0, 0.48, 0);
      addPart(box, 1.12);

      // 薯條
      for (let j = 0; j < 6; j++) {
        const fry = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.34, 0.045), cheeseMat);
        fry.position.set((j - 2.5) * 0.048, 0.65 + Math.random()*0.05, (Math.random() - 0.5)*0.06);
        fry.rotation.z = (j - 2.5) * 0.05;
        addPart(fry, 1.15);
      }
    } else if (skinId === "ZEUS") {
      // 章魚小丸子：三顆淋醬章魚燒疊放
      const ball1 = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), breadMat);
      ball1.position.set(-0.1, 0.46, -0.05);
      addPart(ball1, 1.15);

      const ball2 = ball1.clone();
      ball2.position.set(0.1, 0.46, -0.05);
      addPart(ball2, 1.15);

      const ball3 = ball1.clone();
      ball3.position.set(0, 0.64, 0);
      addPart(ball3, 1.15);

      // 發光電漿美乃滋線條
      const line = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.015, 0.15), new THREE.MeshBasicMaterial({ color: 0x00e5ff }));
      line.position.set(0, 0.72, 0.02);
      charGroup.add(line);
    } else if (skinId === "ONI") {
      // 日式拉麵：大碗 + 黃麵條 + 溏心蛋 + 綠蔥花
      const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.18, 0.28, 10), tomatoMat); // 紅拉麵碗
      bowl.position.set(0, 0.48, 0);
      addPart(bowl, 1.12);

      const noodles = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.04, 10), cheeseMat);
      noodles.position.set(0, 0.6, 0);
      addPart(noodles);

      // 蛋
      const egg = new THREE.Mesh(new THREE.SphereGeometry(0.06, 5, 5), riceMat);
      egg.position.set(0.08, 0.63, 0.06);
      charGroup.add(egg);
      const yolk = new THREE.Mesh(new THREE.SphereGeometry(0.034, 4, 4), cheeseMat);
      yolk.position.set(0.08, 0.65, 0.06);
      charGroup.add(yolk);
    } else {
      // AMTERASU: 三層彩虹蛋糕
      const layer1 = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.14, 10), riceMat); // 底層
      layer1.position.set(0, 0.4, 0);
      addPart(layer1);

      const layer2 = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.12, 10), new THREE.MeshStandardMaterial({ color: 0xffc0cb, roughness: 0.7 })); // 中層粉紅
      layer2.position.set(0, 0.52, 0);
      addPart(layer2);

      const layer3 = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.1, 10), new THREE.MeshStandardMaterial({ color: 0xe0ffff, roughness: 0.7 })); // 頂層淡青
      layer3.position.set(0, 0.62, 0);
      addPart(layer3);

      // 蛋糕頂部草莓
      const strawberry = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), tomatoMat);
      strawberry.position.set(0, 0.7, 0);
      addPart(strawberry, 1.15);
    }

    group.add(charGroup);
  },

  // 大廳 3D 粒子/卡通人物人像投影 (Three.js) - 動畫風
  initLobby3DHologram() {
    const container = document.getElementById("lobby-preview-canvas-container");
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0d0b18, 0.015); // 使用深紫空間霧氣

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 1.2, 3.5);
    camera.lookAt(0, 0.8, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    // 建立陽光與環境光 (Toon 著色器必需)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(5, 10, 5);
    scene.add(dirLight);

    // 建立一個可愛的二次元網格地面 (科幻藍)
    const gridHelper = new THREE.GridHelper(10, 20, 0x00e5ff, 0x121024);
    gridHelper.position.y = 0;
    scene.add(gridHelper);

    // 實體卡通人物組
    const operatorGroup = new THREE.Group();
    scene.add(operatorGroup);

    // 讀取當前造型
    const currentSkin = GUNFIGHT_DATA.skins.find(s => s.id === GameState.loadout.skin);
    const skinColor = new THREE.Color(currentSkin ? currentSkin.color : "#00e5ff");

    // 漫畫底座
    const baseGeo = new THREE.CylinderGeometry(0.8, 1.0, 0.15, 6);
    const baseMat = new THREE.MeshToonMaterial({ color: 0x1c183a, roughness: 0.6 });
    const baseMesh = new THREE.Mesh(baseGeo, baseMat);
    baseMesh.position.y = 0.07;
    scene.add(baseMesh);

    const baseOutline = new THREE.Mesh(baseGeo.clone(), new THREE.MeshBasicMaterial({ color: 0x1c1a27, side: THREE.BackSide }));
    baseOutline.position.copy(baseMesh.position);
    baseOutline.scale.set(1.05, 1.15, 1.05);
    scene.add(baseOutline);

    // 初始化角色 3D 模型
    this.buildCharacterMesh(GameState.loadout.skin, operatorGroup, 1.0, false);

    // 浮空能量外圈
    const ringGeo = new THREE.RingGeometry(0.7, 0.72, 30);
    const ringMat = new THREE.MeshBasicMaterial({ color: skinColor, side: THREE.DoubleSide, transparent: true, opacity: 0.5 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.5;
    scene.add(ring);

    // 粒子上升效果 (科幻藍閃光)
    const particleGeo = new THREE.BufferGeometry();
    const particleCount = 60;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 1.5;
      positions[i * 3 + 1] = Math.random() * 2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 1.5;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const pMaterial = new THREE.PointsMaterial({
      color: new THREE.Color("#00e5ff"),
      size: 0.035,
      transparent: true,
      opacity: 0.7
    });
    const particles = new THREE.Points(particleGeo, pMaterial);
    scene.add(particles);

    // 提供更換造型配色的閉包函式
    this.lobbyThree = {
      updateColor: (skinId) => {
        // 清空舊特務模型
        while (operatorGroup.children.length > 0) {
          operatorGroup.remove(operatorGroup.children[0]);
        }
        // 重新建造新造型的 3D 模型與配件
        this.buildCharacterMesh(skinId, operatorGroup, 1.0, false);

        const newSkin = GUNFIGHT_DATA.skins.find(s => s.id === skinId);
        const newColor = new THREE.Color(newSkin ? newSkin.color : "#00e5ff");
        ringMat.color.copy(newColor);
        gridHelper.material.color.copy(newColor);
      }
    };

    // 更新當前造型的色調
    if (currentSkin) {
      this.lobbyThree.updateColor(currentSkin.id);
    }

    // 動畫循環
    const animate = () => {
      if (this.activeScreen !== "lobby") {
        requestAnimationFrame(animate);
        return;
      }
      requestAnimationFrame(animate);

      // 旋轉特務與浮空圈
      operatorGroup.rotation.y += 0.015;
      ring.position.y = 0.5 + Math.sin(Date.now() * 0.003) * 0.08;
      ring.rotation.z -= 0.01;

      // 粒子飄動向上
      const pos = particleGeo.attributes.position.array;
      for (let i = 0; i < particleCount; i++) {
        pos[i * 3 + 1] += 0.01;
        if (pos[i * 3 + 1] > 2.0) {
          pos[i * 3 + 1] = 0;
          pos[i * 3] = (Math.random() - 0.5) * 1.5;
          pos[i * 3 + 2] = (Math.random() - 0.5) * 1.5;
        }
      }
      particleGeo.attributes.position.needsUpdate = true;

      renderer.render(scene, camera);
    };

    animate();

    // 視窗縮放事件
    window.addEventListener("resize", () => {
      if (container.clientWidth > 0) {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
      }
    });
  },
  // 商店切換 TAB 邏輯
  switchStoreTab(tabId) {
    SoundFX.playClick();
    this.currentTab = tabId;
    
    document.querySelectorAll(".store-tab-btn").forEach(btn => {
      btn.classList.remove("active");
    });
    const activeBtn = document.querySelector(`.store-tab-btn[data-tab="${tabId}"]`);
    if (activeBtn) activeBtn.classList.add("active");

    this.renderStoreItems(tabId);
  },

  // 渲染商店卡片列表
  renderStoreItems(tabId) {
    const grid = document.querySelector(".store-items-grid");
    if (!grid) return;

    grid.innerHTML = "";
    let items = [];

    if (tabId === "weapons") items = GUNFIGHT_DATA.weapons;
    else if (tabId === "defense") items = GUNFIGHT_DATA.defense;
    else if (tabId === "explosives") items = GUNFIGHT_DATA.explosives;
    else if (tabId === "skins") items = GUNFIGHT_DATA.skins;

    items.forEach(item => {
      const isUnlocked = GameState.unlockedItems[item.id] || item.price === 0;
      
      // 判斷是否配備
      let isEquipped = false;
      if (tabId === "weapons") {
        isEquipped = GameState.loadout.primary === item.id || GameState.loadout.secondary === item.id;
      } else if (tabId === "defense") {
        isEquipped = GameState.loadout.armor === item.id || GameState.loadout.melee === item.id;
      } else if (tabId === "explosives") {
        isEquipped = GameState.loadout.explosive === item.id;
      } else if (tabId === "skins") {
        isEquipped = GameState.loadout.skin === item.id;
      }

      const card = document.createElement("div");
      card.className = `store-card ${isEquipped ? 'equipped' : ''}`;
      card.dataset.id = item.id;

      // 稀有度色彩
      let rarityColor = "#8c9099";
      if (item.rarity === "Rare") rarityColor = "#1f75fe";
      else if (item.rarity === "Epic") rarityColor = "#8b00ff";
      else if (item.rarity === "Legendary") rarityColor = "#ff5500";

      // 取得對應食物的圖片 icon
      let imageSrc = "";
      if (tabId === "weapons") {
        imageSrc = "assets/ketchup_bottle.jpg";
      } else if (tabId === "defense") {
        if (item.type === "melee") {
          imageSrc = "assets/salmon_sashimi.jpg";
        } else {
          imageSrc = "assets/slice_toast.jpg";
        }
      } else if (tabId === "explosives") {
        imageSrc = "assets/white_mantou.jpg";
      } else {
        // skins
        imageSrc = "assets/boba_tea.jpg";
      }

      card.innerHTML = `
        <div class="card-top">
          <span class="card-rarity-dot" style="background-color: ${rarityColor}"></span>
          <span class="card-unlocked-status">${isUnlocked ? 'UNLOCKED' : 'LOCKED'}</span>
        </div>
        <div class="card-icon-container" style="height: 80px; display: flex; justify-content: center; align-items: center;">
          <img class="store-item-image" src="${imageSrc}" style="width: 72px; height: 72px; object-fit: contain; border-radius: 6px; transition: transform 0.2s ease;">
        </div>
        <div class="card-name" style="margin-top: 6px; font-weight: 700;">${item.name.split(" (")[0]}</div>
        <div class="card-price ${item.price === 0 ? 'free' : ''}">
          ${item.price === 0 ? 'FREE' : `${item.price} CR`}
        </div>
      `;

      card.addEventListener("click", () => this.selectStoreItem(item.id));
      grid.appendChild(card);
    });

    // 預設選擇第一個
    if (items.length > 0) {
      this.selectStoreItem(items[0].id);
    }
  },
  // 選擇商店某一項目，展示於側欄
  selectStoreItem(itemId) {
    SoundFX.playHover();
    this.selectedItemId = itemId;

    // 更新 3D 預覽 (Roblox Rivals 風格)
    this.updateStore3DPreview(itemId);

    // 高亮對應卡片
    document.querySelectorAll(".store-card").forEach(c => {
      c.classList.remove("selected");
      if (c.dataset.id === itemId) c.classList.add("selected");
    });

    // 尋找物品資料
    let item = GUNFIGHT_DATA.weapons.find(w => w.id === itemId) ||
               GUNFIGHT_DATA.defense.find(d => d.id === itemId) ||
               GUNFIGHT_DATA.explosives.find(e => e.id === itemId) ||
               GUNFIGHT_DATA.skins.find(s => s.id === itemId);
    
    if (!item) return;

    const sbName = document.querySelector(".sidebar-name");
    const sbRarity = document.querySelector(".sidebar-rarity");
    const sbStats = document.querySelector(".sidebar-stats");
    const sbDesc = document.querySelector(".sidebar-desc");
    const sbAction = document.querySelector(".sidebar-action-container");

    sbName.textContent = item.name || item.name;
    sbRarity.className = `sidebar-rarity operator-rarity rarity-${item.rarity}`;
    sbRarity.textContent = item.rarity;
    sbDesc.textContent = item.desc;

    // 清空並重新渲染側欄數值進度條
    sbStats.innerHTML = "";
    if (item.type === "firearm") {
      sbStats.innerHTML = `
        <div class="stat-row">
          <div class="stat-label-container">
            <span>火力 DAMAGE</span>
            <span>${item.dmg}</span>
          </div>
          <div class="stat-bar-container">
            <div class="stat-bar-fill fill-dmg" style="width: ${Math.min(item.dmg, 100)}%"></div>
          </div>
        </div>
        <div class="stat-row">
          <div class="stat-label-container">
            <span>射速 FIRE RATE</span>
            <span>${(1000 / item.fr).toFixed(1)}發/秒</span>
          </div>
          <div class="stat-bar-container">
            <div class="stat-bar-fill fill-fr" style="width: ${Math.min(10000 / item.fr, 100)}%"></div>
          </div>
        </div>
        <div class="stat-row">
          <div class="stat-label-container">
            <span>彈夾容量 CAPACITY</span>
            <span>${item.mag}</span>
          </div>
          <div class="stat-bar-container">
            <div class="stat-bar-fill" style="width: ${Math.min(item.mag * 2, 100)}%"></div>
          </div>
        </div>
      `;
    } else if (item.type === "armor") {
      sbStats.innerHTML = `
        <div class="stat-row">
          <div class="stat-label-container">
            <span>額外防護 ARMOR</span>
            <span>+${item.armorValue}</span>
          </div>
          <div class="stat-bar-container">
            <div class="stat-bar-fill" style="width: ${Math.min(item.armorValue / 2, 100)}%"></div>
          </div>
        </div>
      `;
    } else if (item.type === "melee") {
      sbStats.innerHTML = `
        <div class="stat-row">
          <div class="stat-label-container">
            <span>近身傷害 DAMAGE</span>
            <span>${item.dmg}</span>
          </div>
          <div class="stat-bar-container">
            <div class="stat-bar-fill fill-dmg" style="width: ${Math.min(item.dmg, 100)}%"></div>
          </div>
        </div>
        <div class="stat-row">
          <div class="stat-label-container">
            <span>揮刀間隔 SPEED</span>
            <span>${item.fr}ms</span>
          </div>
          <div class="stat-bar-container">
            <div class="stat-bar-fill fill-fr" style="width: ${Math.min(10000 / item.fr, 100)}%"></div>
          </div>
        </div>
      `;
    } else if (item.type === "explosive") {
      sbStats.innerHTML = `
        <div class="stat-row">
          <div class="stat-label-container">
            <span>爆炸威力 DAMAGE</span>
            <span>${item.dmg}</span>
          </div>
          <div class="stat-bar-container">
            <div class="stat-bar-fill fill-dmg" style="width: ${Math.min(item.dmg / 2, 100)}%"></div>
          </div>
        </div>
        <div class="stat-row">
          <div class="stat-label-container">
            <span>影響範圍 RANGE</span>
            <span>${item.area}公尺</span>
          </div>
          <div class="stat-bar-container">
            <div class="stat-bar-fill" style="width: ${Math.min(item.area * 10, 100)}%"></div>
          </div>
        </div>
      `;
    }

    // 重新渲染購買與配備按鈕
    const isUnlocked = GameState.unlockedItems[item.id] || item.price === 0;
    
    let isEquipped = false;
    let equipSlot = "";
    if (this.currentTab === "weapons") {
      if (item.subType === "pistol") {
        isEquipped = GameState.loadout.secondary === item.id;
        equipSlot = "secondary";
      } else {
        isEquipped = GameState.loadout.primary === item.id;
        equipSlot = "primary";
      }
    } else if (this.currentTab === "defense") {
      if (item.type === "armor") {
        isEquipped = GameState.loadout.armor === item.id;
        equipSlot = "armor";
      } else {
        isEquipped = GameState.loadout.melee === item.id;
        equipSlot = "melee";
      }
    } else if (this.currentTab === "explosives") {
      isEquipped = GameState.loadout.explosive === item.id;
      equipSlot = "explosive";
    } else if (this.currentTab === "skins") {
      isEquipped = GameState.loadout.skin === item.id;
      equipSlot = "skin";
    }

    sbAction.innerHTML = "";
    if (isEquipped) {
      sbAction.innerHTML = `<button class="glow-btn purchase-btn" style="border-color: var(--neon-green); color: var(--neon-green);" disabled>已配備 EQUIPPED</button>`;
    } else if (isUnlocked) {
      const btn = document.createElement("button");
      btn.className = "glow-btn purchase-btn";
      btn.textContent = "配備到裝備欄 EQUIP";
      btn.addEventListener("click", () => this.equipItem(item.id, equipSlot));
      sbAction.appendChild(btn);
    } else {
      const btn = document.createElement("button");
      btn.className = "glow-btn purchase-btn";
      btn.style.borderColor = "var(--neon-orange)";
      btn.style.color = "var(--neon-orange)";
      
      const canAfford = GameState.cr >= item.price;
      btn.textContent = canAfford ? `購買 UNLOCK (${item.price} CR)` : `點數不足 LOCKED (${item.price} CR)`;
      if (!canAfford) btn.disabled = true;

      btn.addEventListener("click", () => this.purchaseItem(item.id, item.price));
      sbAction.appendChild(btn);
    }
  },

  // 購買物品
  purchaseItem(itemId, price) {
    if (GameState.cr >= price) {
      GameState.cr -= price;
      GameState.unlockedItems[itemId] = true;
      GameState.save();
      SoundFX.playBuy();
      
      this.renderStoreItems(this.currentTab);
      this.selectStoreItem(itemId);
    }
  },

  // 配備物品
  equipItem(itemId, slot) {
    GameState.loadout[slot] = itemId;
    GameState.save();
    SoundFX.playClick();
    
    this.renderStoreItems(this.currentTab);
    this.selectStoreItem(itemId);
  },

  // 渲染地圖選擇器
  renderMaps() {
    const grid = document.querySelector(".maps-grid");
    if (!grid) return;

    grid.innerHTML = "";
    
    GUNFIGHT_DATA.maps.forEach((map, index) => {
      const card = document.createElement("div");
      card.className = `map-card ${index === 0 ? 'selected' : ''}`;
      card.dataset.id = map.id;
      card.style.setProperty("--theme-color", map.theme);

      let riskColor = "var(--cyan)";
      if (map.risk.includes("高風險")) riskColor = "var(--neon-red)";
      else if (map.risk.includes("中風險")) riskColor = "var(--neon-orange)";
      else if (map.risk.includes("低風險")) riskColor = "var(--neon-green)";

      card.innerHTML = `
        <div class="map-risk" style="color: ${riskColor}">${map.risk}</div>
        <div class="map-name" style="text-shadow: 0 0 10px ${map.theme}40">${map.name}</div>
        <div class="map-desc">${map.desc}</div>
      `;

      card.addEventListener("click", (e) => {
        SoundFX.playHover();
        document.querySelectorAll(".map-card").forEach(c => c.classList.remove("selected"));
        card.classList.add("selected");
      });

      grid.appendChild(card);
    });
  },

  // 顯示戰績統計
  renderStats() {
    const s = GameState.stats;
    const kd = s.deaths > 0 ? (s.kills / s.deaths).toFixed(2) : s.kills.toFixed(2);
    const winRate = s.matchesPlayed > 0 ? ((s.matchesWon / s.matchesPlayed) * 100).toFixed(0) : "0";
    const avgAccuracy = s.accuracyCount > 0 ? (s.accuracyTotal / s.accuracyCount).toFixed(1) : "0";

    const statsScreen = document.getElementById("stats-screen");
    if (!statsScreen) return;

    const statsCard = statsScreen.querySelector(".stats-card");
    if (!statsCard) return;

    statsCard.innerHTML = `
      <div class="stats-section-title">戰術生涯總覽</div>
      <div class="stats-grid-2x2">
        <div class="result-stat-box">
          <span class="result-stat-label">出擊次數 MATCHES</span>
          <span class="stats-large-num">${s.matchesPlayed}</span>
        </div>
        <div class="result-stat-box">
          <span class="result-stat-label">勝率 WIN RATE</span>
          <span class="stats-large-num green-t">${winRate}%</span>
        </div>
        <div class="result-stat-box">
          <span class="result-stat-label">K/D 擊殺比</span>
          <span class="stats-large-num cyan-t">${kd}</span>
        </div>
        <div class="result-stat-box">
          <span class="result-stat-label">平均射擊命中率 ACCURACY</span>
          <span class="stats-large-num cyan-t">${avgAccuracy}%</span>
        </div>
      </div>

      <div class="stats-section-title" style="margin-top: 20px;">戰鬥表現細節</div>
      <div style="display: flex; flex-direction: column; gap: 10px;">
        <div style="display: flex; justify-content: space-between; font-size: 14px; border-bottom: 1px dashed rgba(255,255,255,0.05); padding-bottom: 5px;">
          <span>戰場總擊殺數 (Kills)</span>
          <span style="font-family: var(--font-mono); font-weight: 700;">${s.kills} 次</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 14px; border-bottom: 1px dashed rgba(255,255,255,0.05); padding-bottom: 5px;">
          <span>戰場陣亡數 (Deaths)</span>
          <span style="font-family: var(--font-mono); font-weight: 700;">${s.deaths} 次</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 14px; border-bottom: 1px dashed rgba(255,255,255,0.05); padding-bottom: 5px;">
          <span>靶場擊破標靶 (Targets Hit)</span>
          <span style="font-family: var(--font-mono); font-weight: 700;">${s.targetsHit} 個</span>
        </div>
        <div style="display: flex; justify-content: space-between; font-size: 14px; border-bottom: 1px dashed rgba(255,255,255,0.05); padding-bottom: 5px;">
          <span>訓練用 AI 擊殺 (Bot Kills)</span>
          <span style="font-family: var(--font-mono); font-weight: 700;">${s.botKills} 隻</span>
        </div>
      </div>
    `;
  }
};

window.addEventListener("DOMContentLoaded", () => {
  AppUI.init();
});
