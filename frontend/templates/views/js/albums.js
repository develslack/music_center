console.clear();
console.log("✅ Módulo Albums Iniciado de forma nativa.");

// Reutilizamos la instancia global para evitar SyntaxError de redeclaración[cite: 20]
window.dTable = window.dTable || null;

// ================================================================================================================= //
// FUNCIÓN GLOBAL PARA FILTRAR EN DATATABLES POR ARTISTA O GÉNERO[cite: 20]
// ================================================================================================================= //
window.filtrarTablaAlbums = function(tipo, valor) {
    if (!window.dTable) return;

    if (tipo === "artista") {
        // Limpiamos posible filtro previo en Género (Columna 4)[cite: 20]
        window.dTable.column(4).search("");

        if (!valor || valor.trim() === "") {
            // Si está vacío, limpiamos filtro y mostramos todos los registros[cite: 20]
            window.dTable.column(3).search("").draw();
            console.log("🔍 Filtro Artista eliminado: Mostrando todos los registros.");
        } else {
            // Búsqueda flexible por texto parcial[cite: 20]
            window.dTable.column(3).search(valor.trim(), false, true).draw();
            console.log(`🔍 Filtrando por Artista: "${valor}"`);
        }
    } else if (tipo === "genero") {
        // Limpiamos posible filtro previo en Artista (Columna 3)[cite: 20]
        window.dTable.column(3).search("");

        if (!valor || valor.trim() === "") {
            window.dTable.column(4).search("").draw();
            console.log("🔍 Filtro Género eliminado: Mostrando todos los registros.");
        } else {
            // Expresión regular exacta para género[cite: 20]
            window.dTable.column(4).search('^' + valor.trim() + '$', true, false).draw();
            console.log(`🔍 Filtrando por Género: "${valor}"`);
        }
    }
};

