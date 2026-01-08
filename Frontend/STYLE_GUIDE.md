# 🎨 Guía de Estilo Visual - FleetMaster

## Sistema de Control de Transporte de Carga Pesada

Esta guía define los estándares visuales para mantener consistencia en toda la aplicación.

---

## 📐 Paleta de Colores (Light Mode Premium)

### Colores Principales

| Nombre | Variable | Hex | Uso |
|--------|----------|-----|-----|
| **Primary** | `indigo-600` | `#6366F1` | CTAs, enlaces, acentos principales |
| **Primary Dark** | `indigo-700` | `#4F46E5` | Hover states |
| **Primary Light** | `indigo-50` | `#EEF2FF` | Backgrounds sutiles |

### Colores Semánticos

| Nombre | Variable | Hex | Uso |
|--------|----------|-----|-----|
| **Success** | `emerald-500` | `#10B981` | Confirmaciones, estados activos |
| **Warning** | `amber-500` | `#F59E0B` | Alertas, precauciones |
| **Danger** | `rose-500` | `#F43F5E` | Errores, eliminaciones |
| **Info** | `blue-500` | `#3B82F6` | Información neutral |

### Escala de Grises (Slate)

| Nombre | Variable | Hex | Uso |
|--------|----------|-----|-----|
| **Background** | `slate-50` | `#F8FAFC` | Fondo principal de la app |
| **Surface** | `white` | `#FFFFFF` | Cards, modales, dropdowns |
| **Border** | `slate-100` | `#F1F5F9` | Bordes sutiles |
| **Border Hover** | `slate-200` | `#E2E8F0` | Bordes en hover |
| **Text Primary** | `slate-900` | `#0F172A` | Títulos, texto principal |
| **Text Secondary** | `slate-600` | `#475569` | Texto de cuerpo |
| **Text Muted** | `slate-400` | `#94A3B8` | Placeholders, hints |

---

## 🔤 Tipografía

### Familias de Fuentes

```css
--font-display: 'Plus Jakarta Sans', system-ui, sans-serif;  /* Títulos */
--font-sans: 'Inter', system-ui, sans-serif;                 /* Cuerpo */
--font-mono: 'JetBrains Mono', monospace;                    /* Código */
```

### Escala Tipográfica

| Elemento | Clase | Peso | Uso |
|----------|-------|------|-----|
| **H1** | `text-3xl` | `font-bold` | Títulos de página |
| **H2** | `text-2xl` | `font-bold` | Secciones principales |
| **H3** | `text-lg` | `font-bold` | Subtítulos, cards |
| **Body** | `text-sm` | `font-medium` | Texto general |
| **Caption** | `text-xs` | `font-medium` | Labels, hints |
| **Overline** | `text-[10px]` | `font-bold uppercase tracking-wider` | Tags, badges |

---

## 🧩 Componentes

### Botones

```jsx
// Primario - Acciones principales
<button className="btn btn-primary">Guardar</button>

// Secundario - Acciones secundarias
<button className="btn btn-secondary">Cancelar</button>

// Danger - Acciones destructivas
<button className="btn btn-danger">Eliminar</button>

// Ghost - Acciones sutiles
<button className="btn btn-ghost">Más opciones</button>

// Soft - Variante suave del primario
<button className="btn btn-soft">Editar</button>
```

### Cards

```jsx
// Card estándar
<div className="card">
  <h3>Título</h3>
  <p>Contenido</p>
</div>

// Card con hover elevado
<div className="card hover:shadow-card-hover hover:-translate-y-1">
  ...
</div>
```

### Badges/Estados

```jsx
<span className="badge badge-success">Activo</span>
<span className="badge badge-warning">Pendiente</span>
<span className="badge badge-danger">Cancelado</span>
<span className="badge badge-info">En Curso</span>
<span className="badge badge-neutral">Inactivo</span>
```

### Inputs de Formulario

```jsx
<div className="form-group">
  <label className="form-label">Nombre</label>
  <input type="text" className="form-input" placeholder="Ingrese nombre" />
  <span className="form-error">Este campo es requerido</span>
</div>
```

### Tablas

```jsx
<div className="table-container">
  <table className="table">
    <thead>
      <tr>
        <th>Columna</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Valor</td>
      </tr>
    </tbody>
  </table>
</div>
```

### Modales

```jsx
<div className="modal-overlay">
  <div className="modal-content">
    <div className="modal-header">
      <h3>Título del Modal</h3>
      <button>✕</button>
    </div>
    <div className="modal-body">
      Contenido...
    </div>
    <div className="modal-footer">
      <button className="btn btn-secondary">Cancelar</button>
      <button className="btn btn-primary">Confirmar</button>
    </div>
  </div>
</div>
```

