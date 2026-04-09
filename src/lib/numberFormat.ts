export function formatTokenAmount(value: number | string | null | undefined) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric) || numeric === 0) return "0";

  const absolute = Math.abs(numeric);
  let decimals = 4;

  if (absolute < 0.0001) {
    decimals = 8;
  } else if (absolute < 0.01) {
    decimals = 6;
  } else if (absolute >= 100) {
    decimals = 2;
  }

  const rendered = numeric.toFixed(decimals).replace(/\.?0+$/, "");
  if (rendered === "0" && absolute > 0) {
    return absolute < 0.00000001 ? "<0.00000001" : numeric.toFixed(8).replace(/\.?0+$/, "");
  }

  return rendered;
}

export function formatPercent(value: number | string | null | undefined, maxDecimals = 4) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric)) return "0";
  return numeric.toFixed(maxDecimals).replace(/\.?0+$/, "");
}
