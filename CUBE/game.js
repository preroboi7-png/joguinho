// game.js

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const bgm = document.getElementById("bgm");
const jumpSound = document.getElementById("jumpSound");

// --- NOVOS SONS ---
const risadaSound = document.getElementById("risadaSound");
const maeSound = document.getElementById("maeSound");
const risobalaSound = document.getElementById("risobalaSound");

// Elemento de Imagem
const introImage = document.getElementById("introImage");

// --- FUNÇÃO DE RESPONSIVIDADE ---
function resizeCanvas() {
    const aspectRatio = 16 / 9;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;
    let newWidth, newHeight;
    if (windowWidth / windowHeight > aspectRatio) {
        newHeight = windowHeight;
        newWidth = windowHeight * aspectRatio;
    } else {
        newWidth = windowWidth;
        newHeight = windowWidth / aspectRatio;
    }
    canvas.style.width = `${newWidth}px`;
    canvas.style.height = `${newHeight}px`;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);
// --- FIM FUNÇÃO DE RESPONSIVIDADE ---

// Elementos de UI
const startScreen = document.getElementById("startScreen");
const dialogueOverlay = document.getElementById("dialogueOverlay");
const dialogueText = document.getElementById("dialogueText");
const dialogueHint = document.getElementById("dialogueHint");
// Elementos de Controle Móvel
const mobileControls = document.getElementById("mobile-controls");
const leftBtn = document.getElementById("left-btn");
const rightBtn = document.getElementById("right-btn");
const jumpBtn = document.getElementById("jump-btn");
const eBtn = document.getElementById("e-btn");

let mobileKeys = { left: false, right: false, jump: false, interact: false };
let usingMobileControls = false;

let gameStarted = false;
let gamePaused = false; // Novo estado para pausar durante cutscene
let keys = {};

// --- Configuração do Mundo ---
let cameraX = 0;
const levelLength = 15000;
const groundHeight = 100;

// Elementos gerados proceduralmente
const platforms = [];
const clouds = [];
const trees = [];
const flowers = [];
const butterflies = [];

// --- Arrays de Coletáveis ---
const lollipops = [];
const candies = []; // Array para as Balas

// --- Variáveis de Eventos ---
let maeEventTriggered = false;
let showMaeText = false;
let maeTextTimer = 0;

// Variável para controlar a cutscene do primeiro pirulito
let firstLollipopCutscenePlayed = false;

// --- Jogador ---
const player = {
    x: 100,
    y: 500,
    radius: 30,
    vy: 0,
    vx: 0,
    onGround: false,
    angle: 0,
    speed: 7,
    jumpStrength: -16
};

// ====================================================================
// CLASSE CASA
// ====================================================================
class Casa {
    constructor(x, y, w, h) {
        this.x = x;
        this.y = y;
        this.w = w;
        this.h = h;
        this.corTelhado = '#A0522D';
        this.corParede = '#F5DEB3';
    }
    getPortaArea() {
        const portaW = this.w * 0.2;
        const portaH = this.h * 0.6;
        const portaX = this.x + (this.w / 2) - (portaW / 2);
        const portaY = canvas.height - groundHeight - portaH;
        return { x: portaX, y: portaY, w: portaW, h: portaH };
    }
    desenhar(ctx, cameraX) {
        const dx = this.x - cameraX;
        const baseY = canvas.height - groundHeight;
        const wallY = baseY - this.h; 
        
        ctx.fillStyle = this.corParede;
        ctx.fillRect(dx, wallY, this.w, this.h);

        ctx.fillStyle = this.corTelhado;
        ctx.beginPath();
        ctx.moveTo(dx, wallY); 
        ctx.lineTo(dx + this.w / 2, wallY - this.h * 0.4); 
        ctx.lineTo(dx + this.w, wallY); 
        ctx.closePath();
        ctx.fill();
        
        const janelaSize = this.w * 0.15;
        const janelaX = dx + this.w * 0.15;
        const janelaY = wallY + this.h * 0.3;
        ctx.fillStyle = '#ADD8E6';
        ctx.fillRect(janelaX, janelaY, janelaSize, janelaSize);
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.strokeRect(janelaX, janelaY, janelaSize, janelaSize);
        ctx.beginPath();
        ctx.moveTo(janelaX + janelaSize / 2, janelaY);
        ctx.lineTo(janelaX + janelaSize / 2, janelaY + janelaSize);
        ctx.moveTo(janelaX, janelaY + janelaSize / 2);
        ctx.lineTo(janelaX + janelaSize, janelaY + janelaSize / 2);
        ctx.stroke();

        const porta = this.getPortaArea();
        const portaDX = porta.x - cameraX; 
        
        ctx.fillStyle = '#654321';
        ctx.fillRect(portaDX, porta.y, porta.w, porta.h);

        ctx.fillStyle = '#FFD700';
        ctx.beginPath();
        ctx.arc(portaDX + porta.w * 0.8, porta.y + porta.h * 0.5, 3, 0, Math.PI * 2);
        ctx.fill();
    }
}
const casaFamilia = new Casa(levelLength - 350, 0, 200, 220); 
let nearDoor = false;
let ending = false;

