// --- CARGADOR DE IMÁGENES ---
const imgFondo = new Image(); imgFondo.src = "fondo.png";
const imgTigre = new Image(); imgTigre.src = "tigre.png";
const imgTigre2 = new Image(); imgTigre2.src = "tigre2.png";
const imgImpacto = new Image(); imgImpacto.src = "impacto.png";
const imgChoque = new Image(); imgChoque.src = "choque.png";
const imgChoque2 = new Image(); imgChoque2.src = "choque2.png";
const imgFrailejonSano = new Image(); imgFrailejonSano.src = "frailejon.png";
const imgFrailejonQuemado = new Image(); imgFrailejonQuemado.src = "frailejon_quemado.png";
const imgGato = new Image(); imgGato.src = "gato.png";
const imgCohete = new Image(); imgCohete.src = "cohete.png";
const imgAguaLimpia = new Image(); imgAguaLimpia.src = "agua_limpia.png";
const imgAguaSucia = new Image(); imgAguaSucia.src = "agua_sucia.png";
const imgPiso = new Image(); imgPiso.src = "piso.png";


const RES_BASE_ANCHO = 1366;
const RES_BASE_ALTO = 550;

let ANCHO_PANTALLA = RES_BASE_ANCHO;
let ALTO_PANTALLA = RES_BASE_ALTO;
let ALTURA_SUELO;

// --- MÚSICA DE FONDO ---
const musica = new Audio("sonido.mpeg");
musica.loop = true;
musica.volume = 0.5;


// Desbloqueo anticipado de audio en móvil
// (se registra más abajo, después de declarar los sonidos)



// --- SONIDOS DE IMPACTO ---
const sonidoCohete    = new Audio("impacto1.mpeg");
const sonidoFrailejon = new Audio("impacto2.mpeg");
const sonidoAgua      = new Audio("impacto3.mpeg");
sonidoCohete.preload    = "auto";
sonidoFrailejon.preload = "auto";
sonidoAgua.preload      = "auto";
sonidoCohete.volume    = 1.0;
sonidoFrailejon.volume = 1.0;
sonidoAgua.volume      = 1.0;

// Offset en segundos para saltar silencio inicial de cada archivo
const OFFSET_COHETE    = 0.0;
const OFFSET_FRAILEJON = 0.6;
const OFFSET_AGUA      = 1.0;

// Desbloqueo de audio en móvil: play()+pause() silencioso en el primer toque.
// En iOS/Android el navegador bloquea audio hasta la primera interacción del usuario.
// Hacemos esto sobre los HTMLAudioElement directamente (AudioContext.resume() NO es suficiente).
let audioDesbloqueado = false;
function desbloquearAudio() {
    if (audioDesbloqueado) return;
    audioDesbloqueado = true;
    [musica, sonidoCohete, sonidoFrailejon, sonidoAgua].forEach(audio => {
        const p = audio.play();
        if (p !== undefined) {
            p.then(() => { audio.pause(); audio.currentTime = 0; }).catch(() => {});
        }
    });
}
document.addEventListener("touchstart", desbloquearAudio, { once: true });
document.addEventListener("mousedown",  desbloquearAudio, { once: true });

function reproducirImpacto(sonido, offset = 0) {
    sonido.currentTime = offset;
    sonido.play().catch(() => {});
    const volOriginal = musica.volume;
    const pasos = 10;
    const intervalo = 15;
    let paso = 0;
    const fade = setInterval(() => {
        paso++;
        musica.volume = Math.max(0, volOriginal * (1 - paso / pasos));
        if (paso >= pasos) {
            clearInterval(fade);
            musica.pause();
            musica.volume = volOriginal;
        }
    }, intervalo);
    setTimeout(() => { sonido.pause(); sonido.currentTime = 0; }, 2000);
}

let musicaIniciada = false;

function iniciarMusica() {
    if (musicaIniciada) return;
    musica.currentTime = 1.0;
    const promesa = musica.play();
    if (promesa !== undefined) {
        promesa.then(() => {
            musicaIniciada = true; // solo marcamos éxito si realmente arrancó
        }).catch(() => {
            // En móvil puede fallar si el audio aún no está desbloqueado;
            // NO marcamos musicaIniciada=true para poder reintentar
        });
    } else {
        musicaIniciada = true;
    }
}

