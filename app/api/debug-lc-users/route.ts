/**
 * Debug API to list LeanCloud users
 * This helps verify what username format is stored
 */

import { NextResponse } from 'next/server'
import { lcRequestWithMasterKey, config } from '@/lib/leancloud/init'

interface LCUserResponse {
  objectId: string
  username: string
  email?: string
  fullName?: string
  createdAt: string
}

export async function GET() {
  try {
    // Check if Master Key is configured
    if (!config.masterKey) {
      return NextResponse.json({
        success: false,
        error: 'Master Key not configured. Set LEANCLOUD_MASTER_KEY in .env.leancloud',
      }, { status: 500 })
    }

    // Query all users (limit 20) - using Master Key for permission
    const result = await lcRequestWithMasterKey<{ results: LCUserResponse[] }>(
      'GET',
      '/users?limit=20'
    )

    const users = result.results.map(user => ({
      id: user.objectId,
      username: user.username,
      email: user.email || null,
      fullName: user.fullName || null,
      createdAt: user.createdAt,
    }))

    return NextResponse.json({
      success: true,
      count: users.length,
      users,
      message: 'Check the username format - it should be {companyCode}_{username}',
    })
  } catch (error: any) {
    console.error('Error listing users:', error)
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to list users',
      code: error.code,
    }, { status: 500 })
  }
}
