export class Memory {
    constructor() {
        this.vars = {}; 
    }

    declare(name, type) {
        if (this.vars[name]) throw new Error(`Variable '${name}' ya existe.`);
        let defaultVal = (type === 'SOUL' || type === 'SYMBOL') ? "" : 0;
        this.vars[name] = { type, value: defaultVal };
    }

    exists(name) { return !!this.vars[name]; }
    
    get(name) {
        if (!this.vars[name]) throw new Error(`Variable '${name}' no definida.`);
        return this.vars[name].value;
    }

    getType(name) {
        if (!this.vars[name]) throw new Error(`Variable '${name}' no definida.`);
        return this.vars[name].type;
    }

    set(name, val) {
        if (!this.vars[name]) throw new Error(`Variable '${name}' no definida.`);
        this.vars[name].value = val;
    }
}