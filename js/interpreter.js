import { Memory } from './memory.js';
import { OPS } from './constants.js';

export class Interpreter {
    constructor(onLog, onInput) {
        this.mem = new Memory();
        this.onLog = onLog;   // Función para mostrar mensajes
        this.onInput = onInput; // Función para pedir datos (prompt)
    }

    evalExpr(exprStr) {
        let safeExpr = exprStr;
        Object.keys(OPS).forEach(op => {
            let re = new RegExp(`\\b${op}\\b`, 'g'); 
            safeExpr = safeExpr.replace(re, OPS[op]);
        });
        Object.keys(this.mem.vars).sort((a,b) => b.length - a.length).forEach(varName => {
             let val = this.mem.get(varName);
             if (typeof val === 'string') val = `"${val}"`;
             let reVar = new RegExp(`\\b${varName}\\b`, 'g');
             safeExpr = safeExpr.replace(reVar, val);
        });
        try { return eval(safeExpr); } catch (err) { throw new Error(`Error evaluando: ${exprStr}`); }
    }

    executeActionInline(actionString) {
        let action = actionString.trim().replace(/;$/, '');
        if (action.startsWith('SHOW')) {
            let content = action.replace(/^SHOW\s+/, '');
            let parts = content.split(',').map(s => {
                s = s.trim();
                if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) return s.slice(1, -1);
                if (this.mem.exists(s)) return this.mem.get(s);
                return this.evalExpr(s);
            });
            this.onLog(parts.join(" "));
        } else if (action.startsWith('GIVE')) {
             let mGive = action.match(/^GIVE\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/);
             if (mGive) {
                 this.mem.set(mGive[1], this.evalExpr(mGive[2]));
             }
        }
    }

    run(instructions) {
        let ip = 0;
        let cycles = 0;
        const execLimit = 50000;

        while (ip < instructions.length) {
            cycles++;
            if (cycles > execLimit) throw new Error("Stack Overflow: Bucle infinito.");
            
            const inst = instructions[ip];

            switch (inst.type) {
                case 'NOOP': case 'BLOCK_START': ip++; break;
                
                case 'BLOCK_END':
                    let depth = 1;
                    let backScanner = ip - 1; 
                    let loopFoundIndex = -1;
                    while (backScanner >= 0) {
                        if (instructions[backScanner].type === 'BLOCK_END') depth++;
                        if (instructions[backScanner].type === 'BLOCK_START') depth--;
                        if (depth === 0) {
                             let headerIndex = backScanner - 1;
                             if (headerIndex >= 0) {
                                 let headerInst = instructions[headerIndex];
                                 if (headerInst.type === 'DURING') {
                                    loopFoundIndex = headerIndex; 
                                 } else if (headerInst.type === 'TOSERVE') {
                                    let currentVal = this.mem.get(headerInst.iteratorVar);
                                    if (headerInst.iteratorMode === 'GROWS') this.mem.set(headerInst.iteratorVar, currentVal + 1);
                                    if (headerInst.iteratorMode === 'SHRINKS') this.mem.set(headerInst.iteratorVar, currentVal - 1);
                                    loopFoundIndex = headerIndex;
                                 }
                             }
                             break;
                        }
                        backScanner--;
                    }
                    ip = (loopFoundIndex !== -1) ? loopFoundIndex : ip + 1;
                    break;

                case 'SUMMON': this.mem.declare(inst.name, inst.varType); ip++; break;

                case 'GIVE': this.mem.set(inst.target, this.evalExpr(inst.expression)); ip++; break;

                case 'SHOW':
                    let rawParts = inst.contentRaw.split(','); 
                    let msg = rawParts.map(p => {
                        p = p.trim();
                        if ((p.startsWith('"') && p.endsWith('"')) || (p.startsWith("'") && p.endsWith("'"))) return p.slice(1, -1);
                        if (this.mem.exists(p)) return this.mem.get(p);
                        return this.evalExpr(p);
                    }).join(" ");
                    this.onLog(msg);
                    ip++;
                    break;
                
                case 'READ':
                    let inputVal = this.onInput(inst.prompt.replace(/"/g, ''));
                    let targetType = this.mem.getType(inst.target);
                    if (targetType === 'POWER' || targetType === 'MANA') {
                        let num = Number(inputVal);
                        if (isNaN(num)) num = 0;
                        inputVal = num;
                    }
                    this.mem.set(inst.target, inputVal);
                    ip++;
                    break;

                case 'BIND':
                    let conditionMet = false;
                    try { conditionMet = this.evalExpr(inst.condition); } catch (e) { conditionMet = false; }
                    if (conditionMet) {
                        this.executeActionInline(inst.actionTrue);
                    } else if (inst.actionFalse) {
                        this.executeActionInline(inst.actionFalse);
                    }
                    ip++;
                    break;

                case 'DURING': 
                case 'TOSERVE':
                    if (this.evalExpr(inst.condition)) {
                        ip++;
                    } else {
                        let d = 0;
                        let scanner = ip + 1;
                        while(scanner < instructions.length) {
                             if (instructions[scanner].type === 'BLOCK_START') d++;
                             if (instructions[scanner].type === 'BLOCK_END') d--;
                             if (d === 0 && instructions[scanner].type === 'BLOCK_END') {
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
        }
    }
}