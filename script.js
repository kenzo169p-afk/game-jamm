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
    { id: 1, name: "Mata Atlântica", animal: "Mico-leão-dourado", color: "#27ae60" },
    { id: 2, name: "Amazônia", animal: "Onça-pintada", color: "#1e8449" },
    { id: 3, name: "Cerrado", animal: "Lobo-guará", color: "#d35400" },
    { id: 4, name: "Pantanal", animal: "Arara-azul", color: "#2980b9" },
    { id: 5, name: "Caatinga", animal: "Tatu-bola", color: "#e67e22" },
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

    // Map time validation
    if(gameState.elapsedRealTimeMs >= gameState.totalRealTimeMs) {
        gameState.elapsedRealTimeMs = gameState.totalRealTimeMs;
        // Logic to move to next map goes here
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
    ctx.fillStyle = "#145a32";
    gameState.flora.forEach(f => {
        ctx.beginPath();
        ctx.arc(f.x, f.y, 10 + f.growth, 0, Math.PI * 2);
        ctx.fill();
    });

    // Draw Animals
    ctx.fillStyle = "#f1c40f"; // placeholder animal color
    gameState.animals.forEach(a => {
        ctx.fillRect(a.x, a.y, 20, 20);
    });

    // Draw Player
    ctx.fillStyle = "#ecf0f1";
    ctx.fillRect(gameState.player.x, gameState.player.y, gameState.player.width, gameState.player.height);
}

// Main Loop
function gameLoop() {
    if(!gameState.isRunning) return;

    updatePlayer();
    updateTime();
    draw();

    requestAnimationFrame(gameLoop);
}

// Add a test feature to collect seeds via click
canvas.addEventListener("click", (e) => {
    // Just a placeholder to interact via click (plant seed)
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if(gameState.inventory.seeds > 0) {
        gameState.inventory.seeds--;
        gameState.flora.push({ x, y, growth: 0 });
        uiSeedCount.innerText = gameState.inventory.seeds;
    } else {
        // Collect a seed just to test mechanics
        gameState.inventory.seeds++;
        uiSeedCount.innerText = gameState.inventory.seeds;
    }
});
