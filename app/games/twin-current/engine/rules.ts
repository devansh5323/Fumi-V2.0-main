import type { CargoSymbol, RouteRule } from "../types";

// Which gate a spark carrying `cargo` must go through under `rule`, given
// the round's emblems (in their fixed per-round order). "swap" sends each
// emblem to the next one in that list (a plain swap with two; a rotation
// with three).
export function gateFor(cargo: CargoSymbol, rule: RouteRule, categories: CargoSymbol[]): CargoSymbol {
  if (rule === "match") return cargo;
  const i = categories.indexOf(cargo);
  return categories[(i + 1) % categories.length];
}

export function ruleMapping(rule: RouteRule, categories: CargoSymbol[]): { from: CargoSymbol; to: CargoSymbol }[] {
  return categories.map((from) => ({ from, to: gateFor(from, rule, categories) }));
}