(async () => {
  try {
    // ================================================================================================================= //
    // 1. CARGA DE LA TABLA MAESTRA DESDE EL BACKEND EN C[cite: 20]
    // ================================================================================================================= //
    const response = await fetch(window.API_BASE_URL + "/music/list");
    const albums = await response.json();

    const tableBody = document.getElementById("albumsTableBody");
    const alertInfo = document.getElementById("alert-info-albums");
    tableBody.innerHTML = "";

    albums.forEach((album) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td class="text-center" style="vertical-align: middle;">
          <img id="cover-album-${album.id}"
               src="/img/no-cover.png"
               alt="${album.album_name || 'Portada'}"
               class="img-thumbnail cover-async-load"
               data-album_id="${album.id}"
               style="width: 48px; height: 48px; object-fit: cover; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.3);"
               onerror="this.onerror=null; this.src='/img/no-cover.png';">
        </td>
        <td class="text-center" style="vertical-align: middle;">${album.album_year || ""}</td>
        <td class="text-center" style="vertical-align: middle;">${album.album_name || ""}</td>
        <td class="text-center" style="vertical-align: middle;">${album.album_artist || ""}</td>
        <td class="text-center" style="vertical-align: middle;">${album.album_genre || ""}</td>
        <td class="text-center" style="vertical-align: middle;">
          <button class="btn btn-warning btn-sm btn-editar-album"
                  data-album_id="${album.id}"
                  data-album_year="${album.album_year}"
                  data-album_name="${album.album_name}"
                  data-album_artist="${album.album_artist}"
                  data-album_genre="${album.album_genre}"
                  data-album_art="${album.album_art}"
                  data-album_bio="${album.album_bio}"
                  data-album_path="${album.album_path}">
            <span class="glyphicon glyphicon-edit"></span> Editar
          </button>
          <button class="btn btn-default btn-sm btn-escuchar-album"
                  data-album_id="${album.id}"
                  data-album_year="${album.album_year}"
                  data-album_name="${album.album_name}"
                  data-album_artist="${album.album_artist}"
                  data-album_genre="${album.album_genre}"
                  data-album_art="${album.album_art}"
                  data-album_bio="${album.album_bio}"
                  data-album_path="${album.album_path}">
            <span class="glyphicon glyphicon-play"></span> Escuchar
          </button>
          <button class="btn btn-success btn-sm btn-download-album"
                  data-album_id="${album.id}"
                  data-album_year="${album.album_year}"
                  data-album_name="${album.album_name}"
                  data-album_path="${album.album_path}">
            <span class="glyphicon glyphicon-download"></span> Descargar
          </button>
        </td>`;

      tableBody.appendChild(row);
    });

    if ($.fn.DataTable.isDataTable("#albumsTable")) {
      $("#albumsTable").DataTable().destroy();
    }

    window.dTable = $('#albumsTable').DataTable({
        "order": [[2, "asc"]],
        "columnDefs": [
            { "orderable": false, "searchable": false, "targets": [0, 5] }
        ],
        "responsive":     true,
        "scrollY":        "300px",
        "scrollX":        true,
        "scrollCollapse": true,
        "paging":         true,
        "deferRender":    true,
        "retrieve":       true,
        "dom": '<"row"<"col-sm-12"l>><"row"<"col-sm-12"Bf>>rt<"row"<"col-sm-12"ip>>',
        buttons: [
            { extend: 'excel', text: '<i class="glyphicon glyphicon-list-alt"></i> Export Excel', exportOptions: { columns: ':visible'} },
            { extend: 'csv', text: '<i class="glyphicon glyphicon-align-justify"></i> Export CSV', exportOptions: { columns: ':visible'} },
            { extend: 'pdf', text: '<i class="glyphicon glyphicon-file"></i> Export PDF', exportOptions: { columns: ':visible'} },
            {
                extend: 'print',
                text: '<i class="glyphicon glyphicon-print"></i> Imprimir',
                customize: function ( win ) {
                    $(win.document.body).css( 'font-size', '8pt' );$(win.document.body).find( 'table' ).addClass( 'compact' ).css( 'font-size', 'inherit' );
                },
                autoPrint: false,
                exportOptions: { columns: ':visible' }
            },
            'colvis'
        ],
        "language": {
            "lengthMenu": "Mostrar _MENU_ registros por pagina",
            "info": "Mostrando pagina _PAGE_ de _PAGES_",
            "search": "Buscar:",
            "zeroRecords":    "No se encontraron registros coincidentes",
            "paginate": { "next": "Siguiente", "previous": "Anterior" }
        }
    });

    // 🔢 ACTUALIZACIÓN DINÁMICA DEL CONTADOR DE REGISTROS SEGÚN EL FILTRO ACTIVO
    function actualizarContadorRegistros() {
        if (!alertInfo || !window.dTable) return;
        const totalFiltrados = window.dTable.rows({ filter: 'applied' }).count();
        const totalGeneral = window.dTable.rows().count();

        alertInfo.innerHTML = `
            <div class="alert alert-info" style="margin-bottom: 10px;">
                <span class="glyphicon glyphicon-music" aria-hidden="true"></span>
                <strong>Registros encontrados:</strong> ${totalFiltrados}
                <span class="text-muted">(de un total de ${totalGeneral} álbumes en catálogo)</span>
            </div><hr style="margin-top: 5px; margin-bottom: 15px;">`;
    }

    // 🖼️ CARGA ASÍNCRONA ÚNICAMENTE DE LAS PORTADAS DE FILAS VISIBLES EN PANTALLA
    function cargarPortadasVisibles() {
        const portadas = document.querySelectorAll("#albumsTableBody tr .cover-async-load");
        portadas.forEach(async (img) => {
            if (img.getAttribute("data-loaded") === "true") return;

            const id = img.getAttribute("data-album_id");
            try {
                const resp = await fetch(window.API_BASE_URL + "/music/art", {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: `id=${encodeURIComponent(id)}`
                });

                if (!resp.ok) return;

                const res = await resp.json();
                if (res.status === "ok" && res.data) {
                    img.src = res.data;
                    img.setAttribute("data-loaded", "true");
                }
            } catch (e) {
                // Conserva el fallback /img/no-cover.png[cite: 20]
            }
        });
    }

    // El evento draw.dt actualiza contador y solicita portadas de la página o búsqueda actual
    window.dTable.on('draw.dt', function() {
        actualizarContadorRegistros();
        cargarPortadasVisibles();
    });

    // Ejecución inicial tras montar la tabla
    actualizarContadorRegistros();
    cargarPortadasVisibles();

    // 🚀 Aplicamos filtro si venía preseleccionado desde el sidebar[cite: 20]
    if (window.albumFilter) {
        window.filtrarTablaAlbums(window.albumFilter.tipo, window.albumFilter.valor);
    }

    // ================================================================================================================= //
    // 2. PREPARACIÓN DEL MODAL[cite: 20]
    // ================================================================================================================= //
    const contenedorModal = document.getElementById("contenedor-modal-maestro-albums");
    if (contenedorModal) {
        const respModal = await fetch(window.VIEWS_PATH + "/albums/nuevo_album.html");
        contenedorModal.innerHTML = await respModal.text();
    }

    // ================================================================================================================= //
    // 3. CAPTURA DE EVENTOS (ALTA, EDICIÓN Y REPRODUCCIÓN)[cite: 20]
    // ================================================================================================================= //
    $(document).off("click", "#add-album-form").on("click", "#add-album-form", function(e) {
        e.preventDefault();
        prepararYMostrarModal("alta");
    });

    $(document).off("click", ".btn-editar-album").on("click", ".btn-editar-album", function(e) {
        e.preventDefault();
        const datos = {
            id: $(this).attr("data-album_id"),
            album_year: $(this).attr("data-album_year"),
            album_name: $(this).attr("data-album_name"),
            album_artist: $(this).attr("data-album_artist"),
            album_genre: $(this).attr("data-album_genre"),
            album_art: $(this).attr("data-album_art"),
            album_bio: $(this).attr("data-album_bio"),
            album_path: $(this).attr("data-album_path"),
        };
        prepararYMostrarModal("edicion", datos);
    });

    // 🎵 EVENTO REPRODUCIR: Abre la ventana flotante AIMP multi-instancia
    $(document).off("click", ".btn-escuchar-album").on("click", ".btn-escuchar-album", function(e) {
        e.preventDefault();
        const albumData = {
            id: $(this).attr("data-album_id"),
            album_year: $(this).attr("data-album_year"),
            album_name: $(this).attr("data-album_name"),
            album_artist: $(this).attr("data-album_artist"),
            album_genre: $(this).attr("data-album_genre"),
            album_art: $(this).attr("data-album_art"),
            album_bio: $(this).attr("data-album_bio"),
            album_path: $(this).attr("data-album_path")
        };

        // Cacheamos para persistencia de la instancia flotante
        sessionStorage.setItem(`album_cache_aimp-win-${albumData.id}`, JSON.stringify(albumData));

        if (typeof window.abrirAimpPlayer === "function") {
            window.abrirAimpPlayer(albumData);
        } else {
            console.error("⚠️ El módulo window.abrirAimpPlayer no está disponible. Asegúrate de incluir player.js en dashboard.html.");
        }
    });


    // 📥 EVENTO DESCARGAR: Streaming binario en segundo plano con diálogo nativo
    $(document).off("click", ".btn-download-album").on("click", ".btn-download-album", async function(e) {
        e.preventDefault();
        const $btn =$(this);
        const albumId = $btn.attr("data-album_id");
        if (!albumId) return;

        const albumYear = ($btn.attr("data-album_year") || "").trim();
        const albumName = ($btn.attr("data-album_name") || "").trim().replace(/\s+/g, '_');
        const filename = `${albumYear}_${albumName}.zip`;

        const originalHtml = $btn.html();
        const originalStyle = $btn.attr("style") || "";

        // Fase 1: Feedback mientras el servidor comprime el directorio físico
        $btn.prop("disabled", true)
            .css({
                "transition": "background 0.1s ease",
                "color": "#fff",
                "text-shadow": "0 1px 2px rgba(0,0,0,0.6)"
            })
            .html('<span class="glyphicon glyphicon-refresh glyphicon-refresh-animate"></span> Empaquetando...');

        try {
            const resp = await fetch(window.API_BASE_URL + "/download/album", {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: `id=${encodeURIComponent(albumId)}`
            });

            if (!resp.ok) {
                alert("❌ Error al procesar la descarga en el servidor.");
                $btn.prop("disabled", false).html(originalHtml).attr("style", originalStyle);
                return;
            }

            // Obtenemos el peso total en bytes para el cálculo porcentual
            const contentLength = parseInt(resp.headers.get("Content-Length") || "0", 10);
            const reader = resp.body.getReader();
            const chunks = [];
            let receivedBytes = 0;

            // Fase 2: Lectura de chunks y animación progresiva del botón
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                chunks.push(value);
                receivedBytes += value.length;

                if (contentLength > 0) {
                    const percent = Math.min(100, Math.round((receivedBytes / contentLength) * 100));

                    // Pintado progresivo de izquierda a derecha con gradiente CSS
                    $btn.css("background", `linear-gradient(to right, #2ecc71 ${percent}%, #343a40 ${percent}%)`);
                    $btn.html(`<span class="glyphicon glyphicon-download"></span> ${percent}%`);
                } else {
                    // Fallback si no viene Content-Length: acumula megabytes leídos
                    const mb = (receivedBytes / (1024 * 1024)).toFixed(1);
                    $btn.html(`<span class="glyphicon glyphicon-download"></span> ${mb} MB`);
                }
            }

            // Al llegar al 100% generamos el archivo y abrimos el diálogo de guardado
            $btn.css("background", "#2ecc71").html('<span class="glyphicon glyphicon-ok"></span> ¡Listo!');

            const blob = new Blob(chunks, { type: "application/zip" });
            const downloadUrl = window.URL.createObjectURL(blob);

            const a = document.createElement("a");
            a.style.display = "none";
            a.href = downloadUrl;
            a.download = filename;
            document.body.appendChild(a);
            a.click();

            setTimeout(() => {
                window.URL.revokeObjectURL(downloadUrl);
                a.remove();
                // Restauramos el botón a su estado original tras finalizar
                $btn.prop("disabled", false).html(originalHtml).attr("style", originalStyle);
            }, 1800);

        } catch (err) {
            console.error("Fallo durante la descarga del álbum:", err);
            alert("💥 Error de conexión al descargar el álbum.");
            $btn.prop("disabled", false).html(originalHtml).attr("style", originalStyle);
        }
    });

    // FIN DEL LISTENER DEL BOTON DOWNLOAD
    // ==================================================================================================================================== //

  } catch (error) {
    console.error("💥 Error general en el módulo Albums:", error);
  }
})();

