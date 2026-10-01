console.log("🎛️ Motor AIMP Player Multi-Instancia cargado.");

// Canal maestro compartido (Singleton)
window.AimpMaster = window.AimpMaster || {
    audio: new Audio(),
    activeWindowId: null,
    isPlaying: false,
    currentTrackIndex: -1,
    randomMode: false,
    playlist: [],
    durations: {}, // Cache de duraciones { "track.mp3": 240 }

    stopAll() {
        this.audio.pause();
        this.audio.currentTime = 0;
        this.isPlaying = false;
        document.querySelectorAll(".aimp-btn-play").forEach(btn => btn.innerHTML = '<i class="glyphicon glyphicon-play"></i>');
        document.querySelectorAll(".aimp-playlist-item").forEach(item => item.classList.remove("playing"));
    }
};

// ================================================================================================================= //
// DISPARADOR GLOBAL: ABRE UNA INSTANCIA FLOTANTE DE ÁLBUM
// ================================================================================================================= //
window.abrirAimpPlayer = async function(album) {
    let workspace = document.getElementById("aimp-floating-workspace");
    if (!workspace) {
        workspace = document.createElement("div");
        workspace.id = "aimp-floating-workspace";
        document.body.appendChild(workspace);
    }

    const winId = `aimp-win-${album.id}`;
    let win = document.getElementById(winId);

    // Si ya existe, la traemos al frente
    if (win) {
        traerAlFrente(win);
        return;
    }

    // Calcular desplazamiento escalonado para no superponer exacto
    const offset = (document.querySelectorAll(".aimp-window").length * 30) % 200;
    const topPos = Math.max(80, 100 + offset);
    const leftPos = Math.max(30, (window.innerWidth - 420) - offset);

    win = document.createElement("div");
    win.id = winId;
    win.className = "aimp-window";
    win.style.top = `${topPos}px`;
    win.style.left = `${leftPos}px`;
    win.style.zIndex = 1060 + document.querySelectorAll(".aimp-window").length;

    win.innerHTML = `
        <div class="aimp-header" id="${winId}-header">
            <span class="aimp-header-title">🎵 ${album.album_artist} - ${album.album_name}</span>
            <div>
                <button class="aimp-header-btn" id="${winId}-min"><i class="glyphicon glyphicon-minus"></i></button>
                <button class="aimp-header-btn" id="${winId}-close"><i class="glyphicon glyphicon-remove"></i></button>
            </div>
        </div>

        <div class="aimp-body" id="${winId}-body">
            <!-- Pantalla LCD con Miniatura de Portada Interactiva -->
            <div class="aimp-display-panel">
                <div class="aimp-marquee" id="${winId}-marquee">STOPPED :: ${album.album_artist} - ${album.album_name}</div>
                <div class="aimp-display-body" style="display: flex; align-items: center; margin-top: 6px;">
                    <div class="aimp-cover-box" style="width: 68px; height: 68px; min-width: 68px; border-radius: 4px; border: 1px solid #3a4146; background: #000; box-shadow: inset 0 0 5px rgba(0,0,0,0.8), 0 2px 5px rgba(0,0,0,0.5); overflow: hidden; margin-right: 10px; display: flex; align-items: center; justify-content: center; cursor: pointer;" title="Haga clic para ver la reseña del álbum">
                        <img id="${winId}-cover"
                             src="/img/no-cover.png"
                             alt="Portada"
                             style="width: 100%; height: 100%; object-fit: cover; display: block;"
                             onerror="this.onerror=null; this.src='/img/no-cover.png';">
                    </div>
                    <div class="aimp-lcd-wrapper" style="flex-grow: 1; overflow: hidden;">
                        <div class="aimp-lcd-grid" style="display: flex; justify-content: space-between; align-items: center;">
                            <div class="aimp-time-digits" id="${winId}-timer">00:00</div>
                            <div class="aimp-meta-info">
                                <span id="${winId}-track-idx">0 / 0</span><br>
                                <span id="${winId}-album-total-time">Total: --:--</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- SeekBar de Progreso -->
            <div class="aimp-progress-container">
                <div class="aimp-progress-bar" id="${winId}-progress">
                    <div class="aimp-progress-fill" id="${winId}-fill"></div>
                </div>
            </div>

            <!-- Botonera Analógica -->
            <div class="aimp-controls">
                <button class="aimp-btn" id="${winId}-btn-rew" title="Pista Anterior"><i class="glyphicon glyphicon-backward"></i></button>
                <button class="aimp-btn aimp-btn-play" id="${winId}-btn-play" title="Play / Pause"><i class="glyphicon glyphicon-play"></i></button>
                <button class="aimp-btn" id="${winId}-btn-stop" title="Stop"><i class="glyphicon glyphicon-stop"></i></button>
                <button class="aimp-btn" id="${winId}-btn-fwd" title="Siguiente Pista"><i class="glyphicon glyphicon-forward"></i></button>
                <button class="aimp-btn" id="${winId}-btn-rnd" title="Modo Aleatorio (Random)"><i class="glyphicon glyphicon-random"></i></button>
            </div>

            <!-- Cabecera de Lista -->
            <div class="aimp-playlist-header">
                <span>PISTAS DEL ÁLBUM</span>
                <span id="${winId}-tracks-count">Cargando...</span>
            </div>

            <!-- Lista de Pistas -->
            <ul class="aimp-playlist" id="${winId}-playlist">
                <li class="aimp-playlist-item text-center">⏳ Explorando canciones...</li>
            </ul>
        </div>
    `;

    workspace.appendChild(win);
    traerAlFrente(win);
    hacerDraggable(win, document.getElementById(`${winId}-header`));

    // Cerrar y Minimizar
    document.getElementById(`${winId}-close`).onclick = () => {
        if (window.AimpMaster.activeWindowId === winId) {
            window.AimpMaster.stopAll();
        }
        win.remove();
    };

    let minimizado = false;
    document.getElementById(`${winId}-min`).onclick = () => {
        minimizado = !minimizado;
        document.getElementById(`${winId}-body`).style.display = minimizado ? "none" : "block";
    };

    // Traer al frente al hacer clic en cualquier parte de la ventana
    win.addEventListener("mousedown", () => traerAlFrente(win));

    // Cargar pistas del álbum y portada desde el backend en C
    await inicializarAlbumTracks(winId, album);
};

