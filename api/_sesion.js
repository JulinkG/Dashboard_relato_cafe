// Sesión sin base de datos: usuarios en DASHBOARD_USUARIOS y cookie firmada con SESSION_SECRET.
import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE = "relato_sesion";
const DURACION = 30 * 24 * 60 * 60; // 30 días, en segundos

function secreto() {
  const s = process.env.SESSION_SECRET || "";
  if (s.length < 32) {
    const e = new Error("Falta SESSION_SECRET (mínimo 32 caracteres) en las variables de entorno.");
    e.code = "config";
    throw e;
  }
  return s;
}

// "julian:clave1,socia:clave2" → Map(usuario → contraseña)
function usuarios() {
  const m = new Map();
  for (const par of (process.env.DASHBOARD_USUARIOS || "").split(",")) {
    const i = par.indexOf(":");
    if (i <= 0) continue;
    const u = par.slice(0, i).trim().toLowerCase();
    const p = par.slice(i + 1).trim();
    if (u && p) m.set(u, p);
  }
  return m;
}

const igualSeguro = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
};

const firmar = (datos) => createHmac("sha256", secreto()).update(datos).digest("base64url");

export function verificarCredenciales(usuario, contrasena) {
  const lista = usuarios();
  if (!lista.size) {
    const e = new Error("Falta DASHBOARD_USUARIOS en las variables de entorno.");
    e.code = "config";
    throw e;
  }
  const u = String(usuario || "").trim().toLowerCase();
  const esperada = lista.get(u);
  // Compara siempre para no revelar por tiempo si el usuario existe.
  const ok = igualSeguro(esperada ?? "\u0000".repeat(String(contrasena || "").length), String(contrasena || ""));
  return ok && esperada != null ? u : null;
}

export function crearCookie(usuario, req) {
  const datos = Buffer.from(JSON.stringify({ u: usuario, exp: Math.floor(Date.now() / 1000) + DURACION })).toString("base64url");
  const valor = `${datos}.${firmar(datos)}`;
  const seguro = (req.headers["x-forwarded-proto"] || "").includes("https") ? "; Secure" : "";
  return `${COOKIE}=${valor}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${DURACION}${seguro}`;
}

export const borrarCookie = () => `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;

function leerCookie(req) {
  const c = req.headers.cookie || "";
  for (const parte of c.split(";")) {
    const [k, ...v] = parte.trim().split("=");
    if (k === COOKIE) return v.join("=");
  }
  return null;
}

// Devuelve el usuario de la sesión o null. El usuario debe seguir en DASHBOARD_USUARIOS.
export function usuarioDeSesion(req) {
  const valor = leerCookie(req);
  if (!valor) return null;
  const [datos, firma] = valor.split(".");
  if (!datos || !firma || !igualSeguro(firma, firmar(datos))) return null;
  try {
    const { u, exp } = JSON.parse(Buffer.from(datos, "base64url").toString());
    if (!u || !(exp > Date.now() / 1000)) return null;
    return usuarios().has(u) ? u : null;
  } catch {
    return null;
  }
}

// Corta la petición con 401 si no hay sesión. Uso: const u = exigirSesion(req, res); if (!u) return;
export function exigirSesion(req, res) {
  try {
    const u = usuarioDeSesion(req);
    if (u) return u;
    res.status(401).json({ error: "Inicia sesión para continuar.", code: "sin_sesion" });
  } catch (e) {
    res.status(500).json({ error: e.message, code: e.code || "config" });
  }
  return null;
}