// ===================================================================================================================== //
// MODAL DE ALTA / EDICIÓN[cite: 20]
// ===================================================================================================================== //
async function prepararYMostrarModal(modo, datos = null) {
    const $modal =$("#myModal-albums");
    if ($modal.length === 0) return;

    $modal.find(".modal-title").text(modo === "alta" ? "Añadir Álbum" : "Editar Álbum");

    $modal.find(".modal-body").html(`
        <form id="form-modal-album">
            <input type="hidden" id="modal-album-album_id" value="${datos ? datos.id : ''}">

            <div class="form-group">
                <label><span class="label label-default">Título del álbum</span></label>
                <input type="text" class="form-control" id="modal-album-album_name" value="${datos ? datos.album_name : ''}" required>
            </div>

            <div class="form-group">
                <label><span class="label label-default">Año Edición</span></label>
                <input type="text" class="form-control" id="modal-album-album_year" value="${datos ? datos.album_year : ''}" required>
            </div>

            <div class="form-group">
                <label><span class="label label-default">Artista</span></label>
                <input type="text" class="form-control" id="modal-album-album_artist" value="${datos ? datos.album_artist : ''}" required>
            </div>

            <div class="form-group">
                <label for="modal-album-album_genre"><span class="label label-default">Género Musical</span></label>
                <select class="form-control" id="modal-album-album_genre" required>
                    <option value="">Cargando Géneros Musicales...</option>
                </select>
            </div>

            <div class="form-group">
                <label><span class="label label-default">Nombre del Archivo de Portada</span></label>
                <input type="file" class="form-control" id="modal-album-album_art">
            </div>

            <div class="form-group">
                <label><span class="label label-default">Reseña / Biopic</span></label>
                <textarea class="form-control" rows="4" id="modal-album-album_bio">${datos ? datos.album_bio : ''}</textarea>
            </div>

            <div class="form-group">
                <label><span class="label label-default">Directorio del Álbum</span> (ej: ../music/artista/album)</label>
                <input type="text" class="form-control" id="modal-album-album_path" value="${datos ? datos.album_path : ''}" required>
            </div>

            <button type="submit" id="btn-submit-oculto" style="display:none;"></button>
        </form>
    `);

    $modal.find(".modal-footer").html(`
        <div id="modal-status-message" style="margin-bottom: 10px; text-align: left;"></div>
        <div class="text-right">
            <button type="button" class="btn btn-danger" data-dismiss="modal">
                <span class="glyphicon glyphicon-remove-circle"></span> Cerrar
            </button>
            <button type="button" class="btn btn-success" id="btn-modal-guardar">
                <span class="glyphicon glyphicon-ok"></span> Guardar
            </button>
        </div>
    `);

    await cargarGenerosMusicalesModal(datos ? datos.album_genre : '');

    $modal.modal("show");

    document.getElementById("btn-modal-guardar").onclick = () => {
        document.getElementById("btn-submit-oculto").click();
    };

    document.getElementById("form-modal-album").onsubmit = async (e) => {
        e.preventDefault();

        const statusContainer = document.getElementById("modal-status-message");
        const id = document.getElementById("modal-album-album_id").value;
        const payload = {
            album_name: document.getElementById("modal-album-album_name").value,
            album_year: document.getElementById("modal-album-album_year").value,
            album_artist: document.getElementById("modal-album-album_artist").value,
            album_genre: document.getElementById("modal-album-album_genre").value,
            album_art: document.getElementById("modal-album-album_art").value,
            album_bio: document.getElementById("modal-album-album_bio").value,
            album_path: document.getElementById("modal-album-album_path").value,
        };

        statusContainer.innerHTML = `<span class="text-info">⏳ Procesando solicitud...</span>`;

        try {
            const endpoint = id === "" ? "/music/add" : "/music/edit";
            let bodyParams = `album_name=${encodeURIComponent(payload.album_name)}&album_year=${encodeURIComponent(payload.album_year)}&album_artist=${encodeURIComponent(payload.album_artist)}&album_genre=${encodeURIComponent(payload.album_genre)}&album_art=${encodeURIComponent(payload.album_art)}&album_bio=${encodeURIComponent(payload.album_bio)}&album_path=${encodeURIComponent(payload.album_path)}`;

            if (id !== "") {
                bodyParams = `id=${encodeURIComponent(id)}&` + bodyParams;
            }

            const enviorresp = await fetch(window.API_BASE_URL + endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/x-www-form-urlencoded" },
                body: bodyParams
            });

            const data = await enviorresp.json();

            if (enviorresp.ok && data.status === "ok") {
                statusContainer.innerHTML = `<span class="text-success"><strong>✅ ¡Éxito!</strong> ${data.message}.</span>`;
                setTimeout(() => {
                    $modal.modal("hide");
                    window.loadDashboardView(window.VIEWS_PATH + "/albums/albums.html");
                }, 1200);
            } else {
                statusContainer.innerHTML = `<span class="text-danger"><strong>❌ Error:</strong> ${data.message}.</span>`;
            }
        } catch (err) {
            console.error(err);
            statusContainer.innerHTML = `<span class="text-danger"><strong>💥 Error al conectar con el servidor.</strong></span>`;
        }
    };
}

async function cargarGenerosMusicalesModal(valorSeleccionado) {
    const select = document.getElementById("modal-album-album_genre");
    if (!select) return;

    try {
        const resp = await fetch(window.API_BASE_URL + "/genres/list");
        const lista = await resp.json();

        select.innerHTML = `<option value="">Seleccionar</option>`;
        lista.forEach(item => {
            const genre = item.genre ? item.genre.trim() : "";
            const opt = document.createElement("option");
            opt.value = genre;
            opt.textContent = genre;
            if (genre === valorSeleccionado) opt.selected = true;
            select.appendChild(opt);
        });
    } catch (err) {
        console.error("Error al cargar Géneros en modal:", err);
        select.innerHTML = `<option value="">Seleccionar</option>`;
    }
}