// ================================================================================================================= //
// INICIALIZACIÓN DE TRACKS, TIEMPOS, PORTADA Y EVENTOS DE LA VENTANA
// ================================================================================================================= //
async function inicializarAlbumTracks(winId, album) {
    const listContainer = document.getElementById(`${winId}-playlist`);
    const countLabel = document.getElementById(`${winId}-tracks-count`);
    const totalTimeLabel = document.getElementById(`${winId}-album-total-time`);
    const imgCover = document.getElementById(`${winId}-cover`);

    // 1. Cargar la portada del álbum desde el backend vía POST /music/art
    if (imgCover) {
        try {
            fetch(window.API_BASE_URL + "/music/art", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: `id=${encodeURIComponent(album.id)}`
            })
            .then(res => res.json())
            .then(data => {
                if (data.status === "ok" && data.data) {
                    imgCover.src = data.data;
                }
            })
            .catch(() => {});
        } catch (e) {}

        // Evento click sobre la portada para abrir el modal con album_bio
        const coverBox = imgCover.closest(".aimp-cover-box");
        if (coverBox) {
            coverBox.onclick = (e) => {
                e.stopPropagation();
                mostrarModalBioAlbum(album, imgCover.src);
            };
        }
    }

    let tracks = [];

    // 2. Obtener pistas del directorio
    try {
        const resp = await fetch(window.API_BASE_URL + "/player/tracks", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: `id=${encodeURIComponent(album.id)}`
        });
        const res = await resp.json();
        if (res.status === "ok" && res.tracks && res.tracks.length > 0) {
            tracks = res.tracks;
        }
    } catch (e) {
        console.error("Error al obtener tracks:", e);
    }

    if (tracks.length === 0) {
        listContainer.innerHTML = `<li class="aimp-playlist-item text-danger">No se hallaron .mp3 en la carpeta.</li>`;
        countLabel.textContent = "0 pistas";
        return;
    }

    countLabel.textContent = `${tracks.length} pistas`;
    listContainer.innerHTML = "";

    // 3. Poblar la lista de pistas
    tracks.forEach((track, index) => {
        const li = document.createElement("li");
        li.className = "aimp-playlist-item";
        li.id = `${winId}-track-${index}`;
        const cleanName = track.replace(/\.mp3$/i, "");

        li.innerHTML = `
            <span class="aimp-playlist-item-title">${cleanName}</span>
            <span class="aimp-playlist-item-dur" id="${winId}-dur-${index}">--:--</span>
        `;

        li.onclick = () => {
            activarYReproducir(winId, album, tracks, index);
        };

        listContainer.appendChild(li);

        // Pre-calcular duración sin bloquear
        obtenerDuracionTrack(album.id, track, (durSeg) => {
            const spanDur = document.getElementById(`${winId}-dur-${index}`);
            if (spanDur) spanDur.textContent = formatearTiempo(durSeg);
            actualizarTotalAlbum(winId, tracks, album.id);
        });
    });

    // 4. Asignar controles de la botonera
    const btnPlay = document.getElementById(`${winId}-btn-play`);
    const btnStop = document.getElementById(`${winId}-btn-stop`);
    const btnRew = document.getElementById(`${winId}-btn-rew`);
    const btnFwd = document.getElementById(`${winId}-btn-fwd`);
    const btnRnd = document.getElementById(`${winId}-btn-rnd`);

    btnPlay.onclick = () => {
        if (window.AimpMaster.activeWindowId === winId && window.AimpMaster.isPlaying) {
            // Pausa
            window.AimpMaster.audio.pause();
            window.AimpMaster.isPlaying = false;
            btnPlay.innerHTML = '<i class="glyphicon glyphicon-play"></i>';
        } else if (window.AimpMaster.activeWindowId === winId && !window.AimpMaster.isPlaying) {
            // Reanudar
            window.AimpMaster.audio.play();
            window.AimpMaster.isPlaying = true;
            btnPlay.innerHTML = '<i class="glyphicon glyphicon-pause"></i>';
        } else {
            // Iniciar primera pista
            activarYReproducir(winId, album, tracks, 0);
        }
    };

    btnStop.onclick = () => {
        if (window.AimpMaster.activeWindowId === winId) {
            window.AimpMaster.stopAll();
            document.getElementById(`${winId}-timer`).textContent = "00:00";
            document.getElementById(`${winId}-fill`).style.width = "0%";
            document.getElementById(`${winId}-marquee`).textContent = `STOPPED :: ${album.album_artist} - ${album.album_name}`;
        }
    };

    btnFwd.onclick = () => {
        if (window.AimpMaster.activeWindowId !== winId) return;
        let nextIndex;
        if (window.AimpMaster.randomMode) {
            nextIndex = Math.floor(Math.random() * tracks.length);
        } else {
            nextIndex = (window.AimpMaster.currentTrackIndex + 1) % tracks.length;
        }
        activarYReproducir(winId, album, tracks, nextIndex);
    };

    btnRew.onclick = () => {
        if (window.AimpMaster.activeWindowId !== winId) return;
        let prevIndex = window.AimpMaster.currentTrackIndex - 1;
        if (prevIndex < 0) prevIndex = tracks.length - 1;
        activarYReproducir(winId, album, tracks, prevIndex);
    };

    btnRnd.onclick = () => {
        window.AimpMaster.randomMode = !window.AimpMaster.randomMode;
        btnRnd.classList.toggle("active-state", window.AimpMaster.randomMode);
    };

    // Barra de progreso seekbar
    const progressBar = document.getElementById(`${winId}-progress`);
    progressBar.onclick = (e) => {
        if (window.AimpMaster.activeWindowId !== winId || !window.AimpMaster.audio.duration) return;
        const rect = progressBar.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        window.AimpMaster.audio.currentTime = pos * window.AimpMaster.audio.duration;
    };
}

