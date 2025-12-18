// Shared formatting helpers (pt-BR)

export const formatCurrencyBRL = (value: number) =>
  value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// For cost per unit (needs more decimal places)
export const formatCostPerUnit = (value: number, unit: string) =>
  `${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}/${unit}`;

export const formatNumberBR = (
  value: number,
  options: { minimumFractionDigits?: number; maximumFractionDigits?: number } = {}
) =>
  value.toLocaleString('pt-BR', {
    minimumFractionDigits: options.minimumFractionDigits ?? 0,
    maximumFractionDigits: options.maximumFractionDigits ?? 2,
  });

export const formatQuantityBR = (value: number, unit: string) => {
  const isUnit = unit === 'unidade' || unit === 'un' || unit === 'un.';
  if (isUnit) return formatNumberBR(value, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const hasDecimals = Math.abs(value % 1) > Number.EPSILON;
  return formatNumberBR(value, {
    minimumFractionDigits: 0,
    maximumFractionDigits: hasDecimals ? 2 : 0,
  });
};
