'use client'

import { useState, useEffect } from 'react'
import { Store } from '@/lib/api/stores'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Badge } from '@/components/ui/badge'
import { ChevronDown, X } from 'lucide-react'

interface MultiStoreSelectorProps {
  stores: Store[]
  value: string[] // Array of selected store IDs
  onChange: (storeIds: string[]) => void
  label?: string
  placeholder?: string
  className?: string
  maxDisplay?: number // Maximum number of badges to display before showing "+N"
}

export function MultiStoreSelector({
  stores,
  value = [],
  onChange,
  label = '选择店铺',
  placeholder = '请选择店铺',
  className,
  maxDisplay = 3,
}: MultiStoreSelectorProps) {
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>(value)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setSelectedStoreIds(value)
  }, [value])

  // Filter only active stores
  const activeStores = stores.filter((store) => store.status === 'active')

  const handleToggleStore = (storeId: string) => {
    const newSelection = selectedStoreIds.includes(storeId)
      ? selectedStoreIds.filter((id) => id !== storeId)
      : [...selectedStoreIds, storeId]

    setSelectedStoreIds(newSelection)
    onChange(newSelection)
  }

  const handleSelectAll = () => {
    const allStoreIds = activeStores.map((store) => store.id)
    setSelectedStoreIds(allStoreIds)
    onChange(allStoreIds)
  }

  const handleClearAll = () => {
    setSelectedStoreIds([])
    onChange([])
  }

  const handleRemoveStore = (storeId: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const newSelection = selectedStoreIds.filter((id) => id !== storeId)
    setSelectedStoreIds(newSelection)
    onChange(newSelection)
  }

  // Get selected store names for display
  const selectedStores = activeStores.filter((store) =>
    selectedStoreIds.includes(store.id)
  )

  const displayText = () => {
    if (selectedStores.length === 0) {
      return placeholder
    }

    if (selectedStores.length === activeStores.length) {
      return `全部店铺 (${selectedStores.length})`
    }

    return `已选 ${selectedStores.length} 个店铺`
  }

  return (
    <div className={className}>
      {label && (
        <Label className="mb-2 block">
          {label}
        </Label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            <span className="truncate">{displayText()}</span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <div className="max-h-[300px] overflow-y-auto">
            {/* Action buttons */}
            <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSelectAll}
                className="h-8 text-xs"
              >
                全选
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="h-8 text-xs"
              >
                清空
              </Button>
            </div>

            {/* Store list */}
            <div className="p-2">
              {activeStores.length === 0 ? (
                <div className="px-3 py-2 text-sm text-muted-foreground">
                  暂无活跃店铺
                </div>
              ) : (
                activeStores.map((store) => (
                  <div
                    key={store.id}
                    className="flex items-center space-x-2 rounded-md px-3 py-2 hover:bg-accent cursor-pointer"
                    onClick={() => handleToggleStore(store.id)}
                  >
                    <Checkbox
                      checked={selectedStoreIds.includes(store.id)}
                      onCheckedChange={() => handleToggleStore(store.id)}
                    />
                    <div className="flex-1 text-sm">
                      <div className="font-medium">
                        {store.code ? `${store.code} - ${store.name}` : store.name}
                      </div>
                      {store.city && (
                        <div className="text-xs text-muted-foreground">
                          {store.city}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Selected stores badges */}
      {selectedStores.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {selectedStores.slice(0, maxDisplay).map((store) => (
            <Badge
              key={store.id}
              variant="secondary"
              className="gap-1 pr-1"
            >
              <span className="text-xs">
                {store.code || store.name}
              </span>
              <button
                onClick={(e) => handleRemoveStore(store.id, e)}
                className="hover:bg-muted rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {selectedStores.length > maxDisplay && (
            <Badge variant="secondary" className="text-xs">
              +{selectedStores.length - maxDisplay}
            </Badge>
          )}
        </div>
      )}
    </div>
  )
}
