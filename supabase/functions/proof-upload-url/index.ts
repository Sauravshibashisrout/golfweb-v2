import { requireActiveSub } from '../_shared/auth.ts'

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  let ctx
  try { ctx = await requireActiveSub(req) } catch (e) { return e as Response }

  const { winnerId, fileName, contentType } = await req.json()
  if (!winnerId || !fileName || !contentType) return new Response('Missing fields', { status: 400 })

  const db = ctx.adminClient
  const isSystemAdmin = ctx.role === 'admin'

  // Verify the caller owns the winner record (or is admin/system) and status is eligible (pending_proof or rejected)
  let winnerQuery = db
    .from('draw_winners')
    .select('id, user_id, status')
    .eq('id', winnerId)
    .in('status', ['pending_proof', 'rejected'])

  if (!isSystemAdmin) {
    winnerQuery = winnerQuery.eq('user_id', ctx.userId)
  }

  const { data: winner } = await winnerQuery.maybeSingle()

  if (!winner) return new Response('Not eligible for proof upload', { status: 403 })

  const cleanFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_')
  const path = `${winner.user_id}/${winnerId}/${Date.now()}_${cleanFileName}`

  const { data, error } = await db.storage
    .from('winner-proofs')
    .createSignedUploadUrl(path)

  if (error || !data) return new Response('Could not create upload URL', { status: 500 })

  return Response.json({ signedUrl: data.signedUrl, path })
})
