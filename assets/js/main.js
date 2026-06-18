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
    const varInp = document.getElementById('varInp');
    
    list.innerHTML = "";
    varInp.value = "";
    
    if (variedades.length === 0) {
        varInp.disabled = true;
        varInp.placeholder = "Sem variedades disponíveis";
    } else {
        varInp.disabled = false;
        varInp.placeholder = "Todas as variedades";
        variedades.forEach(v => {
            let o = document.createElement('option');
            o.value = v;
            list.appendChild(o);
        });
    }
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

    // ===== DEBUG COMPLETO =====
    console.group("📊 DEBUG: Análise Completa de Dados");
    console.log("✅ Total de registros de preços:", precos.length);
    console.log("✅ Total de registros de clima:", clima.length);
    
    if (precos.length > 0) {
        const primeiro = precos[0];
        console.log("🔍 Primeiro registro de preço:", {
            data: primeiro.data,
            toYMD: Utils.toYMD(primeiro.data),
            comum: primeiro.comum,
            parseFloat: parseFloat(primeiro.comum)
        });
    }

    if (clima.length > 0) {
        const primeira = clima[0];
        console.log("🔍 Primeiro registro de clima:", {
            data: primeira.data,
            toYMD: Utils.toYMD(primeira.data),
            campos: Object.keys(primeira)
        });
    }

    const ini = document.getElementById('dateIni').value;
    console.log("📅 Filtro de data — ini:", ini);
    console.groupEnd();
    // ===== FIM DO DEBUG =====

    renderDashboard();
    document.getElementById('status-label').innerText = "SISTEMA ONLINE";
}

