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
    totalRealTimeMs: 5 * 60 * 60 * 1000, 
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
        x: 400,
        y: 300,
        speed: 3,
        width: 30,
        height: 30
    },
    flora: [], // trees/seeds planted
    dialogueQueue: []
};

// INITIAL INVENTORY
gameState.inventory.slots[0] = { type: "hoe", count: 1 };
gameState.inventory.slots[1] = { type: "seed_tree", count: 10 };
gameState.inventory.slots[2] = { type: "seed_wheat", count: 0 };
gameState.inventory.slots[3] = { type: "seed_watermelon", count: 0 };
gameState.inventory.slots[4] = { type: "seed_apple", count: 0 };

const RIVERS = [
    { x: 350, y: 0, width: 100, height: 600 } // Vertical river in center
];

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
window.addEventListener("keydown", (e) => {
    keys[e.key] = true;
    if(e.key === " " && !dialogueBox.classList.contains("hidden")) {
        advanceDialogue();
    }
});
window.addEventListener("keyup", (e) => {
    keys[e.key] = false;
});
dialogueNextBtn.addEventListener("click", advanceDialogue);

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
        hotbarSlots.forEach(s => s.classList.remove("active"));
        slot.classList.add("active");
        gameState.selectedSlot = parseInt(slot.dataset.slot);
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
    if(Math.random() < 0.05) saveProgress();
    gameState.timers.coinGrant += dtReal;
    if (gameState.timers.coinGrant >= 30000) {
        gameState.inventory.coins += 10;
        gameState.timers.coinGrant = 0;
        updateUI();
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
        default: return "❓";
    }
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
window.buySeed = buySeed;

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
        updateUI();
    }
}

function updatePlayer() {
    if(!dialogueBox.classList.contains("hidden")) return;
    const p = gameState.player;
    if(keys["ArrowUp"] || keys["w"]) p.y -= p.speed;
    if(keys["ArrowDown"] || keys["s"]) p.y += p.speed;
    if(keys["ArrowLeft"] || keys["a"]) p.x -= p.speed;
    if(keys["ArrowRight"] || keys["d"]) p.x += p.speed;
    p.x = Math.max(0, Math.min(canvas.width - p.width, p.x));
    p.y = Math.max(0, Math.min(canvas.height - p.height, p.y));
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
    const growthDelay = 20 * 60 * 1000;
    const now = Date.now();
    gameState.flora.forEach(f => {
        const elapsed = now - f.plantedAt;
        const growthProgress = Math.min(1, elapsed / growthDelay);
        const radius = 5 + (growthProgress * 15);
        if (f.type === "tree") ctx.fillStyle = growthProgress >= 1 ? "#06402B" : "#8d6e63";
        else if (f.type === "wheat") ctx.fillStyle = growthProgress >= 1 ? "#f1c40f" : "#8d6e63";
        else if (f.type === "watermelon") ctx.fillStyle = growthProgress >= 1 ? "#2ecc71" : "#8d6e63";
        else if (f.type === "apple") ctx.fillStyle = growthProgress >= 1 ? "#e74c3c" : "#8d6e63";
        else ctx.fillStyle = growthProgress >= 1 ? "#145a32" : "#8d6e63";
        ctx.beginPath(); ctx.arc(f.x, f.y, radius, 0, Math.PI * 2); ctx.fill();
        if(growthProgress < 1) {
            ctx.fillStyle = "white"; ctx.font = "10px Roboto";
            ctx.fillText(Math.floor(growthProgress * 100) + "%", f.x - 10, f.y - radius - 5);
        }
    });
    const p = gameState.player;
    ctx.fillStyle = "#ffdbac"; ctx.fillRect(p.x + 5, p.y - 10, p.width - 10, 15);
    ctx.fillStyle = "#3498db"; ctx.fillRect(p.x, p.y, p.width, p.height - 10);
    ctx.fillStyle = "#2ecc71"; ctx.beginPath(); ctx.arc(p.x + p.width/2, p.y + p.height/3, 5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#95a5a6"; ctx.fillRect(p.x, p.y + p.height - 10, p.width, 10);
    ctx.fillStyle = "#5d4037"; ctx.fillRect(p.x - 2, p.y + p.height, 12, 6); ctx.fillRect(p.x + p.width - 10, p.y + p.height, 12, 6);
}

function gameLoop() {
    if(!gameState.isRunning) return;
    updatePlayer();
    updateTime();
    draw();
    requestAnimationFrame(gameLoop);
}

canvas.addEventListener("click", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    let nearRiver = false;
    RIVERS.forEach(r => { if (x >= r.x - 60 && x <= r.x + r.width + 60) nearRiver = true; });
    const slotInfo = gameState.inventory.slots[gameState.selectedSlot];
    if (!slotInfo) return;
    const itemType = slotInfo.type;
    if (!nearRiver && itemType !== "seed_tree" && itemType !== "hoe") {
        showDialogue(["Longe da água! Apenas árvores podem crescer aqui."]);
        return;
    }
    if (itemType === "hoe") { showDialogue(["Solo preparado! Selecione uma semente."]); return; }
    if(itemType.startsWith("seed_")) {
        if(slotInfo.count >= 1) {
            slotInfo.count--;
            gameState.flora.push({ x, y, plantedAt: Date.now(), type: itemType.split("_")[1] });
            updateUI(); saveProgress();
        }
    }
});

updateUI();