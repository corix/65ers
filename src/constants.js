/**
 * @typedef {Object} Game
 * @property {string} date - ISO date string (YYYY-MM-DD)
 * @property {string[]} players - ordered list of player names
 * @property {string} winner - name of winning player
 * @property {Object<string, number>} totals - player name -> final score
 * @property {Round[]} rounds
 *
 * @typedef {Object} Round
 * @property {string} round - round name (from ROUNDS)
 * @property {Object<string, number>} scores - player name -> score
 * @property {string} [tunk] - player who tunked
 * @property {string[]} [tinks] - players who tinked
 * @property {string[]} [magic65s] - players with magic 65
 * @property {string[]} [falseTunks] - players with false tunks
 */

export const ROUNDS = ['3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export const PILL_COLOR = '#6b85d0';

export const PLAYER_COLORS = [
  '#6b8aef', '#5aad6e', '#ecc04a', '#e07679',
  '#a88bf8', '#4fc9dc', '#fb9a5a', '#f27ab3',
  '#5ac9bf', '#8b8df4',
];

/** Muted versions for charts – less bright lines and dots */
export const CHART_PLAYER_COLORS = [
  '#5a7ad8', '#4a9a5e', '#c4a030', '#b86669',
  '#8870d8', '#3fa9bc', '#d88a4a', '#c86a93',
  '#4ab9af', '#6b6dd4',
];
