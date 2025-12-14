import { NextResponse } from 'next/server'

export async function GET() {
  const steps: { step: string; ok: boolean; error?: string }[] = []

  // Step 1: Import detector
  try {
    const { detectBackend } = await import('@/lib/backend/detector')
    const backend = detectBackend()
    steps.push({ step: 'detectBackend', ok: true })
  } catch (e: any) {
    steps.push({ step: 'detectBackend', ok: false, error: e?.message })
  }

  // Step 2: Import checkSystemHasUsers
  try {
    const { checkSystemHasUsers } = await import('@/lib/backend/auth')
    steps.push({ step: 'import checkSystemHasUsers', ok: true })
  } catch (e: any) {
    steps.push({ step: 'import checkSystemHasUsers', ok: false, error: e?.message })
  }

  // Step 3: Call checkSystemHasUsers
  try {
    const { checkSystemHasUsers } = await import('@/lib/backend/auth')
    const hasUsers = await checkSystemHasUsers()
    steps.push({ step: 'call checkSystemHasUsers', ok: true })
  } catch (e: any) {
    steps.push({ step: 'call checkSystemHasUsers', ok: false, error: e?.message })
  }

  // Step 4: Import MobileLoginForm
  try {
    const { MobileLoginForm } = await import('@/components/mobile/pages/login-page')
    steps.push({ step: 'import MobileLoginForm', ok: true })
  } catch (e: any) {
    steps.push({ step: 'import MobileLoginForm', ok: false, error: e?.message })
  }

  // Step 5: Import MobileRegisterOwnerForm
  try {
    const { MobileRegisterOwnerForm } = await import('@/components/mobile/pages/register-owner-page')
    steps.push({ step: 'import MobileRegisterOwnerForm', ok: true })
  } catch (e: any) {
    steps.push({ step: 'import MobileRegisterOwnerForm', ok: false, error: e?.message })
  }

  return NextResponse.json({
    steps,
    allOk: steps.every(s => s.ok),
  })
}
