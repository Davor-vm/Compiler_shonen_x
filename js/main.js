import { UI } from './ui.js';
import { Parser } from './parser.js';
import { Interpreter } from './interpreter.js';

document.addEventListener('DOMContentLoaded', () => {
    UI.init();

    UI.els.compileBtn.addEventListener('click', () => {
        UI.clearMessages();
        UI.setStatus('Compilando...');

        const code = UI.getEditorCode();
        const parser = new Parser();

        try {
            const instructions = parser.parse(code);

            const interpreter = new Interpreter(
                (msg) => UI.addMessage(msg, 'ok'),
                (promptText) => prompt(promptText),
                (err) => UI.addMessage(err, 'error') 
            );

            interpreter.run(instructions);

            if (interpreter.errors.length > 0) {
                UI.setStatus(`Errores encontrados: ${interpreter.errors.length} ❌`);
            } else {
                UI.setStatus('Ejecución Exitosa ✔');
            }

        } catch (error) {
            UI.addMessage(error.message, 'error');
            UI.setStatus('Error ❌');
        }
    });
});