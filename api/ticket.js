// POST /api/ticket → arma el ticket con los precios del Excel y lo envía por Resend.
// Cuerpo: { items: [{ id, comprar, existencia }] }. Solo envía a TICKET_TO.
import { leerInsumos, esEnLinea, nombreProveedor } from "./_excel.js";

const fmt = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" });
const nf = (n) => (Math.round(n * 100) / 100).toLocaleString("es-MX");
const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

function armar(catalogo, items) {
  const porId = new Map(catalogo.map((i) => [i.id, i]));
  const por = {};
  for (const it of items) {
    const ins = porId.get(it.id);
    const q = Number(it.comprar);
    if (!ins || !(q > 0)) continue;
    const ex = it.existencia == null || it.existencia === "" ? null : Number(it.existencia);
    const p = ins.proveedor || "LOCAL";
    (por[p] = por[p] || []).push({
      nombre: ins.nombre,
      pres: ins.presentacion,
      q,
      existencia: Number.isFinite(ex) ? ex : null,
      t: ins.precio == null ? null : q * ins.precio,
    });
  }
  const provs = Object.keys(por).sort((a, b) => a.localeCompare(b, "es"));
  provs.forEach((p) => por[p].sort((a, b) => a.nombre.localeCompare(b.nombre, "es")));
  const suma = (ps) => ps.reduce((t, p) => t + por[p].reduce((x, i) => x + (i.t || 0), 0), 0);
  const cashP = provs.filter((p) => !esEnLinea(p));
  const onP = provs.filter((p) => esEnLinea(p));
  const cash = suma(cashP);
  const online = suma(onP);
  return {
    por, cashP, onP, cash, online,
    colchon: Math.round(cash * 10) / 100,
    llevar: cash ? Math.ceil((cash * 1.1) / 50) * 50 : 0,
    lineas: provs.reduce((n, p) => n + por[p].length, 0),
    sinPrecio: provs.reduce((n, p) => n + por[p].filter((i) => i.t == null).length, 0),
  };
}

function html(tk, fecha) {
  const td = 'style="padding:7px 8px;border-bottom:1px solid #E8DCE0;font-size:14px;color:#3A1F22"';
  const et = "font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:bold;color:#A3123A";
  const tabla = (ps) =>
    ps.map((p) =>
      `<tr><td colspan="3" style="padding:16px 8px 4px;font-size:11px;letter-spacing:1.6px;text-transform:uppercase;color:#5B4840;font-weight:bold">${esc(nombreProveedor(p))}</td></tr>` +
      tk.por[p].map((i) =>
        `<tr><td ${td} width="44"><b>${nf(i.q)} ×</b></td><td ${td}><span style="font-family:Georgia,serif;font-weight:bold">${esc(i.nombre)}</span> <span style="color:#5B4840">${esc(i.pres)}${i.existencia != null ? ` · hay ${nf(i.existencia)}` : ""}</span></td><td ${td} align="right"><b>${i.t == null ? "sin precio" : fmt.format(i.t)}</b></td></tr>`
      ).join("")
    ).join("");
  const fila = (a, b, big) =>
    `<tr><td colspan="2" style="padding:6px 8px;font-size:${big ? 18 : 14}px;color:${big ? "#F6F0F2" : "#3A1F22"};${big ? "background:#3A1F22;font-family:Georgia,serif;font-weight:bold" : ""}">${a}</td><td align="right" style="padding:6px 8px;font-size:${big ? 18 : 14}px;color:${big ? "#F6F0F2" : "#3A1F22"};${big ? "background:#3A1F22;font-weight:bold" : ""}">${b}</td></tr>`;
  return `<div style="background:#F6F0F2;padding:0 0 24px;font-family:Arial,Helvetica,sans-serif;color:#3A1F22;max-width:600px">
<div style="background:#A3123A;color:#F6F0F2;padding:22px 24px">
<div style="font-family:'Comic Sans MS',cursive;font-weight:bold;font-size:30px;line-height:1">Relato</div><div style="font-weight:bold;font-size:13px;padding-left:28px">café</div>
<div style="margin-top:10px;font-size:11px;letter-spacing:2px;text-transform:uppercase;font-weight:bold">Ticket de compra</div></div>
<div style="padding:16px 24px 0">
<p style="margin:0 0 6px;color:#5B4840;font-size:14px">${esc(fecha)}</p>
${tk.cashP.length ? `<p style="margin:16px 0 0;${et}">En tienda · efectivo</p><table width="100%" cellspacing="0" cellpadding="0" style="background:#FFFFFF">${tabla(tk.cashP)}${fila("Subtotal", fmt.format(tk.cash))}${fila("Colchón 10% por cambios de precio", fmt.format(tk.colchon))}${fila("Lleva en efectivo", fmt.format(tk.llevar), 1)}</table>` : ""}
${tk.onP.length ? `<p style="margin:22px 0 0;${et}">Mercado Libre · pago en línea</p><table width="100%" cellspacing="0" cellpadding="0" style="background:#FFFFFF">${tabla(tk.onP)}${fila("Total en línea", fmt.format(tk.online), 1)}</table>` : ""}
${tk.sinPrecio ? `<p style="color:#5B4840;font-size:13px">${tk.sinPrecio} insumo(s) sin precio no suman al total.</p>` : ""}
<p style="color:#5B4840;font-size:12px;margin-top:20px">Precios del Excel de costeo · Relato café · Historias con café</p></div></div>`;
}

