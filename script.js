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
        x: 100,
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
    { x: 350, y: 0, width: 100, height: 600 } // Rio vertical no centro
];
const BRIDGES = [
    { x: 350, y: 280, width: 100, height: 50 } // Ponte no centro
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
        
        // Anti-stuck: Se o player estiver no rio no meio do save, tira ele de lá
        let inRiverOnLoad = false;
        RIVERS.forEach(r => {
            if (gameState.player.x + gameState.player.width > r.x && gameState.player.x < r.x + r.width) {
                 inRiverOnLoad = true;
            }
        });
        if (inRiverOnLoad) {
            gameState.player.x = 100;
            gameState.player.y = 300;
        }

        updateUI();
    }
}

function updatePlayer() {
    if(!dialogueBox.classList.contains("hidden")) return;
    const p = gameState.player;
    let nextX = p.x;
    let nextY = p.y;

    if(keys["ArrowUp"] || keys["w"]) nextY -= p.speed;
    if(keys["ArrowDown"] || keys["s"]) nextY += p.speed;
    if(keys["ArrowLeft"] || keys["a"]) nextX -= p.speed;
    if(keys["ArrowRight"] || keys["d"]) nextX += p.speed;

    // Boundaries
    nextX = Math.max(0, Math.min(canvas.width - p.width, nextX));
    nextY = Math.max(0, Math.min(canvas.height - p.height, nextY));

    // River Collision Check
    let inRiver = false;
    RIVERS.forEach(r => {
        if (nextX + p.width > r.x && nextX < r.x + r.width && 
            nextY + p.height > r.y && nextY < r.y + r.height) {
            inRiver = true;
        }
    });

    // Bridge Check (Override river collision)
    let onBridge = false;
    if (inRiver) {
        BRIDGES.forEach(b => {
            // A bridge allows crossing. We use a slightly smaller hitbox for safety.
            if (nextX + 10 >= b.x && nextX + p.width - 10 <= b.x + b.width && 
                nextY >= b.y - 10 && nextY + p.height <= b.y + b.height + 10) {
                onBridge = true;
            }
        });
    }

    if (!inRiver || onBridge) {
        p.x = nextX;
        p.y = nextY;
    } else {
        // Se entrou na água sem querer (ou bug de spawn), empurra de volta para a terra firme
        // Se X < 350, empurra para a esquerda. Se X > 450, empurra para a direita.
        if (p.x < 350) p.x = 340;
        else if (p.x > 450) p.x = 460;
        else {
            // Se está exatamente no meio (de um save antigo por exemplo), joga para o banco esquerdo
            p.x = 100;
            p.y = 300;
        }
    }
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
    // Draw Bridges
    ctx.fillStyle = "#8d6e63"; // Madeira
    BRIDGES.forEach(b => {
        ctx.fillRect(b.x, b.y, b.width, b.height);
        // Pranchas da ponte
        ctx.strokeStyle = "#5d4037";
        for (let bx = b.x; bx < b.x + b.width; bx += 10) {
            ctx.strokeRect(bx, b.y, 10, b.height);
        }
    });
    const growthDelay = 20 * 60 * 1000;
    const now = Date.now();
    gameState.flora.forEach(f => {
        const elapsed = now - f.plantedAt;
        const growthProgress = Math.min(1, elapsed / growthDelay);
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
        } else {
            // Outras plantas (Círculos coloridos atuais)
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