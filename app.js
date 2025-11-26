(() => {
  const qs = (s) => document.querySelector(s);

  const editor = qs('#editor');
  const fileInput = qs('#fileInput');
  const openBtn = qs('#openBtn');
  const saveBtn = qs('#saveBtn');
  const newBtn = qs('#newBtn');
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

  // Sincroniza el scroll del textarea con la columna de líneas
  editor.addEventListener('scroll', () => {
    lineNumbers.scrollTop = editor.scrollTop;
  });

  // Abrir archivo
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

  // Guardar
  saveBtn.addEventListener('click', () => {
    const blob = new Blob([editor.value], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filenameEl.value || 'untitled.sx';
    a.click();
    URL.revokeObjectURL(url);
  });

  // Nuevo
  newBtn.addEventListener('click', () => {
    filenameEl.value = 'untitled.sx';
    editor.value = '';
    updateLineNumbers();
    setMessages([{ level: 'ok', message: 'Nuevo archivo listo.' }]);
    setStatus('Listo');
  });

  // Actualizar números de línea en input
  editor.addEventListener('input', updateLineNumbers);

  // Inicializar
  updateLineNumbers();
})();
