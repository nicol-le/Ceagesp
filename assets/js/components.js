
const Components = {

    renderOpportunityIndex(filtrados, sazonalData) {
        const container = document.getElementById('opportunity-index-container');
        const execSimple = document.getElementById('exec-opportunity-simple');
        if (!filtrados.length || !container) return;

        // Cálculo Simulado de Pontuação (0-100)
        const precoAtual = filtrados[filtrados.length - 1].val;
        const mediaHistorica = Utils.average(filtrados.map(p => p.val));
        const deltaPreco = (precoAtual / mediaHistorica); // > 1 é bom para vender
        
        let score = Math.min(100, Math.max(0, Math.round(deltaPreco * 50 + 20)));
        
        let cor = "bg-amber-400";
        let texto = "Momento Neutro";
        let recomendacao = "O mercado está estável. Considere vender conforme sua necessidade de fluxo.";

        if (score > 70) {
            cor = "bg-green-500";
            texto = "Excelente Oportunidade";
            recomendacao = "Os preços estão acima da média histórica. Ótimo momento para comercialização!";
        } else if (score < 40) {
            cor = "bg-red-500";
            texto = "Momento Desfavorável";
            recomendacao = "Preços baixos detectados. Se possível, aguarde uma reação do mercado.";
        }

        const html = `
            <div class="flex items-end gap-4 mb-4">
                <span class="text-5xl font-black text-slate-800">${score}</span>
                <span class="text-sm font-bold uppercase ${cor.replace('bg-', 'text-')}">${texto}</span>
            </div>
            <div class="w-full bg-slate-100 h-4 rounded-full overflow-hidden mb-4">
                <div class="h-full ${cor} transition-all duration-1000" style="width: ${score}%"></div>
            </div>
            <p class="text-sm text-slate-600 leading-relaxed font-medium">
                <i class="fas fa-info-circle mr-1"></i> ${recomendacao}
            </p>
        `;
        container.innerHTML = html;
        
        if(execSimple) {
            execSimple.innerHTML = `
                <div class="flex justify-between items-center h-full">
                    <div>
                        <p class="text-[10px] font-bold text-slate-400 uppercase">Oportunidade de Venda</p>
                        <h3 class="text-xl font-bold text-slate-800">${score}/100 - ${texto}</h3>
                    </div>
                    <div class="w-12 h-12 rounded-full border-4 border-slate-100 flex items-center justify-center text-[10px] font-bold">
                        ${score}%
                    </div>
                </div>
            `;
        }
    },

    renderMarketingCalendar(sazonalData) {
        const container = document.getElementById('marketing-calendar-container');
        if (!container) return;

        // Lógica realista para Abril: Semana Santa (05/04 é domingo de Páscoa)
        const planejamento = [
            { sem: "Semana 1 (Abril)", status: "Excelente", cor: "bg-green-500", obs: "Pico de demanda para a Páscoa. Preços em alta máxima." },
            { sem: "Semana 2 (Abril)", status: "Moderado", cor: "bg-amber-400", obs: "Ressaca pós-feriado. O mercado tende a esfriar e estabilizar." },
            { sem: "Semana 3 (Abril)", status: "Excelente", cor: "bg-green-500", obs: "Preparação para o feriado de Tiradentes. Ótimo para escoar estoque." },
            { sem: "Semana 4 (Abril)", status: "Não Recomendado", cor: "bg-red-500", obs: "Final de mês. Consumo das famílias reduzido e transição de safra." }
        ];

        let html = '';
        planejamento.forEach((p, i) => {
            html += `
                <div class="flex items-center justify-between p-4 border border-slate-100 rounded-xl hover:bg-slate-50 transition-all">
                    <div class="flex flex-col">
                        <div class="flex items-center gap-4">
                            <div class="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center font-bold text-slate-500">${i+1}</div>
                            <span class="font-bold text-slate-700">${p.sem}</span>
                        </div>
                        <p class="text-[10px] text-slate-500 mt-2 ml-14">${p.obs}</p>
                    </div>
                    <span class="px-4 py-1 rounded-full text-[10px] font-black uppercase text-white ${p.cor}">${p.status}</span>
                </div>
            `;
        });
        container.innerHTML = html;
    },

    renderMarketForecast(filtrados) {
        if (!filtrados.length) return;
        const ultimoRegistro = filtrados[filtrados.length - 1];
        const precoAtual = ultimoRegistro.val;
        
        // 1. Calcular a tendência recente (slope de regressão linear nos últimos 30 registros diários)
        const n = Math.min(30, filtrados.length);
        const ultimos = filtrados.slice(-n);
        let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
        for (let i = 0; i < n; i++) {
            sumX += i;
            sumY += ultimos[i].val;
            sumXY += i * ultimos[i].val;
            sumXX += i * i;
        }
        
        // Evita divisão por zero
        const denominator = (n * sumXX - sumX * sumX);
        const slope = denominator !== 0 ? (n * sumXY - sumX * sumY) / denominator : 0;

        // 2. Obter dados de sazonalidade histórica baseados nos preços gerais
        const mesesLabels = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
        const sazonalData = mesesLabels.map((_, i) => {
            let m = appState.rawPrecos.filter(p => new Date(p.data).getUTCMonth() === i);
            return m.length ? Utils.average(m.map(p => parseFloat(p.comum))) : 0;
        });

        const dataRef = new Date(ultimoRegistro.date + 'T00:00:00');
        const mesAtual = dataRef.getUTCMonth();

        const forecast = [30, 60, 90].map((dias, index) => {
            // Projeção por tendência (linear regression slope * dias)
            const projTrend = precoAtual + slope * dias;

            // Projeção baseada na variação sazonal histórica entre o mês atual e o mês futuro
            const mesFuturo = (mesAtual + Math.round(dias / 30)) % 12;
            const avgAtualSazonal = sazonalData[mesAtual] || 1;
            const avgFuturoSazonal = sazonalData[mesFuturo] || avgAtualSazonal;
            const projSazonal = precoAtual * (avgFuturoSazonal / avgAtualSazonal);

            // Combinação ponderada (blending):
            // Mais relevância para a tendência recente no curto prazo (30 dias),
            // mais relevância para a sazonalidade no longo prazo (90 dias).
            const weightTrend = 0.6 - index * 0.2; // 30d -> 0.6, 60d -> 0.4, 90d -> 0.2
            let val = projTrend * weightTrend + projSazonal * (1 - weightTrend);

            // Proteção para evitar projeções absurdas (ex: valores negativos ou alta excessiva)
            const minPermitido = precoAtual * 0.4;
            const maxPermitido = precoAtual * 2.0;
            val = Math.max(minPermitido, Math.min(maxPermitido, val));

            return { dias, val };
        });

        const statsContainer = document.getElementById('forecast-stats');
        statsContainer.innerHTML = forecast.map(f => `
            <div class="bg-slate-50 p-3 rounded-lg text-center">
                <p class="text-[9px] font-bold text-slate-400 uppercase">${f.dias} dias</p>
                <p class="text-sm font-mono font-bold text-slate-700">${Utils.formatCurrency(f.val)}</p>
            </div>
        `).join('');

        Charts.updateForecastChart('chPrevisao', precoAtual, forecast);
    },

    renderMarketEvents() {
        const events = [
            { nome: 'Semana Santa & Páscoa', impacto: 'Alta Demanda', cor: 'text-green-600', icon: 'fa-fish', desc: 'Maior consumo de legumes e frutas finas.' },
            { nome: 'Feriado Tiradentes', impacto: 'Demanda Turística', cor: 'text-blue-500', icon: 'fa-umbrella-beach', desc: 'Aumento de consumo em hotéis e restaurantes.' },
            { nome: 'Transição Outono', impacto: 'Mudança de Clima', cor: 'text-amber-500', icon: 'fa-wind', desc: 'Fim das colheitas de verão. Redução de volume em folhosas.' }
        ];

        const container = document.getElementById('market-events-container');
        container.innerHTML = events.map(e => `
            <div class="p-4 border border-slate-100 rounded-xl flex gap-4">
                <div class="text-xl ${e.cor}"><i class="fas ${e.icon}"></i></div>
                <div>
                    <h4 class="text-xs font-bold text-slate-800">${e.nome}</h4>
                    <p class="text-[10px] text-slate-500 mb-1">${e.desc}</p>
                    <span class="text-[9px] font-black uppercase ${e.cor}">${e.impacto}</span>
                </div>
            </div>
        `).join('');
    },

    atualizarSemaforo(precosFiltrados) {
        if (!precosFiltrados.length) return;

        const precoAtual = precosFiltrados[precosFiltrados.length - 1].val;
        const mesAbril = 3; // Abril (0-indexed)
       
        const historicoMes = appState.rawPrecos.filter(p => {
            const dataP = new Date(p.data);
            return dataP.getUTCMonth() === mesAbril && dataP.getFullYear() < 2026;
        });

        if (historicoMes.length === 0) {
            this.renderSemaforo('neutro', 'Sem histórico comparativo', 'Não há dados de anos anteriores para Abril.');
            return;
        }

        const precoHistorico = Utils.average(historicoMes.map(p => parseFloat(p.comum)));
        const diferenca = (precoAtual - precoHistorico) / precoHistorico;

        if (diferenca > 0.08) {
            this.renderSemaforo('verde', 'Preço em Alta (Páscoa)', `O preço está ${Math.round(diferenca * 100)}% acima da média histórica de Abril. Excelente para colher.`);
        } else if (diferenca < -0.08) {
            this.renderSemaforo('vermelho', 'Preço Abaixo da Média', `O valor atual está ${Math.round(Math.abs(diferenca) * 100)}% menor que o esperado para este período.`);
        } else {
            this.renderSemaforo('amarelo', 'Mercado Estável', 'O preço segue a tendência histórica para o mês de Abril.');
        }
    },

    renderSemaforo(tipo, titulo, desc) {
        const circulo = document.getElementById('semaforo-circulo');
        const icon = document.getElementById('semaforo-icon');
        document.getElementById('semaforo-titulo').innerText = titulo;
        document.getElementById('semaforo-desc').innerText = desc;

        const baseClass = "w-16 h-16 rounded-full flex items-center justify-center shadow-lg ";
        if (tipo === 'verde') { circulo.className = baseClass + "bg-green-500 shadow-green-200"; icon.innerText = "trending_up"; }
        else if (tipo === 'vermelho') { circulo.className = baseClass + "bg-red-500 shadow-red-200"; icon.innerText = "warning"; }
        else if (tipo === 'amarelo') { circulo.className = baseClass + "bg-amber-400 shadow-amber-200"; icon.innerText = "remove_moderate"; }
    },

    gerarInsightIA(dados, pTemp, pChuva, ptsT, ptsC, correlacoes) {
        const insightEl = document.getElementById('ia-insight');
        if (!dados.length || !insightEl) return;

        const precoAtual = dados[dados.length - 1].val;
        const media = Utils.average(dados.map(d => d.val));
        const varSemana = Utils.percentualMudanca(dados.length > 7 ? dados[dados.length - 8].val : precoAtual, precoAtual);

        let html = `<div class="p-3 bg-slate-50 rounded-lg border-l-4 border-primary">
            <strong>Resumo de Abril:</strong> O mercado está operando com preço de <strong>${Utils.formatCurrency(precoAtual)}</strong>. 
            A variação na última semana foi de <span class="${varSemana >= 0 ? 'text-green-600' : 'text-red-600'}">${varSemana.toFixed(1)}%</span>.
        </div>`;

        if (correlacoes && correlacoes.length > 0) {
            const forte = correlacoes.find(c => Math.abs(c.r) > 0.6);
            if (forte) {
                html += `<p class="mt-2"><i class="fas fa-microchip text-primary"></i> Detectamos uma <strong>correlação ${forte.r > 0 ? 'positiva' : 'negativa'} forte</strong> com a ${forte.nome.toLowerCase()}. Isso indica que o clima atual é o principal influenciador do preço.</p>`;
            }
        }

        html += `<p class="mt-2 text-xs font-bold text-blue-700 underline">Estratégia Recomendada: Aproveite o pico da Semana Santa (Semana 1) antes da estabilização típica da segunda quinzena de Abril.</p>`;
        insightEl.innerHTML = html;
    }
};