// ================================================================================================================= //
// MODAL PARA MOSTRAR RESEÑA / ALBUM_BIO
// ================================================================================================================= //
function mostrarModalBioAlbum(album, coverSrc) {
    let modal = document.getElementById("modal-player-album-bio");

    if (!modal) {
        modal = document.createElement("div");
        modal.id = "modal-player-album-bio";
        modal.className = "modal fade";
        modal.tabIndex = -1;
        modal.role = "dialog";
        modal.style.zIndex = "1090"; // Garantiza visibilidad por encima de las ventanas flotantes

        modal.innerHTML = `
            <div class="modal-dialog" role="document">
                <div class="modal-content" style="background: #25282c; color: #e0e0e0; border: 1px solid #444c54; border-radius: 6px; box-shadow: 0 10px 30px rgba(0,0,0,0.8);">
                    <div class="modal-header" style="border-bottom: 1px solid #373e44; padding: 12px 15px;">
                        <button type="button" class="close" data-dismiss="modal" style="color: #fff; opacity: 0.8;">&times;</button>
                        <h4 class="modal-title" id="bio-modal-title" style="color: #00e5ff; font-weight: bold; font-size: 15px;">
                            <span class="glyphicon glyphicon-book"></span> Reseña del Álbum
                        </h4>
                    </div>
                    <div class="modal-body" style="padding: 15px;">
                        <div class="row">
                            <div class="col-sm-4 text-center">
                                <img id="bio-modal-cover" src="/img/no-cover.png" alt="Portada"
                                     class="img-thumbnail"
                                     style="max-width: 100%; border-radius: 6px; border: 1px solid #444; box-shadow: 0 4px 8px rgba(0,0,0,0.6); margin-bottom: 10px;">
                            </div>
                            <div class="col-sm-8">
                                <h4 id="bio-modal-album-name" style="margin-top: 0; color: #fff; font-weight: bold;"></h4>
                                <p style="margin-bottom: 5px;"><strong>Artista:</strong> <span id="bio-modal-artist" style="color: #b0c4de;"></span></p>
                                <p style="margin-bottom: 5px;"><strong>Año:</strong> <span id="bio-modal-year"></span> &nbsp;|&nbsp; <strong>Género:</strong> <span id="bio-modal-genre"></span></p>
                                <hr style="border-top: 1px solid #373e44; margin: 10px 0;">
                                <label style="color: #8fa0ad; font-size: 12px; text-transform: uppercase;">Biopic / Información:</label>
                                <div id="bio-modal-text" style="line-height: 1.6; font-size: 13px; color: #d0d7de; max-height: 220px; overflow-y: auto; white-space: pre-wrap; padding-right: 5px;"></div>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer" style="border-top: 1px solid #373e44; padding: 10px 15px;">
                        <button type="button" class="btn btn-danger btn-sm" data-dismiss="modal">
                            <span class="glyphicon glyphicon-remove"></span> Cerrar
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // Actualizar contenido con los datos del álbum clickeado
    document.getElementById("bio-modal-cover").src = coverSrc || "/img/no-cover.png";
    document.getElementById("bio-modal-album-name").textContent = album.album_name || "Álbum Desconocido";
    document.getElementById("bio-modal-artist").textContent = album.album_artist || "Artista Desconocido";
    document.getElementById("bio-modal-year").textContent = album.album_year || "S/D";
    document.getElementById("bio-modal-genre").textContent = album.album_genre || "S/D";

    const bioText = (album.album_bio && album.album_bio.trim() !== "")
        ? album.album_bio
        : "No hay reseña o biografía disponible para este álbum.";
    document.getElementById("bio-modal-text").textContent = bioText;

    // Ajuste del z-index del backdrop para que no cubra el modal
    $(modal).on("show.bs.modal", function() {
        setTimeout(() => {
            $(".modal-backdrop").last().css("z-index", 1085);
        }, 0);
    });

    $(modal).modal("show");
}

// ================================================================================================================= //
// REPRODUCCIÓN CENTRALIZADA EN EL CANAL MAESTRO
// ================================================================================================================= //
async function activarYReproducir(winId, album, tracks, index) {
    window.AimpMaster.stopAll();

    window.AimpMaster.activeWindowId = winId;
    window.AimpMaster.currentTrackIndex = index;
    window.AimpMaster.playlist = tracks;

    const trackName = tracks[index];
    const marquee = document.getElementById(`${winId}-marquee`);
    const trackIdx = document.getElementById(`${winId}-track-idx`);
    const btnPlay = document.getElementById(`${winId}-btn-play`);

    if (marquee) marquee.textContent = `LOADING :: ${trackName.replace(/\.mp3$/i, "")}`;
    if (trackIdx) trackIdx.textContent = `${index + 1} / ${tracks.length}`;

    // Marcar item en lista
    document.querySelectorAll(`#${winId}-playlist .aimp-playlist-item`).forEach(el => el.classList.remove("playing"));
    const currentLi = document.getElementById(`${winId}-track-${index}`);
    if (currentLi) currentLi.classList.add("playing");

    try {
        const resp = await fetch(window.API_BASE_URL + "/player/stream", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: `id=${encodeURIComponent(album.id)}&file=${encodeURIComponent(trackName)}`
        });
        const res = await resp.json();

        if (res.status === "ok" && res.audio) {
            window.AimpMaster.audio.src = res.audio;
            window.AimpMaster.audio.play();
            window.AimpMaster.isPlaying = true;

            btnPlay.innerHTML = '<i class="glyphicon glyphicon-pause"></i>';
            marquee.textContent = `PLAYING :: ${album.album_artist} - ${trackName.replace(/\.mp3$/i, "")}`;
        }
    } catch (e) {
        console.error("Error al transmitir pista:", e);
        if (marquee) marquee.textContent = `ERROR :: No se pudo reproducir pista`;
    }
}