function texto(tk, fecha) {
  const tx = (ps) =>
    ps.map((p) => nombreProveedor(p) + "\n" + tk.por[p].map((i) => `  ${nf(i.q)} × ${i.nombre}${i.pres ? ` (${i.pres})` : ""} ${i.t == null ? "sin precio" : fmt.format(i.t)}`).join("\n")).join("\n");
  return (
    `Ticket de compra Relato café · ${fecha}\n\n` +
    (tk.cashP.length ? tx(tk.cashP) + `\nSubtotal efectivo: ${fmt.format(tk.cash)}\nLlevar (con 10%): ${fmt.format(tk.llevar)}` : "") +
    (tk.onP.length ? `\n\nEN LÍNEA (Mercado Libre)\n` + tx(tk.onP) + `\nTotal en línea: ${fmt.format(tk.online)}` : "")
  );
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método no permitido" });
  }
  const key = process.env.RESEND_API_KEY;
  const para = (process.env.TICKET_TO || "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!key || !para.length) {
    return res.status(500).json({ error: "Faltan RESEND_API_KEY o TICKET_TO en las variables de entorno de Vercel.", code: "config" });
  }
  const items = req.body && Array.isArray(req.body.items) ? req.body.items.slice(0, 300) : null;
  if (!items) return res.status(400).json({ error: "El ticket llegó vacío.", code: "vacio" });

  let catalogo;
  try {
    catalogo = await leerInsumos();
  } catch (e) {
    return res.status(502).json({ error: e.message, code: e.code || "excel" });
  }
  const tk = armar(catalogo, items);
  if (!tk.lineas) return res.status(400).json({ error: "No hay nada por comprar en el ticket.", code: "vacio" });

  const zona = { timeZone: "America/Mexico_City" };
  const fecha = new Date().toLocaleDateString("es-MX", { ...zona, weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const corta = new Date().toLocaleDateString("es-MX", { ...zona, day: "numeric", month: "short" });
  const total = tk.cash + tk.online;

  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.RESEND_FROM || "Relato café <onboarding@resend.dev>",
      to: para,
      subject: `Ticket de compra Relato café · ${corta} · ${fmt.format(total)}`,
      html: html(tk, fecha),
      text: texto(tk, fecha),
    }),
  });
  if (!r.ok) {
    const d = await r.json().catch(() => ({}));
    return res.status(502).json({ error: `Resend no envió el correo: ${d.message || r.status}`, code: "resend" });
  }
  return res.status(200).json({ ok: true, lineas: tk.lineas, total });
}
