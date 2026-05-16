export function formatMontant(value: number | null | undefined): string {
  if (value == null) return '0,00 €';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatPourcentage(value: number | null | undefined): string {
  if (value == null) return '0,0 %';
  return new Intl.NumberFormat('fr-FR', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

export function apiError(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

export function apiOk(data: unknown, status = 200) {
  return Response.json(data, { status });
}
