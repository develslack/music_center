// app.js
// =========================================================================
// CONFIGURACIÓN DE ENTORNO (DEV vs PROD)
// =========================================================================
const isDev = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
window.API_BASE_URL = isDev ? 'http://localhost:5000' : '/api';

// Añadir esta línea
window.VIEWS_PATH = isDev ? '/views' : '';

console.log("🌐 Entorno detectado. URL Base de la API configurada como:", window.API_BASE_URL);

// =========================================================================
// INDICADOR VISUAL DE ENTORNO (FLOTANTE)
// =========================================================================

const envBadge = document.createElement("div");

// Configurar el texto y el ícono según el entorno
envBadge.innerHTML = isDev
    ? '<span class="glyphicon glyphicon-wrench"></span> ENTORNO DESARROLLO'
    : '<span class="glyphicon glyphicon-globe"></span> ENTORNO PRODUCCIÓN';

// Aplicar estilos flotantes (Abajo a la derecha)
envBadge.style.position = 'fixed';
envBadge.style.bottom = '15px';
envBadge.style.right = '15px';
envBadge.style.padding = '8px 15px';
envBadge.style.borderRadius = '20px';
envBadge.style.color = '#fff';
envBadge.style.backgroundColor = isDev ? '#d35400' : '#27ae60'; // Naranja para Dev, Verde para Prod
envBadge.style.zIndex = '9999';
envBadge.style.fontSize = '12px';
envBadge.style.fontWeight = 'bold';
envBadge.style.boxShadow = '0 4px 6px rgba(0,0,0,0.3)';
envBadge.style.pointerEvents = 'none'; // Evita que bloquee clics en elementos debajo

// Inyectar en el documento
document.body.appendChild(envBadge);

// =========================================================================

