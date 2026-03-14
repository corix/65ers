export function formatDate(dateStr, shortYear = false) {
  const [y, m, d] = dateStr.split('-');
  const year = shortYear ? String(y).slice(-2) : y;
  return `${parseInt(m)}/${parseInt(d)}/${year}`;
}

export function todayShort() {
  const d = new Date();
  return `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear()).slice(-2)}`;
}
