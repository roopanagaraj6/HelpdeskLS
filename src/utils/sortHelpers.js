// ─── APPLY COLUMN SORT ────────────────────────────────────────────────────────
// Pass a sort state object { _sortField, _sortDir } to sort any array.
export const applySort = (arr, filters) => {
  if (!filters || !filters._sortField) return arr;
  const { _sortField: field, _sortDir: dir } = filters;
  return [...arr].sort((a, b) => {
    let av = a[field];
    let bv = b[field];
    if (Array.isArray(av)) av = (av || []).map(x => x.name || x).join(", ");
    if (Array.isArray(bv)) bv = (bv || []).map(x => x.name || x).join(", ");
    if (av instanceof Date) av = av.getTime();
    if (bv instanceof Date) bv = bv.getTime();
    if (av == null) av = "";
    if (bv == null) bv = "";
    const cmp =
      typeof av === "number" && typeof bv === "number"
        ? av - bv
        : String(av).localeCompare(String(bv));
    return dir === "asc" ? cmp : -cmp;
  });
};