// --- Diálogos ---
const dialogueLines = [
    "...",
    "Sair-de-casa-faz-parte-da-vida...",
    "Mas-acabei-esquecendo-de-me-despedir-dos-meus-pais...",
    "Bom...",
    "a-essa-altura...",
    "nem-vejo-minha-casa...",
    "Não-posso-ficar-lamentando...",
    "...",
    "Esse-mundo-é-bem-bonito...",
    "O-que-será-que-o-mundo-tem-para-mim?",
    "Acho-que...",
    "vejo-uma-casa-amigável-lá-na-frente..." 
];
let dialogueIndex = 0;
let inDialogue = false;
let isTyping = false;
let typingTimeout;
let charIndex = 0;

// --- Inicialização Procedural ---
function initWorld() {
    // Nuvens
    for (let i = 0; i < levelLength; i += Math.random() * 400 + 200) {
        clouds.push({ x: i, y: Math.random() * 200 + 50, scale: Math.random() * 0.5 + 0.5 });
    }
    // Árvores
    for (let i = 0; i < levelLength; i += Math.random() * 300 + 100) {
        let foliageType = Math.random();
        trees.push({
            x: i,
            h: Math.random() * 50 + 80,
            type: foliageType,
            color: foliageType > 0.5 ? "#228B22" : "#006400"
        });
    }
    // Flores
    for (let i = 0; i < levelLength; i += Math.random() * 50 + 20) {
        flowers.push({
            x: i,
            color: `hsl(${Math.random() * 360}, 70%, 50%)`,
            scale: Math.random() * 0.5 + 0.5
        });
    }
    // Borboletas
    for (let i = 0; i < levelLength / 10; i++) {
        butterflies.push({
            x: Math.random() * levelLength,
            y: Math.random() * (canvas.height - 150) + 100,
            color: `hsl(${Math.random() * 360}, 100%, 75%)`,
            speed: Math.random() * 1 + 0.5,
            offset: Math.random() * 100
        });
    }
    
    // Plataformas
    let currentX = 400;
    while (currentX < levelLength - 500) {
        const gap = Math.random() * 150 + 50;
        const width = Math.random() * 200 + 100;
        const heightLevel = Math.random() > 0.5 ? 450 : 350;
        if (Math.random() > 0.3) {
            platforms.push({ x: currentX, y: heightLevel, w: width, h: 20 });
            
            // Pirulito na plataforma
            if (Math.random() > 0.4) {
                lollipops.push({
                    x: currentX + width / 2,
                    y: heightLevel - 30,
                    collected: false,
                    color1: `hsl(${Math.random() * 360}, 80%, 60%)`,
                    color2: "white"
                });
            } else if (Math.random() > 0.4) {
                // Chance de gerar Bala na plataforma
                 candies.push({
                    x: currentX + width / 2,
                    y: heightLevel - 15,
                    collected: false,
                    color: `hsl(${Math.random() * 360}, 90%, 50%)`,
                    rotation: Math.random() * Math.PI
                });
            }
        }
        currentX += width + gap;
    }

    // Pirulitos e Balas no chão
    for (let i = 500; i < levelLength - 500; i += 600) {
        let rand = Math.random();
        if (rand > 0.6) {
            lollipops.push({
                x: i,
                y: canvas.height - groundHeight - 40,
                collected: false,
                color1: `hsl(${Math.random() * 360}, 80%, 60%)`,
                color2: "white"
            });
        } else if (rand > 0.3) {
             candies.push({
                x: i,
                y: canvas.height - groundHeight - 20,
                collected: false,
                color: `hsl(${Math.random() * 360}, 90%, 50%)`,
                rotation: Math.random() * Math.PI
            });
        }
    }
}