// --- VIDEO GATO VICTORIA ---
const videoGato = document.createElement("video");
videoGato.src = "gato_victoria.webm";
videoGato.preload = "auto";
videoGato.loop = true;
let videoGatoReproduciendo = false;

function mostrarVideoGato() {
    if (!videoGatoReproduciendo) {
        videoGato.currentTime = 0;
        videoGato.play().catch(() => {});
        videoGatoReproduciendo = true;
    }
}
function detenerVideoGato() {
    videoGato.pause();
    videoGato.currentTime = 0;
    videoGatoReproduciendo = false;
}

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const canvasChroma = document.createElement("canvas");
const ctxChroma = canvasChroma.getContext("2d", { willReadFrequently: true });


function ajustarResolucion() {

    // El canvas interno siempre tiene la misma resolución
    canvas.width = RES_BASE_ANCHO;
    canvas.height = RES_BASE_ALTO;

    // Escala para que entre en cualquier pantalla
    const escalaX = window.innerWidth / RES_BASE_ANCHO;
    const escalaY = window.innerHeight / RES_BASE_ALTO;

    const escala = Math.min(escalaX, escalaY);

    const anchoFinal = RES_BASE_ANCHO * escala;
    const altoFinal = RES_BASE_ALTO * escala;

    canvas.style.width = anchoFinal + "px";
    canvas.style.height = altoFinal + "px";

    // Centrar el canvas
    canvas.style.position = "fixed";
    canvas.style.left = ((window.innerWidth - anchoFinal) / 2) + "px";
    canvas.style.top = ((window.innerHeight - altoFinal) / 2) + "px";

    canvas.style.transform = "";
    canvas.style.transformOrigin = "";

    // La lógica del juego SIEMPRE usa la resolución base
    ANCHO_PANTALLA = RES_BASE_ANCHO;
    ALTO_PANTALLA = RES_BASE_ALTO;

    ALTURA_SUELO = ALTO_PANTALLA - 60;

    jugador.y = ALTURA_SUELO - jugador.alto;

    jefe.x = ANCHO_PANTALLA - 200;
    jefe.y = ALTURA_SUELO - jefe.alto + 40;
}

const GRAVEDAD = 0.7;
const VELOCIDAD_CAMINAR = 8;
const FUERZA_SALTO = 21;

let enMenu = true;
let gameOver = false;
let gameOverPendiente = false;
let distanciaRecorrida = 0;
let puntaje = 0;
let record = parseInt(localStorage.getItem("frailejonRunRecord") || "0", 10);

let tituloEscala = 1;
let tituloDir = 1;

const camara = { x: 0, actualizar(objetivoX) { this.x = objetivoX - ANCHO_PANTALLA / 4; if (this.x < 0) this.x = 0; } };

const keys = { ArrowRight: false, ArrowLeft: false, Space: false };
window.addEventListener("keydown", (e) => {
    if (e.code in keys) keys[e.code] = true;
    if (e.code === "Space") {
        if (enMenu) iniciarJuego();
        else if (gameOver) reiniciarJuego();
    }
});
window.addEventListener("keyup", (e) => { if (e.code in keys) keys[e.code] = false; });

canvas.addEventListener("mousedown", () => {
    iniciarMusica();
    if (enMenu) iniciarJuego();
    else if (gameOver) reiniciarJuego();
    else if (jugador.enElSuelo) { jugador.velY = -FUERZA_SALTO; jugador.enElSuelo = false; }
});
canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    iniciarMusica();
    if (enMenu) iniciarJuego();
    else if (gameOver) reiniciarJuego();
    else if (jugador.enElSuelo) { jugador.velY = -FUERZA_SALTO; jugador.enElSuelo = false; }
}, { passive: false });

