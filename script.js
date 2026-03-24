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

const dialogueBox = document.getElementById("dialogue-box");
const dialogueText = document.getElementById("dialogue-text");
const dialogueNextBtn = document.getElementById("dialogue-next");

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
        seeds: 0,
        tools: 0
    },
    player: {
        x: 400,
        y: 300,
        speed: 3,
        width: 30,
        height: 30
    },
    animals: [],
    flora: [], // trees/seeds planted
    dialogueQueue: []
};

// Maps config
const maps = [
    { id: 1, name: "Mata Atlântica", month: 1, objective: "Plantar Árvores", type: "plant", target: 20, color: "#27ae60" },
    { id: 2, name: "Amazônia", month: 2, objective: "Reproduzir Animais", type: "reproduce", target: 10, color: "#1e8449" },
    { id: 3, name: "Cerrado", month: 3, objective: "Alimentar Jovens", type: "feed", target: 8, color: "#d35400" },
    { id: 4, name: "Pantanal", month: 4, objective: "Treinar Sobrevivência", type: "train", target: 6, color: "#2980b9" },
    { id: 5, name: "Caatinga", month: 5, objective: "Restaurar Bioma", type: "restore", target: 1, color: "#e67e22" },
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

function nextMap() {
    gameState.currentMap++;
    gameState.elapsedRealTimeMs = 0;
    gameState.animals = [];
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
        case "reproduce":
            return gameState.animals.filter(a => a.isBaby).length;
        case "feed":
            return gameState.animals.filter(a => a.isFed && a.isAdult).length;
        case "train":
            return gameState.animals.filter(a => a.isTrained).length;
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
        case "reproduce":
            progress = gameState.animals.filter(a => a.isBaby).length;
            label = "Filhotes Nascidos";
            break;
        case "feed":
            progress = gameState.animals.filter(a => a.isFed && a.isAdult).length;
            label = "Animais Alimentados";
            break;
        case "train":
            progress = gameState.animals.filter(a => a.isTrained).length;
            label = "Animais Treinados";
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
        gameState = { ...gameState, ...parsed, isRunning: false };
        // Force update UI
        uiSeedCount.innerText = gameState.inventory.seeds;
        uiToolCount.innerText = gameState.inventory.tools;
    }
}

// Update game logic
function updateAnimals() {
    const currentMap = maps[gameState.currentMap - 1];
    
    // Spawn initial animals if empty
    if(gameState.animals.length === 0) {
        for(let i=0; i<3; i++) {
            gameState.animals.push({
                x: Math.random() * (canvas.width - 20),
                y: Math.random() * (canvas.height - 20),
                isAdult: true,
                isBaby: false,
                isFed: true,
                isTrained: false,
                speedX: (Math.random() - 0.5) * 2,
                speedY: (Math.random() - 0.5) * 2
            });
        }
    }

    gameState.animals.forEach((a, i) => {
        // Simple movement
        a.x += a.speedX;
        a.y += a.speedY;
        
        // Bounce
        if(a.x < 0 || a.x > canvas.width - 20) a.speedX *= -1;
        if(a.y < 0 || a.y > canvas.height - 20) a.speedY *= -1;

        // Map 2 Logic: Reproduce (Babies)
        if(currentMap.type === "reproduce" && a.isAdult && !a.isBaby) {
            // Check proximity with another adult
            gameState.animals.forEach((other, j) => {
                if(i !== j && other.isAdult && !other.isBaby) {
                    const dist = Math.hypot(a.x - other.x, a.y - other.y);
                    if(dist < 30 && Math.random() < 0.001) { // Low chance per frame
                        gameState.animals.push({
                            x: a.x, y: a.y, isBaby: true, isAdult: false, isFed: false, isTrained: false,
                            speedX: (Math.random() - 0.5), speedY: (Math.random() - 0.5)
                        });
                    }
                }
            });
        }
    });
}

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

    // Draw Flora
    const growthDelay = 20 * 60 * 1000;
    const now = Date.now();
    gameState.flora.forEach(f => {
        const elapsed = now - f.plantedAt;
        const growthProgress = Math.min(1, elapsed / growthDelay);
        const radius = 5 + (growthProgress * 15); // Starts as seed (5px) grows to tree (20px)

        ctx.fillStyle = growthProgress >= 1 ? "#145a32" : "#8d6e63"; // Brown if growing, dark green if adult
        ctx.beginPath();
        ctx.arc(f.x, f.y, radius, 0, Math.PI * 2);
        ctx.fill();

        // Label growth progress for testing (optional, can remove later)
        if(growthProgress < 1) {
            ctx.fillStyle = "white";
            ctx.font = "10px Roboto";
            ctx.fillText(Math.floor(growthProgress * 100) + "%", f.x - 10, f.y - radius - 5);
        }
    });

    // Draw Animals
    gameState.animals.forEach(a => {
        const size = a.isBaby ? 10 : 20;
        ctx.fillStyle = a.isBaby ? "#f39c12" : "#e67e22"; // Baby: Orange, Adult: Dark Orange
        if(a.isTrained) ctx.fillStyle = "#f1c40f"; // Trained: Yellowish
        
        ctx.fillRect(a.x, a.y, size, size);

        // Draw indicator if needs interaction
        const currentMap = maps[gameState.currentMap - 1];
        if(currentMap.type === "feed" && a.isBaby && !a.isFed) {
            ctx.fillStyle = "white";
            ctx.fillText("FOME!", a.x, a.y - 5);
        }
        if(currentMap.type === "train" && a.isAdult && !a.isTrained) {
            ctx.fillStyle = "white";
            ctx.fillText("TREINAR", a.x, a.y - 5);
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
    updateAnimals();
    updateTime();
    draw();

    requestAnimationFrame(gameLoop);
}

// Interacting (Clicking)
canvas.addEventListener("click", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const currentMap = maps[gameState.currentMap - 1];

    // Interaction with animals
    let interacted = false;
    gameState.animals.forEach(a => {
        const dist = Math.hypot(x - (a.x + 10), y - (a.y + 10));
        if(dist < 30) {
            if(currentMap.type === "feed" && a.isBaby && !a.isFed) {
                a.isFed = true;
                a.isAdult = true; // Grow up after eating for Map 3
                a.isBaby = false;
                interacted = true;
            } else if(currentMap.type === "train" && a.isAdult && !a.isTrained) {
                a.isTrained = true;
                interacted = true;
            }
        }
    });

    if(interacted) {
        updateObjectivesUI();
        saveProgress();
        return;
    }

    if(gameState.inventory.seeds > 0) {
        gameState.inventory.seeds--;
        gameState.flora.push({ x, y, plantedAt: Date.now() });
        uiSeedCount.innerText = gameState.inventory.seeds;
        saveProgress();
    } else {
        // Collect a seed just to test mechanics
        gameState.inventory.seeds++;
        uiSeedCount.innerText = gameState.inventory.seeds;
    }
});
