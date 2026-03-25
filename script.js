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

const dialogueBox = document.getElementById("dialogue-box");
const dialogueText = document.getElementById("dialogue-text");
const dialogueNextBtn = document.getElementById("dialogue-next");
const hotbarSlots = document.querySelectorAll(".hotbar-slot");

// Game State
let gameState = {
    isRunning: false,
    currentMap: 1, // 1 to 5
    // Time scaling: 5 hours real = 6 months game per map
    // 1 minute real = 0.73 days game
    // 5 hours = 300 minutes. 6 months = ~180 days. (300 mins => 180 days, so 1 min => 0.6 days approx.)
    // Let's use milliseconds.
    totalRealTimeMs: 5 * 60 * 60 * 1000, 
    elapsedRealTimeMs: 0,
    lastSavedTime: Date.now(),
    inventory: {
        seeds: {
            wheat: 0,
            watermelon: 0,
            apple: 0
        },
        tools: 1, // Enxada inclusa
        coins: 0
    },
    shop: {
        stock: { wheat: 15, watermelon: 15, apple: 15 },
        lastRefresh: Date.now()
    },
    timers: {
        coinGrant: 0, // ms
    },
    selectedItem: "hoe",
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
        location.reload(); // Simplest way to reset all state
    }
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
        gameState.selectedItem = slot.dataset.item;
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
    
    // Initial dialogue
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

    // Save every 5 seconds
    if(Math.random() < 0.05) saveProgress();

    // Coin Grant System (10 coins every 50 seconds)
    gameState.timers.coinGrant += dtReal;
    if (gameState.timers.coinGrant >= 50000) {
        gameState.inventory.coins += 10;
        gameState.timers.coinGrant = 0;
        updateUI();
    }

    // Shop Stock Refresh (every 1 hour)
    const nowHour = Date.now();
    if (nowHour - gameState.shop.lastRefresh >= 3600000) {
        gameState.shop.stock = { wheat: 15, watermelon: 15, apple: 15 };
        gameState.shop.lastRefresh = nowHour;
        updateShopUI();
    }

    const currentMap = maps[gameState.currentMap - 1];

    // Progression logic (Check if objective met)
    const progress = getProgress(currentMap);
    if(progress >= currentMap.target) {
        if(gameState.currentMap < maps.length) {
            nextMap();
        }
    }

    // Map time validation
    if(gameState.elapsedRealTimeMs >= gameState.totalRealTimeMs) {
        gameState.elapsedRealTimeMs = gameState.totalRealTimeMs;
    }

    // Calculate In-game month (1 to 6)
    // 5 hours = 100% progress. 6 months total.
    const progressLimit = gameState.elapsedRealTimeMs / gameState.totalRealTimeMs;
    let currentMonth = Math.floor(progressLimit * 6) + 1;
    if (currentMonth > 6) currentMonth = 6;

    const remainingRealMs = gameState.totalRealTimeMs - gameState.elapsedRealTimeMs;

    uiMonthText.innerText = `Mês ${currentMonth}`;
    uiTimeLeft.innerText = formatTime(remainingRealMs);
}

function updateUI() {
    uiCoinCount.innerText = gameState.inventory.coins;
    uiSeedCount.innerText = Object.values(gameState.inventory.seeds).reduce((a, b) => a + b, 0);
    uiToolCount.innerText = gameState.inventory.tools;
}

function updateShopUI() {
    document.getElementById("stock-wheat").innerText = gameState.shop.stock.wheat;
    document.getElementById("stock-watermelon").innerText = gameState.shop.stock.watermelon;
    document.getElementById("stock-apple").innerText = gameState.shop.stock.apple;
    
    // Disable buttons if no stock or no coins
    const btns = document.querySelectorAll(".buy-btn");
    btns.forEach(btn => {
        const type = btn.parentElement.dataset.seed;
        const price = parseInt(btn.parentElement.querySelector(".price").innerText.match(/\d+/)[0]);
        if (gameState.shop.stock[type] <= 0 || gameState.inventory.coins < price) {
            btn.disabled = true;
        } else {
            btn.disabled = false;
        }
    });
}

