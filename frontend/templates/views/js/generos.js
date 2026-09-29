console.clear();
console.log("✅ Módulo Géneros Musicales Iniciado de forma nativa.");

// CORRECCIÓN: Usamos el objeto window para evitar el SyntaxError de redeteclaración con let
window.dTable = window.dTable || null;

(async () => {
  try {
    // ================================================================================================================= //
    // 1. CARGA DE LA TABLA MAESTRA DESDE EL BACKEND EN C
    // ================================================================================================================= //
    const response = await fetch(window.API_BASE_URL +"/genres/list");
    const generos = await response.json();

    const tableBody = document.getElementById("generosTableBody");
    const alertInfo = document.getElementById("alert-info-generos");
    tableBody.innerHTML = "";

    let count = 0;

    generos.forEach((genre) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td class="text-center">${genre.genre}</td>
        <td class="text-center">
          <button class="btn btn-warning btn-sm btn-editar-genero"
                  data-id="${genre.id}"
                  data-genre="${genre.genre}">
          <span class="glyphicon glyphicon-edit"></span> Editar
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

    if ($.fn.DataTable.isDataTable("#generosTable")) {
      $("#generosTable").DataTable().destroy();
    }

    dTable = $('#generosTable').DataTable({
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
    const contenedorModal = document.getElementById("contenedor-modal-maestro-generos");
    if (contenedorModal) {
        const respModal = await fetch(window.VIEWS_PATH + "/generos/nuevo_genero.html");
        contenedorModal.innerHTML = await respModal.text();
    }

    // ================================================================================================================= //
    // 3. CAPTURA SEGURO DE EVENTOS (DELEGACIÓN DE EVENTOS JQUERY)
    // ================================================================================================================= //

    // Evento Añadir (Alta)
    $(document).off("click", "#add-genero-form").on("click", "#add-genero-form", function(e) {
        e.preventDefault();
        prepararYMostrarModal("alta");
    });

    // Evento Editar (Fila de la tabla)
    $(document).off("click", ".btn-editar-genero").on("click", ".btn-editar-genero", function(e) {
        e.preventDefault();
        const datos = {
            id: $(this).attr("data-id"),
            genero: $(this).attr("data-genre"),
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
    const $modal = $("#myModal-generos");
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
