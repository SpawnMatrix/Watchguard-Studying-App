/** Require a time and timezone; a date alone is not an accurate build timestamp. */
export function buildTimestamp(value:unknown):string|null {
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value))return null;
  const date=new Date(value);
  return Number.isFinite(date.getTime())?date.toISOString():null;
}
