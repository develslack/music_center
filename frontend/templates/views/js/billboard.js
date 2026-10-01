console.log("📊 Módulo Billboard Charts cargado.");

(async () => {
    try {
        const resp = await fetch(window.API_BASE_URL + "/billboard/top");
        const list = await resp.json();

        const podiumContainer = document.getElementById("billboard-podium");
        const tableBody = document.getElementById("billboard-table-body");

        if (!list || list.length === 0) {
            podiumContainer.innerHTML = `
                <div class="col-xs-12">
                    <div class="alert alert-warning text-center">
                        <span class="glyphicon glyphicon-info-sign"></span> Todavía no hay reproducciones registradas. Dale "Play" a tus álbumes para empezar a rankearlos.
                    </div>
                </div>`;
            tableBody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">Sin datos de reproducciones.</td></tr>`;
            return;
        }

        // ===================================================================================================== //
        // 1. RENDERIZAR PODIO (TOP 1, 2 Y 3)
        // ===================================================================================================== //
        const top3 = list.slice(0, 3);
        const medallas = [
            { puesto: "1° PUESTO", color: "#f39c12", badge: "gold", icon: "👑" },
            { puesto: "2° PUESTO", color: "#7f8c8d", badge: "silver", icon: "🥈" },
            { puesto: "3° PUESTO", color: "#d35400", badge: "bronze", icon: "🥉" }
        ];

        let podiumHtml = "";
        top3.forEach((album, idx) => {
            const med = medallas[idx];
            podiumHtml += `
                <div class="col-sm-4" style="margin-bottom: 15px;">
                    <div class="panel panel-default text-center" style="border-top: 4px solid ${med.color}; box-shadow: 0 4px 10px rgba(0,0,0,0.1); border-radius: 6px;">
                        <div class="panel-body" style="padding: 15px;">
                            <div style="font-size: 18px; font-weight: 800; color: ${med.color}; margin-bottom: 10px;">
                                ${med.icon} ${med.puesto}
                            </div>
                            <div style="position: relative; width: 140px; height: 140px; margin: 0 auto 10px auto;">
                                <img id="podium-cover-${album.id}"
                                     src="/img/no-cover.png"
                                     alt="${album.name}"
                                     class="img-thumbnail"
                                     style="width: 140px; height: 140px; object-fit: cover; border-radius: 6px;">
                            </div>
                            <h4 style="font-weight: bold; margin: 5px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${album.name}">
                                ${album.name}
                            </h4>
                            <p class="text-muted" style="margin-bottom: 5px; font-size: 13px;">${album.artist} (${album.year})</p>
                            <span class="label label-info" style="font-size: 11px;">${album.genre}</span>
                            <div style="margin-top: 10px; font-size: 16px; font-weight: bold; color: #e74c3c;">
                                🔥 ${album.chart} <small style="font-size: 11px; color: #7f8c8d;">reproducciones</small>
                            </div>
                            <button class="btn btn-default btn-sm btn-billboard-play" data-album='${JSON.stringify(album)}' style="margin-top: 12px; width: 100%;">
                                <span class="glyphicon glyphicon-play"></span> Escuchar en AIMP
                            </button>
                        </div>
                    </div>
                </div>`;
        });
        podiumContainer.innerHTML = podiumHtml;

        // Cargar portadas asíncronas del podio
        top3.forEach(album => cargarPortadaBillboard(album.id, `podium-cover-${album.id}`));

        // ===================================================================================================== //
        // 2. RENDERIZAR TABLA (TOP 4 AL 10)
        // ===================================================================================================== //
        const resto = list.slice(3, 10);
        if (resto.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">No hay más álbumes en el chart aún.</td></tr>`;
        } else {
            let rowsHtml = "";
            resto.forEach((album, idx) => {
                const puesto = idx + 4;
                rowsHtml += `
                    <tr>
                        <td class="text-center" style="vertical-align: middle; font-weight: bold; font-size: 15px; color: #34495e;">
                            #${puesto}
                        </td>
                        <td class="text-center" style="vertical-align: middle;">
                            <img id="table-cover-${album.id}"
                                 src="/img/no-cover.png"
                                 alt="${album.name}"
                                 style="width: 42px; height: 42px; object-fit: cover; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.3);">
                        </td>
                        <td style="vertical-align: middle;">
                            <strong>${album.name}</strong><br>
                            <span class="text-muted" style="font-size: 12px;">${album.artist}</span>
                        </td>
                        <td class="text-center" style="vertical-align: middle;">
                            <span class="badge" style="background: #95a5a6;">${album.genre}</span>
                        </td>
                        <td class="text-center" style="vertical-align: middle;">${album.year}</td>
                        <td class="text-center" style="vertical-align: middle;">
                            <span class="label label-danger" style="font-size: 12px;">🔥 ${album.chart}</span>
                        </td>
                        <td class="text-center" style="vertical-align: middle;">
                            <button class="btn btn-default btn-xs btn-billboard-play" data-album='${JSON.stringify(album)}'>
                                <span class="glyphicon glyphicon-play"></span> Escuchar
                            </button>
                        </td>
                    </tr>`;
            });
            tableBody.innerHTML = rowsHtml;

            // Cargar portadas asíncronas de la tabla
            resto.forEach(album => cargarPortadaBillboard(album.id, `table-cover-${album.id}`));
        }

        // ===================================================================================================== //
        // 3. EVENTO ESCUCHAR DESDE EL CHART
        // ===================================================================================================== //
        $(document).off("click", ".btn-billboard-play").on("click", ".btn-billboard-play", function(e) {
            e.preventDefault();
            const rawData = $(this).attr("data-album");
            if (!rawData) return;

            const item = JSON.parse(rawData);
            const albumData = {
                id: item.id,
                album_year: item.year,
                album_name: item.name,
                album_artist: item.artist,
                album_genre: item.genre,
                album_art: item.art || "",
                album_bio: item.bio || "",
                album_path: item.path || ""
            };

            // Incremento de Hit
            fetch(window.API_BASE_URL + "/billboard/hit", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: `id=${encodeURIComponent(albumData.id)}`
            }).catch(() => {});

            sessionStorage.setItem(`album_cache_aimp-win-${albumData.id}`, JSON.stringify(albumData));

            if (typeof window.abrirAimpPlayer === "function") {
                window.abrirAimpPlayer(albumData);
            }
        });

    } catch (err) {
        console.error("Error al cargar Billboard Charts:", err);
    }
})();

// Carga asíncrona de portadas mediante el endpoint habitual
function cargarPortadaBillboard(albumId, imgElementId) {
    const img = document.getElementById(imgElementId);
    if (!img) return;

    fetch(window.API_BASE_URL + "/music/art", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `id=${encodeURIComponent(albumId)}`
    })
    .then(r => r.json())
    .then(res => {
        if (res.status === "ok" && res.data) {
            img.src = res.data;
        }
    })
    .catch(() => {});
}
