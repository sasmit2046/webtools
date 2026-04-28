/* ============================================================
   PMS Module: calculator.js
   Floating Calculator Widget
   ============================================================ */

/* ===== 2. FLOATING CALCULATOR ===== */
(function initCalculator() {
    const calcHTML = `
    <div id="floating-calc" style="position:fixed;bottom:20px;right:20px;z-index:9000;display:none">
        <div style="background:var(--sidebar);border-radius:14px;box-shadow:0 10px 40px rgba(0,0,0,.3);width:280px;overflow:hidden">
            <div style="padding:10px 16px;display:flex;align-items:center;justify-content:space-between;background:rgba(201,162,39,.15)">
                <span style="font-weight:700;font-size:.85rem;color:#fff"><i class="fas fa-calculator me-2"></i>Calculator</span>
                <div style="display:flex;gap:4px">
                    <button onclick="Calc.minimize()" style="background:none;border:none;color:rgba(255,255,255,.6);cursor:pointer;font-size:.85rem;padding:2px 6px"><i class="fas fa-minus"></i></button>
                    <button onclick="Calc.close()" style="background:none;border:none;color:rgba(255,255,255,.6);cursor:pointer;font-size:.85rem;padding:2px 6px"><i class="fas fa-times"></i></button>
                </div>
            </div>
            <div id="calc-body">
                <div style="padding:12px 16px;background:rgba(0,0,0,.15)">
                    <div id="calc-expr" style="font-size:.72rem;color:rgba(255,255,255,.4);min-height:16px;text-align:right;word-break:break-all"></div>
                    <input type="text" id="calc-display" value="0" readonly style="width:100%;background:transparent;border:none;color:#fff;font-size:1.6rem;font-weight:800;text-align:right;font-family:'Outfit',monospace;outline:none">
                </div>
                <div style="padding:8px;display:grid;grid-template-columns:repeat(4,1fr);gap:4px" id="calc-buttons"></div>
            </div>
        </div>
    </div>
    <button id="calc-toggle" onclick="Calc.toggle()" style="position:fixed;bottom:20px;right:20px;z-index:8999;width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#c9a227,#a88520);color:#fff;border:none;font-size:1.1rem;cursor:pointer;box-shadow:0 4px 15px rgba(201,162,39,.4);transition:all .25s;display:none" title="Calculator">
        <i class="fas fa-calculator"></i>
    </button>`;
    document.body.insertAdjacentHTML('beforeend', calcHTML);

    const btns = [
        ['C', 'ce', '⌫', 'bs', '%', 'op', '÷', 'op'],
        ['7', 'n', '8', 'n', '9', 'n', '×', 'op'],
        ['4', 'n', '5', 'n', '6', 'n', '−', 'op'],
        ['1', 'n', '2', 'n', '3', 'n', '+', 'op'],
        ['±', 'fn', '0', 'n', '.', 'n', '=', 'eq']
    ];
    const grid = document.getElementById('calc-buttons');
    btns.forEach(row => {
        for (let i = 0; i < row.length; i += 2) {
            const label = row[i], type = row[i + 1];
            const bg = type === 'eq' ? 'linear-gradient(135deg,#c9a227,#a88520)' : type === 'op' ? 'rgba(201,162,39,.2)' : type === 'ce' || type === 'bs' ? 'rgba(192,57,43,.15)' : 'rgba(255,255,255,.08)';
            const color = type === 'eq' ? '#fff' : type === 'op' ? '#c9a227' : type === 'ce' || type === 'bs' ? '#c0392b' : 'rgba(255,255,255,.85)';
            const btn = document.createElement('button');
            btn.textContent = label;
            btn.style.cssText = `background:${bg};color:${color};border:none;border-radius:8px;padding:12px 0;font-size:.95rem;font-weight:700;cursor:pointer;transition:all .15s;font-family:'Outfit',sans-serif`;
            btn.onmouseenter = () => btn.style.opacity = '.8';
            btn.onmouseleave = () => btn.style.opacity = '1';
            btn.onclick = () => Calc.press(label, type);
            grid.appendChild(btn);
        }
    });
})();

const Calc = {
    expr: '', current: '0', op: null, prev: null, newNum: true,
    toggle() {
        const el = document.getElementById('floating-calc');
        const btn = document.getElementById('calc-toggle');
        if (el.style.display === 'none') { el.style.display = 'block'; btn.style.display = 'none'; }
        else this.close();
    },
    close() { document.getElementById('floating-calc').style.display = 'none'; document.getElementById('calc-toggle').style.display = 'block'; },
    minimize() {
        const body = document.getElementById('calc-body');
        body.style.display = body.style.display === 'none' ? 'block' : 'none';
    },
    press(label, type) {
        const disp = document.getElementById('calc-display'), expr = document.getElementById('calc-expr');
        if (type === 'n') {
            if (label === '.' && this.current.includes('.')) return;
            if (this.newNum) { this.current = label === '.' ? '0.' : label; this.newNum = false; }
            else this.current += label;
        } else if (type === 'op') {
            this.calc();
            this.op = label; this.prev = parseFloat(this.current); this.newNum = true;
            this.expr = this.current + ' ' + label;
        } else if (type === 'eq') {
            this.calc(); this.op = null; this.newNum = true;
            this.expr = '';
        } else if (type === 'ce') {
            this.current = '0'; this.op = null; this.prev = null; this.expr = ''; this.newNum = true;
        } else if (type === 'bs') {
            this.current = this.current.length > 1 ? this.current.slice(0, -1) : '0';
        } else if (type === 'fn' && label === '±') {
            this.current = String(-parseFloat(this.current));
        }
        disp.value = this.current;
        expr.textContent = this.expr;
    },
    calc() {
        if (this.op === null || this.prev === null) return;
        const a = this.prev, b = parseFloat(this.current);
        let r = 0;
        switch (this.op) {
            case '+': r = a + b; break;
            case '−': r = a - b; break;
            case '×': r = a * b; break;
            case '÷': r = b !== 0 ? a / b : 0; break;
            case '%': r = a * (b / 100); break;
        }
        this.current = String(Math.round(r * 1e10) / 1e10);
        this.prev = null;
    }
};

// Show calc button when app is visible
const _origShowApp = App.showApp;
App.showApp = function() {
    _origShowApp.call(this);
    document.getElementById('calc-toggle').style.display = 'block';
};

