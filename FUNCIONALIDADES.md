# Control Money — Funcionalidades

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React 18 + TypeScript |
| Build | Vite 6 |
| UI | Material-UI 5 + Tailwind CSS 3 |
| Enrutamiento | React Router DOM 7 |
| BD local | IndexedDB (idb) |
| BD nube | Turso (LibSQL) |
| Auth externa | Google OAuth2 |
| Fechas | date-fns 2.30 (es) |

---

## Módulos principales

### Gastos (`/expenses`)

- Crear, editar y eliminar gastos con categoría, descripción, monto, fecha y frecuencia
- **Categorías:** Préstamos · Gastos Fijos · Comida · Transporte · Entretenimiento · Salud · Otros
- **Frecuencias:** Una vez · Mensual · Cada 2 meses · Trimestral · Anual
- Historial de pagos para gastos recurrentes
- Filtros por mes, categoría, texto libre y estado de pago (pagado / pendiente)
- **Vista mensual:** tarjetas (móvil) o tabla (desktop) con navegación por mes
- **Vista anual:** resumen consolidado del año
- Cálculo de **balance real** (balance actual − gastos pendientes del mes)
- Cálculo de **balance proyectado** (ingresos mensuales − gastos del mes)

### Ahorros (`/savings`)

- Crear, editar y eliminar metas de ahorro
- Campos: nombre, descripción, monto objetivo, monto actual, contribución mensual, fecha de inicio
- **Cálculo bidireccional:** dado el aporte mensual calcula la fecha objetivo, o dada la fecha objetivo calcula el aporte necesario
- Seguimiento de porcentaje de completitud y tiempo restante estimado
- Barra de progreso por meta
- Estado: En progreso / Completado
- Resumen global de todas las metas

### Inversiones (`/investments`)

- Crear, editar y eliminar inversiones
- **Tipos:** Depósito a Plazo Fijo · Cuenta de Ahorros · Bono del Estado · Fondo Mutuo · Otro
- Campos: monto inicial, tasa anual, plazo en meses, frecuencia de capitalización, fecha de inicio, notas
- **Frecuencias de capitalización:** Diaria · Mensual · Trimestral · Semestral · Anual
- Cálculo automático de: valor actual, valor al vencimiento, días restantes, ganancia esperada (monto y %)
- Resumen ejecutivo: total invertido, valor actual total, ganancias totales, rendimiento global
- Estado: Activa / Inactiva

### Balance e ingresos (sidebar)

- Gestión del balance global y los ingresos mensuales desde el sidebar
- Opción de ocultar/mostrar montos
- Actualización en tiempo real

---

## Configuración (`/configuration`)

### Base de datos

- Selección entre **BD local** (IndexedDB, offline) y **BD en nube** (Turso)
- Indicador visual del tipo de BD activa en el sidebar
- Cambio dinámico entre bases de datos en runtime
- Validación de conexión a Turso
- Sincronización manual entre local y nube

### Backup & Restore

- Exportar todos los datos como JSON
- Importar datos desde un archivo JSON
- Limpiar toda la base de datos

### Google Sheets

- Autenticación OAuth2 con Google
- Almacenamiento de credenciales: Client ID, Client Secret, Access Token, Refresh Token, Spreadsheet ID
- Sincronización con Google Sheets (UI preparada)
- Registro del último sync

---

## Características de UI/UX

- **Tema claro/oscuro:** toggle en sidebar, persistido en `localStorage`, con detección de preferencia del sistema
- **Diseño responsive:**
  - Desktop: sidebar fijo + tablas de datos
  - Móvil/tablet: sidebar colapsable + bottom navigation + bottom sheet de opciones extra
  - FAB (botón flotante) en posición segura para crear elementos
- Búsqueda y filtrado combinado en todas las listas
- Chips de estado, categoría y frecuencia

---

## Arquitectura de datos

### Entidades

| Entidad | Campos clave |
|---------|-------------|
| `Expense` | amount, category, description, date, frequency, isPaid, paymentHistory |
| `Balance` | amount, monthlyIncome, projectedAmount, realAmount |
| `SavingsGoal` | targetAmount, currentAmount, monthlyContribution, targetDate, completed |
| `Investment` | initialAmount, annualRate, termMonths, compoundingFrequency, maturityDate, isActive |
| `CloudDbConfig` | provider (turso), url, authToken |
| `GoogleSheetsConfig` | clientId, clientSecret, accessToken, spreadsheetId, sheetName |

### Patrón Repository

La capa de datos usa **Repository Pattern** con una factory que selecciona la implementación correcta (IndexedDB o Turso) según la preferencia del usuario. Todos los componentes consumen la misma interfaz, independientemente del backend activo.

### Lógica de selección de BD

1. `localStorage.preferred_db_type` (si existe)
2. Variable de entorno `VITE_DB_TYPE`
3. Fallback a `local` si Turso no está disponible

---

## Rutas

| Ruta | Vista |
|------|-------|
| `/` → `/expenses` | Redirección |
| `/expenses` | Gestión de gastos |
| `/savings` | Metas de ahorro |
| `/investments` | Inversiones |
| `/configuration` | BD, Backup, Google Sheets |
| `/oauth-callback` | Callback OAuth2 de Google |

---

## Variables de entorno

```env
VITE_TURSO_DATABASE_URL=      # URL de la base de datos Turso
VITE_TURSO_AUTH_TOKEN=        # Token de autenticación Turso
VITE_DB_TYPE=local            # 'local' | 'turso'
VITE_SYNC_ENABLED=true        # Habilitar sincronización automática
VITE_GOOGLE_CLIENT_ID=        # Google OAuth Client ID
VITE_GOOGLE_CLIENT_SECRET=    # Google OAuth Client Secret
```
