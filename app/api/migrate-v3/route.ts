import { getDb } from '@/lib/db';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST() {
  try {
    const sql = getDb();

    await sql`
      CREATE TABLE IF NOT EXISTS depenses_fonctionnement (
        id          SERIAL PRIMARY KEY,
        action_id   INTEGER NOT NULL REFERENCES actions(id) ON DELETE CASCADE,
        libelle     VARCHAR(255) NOT NULL,
        code_compte VARCHAR(10)  NOT NULL DEFAULT '',
        montant     NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (montant >= 0),
        created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_df_action ON depenses_fonctionnement(action_id)
    `;

    return NextResponse.json({ ok: true, message: 'Migration v3 : table depenses_fonctionnement créée.' }, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
