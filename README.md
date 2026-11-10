# Dashboard Relato café

Catálogo de insumos y ticket de compra de Relato café, conectado directo al Excel de costeo.

- **Catálogo:** se lee de la hoja **Insumos** del Excel en Google Drive (nombre, unidad, presentación,
  contenido, precio y proveedor). Para agregar o quitar insumos, o cambiar precios, se edita el Excel.
  El dashboard lo vuelve a leer al abrirse, cada 5 minutos y con "Actualizar desde Excel".
- **En existencia y Comprar:** se capturan en el dashboard y se guardan en el navegador de cada dispositivo.
- **Ticket:** agrupa por proveedor, separa efectivo (con 10 % de colchón) de Mercado Libre y se envía por
  correo con [Resend](https://resend.com). Los precios del correo se toman del Excel al momento de enviar.
- **Login:** usuario y contraseña definidos en Vercel (`DASHBOARD_USUARIOS`). La sesión dura 30 días en
  una cookie firmada; sin sesión, el catálogo y el envío del ticket responden 401.
- Estilo del Manual de marca v1.0 (Papel, Tinta, Grana, Cacao · Fraunces, Figtree, Shantell Sans).

## Estructura

```
index.html          Página (HTML, CSS y JS sin build)
api/_excel.js       Descarga el Excel y lee la hoja Insumos (SheetJS)
api/_sesion.js      Usuarios, cookie firmada y verificación de sesión
api/sesion.js       GET/POST/DELETE /api/sesion → ver, entrar y salir
api/insumos.js      GET  /api/insumos → catálogo en JSON
api/ticket.js       POST /api/ticket  → arma el ticket y lo manda por Resend
scripts/probar-excel.js  Prueba local de la lectura del Excel
```

## Configuración

1. **Excel público de solo lectura.** En Drive, abre `Relato_Cafe_Costeo_Recetas.xlsx` → Compartir →
   Acceso general: *Cualquier persona con el enlace* · *Lector*. Copia el ID del enlace
   (lo que va entre `/d/` y `/edit`).
2. **Resend.** Crea una cuenta en resend.com con el correo donde quieres recibir los tickets y genera una
   API key. Sin dominio verificado, Resend solo envía al correo de tu cuenta.
3. **Variables de entorno en Vercel** (Project → Settings → Environment Variables), ver `.env.example`:

   | Variable         | Valor                                              |
   |------------------|----------------------------------------------------|
   | `DASHBOARD_USUARIOS` | `usuario:contraseña` separados por coma (tú y tu socia) |
   | `SESSION_SECRET` | Texto aleatorio de 32+ caracteres (ver `.env.example`) |
   | `EXCEL_FILE_ID`  | ID del Excel en Drive                              |
   | `RESEND_API_KEY` | API key de Resend                                  |
   | `TICKET_TO`      | Correo que recibe el ticket                        |
   | `RESEND_FROM`    | Opcional. Por defecto `Relato café <onboarding@resend.dev>` |

4. **Desplegar.** En vercel.com → Add New → Project → importa `JulinkG/Dashboard_relato_cafe`.
   Framework: *Other*, sin comando de build. Vercel detecta `index.html` y la carpeta `api/`.

## Probar en tu computadora

```bash
npm install
cp .env.example .env.local   # y llena los valores
node --env-file=.env.local scripts/probar-excel.js
npx vercel dev               # http://localhost:3000
```

## La hoja Insumos

El lector busca la fila cuyo primer encabezado es **Insumo** y toma las columnas por nombre:
*Unidad base*, *Presentación de compra*, *Cantidad por presentación*, *Precio de compra* y *Proveedor*.
Puedes agregar filas o columnas nuevas sin romperlo, siempre que esos encabezados sigan existiendo.
Un proveedor vacío o `N/A` aparece como "Local / sin proveedor"; `MERCADOLIBRE` va en la sección de
pago en línea.
