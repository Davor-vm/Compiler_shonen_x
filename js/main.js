import { UI } from './ui.js';
import { Parser } from './parser.js';
import { Interpreter } from './interpreter.js';

// Inicializar UI
document.addEventListener('DOMContentLoaded', () => {
    UI.init();

    // Evento de Compilación
    UI.els.compileBtn.addEventListener('click', () => {
        UI.clearMessages();
        UI.setStatus('Compilando...');

        const code = UI.getEditorCode();
        const parser = new Parser();

        try {
            // 1. Parsing
            const instructions = parser.parse(code);

            // 2. Ejecución
            // Le pasamos callbacks al intérprete para que se comunique con la UI
            const interpreter = new Interpreter(
                (msg) => UI.addMessage(msg, 'ok'),  // onLog
                (promptText) => prompt(promptText)  // onInput
            );

            interpreter.run(instructions);
            UI.setStatus('Ejecución Exitosa ✔');

        } catch (error) {
            console.error(error);
            UI.addMessage(error.message, 'error');
            UI.setStatus('Error ❌');
        }
    });
});