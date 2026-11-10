// Prueba local: node --env-file=.env.local scripts/probar-excel.js
import { leerInsumos } from "../api/_excel.js";

const insumos = await leerInsumos();
console.log(`${insumos.length} insumos leídos del Excel`);
console.table(insumos.slice(0, 8));
const sinPrecio = insumos.filter((i) => i.precio == null).map((i) => i.nombre);
if (sinPrecio.length) console.log("Sin precio:", sinPrecio.join(", "));
