
const Api = {

    async fetchProdutos() {
        try {
            const { data, error } = await _sb.from('ceagesp').select('produto');
            if (error) throw error;
            return [...new Set(data.map(i => i.produto))].sort();
        } catch (err) {
            console.error("Erro ao buscar produtos:", err);
            return [];
        }
    },

   
    async fetchVariedades(produto) {
        try {
            const { data, error } = await _sb.from('ceagesp')
                .select('variedade')
                .eq('produto', produto);
            if (error) throw error;
            return [...new Set(data.map(i => i.variedade))].sort();
        } catch (err) {
            console.error("Erro ao buscar variedades:", err);
            return [];
        }
    },


    async fetchPrecos(produto, variedade = "") {
        let pAll = [];
        let complete = false;
        let from = 0;
        const step = 1000;

        while (!complete) {
            let query = _sb.from('ceagesp').select('*').eq('produto', produto);
            if (variedade) query = query.eq('variedade', variedade);
            
            const { data, error } = await query.range(from, from + step - 1);
            
            if (error) {
                console.error("Erro na busca de preços:", error);
                break;
            }

            if (data && data.length > 0) {
                pAll = [...pAll, ...data];
                from += step;
                if (data.length < step) complete = true;
            } else {
                complete = true;
            }
        }
        return pAll;
    },

    async fetchClima() {
        let cAll = [];
        try {
            for (let i = 0; i < 6; i++) {
                const { data, error } = await _sb.from('clima_diario')
                    .select('*')
                    .range(i * 1000, (i + 1) * 1000 - 1);
                
                if (error) throw error;
                if (data) cAll = [...cAll, ...data];
                if (data.length < 1000) break;
            }
            return cAll;
        } catch (err) {
            console.error("Erro ao buscar clima:", err);
            return [];
        }
    }
};