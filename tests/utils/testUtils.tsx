import React, { ReactElement } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'

// Mock AuthContext for tests
const MockAuthProvider = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>
}

interface AllTheProvidersProps {
  children: React.ReactNode
}

const AllTheProviders = ({ children }: AllTheProvidersProps) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  })

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <MockAuthProvider>
          {children}
        </MockAuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) => render(ui, { wrapper: AllTheProviders, ...options })

export * from '@testing-library/react'
export { customRender as render }

// Test utilities for time/dates
export const mockCurrentDate = (dateString: string) => {
  const mockDate = new Date(dateString)
  vi.spyOn(Date, 'now').mockReturnValue(mockDate.getTime())
  vi.spyOn(global, 'Date').mockImplementation(() => mockDate)
  return mockDate
}

export const resetDateMocks = () => {
  vi.restoreAllMocks()
}

// Test utilities for DOM testing
export const waitForLoadingToFinish = async () => {
  await new Promise(resolve => setTimeout(resolve, 0))
}

// Custom matchers for nutrition testing
export const expectNutritionValues = (actual: any, expected: any, tolerance = 0.1) => {
  expect(actual.kcal).toBeCloseTo(expected.kcal, 0)
  expect(actual.białko).toBeCloseTo(expected.białko, 1)
  expect(actual.tłuszcz).toBeCloseTo(expected.tłuszcz, 1)
  expect(actual.węglowodany).toBeCloseTo(expected.węglowodany, 1)
  if (expected.błonnik !== undefined) {
    expect(actual.błonnik).toBeCloseTo(expected.błonnik, 1)
  }
}