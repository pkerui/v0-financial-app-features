'use client'

import { useState, useEffect } from 'react'
import { Store } from '@/lib/api/stores'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'

interface StoreSelectorProps {
  stores: Store[]
  value?: string
  onChange: (storeId: string) => void
  label?: string
  placeholder?: string
  includeAllOption?: boolean
  required?: boolean
  className?: string
}

export function StoreSelector({
  stores,
  value,
  onChange,
  label = '选择店铺',
  placeholder = '请选择店铺',
  includeAllOption = false,
  required = false,
  className,
}: StoreSelectorProps) {
  const [selectedStore, setSelectedStore] = useState<string | undefined>(value)

  useEffect(() => {
    setSelectedStore(value)
  }, [value])

  const handleValueChange = (newValue: string) => {
    setSelectedStore(newValue)
    onChange(newValue)
  }

  // Filter only active stores
  const activeStores = stores.filter((store) => store.status === 'active')

  return (
    <div className={className}>
      {label && (
        <Label className="mb-2 block">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      <Select value={selectedStore} onValueChange={handleValueChange}>
        <SelectTrigger>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {includeAllOption && (
            <SelectItem value="all">全部店铺</SelectItem>
          )}
          {activeStores.length === 0 ? (
            <SelectItem value="none" disabled>
              暂无活跃店铺
            </SelectItem>
          ) : (
            activeStores.map((store) => (
              <SelectItem key={store.id} value={store.id}>
                {store.code ? `${store.code} - ${store.name}` : store.name}
                {store.city && (
                  <span className="text-gray-500 text-xs ml-2">
                    ({store.city})
                  </span>
                )}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  )
}

/**
 * Compact version for use in headers/toolbars
 */
export function StoreCompactSelector({
  stores,
  value,
  onChange,
  includeAllOption = true,
}: Omit<StoreSelectorProps, 'label' | 'placeholder' | 'required' | 'className'>) {
  const activeStores = stores.filter((store) => store.status === 'active')

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-[200px]">
        <SelectValue placeholder="选择店铺" />
      </SelectTrigger>
      <SelectContent>
        {includeAllOption && (
          <SelectItem value="all">
            <span className="font-semibold">全部店铺</span>
          </SelectItem>
        )}
        {activeStores.map((store) => (
          <SelectItem key={store.id} value={store.id}>
            {store.code ? `${store.code} - ${store.name}` : store.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
