(() => {
  const qs = (s) => document.querySelector(s);

  // --- REFERENCIAS AL DOM ---
  const editor = qs('#editor');
  const fileInput = qs('#fileInput');
  const openBtn = qs('#openBtn');
  const saveBtn = qs('#saveBtn');
  const newBtn = qs('#newBtn');
  const compileBtn = qs('#compileBtn');
  const filenameEl = qs('#filename');
  const messages = qs('#messages');
  const statusEl = qs('#status');
  const metaEl = qs('#meta');
  const lineNumbers = qs('#lineNumbers');
  const specBtn = qs('#specBtn');

  specBtn.addEventListener('click', () => {
    window.open("Especificaciones_lenguaje_ShonenX.pdf", "_blank");
  });

  // --- UTILIDADES DE INTERFAZ ---
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
      setMessages([{ level: 'ok', message: 'Archivo cargado correctamente.' }]);
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
    a.download = filenameEl.value || 'codigo.sx';
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
  //     CORE DEL COMPILADOR SHONEN X
  // ==========================================

  const OPS = {
    'POWERUP': '+', 'DAMAGE': '-', 'FUSION': '*', 'SLICE': '/', 
    'STRONGER': '>', 'WEAKER': '<', 'EQUALS': '===', 'APART': '!==', 'ABS': '>=', 'ABW': '<='
  };

  class Memory {
    constructor() {
      this.vars = {}; 
    }
    declare(name, type) {
      if (this.vars[name]) throw new Error(`Variable '${name}' ya existe.`);
      let defaultVal = (type === 'SOUL' || type === 'SYMBOL') ? "" : 0;
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
      this.vars[name].value = val;
    }
  }

  compileBtn.addEventListener('click', () => {
    const rawCode = editor.value;
    const lines = rawCode.split(/\r?\n/);
    
    // FASE 1: PARSING
    let instructions = [];
    let insideOpening = false;

    try {
      for (let i = 0; i < lines.length; i++) {
        const lineNum = i + 1;
        let line = lines[i].trim();
        
        if (!line || line.startsWith('//')) continue; 

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
        if (!insideOpening) throw new Error(`Línea ${lineNum}: Código fuera del bloque OPENING.`);

        if (line === '{') { instructions.push({ type: 'BLOCK_START', line: lineNum }); continue; }
        if (line === '}') { instructions.push({ type: 'BLOCK_END', line: lineNum }); continue; }

        let mSummon = line.match(/^SUMMON\s+(POWER|MANA|SYMBOL|SOUL|SPIRIT)\s+([A-Za-z_][A-Za-z0-9_]*)\s*;$/);
        if (mSummon) {
          instructions.push({ type: 'SUMMON', varType: mSummon[1], name: mSummon[2], line: lineNum });
          continue;
        }

        let mGive = line.match(/^GIVE\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)\s*;$/);
        if (mGive) {
          instructions.push({ type: 'GIVE', target: mGive[1], expression: mGive[2], line: lineNum });
          continue;
        }
        
        let mShow = line.match(/^SHOW\s+(.+)\s*;$/);
        if (mShow) {
            instructions.push({ type: 'SHOW', contentRaw: mShow[1], line: lineNum });
            continue;
        }

        let mRead = line.match(/^READ\s+"([^"]*)"\s*,\s*([A-Za-z_][A-Za-z0-9_]*)\s*;$/);
        if (mRead) {
            instructions.push({ type: 'READ', prompt: mRead[1], target: mRead[2], line: lineNum });
            continue;
        }

        // --- AQUÍ ESTÁ EL ARREGLO DEL VILE ---
        // 1. Buscamos primero la versión COMPLETA (con VILE) usando '?' para que no sea greedy
        let mBindVile = line.match(/^BIND\s+(.+?)\s+WORTHY\s+(.+?)\s+VILE\s+(.+)$/);
        
        // 2. Si no hay VILE, buscamos la versión CORTA
        let mBindSimple = line.match(/^BIND\s+(.+)\s+WORTHY\s+(.+)$/);

        if (mBindVile) {
             instructions.push({ 
                 type: 'BIND', 
                 condition: mBindVile[1], 
                 actionTrue: mBindVile[2], 
                 actionFalse: mBindVile[3], // Guardamos la acción del VILE
                 line: lineNum 
             });
             continue;
        } else if (mBindSimple) {
             instructions.push({ 
                 type: 'BIND', 
                 condition: mBindSimple[1], 
                 actionTrue: mBindSimple[2], 
                 actionFalse: null, // No hay VILE
                 line: lineNum 
             });
             continue;
        }

        let mDuring = line.match(/^DURING\s+(.+)$/);
        if (mDuring) {
            instructions.push({ type: 'DURING', condition: mDuring[1], line: lineNum });
            continue;
        }

        let mToserve = line.match(/^TOSERVE\s+(.+)\s+UNTIL\s+(.+)\s+([A-Za-z_]\w*)\s+(GROWS|SHRINKS)$/);
        if (mToserve) {
            let initRaw = mToserve[1];
            let initParts = initRaw.split('=');
            if (initParts.length === 2) {
                instructions.push({ type: 'GIVE', target: initParts[0].trim(), expression: initParts[1].trim(), line: lineNum });
            }
            instructions.push({ type: 'TOSERVE', condition: mToserve[2], iteratorVar: mToserve[3], iteratorMode: mToserve[4], line: lineNum });
            continue;
        }

        throw new Error(`Línea ${lineNum}: Sintaxis no reconocida: "${line}"`);
      }
    } catch (e) {
      setMessages([{ level: 'error', message: e.message }]);
      setStatus('Error de Compilación');
      return;
    }

    // FASE 2: EJECUCIÓN (Runtime)
    let mem = new Memory();
    let ip = 0; 
    let outputLog = [];
    let execLimit = 20000;
    let cycles = 0;

    const evalExpr = (exprStr) => {
        let safeExpr = exprStr;
        Object.keys(OPS).forEach(op => {
            let re = new RegExp(`\\b${op}\\b`, 'g'); 
            safeExpr = safeExpr.replace(re, OPS[op]);
        });
        Object.keys(mem.vars).sort((a,b) => b.length - a.length).forEach(varName => {
             let val = mem.get(varName);
             if (typeof val === 'string') val = `"${val}"`;
             let reVar = new RegExp(`\\b${varName}\\b`, 'g');
             safeExpr = safeExpr.replace(reVar, val);
        });
        try { return eval(safeExpr); } catch (err) { throw new Error(`Error evaluando: ${exprStr}`); }
    };

    // Función auxiliar para ejecutar acciones simples (usada por BIND/VILE)
    const executeActionInline = (actionString) => {
        let action = actionString.trim().replace(/;$/, ''); // Quitar punto y coma final si existe
        
        // Soporte para SHOW dentro de BIND/VILE
        if (action.startsWith('SHOW')) {
            let content = action.replace(/^SHOW\s+/, '');
            let parts = content.split(',').map(s => {
                s = s.trim();
                // Si es string literal
                if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
                    return s.slice(1, -1);
                }
                // Si es variable
                if (mem.exists(s)) return mem.get(s);
                // Si es expresión
                return evalExpr(s);
            });
            outputLog.push(`> ${parts.join(" ")}`);
        }
        // Soporte para GIVE dentro de BIND/VILE (Asignación simple)
        else if (action.startsWith('GIVE')) {
             let mGive = action.match(/^GIVE\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/);
             if (mGive) {
                 let val = evalExpr(mGive[2]);
                 mem.set(mGive[1], val);
             }
        }
    };

    try {
        while (ip < instructions.length) {
            cycles++;
            if (cycles > execLimit) throw new Error("Stack Overflow: Bucle infinito.");

            const inst = instructions[ip];

            switch (inst.type) {
                case 'NOOP': case 'BLOCK_START': case 'BLOCK_END': ip++; break;
                
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
                    let rawParts = inst.contentRaw.split(','); 
                    let msg = rawParts.map(p => {
                        p = p.trim();
                        if ((p.startsWith('"') && p.endsWith('"')) || (p.startsWith("'") && p.endsWith("'"))) {
                            return p.slice(1, -1);
                        }
                        if (mem.exists(p)) return mem.get(p);
                        return evalExpr(p);
                    }).join(" ");
                    outputLog.push(`> ${msg}`);
                    ip++;
                    break;
                
                case 'READ':
                    let inputVal = prompt(inst.prompt.replace(/"/g, ''));
                    let targetType = mem.getType(inst.target);
                    if (targetType === 'POWER' || targetType === 'MANA') {
                        let num = Number(inputVal);
                        if (isNaN(num)) num = 0;
                        inputVal = num;
                    }
                    mem.set(inst.target, inputVal);
                    ip++;
                    break;

                // --- MANEJO DE BIND CON VILE ---
                case 'BIND':
                    let conditionMet = false;
                    try {
                        conditionMet = evalExpr(inst.condition);
                    } catch (e) { conditionMet = false; }

                    if (conditionMet) {
                        // Ejecutar la parte WORTHY
                        executeActionInline(inst.actionTrue);
                    } else {
                        // Si la condición falla y EXISTE un VILE, ejecutarlo
                        if (inst.actionFalse) {
                            executeActionInline(inst.actionFalse);
                        }
                    }
                    ip++;
                    break;

                case 'DURING': 
                    if (evalExpr(inst.condition)) {
                        ip++; 
                    } else {
                        let depth = 0;
                        let scanner = ip + 1;
                        while(scanner < instructions.length) {
                            if (instructions[scanner].type === 'BLOCK_START') depth++;
                            if (instructions[scanner].type === 'BLOCK_END') depth--;
                            if (depth === 0 && instructions[scanner].type === 'BLOCK_END') {
                                scanner++; break;
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
                        let depth = 0;
                        let scanner = ip + 1;
                        while(scanner < instructions.length) {
                            if (instructions[scanner].type === 'BLOCK_START') depth++;
                            if (instructions[scanner].type === 'BLOCK_END') depth--;
                            if (depth === 0 && instructions[scanner].type === 'BLOCK_END') {
                                scanner++; break;
                            }
                            scanner++;
                        }
                        ip = scanner;
                    }
                    break;

                case 'END_PROGRAM': ip = instructions.length; break;

                default: ip++;
            }
            
            if (ip > 0 && instructions[ip-1].type === 'BLOCK_END') {
                let depth = 1;
                let backScanner = ip - 2; 
                let loopFoundIndex = -1;
                while (backScanner >= 0) {
                    if (instructions[backScanner].type === 'BLOCK_END') depth++;
                    if (instructions[backScanner].type === 'BLOCK_START') depth--;
                    if (depth === 0) {
                         if (instructions[backScanner].type === 'DURING') {
                            loopFoundIndex = backScanner; break;
                         }
                         if (instructions[backScanner].type === 'TOSERVE') {
                            loopFoundIndex = backScanner;
                            let loopInst = instructions[backScanner];
                            let currentVal = mem.get(loopInst.iteratorVar);
                            if (loopInst.iteratorMode === 'GROWS') mem.set(loopInst.iteratorVar, currentVal + 1);
                            if (loopInst.iteratorMode === 'SHRINKS') mem.set(loopInst.iteratorVar, currentVal - 1);
                            break;
                         }
                    }
                    backScanner--;
                }
                if (loopFoundIndex !== -1) ip = loopFoundIndex;
            }
        }

        setMessages(outputLog.map(m => ({ level: 'ok', message: m })));
        setStatus('Ejecución Exitosa ✔');

    } catch (runtimeError) {
        console.error(runtimeError);
        setMessages([{ level: 'error', message: `Error en ejecución: ${runtimeError.message}` }]);
        setStatus('Error Runtime ❌');
    }

  });
})();