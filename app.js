(() => {
  const qs = (s) => document.querySelector(s);

  // Elementos del DOM
  const editor = qs('#editor');
  const fileInput = qs('#fileInput');
  const openBtn = qs('#openBtn');
  const saveBtn = qs('#saveBtn');
  const newBtn = qs('#newBtn');
  const compileBtn = qs('#compileBtn'); // Ahora es "Ejecutar"
  const filenameEl = qs('#filename');
  const messages = qs('#messages');
  const statusEl = qs('#status');
  const metaEl = qs('#meta');
  const lineNumbers = qs('#lineNumbers');
  const specBtn = qs('#specBtn');

  specBtn.addEventListener('click', () => {
    window.open("Especificaciones_lenguaje_ShonenX.pdf", "_blank");
  });

  // --- UI HELPERS ---
  const setStatus = (text) => statusEl.textContent = text;
  const setMessages = (list) => {
    messages.innerHTML = '';
    if (!list || list.length === 0) {
      messages.innerHTML = '<div class="msg">Sin mensajes.</div>';
      return;
    }
    list.forEach((d) => {
      const div = document.createElement('div');
      div.className = 'msg ' + (d.level || '');
      div.textContent = d.message || String(d);
      messages.appendChild(div);
    });
  };

  const updateLineNumbers = () => {
    const lines = editor.value.split(/\r?\n/).length;
    lineNumbers.textContent = Array.from({ length: lines }, (_, i) => i + 1).join('\n');
    metaEl.textContent = lines + (lines === 1 ? ' línea' : ' líneas');
  };

  editor.addEventListener('scroll', () => {
    lineNumbers.scrollTop = editor.scrollTop;
  });

  editor.addEventListener('input', updateLineNumbers);
  updateLineNumbers();

  // --- MANEJO DE ARCHIVOS ---
  openBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    filenameEl.value = file.name;
    const reader = new FileReader();
    reader.onload = () => {
      editor.value = String(reader.result || '');
      updateLineNumbers();
      setMessages([{ level: 'ok', message: 'Archivo cargado.' }]);
      setStatus('Listo');
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  saveBtn.addEventListener('click', () => {
    const blob = new Blob([editor.value], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filenameEl.value || 'untitled.sx';
    a.click();
    URL.revokeObjectURL(url);
  });

  newBtn.addEventListener('click', () => {
    filenameEl.value = 'untitled.sx';
    editor.value = '';
    updateLineNumbers();
    setMessages([{ level: 'ok', message: 'Nuevo archivo listo.' }]);
    setStatus('Listo');
  });


  // ==========================================
  //     COMPILADOR E INTÉRPRETE SHONEN X
  // ==========================================

  // Definición de Operadores ShonenX [cite: 12, 13]
  const OPS = {
    'POWERUP': '+', 'DAMAGE': '-', 'FUSION': '*', 'SLICE': '/', // Matemáticos
    'STRONGER': '>', 'WEAKER': '<', 'EQUALS': '===', 'APART': '!==', 'ABS': '>=', 'ABW': '<=' // Lógicos
  };

  // 1. Analizador Léxico Básico (Helpers)
  const isDigit = (c) => /[0-9]/.test(c);
  const isAlpha = (c) => /[a-zA-Z_]/.test(c);

  // Clase para gestionar la memoria (Tabla de Símbolos)
  class Memory {
    constructor() {
      this.vars = {}; // Estructura: { nombre: { type, value } }
    }
    
    declare(name, type) {
      if (this.vars[name]) throw new Error(`Variable '${name}' ya existe.`);
      // Valores por defecto según el tipo [cite: 15]
      let defaultVal = 0;
      if (type === 'SOUL') defaultVal = "";     // String
      if (type === 'SYMBOL') defaultVal = '';   // Char
      if (type === 'SPIRIT') defaultVal = 0;    // Bool (0/1)
      if (type === 'MANA') defaultVal = 0.0;    // Float
      
      this.vars[name] = { type, value: defaultVal };
    }

    exists(name) { return !!this.vars[name]; }
    
    get(name) {
      if (!this.vars[name]) throw new Error(`Variable '${name}' no definida.`);
      return this.vars[name].value;
    }

    getType(name) {
      if (!this.vars[name]) throw new Error(`Variable '${name}' no definida.`);
      return this.vars[name].type;
    }

    set(name, val) {
      if (!this.vars[name]) throw new Error(`Variable '${name}' no definida.`);
      // Aquí se podrían agregar validaciones de tipo estrictas (Runtime Checks)
      this.vars[name].value = val;
    }
  }

  // Función principal de Compilación
  compileBtn.addEventListener('click', () => {
    const rawCode = editor.value;
    const lines = rawCode.split(/\r?\n/);
    const consoleOutput = []; // Aquí guardaremos los "SHOW"
    const errors = [];

    // FASE 1: PARSING (Análisis Sintáctico y Generación de Instrucciones)
    // Convertimos el texto en una lista de objetos "instrucción"
    let instructions = [];
    let blockStack = []; // Para controlar anidamiento de { }
    let insideOpening = false;

    try {
      for (let i = 0; i < lines.length; i++) {
        const lineNum = i + 1;
        let line = lines[i].trim();
        if (!line || line.startsWith('//')) continue; // Ignorar vacíos y comentarios

        // --- Estructura OPENING / ENDING [cite: 18] ---
        if (/^OPENING(\s*{)?$/.test(line)) {
          if (insideOpening) throw new Error(`Línea ${lineNum}: OPENING duplicado.`);
          insideOpening = true;
          instructions.push({ type: 'NOOP', line: lineNum }); 
          continue;
        }
        if (/^(}\s*)?ENDING$/.test(line)) {
            if (!insideOpening) throw new Error(`Línea ${lineNum}: ENDING sin OPENING.`);
            insideOpening = false;
            instructions.push({ type: 'END_PROGRAM', line: lineNum });
            continue;
        }
        if (!insideOpening) {
           throw new Error(`Línea ${lineNum}: Código fuera del bloque OPENING.`);
        }

        // --- Llaves de Bloques { } ---
        if (line === '{') {
          instructions.push({ type: 'BLOCK_START', line: lineNum });
          continue;
        }
        if (line === '}') {
          instructions.push({ type: 'BLOCK_END', line: lineNum });
          continue;
        }

        // --- Declaración SUMMON [cite: 20] ---
        let mSummon = line.match(/^SUMMON\s+(POWER|MANA|SYMBOL|SOUL|SPIRIT)\s+([A-Za-z_][A-Za-z0-9_]*)\s*;$/);
        if (mSummon) {
          instructions.push({ 
            type: 'SUMMON', 
            varType: mSummon[1], 
            name: mSummon[2], 
            line: lineNum 
          });
          continue;
        }

        // --- Asignación GIVE [cite: 25] ---
        // Maneja: GIVE x = 5;  o  GIVE x = y POWERUP 2;
        let mGive = line.match(/^GIVE\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)\s*;$/);
        if (mGive) {
          instructions.push({ 
            type: 'GIVE', 
            target: mGive[1], 
            expression: mGive[2], 
            line: lineNum 
          });
          continue;
        }
        // Asignación simple abreviada (común en ejemplos): x <=> 0; o x = 0;
        // El PDF usa <=> en algunos ejemplos y = en otros. Soportamos ambos.
        let mAssignSimple = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*(?:<=>|=)\s*(.+)\s*;$/);
        if (mAssignSimple && !line.startsWith("GIVE") && !line.startsWith("BIND") && !line.startsWith("SHOW")) {
             instructions.push({ 
                type: 'GIVE', 
                target: mAssignSimple[1], 
                expression: mAssignSimple[2], 
                line: lineNum 
              });
              continue;
        }


        // --- Salida SHOW [cite: 53] ---
        let mShow = line.match(/^SHOW\s+(.+)\s*;$/);
        if (mShow) {
            // Separa texto y variable si hay coma
            let content = mShow[1];
            let parts = content.split(',').map(s => s.trim());
            instructions.push({ 
                type: 'SHOW', 
                parts: parts, 
                line: lineNum 
            });
            continue;
        }

        // --- Entrada READ [cite: 52] ---
        let mRead = line.match(/^READ\s+"([^"]*)"\s*,\s*([A-Za-z_][A-Za-z0-9_]*)\s*;$/);
        if (mRead) {
            instructions.push({ 
                type: 'READ', 
                prompt: mRead[1], 
                target: mRead[2], 
                line: lineNum 
            });
            continue;
        }

        // --- Condicional BIND [cite: 26] ---
        // BIND cond WORTHY instruction
        // Nota: Para simplificar, en esta versión purista, asumiremos que WORTHY ejecuta una sola instrucción en la misma línea
        // o inicia un bloque. El ejemplo del PDF es de una línea.
        let mBind = line.match(/^BIND\s+(.+)\s+WORTHY\s+(.+)$/);
        if (mBind) {
            // Separa la instrucción "WORTHY" (ej: SHOW "Hola")
            // Parseamos la instrucción interna recursivamente o la guardamos como sub-instrucción
            // Simplificación: Guardamos el string raw para evaluarlo en tiempo de ejecución
            instructions.push({
                type: 'BIND',
                condition: mBind[1],
                actionRaw: mBind[2], // Lo que sucede si es verdad
                line: lineNum
            });
            continue;
        }

        // --- Ciclo DURING (While) [cite: 41] ---
        let mDuring = line.match(/^DURING\s+(.+)$/);
        if (mDuring) {
            instructions.push({ 
                type: 'DURING', 
                condition: mDuring[1], 
                line: lineNum 
            });
            continue;
        }

        // --- Ciclo TOSERVE (For) [cite: 31] ---
        // --- Ciclo TOSERVE (For) ---
        // CAMBIO: Ahora generamos 2 instrucciones: Una asignación previa y luego el ciclo
        let mToserve = line.match(/^TOSERVE\s+(.+)\s+UNTIL\s+(.+)\s+([A-Za-z_]\w*)\s+(GROWS|SHRINKS)$/);
        if (mToserve) {
            // Parte 1: Extraer la inicialización (ej: x=1)
            let initRaw = mToserve[1]; // "x=1"
            let initParts = initRaw.split('=');
            
            if (initParts.length === 2) {
                // Inyectamos una instrucción GIVE antes del ciclo
                instructions.push({ 
                    type: 'GIVE', 
                    target: initParts[0].trim(), 
                    expression: initParts[1].trim(), 
                    line: lineNum 
                });
            }

            // Parte 2: El ciclo en sí (solo condición y configuración de iterador)
            instructions.push({
                type: 'TOSERVE',
                condition: mToserve[2],    // ej: x<=10
                iteratorVar: mToserve[3],  // ej: x
                iteratorMode: mToserve[4], // GROWS/SHRINKS
                line: lineNum
            });
            continue;
        }

        throw new Error(`Línea ${lineNum}: Sintaxis no reconocida: "${line}"`);
      }
    } catch (e) {
      setMessages([{ level: 'error', message: e.message }]);
      setStatus('Error de Compilación');
      return;
    }

    // FASE 2: EJECUCIÓN (Interpretación)
    // Aquí es donde "corre" el programa usando el Instruction Pointer (ip)
    
    let mem = new Memory();
    let ip = 0; // Instruction Pointer
    let outputLog = [];
    
    // Helper para evaluar expresiones matemáticas/lógicas ShonenX
    const evalExpr = (exprStr) => {
        // 1. Reemplazar variables por sus valores
        // Tokenizamos por espacios y operadores
        let tokens = exprStr.split(/(\s+|POWERUP|DAMAGE|FUSION|SLICE|STRONGER|WEAKER|EQUALS|APART|ABS|ABW)/).filter(t => t.trim().length > 0);
        
        let jsExpr = "";
        
        tokens.forEach(t => {
            if (OPS[t]) {
                jsExpr += OPS[t]; // Traducir operador (ej: POWERUP -> +)
            } else if (/^[A-Za-z_]\w*$/.test(t) && mem.exists(t)) {
                let val = mem.get(t);
                // Si es string, poner comillas
                if (typeof val === 'string') jsExpr += `"${val}"`; 
                else jsExpr += val;
            } else {
                // Literales (números o strings ya entrecomillados)
                jsExpr += t;
            }
        });

        try {
            // Nota: En un compilador real escribiríamos un parser de precedencia.
            // Aquí usamos eval restringido solo para la expresión matemática final convertida a JS puro.
            return eval(jsExpr); 
        } catch (err) {
            throw new Error(`Error evaluando expresión: ${exprStr}`);
        }
    };

    // Helper para ejecutar una "micro-instrucción" (usado en BIND)
    const runMicroInstruction = (actionStr) => {
        // Parser muy básico para la acción del BIND (generalmente es SHOW o una asignación)
        if (actionStr.trim().startsWith("SHOW")) {
            let content = actionStr.replace("SHOW", "").trim();
             // Manejo básico de SHOW en BIND (puede mejorar)
             // Quitamos punto y coma final si existe
             if(content.endsWith(';')) content = content.slice(0, -1);
             
             let parts = content.split(',').map(s => s.trim());
             let msg = parts.map(p => {
                 if (p.startsWith('"') || p.startsWith("'")) return p.slice(1, -1);
                 if (mem.exists(p)) return mem.get(p);
                 return p;
             }).join(" ");
             outputLog.push(`> ${msg}`);
        }
        // Aquí se podrían agregar asignaciones dentro de IFs
    };

    // BUCLE PRINCIPAL DE EJECUCIÓN
    let execLimit = 10000; // Evitar bucles infinitos
    let cycles = 0;

    try {
        while (ip < instructions.length) {
            cycles++;
            if (cycles > execLimit) throw new Error("Stack Overflow: Bucle infinito detectado o programa muy largo.");

            const inst = instructions[ip];

            switch (inst.type) {
                case 'NOOP': 
                case 'BLOCK_START':
                case 'BLOCK_END':
                    // Los bloques se usan para saltos, por ahora avanzamos
                    ip++;
                    break;
                
                case 'SUMMON':
                    mem.declare(inst.name, inst.varType);
                    ip++;
                    break;

                case 'GIVE':
                    let val = evalExpr(inst.expression);
                    mem.set(inst.target, val);
                    ip++;
                    break;

                case 'SHOW':
                    let msg = inst.parts.map(p => {
                        // Si es literal string "..."
                        if ((p.startsWith('"') && p.endsWith('"')) || (p.startsWith("'") && p.endsWith("'"))) {
                            return p.slice(1, -1);
                        }
                        // Si es variable
                        if (mem.exists(p)) return mem.get(p);
                        return "NULL";
                    }).join(" ");
                    outputLog.push(`> ${msg}`);
                    ip++;
                    break;
                
                case 'READ':
                    // Usamos prompt del navegador para simular entrada
                    let inputVal = prompt(inst.prompt.replace(/"/g, ''));
                    // Intentar convertir a número si aplica
                    if (!isNaN(inputVal) && inputVal.trim() !== '') {
                        if (mem.getType(inst.target) === 'POWER' || mem.getType(inst.target) === 'MANA') {
                            inputVal = Number(inputVal);
                        }
                    }
                    mem.set(inst.target, inputVal);
                    ip++;
                    break;

                case 'BIND': // IF
                    let condResult = evalExpr(inst.condition);
                    if (condResult) {
                        runMicroInstruction(inst.actionRaw);
                    } else {
                        // Si hubiera ELSE (VILE), iría aquí
                    }
                    ip++;
                    break;

                case 'DURING': 
                    if (evalExpr(inst.condition)) {
                        ip++; 
                    } else {
                        // Saltar bloque si la condición es falsa
                        let depth = 0;
                        let scanner = ip + 1;
                        // Buscamos el cierre correspondiente
                        while (scanner < instructions.length) {
                            if (instructions[scanner].type === 'BLOCK_START') depth++;
                            if (instructions[scanner].type === 'BLOCK_END') depth--;
                            
                            // Si cerramos todos los bloques abiertos, paramos
                            if (depth === 0 && instructions[scanner].type === 'BLOCK_END') {
                                scanner++; // Avanzamos uno más para salir del bloque
                                break;
                            }
                            scanner++;
                        }
                        ip = scanner; 
                    }
                    break;

                case 'TOSERVE': 
                    if (evalExpr(inst.condition)) {
                        ip++;
                    } else {
                        // Saltar bloque si la condición es falsa (Misma lógica que DURING)
                        let depth = 0;
                        let scanner = ip + 1;
                        while (scanner < instructions.length) {
                            if (instructions[scanner].type === 'BLOCK_START') depth++;
                            if (instructions[scanner].type === 'BLOCK_END') depth--;
                            
                            if (depth === 0 && instructions[scanner].type === 'BLOCK_END') {
                                scanner++; 
                                break;
                            }
                            scanner++;
                        }
                        ip = scanner;
                    }
                    break;

                // Caso especial: Detectar fin de bloque para saltar atrás (Loops)
                // En una implementación real, el AST tendría punteros. Aquí escaneamos hacia atrás.
                default:
                    ip++;
            }
            
            // Lógica de Retorno de Bucle (Backpatching dinámico)
            // Si acabamos de ejecutar una instrucción que precede a un '}', verificamos si estamos en un bucle
            if (ip < instructions.length && instructions[ip].type === 'BLOCK_END') {
                // Mirar hacia atrás para ver quién abrió este bloque
                let depth = 1;
                let backScanner = ip - 1;
                let loopFound = null;
                
                while (backScanner >= 0) {
                    if (instructions[backScanner].type === 'BLOCK_END') depth++;
                    if (instructions[backScanner].type === 'BLOCK_START') depth--; // Bloque genérico
                    
                    // Si encontramos el inicio de un DURING o TOSERVE en el nivel correcto
                    if (depth === 0) {
                        if (instructions[backScanner].type === 'DURING') {
                            loopFound = backScanner;
                            break;
                        }
                        if (instructions[backScanner].type === 'TOSERVE') {
                            loopFound = backScanner;
                            // Aplicar incremento (GROWS/SHRINKS)
                            let loopInst = instructions[backScanner];
                            let currentVal = mem.get(loopInst.iteratorVar);
                            if (loopInst.iteratorMode === 'GROWS') mem.set(loopInst.iteratorVar, currentVal + 1);
                            if (loopInst.iteratorMode === 'SHRINKS') mem.set(loopInst.iteratorVar, currentVal - 1);
                            break;
                        }
                    }
                    if (depth < 0) break; // Salimos del scope
                    backScanner--;
                }

                if (loopFound !== null) {
                    ip = loopFound; // Saltar de vuelta al inicio del bucle para re-evaluar condición
                } else {
                    ip++; // Es un bloque normal (IF o OPENING), seguimos
                }
            }

            if (inst.type === 'END_PROGRAM') break;
        }

        // Éxito
        setMessages(outputLog.map(m => ({ level: 'ok', message: m })));
        setStatus('Ejecución completada ✔');

    } catch (runtimeError) {
        setMessages([{ level: 'error', message: `Error en ejecución: ${runtimeError.message}` }]);
        setStatus('Error Runtime ❌');
    }

  }); // Fin compileBtn click

})();