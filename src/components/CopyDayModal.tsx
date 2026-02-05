import { useState, useCallback, useEffect, useRef } from 'react'
import { logger } from '@/utils/logger'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useModalConfirmation } from '@/hooks/useModalConfirmation'
import { DayPlan } from '@/types/meal'

export interface CopyDayOptions {
  mode: 'new' | 'existing'
  newDayName?: string // dla mode='new'
  targetDayId?: string // dla mode='existing'
  replaceMeals?: boolean // true=zastąp, false=dołącz
  replaceTargets?: boolean
  editedDayName?: string // dla mode='existing'
}

interface CopyDayModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (options: CopyDayOptions) => Promise<void>
  sourceDayPlan: DayPlan | null
  availableDays: DayPlan[] // Lista dni do wyboru (bez źródłowego)
  isTemplate?: boolean // true = szablon (bez makr), false = klient (z makrami)
}

const PROGRESS_BAR_THRESHOLD = 10 // Show progress bar for days with >10 meals

/**
 * Modal for pasting copied day with two modes:
 * 1. NEW: Copy to new day (existing behavior)
 * 2. EXISTING: Copy to existing day with options (replace/append meals, replace/keep targets, edit name)
 *
 * Features:
 * - Radio buttons for mode selection
 * - Conditional UI based on mode
 * - Progress bar for large days (>10 meals)
 * - Confirmation dialog when closing without saving
 * - Async save handling with loading state
 */
