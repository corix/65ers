# The 65 Almanac

## Overview
This is a data entry tool used to digitize and store paper scoresheets from a family card game we call "65." 

Each game of 65 consists of 11 rounds, with a winner for each round (called a "tunk"), and a final list of total scores after the 11th round. No matter how many tunks a player gets, the game final winner must have the lowest total score. Sometimes, a player will have a "false tunk," and will be penalized by adding 65 points to their score for that round. The rounds are named: 3, 4, 5, 6, 7, 8, 9, 10, J (for Jacks), Q (for Queens), and K (for Kings).

### Features
This website ultimately will consists of 3 major features:
1. Web form to create new entries Each entry consists of:
	* Calendar date (1 entry per date)
	* Number of players (this varies)
	* Names of players
	* 11 rounds, with score per player per round — 
	* Winning player of each round (called a "Tunk")
	* Total scores per player, with winning player having the lowest score
	* Any penalties incurred by a player, and when
2. Archive of entries (first stored locally, then on a database) — displayed as tabular data
3. Data insights and visualizations see ("Ideas" below)

### Nice-to-haves
* Password-protected access or invite-based login credentials 
* CSV export

### Non-goals / definitely out of scope
* Ability to edit or remove entries — not necessary past the testing stage 
* Multiple databases/different types of entries — only one collection of scoresheets, for one type of game
* The game itself (playing 65 with the computer) — this tool is just to store the scoresheets and show insights about the players

## Ideas 
### Data insights (written stats)
* Highest and lowest all-time final scores
* Most tunks (rounds won) in a single game
* Player leaderboard (ranked by games won, ranked by average final score)
* Individual player stats — total games won, total rounds won, average rounds won per game, 
### Data visualizations (graphs)
* Most recent game (multiple line graph, each line is a player, Y axis is score and X axis is rounds)
* Average player performance (scatter plot of how a player tends to score in each round)

## PRODUCT ROADMAP
These are the building stages for this project.

### 1. Phase One — Testing web form [WE ARE HERE]
* Web form only, no backend - just use vanilla JS and Vite
* Use JSON stubs and localstorage to store entries
* Polish UI of the web form to make it easy to use

### 2. Phase 2 — Testing data insights
* Create a separate page for stats and verify accuracy
* Use chart.js to generate line graphs, scatter plots, other insights using the aggregated data

### 3. Phase 3 — Set up database on the back end
* TBD, likely Supabase

### 4. Phase 4 — Deploy and test
* Deploy through Netlify
* Test web form and data insights 