document.addEventListener("DOMContentLoaded", () => {
  console.log("Panel de Control...");

  // Verificar si existe un usuario en sesión
  const user = JSON.parse(localStorage.getItem("user"));
  //console.log(user);

  if (!user) {
    console.warn("⚠️ No hay sesión activa, redirigiendo al inicio de sesión...");
    alert("⚠️ No hay sesión activa, redirigiendo al inicio de sesión...");
    setTimeout(function() { window.location.href = "/"; }, 3000);
    return;
  } else if (user.token.length == 128) {
    let navBar = `<nav class="navbar navbar-inverse">
                        <div class="container-fluid">
                            <div class="navbar-header">
                                <button type="button" class="navbar-toggle" data-toggle="collapse" data-target="#myNavbar">
                                    <span class="icon-bar"></span>
                                    <span class="icon-bar"></span>
                                    <span class="icon-bar"></span>
                                </button>
                                <a class="navbar-brand" href="#">
                                    <button type="button" class="btn btn-default btn-sm"><span class="glyphicon glyphicon-dashboard"></span> Dashboard </button></a>
                            </div>
                            <div class="collapse navbar-collapse" id="myNavbar">
                                <ul class="nav navbar-nav">
                                    <li id="link-home"><a href="#" data-toggle="tooltip" title="Limpar pantalla">
                                        <button type="button" class="btn btn-warning btn-sm"><span class="glyphicon glyphicon-home"></span> Home </button></a></li>
                                </ul>
                                <ul class="nav navbar-nav navbar-right">
                                    <li><a href="#" id="dashboard-logout" data-toggle="tooltip" title="Salir de la aplicación">
                                        <button type="button" class="btn btn-danger btn-sm"><span class="glyphicon glyphicon-log-out"></span> Salir </button></a></li>
                                    <li><a href="#" id="user-my-data" data-toggle="tooltip" title="Datos personales" data-id="${user.nombre}">
                                        <button type="button" class="btn btn-info btn-sm"><span class="glyphicon glyphicon-user"></span> ${user.nombre} </button></a></li>
                                </ul>
                            </div>
                        </div>
                    </nav><br>

                    <div class="container-fluid">
                        <div id="dashboard_messages"></div>
                        <div class="row content">
                            <div class="col-sm-2 sidenav">
                               <div class="panel panel-primary">
                                        <div class="panel-heading"><span class="glyphicon glyphicon-list-alt" aria-hidden="true"></span> Menú</div>
                                            <div class="panel-body">
                                                <div class="panel-group" id="accordion">
                                                    <!-- Menú 1: Sistema (Solo Admin) -->
                                                    <div class="panel panel-default" id="menu-sistema-container">
                                                        <div class="panel-heading">
                                                            <h4 class="panel-title">
                                                            <a data-toggle="collapse" data-parent="#accordion" href="#collapse1"><span class="glyphicon glyphicon-cog" aria-hidden="true"></span> Sistema</a>
                                                            </h4>
                                                        </div>
                                                        <div id="collapse1" class="panel-collapse collapse">
                                                            <div class="panel-body">
                                                                <div class="list-group">
                                                                <a href="#" class="list-group-item" id="link-usuarios" data-toggle="tooltip" title="Usuarios"><span class="glyphicon glyphicon-user" aria-hidden="true"></span> Usuarios</a>
                                                                <a href="#" class="list-group-item" id="link-documentacion_tecnica" data-toggle="tooltip" title="Listar Documentación Técnica"><span class="glyphicon glyphicon-book" aria-hidden="true"></span> Documentación Técnica</a>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <!-- Menú 2: Búsquedas -->
                                                        <div class="panel panel-default">
                                                            <div class="panel-heading">
                                                                <h4 class="panel-title">
                                                                <a data-toggle="collapse" data-parent="#accordion" href="#collapse2">
                                                                    <span class="glyphicon glyphicon-search" aria-hidden="true"></span> Búsquedas</a></h4>
                                                            </div>
                                                            <div id="collapse2" class="panel-collapse collapse in">
                                                                <div class="panel-body">
                                                                    <div class="list-group">

                                                                    <!-- Búsqueda por Artista -->
                                                                    <form class="list-group-item" id="form_search_by_artist">
                                                                        <div class="input-group">
                                                                            <input type="text" class="form-control" id="artista" placeholder="Búsqueda por Artista">
                                                                            <div class="input-group-btn">
                                                                                <button class="btn btn-default" type="submit" title="Buscar por Artista">
                                                                                    <i class="glyphicon glyphicon-search"></i>
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    </form>

                                                                    <!-- Búsqueda por Género -->
                                                                    <form class="list-group-item" id="form_search_by_genre">
                                                                        <div class="input-group">
                                                                            <select class="form-control" id="genres" style="font-weight: bold;">
                                                                                <option value="">-- Todos los Géneros --</option>
                                                                            </select>
                                                                            <div class="input-group-btn">
                                                                                <button class="btn btn-default" type="submit" title="Filtrar por Género">
                                                                                    <i class="glyphicon glyphicon-search"></i>
                                                                                </button>
                                                                            </div>
                                                                        </div>
                                                                    </form>

                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                    <!-- Menú 3: Tablas Maestro (Solo Admin) -->
                                                    <div class="panel panel-default" id="menu-maestros-container">
                                                        <div class="panel-heading">
                                                            <h4 class="panel-title">
                                                            <a data-toggle="collapse" data-parent="#accordion" href="#collapse3"><span class="glyphicon glyphicon-tree-conifer" aria-hidden="true"></span> Tablas Maestro</a></h4>
                                                        </div>
                                                        <div id="collapse3" class="panel-collapse collapse">
                                                            <div class="panel-body">
                                                                <div class="list-group">
                                                                <a href="#" class="list-group-item" id="link-generos" data-toggle="tooltip" title="Listar Géneros Músicales">
                                                                    <span class="glyphicon glyphicon-music" aria-hidden="true"></span> Géneros Musicales</a>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                </div>
                                            </div>
                                        </div>
                                    </div>
                            <div class="col-sm-10 text-left"><br>
                                <div id="dashboard_views"></div>
                            </div>
                        </div>
                    </div>`;

    // Inyectar contenido en el contenedor
    const dashNav = document.getElementById("navBar");
    dashNav.innerHTML = navBar;

    cargarComboGenerosMusicales(); // POBLAMOS EL SELECT DE GENEROS MUSICALES

    // -------------------------------------------------------------------------
    // BÚSQUEDAS: ARTISTA Y GÉNERO
    // -------------------------------------------------------------------------
    window.albumFilter = null; // Variable global para transportar el filtro

    function ejecutarFiltroAlbums(tipo, valor) {
      window.albumFilter = { tipo: tipo, valor: valor ? valor.trim() : "" };

      // Si la tabla ya está en el DOM con su DataTable inicializado, filtramos directo
      if (window.dTable && typeof window.filtrarTablaAlbums === "function") {
          window.filtrarTablaAlbums(window.albumFilter.tipo, window.albumFilter.valor);
      } else {
          // Si estamos en otra vista (home, etc.), cargamos primero la vista de álbumes
          loadDashboardView(window.VIEWS_PATH + "/albums/albums.html");
      }
    }

    // 1. Búsqueda por Artista (si viene en blanco, pasa cadena vacía y limpia el filtro)
    const formArtist = document.getElementById("form_search_by_artist");
    if (formArtist) {
      formArtist.addEventListener("submit", (e) => {
        e.preventDefault();
        const artistaVal = document.getElementById("artista").value;
        ejecutarFiltroAlbums("artista", artistaVal);
      });
    }

    // 2. Búsqueda por Género
    const formGenre = document.getElementById("form_search_by_genre");
    if (formGenre) {
      formGenre.addEventListener("submit", (e) => {
        e.preventDefault();
        const generoVal = document.getElementById("genres").value;
        ejecutarFiltroAlbums("genero", generoVal);
      });
    }

    // ============================================================================================================================== //

    // 🛡️ ADUANA VISUAL: Ocultamos estéticamente las opciones administrativas del menú a los no-admins
    if (parseInt(user.rol_id) !== 1) {
        const menuSistema = document.getElementById("menu-sistema-container");
        const menuMaestros = document.getElementById("menu-maestros-container");
        if (menuSistema) menuSistema.style.display = "none";
        if (menuMaestros) menuMaestros.style.display = "none";
    }

    document.addEventListener("click", (e) => {
      const btnEdit = e.target.closest("#user-my-data");
      if (btnEdit) {
        e.preventDefault();
        // Leemos el nombre directamente del objeto user en localStorage
        const user = JSON.parse(localStorage.getItem("user"));
        const user_name = user ? user.nombre : null;

        console.log("👤 Iniciando carga de mis datos para:", user_name);

        if (user_name) {
          loadDataUserForm(user_name);
        }
      }
    });
  }

  // ============================================================================================================================== //

  // Acción de logout
  const logoutBtn = document.getElementById("dashboard-logout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      // Eliminar datos de sesión
      localStorage.removeItem("user");

      // Redirigir al login (index.html)
      console.log("🚪 Cerrando sesión...");
      var message = `<div class="container-fluid">
                        <div class="alert alert-info">
                            <p align="center"><span class="glyphicon glyphicon-exclamation-sign" aria-hidden="true"></span> <strong>Aguarde un instante!</strong> Estamos cerrando la sesión.</p>
                        </div>
                    </div>`;

      document.getElementById('dashboard_messages').innerHTML = message;
      setTimeout(function() { window.location.href = "/"; }, 3000);
    });
  }

  const viewsContainer = document.getElementById("dashboard_views");

  // Carga inicial
  loadDashboardView(window.VIEWS_PATH + "/home.html");

  // Atribuir eventos de navegación
  document.getElementById("dashboard-logout")?.addEventListener("click", (e) => {
    e.preventDefault();
    setTimeout(function() { window.location.href = "../index.html"; }, 3000);
  });

  // ======================================================================================================================== //
  // ESPACIO DE USUARIOS //
  // ======================================================================================================================== //
  document.getElementById("link-usuarios")?.addEventListener("click", (e) => {
    e.preventDefault();
    loadDashboardView(window.VIEWS_PATH + "/usuarios.html");
  });





  // ======================================================================================================================== //

  // Click en el botón para añadir usuario
  document.addEventListener("click", (e) => {
    const target = e.target.closest("#add-user-form");
    if (target) {
      e.preventDefault();
      console.log("🟢 Botón 'Añadir Usuario' clickeado");
      loadDashboardView(window.VIEWS_PATH + "/register.html");
    }
  });

  // Click para el formulario de cambio de rol del usuario
  document.addEventListener("click", (e) => {
    const target = e.target.closest('#editar_rol_usuario');
    if (target) {
      e.preventDefault();
      console.log("🟢 Botón 'Editar Rol' clickeado");
      loadDashboardView(window.VIEWS_PATH + "/roles/rol_usuario.html");
    }
  });


  // ======================================================================================================================== //
  // ESPACIO DE ROLES //
  // ======================================================================================================================== //
  document.getElementById("link-roles")?.addEventListener("click", (e) => {
    e.preventDefault();
    loadDashboardView(window.VIEWS_PATH + "/roles/roles.html");
  });

  // Click en el botón para añadir rol/función
  document.addEventListener("click", (e) => {
    const target = e.target.closest("#add-rol-form");
    if (target) {
      e.preventDefault();
      console.log("🟢 Botón 'Añadir Roles' clickeado");
      loadDashboardView(window.VIEWS_PATH + "/roles/nuevo_rol.html");
    }
  });

  document.getElementById("link-home")?.addEventListener("click", (e) => {
    e.preventDefault();
    loadDashboardView(window.VIEWS_PATH + "/home.html");
  });

  // ======================================================================================================================== //
  // ESPACIO DE GENEROS MUSICALES //
  // ======================================================================================================================== //
  document.getElementById("link-generos")?.addEventListener("click", (e) => {
    e.preventDefault();
    loadDashboardView(window.VIEWS_PATH + "/generos/generos.html");
  });

  // ======================================================================================================================== //
  // FUNCIÓN CENTRAL DESPACHADORA CON ADUANA PERIMETRAL (KERNEL-ROUTE-FIREWALL)
  // ======================================================================================================================== //
  async function loadDashboardView(viewPath) {
    const container = document.getElementById("dashboard_views");
    if (!container) return;

    // 1. EXTRAER SESIÓN DEL LOCALSTORAGE
    const currentSession = JSON.parse(localStorage.getItem("user"));
    const rolUsuario = currentSession ? parseInt(currentSession.rol_id) : 0;

    // 2. DEFINIR PALABRAS CLAVE ASOCIADAS A MÓDULOS DE ADMINISTRACIÓN (SISTEMA Y TABLAS MAESTRO)
    const modulosAdministrativos = [
      "usuarios", "roles", "register", "rol_usuario", "nuevo_rol", "nuevo_modulo", "generos"
    ];

    // Comprobar si el viewPath actual tiene alguna de las palabras restringidas
    const esRutaRestringida = modulosAdministrativos.some(keyword => viewPath.includes(keyword));

    // 🛡️ CORTAFUEGOS NATIVO FRONTEND: Si el usuario NO es rol_id = 1, bloqueamos la inyección
    if (esRutaRestringida && rolUsuario !== 1) {
      console.warn(`🛑 [CORTAFUEGOS]: Intento de acceso denegado a la ruta: ${viewPath}`);
      container.innerHTML = `
        <br>
        <div class="container-fluid">
          <div class="jumbotron" style="background-color: #fcf8e3; border: 1px solid #fbeed5; color: #c09853; border-radius: 6px;">
            <h2 class="text-danger">
              <span class="glyphicon glyphicon-lock" aria-hidden="true"></span> <strong>Acceso Restringido</strong>
            </h2>
            <hr style="border-top-color: #f7ecb5;">
            <p style="font-size: 16px;"><strong>Lo sentimos:</strong> Su usuario no tiene permisos de acceso a este módulo.</p>
            <p style="font-size: 14px;">Si cree que se trata de un error, por favor contacte al Administrador Supremo del Sistema.</p>
            <br>
            <button class="btn btn-warning" onclick="window.loadDashboardView('/views/home.html')">
              <span class="glyphicon glyphicon-home"></span> Volver al Inicio
            </button>
          </div>
        </div>
      `;
      return; // Freno de mano: Evitamos continuar cargando el HTML y los scripts JS
    }

    try {
      const response = await fetch(viewPath);
      if (!response.ok) throw new Error("Vista no encontrada");

      const html = await response.text();
      container.innerHTML = html;

      // 🔹 Cargar JS asociado dinámicamente de forma limpia
      if (viewPath.includes("usuarios")) {
        loadDashboardScript("/js/usuarios.js");
      }
      else if (viewPath.includes("register")) {
        loadDashboardScript("/js/register.js");
      }
      else if (viewPath.includes("password")) {
        loadDashboardScript("/js/password.js");
      }
      else if (viewPath.includes("roles")) {
        loadDashboardScript("/js/roles.js");
      }
      else if (viewPath.includes("generos")) {
        loadDashboardScript("/js/generos.js");
      }
      else if (viewPath.includes("albums")) {
        loadDashboardScript("/js/albums.js");
      }

      // 🔥 TRASPASO AUTOMÁTICO DE CONTEXTO: Sincroniza y bloquea los campos de control en la vista inyectada
      setTimeout(() => {
        if (typeof window.sincronizarCamposDeControl === "function") {
          window.sincronizarCamposDeControl();
        }
      }, 50);


    } catch (err) {
      console.error("Error al cargar vista:", err);
    }
  }

  // Función auxiliar: inyecta y recarga scripts en el DOM sin romper el enrutador de estáticos