const jugador = {
    x: 100, y: 0, ancho: 120, alto: 120, velX: 0, velY: 0, enElSuelo: true,
    impactado: false, chocado: false, hundiendose: false,
    contadorHundimiento: 0, charcoChoque: null, contadorAnimacion: 0,
    actualizar() {
        this.velX = VELOCIDAD_CAMINAR;
        if (keys.ArrowLeft) this.velX = VELOCIDAD_CAMINAR * 0.3;
        if (keys.Space && this.enElSuelo) { this.velY = -FUERZA_SALTO; this.enElSuelo = false; }
        this.velY += GRAVEDAD;
        this.x += this.velX;
        this.y += this.velY;
        if (this.x < 0) this.x = 0;
        if (this.y >= ALTURA_SUELO - this.alto) { this.y = ALTURA_SUELO - this.alto; this.velY = 0; this.enElSuelo = true; }
        if (this.enElSuelo) this.contadorAnimacion++;
        if (this.hundiendose && this.contadorHundimiento < 30) this.contadorHundimiento++;
    },
    dibujar() {
        let imagenActual;
        if (this.hundiendose) {
            if (imgChoque2.complete && imgChoque2.naturalWidth > 0 && this.charcoChoque) {
                const progreso = this.contadorHundimiento / 30;
                const totalH = this.alto + 70;
                const totalW = this.ancho + 140;
                const ocultarY = Math.floor(totalH * progreso * 0.6);
                const srcX = 0, srcY = ocultarY;
                const srcW = imgChoque2.naturalWidth;
                const srcH = imgChoque2.naturalHeight - ocultarY;
                const destH = totalH - ocultarY;
                const charco = this.charcoChoque;
                const centroX = charco.x + charco.ancho / 2;
                const nivelAgua = ALTURA_SUELO - charco.alto * 0.4 - 30;
                const destX = centroX - totalW / 2 - 30;
                const destY = nivelAgua - totalH * 0.5 + ocultarY;
                if (srcH > 0) ctx.drawImage(imgChoque2, srcX, srcY, srcW, srcH, destX, destY, totalW, destH);
            }
            return;
        } else if (this.chocado) {
            imagenActual = imgChoque;
        } else if (this.impactado) {
            imagenActual = imgImpacto;
        } else if (!this.enElSuelo) {
            imagenActual = imgTigre;
        } else {
            const f = Math.floor(this.contadorAnimacion / 8) % 2;
            imagenActual = f === 0 ? imgTigre : imgTigre2;
        }
        if (imagenActual && imagenActual.complete && imagenActual.naturalWidth > 0) {
            ctx.drawImage(imagenActual, this.x, this.y - 22, this.ancho + 30, this.alto + 22);
        } else if (imgTigre.complete) {
            ctx.drawImage(imgTigre, this.x, this.y - 22, this.ancho + 30, this.alto + 22);
        } else { ctx.fillStyle = "#FF8C00"; ctx.fillRect(this.x, this.y, this.ancho, this.alto); }
    }
};

const jefe = {
    x: 0, y: 0, ancho: 180, alto: 290, cooldownBarril: 0, cooldownMinimo: 140, framesEnSuelo: 0,
    actualizar() {
        if (jugador.enElSuelo) { this.framesEnSuelo++; } else { this.framesEnSuelo = 0; }
        this.cooldownBarril++;
        if (this.cooldownBarril < this.cooldownMinimo || gameOver) return;
        if (this.framesEnSuelo < 30) return;
        const xCohete = this.x + camara.x;
        const distancia = xCohete - (jugador.x + jugador.ancho / 2);
        const framesDeLlegada = Math.ceil(distancia / VELOCIDAD_CAMINAR);
        const xJugadorReal = jugador.x + VELOCIDAD_CAMINAR * framesDeLlegada;
        const hayConflicto = obstaculos.some(obs => obs.x + obs.ancho > xJugadorReal - 130 && obs.x < xJugadorReal + 130);
        const hayObstaculoCerca = obstaculos.some(obs => obs.x + obs.ancho > jugador.x + 50 && obs.x < jugador.x + 120);
        if (hayConflicto || hayObstaculoCerca) { this.cooldownMinimo = this.cooldownBarril + 20; return; }
        const dificultad = Math.min(puntaje / 50, 1);
        const rangoOffset = 1.5 + dificultad * 2.0;
        const velocidadCohete = 6.5 + (puntaje / 120) + (Math.random() - 0.5) * rangoOffset;
        barriles.push(new Barril(xCohete, ALTURA_SUELO - 90, velocidadCohete));
        this.cooldownBarril = 0;
        this.cooldownMinimo = 120 + Math.floor(Math.random() * 80);
    },
    dibujar() {
        if (imgGato.complete) { ctx.drawImage(imgGato, this.x, this.y, this.ancho, this.alto); }
        else { ctx.fillStyle = "#111111"; ctx.fillRect(this.x, this.y, this.ancho, this.alto); }
    }
};

