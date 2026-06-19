
export default function ProductModal(){
return <section>
<h2>Produto</h2>
<div>Imagem</div>
<strong>R$ 104,05</strong>
<small>✓ Valor com IPI incluso</small>
<div><button>-</button><span>1</span><button>+</button></div>
<button>Adicionar ao pedido</button>
<hr/>
<h3>Clientes também compram</h3>
<div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
<div>Item +</div><div>Item +</div><div>Item +</div>
</div>
</section>}
