# Valores sem e com IPI

Correção aplicada:

- O valor principal do catálogo continua seguindo a política do consultor.
- O valor com IPI é calculado sobre o preço com IPI bruto da fonte.
- O valor sem IPI só aparece quando o JSON realmente trouxer um campo sem IPI diferente do valor com IPI.
- Se o campo sem IPI estiver ausente ou igual ao preço com IPI, o card mostra apenas o valor com IPI para evitar duplicidade incorreta.
- Links especiais aplicam o fator/desconto sobre os dois valores quando ambos existirem.
- Carrinho, WhatsApp, busca, modal de identificação e analytics não foram alterados intencionalmente.
