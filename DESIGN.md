---
name: Log Pose Console
description: Una consola de operación serena, con identidad de navegación y lectura sobre papel cálido.
colors:
  green: "#153f3b"
  ink: "#213c38"
  muted: "#62716c"
  paper: "#f8f7f2"
  line: "#d5dcd3"
  accent: "#e9c786"
  red: "#92362b"
  primary-hover: "#24544b"
  primary-text: "#fffaf0"
  field-background: "#fdfcf8"
  field-border: "#bbc6bb"
  focus: "#96703c"
  navigation-active: "#315950"
  navigation-active-text: "#fff4db"
  notice-background: "#edf0e8"
  notice-border: "#cbd5c6"
  error-text: "#7b3028"
  error-background: "#fff0e9"
  error-border: "#d9b0a3"
  log-pose-background: "#e9eddf"
  log-pose-border: "#d4ddc9"
typography:
  display:
    fontFamily: "Georgia, serif"
    fontSize: "clamp(38px, 4.4vw, 65px)"
    fontWeight: 400
    lineHeight: 1.12
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Georgia, serif"
    fontSize: "clamp(28px, 3vw, 38px)"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "-0.03em"
  form-title:
    fontFamily: "Georgia, serif"
    fontSize: "36px"
    fontWeight: 400
    lineHeight: 1.15
    letterSpacing: "-0.025em"
  title:
    fontFamily: '"Segoe UI", sans-serif'
    fontSize: "15px"
    fontWeight: 600
  body:
    fontFamily: '"Segoe UI", sans-serif'
    fontSize: "14px"
    lineHeight: 1.65
  label:
    fontFamily: '"Segoe UI", sans-serif'
    fontSize: "12px"
    fontWeight: 600
rounded:
  control: "5px"
  navigation: "4px"
  checkpoint: "3px"
spacing:
  compact: "8px"
  control-inline: "13px"
  action-block: "12px"
  action-inline: "18px"
  section: "32px"
  mobile-gutter: "20px"
  form-mobile-gutter: "24px"
  console-gutter: "42px"
components:
  button-primary:
    backgroundColor: "{colors.green}"
    textColor: "{colors.primary-text}"
    rounded: "{rounded.control}"
    padding: "12px 18px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  field:
    backgroundColor: "{colors.field-background}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 13px"
    height: "48px"
  navigation-active:
    backgroundColor: "{colors.navigation-active}"
    textColor: "{colors.navigation-active-text}"
    rounded: "{rounded.navigation}"
    padding: "12px 14px"
  notice:
    backgroundColor: "{colors.notice-background}"
    rounded: "{rounded.control}"
    padding: "13px 16px"
  notice-error:
    backgroundColor: "{colors.error-background}"
    textColor: "{colors.error-text}"
    rounded: "{rounded.control}"
    padding: "13px 16px"
---

# Design System: Log Pose Console

## Overview

**Creative North Star: Operate.** Una bitácora de navegación que permite operar con claridad: verde profundo para orientar, papel cálido para leer y una brújula original como firma. La identidad acompaña al trabajo con títulos serenos, controles directos y densidad contenida.

La interfaz usa fuentes del sistema y SVG propios, sin recursos visuales remotos. La identidad se comprime en móvil para dejar espacio al formulario y al contenido. Este documento captura la primera implementación; los tokens de la cabecera son la referencia normativa.

**Key Characteristics:**

- Navegación verde y superficies cálidas.
- Títulos serif y controles sans serif.
- Separadores finos y superficies planas.
- Brújula propia y acento dorado contenido.

## Colors

La paleta combina un verde sobrio con neutrales cálidos, dorado de orientación y rojo semántico.

### Primary

- **Verde de navegación** (`green`): panel de identidad, navegación y acción principal. `primary-hover` diferencia la respuesta del botón.
- **Dorado de rumbo** (`accent`): énfasis en el título de identidad y selección de texto; los matices de la brújula permanecen locales a la ilustración.

### Neutral

- **Papel cálido** (`paper`): fondo de lectura; `field-background` separa suavemente los campos.
- **Tinta verde** (`ink`): lectura principal. `muted` apoya descripciones y metadatos.
- **Línea vegetal** (`line`): divisores; `field-border` delimita campos.
- **Verde activo** (`navigation-active`): selección de navegación con `navigation-active-text`.
- **Salvia informativa** (`notice-background`, `notice-border`): avisos. El bloque Log Pose conserva sus propios tonos de salvia.
- **Error cálido** (`red`, `error-text`, `error-background`, `error-border`): validación y errores con mensaje explícito.
- **Ocre de foco** (`focus`): orientación por teclado.

