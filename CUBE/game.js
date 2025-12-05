const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const bgm = document.getElementById("bgm");
const jumpSound = document.getElementById("jumpSound");

// --- FUNÇÃO DE RESPONSIVIDADE ---
function resizeCanvas() {
    const aspectRatio = 16 / 9;
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    let newWidth, newHeight;

    // Calcula o tamanho que o canvas deve ter para caber na tela mantendo 16:9
    if (windowWidth / windowHeight > aspectRatio) {
        newHeight = windowHeight;
        newWidth = windowHeight * aspectRatio;
    } else {
        newWidth = windowWidth;
        newHeight = windowWidth / aspectRatio;
    }

    // Aplica o tamanho visual (style)
    canvas.style.width = `${newWidth}px`;
    canvas.style.height = `${newHeight}px`;
}

// Chama a função uma vez no início e registra o evento de redimensionamento
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

let mobileKeys = {
    left: false,
    right: false,
    jump: false,
    interact: false
};
let usingMobileControls = false;

let gameStarted = false;
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

// --- Porta Final ---
const door = { x: levelLength - 300, y: 500, w: 80, h: 120 };
let nearDoor = false;
let ending = false;

// --- Diálogos e Efeito de Digitação ---
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
    "vejo-uma-porta-lá-na-frente..."
];
let dialogueIndex = 0;
let inDialogue = false;
let isTyping = false;
let typingTimeout;
let charIndex = 0;

// --- Inicialização Procedural ---
function initWorld()
{
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
        }
        currentX += width + gap;
    }
}

initWorld();

// --- Controles de Teclado ---
window.addEventListener("keydown", e => {
    keys[e.key] = true;
    if(e.key.length === 1) {
        keys[e.key.toLowerCase()] = true;
        keys[e.key.toUpperCase()] = true;
    }
});

window.addEventListener("keyup", e => {
    keys[e.key] = false;
    if(e.key.length === 1) {
        keys[e.key.toLowerCase()] = false;
        keys[e.key.toUpperCase()] = false;
    }
});

// --- Controles Móveis (Touch/Mouse) ---
function setupMobileControls() {
    // Esquerda
    leftBtn.addEventListener("touchstart", () => { mobileKeys.left = true; usingMobileControls = true; });
    leftBtn.addEventListener("touchend", () => { mobileKeys.left = false; });
    leftBtn.addEventListener("mousedown", () => { mobileKeys.left = true; usingMobileControls = true; });
    leftBtn.addEventListener("mouseup", () => { mobileKeys.left = false; });

    // Direita
    rightBtn.addEventListener("touchstart", () => { mobileKeys.right = true; usingMobileControls = true; });
    rightBtn.addEventListener("touchend", () => { mobileKeys.right = false; });
    rightBtn.addEventListener("mousedown", () => { mobileKeys.right = true; usingMobileControls = true; });
    rightBtn.addEventListener("mouseup", () => { mobileKeys.right = false; });

    // Pular
    jumpBtn.addEventListener("touchstart", () => { mobileKeys.jump = true; usingMobileControls = true; });
    jumpBtn.addEventListener("touchend", () => { mobileKeys.jump = false; });
    jumpBtn.addEventListener("mousedown", () => { mobileKeys.jump = true; usingMobileControls = true; });
    jumpBtn.addEventListener("mouseup", () => { mobileKeys.jump = false; });

    // Interagir (E) - Ação de clique simples
    eBtn.addEventListener("click", () => { 
        if (!ending) {
            mobileKeys.interact = true; 
            usingMobileControls = true;
            setTimeout(() => { mobileKeys.interact = false; }, 100); 
        }
    });

    // Ativar visibilidade dos controles
    mobileControls.classList.add('active');
}
// --- Fim Controles Móveis ---

