/// <reference types="astro/client" />

type Runtime = import("@astrojs/cloudflare").Runtime<Env>;

declare namespace App {
  interface Locals extends Runtime {
    /** Contraseña de admin resuelta en runtime (null si no está configurada). */
    adminPassword: string | null;
    /** True si la cookie de sesión es válida. */
    adminAuthenticated: boolean;
  }
}
