export interface NflTeam {
  id: number
  abbr: string
  city: string
  name: string
  color: string
}

/** Team ids 0..31 match the bit positions used by the contract. Order must never change. */
export const NFL_TEAMS: readonly NflTeam[] = [
  { id: 0, abbr: 'ARI', city: 'Arizona', name: 'Cardinals', color: '#97233F' },
  { id: 1, abbr: 'ATL', city: 'Atlanta', name: 'Falcons', color: '#A71930' },
  { id: 2, abbr: 'BAL', city: 'Baltimore', name: 'Ravens', color: '#241773' },
  { id: 3, abbr: 'BUF', city: 'Buffalo', name: 'Bills', color: '#00338D' },
  { id: 4, abbr: 'CAR', city: 'Carolina', name: 'Panthers', color: '#0085CA' },
  { id: 5, abbr: 'CHI', city: 'Chicago', name: 'Bears', color: '#0B162A' },
  { id: 6, abbr: 'CIN', city: 'Cincinnati', name: 'Bengals', color: '#FB4F14' },
  { id: 7, abbr: 'CLE', city: 'Cleveland', name: 'Browns', color: '#4A2B0F' },
  { id: 8, abbr: 'DAL', city: 'Dallas', name: 'Cowboys', color: '#003594' },
  { id: 9, abbr: 'DEN', city: 'Denver', name: 'Broncos', color: '#E8590C' },
  { id: 10, abbr: 'DET', city: 'Detroit', name: 'Lions', color: '#0076B6' },
  { id: 11, abbr: 'GB', city: 'Green Bay', name: 'Packers', color: '#203731' },
  { id: 12, abbr: 'HOU', city: 'Houston', name: 'Texans', color: '#03202F' },
  { id: 13, abbr: 'IND', city: 'Indianapolis', name: 'Colts', color: '#002C5F' },
  { id: 14, abbr: 'JAX', city: 'Jacksonville', name: 'Jaguars', color: '#006778' },
  { id: 15, abbr: 'KC', city: 'Kansas City', name: 'Chiefs', color: '#E31837' },
  { id: 16, abbr: 'LV', city: 'Las Vegas', name: 'Raiders', color: '#3A3A3C' },
  { id: 17, abbr: 'LAC', city: 'Los Angeles', name: 'Chargers', color: '#0080C6' },
  { id: 18, abbr: 'LAR', city: 'Los Angeles', name: 'Rams', color: '#1B4DB1' },
  { id: 19, abbr: 'MIA', city: 'Miami', name: 'Dolphins', color: '#008E97' },
  { id: 20, abbr: 'MIN', city: 'Minnesota', name: 'Vikings', color: '#4F2683' },
  { id: 21, abbr: 'NE', city: 'New England', name: 'Patriots', color: '#002244' },
  { id: 22, abbr: 'NO', city: 'New Orleans', name: 'Saints', color: '#A8905A' },
  { id: 23, abbr: 'NYG', city: 'New York', name: 'Giants', color: '#0B2265' },
  { id: 24, abbr: 'NYJ', city: 'New York', name: 'Jets', color: '#125740' },
  { id: 25, abbr: 'PHI', city: 'Philadelphia', name: 'Eagles', color: '#004C54' },
  { id: 26, abbr: 'PIT', city: 'Pittsburgh', name: 'Steelers', color: '#C99A00' },
  { id: 27, abbr: 'SF', city: 'San Francisco', name: '49ers', color: '#AA0000' },
  { id: 28, abbr: 'SEA', city: 'Seattle', name: 'Seahawks', color: '#3E7D1A' },
  { id: 29, abbr: 'TB', city: 'Tampa Bay', name: 'Buccaneers', color: '#D50A0A' },
  { id: 30, abbr: 'TEN', city: 'Tennessee', name: 'Titans', color: '#4B92DB' },
  { id: 31, abbr: 'WAS', city: 'Washington', name: 'Commanders', color: '#5A1414' },
]

export const teamById = (id: number): NflTeam => NFL_TEAMS[id]
