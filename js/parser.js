export class Parser {
    parse(rawCode) {
        const lines = rawCode.split(/\r?\n/);
        let instructions = [];
        let errors = []; // <-- AQUÍ guardaremos todos los errores
        let insideOpening = false;
        let hasEnding = false;
        let openBlocks = 0; // Para contar llaves { }

        for (let i = 0; i < lines.length; i++) {
            const lineNum = i + 1;
            let line = lines[i].trim();
            
            // 1. Ignorar líneas vacías o comentarios
            if (!line || line.startsWith('//')) continue; 

            // 2. Control de OPENING
            if (/^OPENING(\s*{)?$/.test(line)) {
                if (insideOpening) {
                    errors.push(`Línea ${lineNum}: Error - 'OPENING' duplicado.`);
                }
                insideOpening = true;
                if (line.includes('{')) openBlocks++; // Si el opening tiene llave, la contamos
                instructions.push({ type: 'NOOP', line: lineNum }); 
                continue;
            }

            // 3. Control de ENDING
            if (/^(}\s*)?ENDING$/.test(line)) {
                if (!insideOpening) {
                    errors.push(`Línea ${lineNum}: Error - 'ENDING' encontrado sin un 'OPENING' previo.`);
                }
                hasEnding = true;
                if (line.startsWith('}')) openBlocks--;
                instructions.push({ type: 'END_PROGRAM', line: lineNum });
                continue;
            }

            // Si hay código antes del OPENING
            if (!insideOpening) {
                errors.push(`Línea ${lineNum}: Error - Código fuera del bloque OPENING.`);
                continue; // Saltamos al siguiente renglón
            }

            // 4. Detección de Bloques { }
            if (line === '{') { 
                instructions.push({ type: 'BLOCK_START', line: lineNum }); 
                openBlocks++; 
                continue; 
            }
            if (line === '}') { 
                instructions.push({ type: 'BLOCK_END', line: lineNum }); 
                openBlocks--; 
                continue; 
            }

            // --- INSTRUCCIONES (Si falla el regex, agregamos error y seguimos) ---

            // SUMMON
            let mSummon = line.match(/^SUMMON\s+(POWER|MANA|SYMBOL|SOUL|SPIRIT)\s+([A-Za-z_][A-Za-z0-9_]*)\s*;$/);
            if (mSummon) {
                instructions.push({ type: 'SUMMON', varType: mSummon[1], name: mSummon[2], line: lineNum });
                continue;
            }

            // GIVE
            let mGive = line.match(/^GIVE\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)\s*;$/);
            if (mGive) {
                instructions.push({ type: 'GIVE', target: mGive[1], expression: mGive[2], line: lineNum });
                continue;
            }
            
            // SHOW
            let mShow = line.match(/^SHOW\s+(.+)\s*;$/);
            if (mShow) {
                instructions.push({ type: 'SHOW', contentRaw: mShow[1], line: lineNum });
                continue;
            }

            // READ
            let mRead = line.match(/^READ\s+"([^"]*)"\s*,\s*([A-Za-z_][A-Za-z0-9_]*)\s*;$/);
            if (mRead) {
                instructions.push({ type: 'READ', prompt: mRead[1], target: mRead[2], line: lineNum });
                continue;
            }

            // BIND (If/Else)
            let mBindVile = line.match(/^BIND\s+(.+?)\s+WORTHY\s+(.+?)\s+VILE\s+(.+);?$/);
            let mBindSimple = line.match(/^BIND\s+(.+?)\s+WORTHY\s+(.+);?$/);

            if (mBindVile) {
                instructions.push({ type: 'BIND', condition: mBindVile[1], actionTrue: mBindVile[2], actionFalse: mBindVile[3], line: lineNum });
                continue;
            } else if (mBindSimple) {
                instructions.push({ type: 'BIND', condition: mBindSimple[1], actionTrue: mBindSimple[2], actionFalse: null, line: lineNum });
                continue;
            }

            // DURING
            let mDuring = line.match(/^DURING\s+(.+)$/);
            if (mDuring) {
                instructions.push({ type: 'DURING', condition: mDuring[1], line: lineNum });
                continue;
            }

            // TOSERVE
            let mToserve = line.match(/^TOSERVE\s+(.+)\s+UNTIL\s+(.+)\s+([A-Za-z_]\w*)\s+(GROWS|SHRINKS)$/);
            if (mToserve) {
                let initRaw = mToserve[1];
                if (initRaw.includes('=')) {
                    let parts = initRaw.split('=');
                    instructions.push({ type: 'GIVE', target: parts[0].trim(), expression: parts[1].trim(), line: lineNum });
                }
                instructions.push({ type: 'TOSERVE', condition: mToserve[2], iteratorVar: mToserve[3], iteratorMode: mToserve[4], line: lineNum });
                continue;
            }

            // SI LLEGAMOS AQUÍ, LA LÍNEA NO SE RECONOCIÓ
            errors.push(`Línea ${lineNum}: Error de Sintaxis - No entiendo: "${line}"`);
        }

        // Validaciones Finales Globales
        if (!hasEnding) errors.push("Error Fatal: Falta la instrucción 'ENDING' al final.");
        if (openBlocks !== 0) errors.push(`Error de Estructura: Tienes ${Math.abs(openBlocks)} llave(s) { } sin cerrar/abrir correctamente.`);

        // RETORNAMOS TODO (Instrucciones Y Errores)
        return { 
            instructions, 
            errors,
            success: errors.length === 0 
        };
    }
}