chrome.action.onClicked.addListener(async(tab)=>{
  if(!tab.id)return;

  const result=await chrome.scripting.executeScript({
    target:{tabId:tab.id},
    func:async()=>{
      const grupos=[842,720,705,708,718,703,704,707,719,600],out=[];
      for(const g of grupos){
        const b=`_search=false&nd=${Date.now()}&rows=1000&page=1&sidx=g.progruNom&sord=asc&fornecedor=&localEstoque=&filtros%5Bcampo%5D=g.progruCod&filtros%5Bvalor%5D=${g}&filtros%5Bfinal%5D=&filtros%5Binicial%5D=&filtros%5Boperador%5D=eq&filtros%5Badicional%5D=s.inativarItens+is+not+true&estoqueFiliais=true&dataAtualizacaoValorVenda=false&itensEngenharia=false&cliente=`;
        const x=await fetch('/siggma/app/itens/consultar',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded; charset=UTF-8','X-Requested-With':'XMLHttpRequest'},body:b}).then(r=>r.json());
        out.push(...(x.rows||[]));
      }
      return JSON.stringify(out);
    }
  });

  const data=result?.[0]?.result;
  if(!data)return;

  const url='data:application/json;charset=utf-8,'+encodeURIComponent(data);

  chrome.downloads.download({
    url,
    filename:'zetta-interno.json',
    saveAs:false,
    conflictAction:'overwrite'
  });
});
