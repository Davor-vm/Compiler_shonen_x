# 💥 ShonenX Compiler & Interpreter

> "El compilador que eleva tu Ki de programación a más de 9000."

![ShonenX Banner](https://img.shields.io/badge/Status-Functional-brightgreen) ![Tech](https://img.shields.io/badge/Built%20With-Vanilla%20JS-yellow)

Este proyecto es un **Compilador e Intérprete Web** completo para el lenguaje de programación esotérico **ShonenX**. A diferencia de un simple validador sintáctico, esta herramienta realiza un análisis léxico, parseo y **ejecución en tiempo real** del código, gestionando memoria y estructuras de control complejas.

## 🔗 Live Demo
¡Pruébalo en vivo aquí! 👇
**[🔗 CLICK AQUÍ PARA EJECUTAR EL COMPILADOR](https://davor-vm.github.io/Compiler_shonen_x/)**

---

## 🚀 Características Principales

Este no es solo un analizador de texto; es una **Máquina Virtual** completa que corre en el navegador:

* **Arquitectura de Dos Fases:**
    1.  **Parser:** Convierte el código fuente en una lista de instrucciones (AST simplificado).
    2.  **Runtime:** Ejecuta las instrucciones secuencialmente usando un *Instruction Pointer*.
* **Tabla de Símbolos (Memoria):** Gestión real de variables (`POWER`, `MANA`, `SOUL`) con sus valores y tipos.
* **Aritmética Shonen:** Soporte para operaciones matemáticas personalizadas (`POWERUP`, `DAMAGE`, `FUSION`).
* **Control de Flujo Completo:**
    * Ciclos `DURING` (While) con retroceso dinámico.
    * Ciclos `TOSERVE` (For) con manejo de iteradores.
    * Condicionales `BIND` (If).
* **I/O Interactivo:** Comandos `READ` y `SHOW` integrados con el navegador.

---

## 📜 Guía de Sintaxis (Cheatsheet)

El lenguaje está inspirado en tropos de anime Shonen. Aquí tienes la traducción a conceptos tradicionales:

| Concepto | ShonenX | Equivalente JS |
| :--- | :--- | :--- |
| **Inicio/Fin** | `OPENING { ... } ENDING` | `main() { ... }` |
| **Declarar** | `SUMMON POWER x;` | `let x = 0;` |
| **Asignar** | `GIVE x = 10;` | `x = 10;` |
| **Suma** | `POWERUP` | `+` |
| **Resta** | `DAMAGE` | `-` |
| **Multiplicación**| `FUSION` | `*` |
| **División** | `SLICE` | `/` |
| **Imprimir** | `SHOW "Hola", x;` | `console.log("Hola", x);` |
| **Leer** | `READ "Dato?", x;` | `x = prompt("Dato?");` |
| **While** | `DURING condición { ... }` | `while(cond) { ... }` |
| **For** | `TOSERVE i=0 UNTIL i>10 i GROWS` | `for(let i=0; i<=10; i++)` |
| **If** | `BIND x STRONGER 0 WORTHY ...` | `if (x > 0) ...` |

---

## 💻 Ejemplos de Código

### 1. Hola Mundo
```text
OPENING {
    SUMMON SOUL saludo;
    GIVE saludo = "Hola mundo soy un Guerrero Z";
    SHOW saludo;
} ENDING
