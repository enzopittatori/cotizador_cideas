// Formateo de moneda compartido server/cliente. Los montos del producto
// son pesos argentinos enteros (sin centavos).
const fmtARS = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

export function formatearARS(n: number): string {
  return fmtARS.format(n);
}
