import './style.css'
import leagueData from './data/league.json'

type Player = {
  name: string
  initials: string
  accent: string
}

type WeekResult = {
  points: number | null
  score: string | null
}

type Week = {
  week: string
  date: string
  dateISO: string
  course: string
  game: string
  gameOfWeek?: boolean
  highlight?: string
  results: Record<string, WeekResult>
}

type LeagueData = {
  season: string
  pointsFormat: number[]
  players: Player[]
  weeks: Week[]
}

const data = leagueData as LeagueData
const players = data.players
const weeks = [...data.weeks].sort((a, b) => a.dateISO.localeCompare(b.dateISO))

const toDenverDateTime = (date: Date) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Denver',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date)

  const pick = (type: string) => parts.find((part) => part.type === type)?.value ?? '00'

  return `${pick('year')}-${pick('month')}-${pick('day')}T${pick('hour')}:${pick('minute')}:${pick(
    'second'
  )}`
}

const heroWeek = (() => {
  const nowDenver = toDenverDateTime(new Date())

  for (const week of weeks) {
    const cutoff = `${week.dateISO}T21:00:00`
    if (nowDenver < cutoff) {
      return week
    }
  }

  return weeks[weeks.length - 1]
})()

const completedWeeks = weeks.filter((week) =>
  Object.values(week.results).some((value) => typeof value.points === 'number')
)

const totals = players.map((player) => {
  const points = completedWeeks
    .map((week) => week.results[player.name]?.points)
    .filter((value): value is number => typeof value === 'number')
  const total = points.reduce((sum, value) => sum + value, 0)
  const average = points.length ? total / points.length : 0
  const threePointWeeks = points.filter((value) => value === 3).length
  const consistency = points.length
    ? Math.sqrt(points.reduce((sum, value) => sum + Math.pow(value - average, 2), 0) / points.length)
    : 0

  return {
    player,
    total,
    average,
    played: points.length,
    threePointWeeks,
    consistency,
    points,
  }
})

const leaderboard = [...totals].sort((a, b) => b.total - a.total)
const maxTotal = Math.max(...leaderboard.map((item) => item.total), 1)

const lastCompletedWeek = completedWeeks[completedWeeks.length - 1]

const spotlight = lastCompletedWeek
  ? leaderboard.find((item) => item.points[item.points.length - 1] === 3) ?? leaderboard[0]
  : leaderboard[0]

const formatPoints = (value: number | null | undefined) =>
  typeof value === 'number' ? `${value} pts` : 'TBD'

const formatScore = (value: string | null | undefined) => value ?? '—'

const app = document.querySelector<HTMLDivElement>('#app')

