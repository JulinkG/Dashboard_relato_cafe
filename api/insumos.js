// GET /api/insumos → catálogo leído del Excel de costeo.
import { leerInsumos, excelUrl } from "./_excel.js";
import { exigirSesion } from "./_sesion.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Método no permitido" });
  }
  res.setHeader("Cache-Control", "private, no-store");
  if (!exigirSesion(req, res)) return;
  try {
    const insumos = await leerInsumos();
    return res.status(200).json({ insumos, excelUrl: excelUrl(), leido: new Date().toISOString() });
  } catch (e) {
    return res.status(502).json({ error: e.message, code: e.code || "error" });
  }
}