function renderDashboard() {
    const ini = document.getElementById('dateIni').value;
    // Data Realista de Análise: 05 de Abril de 2026
    const dataReferencia = "2026-04-05";

    let filtrados = appState.rawPrecos.map(p => ({ 
        date: Utils.toYMD(p.data), 
        val: parseFloat(p.comum),
        unidade: p.unidade || 'KG'
    }))
    .filter(p => p.date && !isNaN(p.val) && (!ini || p.date >= ini) && p.date <= dataReferencia)
    .sort((a, b) => a.date.localeCompare(b.date));

    if (!filtrados.length) return alert("Nenhum dado encontrado para este período.");

    const vals = filtrados.map(f => f.val);
    const minData = Utils.findMin(filtrados);
    const maxData = Utils.findMax(filtrados);
    const stdDev = Utils.stdDev(vals);
    const cv = Utils.coefficientOfVariation(vals);
    
    // Capturar unidade do primeiro registro
    const unidade = filtrados.length > 0 ? filtrados[0].unidade : 'KG';

    document.getElementById('st-media').innerText = Utils.formatCurrency(Utils.average(vals));
    document.getElementById('st-media-date').innerText = `${filtrados.length} dias`;
    document.getElementById('st-unidade').innerText = `por ${unidade}`;
    
    document.getElementById('st-min').innerText = Utils.formatCurrency(minData.val);
    document.getElementById('st-min-date').innerText = Utils.formatDate(minData.date);
    
    document.getElementById('st-max').innerText = Utils.formatCurrency(maxData.val);
    document.getElementById('st-max-date').innerText = Utils.formatDate(maxData.date);
    
    document.getElementById('st-stddev').innerText = Utils.formatCurrency(stdDev);
    document.getElementById('st-cv').innerText = `CV: ${cv.toFixed(1)}%`;

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

    // ===== MAPEAMENTO CLIMÁTICO MELHORADO =====
    console.group("🌦️ MAPEAMENTO CLIMÁTICO MULTIVARIADO");
    
    // Criar mapa de clima com todas as variáveis
    const mapaClima = {};
    let climaValido = 0;
    
    appState.rawClima.forEach(c => {
        try {
            let d = Utils.toYMD(c.data);
            if (!d) return;
            
            // Parse de todas as variáveis climáticas
            const temp = parseFloat(c.temperatura) || parseFloat(c.temperatura_media) || 0;
            const chuva = parseFloat(c.chuva) || parseFloat(c.chuva_mm) || 0;
            const umidade = parseFloat(c.humidade) || parseFloat(c.umidade) || 0;
            const evapotransp = parseFloat(c.evapotranspiracao) || 0;
            const vento = parseFloat(c.velocidadedevento) || 0;
            const tempSolo = parseFloat(c.temperaturasolo) || 0;
            
            if (!mapaClima[d]) {
                mapaClima[d] = { 
                    temp, chuva, umidade, evapotransp, vento, tempSolo
                };
                climaValido++;
            }
        } catch (e) {}
    });
    
    console.log(`Registros de clima mapeados: ${climaValido} de ${appState.rawClima.length}`);
    console.log(`Datas únicas no mapa: ${Object.keys(mapaClima).length}`);

    // Calcular correlações para cada variável climática
    let correlacoes = [];
    
    // Temperatura
    let ptsTemp = [];
    filtrados.forEach(p => {
        if (mapaClima[p.date] && mapaClima[p.date].temp !== 0) {
            ptsTemp.push({ x: mapaClima[p.date].temp, y: p.val });
        }
    });
    const pearsonTemp = Utils.getPearson(ptsTemp);
    if (ptsTemp.length > 1) {
        correlacoes.push({ nome: 'Temperatura', r: pearsonTemp, pontos: ptsTemp.length });
    }

    // Chuva
    let ptsChuva = [];
    filtrados.forEach(p => {
        if (mapaClima[p.date] && mapaClima[p.date].chuva !== 0) {
            ptsChuva.push({ x: mapaClima[p.date].chuva, y: p.val });
        }
    });
    const pearsonChuva = Utils.getPearson(ptsChuva);
    if (ptsChuva.length > 1) {
        correlacoes.push({ nome: 'Precipitação', r: pearsonChuva, pontos: ptsChuva.length });
    }

    // Umidade
    let ptsUmidade = [];
    filtrados.forEach(p => {
        if (mapaClima[p.date] && mapaClima[p.date].umidade !== 0) {
            ptsUmidade.push({ x: mapaClima[p.date].umidade, y: p.val });
        }
    });
    const pearsonUmidade = Utils.getPearson(ptsUmidade);
    if (ptsUmidade.length > 1) {
        correlacoes.push({ nome: 'Umidade', r: pearsonUmidade, pontos: ptsUmidade.length });
    }

    // Evapotranspiração
    let ptsEvapotransp = [];
    filtrados.forEach(p => {
        if (mapaClima[p.date] && mapaClima[p.date].evapotransp !== 0) {
            ptsEvapotransp.push({ x: mapaClima[p.date].evapotransp, y: p.val });
        }
    });
    const pearsonEvapotransp = Utils.getPearson(ptsEvapotransp);
    if (ptsEvapotransp.length > 1) {
        correlacoes.push({ nome: 'Evapotranspiração', r: pearsonEvapotransp, pontos: ptsEvapotransp.length });
    }

    // Velocidade do Vento
    let ptsVento = [];
    filtrados.forEach(p => {
        if (mapaClima[p.date] && mapaClima[p.date].vento !== 0) {
            ptsVento.push({ x: mapaClima[p.date].vento, y: p.val });
        }
    });
    const pearsonVento = Utils.getPearson(ptsVento);
    if (ptsVento.length > 1) {
        correlacoes.push({ nome: 'Velocidade do Vento', r: pearsonVento, pontos: ptsVento.length });
    }

    // Temperatura do Solo
    let ptsTempSolo = [];
    filtrados.forEach(p => {
        if (mapaClima[p.date] && mapaClima[p.date].tempSolo !== 0) {
            ptsTempSolo.push({ x: mapaClima[p.date].tempSolo, y: p.val });
        }
    });
    const pearsonTempSolo = Utils.getPearson(ptsTempSolo);
    if (ptsTempSolo.length > 1) {
        correlacoes.push({ nome: 'Temperatura do Solo', r: pearsonTempSolo, pontos: ptsTempSolo.length });
    }

    console.log("Correlações calculadas:", correlacoes);
    console.groupEnd();

    // Atualizar gráficos scatter principais
    Charts.updateScatter('chTemp', ptsTemp, 'Temp ºC');
    Charts.updateScatter('chChuva', ptsChuva, 'Chuva mm');

    // ===== EVOLUÇÃO CLIMÁTICA NO PERÍODO =====
    let dadosClimaEvolucao = filtrados.map(f => {
        const c = mapaClima[f.date] || { temp: 0, chuva: 0 };
        return {
            date: f.date,
            temp: c.temp,
            chuva: c.chuva
        };
    });

    if (appState.currentGranularity !== 'diario') {
        let gruposClima = {};
        dadosClimaEvolucao.forEach(d => {
            let chave = (appState.currentGranularity === 'mensal') 
                ? d.date.substring(0, 7) 
                : `${new Date(d.date).getFullYear()}-W${Math.ceil(new Date(d.date).getDate()/7)}`;
            
            if (!gruposClima[chave]) gruposClima[chave] = { temps: [], chuvas: [] };
            if (d.temp > 0) gruposClima[chave].temps.push(d.temp);
            gruposClima[chave].chuvas.push(d.chuva);
        });
        dadosClimaEvolucao = Object.keys(gruposClima).map(k => ({
            date: k,
            temp: gruposClima[k].temps.length ? Utils.average(gruposClima[k].temps) : 0,
            chuva: gruposClima[k].chuvas.reduce((sum, val) => sum + val, 0)
        }));
    }

    const labelsClima = dadosClimaEvolucao.map(d => d.date);
    const tempsClima = dadosClimaEvolucao.map(d => d.temp);
    const chuvasClima = dadosClimaEvolucao.map(d => d.chuva);

    Charts.updateLineChart('chClimaTemp', labelsClima, tempsClima, 'Temperatura (ºC)', '#f97316', 'rgba(249, 115, 22, 0.05)');
    Charts.updateBarChart('chClimaChuva', labelsClima, chuvasClima, '#3b82f6');
    
    // Atualizar labels
    document.getElementById('statTemp').innerText = `${ptsTemp.length} dias com dados • Correlação: ${pearsonTemp.toFixed(2)}`;
    document.getElementById('statChuva').innerText = `${ptsChuva.length} dias com dados • Correlação: ${pearsonChuva.toFixed(2)}`;

    // Renderizar tabela de correlações
    renderCorrelationTable(correlacoes);

    // Atualizar componentes
    updateExecutiveStats(filtrados);
    Components.renderOpportunityIndex(filtrados, sazonalData);
    Components.renderMarketingCalendar(sazonalData);
    Components.renderMarketForecast(filtrados);
    Components.renderMarketEvents();
    Components.atualizarSemaforo(filtrados);

    // Restaurando a Análise de Insights baseada em Correlações
    if(document.getElementById('ia-insight')) {
        Components.gerarInsightIA(filtrados, pearsonTemp, pearsonChuva, ptsTemp, ptsChuva, correlacoes);
    }

    // Detectar e mostrar eventos extremos
    renderExtremeEvents(filtrados, mapaClima);

    populateHistoryTable();
}