// ================================================================================================================= //
// SINCRONIZACIÓN DE TIEMPO DEL CANAL MAESTRO
// ================================================================================================================= //
window.AimpMaster.audio.ontimeupdate = () => {
    const winId = window.AimpMaster.activeWindowId;
    if (!winId) return;

    const audio = window.AimpMaster.audio;
    const timer = document.getElementById(`${winId}-timer`);
    const fill = document.getElementById(`${winId}-fill`);

    if (timer) timer.textContent = formatearTiempo(audio.currentTime);
    if (fill && audio.duration) {
        const pct = (audio.currentTime / audio.duration) * 100;
        fill.style.width = `${pct}%`;
    }
};

window.AimpMaster.audio.onended = () => {
    const winId = window.AimpMaster.activeWindowId;
    if (!winId) return;

    const tracks = window.AimpMaster.playlist;
    let nextIndex;
    if (window.AimpMaster.randomMode) {
        nextIndex = Math.floor(Math.random() * tracks.length);
    } else {
        nextIndex = window.AimpMaster.currentTrackIndex + 1;
    }

    if (nextIndex < tracks.length) {
        const albumData = JSON.parse(sessionStorage.getItem(`album_cache_${winId}`) || "{}");
        activarYReproducir(winId, albumData, tracks, nextIndex);
    } else {
        window.AimpMaster.stopAll();
    }
};