class Barril {
    constructor(x, y, velocidad = 6.5) { this.x = x; this.y = y; this.radio = 30; this.velocidad = velocidad; }
    actualizar() { this.x -= this.velocidad; }
    dibujar() {
        if (imgCohete.complete) { ctx.drawImage(imgCohete, this.x - this.radio, this.y - this.radio, this.radio * 2, this.radio * 2); }
        else { ctx.fillStyle = "#FF0000"; ctx.fillRect(this.x - 20, this.y - 10, 40, 20); }
    }
}

let barriles = [];
let obstaculos = [];
let siguienteObstaculoX = 1000;
const CHARCO_ANCHO_MIN = 280, CHARCO_ANCHO_MAX = 320, CHARCO_ALTO = 180;

function generarObstaculo(x) {
    const tipo = Math.random() < 0.5 ? "frailejon" : "charco";
    if (tipo === "frailejon") return { x, ancho: 128, alto: 180, tipo: "frailejon", estado: "sano" };
    const ancho = CHARCO_ANCHO_MIN + Math.random() * (CHARCO_ANCHO_MAX - CHARCO_ANCHO_MIN);
    return { x, ancho, alto: CHARCO_ALTO, tipo: "charco", estado: "sano" };
}

function actualizarObstaculos() {
    const limiteDerecho = camara.x + ANCHO_PANTALLA + 400;
    while (siguienteObstaculoX < limiteDerecho) {
        obstaculos.push(generarObstaculo(siguienteObstaculoX));
        siguienteObstaculoX += 500 + Math.random() * 500;
    }
    obstaculos = obstaculos.filter(obs => obs.x + obs.ancho > camara.x - 300);
    barriles = barriles.filter(b => b.x > camara.x - 300);
}

function verificarInteracciones() {
    obstaculos.forEach(obs => {
        let obsY = obs.tipo === "frailejon" ? ALTURA_SUELO - obs.alto : ALTURA_SUELO - obs.alto * 0.4 - 25;
        const margenH = obs.ancho * 0.25;
        const hitX1 = obs.x + margenH, hitX2 = obs.x + obs.ancho - margenH;
        const hitY1 = obsY, hitY2 = obsY + obs.alto;
        const jugCentroX = jugador.x + jugador.ancho / 2;
        if (obs.estado === "sano" && !jugador.enElSuelo && jugCentroX > obs.x && jugCentroX < obs.x + obs.ancho) obs.estado = "alterado";
        if (jugador.x + jugador.ancho > hitX1 && jugador.x < hitX2 &&
            jugador.y + jugador.alto > hitY1 && jugador.y < hitY2) {
            if (!gameOverPendiente) {
                gameOverPendiente = true;
                if (obs.tipo === "charco") {
                    jugador.hundiendose = true;
                    jugador.contadorHundimiento = 0;
                    jugador.charcoChoque = obs;
                    reproducirImpacto(sonidoAgua, OFFSET_AGUA);
                } else {
                    jugador.chocado = true;
                    reproducirImpacto(sonidoFrailejon, OFFSET_FRAILEJON);
                }
                setTimeout(() => { gameOver = true; }, 2000);
            }
        }
    });
    barriles.forEach(barril => {
        const distX = Math.abs(barril.x - (jugador.x + jugador.ancho / 2));
        const distY = Math.abs(barril.y - (jugador.y + jugador.alto / 2));
        if (distX < (jugador.ancho / 4 + barril.radio * 0.5) && distY < (jugador.alto / 4 + barril.radio * 0.5) && !gameOverPendiente) {
            gameOverPendiente = true;
            jugador.impactado = true;
            reproducirImpacto(sonidoCohete, OFFSET_COHETE);
            setTimeout(() => { gameOver = true; }, 2000);
        }
    });
}