---

## 🌟 Sombras

```css
--shadow-card: 0 4px 20px -2px rgba(0, 0, 0, 0.05);
--shadow-card-hover: 0 20px 40px -4px rgba(0, 0, 0, 0.1);
--shadow-primary: 0 10px 25px -5px rgba(99, 102, 241, 0.4);
--shadow-danger: 0 10px 25px -5px rgba(244, 63, 94, 0.4);
--shadow-glass: 0 8px 32px 0 rgba(31, 38, 135, 0.07);
```

---

## 📏 Espaciado

### Sistema de 4px

| Nombre | Valor | Uso |
|--------|-------|-----|
| `space-1` | 4px | Gaps mínimos |
| `space-2` | 8px | Padding interno pequeño |
| `space-3` | 12px | Espaciado de elementos |
| `space-4` | 16px | Padding estándar |
| `space-6` | 24px | Secciones |
| `space-8` | 32px | Separación de bloques |
| `space-10` | 40px | Margen de página |

### Border Radius

| Nombre | Clase | Uso |
|--------|-------|-----|
| **Small** | `rounded-lg` (8px) | Botones pequeños, inputs |
| **Medium** | `rounded-xl` (12px) | Botones, badges |
| **Large** | `rounded-2xl` (16px) | Cards, modales |
| **XL** | `rounded-3xl` (24px) | Hero sections |

---

## ✨ Animaciones y Transiciones

### Duraciones

```css
transition-all duration-150  /* Micro-interacciones (hover) */
transition-all duration-200  /* Transiciones estándar */
transition-all duration-300  /* Animaciones de entrada */
transition-all duration-500  /* Animaciones complejas */
```

### Clases de Animación

```jsx
animate-fadeIn        // Fade in sutil
animate-fadeInUp      // Entrada desde abajo
animate-scaleIn       // Escala desde centro
animate-slideInRight  // Slide desde derecha
animate-bounce-subtle // Bounce sutil
animate-glow          // Efecto glow pulsante
```

### Stagger para Listas

```jsx
{items.map((item, i) => (
  <div className={`animate-fadeInUp stagger-${i + 1}`}>
    {item}
  </div>
))}
```

---

## 🎭 Estados Interactivos

### Hover

```css
hover:bg-slate-50           /* Fondo sutil */
hover:border-indigo-200     /* Borde de acento */
hover:shadow-md             /* Elevación */
hover:-translate-y-1        /* Lift effect */
hover:scale-105             /* Zoom sutil */
```

### Focus

```css
focus:ring-4                    /* Anillo de focus */
focus:ring-indigo-500/10        /* Color con opacidad */
focus:border-indigo-500         /* Borde de acento */
focus:outline-none              /* Sin outline nativo */
```

### Active

```css
active:scale-95            /* Press effect */
active:scale-[0.98]        /* Press sutil */
```

### Disabled

```css
disabled:opacity-60
disabled:cursor-not-allowed
disabled:pointer-events-none
```

---

## 📱 Responsive Breakpoints

| Breakpoint | Prefijo | Ancho mínimo |
|------------|---------|--------------|
| Mobile | (default) | 0px |
| Small | `sm:` | 640px |
| Medium | `md:` | 768px |
| Large | `lg:` | 1024px |
| XL | `xl:` | 1280px |
| 2XL | `2xl:` | 1536px |

---

## 🔧 Buenas Prácticas

### Do's ✅

1. **Usar clases utilitarias de CSS** definidas en `index.css`
2. **Mantener consistencia** en espaciados y colores
3. **Agregar transiciones** a elementos interactivos
4. **Usar Framer Motion** para animaciones complejas
5. **Implementar estados de loading** con skeletons
6. **Mostrar estados vacíos** con ilustraciones

### Don'ts ❌

1. ~~Crear estilos inline~~ - Usar clases de Tailwind
2. ~~Usar colores fuera de la paleta~~ - Mantener consistencia
3. ~~Omitir estados de hover/focus~~ - Accesibilidad
4. ~~Usar emojis en la UI~~ - A menos que sea explícito
5. ~~Hardcodear valores de espaciado~~ - Usar sistema de 4px

---

## 📦 Iconografía

Usamos **Lucide React** para iconos.

```jsx
import { Truck, Users, Package, Settings } from 'lucide-react';

// Tamaños estándar
<Icon className="h-4 w-4" />  // Pequeño (en botones)
<Icon className="h-5 w-5" />  // Estándar (en navegación)
<Icon className="h-6 w-6" />  // Grande (en cards)
<Icon className="h-8 w-8" />  // XL (en empty states)
```

---

*Última actualización: Enero 2025*
*Mantenido por el equipo de desarrollo de FleetMaster*
