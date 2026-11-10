// GET    /api/sesion → { usuario } o 401
// POST   /api/sesion → entrar con { usuario, contrasena }
// DELETE /api/sesion → salir
import { verificarCredenciales, crearCookie, borrarCookie, usuarioDeSesion } from "./_sesion.js";

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  try {
    if (req.method === "GET") {
      const u = usuarioDeSesion(req);
      return u ? res.status(200).json({ usuario: u }) : res.status(401).json({ error: "Sin sesión", code: "sin_sesion" });
    }
    if (req.method === "POST") {
      const { usuario, contrasena } = req.body || {};
      const u = verificarCredenciales(usuario, contrasena);
      if (!u) {
        await espera(800); // frena intentos repetidos
        return res.status(401).json({ error: "Usuario o contraseña incorrectos.", code: "credenciales" });
      }
      res.setHeader("Set-Cookie", crearCookie(u, req));
      return res.status(200).json({ usuario: u });
    }
    if (req.method === "DELETE") {
      res.setHeader("Set-Cookie", borrarCookie());
      return res.status(200).json({ ok: true });
    }
    res.setHeader("Allow", "GET, POST, DELETE");
    return res.status(405).json({ error: "Método no permitido" });
  } catch (e) {
    return res.status(500).json({ error: e.message, code: e.code || "error" });
  }
}
