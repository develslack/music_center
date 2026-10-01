// =========================================================================
// CONFIGURACIÓN DE ENTORNO (DEV vs PROD)
// =========================================================================
const isDev = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

window.API_BASE_URL = isDev ? 'http://localhost:5000' : '/api';
window.VIEWS_PATH = isDev ? '/views' : '';

console.log("🌐 Entorno detectado. URL Base de la API:", window.API_BASE_URL);

// =========================================================================
// INDICADOR VISUAL DE ENTORNO (FLOTANTE)
// =========================================================================
const envBadge = document.createElement("div");
envBadge.innerHTML = isDev
    ? '<span class="glyphicon glyphicon-wrench"></span> ENTORNO DESARROLLO'
    : '<span class="glyphicon glyphicon-globe"></span> ENTORNO PRODUCCIÓN';

envBadge.style.position = 'fixed';
envBadge.style.bottom = '15px';
envBadge.style.right = '15px';
envBadge.style.padding = '8px 15px';
envBadge.style.borderRadius = '20px';
envBadge.style.color = '#fff';
envBadge.style.backgroundColor = isDev ? '#d35400' : '#27ae60';
envBadge.style.zIndex = '9999';
envBadge.style.fontSize = '12px';
envBadge.style.fontWeight = 'bold';
envBadge.style.boxShadow = '0 4px 6px rgba(0,0,0,0.3)';
envBadge.style.pointerEvents = 'none';

document.body.appendChild(envBadge);

// =========================================================================

document.addEventListener("DOMContentLoaded", () => {
  // Carga inicial de Home
  loadView(window.VIEWS_PATH + "/home.html");

  // Asignar eventos de navegación
  document.getElementById("link-login")?.addEventListener("click", (e) => {
    e.preventDefault();
    loadView(window.VIEWS_PATH + "/login.html");
  });

  document.getElementById("link-register")?.addEventListener("click", (e) => {
    e.preventDefault();
    loadView(window.VIEWS_PATH + "/register.html");
  });

  document.getElementById("link-password")?.addEventListener("click", (e) => {
    e.preventDefault();
    loadView(window.VIEWS_PATH + "/password.html");
  });

  document.getElementById("link-home")?.addEventListener("click", (e) => {
    e.preventDefault();
    loadView(window.VIEWS_PATH + "/home.html");
  });

  // Función para cargar una vista HTML dentro del contenedor
  async function loadView(viewPath) {
    const container = document.getElementById("views");
    if (!container) return;

    try {
      const response = await fetch(viewPath);
      if (!response.ok) throw new Error("Vista no encontrada: " + viewPath);

      const html = await response.text();
      container.innerHTML = html;

      // 🔹 Resuelve dinámicamente con window.VIEWS_PATH
      if (viewPath.includes("home.html")) {
        loadScript(window.VIEWS_PATH + "/js/news.js");
      } else if (viewPath.includes("login.html")) {
        loadScript(window.VIEWS_PATH + "/js/login.js");
      } else if (viewPath.includes("register.html")) {
        loadScript(window.VIEWS_PATH + "/js/register.js");
      } else if (viewPath.includes("password.html")) {
        loadScript(window.VIEWS_PATH + "/js/password.js");
      }

    } catch (err) {
      console.error("Error al cargar vista:", err);
    }
  }

  // Inyección limpia de script sin ?v= para no romper fopen() en el backend en C
  function loadScript(src) {
    const prevScript = document.querySelector(`script[src="${src}"]`);
    if (prevScript) {
      prevScript.remove();
    }

    const script = document.createElement("script");
    script.src = src;
    script.defer = true;
    document.body.appendChild(script);
  }

  window.loadView = loadView;
});