function updateExecutiveStats(filtrados) {
    if (!filtrados.length) return;
    
    const ultimoRegistro = filtrados[filtrados.length - 1];
    const precoAtual = ultimoRegistro.val;
    
    // Comparação com 7 dias atrás para tendência
    const precoAnterior = filtrados.length > 7 ? filtrados[filtrados.length - 8].val : precoAtual;
    const tendencia = Utils.percentualMudanca(precoAnterior, precoAtual);
    const unidade = ultimoRegistro.unidade;

    document.getElementById('ex-preco').innerText = Utils.formatCurrency(precoAtual);
    document.getElementById('ex-unidade').innerText = `Unidade: ${unidade}`;
    
    const trendEl = document.getElementById('ex-tendencia');
    trendEl.innerText = (tendencia >= 0 ? '↑ ' : '↓ ') + Math.abs(tendencia).toFixed(1) + '%';
    trendEl.className = `text-xl font-bold ${tendencia >= 0 ? 'text-emerald-600' : 'text-red-600'}`;

    // Variação mensal (últimos 30 dias dentro do filtro)
    const mesAnt = filtrados.length > 30 ? filtrados[filtrados.length - 31].val : filtrados[0].val;
    const varMensal = Utils.percentualMudanca(mesAnt, precoAtual);
    document.getElementById('ex-var-mensal').innerText = `Variação Mensal: ${varMensal.toFixed(1)}%`;
    
    document.getElementById('exec-price-card').classList.remove('animate-pulse');
}