function buySeed(type, price) {
    if (gameState.inventory.coins >= price && gameState.shop.stock[type] > 0) {
        gameState.inventory.coins -= price;
        gameState.inventory.seeds[type]++;
        gameState.shop.stock[type]--;
        updateUI();
        updateShopUI();
        saveProgress();
    }
}
window.buySeed = buySeed; // Make accessible globally for onclick

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

function getProgress(map) {
    if(!map) return 0;
    switch(map.type) {
        case "plant":
            return gameState.flora.filter(f => (Date.now() - f.plantedAt) >= (20 * 60 * 1000)).length;
        default: return 0;
    }
}

function updateObjectivesUI() {
    const currentMap = maps[gameState.currentMap - 1];
    let progress = 0;
    let label = "";

    switch(currentMap.type) {
        case "plant":
            progress = gameState.flora.filter(f => {
                const growthDelay = 20 * 60 * 1000;
                return Date.now() - f.plantedAt >= growthDelay;
            }).length;
            label = "Árvores Adultas";
            break;
        default:
            progress = 0;
            label = "Progresso Geral";
    }

    uiTreesCount.innerText = progress; // Reusing trees count span for simplicity
    document.querySelector("#objectives-list p:nth-child(2)").innerHTML = `${label}: <span id="trees-count">${progress}</span> / ${currentMap.target}`;
    
    let title = "Visitante";
    if (progress >= currentMap.target) title = "Profissional";
    else if (progress >= Math.floor(currentMap.target * 0.6)) title = "Semi Profissional";
    else if (progress >= Math.floor(currentMap.target * 0.25)) title = "Iniciante";

    uiPlayerTitle.innerText = title;

    // Update main display if possible
    document.querySelector("#month-text").innerText = `Mês ${currentMap.month} - ${currentMap.name}`;
}

// Save/Load
function saveProgress() {
    localStorage.setItem("legadoVerdeSave", JSON.stringify(gameState));
}

function loadProgress() {
    const saved = localStorage.getItem("legadoVerdeSave");
    if(saved) {
        const parsed = JSON.parse(saved);
        // Ensure legacy saves don't break with new nested inventory
        if(typeof parsed.inventory?.seeds === 'number') {
            parsed.inventory.seeds = { wheat: parsed.inventory.seeds, watermelon: 0, apple: 0 };
        }
        gameState = { ...gameState, ...parsed, isRunning: false };
        updateUI();
    }
}

// Update game logic
function updatePlayer() {
    // Avoid moving if dialogue is active
    if(!dialogueBox.classList.contains("hidden")) return;

    if(keys["ArrowUp"] || keys["w"]) gameState.player.y -= gameState.player.speed;
    if(keys["ArrowDown"] || keys["s"]) gameState.player.y += gameState.player.speed;
    if(keys["ArrowLeft"] || keys["a"]) gameState.player.x -= gameState.player.speed;
    if(keys["ArrowRight"] || keys["d"]) gameState.player.x += gameState.player.speed;

    // Boundaries
    if(gameState.player.x < 0) gameState.player.x = 0;
    if(gameState.player.y < 0) gameState.player.y = 0;
    if(gameState.player.x + gameState.player.width > canvas.width) gameState.player.x = canvas.width - gameState.player.width;
    if(gameState.player.y + gameState.player.height > canvas.height) gameState.player.y = canvas.height - gameState.player.height;
}

