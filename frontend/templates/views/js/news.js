console.log("📰 Módulo News/Novedades iniciado.");

window.cargarNewsSummary = async function() {
    const apiBase = window.API_BASE_URL || "http://localhost:5000";

    // Verificamos si los contenedores ya existen en el DOM
    const contLatest = document.getElementById("home-latest-container");
    const contTop = document.getElementById("home-top-container");

    if (!contLatest || !contTop) {
        console.warn("⚠️ Los contenedores de home aún no existen en el DOM. Reintentando...");
        return;
    }

    try {
        const resp = await fetch(apiBase + "/news/summary");
        if (!resp.ok) {
            console.error(`Error HTTP ${resp.status} al consultar /news/summary`);
            return;
        }

        const data = await resp.json();
        if (data.status !== "ok") return;

        // 1. KPIs
        if (data.stats) {
            const elAlbums = document.getElementById("kpi-total-albums");
            const elGenres = document.getElementById("kpi-total-genres");
            const elListens = document.getElementById("kpi-total-listens");

            if (elAlbums) elAlbums.textContent = data.stats.total_albums || 0;
            if (elGenres) elGenres.textContent = data.stats.total_genres || 0;
            if (elListens) elListens.textContent = data.stats.total_listens || 0;
        }

        // 2. Renderizado de tarjetas
        renderizarTarjetasInformativas(data.latest, "home-latest-container", false);
        renderizarTarjetasInformativas(data.most_listened, "home-top-container", true);

    } catch (e) {
        console.error("Error al cargar novedades:", e);
    }
};

function renderizarTarjetasInformativas(lista, containerId, esTendencia) {
    const cont = document.getElementById(containerId);
    if (!cont) return;

    if (!lista || lista.length === 0) {
        cont.innerHTML = `<div class="col-xs-12 text-center text-muted">No hay registros disponibles.</div>`;
        return;
    }

    const apiBase = window.API_BASE_URL || "http://localhost:5000";
    let html = "";

    lista.forEach(alb => {
        const etiqueta = esTendencia
            ? `<span class="label label-danger">🔥 ${alb.chart} reproducciones</span>`
            : `<span class="label label-default">${alb.genre}</span>`;

        html += `
            <div class="col-sm-3 col-xs-6 text-center" style="margin-bottom: 15px;">
                <div style="background: #ffffff; border: 1px solid #e1e8ed; border-radius: 6px; padding: 12px; height: 100%; box-shadow: 0 1px 3px rgba(0,0,0,0.06);">
                    <div style="width: 110px; height: 110px; margin: 0 auto 8px auto; position: relative;">
                        <img id="news-cover-${alb.id}-${containerId}"
                             src="/img/no-cover.png"
                             alt="${alb.name}"
                             style="width: 100%; height: 100%; object-fit: cover; border-radius: 4px; box-shadow: 0 2px 5px rgba(0,0,0,0.15);">
                    </div>
                    <h5 style="font-weight: bold; margin: 4px 0; color: #2c3e50; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${alb.name}">
                        ${alb.name}
                    </h5>
                    <p class="text-muted" style="font-size: 12px; margin-bottom: 6px;">${alb.artist} (${alb.year})</p>
                    <div>${etiqueta}</div>
                </div>
            </div>
        `;
    });

    cont.innerHTML = html;

    // Portadas asíncronas
    lista.forEach(alb => {
        fetch(apiBase + "/music/art", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: `id=${encodeURIComponent(alb.id)}`
        })
        .then(r => r.json())
        .then(res => {
            if (res.status === "ok" && res.data) {
                const img = document.getElementById(`news-cover-${alb.id}-${containerId}`);
                if (img) img.src = res.data;
            }
        })
        .catch(() => {});
    });
}

// Disparo inmediato al cargarse el script
window.cargarNewsSummary();