function renderCorrelationTable(correlacoes) {
    const tbody = document.getElementById('climateCorrelationTable');
    tbody.innerHTML = "";

    if (!correlacoes.length) {
        tbody.innerHTML = '<tr class="hover:bg-slate-50"><td class="p-4 text-slate-500" colspan="5">Dados insuficientes para análise</td></tr>';
        return;
    }

    // Ordenar por valor absoluto de correlação (maior primeiro)
    correlacoes.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));

    correlacoes.forEach(corr => {
        const absR = Math.abs(corr.r);
        
        let força = 'Nenhuma';
        let corClass = 'text-slate-500';
        
        if (absR > 0.7) {
            força = 'Forte';
            corClass = corr.r > 0 ? 'text-green-600' : 'text-red-600';
        } else if (absR > 0.5) {
            força = 'Moderada';
            corClass = corr.r > 0 ? 'text-green-500' : 'text-red-500';
        } else if (absR > 0.3) {
            força = 'Fraca';
            corClass = corr.r > 0 ? 'text-blue-500' : 'text-orange-500';
        }

        const direcao = corr.r > 0 ? 'Positiva' : corr.r < 0 ? 'Negativa' : 'Neutra';

        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 transition-colors';
        tr.innerHTML = `
            <td class="p-4 font-bold text-slate-700">${corr.nome}</td>
            <td class="p-4 text-right ${corClass}"><strong>${corr.r.toFixed(3)}</strong></td>
            <td class="p-4 text-right">${força}</td>
            <td class="p-4 text-right text-slate-600">${direcao}</td>
            <td class="p-4 text-right text-slate-500">${corr.pontos}</td>
        `;
        tbody.appendChild(tr);
    });
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

