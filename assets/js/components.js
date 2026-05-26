
const Components = {

    atualizarSemaforo(precosFiltrados) {
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


    gerarInsightIA(dados, pearson) {
        const insightEl = document.getElementById('ia-insight');
        if (!dados.length || !insightEl) return;

        const recentes = dados.slice(-7);
        const anteriores = dados.slice(-14, -7);
        const mediaRecente = Utils.average(recentes.map(d => d.val));
        const mediaAnterior = Utils.average(anteriores.map(d => d.val));
        
        let texto = `Analisando o comportamento do produto, `;

        if (mediaRecente > mediaAnterior * 1.05) texto += "notamos uma **subida rápida** nos preços recentemente. ";
        else if (mediaRecente < mediaAnterior * 0.95) texto += "o mercado apresenta uma **queda acentuada** na última semana. ";
        else texto += "o preço tem se mantido **estável**. ";


        if (Math.abs(pearson) > 0.6) {
            texto += "O clima parece ser um fator decisivo aqui: mudanças na temperatura impactam diretamente o que você recebe. ";
        }

       
        texto += " **Dica para o produtor:** Fique atento ao volume de entrada no CEAGESP nas primeiras horas da manhã para negociar melhor.";

        insightEl.innerHTML = texto;
    }
};