// ================================================================================================================= //
// FUNCIONES AUXILIARES: TIEMPOS, ARRASTRE Y Z-INDEX
// ================================================================================================================= //
function formatearTiempo(segundos) {
    if (isNaN(segundos) || segundos < 0) return "00:00";
    const min = Math.floor(segundos / 60);
    const sec = Math.floor(segundos % 60);
    return `${min < 10 ? '0' : ''}${min}:${sec < 10 ? '0' : ''}${sec}`;
}

function traerAlFrente(element) {
    let maxZ = 1060;
    document.querySelectorAll(".aimp-window").forEach(w => {
        const z = parseInt(w.style.zIndex) || 1060;
        if (z > maxZ) maxZ = z;
    });
    element.style.zIndex = maxZ + 1;
}

function hacerDraggable(win, handle) {
    let posX = 0, posY = 0, mouseX = 0, mouseY = 0;
    handle.onmousedown = (e) => {
        e.preventDefault();
        mouseX = e.clientX;
        mouseY = e.clientY;
        document.onmouseup = () => {
            document.onmouseup = null;
            document.onmousemove = null;
        };
        document.onmousemove = (e) => {
            posX = mouseX - e.clientX;
            posY = mouseY - e.clientY;
            mouseX = e.clientX;
            mouseY = e.clientY;
            win.style.top = `${win.offsetTop - posY}px`;
            win.style.left = `${win.offsetLeft - posX}px`;
        };
    };
}

// Duración individual y acumulación para el tiempo total del álbum
function obtenerDuracionTrack(albumId, fileName, callback) {
    const key = `${albumId}_${fileName}`;
    if (window.AimpMaster.durations[key]) {
        callback(window.AimpMaster.durations[key]);
        return;
    }
    const tempAudio = new Audio();
    fetch(window.API_BASE_URL + "/player/stream", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `id=${encodeURIComponent(albumId)}&file=${encodeURIComponent(fileName)}`
    })
    .then(r => r.json())
    .then(res => {
        if (res.status === "ok" && res.audio) {
            tempAudio.src = res.audio;
            tempAudio.onloadedmetadata = () => {
                const dur = tempAudio.duration;
                window.AimpMaster.durations[key] = dur;
                callback(dur);
            };
        }
    })
    .catch(() => {});
}

function actualizarTotalAlbum(winId, tracks, albumId) {
    let total = 0;
    let calculados = 0;
    tracks.forEach(t => {
        const key = `${albumId}_${t}`;
        if (window.AimpMaster.durations[key]) {
            total += window.AimpMaster.durations[key];
            calculados++;
        }
    });
    if (calculados > 0) {
        const spanTotal = document.getElementById(`${winId}-album-total-time`);
        if (spanTotal) spanTotal.textContent = `Total: ${formatearTiempo(total)}`;
    }
}
