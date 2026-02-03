export const UI = {
    qs: (s) => document.querySelector(s),
    
    // Elementos
    els: {},

    init() {
        this.els = {
            editor: this.qs('#editor'),
            fileInput: this.qs('#fileInput'),
            openBtn: this.qs('#openBtn'),
            saveBtn: this.qs('#saveBtn'),
            newBtn: this.qs('#newBtn'),
            compileBtn: this.qs('#compileBtn'),
            filename: this.qs('#filename'),
            messages: this.qs('#messages'),
            status: this.qs('#status'),
            meta: this.qs('#meta'),
            lineNumbers: this.qs('#lineNumbers'),
            specBtn: this.qs('#specBtn')
        };
        this.bindEvents();
        this.updateLineNumbers();
    },

    bindEvents() {
        this.els.editor.addEventListener('input', () => this.updateLineNumbers());
        this.els.editor.addEventListener('scroll', () => {
            this.els.lineNumbers.scrollTop = this.els.editor.scrollTop;
        });

        if(this.els.specBtn) {
            this.els.specBtn.addEventListener('click', () => window.open("Especificaciones_lenguaje_ShonenX.pdf", "_blank"));
        }
        
        // Archivos
        this.els.openBtn.addEventListener('click', () => this.els.fileInput.click());
        this.els.fileInput.addEventListener('change', (e) => this.handleFileOpen(e));
        this.els.saveBtn.addEventListener('click', () => this.handleSave());
        this.els.newBtn.addEventListener('click', () => this.handleNew());
    },

    updateLineNumbers() {
        const lines = this.els.editor.value.split(/\r?\n/).length;
        this.els.lineNumbers.textContent = Array.from({ length: lines }, (_, i) => i + 1).join('\n');
        this.els.meta.textContent = lines + (lines === 1 ? ' línea' : ' líneas');
    },

    setStatus(text, type = 'normal') {
        this.els.status.textContent = text;
        this.els.status.className = type; // Podrías añadir clases CSS para color
    },

    addMessage(msg, level = 'ok') {
        // Si el contenedor tiene "Sin mensajes", límpialo primero
        if (this.els.messages.querySelector('.msg') && this.els.messages.innerText === 'Sin mensajes.') {
            this.els.messages.innerHTML = '';
        }
        const div = document.createElement('div');
        div.className = 'msg ' + level;
        div.textContent = `> ${msg}`;
        this.els.messages.appendChild(div);
    },

    clearMessages() {
        this.els.messages.innerHTML = '';
    },

    getEditorCode() { return this.els.editor.value; },
    setEditorCode(code) { this.els.editor.value = code; this.updateLineNumbers(); },

    handleFileOpen(e) {
        const file = e.target.files[0];
        if (!file) return;
        this.els.filename.value = file.name;
        const reader = new FileReader();
        reader.onload = () => {
            this.setEditorCode(String(reader.result));
            this.addMessage('Archivo cargado.', 'ok');
            this.setStatus('Listo');
        };
        reader.readAsText(file);
        e.target.value = '';
    },

    handleSave() {
        const blob = new Blob([this.els.editor.value], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = this.els.filename.value || 'codigo.sx';
        a.click();
        URL.revokeObjectURL(url);
    },

    handleNew() {
        this.els.filename.value = 'untitled.sx';
        this.setEditorCode('');
        this.clearMessages();
        this.setStatus('Nuevo Archivo');
    }
};