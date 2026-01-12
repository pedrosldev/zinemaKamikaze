// Módulo para manejo de autenticación de admin

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
