// Módulo para manejo de tokens de administración

export function initTokenGeneration() {
  const generateTokenBtn = document.getElementById("generateToken");

  if (generateTokenBtn) {
    generateTokenBtn.addEventListener("click", async function () {
      console.log("🎯 CLICK RECIBIDO en generar token");
      try {
        const button = this as HTMLButtonElement;
        button.disabled = true;
        button.textContent = "GENERANDO...";

        const response = await fetch("/api/generate-tokens", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });

        const result = await response.json();
        console.log("🎉 Resultado:", result);

        if (response.ok && result.token) {
          alert(
            `NUEVO CÓDIGO GENERADO:\n\n${result.token}\n\nCopia este código y compártelo con el ganador.`
          );
          location.reload();
        } else {
          alert(
            "ERROR AL GENERAR EL CÓDIGO: " +
              (result.message || "Error desconocido")
          );
        }
      } catch (error) {
        console.error("❌ Error completo:", error);
        alert("ERROR DE CONEXIÓN: " + (error as Error).message);
      } finally {
        const button = document.getElementById("generateToken") as HTMLButtonElement;
        if (button) {
          button.disabled = false;
          button.textContent = "GENERAR NUEVO CÓDIGO";
        }
      }
    });
  }
}
