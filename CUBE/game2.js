const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const bgm = document.getElementById("bgm");
const jumpSound = document.getElementById("jumpSound");

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

// --- Configuração da Fase 2 ---
let cameraX = 0;
const levelLength = 20000; 
const terrain = []; 

// Elementos
const platforms = [];
const clouds = [];
const trees = [];

// Variáveis do Evento de Áudio
let audioGlitchTriggered = false;
let audioRestored = false;

// --- Implementação do Susto ---
const jumpScareImage = new Image();
jumpScareImage.src = 'susto.png'; // Nome do arquivo de imagem do susto
const jumpScareSound = new Audio('susto.mp3'); // Nome do arquivo de som do susto
let jumpScareActive = false;
// --- Fim Implementação do Susto ---

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

// Porta Final (No topo do morro)
const door = { x: levelLength - 300, y: 0, w: 80, h: 120 };
let nearDoor = false;
let ending = false;

// --- Inicialização Procedural (O Morro) ---
function initWorld()
{
    let currentHeight = 100; // Altura do chão (distância do fundo da tela)
    let currentX = 0;
    
    // Configurações do Ciclo
    const stepRise = 40; // Quanto sobe/desce em cada degrau
    const stepLength = 300; // Comprimento de cada degrau
    const flatSegmentLength = 1000; // Comprimento do segmento plano
    let cycleCounter = 0; // Para controlar o ciclo (subida, descida, plano)

    // Gerar Terreno
    while (currentX < levelLength + 1000) {
        let segLength;
        let heightChange = 0;

        const cyclePart = cycleCounter % 9; // Ciclo de 9 partes: 4 sobe, 4 desce, 1 plano

        if (cyclePart >= 0 && cyclePart <= 3) {
            // Subida (4 degraus)
            segLength = stepLength;
            heightChange = stepRise;
        } else if (cyclePart >= 4 && cyclePart <= 7) {
            // Descida (4 degraus)
            segLength = stepLength;
            heightChange = -stepRise;
        } else {
            // Plano (1 segmento)
            segLength = flatSegmentLength;
            heightChange = 0;
            if (currentX > 500) {
                currentHeight = Math.max(100, currentHeight);
            }
        }

        // Adiciona segmento de terreno
        terrain.push({
            x: currentX,
            w: segLength,
            h: currentHeight
        });

        // Gerar Árvores neste segmento
        if (Math.random() > 0.3) {
            trees.push({
                x: currentX + Math.random() * segLength,
                yGround: currentHeight, 
                h: Math.random() * 60 + 80
            });
        }
        
        // Aplica a mudança de altura
        if (currentX > 500) {
            currentHeight += heightChange;
            if (currentHeight < 100) currentHeight = 100;
        }
        
        currentX += segLength;
        cycleCounter++;
    }

    // Definir posição Y da porta
    let doorGround = terrain.findLast(t => t.x < door.x + door.w);
    if (doorGround)
    {
        door.y = canvas.height - doorGround.h - door.h;
    } else {
        door.y = 500; // Fallback
    }

    // Nuvens
    for (let i = 0; i < levelLength; i += Math.random() * 400 + 200) {
        clouds.push({ x: i, y: Math.random() * 200 + 50, scale: Math.random() * 0.5 + 0.5 });
    }
}

initWorld();

// --- Controles de Teclado ---
window.addEventListener("keydown", e => keys[e.key] = true);
window.addEventListener("keyup", e => keys[e.key] = false);

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


// --- Lógica de Áudio (Glitch) ---
function handleAudioEvent() {
    // Gatilho do Glitch no meio da fase (ex: 40% a 60%)
    if (player.x > levelLength * 0.4 && player.x < levelLength * 0.6 && !audioGlitchTriggered) {
        audioGlitchTriggered = true;
        console.log("Glitch no áudio iniciado...");
        
        // Simula o "Chiar" / Parada
        bgm.pause();
        
        // Voltar após 10 segundos
        setTimeout(() => {
            if (!ending) {
                // Reinicia a reprodução do ponto atual.
                bgm.play();
                console.log("Áudio restaurado após 10 segundos.");
            }
        }, 10000);
    }
}

// --- Física ---
function physics() {
    
    // Lógica de Movimento com Prioridade para Móvel ou Teclado
    let moveRight = keys["ArrowRight"] || keys["d"] || keys["D"] || mobileKeys.right;
    let moveLeft = keys["ArrowLeft"] || keys["a"] || keys["A"] || mobileKeys.left;
    let doJump = keys[" "] || keys["ArrowUp"] || keys["w"] || keys["W"] || mobileKeys.jump;
    let doInteract = keys["e"] || keys["E"] || mobileKeys.interact;


    // Movimento
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

    player.vy += 0.8;
    player.y += player.vy;
    player.onGround = false;

    // --- Colisão com o Terreno Dinâmico (Morro) ---
    let currentGroundY = canvas.height + player.radius; 
    
    for (let t of terrain) {
        if (player.x >= t.x && player.x < t.x + t.w) {
            currentGroundY = canvas.height - t.h;
            break;
        }
    }

    // Colisão Chão
    if (player.y + player.radius > currentGroundY) {
        player.y = currentGroundY - player.radius;
        player.vy = 0;
        player.onGround = true;
    }

    // Colisão Plataformas
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

    // Checar evento de áudio
    handleAudioEvent();

    // Porta
    nearDoor = player.x > door.x - 50 && player.x < door.x + 100;
    if (nearDoor && doInteract && !ending) { 
        endLevel();
    }
}

