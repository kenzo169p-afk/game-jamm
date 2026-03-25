// Game Engine for Legado Verde
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// UI Elements
const uiTimeLeft = document.getElementById("time-left");
const uiMonthText = document.getElementById("month-text");
const uiSeedCount = document.getElementById("seed-count");
const uiToolCount = document.getElementById("tool-count");
const startScreen = document.getElementById("start-screen");
const startBtn = document.getElementById("start-btn");
const menuOverlay = document.getElementById("menu-overlay");
const pauseBtn = document.getElementById("pause-btn");
const menuBtn = document.getElementById("menu-btn");
const resumeBtn = document.getElementById("resume-btn");
const resetBtn = document.getElementById("reset-btn");
const objectivesBtn = document.getElementById("objectives-btn");
const objectivesOverlay = document.getElementById("objectives-overlay");
const objectivesBackBtn = document.getElementById("objectives-back-btn");
const uiPlayerTitle = document.getElementById("player-title");
const uiTreesCount = document.getElementById("trees-count");
const uiCoinCount = document.getElementById("coin-count");
const shopBtn = document.getElementById("shop-btn");
const shopOverlay = document.getElementById("shop-overlay");
const shopBackBtn = document.getElementById("shop-back-btn");

const inventoryBtn = document.getElementById("inventory-btn");
const inventoryOverlay = document.getElementById("inventory-overlay");
const inventoryBackBtn = document.getElementById("inventory-back-btn");
const inventoryGrid = document.getElementById("inventory-grid");

const dialogueBox = document.getElementById("dialogue-box");
const dialogueText = document.getElementById("dialogue-text");
const dialogueNextBtn = document.getElementById("dialogue-next");
const hotbarSlots = document.querySelectorAll(".hotbar-slot");

// Game State
let gameState = {
    isRunning: false,
    currentMap: 1, // 1 to 5
    totalRealTimeMs: 3 * 60 * 60 * 1000, 
    elapsedRealTimeMs: 0,
    lastSavedTime: Date.now(),
    inventory: {
        slots: new Array(20).fill(null),
        coins: 100
    },
    shop: {
        stock: { tree: 15, wheat: 15, watermelon: 15, apple: 15 },
        lastRefresh: Date.now()
    },
    timers: {
        coinGrant: 0, // ms
    },
    selectedSlot: 0, // 0 to 4 (hotbar)
    player: {
        x: 50, // Posição segura no banco esquerdo
        y: 300,
        speed: 3,
        width: 30,
        height: 30,
        hunger: 100,
        thirst: 100,
        energy: 100
    },
    flora: [], // trees/seeds planted
    tilledSpots: [], // Coordenadas do solo preparado
    isDay: true,
    config: {
        controls: {
            up: ["ArrowUp", "w"],
            down: ["ArrowDown", "s"],
            left: ["ArrowLeft", "a"],
            right: ["ArrowRight", "d"]
        }
    },
    dialogueQueue: []
};

// INITIAL INVENTORY
gameState.inventory.slots[0] = { type: "hoe", count: 1 };
gameState.inventory.slots[1] = { type: "seed_tree", count: 10 };
gameState.inventory.slots[2] = { type: "seed_wheat", count: 0 };
gameState.inventory.slots[3] = { type: "seed_watermelon", count: 0 };
gameState.inventory.slots[4] = { type: "seed_apple", count: 0 };
gameState.inventory.slots[5] = { type: "bucket_empty", count: 1 };

// Coordenadas fixas para o Rio e Ponte (350 a 450 é rio)
const RIVERS = [{ x: 350, y: 0, width: 100, height: 600 }];
const BRIDGES = [{ x: 350, y: 220, width: 100, height: 80 }]; // Ponte maior e mais centralizada

// Maps config
const maps = [
    { id: 1, name: "Mata Atlântica", month: 1, objective: "Plantar Árvores", type: "plant", target: 20, color: "#27ae60" },
    { id: 2, name: "Amazônia", month: 2, objective: "Expandir Reflorestamento", type: "plant", target: 25, color: "#1e8449" },
    { id: 3, name: "Cerrado", month: 3, objective: "Preservar Bioma", type: "plant", target: 30, color: "#d35400" },
    { id: 4, name: "Pantanal", month: 4, objective: "Restaurar Áreas", type: "plant", target: 35, color: "#2980b9" },
    { id: 5, name: "Caatinga", month: 5, objective: "Salvar Solo", type: "plant", target: 40, color: "#e67e22" },
];

// Input handling
const keys = {};
window.addEventListener("keyup", (e) => {
    keys[e.key] = false;
});
dialogueNextBtn.addEventListener("click", advanceDialogue);

const fullscreenBtn = document.getElementById("fullscreen-btn");
fullscreenBtn.addEventListener("click", () => {
    const container = document.getElementById("game-container");
    if (!document.fullscreenElement) {
        container.requestFullscreen().catch(err => {
            alert(`Erro ao entrar em tela cheia: ${err.message}`);
        });
    } else {
        document.exitFullscreen();
    }
});

