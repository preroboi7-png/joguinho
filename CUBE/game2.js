const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// --- Áudios ---
const bgm = document.getElementById("bgm");
const bgmNoitada = document.getElementById("bgmNoitada");
const bgmCorre = document.getElementById("bgmCorre");
const jumpSound = document.getElementById("jumpSound");
const sfxRaio = document.getElementById("sfxRaio");
const sfxSusto = document.getElementById("sfxSusto");
const sfxHaha = document.getElementById("sfxHaha");

// --- Elementos de Interface ---
const dialogueBox = document.getElementById("dialogueBox");
const dialogueText = document.getElementById("dialogueText");
const dialogueHint = document.getElementById("dialogueHint");
const whiteOverlay = document.getElementById("whiteOverlay");
const blackOverlay = document.getElementById("blackOverlay");
const scareImage = document.getElementById("scareImage");

// --- Responsividade ---
function resizeCanvas() {
    const aspectRatio = 16 / 9;
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (w / h > aspectRatio) {
        canvas.style.width = `${h * aspectRatio}px`;
        canvas.style.height = `${h}px`;
    } else {
        canvas.style.width = `${w}px`;
        canvas.style.height = `${w / aspectRatio}px`;
    }
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// --- Controles ---
let keys = {};
let mobileKeys = { left: false, right: false, jump: false, interact: false };
let usingMobileControls = false;

window.addEventListener("keydown", e => keys[e.key] = true);
window.addEventListener("keyup", e => keys[e.key] = false);

// Setup Mobile
const leftBtn = document.getElementById("left-btn");
const rightBtn = document.getElementById("right-btn");
const jumpBtn = document.getElementById("jump-btn");
const eBtn = document.getElementById("e-btn");
const mobileControls = document.getElementById("mobile-controls");

function setupMobileBtn(btn, key) {
    btn.addEventListener("touchstart", (e) => { e.preventDefault(); mobileKeys[key] = true; usingMobileControls = true; });
    btn.addEventListener("touchend", (e) => { e.preventDefault(); mobileKeys[key] = false; });
    btn.addEventListener("mousedown", () => { mobileKeys[key] = true; usingMobileControls = true; });
    btn.addEventListener("mouseup", () => { mobileKeys[key] = false; });
}
setupMobileBtn(leftBtn, "left");
setupMobileBtn(rightBtn, "right");
setupMobileBtn(jumpBtn, "jump");

eBtn.addEventListener("click", () => {
    mobileKeys.interact = true;
    setTimeout(() => mobileKeys.interact = false, 100);
});

// --- Variáveis do Jogo ---
let gameStarted = false;
let isPaused = false;
let cameraX = 0;
const levelLength = 15000;

// Estados de Eventos
let events = {
    dialogue1: false,
    lightning: false,
    heartAppeared: false,
    heartCollected: false,
    dialogue2: false,
    dialogue3: false,
    chaseStarted: false,
    nearEnd: false
};

// --- Entidades ---
const player = { x: 100, y: 550, radius: 25, vx: 0, vy: 0, onGround: false, speed: 6, jumpStrength: -15, angle: 0 };
const shadowEnemy = { x: -200, y: 550, radius: 25, speed: 5.5, active: false, angle: 0 };
const heartObj = { x: 0, y: 0, active: false };
const door = { x: levelLength - 200, y: 500, w: 80, h: 120 };

// --- Mundo (Cidade) ---
const groundY = 600;
const buildings = [];
const streetLamps = [];
const benches = [];
const stars = [];

function initWorld() {
    for(let i=0; i<100; i++) {
        stars.push({ x: Math.random() * canvas.width, y: Math.random() * 400, size: Math.random() * 2 });
    }

    for (let i = 0; i < levelLength + 1000; i += Math.random() * 200 + 100) {
        let w = Math.random() * 150 + 80;
        let h = Math.random() * 300 + 100;
        buildings.push({ x: i, w: w, h: h, windows: [] });
        for(let wx = 10; wx < w - 20; wx+=30) {
            for(let wy = 10; wy < h - 20; wy+=40) {
                if(Math.random() > 0.6) {
                    buildings[buildings.length-1].windows.push({rx: wx, ry: wy});
                }
            }
        }
    }

    for (let i = 200; i < levelLength; i += 600) {
        streetLamps.push({ x: i });
    }

    for (let i = 400; i < levelLength; i += 900) {
        if(Math.random() > 0.3) benches.push({ x: i });
    }
}
initWorld();

// --- Sistema de Diálogo ---
function playDialogue(lines, isRed = false, callback) {
    isPaused = true;
    player.vx = 0;
    dialogueBox.style.display = "block";
    dialogueText.innerHTML = "";
    dialogueText.className = isRed ? "red-text" : "";
    
    let lineIndex = 0;
    let charIndex = 0;
    let currentText = lines[lineIndex];

    function typeChar() {
        if (charIndex < currentText.length) {
            dialogueText.innerHTML += currentText.charAt(charIndex);
            charIndex++;
            setTimeout(typeChar, 50);
        } else {
            dialogueHint.style.display = "block";
            let nextHandler = (e) => {
                if(e.type === 'keydown' && e.key !== 'e' && e.key !== 'E' && e.key !== 'Enter') return;
                
                window.removeEventListener("keydown", nextHandler);
                mobileControls.removeEventListener("click", nextHandler);
                
                dialogueHint.style.display = "none";
                lineIndex++;
                if (lineIndex < lines.length) {
                    currentText = lines[lineIndex];
                    charIndex = 0;
                    dialogueText.innerHTML = "";
                    setTimeout(typeChar, 200);
                } else {
                    dialogueBox.style.display = "none";
                    isPaused = false;
                    if (callback) callback();
                }
            };
            window.addEventListener("keydown", nextHandler);
            mobileControls.addEventListener("click", nextHandler);
        }
    }
    typeChar();
}

// --- Lógica de Eventos ---
function handleEvents() {
    // Evento 1: Diálogo Inicial
    if (!events.dialogue1 && player.x > 500) {
        events.dialogue1 = true;
        blackOverlay.style.opacity = 0.5;
        playDialogue([
            "Acabei-perdendo-o-ônibus...",
            "E-o-dia-escureceu-tão-rápido...",
            "Que-droga!",
            "...",
            "Esse-trabalho-está-me-matando...",
            "Como-meus-pais-devem-estar?",
            "...",
            "Tanto-faz.",
            "..."
        ], false, () => {
            blackOverlay.style.opacity = 0;
        });
    }

    // Evento 2: O Raio (Branco aparece INSTANTANEAMENTE, some devagar)
    if (!events.lightning && player.x > 4000) {
        events.lightning = true;
        bgm.pause();
        
        sfxRaio.currentTime = 0;
        sfxRaio.play();
        
        // 1. Remove a transição (para ser instantâneo)
        whiteOverlay.style.transition = "none";
        // 2. Fica branco imediatamente
        whiteOverlay.style.opacity = 1;

        // Spawna objeto
        heartObj.x = player.x + 400;
        heartObj.y = groundY - 60;
        heartObj.active = true;

        // 3. Aguarda um frame (50ms) e então restaura a transição para ele sumir devagar
        setTimeout(() => {
            whiteOverlay.style.transition = "opacity 5s ease-out"; // Demora 5s para sumir
            whiteOverlay.style.opacity = 0;
        }, 50);
    }

    // Evento 3: Coletar Coração (FICA PRETO ANTES DA IMAGEM)
    let distHeart = Math.abs(player.x - heartObj.x);
    if (heartObj.active && distHeart < 50 && !events.heartCollected) {
        let interact = keys["e"] || keys["E"] || mobileKeys.interact;
        if (interact) {
            events.heartCollected = true;
            heartObj.active = false;
            
            // 1. Fica preto primeiro
            blackOverlay.style.opacity = 1;

            // 2. Espera 1 segundo no escuro, depois mostra a imagem
            setTimeout(() => {
                scareImage.src = "coracao.png";
                scareImage.style.display = "block";

                // 3. Depois de ver a imagem, sai a imagem e entra o diálogo
                setTimeout(() => {
                    scareImage.style.display = "none";
                    blackOverlay.style.opacity = 0.5;
                    
                    playDialogue([
                        "Um-coração...",
                        "Será-que-alguém-o-perdeu?",
                        "De-toda-forma...",
                        "ele-já-sumiu...",
                        "...",
                        "Assim-como...",
                        "...",
                        "Estranho...",
                        "...",
                        "Será-que-foi-uma-boa-idéia...",
                        "Sair-de-casa...?",
                        "...",
                        "Por-rebeldia...?",
                        "...",
                        "Er...",
                        "Está cada vez mais escuro...",
                        "Não-posso-ficar-pensando-muito-ou-vou-acabar-dormindo-na-rua."
                    ], false, () => {
                        blackOverlay.style.opacity = 0;
                        bgmNoitada.volume = 0.6;
                        bgmNoitada.play();
                    });
                }, 2000);
            }, 1000);
        }
    }

    // Evento 4: Ameaça Vermelha
    if (!events.dialogue3 && events.heartCollected && player.x > 8000) {
        events.dialogue3 = true;
        bgmNoitada.pause();
        blackOverlay.style.opacity = 0.7;
        
        playDialogue([
            "Ei.",
            "Você-não-deveria-estar-aqui...",
            "...",
            "Hahahahahahahhahahahhaha"
        ], true, () => {
            blackOverlay.style.opacity = 0;
            spawnShadowEnemy();
        });
    }

    // Evento 5: Texto HAHAHA
    if (!events.nearEnd && player.x > door.x - 1500) {
        events.nearEnd = true;
        sfxHaha.play();
    }
}

function spawnShadowEnemy() {
    events.chaseStarted = true;
    shadowEnemy.x = player.x - 600;
    shadowEnemy.active = true;
    
    bgmCorre.currentTime = 0;
    bgmCorre.play();
}

// --- Física ---
function physics() {
    if (isPaused) return;

    // Controles Player
    let moveRight = keys["ArrowRight"] || keys["d"] || keys["D"] || mobileKeys.right;
    let moveLeft = keys["ArrowLeft"] || keys["a"] || keys["A"] || mobileKeys.left;
    let doJump = keys[" "] || keys["ArrowUp"] || keys["w"] || keys["W"] || mobileKeys.jump;
    let doInteract = keys["e"] || keys["E"] || mobileKeys.interact;

    if (moveRight) { player.vx = player.speed; player.angle += 0.2; }
    else if (moveLeft) { player.vx = -player.speed; player.angle -= 0.2; }
    else { player.vx = 0; }
    
    player.x += player.vx;

    if (doJump && player.onGround) {
        player.vy = player.jumpStrength;
        player.onGround = false;
        jumpSound.currentTime = 0;
        jumpSound.play();
    }
    
    player.vy += 0.8;
    player.y += player.vy;

    // Colisão Chão
    if (player.y + player.radius > groundY) {
        player.y = groundY - player.radius;
        player.vy = 0;
        player.onGround = true;
    }

    // (Sem colisão com bancos)

    // --- Física do Inimigo ---
    if (shadowEnemy.active) {
        if (shadowEnemy.x < player.x) shadowEnemy.x += shadowEnemy.speed;
        else shadowEnemy.x -= shadowEnemy.speed;
        
        shadowEnemy.angle += 0.3;
        shadowEnemy.y = groundY - shadowEnemy.radius;

        let dx = player.x - shadowEnemy.x;
        let dy = player.y - shadowEnemy.y;
        let dist = Math.sqrt(dx*dx + dy*dy);
        
        if (dist < player.radius + shadowEnemy.radius) {
            triggerJumpScare(true);
        }
    }

    // --- Câmera ---
    cameraX = player.x - 300;
    if (cameraX < 0) cameraX = 0;
    if (cameraX > levelLength - canvas.width) cameraX = levelLength - canvas.width;

    // --- Checar Porta ---
    if (player.x > door.x && player.x < door.x + door.w && doInteract) {
        triggerJumpScare(false); // Passou de fase
    }

    handleEvents();
}

function triggerJumpScare(isDeath) {
    isPaused = true;
    bgmCorre.pause();
    bgmNoitada.pause();
    
    sfxSusto.play();
    scareImage.src = "susto.png";
    scareImage.style.display = "block";
    
    blackOverlay.style.opacity = 1;

    setTimeout(() => {
        scareImage.style.display = "none";
        
        if (isDeath) {
            location.reload();
        } else {
            // Garante que a transição seja suave (3s) para o final
            whiteOverlay.style.transition = "opacity 3s ease-in-out";
            whiteOverlay.style.opacity = 1;
            
            setTimeout(() => {
                alert("FIM DA DEMO / PRÓXIMA FASE");
                location.reload();
            }, 3000);
        }
    }, 2000);
}

// --- Desenho ---
function draw() {
    // 1. Céu Escuro
    let gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "#050510");
    gradient.addColorStop(1, "#1a1a2e");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Estrelas e Lua
    ctx.fillStyle = "white";
    stars.forEach(s => {
        ctx.fillRect(s.x, s.y, s.size, s.size);
    });
    ctx.beginPath();
    ctx.arc(canvas.width - 100, 100, 40, 0, Math.PI*2);
    ctx.fillStyle = "#eee";
    ctx.fill();

    // 3. Prédios
    ctx.fillStyle = "#111";
    buildings.forEach(b => {
        let renderX = b.x - cameraX * 0.5;
        if(renderX > -200 && renderX < canvas.width) {
            ctx.fillRect(renderX, groundY - b.h, b.w, b.h);
            ctx.fillStyle = "#333";
            b.windows.forEach(w => {
                ctx.fillStyle = Math.random() > 0.95 ? "#554400" : "#222";
                ctx.fillRect(renderX + w.rx, groundY - b.h + w.ry, 15, 20);
            });
            ctx.fillStyle = "#111";
        }
    });

    // 4. Postes de Luz
    streetLamps.forEach(l => {
        let lx = l.x - cameraX;
        if(lx > -100 && lx < canvas.width + 100) {
            ctx.fillStyle = "#333";
            ctx.fillRect(lx, groundY - 250, 10, 250);
            ctx.beginPath();
            ctx.arc(lx + 5, groundY - 250, 15, 0, Math.PI*2);
            ctx.fillStyle = "#FFA500";
            ctx.fill();
            let g = ctx.createRadialGradient(lx+5, groundY-250, 5, lx+5, groundY-250, 150);
            g.addColorStop(0, "rgba(255, 165, 0, 0.4)");
            g.addColorStop(1, "rgba(0,0,0,0)");
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(lx+5, groundY-250, 150, 0, Math.PI*2); ctx.fill();
        }
    });

    // 5. Asfalto
    ctx.fillStyle = "#2a2a2a";
    ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
    ctx.fillStyle = "#444";
    for(let i=0; i<canvas.width; i+=100) {
        ctx.fillRect(i - (cameraX % 100), groundY + 80, 60, 10);
    }

    // 6. Bancos
    ctx.fillStyle = "#3d2b1f";
    benches.forEach(b => {
        let bx = b.x - cameraX;
        if(bx > -100 && bx < canvas.width) {
            ctx.fillRect(bx, groundY - 30, 60, 30);
            ctx.fillStyle = "#222";
            ctx.fillRect(bx+5, groundY - 15, 50, 5);
            ctx.fillStyle = "#3d2b1f";
        }
    });

    // 7. Porta Final (Nova entrada de apartamento)
    let dx = door.x - cameraX;
    
    // Define novas dimensões para a fachada de prédio que envolve a porta
    const facadeW = 200;
    const facadeH = 300;
    // Centraliza a fachada sobre a coordenada X da porta de referência
    const facadeX = door.x - (facadeW - door.w) / 2;
    const renderX = facadeX - cameraX;
    
    // Desenhar a entrada apenas se visível
    if(renderX > -facadeW && renderX < canvas.width) {
        
        // Desenha a fachada de concreto/pedra
        ctx.fillStyle = "#444";
        ctx.fillRect(renderX, groundY - facadeH, facadeW, facadeH);
        
        // Define as dimensões da área da porta dupla
        const doorDrawW = 100;
        const doorDrawH = 150;
        const doorDrawX = renderX + (facadeW - doorDrawW) / 2;
        const doorDrawY = groundY - doorDrawH;
        
        // Moldura (reentrância) - Preto
        ctx.fillStyle = "#222";
        ctx.fillRect(doorDrawX - 5, doorDrawY - 5, doorDrawW + 10, doorDrawH + 5);
        
        // Portas (Marrom Escuro)
        ctx.fillStyle = "#5d4037";
        ctx.fillRect(doorDrawX, doorDrawY, doorDrawW, doorDrawH);
        
        // Divisão Vertical da Porta Dupla
        ctx.fillStyle = "#3d2b1f";
        ctx.fillRect(doorDrawX + doorDrawW / 2 - 2, doorDrawY, 4, doorDrawH);
        
        // Janela/Transom acima da porta
        ctx.fillStyle = "#555";
        ctx.fillRect(doorDrawX, doorDrawY - 30, doorDrawW, 20);
        ctx.fillStyle = "yellow"; // Luz Amarela
        ctx.fillRect(doorDrawX + 5, doorDrawY - 25, doorDrawW - 10, 10);
        
        // Desenha o texto do susto
        if (events.nearEnd) {
             ctx.font = "bold 60px 'Courier New'";
             ctx.fillStyle = `rgba(255, 0, 0, ${Math.random() * 0.5 + 0.5})`;
             // Posiciona o texto acima da fachada
             ctx.fillText("AHAHAHHAHA", renderX + facadeW/2 - 100 + (Math.random()*5), groundY - facadeH - 50 + (Math.random()*5));
             
             ctx.font = "bold 40px 'Courier New'";
             ctx.fillText("HAHA", renderX + facadeW/2 + (Math.random()*5), groundY - facadeH + 20 + (Math.random()*5));
        }
    }

    // 8. Coração
    if(heartObj.active) {
        let hx = heartObj.x - cameraX;
        ctx.fillStyle = "red";
        ctx.beginPath();
        let topCurveHeight = 15;
        ctx.moveTo(hx, heartObj.y + topCurveHeight);
        ctx.bezierCurveTo(hx, heartObj.y, hx - 20, heartObj.y, hx - 20, heartObj.y + topCurveHeight);
        ctx.bezierCurveTo(hx - 20, heartObj.y + (topCurveHeight + 15), hx, heartObj.y + (topCurveHeight + 25), hx, heartObj.y + 40);
        ctx.bezierCurveTo(hx, heartObj.y + (topCurveHeight + 25), hx + 20, heartObj.y + (topCurveHeight + 15), hx + 20, heartObj.y + topCurveHeight);
        ctx.bezierCurveTo(hx + 20, heartObj.y, hx, heartObj.y, hx, heartObj.y + topCurveHeight);
        ctx.fill();
        
        ctx.shadowBlur = 15;
        ctx.shadowColor = "red";
        ctx.fill();
        ctx.shadowBlur = 0;

        if(Math.abs(player.x - heartObj.x) < 80) {
            ctx.fillStyle = "white";
            ctx.font = "20px Arial";
            ctx.fillText("[E]", hx - 10, heartObj.y - 20);
        }
    }

    // 9. Inimigo
    if (shadowEnemy.active) {
        let ex = shadowEnemy.x - cameraX;
        ctx.save();
        ctx.translate(ex, shadowEnemy.y);
        ctx.rotate(shadowEnemy.angle);
        
        ctx.beginPath();
        ctx.arc(0, 0, shadowEnemy.radius, 0, Math.PI*2);
        ctx.fillStyle = "black";
        ctx.fill();
        ctx.shadowBlur = 20;
        ctx.shadowColor = "red";
        ctx.stroke();
        ctx.shadowBlur = 0;

        ctx.fillStyle = "red";
        ctx.beginPath(); ctx.arc(-8, -5, 6, 0, Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(8, -5, 6, 0, Math.PI*2); ctx.fill();
        
        ctx.restore();
    }

    // 10. Player
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
    ctx.fillStyle = "white";
    ctx.beginPath(); ctx.arc(10, -10, 8, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(18, 5, 8, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "black";
    ctx.beginPath(); ctx.arc(12, -10, 3, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(20, 5, 3, 0, Math.PI*2); ctx.fill();
    ctx.restore();
}

function loop() {
    if (gameStarted) physics();
    draw();
    requestAnimationFrame(loop);
}
loop();

// --- CORREÇÃO DO BOTÃO "COMEÇAR" ---
document.getElementById("playBtn").onclick = () => {
    document.getElementById("startScreen").style.display = "none";
    
    // Tenta tocar o áudio. O try/catch ou a Promise garante que o resto do código seja executado
    // mesmo que o navegador bloqueie a reprodução automática.
    bgm.volume = 0.5;
    try {
        bgm.play().catch(e => console.warn("Falha ao tocar BGM (provavelmente bloqueio de autoplay)", e));
    } catch (e) {
        console.warn("Falha ao tentar play() no BGM.", e);
    }
    
    // Inicia o jogo e mostra os controles, resolvendo o problema de "não clicável"
    gameStarted = true;
    mobileControls.classList.add('active');
};