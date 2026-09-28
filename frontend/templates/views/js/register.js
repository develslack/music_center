console.log("Register");

function initRegisterForm() {
  const form = document.getElementById("form-register");

  if (!form) {
    console.error("⚠️ No se encontró el formulario #form-register");
    return;
  }

  console.log("✅ Formulario REGISTRO DE USUARIO encontrado, configurando submit...");


  form.addEventListener("submit", async (e) => {
    e.preventDefault(); // 🔒 Evita que recargue el index.html
    console.log("🚀 Enviando formulario login...");

    const nombre = document.getElementById("nombre").value;
    const email = document.getElementById("email").value;
    const pwd_1 = document.getElementById("password_1").value;
    const pwd_2 = document.getElementById("password_2").value;

    $('#nombre').val('');
    $('#email').val('');
    $('#password_1').val('');
    $('#password_2').val('');


    try {
      const response = await fetch(window.API_BASE_URL +"/users/register", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `nombre=${encodeURIComponent(nombre)}&email=${encodeURIComponent(email)}&password_1=${encodeURIComponent(pwd_1)}&password_2=${encodeURIComponent(pwd_2)}`
      });

      const data = await response.json();
      console.log("📦 Respuesta del backend:", data);
      console.log("HTTP Status:", response.status);
      console.log("response.ok:", response.ok);
      console.log("data.status:", data.status);

      if (response.ok && data.status === "ok") {
              console.log("Registro de Usuario Exitoso");
              var mensaje = `<br><div class="alert alert-success alert-dismissible">
                                    <a href="#" class="close" data-dismiss="alert" aria-label="close">&times;</a>
                                        <p align=center><span class="glyphicon glyphicon-ok" aria-hidden="true"></span> ${data.message}</p></div>`;
              document.getElementById('msg-register').innerHTML = mensaje;
              setTimeout(function() { $(".close").click(); }, 3000);
              setTimeout(function() { loadView("/views/login.html"); }, 4000);

            } else {
              console.log(`Atención: Hubo un problema al intentar realizar registro de usuario:  ${data.message}`);
              var mensaje = `<br><div class="alert alert-danger alert-dismissible">
                                    <a href="#" class="close" data-dismiss="alert" aria-label="close">&times;</a>
                                        <p align=center><span class="glyphicon glyphicon-warning-sign" aria-hidden="true"></span> ${data.message}</p></div>`;
              document.getElementById('msg-register').innerHTML = mensaje;
              setTimeout(function() { $(".close").click(); }, 3000);
            }
    } catch (err) {
      console.error("💥 Error en fetch:", err);
      var mensaje = `<br><div class="alert alert-danger alert-dismissible">
                                    <a href="#" class="close" data-dismiss="alert" aria-label="close">&times;</a>
                                        <p align=center><span class="glyphicon glyphicon-warning-sign" aria-hidden="true"></span> No se pudo conectar al servidor backend</p></div>`;
              document.getElementById('msg-register').innerHTML = mensaje;
              setTimeout(function() { $(".close").click(); }, 3000);
      //alert("No se pudo conectar al servidor backend");
    }
  });
}


// Esperar a que el DOM del fragmento esté cargado
document.addEventListener("DOMContentLoaded", initRegisterForm);

// Fallback por si el fragmento fue insertado dinámicamente (sin nuevo DOMContentLoaded)
setTimeout(initRegisterForm, 500);


