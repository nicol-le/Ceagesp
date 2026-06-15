
const Components = {

    atualizarSemaforo(precosFiltrados, statsClima) {
        if (!precosFiltrados.length) return;

        const hoje = new Date();
        const mesAtual = hoje.getUTCMonth();
       
        const ultimosPrecos = precosFiltrados.slice(-30).map(p => p.val);
        const precoAtual = Utils.average(ultimosPrecos);

        const historicoMes = appState.rawPrecos.filter(p => {
            const dataP = new Date(p.data);
            return dataP.getUTCMonth() === mesAtual && dataP.getFullYear() < hoje.getFullYear();
        });

        if (historicoMes.length === 0) {
            this.renderSemaforo('neutro', 'Sem histórico suficiente', 'Ainda não temos dados de anos anteriores para comparar.');
            return;
        }

        const precoHistorico = Utils.average(historicoMes.map(p => parseFloat(p.comum)));
        const diferenca = (precoAtual - precoHistorico) / precoHistorico;

        if (diferenca > 0.10) {
            this.renderSemaforo('verde', 'Momento de Oportunidade!', `O preço atual está ${Math.round(diferenca * 100)}% ACIMA da média histórica para este mês. Bom momento para vender!`);
        } else if (diferenca < -0.10) {
            this.renderSemaforo('vermelho', 'Atenção: Preço Baixo', `O preço atual está ${Math.round(Math.abs(diferenca) * 100)}% ABAIXO do esperado para esta época.`);
        } else {
            this.renderSemaforo('amarelo', 'Mercado Estável', 'O preço está dentro da normalidade histórica para este mês.');
        }
    },

    renderSemaforo(tipo, titulo, desc) {
        const circulo = document.getElementById('semaforo-circulo');
        const icon = document.getElementById('semaforo-icon');
        const tituloEl = document.getElementById('semaforo-titulo');
        const descEl = document.getElementById('semaforo-desc');

        tituloEl.innerText = titulo;
        descEl.innerText = desc;

        const baseClass = "w-16 h-16 rounded-full flex items-center justify-center shadow-lg ";
        
        if (tipo === 'verde') {
            circulo.className = baseClass + "bg-green-500 shadow-green-200";
            icon.innerText = "trending_up";
        } else if (tipo === 'vermelho') {
            circulo.className = baseClass + "bg-red-500 shadow-red-200";
            icon.innerText = "warning";
        } else if (tipo === 'amarelo') {
            circulo.className = baseClass + "bg-amber-400 shadow-amber-200";
            icon.innerText = "remove_moderate";
        } else {
            circulo.className = "w-16 h-16 rounded-full bg-slate-300 flex items-center justify-center";
            icon.innerText = "help";
        }
    },

    // IA INTELIGENTE MELHORADA COM ANÁLISE MULTIVARIADA
    gerarInsightIA(dados, pearsonTemp, pearsonChuva, ptsTemp, ptsChuva, correlacoes) {
        const insightEl = document.getElementById('ia-insight');
        if (!dados.length || !insightEl) return;

        let html = '';

        // Análise de tendência
        const recentes = dados.slice(-7);
        const anteriores = dados.slice(-14, -7);
        const mediaRecente = Utils.average(recentes.map(d => d.val));
        const mediaAnterior = Utils.average(anteriores.map(d => d.val));
        const tendencia = Utils.percentualMudanca(mediaAnterior, mediaRecente);

        // 1. TENDÊNCIA DE PREÇO
        html += '<div class="mb-3"><span class="font-bold text-slate-800">Tendência de Preço:</span> ';
        if (tendencia > 5) {
            html += `<span class="text-green-600">Os preços <strong>subiram ${Math.abs(tendencia).toFixed(1)}%</strong> na última semana</span>`;
        } else if (tendencia < -5) {
            html += `<span class="text-red-600">Os preços <strong>caíram ${Math.abs(tendencia).toFixed(1)}%</strong> na última semana</span>`;
        } else {
            html += `<span class="text-amber-600">Os preços têm se mantido <strong>estáveis</strong> (variação de ${Math.abs(tendencia).toFixed(1)}%)</span>`;
        }
        html += '</div>';

        // 2. FATORES CLIMÁTICOS PRINCIPAIS
        html += '<div class="mb-3"><span class="font-bold text-slate-800">Fatores Climáticos Dominantes:</span> ';
        
        if (!correlacoes || correlacoes.length === 0) {
            html += '<span class="text-slate-500">Dados insuficientes para análise climática</span>';
        } else {
            // Encontrar os fatores com maior impacto
            const topFactores = correlacoes.slice(0, 3);
            const factoresFortes = topFactores.filter(f => Math.abs(f.r) > 0.5);
            
            if (factoresFortes.length > 0) {
                html += '<div class="text-sm text-slate-700 space-y-1">';
                factoresFortes.forEach(f => {
                    const direcao = f.r > 0 ? 'aumentam' : 'diminuem';
                    const strength = Math.abs(f.r) > 0.7 ? 'forte' : 'moderada';
                    html += `<div class="text-green-600"><strong>${f.nome}:</strong> correlação ${strength} (r=${f.r.toFixed(2)}) - preços ${direcao}</div>`;
                });
                html += '</div>';
            } else {
                html += '<span class="text-slate-500">Nenhuma correlação forte detectada</span>';
            }
        }
        html += '</div>';

        // 3. RECOMENDAÇÃO PRÁTICA
        html += '<div class="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">';
        html += '<span class="font-bold text-blue-900">Recomendação: </span>';
        
        let recomendacao = 'Fique atento ao volume de entrada no CEAGESP nas primeiras horas.';
        
        // Recomendação baseada em correlações fortes
        if (correlacoes && correlacoes.length > 0) {
            const factoresFortes = correlacoes.filter(f => Math.abs(f.r) > 0.5);
            if (factoresFortes.length > 0) {
                recomendacao = 'Os fatores climáticos têm impacto significativo! Monitore as previsões meteorológicas antes de negociar, especialmente: ' + 
                    factoresFortes.map(f => f.nome.toLowerCase()).join(', ') + '.';
            }
        }
        
        if (tendencia > 5) {
            recomendacao += ' A tendência atual é de alta - bom momento para vender se você tem estoque.';
        } else if (tendencia < -5) {
            recomendacao += ' Com preços em queda, considere esperar estabilização ou expandir compras.';
        }
        
        html += `<strong>${recomendacao}</strong></div>`;

        // 4. QUALIDADE DOS DADOS
        html += '<div class="mt-3 text-xs text-slate-500 border-t border-slate-200 pt-2">';
        const totalPontos = (ptsTemp ? ptsTemp.length : 0) + (ptsChuva ? ptsChuva.length : 0);
        html += `Dados: ${totalPontos} pontos climáticos únicos analisados`;
        if (correlacoes) {
            html += ` | ${correlacoes.length} variáveis climáticas correlacionadas`;
        }
        html += '</div>';

        insightEl.innerHTML = html;
    }
};