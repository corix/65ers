const GAMES_KEY = '65ers_games';
const PLAYERS_KEY = '65ers_custom_players';

const DEFAULT_PLAYERS = ['Asha', 'Will', 'Clancy', 'Pete', 'Tim', 'Larry', 'Cori'];

export function saveGame(game) {
  const games = loadGames();
  games.push(game);
  localStorage.setItem(GAMES_KEY, JSON.stringify(games));
}

export function loadGames() {
  const raw = localStorage.getItem(GAMES_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function getPlayerNames() {
  return [...DEFAULT_PLAYERS, ...loadCustomPlayers()];
}

export function addCustomPlayer(name) {
  const custom = loadCustomPlayers();
  const trimmed = name.trim();
  if (!trimmed) return;
  if ([...DEFAULT_PLAYERS, ...custom].some(n => n.toLowerCase() === trimmed.toLowerCase())) return;
  custom.push(trimmed);
  localStorage.setItem(PLAYERS_KEY, JSON.stringify(custom));
}

function loadCustomPlayers() {
  const raw = localStorage.getItem(PLAYERS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export const ROUNDS = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