function loadDashboardScript(src) {
  // 1. Buscamos y removemos cualquier script previo que tenga la misma ruta exacta
  const scriptExistente = document.querySelector(`script[src="${src}"]`);

  if (scriptExistente) {
    scriptExistente.remove();
    console.log("♻️ Reiniciando script:", src);
  }

  // 2. Creamos e inyectamos el script limpio
  const script = document.createElement("script");
  script.type = "text/javascript";
  script.src = src;

  // Manejo de errores de carga
  script.onerror = () => {
    console.error(`💥 Error al cargar el archivo de script: ${src}`);
  };

  document.body.appendChild(script);
}



  // ✅ Exportar globalmente para que otros scripts lo usen
  window.loadDashboardView = loadDashboardView;
});

// ====================================================================================================================== //

async function cargarComboGenerosMusicales(valorSeleccionado = "") {
    const select = document.getElementById("genres");
    if (!select) return;

    try {
        const resp = await fetch(window.API_BASE_URL + "/genres/list");
        const lista = await resp.json();

        select.innerHTML = `<option value="">-- Todos los Géneros --</option>`;
        lista.forEach(item => {
            const genre = item.genre ? item.genre.trim() : "";
            if (!genre) return;
            const opt = document.createElement("option");
            opt.value = genre;
            opt.textContent = genre;
            if (genre === valorSeleccionado) opt.selected = true;
            select.appendChild(opt);
        });
    } catch (err) {
        console.error("Error al cargar Géneros Musicales en el sidebar:", err);
        select.innerHTML = `<option value="">-- Error cargando géneros --</option>`;
    }
}




