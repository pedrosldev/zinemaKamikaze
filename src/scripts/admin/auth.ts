// Módulo para manejo de autenticación de admin

export function initAdminLogin() {
  const loginForm = document.getElementById("loginForm");
  
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const form = e.target as HTMLFormElement;
      const password = (form.querySelector("#password") as HTMLInputElement).value;
      const errorMessage = document.getElementById("errorMessage");
      const submitBtn = form.querySelector("button[type='submit']") as HTMLButtonElement;

      if (!errorMessage || !submitBtn) return;

      submitBtn.disabled = true;
      submitBtn.textContent = "VERIFICANDO...";
      errorMessage.textContent = "";

      try {
        const response = await fetch("/api/admin-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password }),
        });

        const result = await response.json();

        if (response.ok && result.success) {
          window.location.href = "/admin";
        } else {
          errorMessage.textContent = "CONTRASEÑA INCORRECTA";
        }
      } catch (error) {
        console.error("Error:", error);
        errorMessage.textContent = "ERROR DE CONEXIÓN";
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "ENTRAR";
      }
    });
  }
}

export function initAdminLogout() {
  const logoutBtn = document.getElementById("logoutBtn");
  
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        console.log("🔍 Cookie antes:", document.cookie);

        const response = await fetch("/api/admin-logout", {
          method: "POST",
          credentials: "include",
        });

        console.log("🔍 Respuesta:", await response.json());
        console.log("🔍 Cookie después:", document.cookie);

        // Esperar un momento antes de redirigir
        setTimeout(() => {
          window.location.href = "/admin/login";
        }, 100);
      } catch (error) {
        console.error("Error:", error);
      }
    });
  }
}
