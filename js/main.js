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
            // 1. Parsing (Ahora devuelve un objeto result)
            const result = parser.parse(code);

            // 2. VERIFICAR ERRORES DE SINTAXIS
            if (!result.success) {
                // Si hay errores, los mostramos todos y NO ejecutamos
                UI.setStatus('Falló Compilación ❌');
                result.errors.forEach(err => {
                    UI.addMessage(err, 'error'); // 'error' aplicará el color rojo
                });
                return; // Detenemos aquí
            }

            // 3. Ejecución (Solo si success es true)
            const interpreter = new Interpreter(
                (msg) => UI.addMessage(msg, 'ok'),
                (promptText) => prompt(promptText)
            );

            interpreter.run(result.instructions);
            UI.setStatus('Ejecución Exitosa ✔');

        } catch (error) {
            // Este catch atrapa errores de ejecución (Runtime), no de sintaxis
            console.error(error);
            UI.addMessage(`Error en ejecución: ${error.message}`, 'error');
            UI.setStatus('Error Runtime ❌');
        }
    });
});