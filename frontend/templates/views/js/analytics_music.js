console.log("📈 Módulo Analítica Musical cargado.");

(async () => {
    // 1. Obtenemos el usuario activo
    const userSessionRaw = sessionStorage.getItem("user_session");
    const userId = userSessionRaw ? JSON.parse(userSessionRaw).id : 1;

    // 2. Control de visualización única por sesión vinculado al ID de usuario
    const sessionKey = `analytics_welcome_shown_${userId}`;
    if (sessionStorage.getItem(sessionKey)) {
        return;
    }

    // 3. Base URL segura (con fallback si window.API_BASE_URL no cargó todavía)
    const apiBase = window.API_BASE_URL || "http://localhost:5000";

    try {
        const resp = await fetch(apiBase + "/analytics/recommendations", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: `user_id=${encodeURIComponent(userId)}`
        });

        // Si el backend responde error (404, 500), evitamos parsear JSON
        if (!resp.ok) {
            console.warn(`[ANALYTICS] El servidor respondió con estado: ${resp.status}`);
            return;
        }

        const res = await resp.json();
        if (res.status !== "ok" || !res.recommendations || res.recommendations.length === 0) {
            return;
        }

        // Marcar como mostrado para esta sesión del usuario
        sessionStorage.setItem(sessionKey, "true");

        // Construir el modal en el DOM
        construirModalRecomendaciones(res.genre, res.recommendations);

    } catch (e) {
        console.warn("No se pudieron cargar recomendaciones analíticas:", e);
    }
})();

function construirModalRecomendaciones(generoPredilecto, albumes) {
    const apiBase = window.API_BASE_URL || "http://localhost:5000";
    let modal = document.getElementById("modal-analytics-recommendations");

    if (!modal) {
        modal = document.createElement("div");
        modal.id = "modal-analytics-recommendations";
        modal.className = "modal fade";
        modal.tabIndex = -1;
        modal.role = "dialog";
        modal.style.zIndex = "1095";
        document.body.appendChild(modal);
    }

    const subtitulo = generoPredilecto
        ? `Basado en tu reciente interés por el género <strong>${generoPredilecto}</strong>, seleccionamos estos álbumes para descubrir:`
        : `Te damos la bienvenida. Estos son algunos de los álbumes más destacados del catálogo:`;

    let cardsHtml = "";
    albumes.forEach((alb) => {
        cardsHtml += `
            <div class="col-sm-4 text-center" style="margin-bottom: 10px;">
                <div style="background: #1c1f24; border: 1px solid #333940; border-radius: 6px; padding: 10px; height: 100%;">
                    <img id="rec-cover-${alb.id}"
                         src="/img/no-cover.png"
                         alt="${alb.name}"
                         style="width: 100px; height: 100px; object-fit: cover; border-radius: 4px; box-shadow: 0 2px 6px rgba(0,0,0,0.5); margin-bottom: 8px;">
                    <h5 style="color: #fff; font-weight: bold; margin: 4px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${alb.name}">
                        ${alb.name}
                    </h5>
                    <p style="color: #8fa0ad; font-size: 11px; margin-bottom: 6px;">${alb.artist} (${alb.year})</p>
                    <button class="btn btn-primary btn-xs btn-rec-play" data-album='${JSON.stringify(alb)}' style="width: 100%;">
                        <span class="glyphicon glyphicon-play"></span> Escuchar
                    </button>
                </div>
            </div>
        `;
    });

    modal.innerHTML = `
        <div class="modal-dialog" style="max-width: 650px; margin-top: 100px;">
            <div class="modal-content" style="background: #252a30; color: #e0e0e0; border: 1px solid #454d55; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.8);">
                <div class="modal-header" style="border-bottom: 1px solid #373e44; padding: 12px 15px;">
                    <button type="button" class="close" data-dismiss="modal" style="color: #fff; opacity: 0.8;">&times;</button>
                    <h4 class="modal-title" style="color: #00e5ff; font-weight: bold; font-size: 15px;">
                        <span class="glyphicon glyphicon-bullhorn"></span> Sugerencias Personalizadas
                    </h4>
                </div>
                <div class="modal-body" style="padding: 15px;">
                    <p style="color: #abb6bf; font-size: 13px; margin-bottom: 15px;">${subtitulo}</p>
                    <div class="row">
                        ${cardsHtml}
                    </div>
                </div>
                <div class="modal-footer" style="border-top: 1px solid #373e44; padding: 10px 15px;">
                    <button type="button" class="btn btn-default btn-sm" data-dismiss="modal">
                        Continuar al Catálogo
                    </button>
                </div>
            </div>
        </div>
    `;

    // Cargar portadas asíncronas
    albumes.forEach((alb) => {
        fetch(apiBase + "/music/art", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: `id=${encodeURIComponent(alb.id)}`
        })
        .then(r => r.json())
        .then(res => {
            if (res.status === "ok" && res.data) {
                const img = document.getElementById(`rec-cover-${alb.id}`);
                if (img) img.src = res.data;
            }
        })
        .catch(() => {});
    });

    // Evento Escuchar desde el modal analítico
    $(modal).find(".btn-rec-play").on("click", function(e) {
        e.preventDefault();
        const albData = JSON.parse($(this).attr("data-album"));

        const fullAlbum = {
            id: albData.id,
            album_year: albData.year,
            album_name: albData.name,
            album_artist: albData.artist,
            album_genre: albData.genre,
            album_path: albData.path
        };

        if (typeof window.abrirAimpPlayer === "function") {
            window.abrirAimpPlayer(fullAlbum);
        }
        $(modal).modal("hide");
    });

    $(modal).modal("show");
}
