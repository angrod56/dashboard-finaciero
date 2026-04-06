# Dashboard Financiero — Guía de inicio

## ¿Qué es esto?

Un dashboard local para controlar los ingresos de tu empresa. Conecta con Hotmart, Stripe y Bancolombia. Permite importar archivos históricos y recibir ventas en tiempo real por webhooks, sin duplicar datos.

---

## Requisitos

- Node.js 18 o superior (verificar con `node --version` en la terminal)
- La carpeta del proyecto: `/Users/angel/Dashboard Financiero`

---

## Iniciar el dashboard

1. Abre la Terminal
2. Ejecuta:

```bash
cd "/Users/angel/Dashboard Financiero"
npm run dev
```

3. Abre tu navegador en: **http://localhost:3000**

El dashboard se abre automáticamente en la sección de Dashboard principal.

---

## Importar tus datos históricos

### Hotmart
1. En Hotmart: ir a **Financiero → Transacciones → Exportar**
2. Exportar como CSV
3. En el dashboard: ir a **"Importar datos"**
4. Seleccionar plataforma **Hotmart**, arrastrar el archivo CSV
5. Clic en **"Analizar archivo"** para ver cuántas transacciones hay
6. Clic en **"Importar"** para confirmar

### Stripe
1. En Stripe Dashboard: ir a **Payments → Export**
2. Exportar como CSV (seleccionar "All columns")
3. En el dashboard: ir a **"Importar datos"**
4. Seleccionar plataforma **Stripe**, importar el CSV

### Bancolombia
1. En la app o web de Bancolombia: ir a tu cuenta → **Movimientos → Exportar Excel**
2. Descargar el archivo `.xlsx`
3. En el dashboard: ir a **"Importar datos"**
4. Seleccionar plataforma **Bancolombia**, importar el Excel

> ✅ Si importas el mismo archivo dos veces, las transacciones duplicadas se omiten automáticamente.

---

## Configurar webhooks (ventas en tiempo real)

Para recibir ventas automáticamente sin importar archivos:

### Stripe
1. Ve a Stripe Dashboard → Developers → Webhooks
2. Clic en "Add endpoint"
3. URL del endpoint: `http://tu-dominio.com/api/webhooks/stripe`
   - Para pruebas locales: usar [ngrok](https://ngrok.com/) o [localtunnel](https://localtunnel.me/)
4. Eventos a escuchar: `payment_intent.succeeded`, `charge.refunded`
5. Copia el "Signing secret" y pégalo en el archivo `.env`:
   ```
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

### Hotmart
1. Ve a Hotmart → Herramientas → Webhooks
2. Configura la URL: `http://tu-dominio.com/api/webhooks/hotmart`
3. Copia el token de seguridad (hottok) y pégalo en `.env`:
   ```
   HOTMART_WEBHOOK_TOKEN=tu_token_aqui
   ```

---

## Categorías de ingresos

El sistema clasifica automáticamente tus transacciones por palabras clave en el nombre del producto:

| Categoría | Palabras clave detectadas |
|-----------|--------------------------|
| Mentoría/Coaching | mentor, coaching, 1:1, acompañ |
| Membresía | members, membresia, suscri, club |
| Servicio | servicio, consul, agencia, freelance |
| Producto Digital | todo lo demás (cursos, ebooks, etc.) |

---

## Tasas de cambio (COP → USD)

Los ingresos de Bancolombia (COP) se convierten a USD automáticamente con una tasa aproximada. Para usar tasas exactas, puedes agregarlas directamente en la base de datos usando Prisma Studio:

```bash
npm run db:studio
```

---

## Estructura del proyecto

```
Dashboard Financiero/
├── prisma/
│   └── dev.db          ← Base de datos SQLite (todos tus datos)
├── src/
│   ├── app/            ← Páginas y rutas de la API
│   ├── components/     ← Componentes visuales
│   └── lib/            ← Lógica de negocio y parsers
└── .env                ← Configuración (tokens, database URL)
```

> 💾 **Backup**: Para hacer un respaldo de todos tus datos, simplemente copia el archivo `prisma/dev.db`.

---

## Solución de problemas

**El comando `npm run dev` falla:**
- Verifica que Node.js esté instalado: `node --version`
- Intenta `npm install` primero y luego `npm run dev`

**No aparecen datos en el dashboard:**
- Importa primero tus archivos históricos en "Importar datos"

**Error al importar Bancolombia:**
- Asegúrate de exportar en formato `.xlsx` (no PDF)
- El archivo debe tener las columnas: Fecha, Descripción, Crédito/Débito

**Los montos en USD no coinciden:**
- La conversión COP→USD usa una tasa aproximada. Usa `npm run db:studio` para ingresar tasas reales.