if (app) {
  app.innerHTML = `
    <div class="page">
      <header class="hero">
        <div class="hero-copy">
          <div class="eyebrow">Golf+ League · Season ${data.season}</div>
          <h1>Golf+ League</h1>
          <p class="hero-lede">
            Weekly points from 3-0. 4 player league.
          </p>
          <div class="hero-meta">
            <div class="meta-card">
              <span class="meta-label">Current leader</span>
              <span class="meta-value">${leaderboard[0].player.name}</span>
            </div>
            <div class="meta-card">
              <span class="meta-label">Completed weeks</span>
              <span class="meta-value">${completedWeeks.length}</span>
            </div>
            <div class="meta-card">
              <span class="meta-label">Points format</span>
              <span class="meta-value">${data.pointsFormat.join(' · ')}</span>
            </div>
          </div>
        </div>
        <div class="hero-panel">
          <div class="hero-panel-card">
            <div class="panel-title">Game of the Week</div>
            <div class="panel-game">${heroWeek?.game ?? 'TBD'}</div>
            <div class="panel-course">${heroWeek?.course ?? 'Course TBD'}</div>
            <div class="panel-highlight">${heroWeek?.highlight ?? 'Set the format and course each week.'}</div>
          </div>
          <div class="hero-panel-card glass">
            <div class="panel-title">Leader Spotlight</div>
            <div class="spotlight">
              <div class="avatar ${spotlight.player.accent}">${spotlight.player.initials}</div>
              <div>
                <div class="spotlight-name">${spotlight.player.name}</div>
                <div class="spotlight-detail">${spotlight.total} total points</div>
              </div>
            </div>
            <div class="spotlight-metric">
              <span>Avg. points</span>
              <strong>${spotlight.average.toFixed(2)}</strong>
            </div>
          </div>
        </div>
      </header>

      <section class="section">
        <div class="section-title">
          <h2>Leaderboard</h2>
          <p>Totals update after each week. The bar length tracks the points chase.</p>
        </div>
        <div class="leaderboard">
          ${leaderboard
            .map((entry, index) => {
              const width = Math.max(18, (entry.total / maxTotal) * 100)
              return `
                <div class="leader-row" style="--delay:${index * 80}ms;">
                  <div class="leader-rank">#${index + 1}</div>
                  <div class="leader-player">
                    <div class="avatar ${entry.player.accent}">${entry.player.initials}</div>
                    <div>
                      <div class="leader-name">${entry.player.name}</div>
                      <div class="leader-sub">${entry.played} weeks · ${entry.threePointWeeks} wins</div>
                    </div>
                  </div>
                  <div class="leader-total">
                    <strong>${entry.total}</strong>
                    <span>pts</span>
                  </div>
                  <div class="leader-bar">
                    <div class="leader-fill" style="width:${width}%;"></div>
                  </div>
                </div>
              `
            })
            .join('')}
        </div>
      </section>

      <section class="section grid-2">
        <div class="card">
          <div class="card-header">
            <h3>Weekly Formats</h3>
            <p>Track scores, lock in the game type, and highlight the marquee matchup.</p>
          </div>
          <div class="schedule">
            ${weeks
              .map((week) => {
                const points = players
                  .map((player) => {
                    const value = week.results[player.name]
                    return `
                      <div class="points-chip">
                        <span>${player.name}</span>
                        <div class="points-stack">
                          <strong>${formatPoints(value?.points)}</strong>
                          <em>${formatScore(value?.score)}</em>
                        </div>
                      </div>
                    `
                  })
                  .join('')

                return `
                  <div class="schedule-row ${week.gameOfWeek ? 'featured' : ''}">
                    <div class="week-meta">
                      <div class="week-title">
                        <span>${week.week}</span>
                        ${week.gameOfWeek ? '<span class="badge">Game of the Week</span>' : ''}
                      </div>
                      <div class="week-info">${week.date} · ${week.course}</div>
                      <div class="week-game">${week.game}</div>
                    </div>
                    <div class="week-points">${points}</div>
                  </div>
                `
              })
              .join('')}
          </div>
        </div>

        <div class="card stats-card">
          <div class="card-header">
            <h3>Stats Lab</h3>
            <p>Quick-hit analytics for the points race.</p>
          </div>
          <div class="stats-grid">
            ${totals
              .map((entry) => {
                return `
                  <div class="stat-row">
                    <div class="stat-head">
                      <div class="avatar ${entry.player.accent}">${entry.player.initials}</div>
                      <div>
                        <div class="stat-name">${entry.player.name}</div>
                        <div class="stat-sub">${entry.played} rounds · ${entry.threePointWeeks} top finishes</div>
                      </div>
                    </div>
                    <div class="stat-metrics">
                      <div class="metric">
                        <span>Avg</span>
                        <strong>${entry.average.toFixed(2)}</strong>
                      </div>
                      <div class="metric">
                        <span>Consistency</span>
                        <strong>${entry.consistency.toFixed(2)}</strong>
                      </div>
                    </div>
                  </div>
                `
              })
              .join('')}
          </div>
          <div class="stat-footer">
            Consistency reflects variation in weekly points (lower is steadier).
          </div>
        </div>
      </section>

      <section class="section">
        <div class="section-title">
          <h2>League Notes</h2>
          <p>Call out vibes, rivalries, or any rules tweaks here.</p>
        </div>
        <div class="notes">
          <div class="note-card">
            <h4>Game Types Rotation</h4>
            <p>Mix stroke play, match, scramble, skins, and Stableford to keep the energy fresh.</p>
          </div>
          <div class="note-card">
            <h4>Weekly Ritual</h4>
            <p>Confirm the format by Tuesday, then post points and a highlight right after the round.</p>
          </div>
          <div class="note-card">
            <h4>Season Closer</h4>
            <p>Finale week can be double points or a playoff matchup to settle the crown.</p>
          </div>
        </div>
      </section>
    </div>
  `
}