// Control Buttons
pauseBtn.addEventListener("click", togglePause);
menuBtn.addEventListener("click", () => {
    if (gameState.isRunning) togglePause();
    menuOverlay.classList.remove("hidden");
});
resumeBtn.addEventListener("click", () => {
    menuOverlay.classList.add("hidden");
    if (!gameState.isRunning) togglePause();
});
objectivesBtn.addEventListener("click", () => {
    updateObjectivesUI();
    menuOverlay.classList.add("hidden");
    objectivesOverlay.classList.remove("hidden");
});
objectivesBackBtn.addEventListener("click", () => {
    objectivesOverlay.classList.add("hidden");
    menuOverlay.classList.remove("hidden");
});
// Credits Logic
const creditsBtn = document.getElementById("credits-btn");
const creditsOverlay = document.getElementById("credits-overlay");
const creditsBackBtn = document.getElementById("credits-back-btn");

creditsBtn.addEventListener("click", () => {
    menuOverlay.classList.add("hidden");
    creditsOverlay.classList.remove("hidden");
});

creditsBackBtn.addEventListener("click", () => {
    creditsOverlay.classList.add("hidden");
    menuOverlay.classList.remove("hidden");
});

// Controls Remapping Logic
const configControlsBtn = document.getElementById("config-controls-btn");
const controlsOverlay = document.getElementById("controls-overlay");
const controlsBackBtn = document.getElementById("controls-back-btn");
const keyBindBtns = document.querySelectorAll(".key-bind");
let bindingAction = null;

configControlsBtn.addEventListener("click", () => {
    menuOverlay.classList.add("hidden");
    controlsOverlay.classList.remove("hidden");
    updateControlsUI();
});

controlsBackBtn.addEventListener("click", () => {
    controlsOverlay.classList.add("hidden");
    menuOverlay.classList.remove("hidden");
    saveProgress();
});

function updateControlsUI() {
    keyBindBtns.forEach(btn => {
        const action = btn.dataset.action;
        const keys = gameState.config.controls[action];
        btn.innerText = keys.join(" / ").toUpperCase();
    });
}

keyBindBtns.forEach(btn => {
    btn.addEventListener("click", () => {
        keyBindBtns.forEach(b => b.classList.remove("active"));
        if (bindingAction === btn.dataset.action) {
            bindingAction = null;
        } else {
            btn.classList.add("active");
            bindingAction = btn.dataset.action;
            btn.innerText = "... pressione uma tecla ...";
        }
    });
});

window.addEventListener("keydown", (e) => {
    if (bindingAction) {
        e.preventDefault();
        // Evita duplicatas se já for a mesma tecla ou trocar se for nova
        if (!gameState.config.controls[bindingAction].includes(e.key)) {
            // Se já tiver 2 teclas, remove a primeira e coloca a nova, ou custom de 1
            gameState.config.controls[bindingAction] = [e.key];
        }
        bindingAction = null;
        updateControlsUI();
        saveProgress();
    }
    
    // Antigo input handling (keep existing)
    keys[e.key] = true;
    if(e.key === " " && !dialogueBox.classList.contains("hidden")) {
        advanceDialogue();
    }
});

// Reset progress button
resetBtn.addEventListener("click", () => {
    if(confirm("Tem certeza que deseja resetar todo o seu progresso? Isso não pode ser desfeito.")) {
        localStorage.removeItem("legadoVerdeSave");
        location.reload();
    }
});

// Inventory controls
inventoryBtn.addEventListener("click", () => {
    if (gameState.isRunning) togglePause();
    inventoryOverlay.classList.remove("hidden");
    updateInventoryUI();
});
inventoryBackBtn.addEventListener("click", () => {
    inventoryOverlay.classList.add("hidden");
    if (!gameState.isRunning) togglePause();
});

// Shop controls
shopBtn.addEventListener("click", () => {
    if (gameState.isRunning) togglePause();
    shopOverlay.classList.remove("hidden");
    updateShopUI();
});
shopBackBtn.addEventListener("click", () => {
    shopOverlay.classList.add("hidden");
    if (!gameState.isRunning) togglePause();
});

// Hotbar selection
hotbarSlots.forEach(slot => {
    slot.addEventListener("click", () => {
        const slotIdx = parseInt(slot.dataset.slot);
        const item = gameState.inventory.slots[slotIdx];
        
        // Se já estiver selecionado ou for comida/balde com água, tenta consumir primeiro
        if (gameState.selectedSlot === slotIdx && item && (item.type.startsWith("fruit_") || item.type === "bucket_water")) {
            if (handleConsumption(slotIdx)) return;
        }

        hotbarSlots.forEach(s => s.classList.remove("active"));
        slot.classList.add("active");
        gameState.selectedSlot = slotIdx;
    });
});

function togglePause() {
    gameState.isRunning = !gameState.isRunning;
    if (gameState.isRunning) {
        gameState.lastSavedTime = Date.now();
        pauseBtn.innerText = "Pausar";
        requestAnimationFrame(gameLoop);
    } else {
        pauseBtn.innerText = "Retomar";
    }
}

// Start game
startBtn.addEventListener("click", () => {
    startScreen.classList.add("hidden");
    loadProgress();
    if(gameState.elapsedRealTimeMs === 0) {
        showDialogue([
            "Pai... Eu prometo que vou continuar o seu trabalho.",
            "Diário de Campo - Rafael Rossetti: A Mata Atlântica precisa de nós.",
            "Evite a erosão plantando mudas nas encostas. O Mico-leão-dourado depende disso."
        ]);
    }
    gameState.isRunning = true;
    gameState.lastSavedTime = Date.now();
    requestAnimationFrame(gameLoop);
});