export const CopyDayModal = ({
  isOpen,
  onClose,
  onConfirm,
  sourceDayPlan,
  availableDays,
  isTemplate = false, // Default: klient (z makrami)
}: CopyDayModalProps) => {
  // Mode selection: 'new' or 'existing'
  const [mode, setMode] = useState<'new' | 'existing'>('new')

  // NEW mode state
  const [newDayName, setNewDayName] = useState('')

  // EXISTING mode state
  const [targetDayId, setTargetDayId] = useState<string>('')
  const [replaceMeals, setReplaceMeals] = useState(true) // Default: replace
  const [replaceTargets, setReplaceTargets] = useState(true) // Default: replace
  const [editedDayName, setEditedDayName] = useState('')

  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)

  // Empty day confirmation modal state
  const [showEmptyDayConfirmation, setShowEmptyDayConfirmation] = useState(false)
  const [pendingOptions, setPendingOptions] = useState<CopyDayOptions | null>(null)

  // Track previous isOpen state to detect modal opening
  const prevIsOpenRef = useRef(false)

  // Initialize state ONLY when modal opens (closed → open transition)
  useEffect(() => {
    // Only run when modal transitions from closed (false) to open (true)
    if (isOpen && !prevIsOpenRef.current && sourceDayPlan) {
      logger.debug('CopyDayModal: Initializing state (modal opened)')

      // Reset to NEW mode by default
      setMode('new')
      setNewDayName(`${sourceDayPlan.name} (kopia)`)

      // Reset EXISTING mode state
      setTargetDayId(availableDays.length > 0 ? availableDays[0].id : '')
      setReplaceMeals(true)
      setReplaceTargets(true)
      setEditedDayName(availableDays.length > 0 ? availableDays[0].name : '')
    }

    // Update previous state
    prevIsOpenRef.current = isOpen
  }, [isOpen, sourceDayPlan, availableDays])

  // Update editedDayName when targetDayId changes
  useEffect(() => {
    if (mode === 'existing' && targetDayId) {
      const targetDay = availableDays.find((d) => d.id === targetDayId)
      if (targetDay) {
        setEditedDayName(targetDay.name)
      }
    }
  }, [targetDayId, availableDays, mode])

  // Function to check if there are unsaved changes
  const hasUnsavedChanges = useCallback(() => {
    if (mode === 'new') {
      return newDayName.trim() !== ''
    } else {
      return targetDayId !== ''
    }
  }, [mode, newDayName, targetDayId])

  // Confirmation modal hook
  const { handleClose: handleConfirmationClose, confirmationDialog } =
    useModalConfirmation({
      title: 'Zamknąć kopiowanie dnia?',
      message: 'Czy na pewno chcesz zamknąć okno? Dzień nie zostanie skopiowany.',
      hasUnsavedChanges,
      onDiscard: () => {
        setNewDayName('')
        setTargetDayId('')
        setEditedDayName('')
        setProgress(0)
        onClose()
      },
    })

  const showProgressBar =
    sourceDayPlan && sourceDayPlan.meals.length > PROGRESS_BAR_THRESHOLD

  const handleConfirm = async () => {
    // Validation
    if (mode === 'new' && !newDayName.trim()) return
    if (mode === 'existing' && !targetDayId.trim()) return

    setIsLoading(true)
    setProgress(0)

    try {
      // Prepare options based on mode
      const options: CopyDayOptions =
        mode === 'new'
          ? {
              mode: 'new',
              newDayName: newDayName.trim(),
            }
          : {
              mode: 'existing',
              targetDayId: targetDayId!,
              replaceMeals,
              // replaceTargets only for clients (not templates)
              replaceTargets: isTemplate ? false : replaceTargets,
              editedDayName: editedDayName.trim(),
            }

      // Check if source day is empty AND mode is 'existing' with replace
      if (
        sourceDayPlan &&
        sourceDayPlan.meals.length === 0 &&
        mode === 'existing' &&
        replaceMeals
      ) {
        logger.debug('CopyDayModal: Empty day detected, showing confirmation')
        // Store options and show confirmation modal
        setPendingOptions(options)
        setShowEmptyDayConfirmation(true)
        setIsLoading(false) // Reset loading state
        return // Stop here, wait for user confirmation
      }

      // Simulate progress for large day plans (>10 meals)
      if (showProgressBar && sourceDayPlan) {
        const progressInterval = setInterval(() => {
          setProgress((prev) => {
            if (prev >= 90) {
              clearInterval(progressInterval)
              return 90
            }
            return prev + 10
          })
        }, 100)

        await onConfirm(options)
        clearInterval(progressInterval)
        setProgress(100)
      } else {
        await onConfirm(options)
      }

      // Reset state and close after successful save
      setNewDayName('')
      setTargetDayId('')
      setEditedDayName('')
      setProgress(0)
      handleConfirmationClose(true) // Force close after successful save
    } catch (error) {
      logger.error('Error pasting day:', error)
      setProgress(0)
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirmEmptyDay = async () => {
    logger.debug('CopyDayModal: User confirmed empty day copy')
    setShowEmptyDayConfirmation(false)

    if (!pendingOptions) {
      logger.error('CopyDayModal: No pending options found')
      return
    }

    setIsLoading(true)
    setProgress(0)

    try {
      // Execute the pending action
      if (showProgressBar && sourceDayPlan) {
        const progressInterval = setInterval(() => {
          setProgress((prev) => {
            if (prev >= 90) {
              clearInterval(progressInterval)
              return 90
            }
            return prev + 10
          })
        }, 100)

        await onConfirm(pendingOptions)
        clearInterval(progressInterval)
        setProgress(100)
      } else {
        await onConfirm(pendingOptions)
      }

      // Reset state and close after successful save
      setNewDayName('')
      setTargetDayId('')
      setEditedDayName('')
      setProgress(0)
      setPendingOptions(null)
      handleConfirmationClose(true)
    } catch (error) {
      logger.error('Error pasting empty day:', error)
      setProgress(0)
    } finally {
      setIsLoading(false)
    }
  }

  const isConfirmDisabled =
    isLoading ||
    (mode === 'new' && !newDayName.trim()) ||
    (mode === 'existing' && !targetDayId.trim())

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleConfirmationClose}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Kopiuj dzień</DialogTitle>
            <DialogDescription>
              {sourceDayPlan && (
                <>
                  <span className="block text-sm text-gray-600">
                    Źródło: <strong>{sourceDayPlan.name}</strong> (
                    {sourceDayPlan.meals.length} posiłków)
                  </span>
                  {sourceDayPlan.meals.length === 0 && (
                    <span className="flex items-center gap-1 text-sm text-blue-500 mt-2">
                      <span>Pusty dzień - w trybie "Zastąp" wyczyści posiłki w docelowym dniu</span>
                    </span>
                  )}
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Mode selection: NEW vs EXISTING */}
            <RadioGroup
              value={mode}
              onValueChange={(value) => {
                logger.debug('CopyDayModal: Mode changed by user:', value)
                setMode(value as 'new' | 'existing')
              }}
              disabled={isLoading}
            >
              {/* Option 1: NEW day */}
              <div className="flex items-start space-x-2 rounded-lg p-3">
                <RadioGroupItem value="new" id="mode-new" className="mt-1" />
                <div className="flex-1 space-y-2">
                  <Label
                    htmlFor="mode-new"
                    className="font-medium cursor-pointer"
                  >
                    Kopiuj do nowego dnia
                  </Label>
                  {mode === 'new' && (
                    <Input
                      id="new-day-name"
                      name="new-day-name"
                      value={newDayName}
                      onChange={(e) => setNewDayName(e.target.value)}
                      placeholder="Wprowadź nazwę dnia"
                      className="mt-2"
                      maxLength={100}
                      autoFocus
                      disabled={isLoading}
                      aria-label="Nazwa nowego dnia"
                    />
                  )}
                </div>
              </div>

              {/* Option 2: EXISTING day */}
              <div className="flex items-start space-x-2 rounded-lg p-3">
                <RadioGroupItem
                  value="existing"
                  id="mode-existing"
                  className="mt-1"
                  disabled={availableDays.length === 0}
                />
                <div className="flex-1 space-y-3">
                  <Label
                    htmlFor="mode-existing"
                    className="font-medium cursor-pointer"
                  >
                    Kopiuj do istniejącego dnia
                  </Label>

                  {mode === 'existing' && (
                    <>
                      {availableDays.length === 0 ? (
                        <p className="text-sm text-gray-500">
                          Brak dostępnych dni do skopiowania.
                        </p>
                      ) : (
                        <>
                          {/* Target day dropdown */}
                          <Select
                            value={targetDayId}
                            onValueChange={setTargetDayId}
                            disabled={isLoading}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Wybierz dzień" />
                            </SelectTrigger>
                            <SelectContent>
                              {availableDays.map((day) => (
                                <SelectItem key={day.id} value={day.id}>
                                  {day.name} ({day.meals.length} posiłków)
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>

                          {/* Options checkboxes */}
                          <div className="space-y-2 pl-1">
                            <div className="flex items-center space-x-2">
                              <Checkbox
                                id="replace-meals"
                                checked={replaceMeals}
                                onCheckedChange={(checked) =>
                                  setReplaceMeals(checked === true)
                                }
                                disabled={isLoading}
                              />
                              <Label
                                htmlFor="replace-meals"
                                className="text-sm font-normal cursor-pointer"
                              >
                                Zastąp wszystkie posiłki
                                {!replaceMeals && (
                                  <span className="text-gray-500 ml-1">
                                    (dołącz na końcu)
                                  </span>
                                )}
                              </Label>
                            </div>

                            {/* Hide macro targets checkbox for templates */}
                            {!isTemplate && (
                              <div className="flex items-center space-x-2">
                                <Checkbox
                                  id="replace-targets"
                                  checked={replaceTargets}
                                  onCheckedChange={(checked) =>
                                    setReplaceTargets(checked === true)
                                  }
                                  disabled={isLoading}
                                />
                                <Label
                                  htmlFor="replace-targets"
                                  className="text-sm font-normal cursor-pointer"
                                >
                                  Zastąp cele makro
                                  {!replaceTargets && (
                                    <span className="text-gray-500 ml-1">
                                      (zachowaj)
                                    </span>
                                  )}
                                </Label>
                              </div>
                            )}
                          </div>

                          {/* Edited day name */}
                          <div className="space-y-1">
                            <Label
                              htmlFor="edited-day-name"
                              className="text-sm"
                            >
                              Nazwa dnia:
                            </Label>
                            <Input
                              id="edited-day-name"
                              name="edited-day-name"
                              value={editedDayName}
                              onChange={(e) => setEditedDayName(e.target.value)}
                              placeholder="Wprowadź nazwę dnia"
                              maxLength={100}
                              disabled={isLoading}
                            />
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            </RadioGroup>

            {/* Progress bar - visible only for days with >10 meals */}
            {showProgressBar && isLoading && (
              <div className="grid gap-2">
                <Label className="text-sm text-gray-600">
                  Kopiowanie {sourceDayPlan.meals.length} posiłków...
                </Label>
                <Progress value={progress} className="h-2" />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleConfirmationClose()}
              disabled={isLoading}
            >
              Anuluj
            </Button>
            <Button onClick={handleConfirm} disabled={isConfirmDisabled}>
              {isLoading ? 'Kopiowanie...' : 'Kopiuj dzień'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {confirmationDialog}

      {/* Empty day confirmation AlertDialog */}
      <AlertDialog
        open={showEmptyDayConfirmation}
        onOpenChange={setShowEmptyDayConfirmation}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Uwaga! Kopiujesz pusty dzień</AlertDialogTitle>
            <AlertDialogDescription>
              Źródłowy dzień <strong>"{sourceDayPlan?.name}"</strong> nie
              zawiera żadnych posiłków (0 posiłków).
              <br />
              <br />W trybie "Zastąp wszystkie posiłki" spowoduje to{' '}
              <strong className="text-red-500">
                wyczyszczenie wszystkich posiłków
              </strong>{' '}
              w docelowym dniu.
              <br />
              <br />
              Czy na pewno chcesz kontynuować?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowEmptyDayConfirmation(false)}>
              Anuluj
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmEmptyDay}>
              Tak, wyczyść posiłki
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
