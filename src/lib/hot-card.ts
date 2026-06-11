import type { Db } from '@/lib/db'

const ONE_WEEK_DAYS = 7
const EIGHT_WEEKS_DAYS = 56
const MIN_WEIGHT = 0.1
const DECAY_DAYS = EIGHT_WEEKS_DAYS - ONE_WEEK_DAYS

let schemaPromise: Promise<void> | null = null

export function entryHotScoreSql(alias = 'ec'): string {
  return `
    CASE
      WHEN ${alias}.clicked_at >= NOW() - INTERVAL '7 days' THEN 1.0
      WHEN ${alias}.clicked_at <= NOW() - INTERVAL '56 days' THEN ${MIN_WEIGHT}
      ELSE GREATEST(
        ${MIN_WEIGHT},
        1.0 - (
          ((EXTRACT(EPOCH FROM (NOW() - ${alias}.clicked_at)) / 86400.0) - ${ONE_WEEK_DAYS})
          * ((1.0 - ${MIN_WEIGHT}) / ${DECAY_DAYS})
        )
      )
    END
  `
}

export async function ensureEntryClickSchema(db: Db): Promise<void> {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      await db.query(`
        CREATE TABLE IF NOT EXISTS entry_clicks (
          id BIGSERIAL PRIMARY KEY,
          entry_id TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
          clicked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `)

      await db.query(`
        CREATE TABLE IF NOT EXISTS entry_click_windows (
          entry_id TEXT PRIMARY KEY REFERENCES entries(id) ON DELETE CASCADE,
          last_counted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `)

      await db.query(`
        CREATE INDEX IF NOT EXISTS idx_entry_clicks_entry_id_clicked_at
        ON entry_clicks(entry_id, clicked_at DESC)
      `)
    })().catch((err) => {
      schemaPromise = null
      throw err
    })
  }

  await schemaPromise
}
