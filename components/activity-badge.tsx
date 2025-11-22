'use client'

import { Badge } from '@/components/ui/badge'
import { activityNames } from '@/lib/cash-flow-config'

type ActivityBadgeProps = {
  activity?: 'operating' | 'investing' | 'financing' | null
  className?: string
}

export function ActivityBadge({ activity, className }: ActivityBadgeProps) {
  if (!activity) {
    return <Badge variant="outline" className={className}>未分类</Badge>
  }

  const variants = {
    operating: 'default',
    investing: 'secondary',
    financing: 'outline'
  } as const

  const colors = {
    operating: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
    investing: 'bg-green-100 text-green-800 hover:bg-green-100',
    financing: 'bg-orange-100 text-orange-800 hover:bg-orange-100'
  }

  return (
    <Badge
      variant={variants[activity]}
      className={`${colors[activity]} ${className}`}
    >
      {activityNames[activity]}
    </Badge>
  )
}
