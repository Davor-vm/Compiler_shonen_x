(() => {
  const qs = (s) => document.querySelector(s);

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

  editor.addEventListener('input', updateLineNumbers);
  updateLineNumbers();

  // Helpers de tipo
  const isIntegerLiteral = (s) => /^[0-9]+$/.test(s);
  const isDecimalLiteral = (s) => /^[0-9]+\.[0-9]+$/.test(s);
  const isStringLiteral = (s) => /^"[^"]*"$/.test(s) || /^'[^']*'$/.test(s);
  const isCharLiteral = (s) => /^'[^']'$/.test(s);
  const isSpiritLiteral = (s) => /^(0|1)$/.test(s);
  const isIdentifier = (s) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(s);

  // Determina el tipo de una expresión simple (literal o variable)
  const exprTypeOf = (token, declaredTypes) => {
    token = token.trim();
    if (isStringLiteral(token)) return 'SOUL';
    if (isCharLiteral(token)) return 'SYMBOL';
    if (isDecimalLiteral(token)) return 'MANA';
    if (isIntegerLiteral(token)) {
      // could be SPIRIT or POWER depending on target - caller should check SPIRIT range
      return 'POWER';
    }
    if (isIdentifier(token)) {
      return declaredTypes[token] || null;
    }
    return null;
  };

  compileBtn.addEventListener('click', () => {
    const raw = editor.value;
    const lines = raw.split(/\r?\n/);

    let errors = [];
    let cleanedLines = [];
    let declaredVars = new Set();
    let declaredTypes = {};

    // Block stack: cada entrada { type: 'DURING'|'TOSERVE'|'BLOCK', line: number }
    let blockStack = [];

    // Track if we've seen OPENING and ENDING
    let insideOpening = false;
    let foundEnding = false;

    // Iterate with ability to peek next non-comment line (for cases like DURING ... \n { )
    const peekNextNonCommentIndex = (start) => {
      for (let j = start + 1; j < lines.length; j++) {
        const t = lines[j].trim();
        if (t === '' || t.startsWith('//')) continue;
        return j;
      }
      return -1;
    };

    for (let i = 0; i < lines.length; i++) {
      const rawLine = lines[i];
      let line = rawLine.trim();

      if (line.startsWith('//')) continue; // comentarios eliminados

      if (line === '') continue; // saltar líneas vacías (no las agregamos al output)

      cleanedLines.push(line);

      // OPENING
      if (/^OPENING(\s*{)?$/.test(line)) {
        if (insideOpening) {
          errors.push({ line: i + 1, text: line, message: 'Doble OPENING no permitido' });
        }
        insideOpening = true;
        continue;
      }

      // ENDING
      if (/^(}\s*)?ENDING$/.test(line)) {
        foundEnding = true;
        insideOpening = false;
        // Si hay bloques abiertos -> error de bloque no cerrado
        if (blockStack.length > 0) {
          const b = blockStack[blockStack.length - 1];
          errors.push({ line: i + 1, text: line, message: `Bloque '${b.type}' abierto en línea ${b.line} no fue cerrado antes de ENDING` });
        }
        continue;
      }

      // Si no hemos abierto OPENING -> error por código fuera de sección
      if (!insideOpening) {
        errors.push({ line: i + 1, text: line, message: 'Código fuera de OPENING' });
        continue;
      }

      // Llave de cierre sola
      if (line === '}') {
        if (blockStack.length === 0) {
          errors.push({ line: i + 1, text: line, message: "Llave '}' fuera de bloque" });
        } else {
          blockStack.pop();
        }
        continue;
      }

      // Llave de apertura sola
      if (line === '{') {
        // apertura genérica de bloque (podría ser usada por otros)
        blockStack.push({ type: 'BLOCK', line: i + 1 });
        continue;
      }

      // SUMMON -> declarar variable y tipo
      let mSummon = line.match(/^SUMMON\s+(POWER|MANA|SYMBOL|SOUL|SPIRIT)\s+([A-Za-z_][A-Za-z0-9_]*)\s*;$/);
      if (mSummon) {
        const type = mSummon[1];
        const name = mSummon[2];
        if (declaredVars.has(name)) {
          errors.push({ line: i + 1, text: line, message: `Variable '${name}' ya declarada` });
        } else {
          declaredVars.add(name);
          declaredTypes[name] = type;
        }
        continue;
      }

      // DURING ... {   OR DURING ...   (then next line must be {)
      let mDuring = line.match(/^DURING\s+(.+)$/);
      if (mDuring) {
        // Check if it ends with '{'
        if (line.endsWith('{')) {
          blockStack.push({ type: 'DURING', line: i + 1 });
        } else {
          // peek next non-comment non-empty
          const nxt = peekNextNonCommentIndex(i);
          if (nxt === -1 || lines[nxt].trim() !== '{') {
            errors.push({ line: i + 1, text: line, message: "Se esperaba '{' después de instrucción DURING" });
          } else {
            // consume will be handled when we reach that line; but push block now to record start
            blockStack.push({ type: 'DURING', line: i + 1 });
          }
        }
        // validate condition inside DURING (simple syntactic check) — must be like: <var> <OP_LOG> <var|const>
        const cond = mDuring[1].trim();
        // basic condition pattern: identifier OP identifier|literal
        if (!/^[A-Za-z_][A-Za-z0-9_]*\s+(EQUALS|APART|STRONGER|WEAKER|ABS|ABW)\s+(.+)$/.test(cond)) {
          errors.push({ line: i + 1, text: line, message: "Condición DURING inválida" });
        } else {
          // if var used in condition exists?
          const condVarMatch = cond.match(/^([A-Za-z_][A-Za-z0-9_]*)\s+(EQUALS|APART|STRONGER|WEAKER|ABS|ABW)\s+(.+)$/);
          if (condVarMatch) {
            const left = condVarMatch[1];
            const right = condVarMatch[3].trim();
            if (!declaredVars.has(left)) {
              errors.push({ line: i + 1, text: line, message: `Variable '${left}' en condición DURING no declarada` });
            } else {
              // if right is identifier, must be declared
              if (isIdentifier(right) && !declaredVars.has(right)) {
                errors.push({ line: i + 1, text: line, message: `Operando '${right}' en condición DURING no declarado` });
              }
            }
          }
        }
        continue;
      }

      // TOSERVE <...> UNTIL <...> <var> GROWS|SHRINKS {?
      let mToserve = line.match(/^TOSERVE\s+(.+)$/);
      if (mToserve) {
        // enforce presence of UNTIL and final GROWS|SHRINKS
        const body = mToserve[1];
        // check for trailing '{' or next line '{'
        if (line.endsWith('{')) {
          blockStack.push({ type: 'TOSERVE', line: i + 1 });
        } else {
          const nxt = peekNextNonCommentIndex(i);
          if (nxt === -1 || lines[nxt].trim() !== '{') {
            errors.push({ line: i + 1, text: line, message: "Se esperaba '{' después de instrucción TOSERVE" });
          } else {
            blockStack.push({ type: 'TOSERVE', line: i + 1 });
          }
        }
        // basic validation of structure (presence of UNTIL and final GROWS/SHRINKS)
        if (!/\bUNTIL\b/.test(body) || !/(GROWS|SHRINKS)\s*$/.test(body)) {
          errors.push({ line: i + 1, text: line, message: "Estructura TOSERVE inválida (se requiere UNTIL ... GROWS|SHRINKS)" });
        } else {
          // check variable in the clause exists (roughly)
          const varMatch = body.match(/([A-Za-z_][A-Za-z0-9_]*)\s+(GROWS|SHRINKS)\s*$/);
          if (varMatch && !declaredVars.has(varMatch[1])) {
            errors.push({ line: i + 1, text: line, message: `Variable '${varMatch[1]}' en TOSERVE no declarada` });
          }
        }
        continue;
      }

      // READ validation
      let mRead = line.match(/^READ\s+"([^"]*)"\s*,\s*([A-Za-z_][A-Za-z0-9_]*)\s*;$/);
      if (mRead) {
        const varName = mRead[2];
        if (!declaredVars.has(varName)) {
          errors.push({ line: i + 1, text: line, message: `Variable '${varName}' en READ no declarada` });
        }
        continue;
      }
      if (/^READ\s+/.test(line)) {
        errors.push({ line: i + 1, text: line, message: 'READ mal formado' });
        continue;
      }

      // SHOW validation: must be "text" , var ;  OR "text" ;
      let mShow = line.match(/^SHOW\s+"([^"]*)"(?:\s*,\s*([A-Za-z_][A-Za-z0-9_]*))?\s*;$/);
      if (mShow) {
        const varName = mShow[2];
        if (varName && !declaredVars.has(varName)) {
          errors.push({ line: i + 1, text: line, message: `Variable '${varName}' en SHOW no declarada` });
        }
        continue;
      }
      if (/^SHOW\s+/.test(line)) {
        errors.push({ line: i + 1, text: line, message: 'SHOW mal formado (use SHOW "texto" , var ; )' });
        continue;
      }

      // GIVE handling with type checks
      let mGive = line.match(/^GIVE\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)\s*;$/);
      if (mGive) {
        const target = mGive[1];
        let expr = mGive[2].trim();

        // target must be declared
        if (!declaredVars.has(target)) {
          errors.push({ line: i + 1, text: line, message: `Variable '${target}' no declarada` });
          continue;
        }
        const targetType = declaredTypes[target];

        // Detect operator usage: format could be: operand1 OP operand2 OP operand3 ...
        // We'll split by operators (POWERUP, DAMAGE, FUSION, SLICE) keeping them
        const opRegex = /\b(POWERUP|DAMAGE|FUSION|SLICE)\b/;
        if (opRegex.test(expr)) {
          // Split tokens by spaces to extract operands and operators
          const parts = expr.split(/\s+/);
          // basic parsing: operand op operand [op operand ...]
          // check operands and operator validity
          let expectingOperand = true;
          let operandTypes = [];
          let opEncountered = false;
          for (let token of parts) {
            if (opRegex.test(token)) {
              expectingOperand = true;
              opEncountered = true;
            } else {
              // token is operand (could be literal or identifier)
              const ttype = exprTypeOf(token, declaredTypes);
              if (ttype === null) {
                errors.push({ line: i + 1, text: line, message: `Operando '${token}' desconocido o literal mal formado` });
                break;
              }
              operandTypes.push(ttype);
              expectingOperand = false;
            }
          }
          // if any operand type is not POWER/MANA => invalid for math ops
          for (let ot of operandTypes) {
            if (!(ot === 'POWER' || ot === 'MANA')) {
              errors.push({ line: i + 1, text: line, message: `Operador matemático inválido para operando de tipo ${ot}` });
            }
          }
          // determine resulting type: if any MANA => result MANA else POWER
          const resultType = operandTypes.includes('MANA') ? 'MANA' : 'POWER';
          if (targetType !== resultType) {
            errors.push({ line: i + 1, text: line, message: `No se puede asignar resultado ${resultType} a variable '${target}' de tipo ${targetType}` });
          }
          continue;
        } else {
          // No math operator: expr should be a single literal or identifier
          // If identifier -> must be declared and type compatible
          if (isIdentifier(expr)) {
            if (!declaredVars.has(expr)) {
              errors.push({ line: i + 1, text: line, message: `Operando '${expr}' no declarado` });
              continue;
            }
            const rhsType = declaredTypes[expr];
            if (rhsType !== targetType) {
              // Special case: assigning integer 0/1 to SPIRIT isn't applicable here because rhs is variable
              errors.push({ line: i + 1, text: line, message: `Tipo ${rhsType} no se puede asignar a variable ${targetType}` });
            }
            continue;
          }

          // literal cases
          if (isStringLiteral(expr)) {
            if (targetType !== 'SOUL') {
              errors.push({ line: i + 1, text: line, message: `Literal string no puede asignarse a variable tipo ${targetType}` });
            }
            continue;
          }
          if (isCharLiteral(expr)) {
            if (targetType !== 'SYMBOL') {
              errors.push({ line: i + 1, text: line, message: `Literal char no puede asignarse a variable tipo ${targetType}` });
            }
            continue;
          }
          if (isDecimalLiteral(expr)) {
            if (targetType !== 'MANA') {
              errors.push({ line: i + 1, text: line, message: `Literal decimal no puede asignarse a variable tipo ${targetType}` });
            }
            continue;
          }
          if (isIntegerLiteral(expr)) {
            // integer literal can map to POWER or SPIRIT (if 0/1)
            if (targetType === 'SPIRIT') {
              if (!isSpiritLiteral(expr)) {
                errors.push({ line: i + 1, text: line, message: `SPIRIT solo acepta 0 o 1` });
              }
            } else if (targetType !== 'POWER') {
              errors.push({ line: i + 1, text: line, message: `Literal entero no puede asignarse a variable tipo ${targetType}` });
            }
            continue;
          }

          // nothing matched -> malformed RHS
          errors.push({ line: i + 1, text: line, message: `Expresión RHS mal formada` });
          continue;
        }
      }

      // If reached here and none matched -> syntax not recognized
      errors.push({ line: i + 1, text: line, message: 'Sintaxis no reconocida' });
    } // end for lines

    // After loop: check for open blocks not closed (if ENDING wasn't present we also flag)
    if (!foundEnding) {
      errors.push({ line: lines.length, text: '', message: 'No se encontró ENDING' });
    }
    if (blockStack.length > 0) {
      for (let b of blockStack) {
        errors.push({ line: b.line, text: '', message: `Bloque '${b.type}' abierto en línea ${b.line} no fue cerrado` });
      }
    }

    // Report errors if any
    if (errors.length > 0) {
      // collapse errors by line order
      errors.sort((a, b) => a.line - b.line);
      setMessages(errors.map(e => ({
        level: 'error',
        message: `Línea ${e.line}: ${e.message}` + (e.text ? ` → "${e.text}"` : '')
      })));
      setStatus('Errores encontrados ❌');
      return;
    }

    // If no errors: produce compact output (remove spaces and comments)
    // We already removed comments and blank lines; now compact
    const output = cleanedLines.map(l => l.replace(/\s+/g, "")).join("\n");

    const blob = new Blob([output], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filenameEl.value || 'program_fixed.sx';
    a.click();
    URL.revokeObjectURL(url);

    setMessages([{ level: 'ok', message: 'Compilación exitosa ✔' }]);
    setStatus('Código listo ✓');
  });
})();