**The Semantic Color Rule.** Los errores y estados se explican también con texto; el color no sustituye el mensaje.

## Typography

**Display Font:** Georgia, serif.
**Body Font:** Segoe UI, sans-serif.

Los títulos editoriales dan carácter a la bitácora; etiquetas, navegación y descripciones priorizan lectura y operación. No se descargan fuentes.

### Hierarchy

- **Display:** título de bienvenida en el panel de identidad; cursiva dorada en la frase destacada.
- **Headline:** título de página en la consola.
- **Form title:** encabezado del formulario de acceso o registro.
- **Title:** secciones de la consola en sans serif seminegrita.
- **Body:** introducciones y mensajes; las descripciones de consola son más compactas (12–13 px).
- **Label:** etiquetas de campo y acciones breves; los metadatos secundarios usan tamaños menores.

Los valores base se encuentran en la cabecera. Las variantes observadas son: título de identidad (43 px) hasta 900 px y (36 px) hasta 650 px; título de formulario (30 px) en móvil; título de página (31 px) en móvil. A partir de 1500 px, el título de identidad llega a (70 px).

## Layout

Acceso: dos columnas (46% / 54%) con identidad y formulario. El formulario tiene un ancho máximo de (390 px). La consola usa navegación lateral de (236 px) y contenido flexible con ancho máximo de (1150 px). Los separadores organizan indicadores y rutas sin convertir cada sección en una tarjeta.

Hasta (900 px), los márgenes se reducen y la barra lateral pasa a (200 px). Hasta (650 px), el acceso se apila, el formulario admite hasta (440 px), la brújula grande y la ruta decorativa se ocultan, y la navegación de consola pasa arriba en cuatro columnas. El contenido de consola usa márgenes laterales de (20 px); los formularios móviles usan (24 px). El documento soporta un ancho mínimo de (320 px).

## Elevation & Depth

Sistema plano, sin sombras. El contraste de superficies, los bordes finos y la separación espacial establecen jerarquía. El foco de teclado usa un contorno ocre de (3 px) separado del elemento por (4 px); su propósito es orientación, no elevación.

## Shapes

Controles y avisos con esquinas suavemente redondeadas; navegación y etiquetas de checkpoint usan radios algo menores. Los bordes de campos y superficies informativas son de (1 px). La geometría radial pertenece a la brújula original y al indicador de carga; la interfaz restante usa rectángulos sencillos.

## Components

### Buttons

Acciones claras y compactas: botón primario verde, texto cálido y altura mínima de (48 px). El hover cambia el fondo sin movimiento. Los controles deshabilitados bajan a una opacidad de (.65) y muestran espera. Las acciones de texto son subrayadas. El foco visible se mantiene en botones y enlaces.

### Inputs / Fields

Campos de (48 px), borde fino y etiquetas visibles. El error cambia el borde a rojo y añade texto asociado. Mostrar u ocultar contraseña es una acción explícita dentro del campo, con estado accesible. Durante el envío, los campos se deshabilitan y la acción principal presenta una espera legible.

### Cards / Containers

La información ordinaria se agrupa con separadores. El bloque Log Pose usa superficie salvia, borde suave y brújula lateral. Los avisos usan superficies discretas; la variante de error añade rojo semántico. El estado vacío centra una brújula, un título y una explicación entre dos líneas horizontales.

### Navigation

Marca serif con brújula, selección visible sobre verde y próximas etapas en tono atenuado. Las etapas futuras son texto informativo, sin enlaces vacíos. En móvil se conserva la marca y la navegación se vuelve horizontal; la información secundaria se comprime.

### Compass and loading

La brújula es un SVG original, sin logotipos oficiales ni imágenes del anime. Aparece en marca, identidad y estados. La carga usa un aro pequeño con giro lineal de (.85 s). Con preferencia de movimiento reducido, animaciones y transiciones se eliminan.

## Do's and Don'ts

### Do:

- **Do** usar la pareja Georgia / Segoe UI y los colores semánticos de la cabecera.
- **Do** preservar etiquetas, mensajes y foco visible en los controles.
- **Do** condensar la identidad móvil para priorizar la tarea.
- **Do** identificar claramente las vistas sin conexión y los estados sin datos.

### Don't:

- **Don't** presentar cifras inventadas como indicadores reales ni confundir vista previa con sesión autenticada.
- **Don't** añadir imágenes oficiales del anime, fuentes remotas o logos externos.
- **Don't** convertir las etapas futuras en acciones aparentes sin comportamiento.
- **Don't** añadir sombras o animación ornamental a las superficies planas existentes.
