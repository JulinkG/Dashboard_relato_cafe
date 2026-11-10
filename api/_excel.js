// Lee la hoja "Insumos" del Excel de costeo (Drive, enlace público) y la convierte en catálogo.
import * as XLSX from "xlsx";

const ONLINE = new Set(["MERCADOLIBRE"]);

const norm = (s) =>
  String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

export const slug = (s) =>
  norm(s).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

const capital = (s) => {
  const t = String(s ?? "").trim().replace(/\s+/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
};

const numero = (v) => {
  if (v == null || v === "") return null;
  if (typeof v === "number") return isFinite(v) ? v : null;
  const n = parseFloat(String(v).replace(/[$,\s]/g, ""));
  return isFinite(n) ? n : null;
};

const proveedor = (s) => {
  const p = String(s ?? "").trim().toUpperCase();
  return !p || p === "N/A" || p === "NA" ? "LOCAL" : p;
};

export const esEnLinea = (p) => ONLINE.has(p);
export const nombreProveedor = (p) => (p === "LOCAL" ? "Local / sin proveedor" : p || "Sin proveedor");

export function excelUrl() {
  const id = process.env.EXCEL_FILE_ID;
  return id ? `https://docs.google.com/spreadsheets/d/${id}/edit` : null;
}

async function descargar(id) {
  const urls = [
    `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`,
    `https://docs.google.com/spreadsheets/d/${encodeURIComponent(id)}/export?format=xlsx`,
  ];
  let ultimo = "";
  for (const url of urls) {
    const r = await fetch(url, { redirect: "follow" });
    const tipo = r.headers.get("content-type") || "";
    if (r.ok && !tipo.includes("text/html")) return new Uint8Array(await r.arrayBuffer());
    ultimo = `Drive respondió ${r.status}`;
  }
  const e = new Error(
    `No se pudo descargar el Excel (${ultimo}). Revisa que el archivo esté compartido como "Cualquier persona con el enlace puede ver".`
  );
  e.code = "excel_privado";
  throw e;
}

export async function leerInsumos() {
  const id = process.env.EXCEL_FILE_ID;
  if (!id) {
    const e = new Error("Falta la variable de entorno EXCEL_FILE_ID.");
    e.code = "config";
    throw e;
  }
  const wb = XLSX.read(await descargar(id), { type: "array" });
  const hoja = wb.SheetNames.find((n) => norm(n) === "insumos");
  if (!hoja) {
    const e = new Error('El Excel no tiene una hoja llamada "Insumos".');
    e.code = "formato";
    throw e;
  }
  const filas = XLSX.utils.sheet_to_json(wb.Sheets[hoja], { header: 1, defval: null, raw: true });
  const h = filas.findIndex((f) => norm(f[0]) === "insumo");
  if (h < 0) {
    const e = new Error('No encontré el encabezado "Insumo" en la hoja Insumos.');
    e.code = "formato";
    throw e;
  }
  const enc = filas[h].map(norm);
  const col = (pref) => enc.findIndex((x) => x.startsWith(pref));
  const c = {
    unidad: col("unidad"),
    pres: col("presentacion"),
    cant: col("cantidad"),
    precio: col("precio"),
    prov: col("proveedor"),
  };
  const vistos = new Set();
  const insumos = [];
  for (const f of filas.slice(h + 1)) {
    const nombre = capital(f[0]);
    const id = slug(nombre);
    if (!id || vistos.has(id)) continue;
    vistos.add(id);
    const precio = c.precio >= 0 ? numero(f[c.precio]) : null;
    const prov = c.prov >= 0 && f[c.prov] != null && String(f[c.prov]).trim() !== "" ? proveedor(f[c.prov]) : precio == null ? "" : "LOCAL";
    insumos.push({
      id,
      nombre,
      unidad: c.unidad >= 0 ? String(f[c.unidad] ?? "").trim() : "",
      presentacion: c.pres >= 0 ? capital(f[c.pres] ?? "") : "",
      cantidad: c.cant >= 0 ? numero(f[c.cant]) : null,
      precio,
      proveedor: prov,
    });
  }
  return insumos;
}
