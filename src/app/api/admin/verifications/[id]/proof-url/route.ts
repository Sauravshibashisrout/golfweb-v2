import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/rbac'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id } = await params
  const db = createAdminClient()

  const { data: verification, error: verifErr } = await db
    .from('winner_verifications')
    .select('id, proof_storage_path')
    .eq('id', id)
    .single()

  if (verifErr || !verification || !verification.proof_storage_path) {
    return NextResponse.json({ error: 'Proof not found or not yet uploaded' }, { status: 404 })
  }

  // Generate short-lived (15-minute) signed URL via service role
  const { data: signedData, error: signErr } = await db.storage
    .from('winner-proofs')
    .createSignedUrl(verification.proof_storage_path, 900)

  if (signErr || !signedData?.signedUrl) {
    return NextResponse.json({ error: 'Failed to generate signed proof URL' }, { status: 500 })
  }

  return NextResponse.json({ signedUrl: signedData.signedUrl })
}
