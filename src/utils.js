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

/** Returns a human-readable relative time (e.g. "just now", "2 min ago", "1 hour ago"). */
export function formatDurationAgo(isoString) {
  if (!isoString || typeof isoString !== 'string') return null;
  const then = new Date(isoString).getTime();
  if (Number.isNaN(then)) return null;
  const now = Date.now();
  const sec = Math.floor((now - then) / 1000);
  if (Number.isNaN(sec) || sec < 0) return 'just now';
  if (sec < 10) return 'just now';
  if (sec < 60) return `${sec} sec ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hr ago`;
  const day = Math.floor(hr / 24);
  if (day === 1) return '1 day ago';
  if (day < 7) return `${day} days ago`;
  const week = Math.floor(day / 7);
  if (week === 1) return '1 week ago';
  return `${week} weeks ago`;
}
