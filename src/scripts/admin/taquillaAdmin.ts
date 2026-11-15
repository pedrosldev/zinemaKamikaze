// Abrir y cerrar la taquilla pública desde el panel de administración.

export function initTaquillaAdmin(): void {
  const button = document.getElementById("taquillaToggle") as HTMLButtonElement | null;
  const message = document.getElementById("taquillaAdminMessage") as HTMLElement | null;

  if (!button || !message) return;

  button.addEventListener("click", async () => {
    if (button.disabled) return;

    const action = button.dataset.action === "close" ? "close" : "open";
    const label = button.textContent ?? "";
    let finished = false;

    button.disabled = true;
    button.textContent = action === "open" ? "ABRIENDO..." : "CERRANDO...";
    message.textContent = "";
    message.className = "mode-message";

    try {
      const response = await fetch("/api/set-taquilla", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ open: action === "open" }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        finished = true;
        message.textContent = `✅ ${data.message}`;
        message.className = "mode-message success";
        window.setTimeout(() => {
          window.location.reload();
        }, 900);
        return;
      }

      message.textContent = `❌ ${data.message || "No se pudo cambiar el estado"}`;
      message.className = "mode-message error";
    } catch (error) {
      console.error("Error en la taquilla:", error);
      message.textContent = "❌ Error de conexión. Inténtalo otra vez.";
      message.className = "mode-message error";
    } finally {
      if (!finished) {
        button.disabled = false;
        button.textContent = label;
      }
    }
  });
}
