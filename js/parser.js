export class Parser {
    parse(rawCode) {
        const lines = rawCode.split(/\r?\n/);
        let instructions = [];
        let insideOpening = false;

        for (let i = 0; i < lines.length; i++) {
            const lineNum = i + 1;
            let line = lines[i].trim();
            
            if (!line || line.startsWith('//')) continue; 

            // Estructura OPENING / ENDING
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

            // Bloques
            if (line === '{') { instructions.push({ type: 'BLOCK_START', line: lineNum }); continue; }
            if (line === '}') { instructions.push({ type: 'BLOCK_END', line: lineNum }); continue; }

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

            // BIND (IF / ELSE) - Optimizado para línea única
            let mBindVile = line.match(/^BIND\s+(.+?)\s+WORTHY\s+(.+?)\s+VILE\s+(.+);?$/);
            let mBindSimple = line.match(/^BIND\s+(.+?)\s+WORTHY\s+(.+);?$/);

            if (mBindVile) {
                instructions.push({ 
                    type: 'BIND', condition: mBindVile[1], actionTrue: mBindVile[2], actionFalse: mBindVile[3], line: lineNum 
                });
                continue;
            } else if (mBindSimple) {
                instructions.push({ 
                    type: 'BIND', condition: mBindSimple[1], actionTrue: mBindSimple[2], actionFalse: null, line: lineNum 
                });
                continue;
            }

            // DURING (WHILE)
            let mDuring = line.match(/^DURING\s+(.+)$/);
            if (mDuring) {
                instructions.push({ type: 'DURING', condition: mDuring[1], line: lineNum });
                continue;
            }

            // TOSERVE (FOR)
            let mToserve = line.match(/^TOSERVE\s+(.+)\s+UNTIL\s+(.+)\s+([A-Za-z_]\w*)\s+(GROWS|SHRINKS)$/);
            if (mToserve) {
                let initRaw = mToserve[1];
                if (initRaw.includes('=')) {
                    let parts = initRaw.split('=');
                    instructions.push({ type: 'GIVE', target: parts[0].trim(), expression: parts[1].trim(), line: lineNum });
                }
                instructions.push({ 
                    type: 'TOSERVE', condition: mToserve[2], iteratorVar: mToserve[3], iteratorMode: mToserve[4], line: lineNum 
                });
                continue;
            }

            throw new Error(`Línea ${lineNum}: Sintaxis no reconocida: "${line}"`);
        }
        return instructions;
    }
}