// --- Finalizar Fase (Agora com o Susto) ---
function endLevel()
{
    ending = true;
    mobileControls.classList.remove('active'); // Desativa os botões
    
    // 1. Interrompe a música de fundo
    bgm.pause();
    bgm.currentTime = 0;
    
    // 2. Toca o som do susto e ativa a imagem
    jumpScareSound.play();
    jumpScareActive = true;
    
    // 3. Remove a tela inicial para garantir que a imagem fique em cima de tudo
    document.getElementById("startScreen").style.display = "none";
    
    // 4. Se quiser a tela branca, também:
    document.getElementById("fade").style.opacity = 1;
}

// --- Desenho ---
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Se o jumpscare estiver ativo, desenha SÓ a imagem
    if (jumpScareActive) {
        // Desenha a imagem na tela inteira
        ctx.drawImage(jumpScareImage, 0, 0, canvas.width, canvas.height);
        return; 
    }

    // 1. Céu
    let gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "#87CEEB");
    gradient.addColorStop(1, "#E0F7FA");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Nuvens (Parallax)
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

    // 3. Terreno (O Morro)
    ctx.fillStyle = "#32CD32"; // Grama
    
    terrain.forEach(t => {
        let tx = t.x - cameraX;
        let ty = canvas.height - t.h;
        if (tx < canvas.width && tx + t.w > 0) {
            // Desenha a parte da grama (Topo)
            ctx.fillRect(tx, ty, t.w, 20); // 20px de grama
            
            // Desenha a parte da terra (Abaixo da grama)
            ctx.fillStyle = "#654321";
            ctx.fillRect(tx, ty + 20, t.w, t.h - 20);
            
            ctx.fillStyle = "#32CD32"; // Volta para a grama para o próximo segmento
        }
    });

    // 4. Árvores (Renderizadas acima do seu respectivo chão)
    trees.forEach(t => {
        let tx = t.x - cameraX;
        let ty = canvas.height - t.yGround;
        if (tx > -100 && tx < canvas.width + 100) {
            
            // Tronco mais detalhado
            ctx.fillStyle = "#8B4513";
            ctx.fillRect(tx - 5, ty - t.h, 30, t.h); 
            
            // Textura do tronco (linhas)
            ctx.fillStyle = "rgba(0,0,0,0.1)";
            ctx.fillRect(tx, ty - t.h, 2, t.h);
            ctx.fillRect(tx + 15, ty - t.h + 10, 2, t.h - 10);

            // Copa (Múltiplos círculos para melhor visual)
            ctx.fillStyle = "#228B22";
            ctx.beginPath();
            ctx.arc(tx + 10, ty - t.h, 45, 0, Math.PI * 2); 
            ctx.arc(tx - 10, ty - t.h + 20, 30, 0, Math.PI * 2); 
            ctx.arc(tx + 30, ty - t.h + 20, 35, 0, Math.PI * 2); 
            ctx.fill();
            
            // Sombra/Detalhe na copa
            ctx.fillStyle = "rgba(0,0,0,0.2)";
            ctx.beginPath();
            ctx.arc(tx + 15, ty - t.h + 5, 20, 0, Math.PI * 2);
            ctx.fill();
        }
    });

    // 5. Plataformas
    platforms.forEach(p => {
        let px = p.x - cameraX;
        if (px > -200 && px < canvas.width) {
            // Desenha a plataforma como uma viga
            ctx.fillStyle = "#654321";
            ctx.fillRect(px, p.y, p.w, p.h);
            // Adiciona um pouco de grama no topo
            ctx.fillStyle = "#32CD32";
            ctx.fillRect(px, p.y - 5, p.w, 5); // Camada fina de grama
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

    ctx.beginPath();
    ctx.arc(0, 0, player.radius, 0, Math.PI * 2);
    ctx.fillStyle = "#FF69B4";
    ctx.fill();
    ctx.strokeStyle = "#C71585";
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(-10, -10, 8, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.fill();

    ctx.fillStyle = "white";
    ctx.beginPath(); ctx.arc(10, -10, 8, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(18, 5, 8, 0, Math.PI*2); ctx.fill();

    ctx.fillStyle = "black";
    ctx.beginPath(); ctx.arc(12, -10, 3, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(20, 5, 3, 0, Math.PI*2); ctx.fill();

    ctx.restore();
}

function loop() {
    if (gameStarted && !ending) physics();
    draw();
    requestAnimationFrame(loop);
}

loop();

// Lógica do botão Play
document.getElementById("playBtn").onclick = () => {
    document.getElementById("startScreen").style.display = "none";
    bgm.volume = 0.5;
    bgm.play();
    gameStarted = true;
    setupMobileControls();
};
