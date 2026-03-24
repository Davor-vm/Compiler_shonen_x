import { Memory } from './memory.js';
import { OPS } from './constants.js';

export class Interpreter {
    constructor(onLog, onInput, onError) {
        this.mem = new Memory();
        this.onLog = onLog;
        this.onInput = onInput;
        this.onError = onError;
        this.errors = [];
    }

    addError(msg) {
        this.errors.push(msg);
        if (this.onError) this.onError(msg);
    }

    inferType(expr) {
        expr = expr.trim();

        if (
            (expr.startsWith('"') && expr.endsWith('"')) ||
            (expr.startsWith("'") && expr.endsWith("'"))
        ) return 'SOUL';

        if (expr === 'true' || expr === 'false') return 'SPIRIT';

        if (!isNaN(Number(expr))) return 'POWER';

        if (this.mem.exists(expr)) return this.mem.getType(expr);

        return 'UNKNOWN';
    }

    validateExpression(expr, line) {
        let tokens = expr.split(/\s+/);
        let lastType = null;

        for (let token of tokens) {
            if (OPS[token]) continue;

            let currentType = this.inferType(token);

            if (currentType === 'UNKNOWN') continue;

            if (lastType && currentType !== lastType) {
                this.addError(`Línea ${line}: Operación inválida entre ${lastType} y ${currentType}`);
                return false;
            }

            lastType = currentType;
        }
        return true;
    }

    evalExpr(exprStr, line) {
        if (!this.validateExpression(exprStr, line)) return null;

        let safeExpr = exprStr;

        Object.keys(OPS).forEach(op => {
            let re = new RegExp(`\\b${op}\\b`, 'g');
            safeExpr = safeExpr.replace(re, OPS[op]);
        });

        Object.keys(this.mem.vars)
            .sort((a, b) => b.length - a.length)
            .forEach(varName => {
                let val = this.mem.get(varName);
                if (typeof val === 'string') val = `"${val}"`;

                let reVar = new RegExp(`\\b${varName}\\b`, 'g');
                safeExpr = safeExpr.replace(reVar, val);
            });

        try {
            return eval(safeExpr);
        } catch {
            this.addError(`Línea ${line}: Error evaluando expresión`);
            return null;
        }
    }

    run(instructions) {
        let ip = 0;

        while (ip < instructions.length) {
            const inst = instructions[ip];

            switch (inst.type) {

                case 'SUMMON':
                    try {
                        this.mem.declare(inst.name, inst.varType);
                    } catch (e) {
                        this.addError(`Línea ${inst.line}: ${e.message}`);
                    }
                    ip++;
                    break;

                case 'GIVE': {
                    let value = this.evalExpr(inst.expression, inst.line);
                    if (value === null) { ip++; break; }

                    let varType;
                    try {
                        varType = this.mem.getType(inst.target);
                    } catch (e) {
                        this.addError(`Línea ${inst.line}: ${e.message}`);
                        ip++;
                        break;
                    }

                    let valueType =
                        typeof value === 'number' ? 'POWER' :
                        typeof value === 'string' ? 'SOUL' :
                        typeof value === 'boolean' ? 'SPIRIT' :
                        'UNKNOWN';

                    if (varType !== valueType) {
                        this.addError(`Línea ${inst.line}: Tipo incompatible (${valueType} → ${varType})`);
                        ip++;
                        break;
                    }

                    this.mem.set(inst.target, value);
                    ip++;
                    break;
                }

                case 'SHOW':
                    try {
                        let parts = inst.contentRaw.split(',').map(p => {
                            p = p.trim();

                            if (
                                (p.startsWith('"') && p.endsWith('"')) ||
                                (p.startsWith("'") && p.endsWith("'"))
                            ) return p.slice(1, -1);

                            if (this.mem.exists(p)) return this.mem.get(p);

                            return this.evalExpr(p, inst.line);
                        });

                        this.onLog(parts.join(" "));
                    } catch (e) {
                        this.addError(`Línea ${inst.line}: Error en SHOW`);
                    }
                    ip++;
                    break;

                case 'READ': {
                    let inputVal = this.onInput(inst.prompt.replace(/"/g, ''));
                    let targetType;

                    try {
                        targetType = this.mem.getType(inst.target);
                    } catch (e) {
                        this.addError(`Línea ${inst.line}: ${e.message}`);
                        ip++;
                        break;
                    }

                    if (targetType === 'POWER' || targetType === 'MANA') {
                        let num = Number(inputVal);
                        if (isNaN(num)) {
                            this.addError(`Línea ${inst.line}: Se esperaba número`);
                            ip++;
                            break;
                        }
                        inputVal = num;
                    } 
                    else if (targetType === 'SPIRIT') {
                        if (inputVal !== 'true' && inputVal !== 'false') {
                            this.addError(`Línea ${inst.line}: Se esperaba true/false`);
                            ip++;
                            break;
                        }
                        inputVal = (inputVal === 'true');
                    }

                    this.mem.set(inst.target, inputVal);
                    ip++;
                    break;
                }

                case 'BIND': {
                    let match = inst.condition.match(/^(.+?)\s+(STRONGER|WEAKER|EQUALS|APART|ABS|ABW)\s+(.+)$/);

                    if (match) {
                        let leftType = this.inferType(match[1]);
                        let rightType = this.inferType(match[3]);

                        if (leftType !== rightType) {
                            this.addError(`Línea ${inst.line}: Comparación inválida (${leftType} vs ${rightType})`);
                            ip++;
                            break;
                        }
                    }

                    let result = this.evalExpr(inst.condition, inst.line);

                    if (result) {
                        this.onLog("✔ Condición verdadera");
                    } else {
                        this.onLog("✖ Condición falsa");
                    }

                    ip++;
                    break;
                }

                case 'END_PROGRAM':
                    return;

                default:
                    ip++;
            }
        }
    }
}