export const groupByTagAndSum = (transactions: any[]) => {
    const grouped = transactions.reduce((acc, t) => {
        if (!acc[t.tag_id]) {
            acc[t.tag_id] = {
                tag_id: t.tag_id,
                name: t.tag_name,
                fill: t.tag_color,
                value: 0,
                count: 0,
            };
        }
        
        acc[t.tag_id].value += Number(t.value);
        acc[t.tag_id].count += 1;
        
        return acc;
    }, {});
    
    return Object.values(grouped);
}