function renderExtremeEvents(filtrados, mapaClima) {
    if (!filtrados.length) return;

    // Definir limites para detectar condições extremas (2 desvios padrão)
    const limites = {
        temperatura: { threshold: 2 },
        chuva: { threshold: 1.5 },
        umidade: { threshold: 1.5 },
        evapotransp: { threshold: 1.5 },
        vento: { threshold: 2 },
        tempSolo: { threshold: 2 }
    };

    // Calcular estatísticas para cada variável climática
    const stats = {};
    ['temperatura', 'chuva', 'umidade', 'evapotransp', 'vento', 'tempSolo'].forEach(var_clima => {
        const valores = filtrados
            .map(p => mapaClima[p.date]?.[var_clima === 'temperatura' ? 'temp' : 
                                          var_clima === 'chuva' ? 'chuva' :
                                          var_clima === 'umidade' ? 'umidade' :
                                          var_clima === 'evapotransp' ? 'evapotransp' :
                                          var_clima === 'vento' ? 'vento' : 'tempSolo'])
            .filter(v => v && v > 0);
        
        if (valores.length > 2) {
            const avg = Utils.average(valores);
            const std = Utils.stdDev(valores);
            stats[var_clima] = { avg, std, max: Math.max(...valores), min: Math.min(...valores) };
        }
    });

    // Coletar eventos extremos
    const extremeEvents = [];
    const nomesVariaveis = {
        temperatura: 'Temperatura Extrema',
        chuva: 'Chuva Intensa',
        umidade: 'Umidade Extrema',
        evapotransp: 'Evapotranspiração Extrema',
        vento: 'Vento Forte',
        tempSolo: 'Temp. Solo Extrema'
    };

    filtrados.forEach((p, idx) => {
        const clima = mapaClima[p.date];
        if (!clima) return;

        const valores_clima = {
            temperatura: clima.temp,
            chuva: clima.chuva,
            umidade: clima.umidade,
            evapotransp: clima.evapotransp,
            vento: clima.vento,
            tempSolo: clima.tempSolo
        };

        // Verificar cada variável por extremidade
        Object.entries(valores_clima).forEach(([var_nome, valor]) => {
            if (!valor || valor === 0 || !stats[var_nome]) return;

            const s = stats[var_nome];
            const threshold = limites[var_nome]?.threshold || 1.5;
            let isExtremo = false;
            let tipo = '';

            if (valor > s.avg + threshold * s.std) {
                isExtremo = true;
                tipo = 'Alto';
            } else if (valor < s.avg - threshold * s.std && valor > 0) {
                isExtremo = true;
                tipo = 'Baixo';
            }

            if (isExtremo) {
                // Calcular variação de preço
                let variacaoPreco = 0;
                if (idx > 0 && idx < filtrados.length - 1) {
                    const preco_anterior = filtrados[idx - 1].val;
                    const preco_atual = p.val;
                    const preco_proximo = filtrados[idx + 1].val;
                    variacaoPreco = ((preco_proximo - preco_anterior) / preco_anterior) * 100;
                }

                extremeEvents.push({
                    data: Utils.formatDate(p.date),
                    tipo: nomesVariaveis[var_nome],
                    valor: valor.toFixed(2),
                    preco: Utils.formatCurrency(p.val),
                    variacao: variacaoPreco,
                    unidade: var_nome === 'temperatura' || var_nome === 'tempSolo' ? '°C' : 
                             var_nome === 'chuva' ? 'mm' : 
                             var_nome === 'vento' ? 'm/s' : '%'
                });
            }
        });
    });

    // Ordenar por variação de preço (eventos com maior impacto primeiro)
    extremeEvents.sort((a, b) => Math.abs(b.variacao) - Math.abs(a.variacao));

    // Renderizar tabela
    const tbody = document.getElementById('extremeEventsTable');
    tbody.innerHTML = '';

    if (extremeEvents.length === 0) {
        let tr = document.createElement('tr');
        tr.innerHTML = '<td class="p-4 text-slate-500 text-center" colspan="6">Nenhuma condição extrema detectada neste período</td>';
        tbody.appendChild(tr);
        return;
    }

    extremeEvents.slice(0, 15).forEach(evt => {
        let tr = document.createElement('tr');
        let impactColor = evt.variacao > 0 ? 'text-red-600' : evt.variacao < 0 ? 'text-green-600' : 'text-slate-600';
        let impactIcon = evt.variacao > 0 ? '↑' : evt.variacao < 0 ? '↓' : '→';
        
        tr.className = 'hover:bg-slate-50 transition-colors';
        tr.innerHTML = `
            <td class="p-4 font-semibold text-slate-800">${evt.data}</td>
            <td class="p-4 text-slate-700">${evt.tipo}</td>
            <td class="p-4 text-right text-slate-600 font-mono">${evt.valor} ${evt.unidade}</td>
            <td class="p-4 text-right font-mono text-slate-700">${evt.preco}</td>
            <td class="p-4 text-right font-mono ${impactColor} font-bold">${evt.variacao > 0 ? '+' : ''}${evt.variacao.toFixed(2)}%</td>
            <td class="p-4 text-center text-lg ${impactColor}">${impactIcon}</td>
        `;
        tbody.appendChild(tr);
    });
}