initWorld();

// --- Controles ---
window.addEventListener("keydown", e => {
    keys[e.key] = true;
    if(e.key.length === 1) { keys[e.key.toLowerCase()] = true; keys[e.key.toUpperCase()] = true; }
});
window.addEventListener("keyup", e => {
    keys[e.key] = false;
    if(e.key.length === 1) { keys[e.key.toLowerCase()] = false; keys[e.key.toUpperCase()] = false; }
});

function setupMobileControls() {
    leftBtn.addEventListener("touchstart", () => { mobileKeys.left = true; usingMobileControls = true; });
    leftBtn.addEventListener("touchend", () => { mobileKeys.left = false; });
    leftBtn.addEventListener("mousedown", () => { mobileKeys.left = true; usingMobileControls = true; });
    leftBtn.addEventListener("mouseup", () => { mobileKeys.left = false; });

    rightBtn.addEventListener("touchstart", () => { mobileKeys.right = true; usingMobileControls = true; });
    rightBtn.addEventListener("touchend", () => { mobileKeys.right = false; });
    rightBtn.addEventListener("mousedown", () => { mobileKeys.right = true; usingMobileControls = true; });
    rightBtn.addEventListener("mouseup", () => { mobileKeys.right = false; });

    jumpBtn.addEventListener("touchstart", () => { mobileKeys.jump = true; usingMobileControls = true; });
    jumpBtn.addEventListener("touchend", () => { mobileKeys.jump = false; });
    jumpBtn.addEventListener("mousedown", () => { mobileKeys.jump = true; usingMobileControls = true; });
    jumpBtn.addEventListener("mouseup", () => { mobileKeys.jump = false; });

    eBtn.addEventListener("click", () => {
        if (!ending) {
            mobileKeys.interact = true;
            usingMobileControls = true;
            setTimeout(() => { mobileKeys.interact = false; }, 100);
        }
    });
    mobileControls.classList.add('active');
}

