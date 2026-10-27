# Log Pose Console

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Según el enunciado: React, TypeScript estricto, Vite, React Router, Tailwind CSS,
npm y Node 24. Sin librerías de caché de servidor, kits de dashboards o animación.

## Users

Equipos de tres estudiantes que desarrollan una consola de cazarrecompensas
y demuestran su funcionamiento en una hackathon del curso.

## Product Purpose

Acceso de tripulación, indicadores, carteles, noticias y exploración de sagas.
El alcance actual es el avance local del CP1.

## Capabilities and Constraints

El usuario autorizó integrar CP1 con la API. El contrato público se consultó
en `/docs/json`. Registro y login son acciones explícitas desde los formularios.
No crear cuentas de prueba, solicitar inspecciones ni publicar en GitHub.
No inventar datos reales.
La cuenta es compartida por el equipo; aprobar CP3 desbloquea CP4 y CP5.
No se permiten imágenes o logos oficiales del anime.

## Evidence on Hand

`README.md`: enunciado original e instrucciones de ejecución.
`CP1.md`: uso de la integración. El contrato define `token`, `user`, `team`,
el resumen del workspace y el estado `LOCKED`/`UNLOCKED` del Log Pose.
