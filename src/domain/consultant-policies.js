// Fonte oficial das políticas estáticas de preço do catálogo.
// Políticas dinâmicas de consultores ativos continuam vindo do cadastro central (Supabase).
export const DEFAULT_COMMERCIAL_POLICY = 45;

export const CONSULTANT_PRICE_POLICIES = Object.freeze({
  huesller: Object.freeze({ discount: 45, multiplier: 0.55 }),
  ney: Object.freeze({ discount: 45, multiplier: 0.55 }),
  gabriel: Object.freeze({ discount: 45, multiplier: 0.55 }),
  almir: Object.freeze({ discount: 45, multiplier: 0.55 }),
  junior: Object.freeze({ discount: 45, multiplier: 0.55 }),
  francisco: Object.freeze({ discount: 50, multiplier: 0.5 }),
  representante: Object.freeze({ discount: 50, multiplier: 0.5 }),
  representante1: Object.freeze({ discount: 50, multiplier: 0.5 }),
  representante2: Object.freeze({ discount: 50, multiplier: 0.5 })
});