function dibujarEscenario() {
    if (imgPiso.complete && imgPiso.naturalWidth > 0) {
        const pisoY = ALTURA_SUELO - 50, pisoAlto = ALTO_PANTALLA - pisoY;
        const anchoTile = imgPiso.naturalWidth * (pisoAlto / imgPiso.naturalHeight);
        const inicioX = camara.x - (camara.x % anchoTile) - anchoTile;
        for (let tx = inicioX; tx < camara.x + ANCHO_PANTALLA + anchoTile; tx += anchoTile)
            ctx.drawImage(imgPiso, tx, pisoY, anchoTile, pisoAlto);
    } else { ctx.fillStyle = "#556B2F"; ctx.fillRect(camara.x - 50, ALTURA_SUELO, ANCHO_PANTALLA + 100, ALTO_PANTALLA); }

    obstaculos.forEach(obs => {
        let obsY = obs.tipo === "frailejon" ? ALTURA_SUELO - obs.alto : ALTURA_SUELO - obs.alto * 0.4 - 25;
        if (obs.tipo === "frailejon") {
            const img = obs.estado === "sano" ? imgFrailejonSano : imgFrailejonQuemado;
            if (img.complete) ctx.drawImage(img, obs.x, obsY, obs.ancho, obs.alto);
            else { ctx.fillStyle = obs.estado === "sano" ? "#2E8B57" : "#8B0000"; ctx.fillRect(obs.x, obsY, obs.ancho, obs.alto); }
        } else {
            const img = obs.estado === "sano" ? imgAguaLimpia : imgAguaSucia;
            if (img.complete) ctx.drawImage(img, obs.x, obsY, obs.ancho, obs.alto);
            else { ctx.fillStyle = obs.estado === "sano" ? "#00FFFF" : "#111111"; ctx.fillRect(obs.x, obsY, obs.ancho, obs.alto); }
        }
    });
}

function dibujarPuntaje() {
    const totalAncho = 160;
    const totalAlto = 90;
    const px = ANCHO_PANTALLA - totalAncho - 12;
    const py = 12;

    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
    ctx.strokeStyle = "rgba(255, 180, 50, 0.6)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(px, py, totalAncho, totalAlto, 10);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = "right";

    // Récord
    ctx.font = "bold 12px Arial";
    ctx.fillStyle = "#AAAAAA";
    ctx.fillText("RÉCORD DE HP", ANCHO_PANTALLA - 24, py + 18);
    ctx.font = "bold 20px Arial";
    ctx.fillStyle = "#FFD700";
    ctx.fillText(String(record).padStart(5, "0"), ANCHO_PANTALLA - 24, py + 38);

    // Separador
    ctx.strokeStyle = "rgba(255, 180, 50, 0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px + 12, py + 46);
    ctx.lineTo(px + totalAncho - 12, py + 46);
    ctx.stroke();

    // Nivel actual
    ctx.font = "bold 12px Arial";
    ctx.fillStyle = "#AAAAAA";
    ctx.fillText("NIVEL ACTUAL DE HP", ANCHO_PANTALLA - 24, py + 62);
    ctx.font = "bold 20px Arial";
    ctx.fillStyle = "#FF8C00";
    ctx.fillText(String(puntaje).padStart(5, "0"), ANCHO_PANTALLA - 24, py + 82);

    ctx.restore();
    ctx.textAlign = "left";
}

function dibujarCreditos() {
    const totalAncho = 160;
    const totalAlto = 44;
    const px = 12;
    const py = ALTO_PANTALLA - totalAlto - 12;

    ctx.save();
    ctx.fillStyle = "rgba(0, 0, 0, 0.45)";
    ctx.strokeStyle = "rgba(255, 180, 50, 0.6)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(px, py, totalAncho, totalAlto, 10);
    ctx.fill();
    ctx.stroke();

    ctx.textAlign = "left";
    ctx.font = "bold 12px Arial";
    ctx.fillStyle = "#AAAAAA";
    ctx.fillText("Creado por: Carta", px + 10, py + 16);

    ctx.font = "bold 12px Arial";
    ctx.fillStyle = "#FF8C00";
    ctx.fillText("IG: Alexander.cv7", px + 10, py + 33);

    ctx.restore();
}

