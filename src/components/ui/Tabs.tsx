'use client'

import { useState, useContext, createContext, ReactNode, SetStateAction, Dispatch } from 'react'
import { cn } from '@/utils/helpers'

interface TabsProps<T extends string = string> {
  children: ReactNode
  defaultValue: T
  onChange?: (value: T) => void
  className?: string
}

interface TabsListProps {
  children: ReactNode
  className?: string
}

interface TabsTriggerProps<T extends string = string> {
  value: T
  children: ReactNode
  disabled?: boolean
  className?: string
}

interface TabsContentProps<T extends string = string> {
  value: T
  children: ReactNode
  className?: string
}

const TabsContext = createContext<{
  activeTab: string
  setActiveTab: Dispatch<SetStateAction<string>>
  onChange?: (value: string) => void
} | null>(null)

function useTabsContext() {
  const context = useContext(TabsContext)
  if (!context) {
    throw new Error('Tabs components must be used within Tabs')
  }
  return context
}

export function Tabs({ children, defaultValue, onChange, className }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultValue)

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab, onChange }}>
      <div className={cn(className)}>{children}</div>
    </TabsContext.Provider>
  )
}

export function TabsList({ children, className }: TabsListProps) {
  return (
    <div
      className={cn(
        'inline-flex h-10 items-center justify-center rounded-md bg-gray-100 p-1',
        className
      )}
      role="tablist"
    >
      {children}
    </div>
  )
}

export function TabsTrigger({ value, children, disabled, className }: TabsTriggerProps) {
  const { activeTab, setActiveTab, onChange } = useTabsContext()
  const isActive = activeTab === value

  return (
    <button
      role="tab"
      aria-selected={isActive}
      aria-disabled={disabled}
      disabled={disabled}
      onClick={() => {
        if (!disabled) {
          setActiveTab(value)
          onChange?.(value)
        }
      }}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
        isActive
          ? 'bg-white text-primary-600 shadow-sm'
          : 'text-gray-600 hover:text-gray-900',
        className
      )}
    >
      {children}
    </button>
  )
}

export function TabsContent({ value, children, className }: TabsContentProps) {
  const { activeTab } = useTabsContext()

  if (activeTab !== value) return null

  return (
    <div
      role="tabpanel"
      className={cn('mt-4 ring-offset-background focus:outline-none', className)}
    >
      {children}
    </div>
  )
}