// Render game
function draw() {
    // Background based on map
    const mapInfo = maps[gameState.currentMap - 1];
    ctx.fillStyle = mapInfo.color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Rivers
    ctx.fillStyle = "#3498db";
    RIVERS.forEach(r => {
        ctx.fillRect(r.x, r.y, r.width, r.height);
        // Waves
        ctx.strokeStyle = "rgba(255,255,255,0.3)";
        ctx.setLineDash([10, 10]);
        ctx.beginPath();
        ctx.moveTo(r.x + 20, r.y);
        ctx.lineTo(r.x + 20, r.y + r.height);
        ctx.stroke();
        ctx.setLineDash([]);
    });

    // Draw Flora
    const growthDelay = 20 * 60 * 1000;
    const now = Date.now();
    gameState.flora.forEach(f => {
        const elapsed = now - f.plantedAt;
        const growthProgress = Math.min(1, elapsed / growthDelay);
        const radius = 5 + (growthProgress * 15);

        // Color based on type
        if (f.type === "wheat") ctx.fillStyle = growthProgress >= 1 ? "#f1c40f" : "#8d6e63";
        else if (f.type === "watermelon") ctx.fillStyle = growthProgress >= 1 ? "#2ecc71" : "#8d6e63";
        else if (f.type === "apple") ctx.fillStyle = growthProgress >= 1 ? "#e74c3c" : "#8d6e63";
        else ctx.fillStyle = growthProgress >= 1 ? "#145a32" : "#8d6e63";

        ctx.beginPath();
        ctx.arc(f.x, f.y, radius, 0, Math.PI * 2);
        ctx.fill();

        if(growthProgress < 1) {
            ctx.fillStyle = "white";
            ctx.font = "10px Roboto";
            ctx.fillText(Math.floor(growthProgress * 100) + "%", f.x - 10, f.y - radius - 5);
        }
    });

    // Draw Player (João Guilherme - 20 anos)
    const p = gameState.player;
    
    // Cabeça
    ctx.fillStyle = "#ffdbac"; // Skin tone
    ctx.fillRect(p.x + 5, p.y - 10, p.width - 10, 15);

    // Camisa (Planeta Terra - Azul claro)
    ctx.fillStyle = "#3498db";
    ctx.fillRect(p.x, p.y, p.width, p.height - 10);
    
    // Detalhe Planeta Terra na camisa (Pequeno círculo verde/azul)
    ctx.fillStyle = "#2ecc71";
    ctx.beginPath();
    ctx.arc(p.x + p.width/2, p.y + p.height/3, 5, 0, Math.PI * 2);
    ctx.fill();

    // Calça Moletom (Cinza)
    ctx.fillStyle = "#95a5a6";
    ctx.fillRect(p.x, p.y + p.height - 10, p.width, 10);

    // Botas (Marrom)
    ctx.fillStyle = "#5d4037";
    ctx.fillRect(p.x - 2, p.y + p.height, 12, 6); // Pé esquerdo
    ctx.fillRect(p.x + p.width - 10, p.y + p.height, 12, 6); // Pé direito
}

// Main Loop
function gameLoop() {
    if(!gameState.isRunning) return;

    updatePlayer();
    updateTime();
    draw();

    requestAnimationFrame(gameLoop);
}

// Interacting (Clicking)
canvas.addEventListener("click", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check distance to river (must be within 60px)
    let nearRiver = false;
    RIVERS.forEach(r => {
        if (x >= r.x - 60 && x <= r.x + r.width + 60) nearRiver = true;
    });

    if (!nearRiver) {
        showDialogue(["Está muito longe da água! As plantas precisam de rios para crescer."]);
        return;
    }

    const selected = gameState.selectedItem;

    if (selected === "hoe") {
        showDialogue(["Solo preparado! Agora selecione uma semente para plantar."]);
        // Visual indicator could be added here
        return;
    }

    const seedType = selected.split("_")[1];
    if(gameState.inventory.seeds[seedType] > 0) {
        gameState.inventory.seeds[seedType]--;
        gameState.flora.push({ x, y, plantedAt: Date.now(), type: seedType });
        updateUI();
        saveProgress();
    } else {
        showDialogue(["Você não tem sementes de " + seedType + "! Compre na loja."]);
    }
});
