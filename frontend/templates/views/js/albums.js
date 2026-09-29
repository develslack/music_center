console.clear();
console.log("✅ Módulo Albums Iniciado de forma nativa.");

// CORRECCIÓN: Usamos el objeto window para evitar el SyntaxError de redeteclaración con let
window.dTable = window.dTable || null;

(async () => {
  try {
    // ================================================================================================================= //
    // 1. CARGA DE LA TABLA MAESTRA DESDE EL BACKEND EN C
    // ================================================================================================================= //
    const response = await fetch(window.API_BASE_URL +"/music/list");
    const albums = await response.json();

    const tableBody = document.getElementById("albumsTableBody");
    const alertInfo = document.getElementById("alert-info-albums");
    tableBody.innerHTML = "";

    let count = 0;

    albums.forEach((album) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td class="text-center">${album.album_art}</td>
        <td class="text-center">${album.album_year}</td>
        <td class="text-center">${album.album_album_name}</td>
        <td class="text-center">${album.album_artist}</td>
        <td class="text-center">${album.album_genre}</td>
        <td class="text-center">
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
          <button class="btn btn-default btn-sm btn-escuchar-album"
                  data-album_id="${album.id}"
                  data-album_path="${album.album_path}">
          <span class="glyphicon glyphicon-edit"></span> Escuchar
          <button class="btn btn-success btn-sm btn-download-album"
                  data-album_id="${album.id}"
                  data-album_path="${album.album_path}">
          <span class="glyphicon glyphicon-download"></span> Descargar
          </button>
        </td>`;

      tableBody.appendChild(row);
      count++;
    });

    if (alertInfo) {
        alertInfo.innerHTML = `<div class="alert alert-info">
                                <span class="glyphicon glyphicon-option-vertical" aria-hidden="true"></span> <strong>Cantidad de Registros: </strong> ${count}
                               </div><hr>`;
    }

    if ($.fn.DataTable.isDataTable("#albumsTable")) {
      $("#generosTable").DataTable().destroy();
    }

    dTable = $('#albumsTable').DataTable({
        "order": [[0, "asc"]],
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
                    $(win.document.body).css( 'font-size', '8pt' );
                    $(win.document.body).find( 'table' ).addClass( 'compact' ).css( 'font-size', 'inherit' );
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

    // ================================================================================================================= //
    // 2. PREPARACIÓN DEL MODAL USANDO EL SISTEMA DEL DASHBOARD
    // ================================================================================================================= //
    // Usamos el fetch nativo del servidor para rellenar el div de abajo sin pisar el dashboard central
    const contenedorModal = document.getElementById("contenedor-modal-maestro-albums");
    if (contenedorModal) {
        const respModal = await fetch(window.VIEWS_PATH + "/albums/nuevo_album.html");
        contenedorModal.innerHTML = await respModal.text();
    }

    // ================================================================================================================= //
    // 3. CAPTURA SEGURO DE EVENTOS (DELEGACIÓN DE EVENTOS JQUERY)
    // ================================================================================================================= //

    // Evento Añadir (Alta)
    $(document).off("click", "#add-album-form").on("click", "#add-album-form", function(e) {
        e.preventDefault();
        prepararYMostrarModal("alta");
    });

    // Evento Editar (Fila de la tabla)
    $(document).off("click", ".btn-editar-album").on("click", ".btn-editar-album", function(e) {
        e.preventDefault();
        const datos = {
            id: $(this).attr("data-album_id"),
            album_year: $(this).attr("data-album_year"),
            album_name: $(this).attr("data-album_name"),
            album_artst: $(this).attr("data-album_artist"),
            album_genre: $(this).attr("data-album_genre"),
            album_art: $(this).attr("data-album_art"),
            album_bio: $(this).attr("data-album_bio"),
            album_path: $(this).attr("data-album_path"),
        };
        prepararYMostrarModal("edicion", datos);
    });

  } catch (error) {
    console.error("💥 Error general en el módulo Géneros Musicales:", error);
  }
})();

// ===================================================================================================================== //
// FUNCIÓN QUE CONSTRUIE EL FORMULARIO INTERNO Y MUESTRA EL MODAL FLOTANTE
// ===================================================================================================================== //
function prepararYMostrarModal(modo, datos = null) {
    const $modal = $("#myModal-albums");
    if ($modal.length === 0) return;

    // Seteamos título del modal flotante
    $modal.find(".modal-title").text(modo === "alta" ? "Añadir Género Musical" : "Editar Género Musical");

    // Seteamos campos en el body vacío
    $modal.find(".modal-body").html(`

        <form id="form-modal-genero">
            <input type="hidden" id="modal-genero-id" value="${datos ? datos.id : ''}">
            <div class="form-group">
                <label>Género Musical:</label>
                <input type="text" class="form-control" id="modal-genero-genre" value="${datos ? datos.genero : ''}" required>
            </div>

            <button type="submit" id="btn-submit-oculto" style="display:none;"></button>
        </form>
    `);

    // Seteamos barra de estado y botones en el footer vacío
    $modal.find(".modal-footer").html(`
        <div id="modal-status-message" style="margin-bottom: 10px; text-align: left;"></div>
        <div class="text-right">
            <button type="button" class="btn btn-danger" data-dismiss="modal">
                <span class="glyphicon glyphicon-remove-circle" aria-hidden="true"></span> Cerrar</button>
            <button type="button" class="btn btn-success" id="btn-modal-guardar">
                <span class="glyphicon glyphicon-ok" aria-hidden="true"></span> Guardar</button>
        </div>
    `);

    // Hacemos que aparezca de forma flotante sobre dashboard.html
    $modal.modal("show");

    // Vinculamos el botón verde del footer con la validación del form
    document.getElementById("btn-modal-guardar").onclick = () => {
        document.getElementById("btn-submit-oculto").click();
    };

    // Procesamiento del submit al backend en C
    document.getElementById("form-modal-genero").onsubmit = async (e) => {
        e.preventDefault();

        const statusContainer = document.getElementById("modal-status-message");
        const id = document.getElementById("modal-genero-id").value;
        const payload = {
            genero: document.getElementById("modal-genero-genre").value,
        };


        if(id == ""){

            statusContainer.innerHTML = `<span class="text-info">⏳ Procesando solicitud...</span>`;

            try {
                const enviorresp = await fetch(window.API_BASE_URL +"/genres/add", {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: `genre=${encodeURIComponent(payload.genero)}`
                });

                const data = await enviorresp.json();

                if (enviorresp.ok && data.status === "ok") {
                    statusContainer.innerHTML = `<span class="text-success"><strong>✅ ¡Éxito!</strong> ${data.message}.</span>`;

                    // Forzamos la actualización de la vista actual llamando al dashboard de forma nativa
                    setTimeout(() => {
                        $modal.modal("hide");
                        window.loadDashboardView(window.VIEWS_PATH + "/generos/generos.html"); // <--- RECARGA ASÍNCRONA OFICIAL DEL DASHBOARD
                    }, 1200);
                } else {
                    statusContainer.innerHTML = `<span class="text-danger"><strong>❌ Error:</strong> ${data.message}.</span>`;
                }
            }
            catch (err) {
                console.error(err);
                statusContainer.innerHTML = `<span class="text-danger"><strong>💥 Error:</strong> ${data.message}.</span>`;
        }

        }
        if(id != ""){

            statusContainer.innerHTML = `<span class="text-info">⏳ Procesando solicitud...</span>`;

            try {
                const enviorresp = await fetch(window.API_BASE_URL +"/genres/edit", {
                    method: "POST",
                    headers: { "Content-Type": "application/x-www-form-urlencoded" },
                    body: `id=${encodeURIComponent(id)}&genre=${encodeURIComponent(payload.genero)}`
                });

                const data = await enviorresp.json();

                if (enviorresp.ok && data.status === "ok") {
                    statusContainer.innerHTML = `<span class="text-success"><strong>✅ ¡Éxito!</strong> ${data.message}.</span>`;

                    // Forzamos la actualización de la vista actual llamando al dashboard de forma nativa
                    setTimeout(() => {
                        $modal.modal("hide");
                        window.loadDashboardView(window.VIEWS_PATH + "/generos/generos.html"); // <--- RECARGA ASÍNCRONA OFICIAL DEL DASHBOARD
                    }, 1200);
                } else {
                    statusContainer.innerHTML = `<span class="text-danger"><strong>❌ Error:</strong> ${data.message}.</span>`;
                }
            }
            catch (err) {
                console.error(err);
                statusContainer.innerHTML = `<span class="text-danger"><strong>💥 Error:</strong> ${data.message}.</span>`;
        }

        }

    };
}
