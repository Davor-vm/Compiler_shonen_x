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
    lineNumbers.textContent = Array.from({length: lines}, (_, i) => i + 1).join('\n');
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

  compileBtn.addEventListener('click', () => {
    const code = editor.value;
    const lines = code.split(/\r?\n/);

    let errors = [];
    let cleanedLines = [];

    const regexRules = [
      { regex: /^OPENING(\s*{)?$/, msg: "Instrucción OPENING inválida" },
      { regex: /^(}\s*)?ENDING$/, msg: "Instrucción ENDING inválida" },
      { regex: /^SUMMON\s+(POWER|MANA|SYMBOL|SOUL|SPIRIT)\s+[A-Za-z_][A-Za-z0-9_]*\s*;$/, msg: "Declaración SUMMON inválida" },
      { regex: /^GIVE\s+[A-Za-z_][A-Za-z0-9_]*\s*=\s*[A-Za-z0-9_]+\s*((POWERUP|DAMAGE|FUSION|SLICE)\s*[A-Za-z0-9_]+)*\s*;$/, msg: "Asignación GIVE no válida" },
      { regex: /^BIND\s+[A-Za-z_][A-Za-z0-9_]*\s+(EQUALS|APART|STRONGER|WEAKER|ABS|ABW)\s+[A-Za-z0-9_]+\s+(WORTHY\s+.+)(\s+VILE\s+.+)?;$/, msg: "Expresión BIND inválida" },
      { regex: /^TOSERVE\s+.+\s+UNTIL\s+.+\s+[A-Za-z_][A-Za-z0-9_]*\s+(GROWS|SHRINKS)$/, msg: "Estructura TOSERVE inválida" },
      { regex: /^DURING\s+.+$/, msg: "Estructura DURING inválida" },
      { regex: /^{$/, msg: "Se esperaba {" },
      { regex: /^}$/, msg: "Se esperaba }" },
      { regex: /^SHOW\s+".*"\s*(,\s*[A-Za-z_][A-Za-z0-9_]*)?\s*;$/, msg: "Error en SHOW" },
      { regex: /^READ\s+".*"\s*,\s*[A-Za-z_][A-Za-z0-9_]*\s*;$/, msg: "Error en READ" },
      { regex: /^$/, msg: null }
    ];

    lines.forEach((line, i) => {
      const trimmed = line.trim();

      if (trimmed.startsWith("//")) return;
      cleanedLines.push(trimmed);

      let valid = regexRules.some(rule => rule.regex.test(trimmed));

      if (!valid) {
        errors.push({
          line: i + 1,
          text: trimmed,
          message: "Sintaxis no reconocida"
        });
      }
    });

    if (errors.length > 0) {
      setMessages(errors.map(e => ({
        level: 'error',
        message: `Línea ${e.line}: ${e.message} → "${e.text}"`
      })));
      setStatus('Errores encontrados ❌');
      return;
    }

    // Salida 100% compactada (sin espacios)
    const output = cleanedLines.map(l => l.replace(/\s+/g, "")).join("\n");

    const blob = new Blob([output], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filenameEl.value || 'program_fixed.sx';
    a.click();
    URL.revokeObjectURL(url);

    setMessages([{ level: 'ok', message: "Compilación exitosa ✔" }]);
    setStatus('Código listo ✓');
  });
})();