function dibujarMenu() {
    const pw = Math.min(560, ANCHO_PANTALLA * 0.92);
    const ph = 280;
    const px = (ANCHO_PANTALLA - pw) / 2;
    const py = (ALTO_PANTALLA - ph) / 2 - 20;
    const r = 18;

    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 30;
    ctx.fillStyle = "rgba(20, 50, 20, 0.92)";
    ctx.beginPath();
    ctx.moveTo(px + r, py); ctx.lineTo(px + pw - r, py);
    ctx.quadraticCurveTo(px + pw, py, px + pw, py + r);
    ctx.lineTo(px + pw, py + ph - r);
    ctx.quadraticCurveTo(px + pw, py + ph, px + pw - r, py + ph);
    ctx.lineTo(px + r, py + ph);
    ctx.quadraticCurveTo(px, py + ph, px, py + ph - r);
    ctx.lineTo(px, py + r);
    ctx.quadraticCurveTo(px, py, px + r, py);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#E8A020";
    ctx.lineWidth = 3;
    ctx.stroke();

    tituloEscala += 0.002 * tituloDir;
    if (tituloEscala > 1.06) tituloDir = -1;
    if (tituloEscala < 0.97) tituloDir = 1;

    ctx.save();
    ctx.translate(ANCHO_PANTALLA / 2, py + 75);
    ctx.scale(tituloEscala, tituloEscala);
    ctx.textAlign = "center";
    ctx.font = "bold 52px Arial Black, Arial";
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 6;
    ctx.strokeText("VENCE AL TIGRE", 0, 0);
    ctx.fillStyle = "#FF6A00";
    ctx.fillText("VENCE AL TIGRE", 0, 0);
    ctx.fillStyle = "rgba(255,200,80,0.35)";
    ctx.fillText("VENCE AL TIGRE", 0, 0);
    ctx.restore();

    ctx.strokeStyle = "#E8A020";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(px + 30, py + 110); ctx.lineTo(px + pw - 30, py + 110);
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.font = "bold 16px Arial";
    ctx.fillStyle = "#AAAAAA";
    ctx.fillText("RÉCORD", ANCHO_PANTALLA / 2, py + 135);
    ctx.font = "bold 32px Arial";
    ctx.fillStyle = "#FFD700";
    ctx.fillText(String(record).padStart(5, "0"), ANCHO_PANTALLA / 2, py + 168);

    const bw = 220, bh = 48;
    const bx = (ANCHO_PANTALLA - bw) / 2;
    const by = py + ph - 68;
    ctx.fillStyle = "#E8600A";
    ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 10); ctx.fill();
    ctx.strokeStyle = "#FFB347"; ctx.lineWidth = 2; ctx.stroke();
    ctx.font = "bold 22px Arial"; ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    ctx.fillText("▶  JUGAR", ANCHO_PANTALLA / 2, by + 32);
    ctx.font = "14px Arial"; ctx.fillStyle = "#88AA88";
    ctx.fillText("ESPACIO o toca la pantalla", ANCHO_PANTALLA / 2, py + ph + 28);
    ctx.textAlign = "left";
}


function dibujarVideoConChroma(vidX, vidY, vidW, vidH) {
    if (videoGato.readyState < 2) return;

    // Solo redimensionar el canvas interno si cambió el tamaño (evita recrear contexto cada frame)
    if (canvasChroma.width !== vidW || canvasChroma.height !== vidH) {
        canvasChroma.width  = vidW;
        canvasChroma.height = vidH;
    }

    ctxChroma.drawImage(videoGato, 0, 0, vidW, vidH);
    const imageData = ctxChroma.getImageData(0, 0, vidW, vidH);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i+1], b = data[i+2];
        if (g > 100 && r < 100 && b < 100) {
            data[i+3] = 0;
        }
    }
    ctxChroma.putImageData(imageData, 0, 0);
    ctx.drawImage(canvasChroma, vidX, vidY, vidW, vidH);
}

