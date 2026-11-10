// GET /api/insumos → catálogo leído del Excel de costeo.
import { leerInsumos, excelUrl } from "./_excel.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Método no permitido" });
  }
  try {
    const insumos = await leerInsumos();
    // Vercel guarda la respuesta 60 s y sirve la anterior mientras refresca.
    res.setHeader("Cache-Control", "s-maxage=60, stale-while-revalidate=300");
    return res.status(200).json({ insumos, excelUrl: excelUrl(), leido: new Date().toISOString() });
  } catch (e) {
    return res.status(502).json({ error: e.message, code: e.code || "error" });
  }
}
