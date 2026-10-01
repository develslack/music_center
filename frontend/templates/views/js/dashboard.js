// app.js
// =========================================================================
// CONFIGURACIÓN DE ENTORNO (DEV vs PROD)
// =========================================================================
const isDev = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
window.API_BASE_URL = isDev ? 'http://localhost:5000' : '/api';

// Ruta dinámica para las vistas HTML
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
envBadge.style.pointerEvents = 'none';

// Inyectar en el documento
document.body.appendChild(envBadge);

// =========================================================================

document.addEventListener("DOMContentLoaded", () => {
  console.log("Panel de Control...");

  // Verificar si existe un usuario en sesión
  const user = JSON.parse(localStorage.getItem("user"));

  if (!user) {
    console.warn("⚠️ No hay sesión activa, redirigiendo al inicio de sesión...");
    alert("⚠️ No hay sesión activa, redirigiendo al inicio de sesión...");
    setTimeout(function() { window.location.href = "/"; }, 3000);
    return;
  } else if (user.token && user.token.length == 128) {
    const esAdmin = parseInt(user.rol_id) === 1;

    // Fragmento Menú 1: Sistema (Exclusivo Administrador)
    const menuSistemaHtml = esAdmin ? `
        <div class="panel panel-default" id="menu-sistema-container">
            <div class="panel-heading">
                <h4 class="panel-title">
                    <a data-toggle="collapse" data-parent="#accordion" href="#collapse1">
                        <span class="glyphicon glyphicon-cog" aria-hidden="true"></span> Sistema
                    </a>
                </h4>
            </div>
            <div id="collapse1" class="panel-collapse collapse">
                <div class="panel-body">
                    <div class="list-group">
                        <a href="#" class="list-group-item" id="link-usuarios" data-toggle="tooltip" title="Usuarios">
                            <span class="glyphicon glyphicon-user" aria-hidden="true"></span> Usuarios
                        </a>
                        <a href="#" class="list-group-item" id="link-documentacion_tecnica" data-toggle="tooltip" title="Listar Documentación Técnica">
                            <span class="glyphicon glyphicon-book" aria-hidden="true"></span> Documentación Técnica
                        </a>
                    </div>
                </div>
            </div>
        </div>` : '';

    // Fragmento Menú 3: Tablas Maestro (Exclusivo Administrador)
    const menuMaestrosHtml = esAdmin ? `
        <div class="panel panel-default" id="menu-maestros-container">
            <div class="panel-heading">
                <h4 class="panel-title">
                    <a data-toggle="collapse" data-parent="#accordion" href="#collapse3">
                        <span class="glyphicon glyphicon-tree-conifer" aria-hidden="true"></span> Tablas Maestro
                    </a>
                </h4>
            </div>
            <div id="collapse3" class="panel-collapse collapse">
                <div class="panel-body">
                    <div class="list-group">
                        <a href="#" class="list-group-item" id="link-generos" data-toggle="tooltip" title="Listar Géneros Musicales">
                            <span class="glyphicon glyphicon-music" aria-hidden="true"></span> Géneros Musicales
                        </a>
                    </div>
                </div>
            </div>
        </div>` : '';

    let navBar = `<nav class="navbar navbar-inverse">
                        <div class="container-fluid">
                            <div class="navbar-header">
                                <button type="button" class="navbar-toggle" data-toggle="collapse" data-target="#myNavbar">
                                    <span class="icon-bar"></span>
                                    <span class="icon-bar"></span>
                                    <span class="icon-bar"></span>
                                </button>
                                <a class="navbar-brand" href="#">
                                    <button class="btn btn-default btn-sm" id="nav-btn-billboard">
                                        <span class="glyphicon glyphicon-fire" style="color: #e74c3c;"></span> Billboard Chart
                                    </button></a>
                            </div>
                            <div class="collapse navbar-collapse" id="myNavbar">
                                <ul class="nav navbar-nav">
                                    <li id="link-home"><a href="#" data-toggle="tooltip" title="Limpiar pantalla">
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
                                            ${menuSistemaHtml}

                                            <!-- Menú 2: Búsquedas (Para todos los roles) -->
                                            <div class="panel panel-default">
                                                <div class="panel-heading">
                                                    <h4 class="panel-title">
                                                        <a data-toggle="collapse" data-parent="#accordion" href="#collapse2">
                                                            <span class="glyphicon glyphicon-search" aria-hidden="true"></span> Búsquedas
                                                        </a>
                                                    </h4>
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
                                            ${menuMaestrosHtml}

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

    cargarComboGenerosMusicales();

    // -------------------------------------------------------------------------
    // BÚSQUEDAS: ARTISTA Y GÉNERO
    // -------------------------------------------------------------------------
    window.albumFilter = null;

    function ejecutarFiltroAlbums(tipo, valor) {
      window.albumFilter = { tipo: tipo, valor: valor ? valor.trim() : "" };

      if (window.dTable && typeof window.filtrarTablaAlbums === "function") {
          window.filtrarTablaAlbums(window.albumFilter.tipo, window.albumFilter.valor);
      } else {
          loadDashboardView(window.VIEWS_PATH + "/albums/albums.html");
      }
    }

    const formArtist = document.getElementById("form_search_by_artist");
    if (formArtist) {
      formArtist.addEventListener("submit", (e) => {
        e.preventDefault();
        const artistaVal = document.getElementById("artista").value;
        ejecutarFiltroAlbums("artista", artistaVal);
      });
    }

    const formGenre = document.getElementById("form_search_by_genre");
    if (formGenre) {
      formGenre.addEventListener("submit", (e) => {
        e.preventDefault();
        const generoVal = document.getElementById("genres").value;
        ejecutarFiltroAlbums("genero", generoVal);
      });
    }

    document.addEventListener("click", (e) => {
      const btnEdit = e.target.closest("#user-my-data");
      if (btnEdit) {
        e.preventDefault();
        const userStored = JSON.parse(localStorage.getItem("user"));
        const user_name = userStored ? userStored.nombre : null;

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
      localStorage.removeItem("user");
      sessionStorage.clear();

      if (window.AimpMaster && typeof window.AimpMaster.stopAll === "function") {
        window.AimpMaster.stopAll();
      }

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

  // Carga inicial
  loadDashboardView(window.VIEWS_PATH + "/billboard/billboard.html");

  // ======================================================================================================================== //
  // EVENTOS DE NAVEGACIÓN
  // ======================================================================================================================== //
  document.getElementById("link-usuarios")?.addEventListener("click", (e) => {
    e.preventDefault();
    loadDashboardView(window.VIEWS_PATH + "/usuarios.html");
  });

  document.addEventListener("click", (e) => {
    const target = e.target.closest("#add-user-form");
    if (target) {
      e.preventDefault();
      loadDashboardView(window.VIEWS_PATH + "/register.html");
    }
  });

  document.addEventListener("click", (e) => {
    const target = e.target.closest('#editar_rol_usuario');
    if (target) {
      e.preventDefault();
      loadDashboardView(window.VIEWS_PATH + "/roles/rol_usuario.html");
    }
  });

  $("#nav-btn-billboard").on("click", function(e) {
    e.preventDefault();
    window.loadDashboardView(window.VIEWS_PATH + "/billboard/billboard.html");
  });

  document.getElementById("link-roles")?.addEventListener("click", (e) => {
    e.preventDefault();
    loadDashboardView(window.VIEWS_PATH + "/roles/roles.html");
  });

  document.addEventListener("click", (e) => {
    const target = e.target.closest("#add-rol-form");
    if (target) {
      e.preventDefault();
      loadDashboardView(window.VIEWS_PATH + "/roles/nuevo_rol.html");
    }
  });

  document.getElementById("link-home")?.addEventListener("click", (e) => {
    e.preventDefault();
    loadDashboardView(window.VIEWS_PATH + "/home.html");
  });

  document.getElementById("link-generos")?.addEventListener("click", (e) => {
    e.preventDefault();
    loadDashboardView(window.VIEWS_PATH + "/generos/generos.html");
  });

  // ======================================================================================================================== //
  // FUNCIÓN CENTRAL DESPACHADORA CON ADUANA PERIMETRAL
  // ======================================================================================================================== //
  async function loadDashboardView(viewPath) {
    const container = document.getElementById("dashboard_views");
    if (!container) return;

    const currentSession = JSON.parse(localStorage.getItem("user"));
    const rolUsuario = currentSession ? parseInt(currentSession.rol_id) : 0;

    const modulosAdministrativos = [
      "usuarios", "roles", "register", "rol_usuario", "nuevo_rol", "nuevo_modulo", "generos"
    ];

    const esRutaRestringida = modulosAdministrativos.some(keyword => viewPath.includes(keyword));

    // Cortafuegos de acceso a módulos administrativos
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
      return;
    }

    try {
      const response = await fetch(viewPath);
      if (!response.ok) throw new Error("Vista no encontrada");

      const html = await response.text();
      container.innerHTML = html;

      // Carga dinámica con la ruta física real: /views/js/...[cite: 9]
      if (viewPath.includes("usuarios")) {
        loadDashboardScript("/views/js/usuarios.js");
      }
      else if (viewPath.includes("register")) {
        loadDashboardScript("/views/js/register.js");
      }
      else if (viewPath.includes("password")) {
        loadDashboardScript("/views/js/password.js");
      }
      else if (viewPath.includes("roles")) {
        loadDashboardScript("/views/js/roles.js");
      }
      else if (viewPath.includes("generos")) {
        loadDashboardScript("/views/js/generos.js");
      }
      else if (viewPath.includes("albums")) {
        loadDashboardScript("/views/js/albums.js");
      }
      else if (viewPath.includes("billboard")) {
        loadDashboardScript("/views/js/billboard.js");
      }
      else if (viewPath.includes("home")) {
        loadDashboardScript("/views/js/news.js");
      }

      setTimeout(() => {
        if (typeof window.sincronizarCamposDeControl === "function") {
          window.sincronizarCamposDeControl();
        }
      }, 50);

    } catch (err) {
      console.error("Error al cargar vista:", err);
    }
  }

  function loadDashboardScript(src) {
    const scriptExistente = document.querySelector(`script[src="${src}"]`);
    if (scriptExistente) {
      scriptExistente.remove();
    }

    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = src;

    script.onerror = () => {
      console.error(`💥 Error al cargar el archivo de script: ${src}`);
    };

    document.body.appendChild(script);
  }

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

async function loadDataUserForm(userName) {
  const container = document.getElementById("dashboard_views");

  try {
    const responseView = await fetch(window.VIEWS_PATH + "/user_data.html");
    if (!responseView.ok) throw new Error(`HTTP ${responseView.status}`);
    container.innerHTML = await responseView.text();

    const responseData = await fetch(window.API_BASE_URL + "/users/get-user", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `user_name=${encodeURIComponent(userName)}`
    });

    if (!responseData.ok) throw new Error("No se pudo obtener la data del usuario");

    const text = await responseData.text();
    const data = JSON.parse(text);

    setTimeout(() => {
      if (data) {
        if (document.getElementById("id")) document.getElementById("id").value = data.id || "";
        if (document.getElementById("nombre")) document.getElementById("nombre").value = data.nombre || "";
        if (document.getElementById("email")) document.getElementById("email").value = data.email || "";
        if (document.getElementById("rol")) document.getElementById("rol").value = data.rol || "";
      }
    }, 150);

    const form = document.getElementById("user_data_form");
    if (form) {
      form.onsubmit = async (e) => {
        e.preventDefault();

        const formData = new URLSearchParams(new FormData(form));
        formData.set("email", document.getElementById("email").value);
        formData.set("password_1", document.getElementById("password_1").value);
        formData.set("password_2", document.getElementById("password_2").value);

        const res = await fetch(window.API_BASE_URL + "/password", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: formData.toString()
        });

        const result = await res.json();
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