// --- Física ---
function physics() {
    if (!gameStarted || gamePaused) return; // Pausa se a cutscene estiver rolando
    
    let moveRight = keys["ArrowRight"] || keys["d"] || keys["D"] || mobileKeys.right;
    let moveLeft = keys["ArrowLeft"] || keys["a"] || keys["A"] || mobileKeys.left;
    let doJump = keys[" "] || keys["ArrowUp"] || keys["w"] || keys["W"] || mobileKeys.jump;
    let doInteract = keys["e"] || keys["E"] || mobileKeys.interact;

    if (moveRight) {
        player.vx = player.speed;
        player.angle += 0.15;
    } else if (moveLeft) {
        player.vx = -player.speed;
        player.angle -= 0.15;
    } else {
        player.vx = 0;
    }
    player.x += player.vx;

    if (doJump && player.onGround) {
        player.vy = player.jumpStrength;
        player.onGround = false;
        jumpSound.currentTime = 0;
        jumpSound.play();
    }

    player.vy += 0.8;
    player.y += player.vy;
    player.onGround = false;

    if (player.y + player.radius > canvas.height - groundHeight) {
        player.y = canvas.height - groundHeight - player.radius;
        player.vy = 0;
        player.onGround = true;
    }

    platforms.forEach(p => {
        if (player.x + player.radius > p.x && player.x - player.radius < p.x + p.w) {
            if (player.y + player.radius > p.y && player.y + player.radius < p.y + p.h + player.vy + 5 && player.vy >= 0) {
                player.y = p.y - player.radius;
                player.vy = 0;
                player.onGround = true;
            }
        }
    });

    // --- Colisão com Pirulitos ---
    lollipops.forEach(l => {
        if (!l.collected) {
            const dx = player.x - l.x;
            const dy = player.y - l.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < player.radius + 20) {
                l.collected = true;
                risadaSound.currentTime = 0;
                risadaSound.play();

                // === LÓGICA DA CUTSCENE DO PRIMEIRO PIRULITO ===
                if (!firstLollipopCutscenePlayed) {
                    firstLollipopCutscenePlayed = true;
                    startLollipopCutscene();
                }
            }
        }
    });

    // --- Colisão com Balas ---
    candies.forEach(c => {
        if (!c.collected) {
            const dx = player.x - c.x;
            const dy = player.y - c.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < player.radius + 15) {
                c.collected = true;
                risobalaSound.currentTime = 0;
                risobalaSound.play();
            }
        }
    });

    // --- Evento da Mãe ---
    if (!maeEventTriggered && player.x > levelLength / 2) {
        maeEventTriggered = true;
        maeSound.play();
        setTimeout(() => {
            showMaeText = true;
            setTimeout(() => { showMaeText = false; }, 4000);
        }, 500); 
    }

    cameraX = player.x - 400;
    if (cameraX < 0) cameraX = 0;
    if (cameraX > levelLength - canvas.width) cameraX = levelLength - canvas.width;

    const porta = casaFamilia.getPortaArea();
    nearDoor = player.x + player.radius > porta.x && 
               player.x - player.radius < porta.x + porta.w &&
               player.y + player.radius > porta.y; 
    
    if (nearDoor && doInteract && !ending) {
        endLevel();
    }
}

// --- FUNÇÕES DA CUTSCENE DO PIRULITO ---
function startLollipopCutscene() {
    gamePaused = true;
    
    // Fade out música
    fadeOutAudioFast();
    
    // Fade in do overlay preto
    dialogueOverlay.style.opacity = 1;
    dialogueOverlay.style.pointerEvents = "auto";
    
    // Inicia o diálogo
    startDialogueSequence();
}

function fadeOutAudioFast() {
    if (bgm.volume > 0.05) {
        bgm.volume -= 0.05;
        setTimeout(fadeOutAudioFast, 50);
    } else {
        bgm.volume = 0;
        bgm.pause();
    }
}

function resumeGameAfterCutscene() {
    inDialogue = false;
    dialogueOverlay.style.opacity = 0;
    dialogueOverlay.style.pointerEvents = "none";
    
    // Volta imagem do jogo e música
    setTimeout(() => {
        bgm.volume = 0.5;
        bgm.play();
        gamePaused = false;
    }, 1000);
}

// --- SISTEMA DE DIÁLOGO (Reutilizado) ---
function startDialogueSequence() {
    inDialogue = true;
    dialogueIndex = 0;
    startTypewriter();
}

function startTypewriter() {
    dialogueText.innerText = "";
    dialogueHint.style.visibility = "hidden";
    charIndex = 0;
    isTyping = true;
    typeNextChar();
}

function typeNextChar() {
    let currentLine = dialogueLines[dialogueIndex];
    if (charIndex < currentLine.length) {
        dialogueText.innerText += currentLine.charAt(charIndex);
        charIndex++;
        typingTimeout = setTimeout(typeNextChar, 50);
    } else {
        isTyping = false;
        dialogueHint.style.visibility = "visible";
    }
}

