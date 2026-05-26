
const Utils = {
  
    toYMD(d) {
        if (!d) return null;
        const date = new Date(d);
        return isNaN(date.getTime()) ? null : date.toISOString().split('T')[0];
    },

  
    formatCurrency(val) {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(val);
    },

   
    getPearson(pts) {
        const n = pts.length;
        if (n < 2) return 0;

        let x = pts.map(p => p.x);
        let y = pts.map(p => p.y);

        let sx = x.reduce((a, b) => a + b, 0);
        let sy = y.reduce((a, b) => a + b, 0);
        let sxy = x.reduce((a, b, i) => a + b * y[i], 0);
        let sx2 = x.reduce((a, b) => a + b * b, 0);
        let sy2 = y.reduce((a, b) => a + b * b, 0);

        let num = n * sxy - sx * sy;
        let den = Math.sqrt((n * sx2 - sx * sx) * (n * sy2 - sy * sy));

        return den === 0 ? 0 : num / den;
    },

   
    getRegLine(pts) {
        if (pts.length < 2) return [];

        let x = pts.map(p => p.x);
        let y = pts.map(p => p.y);
        let n = pts.length;

        let sx = x.reduce((a, b) => a + b, 0);
        let sy = y.reduce((a, b) => a + b, 0);
        let sxy = x.reduce((a, b, i) => a + b * y[i], 0);
        let sx2 = x.reduce((a, b) => a + b * b, 0);

        let m = (n * sxy - sx * sy) / (n * sx2 - sx * sx);
        let b = (sy - m * sx) / n;

        let minX = Math.min(...x);
        let maxX = Math.max(...x);

        return [
            { x: minX, y: m * minX + b },
            { x: maxX, y: m * maxX + b }
        ];
    },

    
    average(arr) {
        if (!arr.length) return 0;
        return arr.reduce((a, b) => a + b, 0) / arr.length;
    }
};