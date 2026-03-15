export function formatDate(dateStr, shortYear = false) {
  const [y, m, d] = dateStr.split('-');
  const year = shortYear ? String(y).slice(-2) : y;
  return `${parseInt(m)}/${parseInt(d)}/${year}`;
}

export function todayShort() {
  const d = new Date();
  return `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(-2)}`;
}

export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