// Dialogue system
function showDialogue(texts) {
    gameState.dialogueQueue = texts;
    if(gameState.dialogueQueue.length > 0) {
        dialogueBox.classList.remove("hidden");
        dialogueText.innerText = gameState.dialogueQueue[0];
        dialogueNextBtn.classList.remove("hidden");
    }
}
function advanceDialogue() {
    gameState.dialogueQueue.shift();
    if(gameState.dialogueQueue.length > 0) {
        dialogueText.innerText = gameState.dialogueQueue[0];
    } else {
        dialogueBox.classList.add("hidden");
        dialogueNextBtn.classList.add("hidden");
    }
}

// Time System
function formatTime(ms) {
    let totalSeconds = Math.floor(ms / 1000);
    let hours = Math.floor(totalSeconds / 3600);
    let minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${hours}h ${minutes < 10 ? '0' : ''}${minutes}m`;
}
function updateTime() {
    if(!gameState.isRunning) return;
    const now = Date.now();
    const dtReal = now - gameState.lastSavedTime;
    gameState.elapsedRealTimeMs += dtReal;
    gameState.lastSavedTime = now;
    
    // Ciclo Dia/Noite (60 min total)
    const cycleTime = 60 * 60 * 1000; 
    const cyclePos = gameState.elapsedRealTimeMs % cycleTime;
    gameState.isDay = cyclePos < cycleTime / 2; // Primeiros 30 min = Dia
    
    // Atualiza crescimento da Flora (baseado em pontos acumulados)
    const growthMult = gameState.isDay ? 2 : 1;
    gameState.flora.forEach(f => {
        if (!f.growthPoints) f.growthPoints = 0;
        if (f.growthPoints < 1200000) { // 20 min base = 1,200,000 ms
            f.growthPoints += (dtReal * growthMult);
        }
    });

    if(Math.random() < 0.05) saveProgress();
    gameState.timers.coinGrant += dtReal;
    if (gameState.timers.coinGrant >= 30000) {
        gameState.inventory.coins += 10;
        gameState.timers.coinGrant = 0;
        updateUI();
    }

    // Shop refresh (5 min) - reseta o estoque para 15 a cada 5 minutos de tempo real
    const nowReal = Date.now();
    if (nowReal - gameState.shop.lastRefresh >= 5 * 60 * 1000) {
        gameState.shop.stock = { tree: 15, wheat: 15, watermelon: 15, apple: 15 };
        gameState.shop.lastRefresh = nowReal;
        updateShopUI();
    }

    const currentMap = maps[gameState.currentMap - 1];
    if(getProgress(currentMap) >= currentMap.target && gameState.currentMap < maps.length) {
        nextMap();
    }
    const progressLimit = gameState.elapsedRealTimeMs / gameState.totalRealTimeMs;
    let currentMonth = Math.floor(progressLimit * 6) + 1;
    if (currentMonth > 6) currentMonth = 6;
    uiMonthText.innerText = `Mês ${currentMonth}`;
    uiTimeLeft.innerText = formatTime(gameState.totalRealTimeMs - gameState.elapsedRealTimeMs);
    
    // Sistema de Fome, Sede e Energia (Reduz gradualmente)
    const decayFactor = dtReal / (15 * 60 * 1000); 
    gameState.player.hunger = Math.max(0, gameState.player.hunger - (decayFactor * 100));
    gameState.player.thirst = Math.max(0, gameState.player.thirst - (decayFactor * 100));
    gameState.player.energy = Math.max(0, gameState.player.energy - (decayFactor * 80));

    // Penalidade de velocidade
    if (gameState.player.hunger <= 0 || gameState.player.thirst <= 0 || gameState.player.energy <= 0) {
        gameState.player.speed = 1.5;
    } else {
        gameState.player.speed = 3;
    }

    // Atualizar Barras de UI
    const hungerBar = document.getElementById("hunger-bar");
    const thirstBar = document.getElementById("thirst-bar");
    const energyBar = document.getElementById("energy-bar");
    if (hungerBar) hungerBar.style.width = gameState.player.hunger + "%";
    if (thirstBar) thirstBar.style.width = gameState.player.thirst + "%";
    if (energyBar) energyBar.style.width = gameState.player.energy + "%";

    // UI Dia/Noite
    const dayNightLabel = document.getElementById("day-night-label");
    if (dayNightLabel) {
        dayNightLabel.innerText = gameState.isDay ? "🌞 Dia (2x Crescimento)" : "🌙 Noite (1x Crescimento)";
        dayNightLabel.style.color = gameState.isDay ? "#f1c40f" : "#3498db";
    }
}

function updateUI() {
    uiCoinCount.innerText = gameState.inventory.coins;
    const shopBalance = document.getElementById("shop-coin-count");
    if (shopBalance) shopBalance.innerText = gameState.inventory.coins;
    let totalSeeds = 0;
    gameState.inventory.slots.forEach(s => { if (s && s.type.startsWith("seed_")) totalSeeds += s.count; });
    uiSeedCount.innerText = totalSeeds;
    let totalTools = 0;
    gameState.inventory.slots.forEach(s => { if (s && !s.type.startsWith("seed_")) totalTools += s.count; });
    uiToolCount.innerText = totalTools;
    updateHotbar();
}

function updateHotbar() {
    hotbarSlots.forEach((slot, i) => {
        const item = gameState.inventory.slots[i];
        if (item) {
            slot.innerHTML = getItemEmoji(item.type) + ` <span class="badge">${item.count > 1 || item.type.startsWith("seed_") ? item.count : i+1}</span>`;
        } else {
            slot.innerHTML = `<span class="badge">${i+1}</span>`;
        }
    });
}

function updateInventoryUI() {
    inventoryGrid.innerHTML = "";
    gameState.inventory.slots.forEach((item, i) => {
        const slotDiv = document.createElement("div");
        slotDiv.className = "inventory-slot" + (item ? "" : " empty");
        if (item) {
            slotDiv.innerHTML = getItemEmoji(item.type);
            if (item.count > 1 || item.type.startsWith("seed_")) {
                slotDiv.innerHTML += `<span class="slot-count">${item.count}</span>`;
            }
        }
        inventoryGrid.appendChild(slotDiv);
    });
    document.getElementById("inventory-count").innerText = gameState.inventory.slots.filter(s => s !== null).length;
    syncShopPreview();
}

function getItemEmoji(type) {
    switch(type) {
        case "hoe": return "⛏️";
        case "seed_tree": return "🌳";
        case "seed_wheat": return "🌾";
        case "seed_watermelon": return "🍉";
        case "seed_apple": return "🍎";
        case "fruit_apple": return "🍎";
        case "fruit_watermelon": return "🍉";
        case "fruit_wheat": return "🍞";
        case "bucket_empty": return "🪣";
        case "bucket_water": return "💧🪣";
        default: return "❓";
    }
}

function handleConsumption(slotIdx) {
    const item = gameState.inventory.slots[slotIdx];
    if (!item) return false;

    let restored = "";
    if (item.type === "fruit_apple") {
        gameState.player.hunger = Math.min(100, gameState.player.hunger + 25);
        item.count--;
        restored = "Fome";
    } else if (item.type === "fruit_watermelon") {
        gameState.player.hunger = Math.min(100, gameState.player.hunger + 15);
        gameState.player.thirst = Math.min(100, gameState.player.thirst + 30);
        item.count--;
        restored = "Fome e Sede";
    } else if (item.type === "fruit_wheat") {
        gameState.player.hunger = Math.min(100, gameState.player.hunger + 15);
        item.count--;
        restored = "Fome";
    } else if (item.type === "bucket_water") {
        gameState.player.thirst = Math.min(100, gameState.player.thirst + 45);
        item.type = "bucket_empty";
        restored = "Sede";
    } else {
        return false;
    }

    if (item.count <= 0 && item.type !== "bucket_empty") {
        gameState.inventory.slots[slotIdx] = null;
    }
    
    showDialogue(["Você consumiu o item e recuperou " + restored + "!"]);
    updateUI();
    saveProgress();
    return true;
}

// Interação com o Rio (Pegar água com balde ou beber)
function interactWithRiver(x, y, item) {
    let atRiver = false;
    RIVERS.forEach(r => {
        if (x >= r.x && x <= r.x + r.width) atRiver = true;
    });

    if (atRiver) {
        if (item && item.type === "bucket_empty") {
            item.type = "bucket_water";
            showDialogue(["Balde cheio de água fresquinha!"]);
            updateUI();
            return true;
        } else if (!item || item.type === "hoe") {
            // Beber direto (opcional, mas o user pediu o balde pra pegar água)
            gameState.player.thirst = Math.min(100, gameState.player.thirst + 5);
            updateUI();
            return true;
        }
    }
    return false;
}

function syncShopPreview() {
    ["tree", "wheat", "watermelon", "apple"].forEach(t => {
        const el = document.getElementById("inv-" + t);
        if (el) {
            let count = 0;
            gameState.inventory.slots.forEach(s => { if(s && s.type === "seed_" + t) count += s.count; });
            el.innerText = count;
        }
    });
}

function updateShopUI() {
    ["tree", "wheat", "watermelon", "apple"].forEach(t => {
        const el = document.getElementById("stock-" + t);
        if (el) el.innerText = gameState.shop.stock[t];
    });
    syncShopPreview();
    const btns = document.querySelectorAll(".buy-btn");
    btns.forEach(btn => {
        const type = btn.closest(".shop-item-card").dataset.seed;
        const price = parseInt(btn.closest(".shop-item-card").querySelector(".price").innerText.match(/\d+/)[0]);
        btn.disabled = (gameState.shop.stock[type] <= 0 || gameState.inventory.coins < price);
    });
}

function buySeed(type, price) {
    if (gameState.inventory.coins >= price && gameState.shop.stock[type] > 0) {
        if (addItemToInventory("seed_" + type, 1)) {
            gameState.inventory.coins -= price;
            gameState.shop.stock[type]--;
            updateUI();
            updateShopUI();
            saveProgress();
        } else {
            showDialogue(["Sua mochila está cheia! Libere espaço primeiro."]);
        }
    }
}
function addItemToInventory(type, count) {
    let stack = gameState.inventory.slots.find(s => s && s.type === type);
    if (stack) { stack.count += count; return true; }
    let emptyIdx = gameState.inventory.slots.indexOf(null);
    if (emptyIdx !== -1) { gameState.inventory.slots[emptyIdx] = { type, count }; return true; }
    return false;
}
function buyItem(type, price) {
    if (gameState.inventory.coins >= price) {
        if (addItemToInventory(type, 1)) {
            gameState.inventory.coins -= price;
            updateUI();
            updateShopUI();
            saveProgress();
        } else {
            showDialogue(["Sua mochila está cheia!"]);
        }
    }
}
window.buySeed = buySeed;
window.buyItem = buyItem;

function getProgress(map) {
    if(!map) return 0;
    return gameState.flora.filter(f => (Date.now() - f.plantedAt) >= (20 * 60 * 1000)).length;
}

function nextMap() {
    gameState.currentMap++;
    gameState.elapsedRealTimeMs = 0;
    gameState.flora = [];
    saveProgress();
    showDialogue([
        `Parabéns João! Você completou a missão na ${maps[gameState.currentMap - 2].name}.`,
        `Bem vindo à ${maps[gameState.currentMap - 1].name}.`,
        `Novo objetivo: ${maps[gameState.currentMap - 1].objective}.`
    ]);
}

function updateObjectivesUI() {
    const currentMap = maps[gameState.currentMap - 1];
    const progress = getProgress(currentMap);
    uiTreesCount.innerText = progress;
    document.querySelector("#objectives-list p:nth-child(2)").innerHTML = `${currentMap.objective}: <span id="trees-count">${progress}</span> / ${currentMap.target}`;
    let title = "Visitante";
    if (progress >= currentMap.target) title = "Profissional";
    else if (progress >= Math.floor(currentMap.target * 0.6)) title = "Semi Profissional";
    else if (progress >= Math.floor(currentMap.target * 0.25)) title = "Iniciante";
    uiPlayerTitle.innerText = title;
}

function saveProgress() {
    localStorage.setItem("legadoVerdeSave", JSON.stringify(gameState));
}
function loadProgress() {
    const saved = localStorage.getItem("legadoVerdeSave");
    if(saved) {
        const parsed = JSON.parse(saved);
        // Migração para novos campos
        if(parsed.flora) {
            parsed.flora.forEach(f => {
                if(f.growthPoints === undefined) {
                    // Se estiver migrando de save antigo, calcula pontos baseados no tempo já passado
                    const baseGrowth = Date.now() - f.plantedAt;
                    f.growthPoints = Math.min(1200000, baseGrowth);
                }
            });
        }
        if(parsed.inventory && !parsed.inventory.slots) {
            const oldSeeds = parsed.inventory.seeds || { tree: 10, wheat: 0, watermelon: 0, apple: 0 };
            parsed.inventory = { slots: new Array(20).fill(null), coins: parsed.inventory.coins || 100 };
            parsed.inventory.slots[0] = { type: "hoe", count: 1 };
            parsed.inventory.slots[1] = { type: "seed_tree", count: oldSeeds.tree };
            parsed.inventory.slots[2] = { type: "seed_wheat", count: oldSeeds.wheat };
            parsed.inventory.slots[3] = { type: "seed_watermelon", count: oldSeeds.watermelon };
            parsed.inventory.slots[4] = { type: "seed_apple", count: oldSeeds.apple };
        }
        gameState = { ...gameState, ...parsed, isRunning: false };
        
        // FORÇAR nascimento fora do rio se estiver em área de perigo
        if (gameState.player.x + 30 > 350 && gameState.player.x < 450) {
            gameState.player.x = 50; 
            gameState.player.y = 300;
        }

        updateUI();
    }
}

function updatePlayer() {
    if(!dialogueBox.classList.contains("hidden")) return;
    const p = gameState.player;
    let moveX = 0;
    let moveY = 0;

    const ctrl = gameState.config.controls;
    if(ctrl.up.some(k => keys[k])) moveY -= 1;
    if(ctrl.down.some(k => keys[k])) moveY += 1;
    if(ctrl.left.some(k => keys[k])) moveX -= 1;
    if(ctrl.right.some(k => keys[k])) moveX += 1;

    // Normalizar velocidade na diagonal
    if (moveX !== 0 && moveY !== 0) {
        const normalizer = Math.SQRT2; // Math.sqrt(1*1 + 1*1)
        moveX /= normalizer;
        moveY /= normalizer;
    }

    let nextX = p.x + (moveX * p.speed);
    let nextY = p.y + (moveY * p.speed);

    // Boundaries
    nextX = Math.max(0, Math.min(canvas.width - p.width, nextX));
    nextY = Math.max(0, Math.min(canvas.height - p.height, nextY));

    // NOVA Lógica de Colisão de Terreno (Explícita)
    const riverStart = 350;
    const riverEnd = 450;
    const bridgeYStart = 220;
    const bridgeYEnd = 300;

    // Se o movimento for entrar no rio...
    if (nextX + p.width > riverStart && nextX < riverEnd) {
        // ...verifica se está dentro da área da ponte (permitido)
        const onBridge = (nextY + 5 >= bridgeYStart && nextY + p.height - 5 <= bridgeYEnd);
        
        if (!onBridge) {
            // Se NÃO estiver na ponte, impede a entrada no rio
            if (p.x <= riverStart) nextX = riverStart - p.width; // Trava no banco esquerdo
            else if (p.x >= riverEnd) nextX = riverEnd; // Trava no banco direito
            else {
                // Caso extremo (dentro da água): Cospe para fora
                nextX = (p.x < 400) ? 50 : 500;
            }
        }
    }

    // 3. Colisão com Árvores (Deslize suave)
    let collisionX = false;
    let collisionY = false;
    const playerCenterX = nextX + p.width / 2;
    const playerCenterY = nextY + p.height / 2;

    gameState.flora.forEach(f => {
        // Colidir apenas com tipos que são árvores (Tree e Apple)
        if (f.type === "tree" || f.type === "apple") {
            // Checar colisão no eixo X (mantendo Y atual)
            const distXPermanentY = Math.sqrt((playerCenterX - f.x)**2 + (p.y + p.height/2 - f.y)**2);
            if (distXPermanentY < 20) collisionX = true;
            
            // Checar colisão no eixo Y (mantendo X atual)
            const distYPermanentX = Math.sqrt((p.x + p.width/2 - f.x)**2 + (playerCenterY - f.y)**2);
            if (distYPermanentX < 20) collisionY = true;
        }
    });

    if (!collisionX) p.x = nextX;
    if (!collisionY) p.y = nextY;
}

function draw() {
    const mapInfo = maps[gameState.currentMap - 1];
    ctx.fillStyle = mapInfo.color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#3498db";
    RIVERS.forEach(r => {
        ctx.fillRect(r.x, r.y, r.width, r.height);
        ctx.strokeStyle = "rgba(255,255,255,0.3)";
        ctx.setLineDash([10, 10]);
        ctx.beginPath(); ctx.moveTo(r.x + 20, r.y); ctx.lineTo(r.x + 20, r.y + r.height); ctx.stroke();
        ctx.setLineDash([]);
    });
    // Draw Bridges (Skin nova com bordas pretas)
    BRIDGES.forEach(b => {
        // Fundo da madeira (Marrom claro)
        ctx.fillStyle = "#8b4513";
        ctx.fillRect(b.x, b.y, b.width, b.height);
        
        // Pranchas verticais (conforme imagem)
        ctx.strokeStyle = "rgba(0,0,0,0.3)";
        ctx.lineWidth = 1;
        for (let bx = b.x + 5; bx < b.x + b.width; bx += 5) {
            ctx.beginPath();
            ctx.moveTo(bx, b.y);
            ctx.lineTo(bx, b.y + b.height);
            ctx.stroke();
        }

        // Bordas pretas reforçadas (Cima e Baixo)
        ctx.fillStyle = "#000000";
        ctx.fillRect(b.x, b.y - 2, b.width, 5); // Borda superior
        ctx.fillRect(b.x, b.y + b.height - 3, b.width, 5); // Borda inferior
    });
    // Draw Tilled Spots (Solo Arado)
    ctx.fillStyle = "#3d2b1f"; // Marrom bem escuro
    gameState.tilledSpots.forEach(s => {
        ctx.fillRect(s.x - 15, s.y - 10, 30, 20); // Mancha de terra
        // Detalhes de textura (pontos pretos)
        ctx.fillStyle = "rgba(0,0,0,0.2)";
        ctx.fillRect(s.x - 10, s.y - 5, 3, 3);
        ctx.fillRect(s.x + 8, s.y + 2, 3, 3);
        ctx.fillStyle = "#3d2b1f";
    });

    // --- DESENHAR BARRACA (CANTO ESQUERDO INFERIOR) ---
    const tx = 10, ty = 490, tw = 90, th = 90;
    // Base e cor principal (Vermelho)
    ctx.fillStyle = "#c0392b"; // Sombra
    ctx.beginPath();
    ctx.moveTo(tx, ty + th);
    ctx.quadraticCurveTo(tx + tw/2, ty - 20, tx + tw, ty + th);
    ctx.fill();
    
    ctx.fillStyle = "#e74c3c"; // Vermelho Brilhante
    ctx.beginPath();
    ctx.moveTo(tx + 5, ty + th);
    ctx.quadraticCurveTo(tx + tw/2, ty, tx + tw - 5, ty + th);
    ctx.fill();

    // Entrada (Porta Escura)
    ctx.fillStyle = "#2c3e50";
    ctx.beginPath();
    ctx.moveTo(tx + tw/2 - 20, ty + th);
    ctx.lineTo(tx + tw/2, ty + 35);
    ctx.lineTo(tx + tw/2 + 20, ty + th);
    ctx.closePath();
    ctx.fill();

    // Detalhes de Pixel Art (Luzes)
    ctx.fillStyle = "#ff7675";
    ctx.fillRect(tx + 25, ty + 20, 10, 5);
    ctx.fillRect(tx + 60, ty + 40, 5, 10);

    // Draw Flora (Árvores e Plantas)
    const growthDelay = 1200000; // 20 min
    gameState.flora.forEach(f => {
        const growthProgress = Math.min(1, (f.growthPoints || 0) / growthDelay);
        const radius = 5 + (growthProgress * 15);
        if (f.type === "tree") {
            if (growthProgress >= 1) {
                // Tronco (Artesanal baseando na imagem)
                ctx.fillStyle = "#5d4037";
                ctx.fillRect(f.x - 4, f.y, 8, 12); // Tronco principal
                ctx.fillRect(f.x - 8, f.y + 8, 16, 4); // Base
                ctx.fillStyle = "#3d2b1f";
                ctx.fillRect(f.x - 10, f.y + 10, 20, 2); // Raízes
                
                // Copa (Verde)
                ctx.fillStyle = "#32CD32"; // Verde borda
                ctx.fillRect(f.x - 15, f.y - 18, 30, 20); // Massa principal
                ctx.fillStyle = "#7CFC00"; // Verde claro
                ctx.fillRect(f.x - 12, f.y - 16, 24, 16);
                
                // Detalhes da copa (Pixel art feel)
                ctx.fillStyle = "#32CD32";
                ctx.fillRect(f.x - 18, f.y - 12, 4, 8);
                ctx.fillRect(f.x + 14, f.y - 12, 4, 8);
                ctx.fillRect(f.x - 8, f.y - 20, 16, 4);
            } else {
                // Mudinha crescendo
                ctx.fillStyle = "#8d6e63";
                ctx.fillRect(f.x - 2, f.y - (radius/2), 4, radius);
                ctx.fillStyle = "#32CD32";
                ctx.fillRect(f.x - 4, f.y - radius, 8, 4);
            }
        } else if (f.type === "apple" && growthProgress >= 1) {
            // Macieira Madura (Pixel Art baseada na skin personalizada)
            // Tronco grosso com oco
            ctx.fillStyle = "#5d4037";
            ctx.fillRect(f.x - 12, f.y, 24, 15); // Base larga
            ctx.fillRect(f.x - 6, f.y - 5, 12, 5); // Tronco subindo
            ctx.fillStyle = "#3d2b1f"; // Buraco no tronco (Oco)
            ctx.fillRect(f.x - 3, f.y + 2, 6, 8);
            
            // Copa (Verde)
            ctx.fillStyle = "#32CD32";
            ctx.fillRect(f.x - 18, f.y - 20, 36, 18);
            
            // Maçãs (Pontos vermelhos espalhados)
            ctx.fillStyle = "#e74c3c";
            const applePos = [
                [-12,-15], [-5,-18], [4,-14], [10,-17], 
                [-8,-10], [0,-12], [8,-9], [-15,-8]
            ];
            applePos.forEach(pos => {
                ctx.fillRect(f.x + pos[0], f.y + pos[1], 3, 3);
            });
        } else {
            // Outras plantas (Círculos coloridos atuais ou sementes)
            if (f.type === "wheat") ctx.fillStyle = growthProgress >= 1 ? "#f1c40f" : "#8d6e63";
            else if (f.type === "watermelon") ctx.fillStyle = growthProgress >= 1 ? "#2ecc71" : "#8d6e63";
            else if (f.type === "apple") ctx.fillStyle = growthProgress >= 1 ? "#e74c3c" : "#8d6e63";
            else ctx.fillStyle = growthProgress >= 1 ? "#145a32" : "#8d6e63";
            
            ctx.beginPath(); ctx.arc(f.x, f.y, radius, 0, Math.PI * 2); ctx.fill();
        }
        if(growthProgress < 1) {
            ctx.fillStyle = "white"; ctx.font = "10px Roboto";
            ctx.fillText(Math.floor(growthProgress * 100) + "%", f.x - 10, f.y - radius - 5);
        }
    });
    // Draw Player (Skin do João Guilherme)
    const p = gameState.player;
    const px = p.x;
    const py = p.y;
    const pw = p.width;
    const ph = p.height;

    // --- CABEÇA ---
    // Cabelo (Marrom)
    ctx.fillStyle = "#5d4037";
    ctx.fillRect(px + 2, py - 18, pw - 4, 12);
    
    // Rosto (Branco)
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(px + 4, py - 10, pw - 8, 14);
    
    // Olhos e Boca (Preto)
    ctx.fillStyle = "#000000";
    ctx.fillRect(px + 10, py - 6, 2, 4); // Olho esquerdo
    ctx.fillRect(px + 18, py - 6, 2, 4); // Olho direito
    ctx.fillRect(px + 10, py + 1, 10, 2); // Boca

    // Pescoço
    ctx.fillStyle = "#ffdbac";
    ctx.fillRect(px + pw/2 - 3, py + 4, 6, 4);

    // --- CORPO ---
    // Camiseta (Amarela)
    ctx.fillStyle = "#f1c40f";
    ctx.fillRect(px, py + 8, pw, 14);
    
    // Logo Planeta Terra (Preto borda + Azul/Verde dentro)
    ctx.fillStyle = "#000000";
    ctx.fillRect(px + 7, py + 10, 16, 10); // Borda
    
    ctx.fillStyle = "#3498db"; // Mar
    ctx.fillRect(px + 9, py + 11, 12, 8);
    ctx.fillStyle = "#2ecc71"; // Terra
    ctx.fillRect(px + 11, py + 13, 5, 4);
    ctx.fillRect(px + 16, py + 11, 3, 2);

    // Braços
    ctx.fillStyle = "#ffffff"; // Mangas brancas/pele dependendo da skin
    ctx.fillRect(px - 4, py + 8, 4, 10); // Braço esquerdo
    ctx.fillRect(px + pw, py + 8, 4, 10); // Braço direito
    ctx.fillStyle = "#000000"; // Mãos
    ctx.fillRect(px - 5, py + 18, 5, 4);
    ctx.fillRect(px + pw, py + 18, 5, 4);

    // --- PERNAS ---
    // Calças (Teal/Ciano)
    ctx.fillStyle = "#00bcd4";
    ctx.fillRect(px, py + 22, pw/2 - 1, 8); // Perna esquerda
    ctx.fillRect(px + pw/2 + 1, py + 22, pw/2 - 1, 8); // Perna direita
    
    // Sapatos (Preto)
    ctx.fillStyle = "#000000";
    ctx.fillRect(px - 1, py + 30, pw/2, 4);
    ctx.fillRect(px + pw/2 + 1, py + 30, pw/2, 4);

    // Efeito de Noite (Overlay azulado)
    if (!gameState.isDay) {
        ctx.fillStyle = "rgba(0, 0, 50, 0.4)";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
}

function gameLoop() {
    if(!gameState.isRunning) return;
    updatePlayer();
    updateTime();
    draw();
    requestAnimationFrame(gameLoop);
}

canvas.addEventListener("click", (e) => {
    if (dialogueBox && !dialogueBox.classList.contains("hidden")) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // 0. Interação com a BARRACA (Canto Inferior Esquerdo)
    const tx = 10, ty = 490, tw = 90, th = 90;
    if (x >= tx && x <= tx + tw && y >= ty && y <= ty + th) {
        // Verificar se o player está perto da barraca
        const distToTent = Math.sqrt(((gameState.player.x + 15) - (tx + tw/2))**2 + ((gameState.player.y + 15) - (ty + th/2))**2);
        
        if (distToTent > 150) {
            showDialogue(["Você está muito longe da barraca para dormir!"]);
            return;
        }

        if (!gameState.isDay) {
            gameState.player.energy = 100;
            // Pular 20 minutos (1,200,000 ms) do tempo total do mês
            const twentyMinutesMs = 20 * 60 * 1000;
            gameState.elapsedRealTimeMs += twentyMinutesMs;
            
            showDialogue(["Zzz... Você dormiu profundamente por algumas horas e pulou 20 minutos do mês!"]);
            updateUI(); 
            saveProgress();
        } else {
            showDialogue(["Ainda está dia! Volte para a barraca à noite para dormir."]);
        }
        return;
    }

    // 1. Tentar Colher Frutos Primeiro
    const harvestIdx = gameState.flora.findIndex(f => {
        const dist = Math.sqrt((f.x - x)**2 + (f.y - y)**2);
        const isGrown = f.growthPoints >= 1200000;
        return dist < 25 && isGrown && f.type !== "tree";
    });

    if (harvestIdx !== -1) {
        const f = gameState.flora[harvestIdx];
        if (addItemToInventory("fruit_" + f.type, 1)) {
            if (f.type === "apple") {
                f.growthPoints = 0; // Árvore de maçã fica, mas reinicia crescimento
            } else {
                gameState.flora.splice(harvestIdx, 1); // Trigo e melancia são removidos no colher
            }
            updateUI(); saveProgress();
            return;
        } else {
            showDialogue(["Mochila cheia! Não dá para colher."]);
            return;
        }
    }

    const slotInfo = gameState.inventory.slots[gameState.selectedSlot];
    
    // 2. Beber Água ou Encher Balde
    if (interactWithRiver(x, y, slotInfo)) return;

    if (!slotInfo) return;
    const itemType = slotInfo.type;

    // 3. Consumir Alimento (clicando em qualquer lugar do campo quando selecionado)
    if (itemType.startsWith("fruit_") || itemType === "bucket_water") {
        if (handleConsumption(gameState.selectedSlot)) return;
    }

    // 4. Lógica da Enxada (Hoe) - Prioritária
    if (itemType === "hoe") { 
        // Verificar se está tentando arar na água ou ponte
        let areaProibida = false;
        RIVERS.forEach(r => {
            if (x >= r.x && x <= r.x + r.width) areaProibida = true;
        });

        if (areaProibida) {
            showDialogue(["Você não pode arar a terra na água ou na ponte!"]);
            return;
        }

        // Adiciona solo arado
        gameState.tilledSpots.push({ x, y });
        if(gameState.tilledSpots.length > 100) gameState.tilledSpots.shift();
        
        updateUI(); 
        saveProgress();
        return; 
    }

    // Regras de Plantio
    let nearRiver = false;
    RIVERS.forEach(r => { if (x >= r.x - 60 && x <= r.x + r.width + 60) nearRiver = true; });

    if (!nearRiver && itemType !== "seed_tree" && itemType !== "seed_apple") {
        showDialogue(["Longe da água! Apenas árvores e macieiras podem crescer aqui."]);
        return;
    }
    
    if(itemType.startsWith("seed_")) {
        const tilledIdx = gameState.tilledSpots.findIndex(s => {
            const dist = Math.sqrt((s.x - x)**2 + (s.y - y)**2);
            return dist < 25;
        });

        if (tilledIdx === -1) {
            showDialogue(["O solo não foi preparado! Use a enxada para arar a terra primeiro."]);
            return;
        }

        if(slotInfo.count >= 1) {
            slotInfo.count--;
            const spot = gameState.tilledSpots[tilledIdx];
            gameState.flora.push({ 
                x: spot.x, 
                y: spot.y, 
                plantedAt: Date.now(), 
                growthPoints: 0,
                type: itemType.split("_")[1] 
            });
            gameState.tilledSpots.splice(tilledIdx, 1);
            updateUI(); 
            saveProgress();
        }
    }
});

updateUI();