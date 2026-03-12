const GAMES_KEY = '65ers_games';
const PLAYERS_KEY = '65ers_custom_players';

const PRIMARY_PLAYERS = ['Asha', 'Clancy', 'Pete', 'Tim', 'Will', 'Larry'];
const SECONDARY_PLAYERS = ['Cori'];

export function saveGame(game) {
  const games = loadGames();
  games.push(game);
  localStorage.setItem(GAMES_KEY, JSON.stringify(games));
}

export function loadGames() {
  const raw = localStorage.getItem(GAMES_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function getPlayerRows() {
  const custom = loadCustomPlayers().sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' })
  );
  return {
    primary: PRIMARY_PLAYERS,
    secondary: [...SECONDARY_PLAYERS, ...custom],
  };
}

export function getAllPlayerNames() {
  return [...PRIMARY_PLAYERS, ...SECONDARY_PLAYERS, ...loadCustomPlayers()];
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
