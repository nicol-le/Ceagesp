window.appState = window.appState || {
    rawPrecos: [],
    rawClima: [],
    charts: {},
    currentGranularity: 'diario'
};

window.onload = async () => {
    document.getElementById('status-label').innerText = "CARREGANDO...";
    
    const produtos = await Api.fetchProdutos();
    const list = document.getElementById('listProd');
    produtos.forEach(p => {
        let o = document.createElement('option');
        o.value = p;
        list.appendChild(o);
    });

    document.getElementById('status-label').innerText = "SISTEMA ONLINE";
};

async function loadVariedades() {
    const prod = document.getElementById('prodInp').value;
    const variedades = await Api.fetchVariedades(prod);
    const list = document.getElementById('listVar');
    list.innerHTML = "";
    
    variedades.forEach(v => {
        let o = document.createElement('option');
        o.value = v;
        list.appendChild(o);
    });
}

function changeGranularity(g, btn) {
    appState.currentGranularity = g;
    document.querySelectorAll('#timeControls button').forEach(b => b.classList.remove('active-time'));
    btn.classList.add('active-time');

    if (appState.rawPrecos.length > 0) {
        renderDashboard();
    }
}

async function processar() {
    const prod = document.getElementById('prodInp').value;
    const varInp = document.getElementById('varInp').value;

    if (!prod) return alert("Por favor, selecione um produto.");

    document.getElementById('status-label').innerText = "BUSCANDO DADOS...";

    const [precos, clima] = await Promise.all([
        Api.fetchPrecos(prod, varInp),
        Api.fetchClima()
    ]);

    appState.rawPrecos = precos;
    appState.rawClima = clima;

    // ===== DEBUG =====
    console.group(" DEBUG processar()");
    console.log("Total de registros retornados:", precos.length);
    if (precos.length > 0) {
        const primeiro = precos[0];
        console.log("Primeiro registro completo:", primeiro);
        console.log("Campos disponíveis:", Object.keys(primeiro));
        console.log("Campo 'data':", primeiro.data, "→ toYMD:", Utils.toYMD(primeiro.data));
        console.log("Campo 'comum':", primeiro.comum, "→ parseFloat:", parseFloat(primeiro.comum));
        
        const ini = document.getElementById('dateIni').value;
        const fim = document.getElementById('dateFim').value;
        console.log("Filtro de data — ini:", ini, "fim:", fim);

        const testeFiltro = precos.map(p => ({
            date: Utils.toYMD(p.data),
            val: parseFloat(p.comum)
        })).filter(p => p.date && (!ini || p.date >= ini) && (!fim || p.date <= fim));
        
        console.log("Registros após filtro de data:", testeFiltro.length);
        if (testeFiltro.length === 0 && precos.length > 0) {
            console.warn(" Filtro de data está eliminando tudo!");
            console.log("Exemplo de data no banco (toYMD):", Utils.toYMD(precos[0].data));
            console.log("Intervalo esperado:", ini, "até", fim);
        }
        const semVal = precos.filter(p => isNaN(parseFloat(p.comum)) || p.comum === null);
        console.log("Registros com 'comum' inválido (NaN/null):", semVal.length);
    } else {
        console.warn(" fetchPrecos retornou 0 registros. Verifique o nome do produto e variedade.");
    }
    console.groupEnd();
    // ===== FIM DO DEBUG =====

    renderDashboard();
    document.getElementById('status-label').innerText = "SISTEMA ONLINE";
}

function renderDashboard() {
    const ini = document.getElementById('dateIni').value;
    const fim = document.getElementById('dateFim').value;

    let filtrados = appState.rawPrecos.map(p => ({ 
        date: Utils.toYMD(p.data), 
        val: parseFloat(p.comum) 
    }))
    .filter(p => p.date && !isNaN(p.val) && (!ini || p.date >= ini) && (!fim || p.date <= fim))
    .sort((a, b) => a.date.localeCompare(b.date));

    if (!filtrados.length) return alert("Nenhum dado encontrado para este período.");

    const vals = filtrados.map(f => f.val);
    document.getElementById('st-media').innerText = Utils.formatCurrency(Utils.average(vals));
    document.getElementById('st-min').innerText = Utils.formatCurrency(Math.min(...vals));
    document.getElementById('st-max').innerText = Utils.formatCurrency(Math.max(...vals));

    let dadosEvolucao = [...filtrados];
    if (appState.currentGranularity !== 'diario') {
        let grupos = {};
        filtrados.forEach(f => {
            let chave = (appState.currentGranularity === 'mensal') 
                ? f.date.substring(0, 7) 
                : `${new Date(f.date).getFullYear()}-W${Math.ceil(new Date(f.date).getDate()/7)}`;
            
            if (!grupos[chave]) grupos[chave] = [];
            grupos[chave].push(f.val);
        });
        dadosEvolucao = Object.keys(grupos).map(k => ({ date: k, val: Utils.average(grupos[k]) }));
    }

    Charts.updateLineChart('chEvolucao', dadosEvolucao.map(d => d.date), dadosEvolucao.map(d => d.val), 'Preço R$');

    const mesesLabels = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    const sazonalData = mesesLabels.map((_, i) => {
        let m = appState.rawPrecos.filter(p => new Date(p.data).getUTCMonth() === i);
        return m.length ? Utils.average(m.map(p => parseFloat(p.comum))) : 0;
    });
    Charts.updateBarChart('chSazonal', mesesLabels, sazonalData);

    const mapaClima = {};
    appState.rawClima.forEach(c => {
        let d = Utils.toYMD(c.data);
        if (d) mapaClima[d] = { t: parseFloat(c.temperatura_media || 0), c: parseFloat(c.chuva_mm || 0) };
    });

    let ptsTemp = [], ptsChuva = [];
    filtrados.forEach(p => {
        if (mapaClima[p.date]) {
            if (mapaClima[p.date].t !== 0) ptsTemp.push({ x: mapaClima[p.date].t, y: p.val });
            if (mapaClima[p.date].c !== 0) ptsChuva.push({ x: mapaClima[p.date].c, y: p.val });
        }
    });

    const pearsonVal = Utils.getPearson(ptsTemp);
    document.getElementById('st-pearson').innerText = pearsonVal.toFixed(2);
    Charts.updateScatter('chTemp', ptsTemp, 'Temp ºC');
    Charts.updateScatter('chChuva', ptsChuva, 'Chuva mm');

    Components.atualizarSemaforo(filtrados);
    if(document.getElementById('ia-insight')) {
        Components.gerarInsightIA(filtrados, pearsonVal);
    }

    populateHistoryTable();
}

function populateHistoryTable() {
    const tbody = document.getElementById('historyTableBody');
    tbody.innerHTML = "";
    let anos = {};

    appState.rawPrecos.forEach(p => {
        let a = new Date(p.data).getFullYear();
        if (!anos[a]) anos[a] = Array(12).fill(0).map(() => []);
        anos[a][new Date(p.data).getUTCMonth()].push(parseFloat(p.comum));
    });

    Object.keys(anos).sort().reverse().forEach(ano => {
        let tr = document.createElement('tr');
        tr.className = "hover:bg-slate-50 transition-colors";
        let html = `<td class="p-4 font-bold text-primary">${ano}</td>`;
        anos[ano].forEach(mesArray => {
            let media = mesArray.length ? Utils.formatCurrency(Utils.average(mesArray)) : "-";
            html += `<td class="py-4 text-slate-600">${media}</td>`;
        });
        tr.innerHTML = html;
        tbody.appendChild(tr);
    });
}