// --- Física ---
function physics() {
    if (!gameStarted) return; 
    
    // Lógica de Movimento com Prioridade para Móvel ou Teclado
    let moveRight = keys["ArrowRight"] || keys["d"] || keys["D"] || mobileKeys.right;
    let moveLeft = keys["ArrowLeft"] || keys["a"] || keys["A"] || mobileKeys.left;
    let doJump = keys[" "] || keys["ArrowUp"] || keys["w"] || keys["W"] || mobileKeys.jump;
    let doInteract = keys["e"] || keys["E"] || mobileKeys.interact;

    // Movimento Horizontal
    if (moveRight)
    {
        player.vx = player.speed;
        player.angle += 0.15;
    } else if (moveLeft)
    {
        player.vx = -player.speed;
        player.angle -= 0.15;
    } else {
        player.vx = 0;
    }

    player.x += player.vx;

    // Pulo
    if (doJump && player.onGround) {
        player.vy = player.jumpStrength;
        player.onGround = false;
        jumpSound.currentTime = 0; 
        jumpSound.play();
    }

    // Gravidade
    player.vy += 0.8;
    player.y += player.vy;
    player.onGround = false;

    // Colisão com Chão
    if (player.y + player.radius > canvas.height - groundHeight) {
        player.y = canvas.height - groundHeight - player.radius;
        player.vy = 0;
        player.onGround = true;
    }

    // Colisão com Plataformas
    platforms.forEach(p => {
        if (player.x + player.radius > p.x && player.x - player.radius < p.x + p.w) {
            if (player.y + player.radius > p.y &&
                player.y + player.radius < p.y + p.h + player.vy + 5 &&
                player.vy >= 0) {
               
                player.y = p.y - player.radius;
                player.vy = 0;
                player.onGround = true;
            }
        }
    });

    // Câmera
    cameraX = player.x - 400;
    if (cameraX < 0) cameraX = 0;
    if (cameraX > levelLength - canvas.width) cameraX = levelLength - canvas.width;

    // Lógica da Porta
    nearDoor = player.x > door.x - 50 && player.x < door.x + 100;
    
    // Interação com a Porta
    if (nearDoor && doInteract && !ending) { 
        endLevel();
    }
}

// --- TRANSICAO DE FASE ---
function goToNextLevel() {
    window.location.href = "fase2.html";
}

// --- Finalizar Fase (com transição) ---
function endLevel()
{
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

    // 4. Chão e Flores
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

    // 6. Porta
    let dx = door.x - cameraX;
    ctx.fillStyle = "#4A3222";
    ctx.fillRect(dx - 10, door.y - 10, door.w + 20, door.h + 10);
    ctx.fillStyle = "#000";
    ctx.fillRect(dx, door.y, door.w, door.h);
    if (nearDoor) {
        ctx.fillStyle = `rgba(255, 215, 0, ${Math.random() * 0.5 + 0.2})`;
        ctx.fillRect(dx, door.y, door.w, door.h);
        ctx.fillStyle = "white";
        ctx.font = "bold 20px Arial";
        ctx.fillText("Pressione [E]", dx + door.w/2 - 60, door.y - 30);
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
    if (gameStarted && !ending) physics();
    draw();
    requestAnimationFrame(loop);
}

// --- Sistema de Diálogo (Typewriter) ---

function startIntro() {
    inDialogue = true;
    startScreen.style.display = "none"; 
    
    dialogueOverlay.style.opacity = 1; 
    dialogueOverlay.style.pointerEvents = "auto";
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
        finishIntro();
    }
}

function finishIntro() {
    inDialogue = false;
    dialogueOverlay.style.opacity = 0;
    dialogueOverlay.style.pointerEvents = "none";
    
    setTimeout(() => {
        bgm.volume = 0.5;
        bgm.play();
        gameStarted = true;
        setupMobileControls();
    }, 1500); 
}

// Evento de clique no diálogo
dialogueOverlay.addEventListener("click", () => {
    if (inDialogue)
    {
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
    startIntro();
};