function dibujarGameOver() {
    mostrarVideoGato();

    ctx.fillStyle = "rgba(0,0,0,0.72)";
    ctx.fillRect(0, 0, ANCHO_PANTALLA, ALTO_PANTALLA);

    const pw = Math.min(600, ANCHO_PANTALLA * 0.92);
    const ph = Math.min(ALTO_PANTALLA * 0.92, ALTO_PANTALLA - 20);
    const px = (ANCHO_PANTALLA - pw) / 2;
    const py = (ALTO_PANTALLA - ph) / 2;
    const r = 18;

    // --- PANEL ---
    ctx.fillStyle = "rgba(20, 50, 20, 0.95)";
    ctx.strokeStyle = "#E8A020"; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(px + r, py); ctx.lineTo(px + pw - r, py);
    ctx.quadraticCurveTo(px + pw, py, px + pw, py + r);
    ctx.lineTo(px + pw, py + ph - r);
    ctx.quadraticCurveTo(px + pw, py + ph, px + pw - r, py + ph);
    ctx.lineTo(px + r, py + ph);
    ctx.quadraticCurveTo(px, py + ph, px, py + ph - r);
    ctx.lineTo(px, py + r);
    ctx.quadraticCurveTo(px, py, px + r, py);
    ctx.closePath();
    ctx.fill(); ctx.stroke();

    // --- ZONAS proporcionales dentro del panel ---
    const zonaLetrero  = ph * 0.12;  // 12% arriba para el título
    const zonaVideo    = ph * 0.52;  // 52% para el video
    const zonaScores   = ph * 0.22;  // 22% para puntajes
    const zonaBoton    = ph * 0.14;  // 14% para el botón

    // --- LETRERO ---
    const letreroY = py + zonaLetrero * 0.75;
    const fontSize = Math.max(16, Math.min(36, pw * 0.07));
    ctx.textAlign = "center";
    ctx.font = `bold ${fontSize}px Arial Black, Arial`;
    ctx.strokeStyle = "#000"; ctx.lineWidth = 5;
    ctx.strokeText("¡SE SALVÓ EL PAÍS!", ANCHO_PANTALLA / 2, letreroY);
    ctx.fillStyle = "#FF4422";
    ctx.fillText("¡SE SALVÓ EL PAÍS!", ANCHO_PANTALLA / 2, letreroY);

    // Línea separadora tras letrero
    const sep1Y = py + zonaLetrero;
    ctx.strokeStyle = "#E8A020"; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(px + 30, sep1Y); ctx.lineTo(px + pw - 30, sep1Y);
    ctx.stroke();

    // --- VIDEO ---
    const vidAreaY = py + zonaLetrero;
    const vidAreaH = zonaVideo;
    const vidMaxW = pw * 1.4;  // más ancho que el panel
    const vidMaxH = vidAreaH * 1.6;  // más alto que su zona
    let vidW = vidMaxW;
    let vidH = vidW * (9 / 16);
    if (vidH > vidMaxH) { vidH = vidMaxH; vidW = vidH * (16 / 9); }
    const vidX = (ANCHO_PANTALLA - vidW) / 2;
    const vidY = py + 5;  // sube hasta casi el borde del panel, invade el letrero
    dibujarVideoConChroma(vidX, vidY, vidW, vidH);

    // --- PUNTAJES ---
    const scoresAreaY = py + zonaLetrero + zonaVideo;
    const sep2Y = scoresAreaY + zonaScores * 0.05;
    ctx.strokeStyle = "#E8A020"; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(px + 30, sep2Y); ctx.lineTo(px + pw - 30, sep2Y);
    ctx.stroke();

    const labelY = scoresAreaY + zonaScores * 0.35;
    const numY   = scoresAreaY + zonaScores * 0.75;
    const labelSize = Math.max(10, Math.min(13, pw * 0.022));
    const numSize   = Math.max(18, Math.min(32, pw * 0.055));
    const colL = ANCHO_PANTALLA / 2 - pw * 0.18;
    const colR = ANCHO_PANTALLA / 2 + pw * 0.18;

    ctx.font = `bold ${labelSize}px Arial`; ctx.fillStyle = "#AAAAAA";
    ctx.fillText("NIVEL ACTUAL DE HP", colL, labelY);
    ctx.fillText("RÉCORD DE HP", colR, labelY);
    ctx.font = `bold ${numSize}px Arial`; ctx.fillStyle = "#FFD700";
    ctx.fillText(String(puntaje).padStart(5, "0"), colL, numY);
    ctx.fillStyle = puntaje >= record ? "#FF6A00" : "#FFD700";
    ctx.fillText(String(record).padStart(5, "0"), colR, numY);
    if (puntaje >= record) {
        ctx.font = `bold ${labelSize}px Arial`; ctx.fillStyle = "#FF6A00";
        ctx.fillText("★ NUEVO RÉCORD ★", ANCHO_PANTALLA / 2, numY + zonaScores * 0.18);
    }

    // --- BOTÓN ---
    const botonAreaY = py + zonaLetrero + zonaVideo + zonaScores;
    const bh = Math.min(46, zonaBoton * 0.65);
    const bw = Math.min(220, pw * 0.5);
    const bx = (ANCHO_PANTALLA - bw) / 2;
    const by = botonAreaY + (zonaBoton - bh) / 2;
    ctx.fillStyle = "#E8600A";
    ctx.beginPath(); ctx.roundRect(bx, by, bw, bh, 10); ctx.fill();
    ctx.strokeStyle = "#FFB347"; ctx.lineWidth = 2; ctx.stroke();
    const btnFontSize = Math.max(14, Math.min(20, bh * 0.45));
    ctx.font = `bold ${btnFontSize}px Arial`; ctx.fillStyle = "#FFFFFF";
    ctx.fillText("↺  REINICIAR", ANCHO_PANTALLA / 2, by + bh * 0.65);
    ctx.textAlign = "left";
}

