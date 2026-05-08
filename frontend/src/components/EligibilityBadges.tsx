import type { TractEligibility } from '../types'

interface EligibilityBadgesProps {
  eligibility: TractEligibility | null
}

interface Badge {
  key: keyof TractEligibility
  label: string
  shortLabel: string
  color: string
  bgColor: string
}

const badges: Badge[] = [
  {
    key: 'opportunity_zone',
    label: 'Opportunity Zone',
    shortLabel: 'OZ',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-400/10 border-emerald-400/30',
  },
  {
    key: 'empowerment_zone',
    label: 'Empowerment Zone',
    shortLabel: 'EZ',
    color: 'text-blue-400',
    bgColor: 'bg-blue-400/10 border-blue-400/30',
  },
  {
    key: 'hub_zone',
    label: 'HUBZone',
    shortLabel: 'HUB',
    color: 'text-amber-400',
    bgColor: 'bg-amber-400/10 border-amber-400/30',
  },
  {
    key: 'promise_zone',
    label: 'Promise Zone',
    shortLabel: 'PZ',
    color: 'text-purple-400',
    bgColor: 'bg-purple-400/10 border-purple-400/30',
  },
  {
    key: 'new_market_tax_credit',
    label: 'New Market Tax Credit',
    shortLabel: 'NMTC',
    color: 'text-rose-400',
    bgColor: 'bg-rose-400/10 border-rose-400/30',
  },
  {
    key: 'state_enterprise_zone',
    label: 'State Enterprise Zone',
    shortLabel: 'SEZ',
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-400/10 border-cyan-400/30',
  },
]

export default function EligibilityBadges({ eligibility }: EligibilityBadgesProps) {
  if (!eligibility) return null

  const activeBadges = badges.filter((badge) => eligibility[badge.key] === true)

  if (activeBadges.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5">
      {activeBadges.map((badge) => (
        <span
          key={badge.key}
          className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border ${badge.bgColor} ${badge.color}`}
          title={badge.label}
        >
          {badge.shortLabel}
        </span>
      ))}
    </div>
  )
}