// ====================================================================================================================== //

/*
 * Función que carga el formulario de datos de usuario
 * Recibe @userName como parámetro para luego pedir los datos a la base de datos de dicho usuario
 * Los campos Nombre | Email | Rol en el formulario estan bloqueados ya que no se pueden modificar.
 * Los campos habilitados son Password_1 | Password_2 para que el usuario pueda cambiar su password
 */
async function loadDataUserForm(userName) {
  console.log("📄 Cargando formulario de Datos de Usuario para:", userName);
  const container = document.getElementById("dashboard_views");

  try {
    const responseView = await fetch(window.VIEWS_PATH + "/user_data.html");
    if (!responseView.ok) throw new Error(`HTTP ${responseView.status}`);
    container.innerHTML = await responseView.text();

    // LLAMADA AL BACKEND
    const responseData = await fetch(window.API_BASE_URL +"/users/get-user", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `user_name=${encodeURIComponent(userName)}`
    });

    if (!responseData.ok) throw new Error("No se pudo obtener la data del usuario");

    const text = await responseData.text();
    console.log("Contenido crudo del backend:", text);
    const data = JSON.parse(text);
    console.log("📦 Datos recibidos para el usuario:", data);

    setTimeout(() => {
      if (data) {
        if (document.getElementById("id")) document.getElementById("id").value = data.id || "";
        if (document.getElementById("nombre")) document.getElementById("nombre").value = data.nombre || "";
        if (document.getElementById("email")) document.getElementById("email").value = data.email || "";
        if (document.getElementById("rol")) document.getElementById("rol").value = data.rol || "";
        console.log("✅ Campos del formulario cargados");
      }
    }, 150);

    // 5. Configurar el evento Submit del formulario de edición
    const form = document.getElementById("user_data_form");

    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();

        const formData = new URLSearchParams(new FormData(form));

        // Aseguramos nombres de campos para el backend C
        formData.set("email", document.getElementById("email").value);
        formData.set("password_1", document.getElementById("password_1").value);
        formData.set("password_2", document.getElementById("password_2").value);

        const res = await fetch(window.API_BASE_URL +"/password", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: formData.toString()
        });

        const result = await res.json();
        console.log("✅ Respuesta del backend:", result);

        const msgDiv = document.getElementById('msg-update-data-user');

        if (result.status === "ok") {
          msgDiv.innerHTML = `<br><div class="alert alert-success alert-dismissible">
                                <a href="#" class="close" data-dismiss="alert" aria-label="close">&times;</a>
                                <p align=center><span class="glyphicon glyphicon-ok"></span> ${result.message}</p></div>`;
          setTimeout(() => { $(".close").click(); }, 3000);
          setTimeout(() => { loadDashboardView(window.VIEWS_PATH + "/home.html"); }, 4000);
        } else {
          msgDiv.innerHTML = `<br><div class="alert alert-danger alert-dismissible">
                                <a href="#" class="close" data-dismiss="alert" aria-label="close">&times;</a>
                                <p align=center><span class="glyphicon glyphicon-warning-sign"></span> ${result.message}</p></div>`;
          setTimeout(() => { $(".close").click(); }, 3000);
        }
      };
    }

  } catch (error) {
    console.error("💥 Error en loadDataUserForm:", error);
  }
}

window.loadDataUserForm = loadDataUserForm;