function iniciarJuego() {
    iniciarMusica();
    enMenu = false;
    reiniciarJuego();
}

function reiniciarJuego() {
    gameOver = false;
    gameOverPendiente = false;
    distanciaRecorrida = 0;
    puntaje = 0;
    jugador.x = 100;
    jugador.y = ALTURA_SUELO - jugador.alto;
    jugador.velY = 0;
    jugador.enElSuelo = true;
    jugador.impactado = false;
    jugador.chocado = false;
    jugador.hundiendose = false;
    jugador.contadorHundimiento = 0;
    jugador.charcoChoque = null;
    jugador.contadorAnimacion = 0;
    sonidoCohete.pause(); sonidoCohete.currentTime = 0;
    sonidoFrailejon.pause(); sonidoFrailejon.currentTime = 0;
    sonidoAgua.pause(); sonidoAgua.currentTime = 0;
    detenerVideoGato();
    musica.currentTime = 1.0;
    musica.play().catch(() => {});
    camara.x = 0;
    obstaculos = [];
    barriles = [];
    siguienteObstaculoX = 1000;
    jefe.cooldownBarril = 0;
    jefe.framesEnSuelo = 0;
}

// Límite de FPS — evita quemar CPU en móviles con pantallas de 90/120Hz
const FPS_LIMITE = 60;
const MS_POR_FRAME = 1000 / FPS_LIMITE;
let ultimoFrame = 0;

function loop(timestamp = 0) {
    const delta = timestamp - ultimoFrame;
    if (delta < MS_POR_FRAME) { requestAnimationFrame(loop); return; }
    ultimoFrame = timestamp - (delta % MS_POR_FRAME);

    if (imgFondo.complete) ctx.drawImage(imgFondo, 0, 0, ANCHO_PANTALLA, ALTO_PANTALLA);
    else { ctx.fillStyle = "#3a5fcd"; ctx.fillRect(0, 0, ANCHO_PANTALLA, ALTO_PANTALLA); }

    if (enMenu) {
        ctx.save();
        ctx.translate(-camara.x, 0);
        dibujarEscenario();
        jugador.dibujar();
        ctx.restore();
        jefe.dibujar();
        dibujarMenu();
        dibujarCreditos();
        requestAnimationFrame(loop);
        return;
    }

    if (!gameOver && !gameOverPendiente) {
        jugador.actualizar();
        jefe.actualizar();
        barriles.forEach(b => b.actualizar());
        camara.actualizar(jugador.x);
        actualizarObstaculos();
        verificarInteracciones();
        distanciaRecorrida += jugador.velX;
        puntaje = Math.floor(distanciaRecorrida / 10);
    }

    if (gameOver && puntaje > record) {
        record = puntaje;
        localStorage.setItem("frailejonRunRecord", String(record));
    }

    ctx.save();
    ctx.translate(-camara.x, 0);
    dibujarEscenario();
    barriles.forEach(b => b.dibujar());
    jugador.dibujar();
    ctx.restore();
    jefe.dibujar();
    dibujarPuntaje();
    dibujarCreditos();

    if (gameOver) dibujarGameOver();

    requestAnimationFrame(loop);
}



ajustarResolucion();
window.addEventListener("resize", ajustarResolucion);
loop();