function nextDialogue() {
    dialogueIndex++;
    if (dialogueIndex < dialogueLines.length) {
        startTypewriter();
    } else {
        resumeGameAfterCutscene(); // Volta ao jogo ao fim do texto
    }
}

// --- TRANSICAO DE FASE ---
function goToNextLevel() {
    window.location.href = "fase2.html";
}

function endLevel() {
    ending = true;
    mobileControls.classList.remove('active');
    document.getElementById("fade").style.opacity = 1;
    fadeOutAudio();
    setTimeout(goToNextLevel, 3500);
}

function fadeOutAudio() {
    if (bgm.volume > 0.05) {
        bgm.volume -= 0.02;
        setTimeout(fadeOutAudio, 100);
    } else {
        bgm.volume = 0;
        bgm.pause();
    }
}

// --- Desenho ---
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Céu
    let gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "#87CEEB");
    gradient.addColorStop(1, "#E0F7FA");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // --- NOVO: SOL SORRINDO (Fixo no fundo) ---
    // Desenha o sol no canto direito superior (não afetado pela cameraX para parecer distante)
    const sunX = canvas.width - 100;
    const sunY = 100;
    
    // Corpo
    ctx.fillStyle = "#FFD700";
    ctx.beginPath();
    ctx.arc(sunX, sunY, 50, 0, Math.PI * 2);
    ctx.fill();
    // Brilho
    ctx.strokeStyle = "rgba(255, 215, 0, 0.5)";
    ctx.lineWidth = 10;
    ctx.stroke();
    
    // Olhos
    ctx.fillStyle = "black";
    ctx.beginPath(); ctx.arc(sunX - 15, sunY - 10, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(sunX + 15, sunY - 10, 5, 0, Math.PI * 2); ctx.fill();
    
    // Sorriso
    ctx.strokeStyle = "black";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 30, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();

    // 2. Nuvens
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    clouds.forEach(c => {
        let renderX = c.x - cameraX * 0.5;
        if (renderX > -200 && renderX < canvas.width + 200) {
            ctx.beginPath();
            ctx.arc(renderX, c.y, 40 * c.scale, 0, Math.PI * 2);
            ctx.arc(renderX + 30 * c.scale, c.y + 10, 50 * c.scale, 0, Math.PI * 2);
            ctx.arc(renderX - 30 * c.scale, c.y + 10, 50 * c.scale, 0, Math.PI * 2);
            ctx.fill();
        }
    });

    // 3. Árvores
    trees.forEach(t => {
        let tx = t.x - cameraX;
        if (tx > -150 && tx < canvas.width + 150) {
            ctx.fillStyle = "#8B4513";
            ctx.fillRect(tx, canvas.height - groundHeight - t.h, 24, t.h);
            
            ctx.fillStyle = t.color;
            let foliageCenterY = canvas.height - groundHeight - t.h;
            ctx.beginPath();
            ctx.arc(tx + 12, foliageCenterY, 40, 0, Math.PI * 2);
            ctx.arc(tx - 15, foliageCenterY + 10, 30, 0, Math.PI * 2);
            ctx.arc(tx + 40, foliageCenterY + 10, 30, 0, Math.PI * 2);
            ctx.arc(tx + 12, foliageCenterY - 25, 30, 0, Math.PI * 2);
            ctx.fill();
        }
    });

    // 4. Chão
    ctx.fillStyle = "#32CD32";
    ctx.fillRect(0, canvas.height - groundHeight, canvas.width, groundHeight);
    ctx.fillStyle = "#654321";
    ctx.fillRect(0, canvas.height - groundHeight + 20, canvas.width, groundHeight - 20);

    flowers.forEach(f => {
        let fx = f.x - cameraX;
        if (fx > -50 && fx < canvas.width + 50) {
            let fy = canvas.height - groundHeight;
            ctx.fillStyle = "#228B22";
            ctx.fillRect(fx, fy - 10 * f.scale, 2, 10 * f.scale);
            ctx.fillStyle = f.color;
            ctx.beginPath(); ctx.arc(fx + 1, fy - 12 * f.scale, 5 * f.scale, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "yellow";
            ctx.beginPath(); ctx.arc(fx + 1, fy - 12 * f.scale, 2 * f.scale, 0, Math.PI * 2); ctx.fill();
        }
    });

    // 5. Plataformas
    platforms.forEach(p => {
        let px = p.x - cameraX;
        if (px > -200 && px < canvas.width) {
            ctx.fillStyle = "#654321";
            ctx.fillRect(px, p.y, p.w, p.h);
            ctx.fillStyle = "#32CD32";
            ctx.fillRect(px - 5, p.y - 10, p.w + 10, 10);
            ctx.fillStyle = "#2E8B57";
            for(let i=0; i<p.w; i+=20) {
                ctx.beginPath(); ctx.arc(px + i, p.y + p.h, 8, 0, Math.PI, false); ctx.fill();
            }
        }
    });

    // Pirulitos
    lollipops.forEach(l => {
        if (!l.collected) {
            let lx = l.x - cameraX;
            let ly = l.y;
            if (lx > -50 && lx < canvas.width + 50) {
                ctx.fillStyle = "white";
                ctx.fillRect(lx - 2, ly, 4, 30);
                const radius = 15;
                ctx.fillStyle = l.color1;
                ctx.beginPath(); ctx.arc(lx, ly, radius, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = l.color2;
                ctx.beginPath(); ctx.arc(lx, ly, radius * 0.6, 0, Math.PI*2); ctx.fill();
                ctx.fillStyle = l.color1;
                ctx.beginPath(); ctx.arc(lx, ly, radius * 0.3, 0, Math.PI*2); ctx.fill();
            }
        }
    });

    // --- NOVO: Desenho das Balas ---
    candies.forEach(c => {
        if (!c.collected) {
            let cx = c.x - cameraX;
            let cy = c.y;
            if (cx > -50 && cx < canvas.width + 50) {
                ctx.save();
                ctx.translate(cx, cy);
                ctx.rotate(c.rotation);
                
                // Formato Bala
                ctx.fillStyle = c.color;
                ctx.beginPath();
                ctx.ellipse(0, 0, 12, 8, 0, 0, Math.PI * 2);
                ctx.fill();
                
                // Embrulho (triângulos nas pontas)
                ctx.beginPath();
                ctx.moveTo(-12, 0);
                ctx.lineTo(-20, -6);
                ctx.lineTo(-20, 6);
                ctx.fill();
                
                ctx.beginPath();
                ctx.moveTo(12, 0);
                ctx.lineTo(20, -6);
                ctx.lineTo(20, 6);
                ctx.fill();
                
                ctx.restore();
            }
        }
    });

    // 6. CASA
    casaFamilia.desenhar(ctx, cameraX);

    if (nearDoor) {
        const porta = casaFamilia.getPortaArea();
        const portaDX = porta.x - cameraX;
        ctx.fillStyle = `rgba(255, 215, 0, ${Math.random() * 0.5 + 0.2})`;
        ctx.fillRect(portaDX, porta.y, porta.w, porta.h);
        ctx.fillStyle = "white";
        ctx.font = "bold 20px Arial";
        ctx.fillText("Pressione [E]", portaDX + porta.w/2 - 60, porta.y - 30);
    }

    // 7. Jogador
    ctx.save();
    ctx.translate(player.x - cameraX, player.y);
    ctx.rotate(player.angle);
    ctx.beginPath(); ctx.arc(0, 0, player.radius, 0, Math.PI * 2);
    ctx.fillStyle = "#FF69B4"; ctx.fill();
    ctx.strokeStyle = "#C71585"; ctx.lineWidth = 3; ctx.stroke();
    ctx.beginPath(); ctx.arc(-10, -10, 8, 0, Math.PI * 2); ctx.fillStyle = "rgba(255,255,255,0.3)"; ctx.fill();
    ctx.fillStyle = "white";
    ctx.beginPath(); ctx.arc(10, -10, 8, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(18, 5, 8, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "black";
    ctx.beginPath(); ctx.arc(12, -10, 3, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(20, 5, 3, 0, Math.PI*2); ctx.fill();
    
    if (showMaeText) {
        ctx.restore(); 
        const pX = player.x - cameraX;
        const pY = player.y;
        ctx.fillStyle = "white";
        ctx.beginPath();
        ctx.roundRect(pX + 20, pY - 80, 140, 40, 10);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(pX + 30, pY - 40);
        ctx.lineTo(pX + 20, pY - 20);
        ctx.lineTo(pX + 50, pY - 40);
        ctx.fill();
        ctx.fillStyle = "black";
        ctx.font = "bold 16px Arial";
        ctx.fillText("Já vou, mãe!", pX + 35, pY - 55);
        ctx.save(); 
    }
    ctx.restore();

    // 8. Borboletas
    butterflies.forEach(b => {
        b.x += b.speed * 0.5;
        if (b.x > levelLength) b.x = 0;
        let floatingY = b.y + Math.sin(Date.now() / 500 + b.offset) * 20;
        let bx = b.x - cameraX;
        if (bx > -50 && bx < canvas.width + 50) {
            ctx.fillStyle = b.color;
            ctx.save();
            ctx.translate(bx, floatingY);
            let wingFlap = Math.abs(Math.sin(Date.now() / 100 + b.offset));
            ctx.beginPath(); ctx.ellipse(-5, 0, 6, 6 * wingFlap, Math.PI / 4, 0, Math.PI * 2); ctx.fill();
            ctx.beginPath(); ctx.ellipse(5, 0, 6, 6 * wingFlap, -Math.PI / 4, 0, Math.PI * 2); ctx.fill();
            ctx.restore();
        }
    });
}

function loop() {
    // Se o jogo começou e NÃO está pausado pela cutscene
    if (gameStarted && !gamePaused && !ending) physics();
    
    // Desenha mesmo pausado para não sumir a tela
    draw(); 
    requestAnimationFrame(loop);
}

// --- LOGICA DE INTRODUÇÃO MODIFICADA ---

function startIntroSequence() {
    startScreen.style.display = "none";
    
    // 1. Mostrar imagem (Fade In)
    introImage.style.display = "block";
    
    // Pequeno delay para permitir a transição CSS funcionar
    setTimeout(() => {
        introImage.style.opacity = 1;
    }, 100);

    // 2. Esperar um tempo e dar Fade Out na imagem / Iniciar Jogo
    setTimeout(() => {
        introImage.style.opacity = 0;
        
        // 3. Clarear a tela do jogo e começar música
        startGameplay();
        
        // Remove a imagem do DOM visualmente após o fade out terminar
        setTimeout(() => {
            introImage.style.display = "none";
        }, 2000);

    }, 3000); // Tempo que a imagem fica na tela
}

function startGameplay() {
    gameStarted = true;
    canvas.style.opacity = 1; // Fade-in do Canvas
    bgm.volume = 0.5;
    bgm.play();
    setupMobileControls();
}

// Evento de clique no diálogo
dialogueOverlay.addEventListener("click", () => {
    if (inDialogue) {
        if (isTyping) {
            clearTimeout(typingTimeout);
            dialogueText.innerText = dialogueLines[dialogueIndex];
            isTyping = false;
            dialogueHint.style.visibility = "visible";
        } else {
            nextDialogue();
        }
    }
});

// Loop principal
loop();

// Lógica do botão Play
document.getElementById("playBtn").onclick = () => {
    startIntroSequence();
};
