import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, User, Calendar, FileText, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getClients, updateClient, Client } from "@/utils/clientStorage";
import { useModalConfirmation } from "@/hooks/useModalConfirmation";
import { logger } from '@/utils/logger';

interface ClientAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  templateId: string;
  templateTitle: string;
  onAssignmentComplete?: (client: Client) => void;
  onSnapshotRefresh?: () => Promise<void>; // 🎯 NEW: Refresh snapshots after template application
}

const ClientAssignmentModal = ({ isOpen, onClose, templateId, templateTitle, onAssignmentComplete, onSnapshotRefresh }: ClientAssignmentModalProps) => {
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const [applyProgress, setApplyProgress] = useState('');
  const { toast } = useToast();

  // 🔒 PROTECTION: Prevent multiple simultaneous template applications
  const operationInProgress = useRef(false);
  const lastOperationTime = useRef(0);
  const DEBOUNCE_DELAY = 1000; // 1s delay between template applications (longer than undo/redo)

  // Function to check if there are unsaved changes
  const hasUnsavedChanges = useCallback(() => {
    return true; // Always require confirmation
  }, []);

  // Confirmation modal hook
  const { handleClose: handleConfirmationClose, confirmationDialog } = useModalConfirmation({
    title: "Zamknąć przypisywanie klienta?",
    message: "Czy na pewno chcesz zamknąć okno przypisywania klienta do szablonu?",
    hasUnsavedChanges,
    onDiscard: () => {
      // Reset state and close modal
      setSelectedClient(null);
      setSearchTerm("");
      setClients([]);
      setFilteredClients([]);
      setIsApplying(false);
      setApplyProgress('');
      onClose();
    }
  });

  useEffect(() => {
    if (isOpen) {
      loadClients();
    }
  }, [isOpen]);

  useEffect(() => {
    if (searchTerm.trim() === "") {
      setFilteredClients(clients);
    } else {
      const filtered = clients.filter(client => {
        const fullName = `${client.imie} ${client.nazwisko}`.toLowerCase();
        return fullName.includes(searchTerm.toLowerCase());
      });
      setFilteredClients(filtered);
    }
  }, [searchTerm, clients]);

  const loadClients = async () => {
    const allClients = await getClients();
    setClients(allClients);
    setFilteredClients(allClients);
  };

  // 🔒 PROTECTION: Check if template application can proceed
  const canProceedWithOperation = useCallback(() => {
    const now = Date.now();

    // Check if operation is already in progress
    if (operationInProgress.current) {
      logger.log('🚫 TEMPLATE APPLICATION BLOCKED: Operation already in progress');
      return false;
    }

    // Check debounce delay
    if (now - lastOperationTime.current < DEBOUNCE_DELAY) {
      logger.log('🚫 TEMPLATE APPLICATION BLOCKED: Too fast (debounce protection)');
      toast({
        title: "Zbyt szybko",
        description: "Poczekaj chwilę przed ponownym zastosowaniem szablonu",
        variant: "destructive",
      });
      return false;
    }

    return true;
  }, [toast]);

  // 🔒 PROTECTION: Start operation with toast management
  const startProtectedOperation = useCallback(() => {
    operationInProgress.current = true;
    lastOperationTime.current = Date.now();
    logger.log('🔒 TEMPLATE APPLICATION STARTED');

    // 🔔 UX: Show toast for slow operations (>2000ms)
    const slowOperationTimer = setTimeout(() => {
      if (operationInProgress.current) {
        const toastResult = toast({
          title: 'Stosowanie szablonu...',
          description: 'Operacja trwa dłużej niż zwykle',
          variant: 'default',
        });
        // Store toast dismiss function for cleanup
        (operationInProgress as any).activeToastDismiss = toastResult.dismiss;
      }
    }, 2000);

    // Store timer reference for cleanup
    (operationInProgress as any).slowOperationTimer = slowOperationTimer;
  }, [toast]);

  // 🔒 PROTECTION: End operation with toast cleanup
  const endProtectedOperation = useCallback((success: boolean) => {
    const operationDuration = Date.now() - lastOperationTime.current;

    // Clear slow operation timer
    if ((operationInProgress as any).slowOperationTimer) {
      clearTimeout((operationInProgress as any).slowOperationTimer);
      (operationInProgress as any).slowOperationTimer = null;
    }

    // 🎯 AUTO-HIDE: Dismiss active loading toast when operation completes
    if ((operationInProgress as any).activeToastDismiss) {
      (operationInProgress as any).activeToastDismiss();
      (operationInProgress as any).activeToastDismiss = null;
    }

    operationInProgress.current = false;
    logger.log('🔓 TEMPLATE APPLICATION COMPLETED:', { success, duration: operationDuration });
  }, []);

  const handleAssignTemplate = () => {
    if (!selectedClient || isApplying) return;

    // 🔒 PROTECTION: Check if operation can proceed
    if (!canProceedWithOperation()) {
      return;
    }

    (async () => {
      // 🔍 CONFLICT DETECTION: Check if client was modified recently
      try {
        const { getClientById } = await import("@/utils/clientStorage");
        const currentClient = await getClientById(selectedClient.id);

        if (currentClient) {
          const clientModifiedTime = new Date(currentClient.createdAt).getTime();
          const timeSinceModification = Date.now() - clientModifiedTime;

          // If client was modified in last 30 seconds, warn user
          if (timeSinceModification < 30000) {
            const userConfirmed = window.confirm(
              `⚠️ Potencjalny konflikt:\n\nKlient "${selectedClient.imie} ${selectedClient.nazwisko}" był niedawno modyfikowany (${Math.round(timeSinceModification / 1000)}s temu).\n\nMożliwe że ktoś inny pracuje z tym klientem w innej karcie.\n\nCzy chcesz kontynuować zastosowanie szablonu?`
            );

            if (!userConfirmed) {
              toast({
                title: "Anulowano",
                description: "Zastosowanie szablonu zostało anulowane dla bezpieczeństwa",
                variant: "default",
              });
              return;
            }
          }
        }
      } catch (error) {
        logger.warn('🟡 CONFLICT DETECTION: Could not check client modification time:', error);
        // Continue with template application even if conflict detection fails
      }
      setIsApplying(true);
      setApplyProgress('Przygotowywanie...');

      // 🔒 PROTECTION: Start protected operation
      startProtectedOperation();

      let success = false;
      try {
        // Import funkcji do kopiowania szablonu
        setApplyProgress('Ładowanie funkcji...');
        const { applyTemplateToClient } = await import("@/utils/clientStorage");

        // Zastosuj szablon do klienta (kopiuje dane zamiast tylko przypisywać ID)
        setApplyProgress('Kopiowanie szablonu...');
        await new Promise(resolve => setTimeout(resolve, 200)); // Krótki delay dla UX

        success = await applyTemplateToClient(selectedClient.id, templateId);

        if (success) {
          setApplyProgress('Finalizowanie...');
          await new Promise(resolve => setTimeout(resolve, 300));

          toast({
            title: "Sukces",
            description: `Szablon "${templateTitle}" został zastosowany do klienta ${selectedClient.imie} ${selectedClient.nazwisko}. Jadłospis został zaktualizowany.`,
            duration: 3000, // Auto-hide after 3 seconds
          });

          if (onAssignmentComplete) {
            // Pobierz zaktualizowane dane klienta
            setApplyProgress('Aktualizowanie danych...');
            const { getClientById } = await import("@/utils/clientStorage");
            const updatedClient = await getClientById(selectedClient.id);
            if (updatedClient) {
              onAssignmentComplete(updatedClient);
            }
          }

          setApplyProgress('Gotowe!');
          await new Promise(resolve => setTimeout(resolve, 500));

          // 🎯 NEW: Refresh snapshots after successful template application
          if (onSnapshotRefresh) {
            setApplyProgress('Odświeżanie historii...');
            await onSnapshotRefresh();
          }

          handleConfirmationClose(true); // Force close after successful assignment
          setSelectedClient(null);
          setSearchTerm("");
        } else {
          throw new Error("Operacja zastosowania szablonu nie powiodła się");
        }
      } catch (error) {
        logger.error("Błąd podczas stosowania szablonu:", error);
        toast({
          title: "Błąd",
          description: "Nie udało się zastosować szablonu do klienta. Spróbuj ponownie.",
          variant: "destructive"
        });
      } finally {
        setIsApplying(false);
        setApplyProgress('');
        // 🔒 PROTECTION: End protected operation
        endProtectedOperation(success);
      }
    })();
  };

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "aktywny":
        return "bg-green-600/20 text-green-300 border-green-600/30";
      case "nieaktywny":
        return "bg-red-600/20 text-red-300 border-red-600/30";
      case "zakończony":
        return "bg-gray-600/20 text-gray-300 border-gray-600/30";
      default:
        return "bg-blue-600/20 text-blue-300 border-blue-600/30";
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleConfirmationClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto border border-zinc-700 bg-zinc-900">
        <DialogHeader>
          <DialogTitle className="text-zinc-100 text-xl font-bold">
            Przypisz klienta do szablonu: {templateTitle}
          </DialogTitle>
          <DialogDescription className="text-zinc-300">
            Wybierz klienta z listy poniżej, aby przypisać mu wybrany szablon jadłospisu.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-400 h-5 w-5" />
            <Input
              id="client-search"
              name="client-search"
              aria-label="Szukaj klienta po imieniu i nazwisku"
              placeholder="Szukaj klienta po imieniu i nazwisku..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 border border-zinc-700 focus:ring-[#a08032] focus:border-[#a08032] bg-zinc-800 text-zinc-100 placeholder-zinc-400"
            />
          </div>

          {/* Client list */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredClients.map((client) => (
              <Card 
                key={client.id} 
                className={`cursor-pointer transition-colors ${
                  selectedClient?.id === client.id 
                    ? 'bg-[#a08032]/20 border-[#a08032]' 
                    : 'bg-zinc-800 border-zinc-600 hover:bg-zinc-700'
                }`}
                onClick={() => setSelectedClient(client)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-zinc-700 rounded-full flex items-center justify-center">
                        <User className="h-6 w-6 text-zinc-400" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-zinc-100">
                          {client.imie} {client.nazwisko}
                        </h3>
                        <div className="flex items-center gap-4 text-sm text-zinc-400 mt-1">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {calculateAge(client.dataUrodzenia)} lat
                          </div>
                          <div className="flex items-center gap-1">
                            <FileText className="h-4 w-4" />
                            {client.obecnyProces || "Brak procesu"}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge className={`${getStatusBadgeColor(client.statusWspolpracy)} border`}>
                        {client.statusWspolpracy}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {filteredClients.length === 0 && (
              <div className="text-center py-8 text-zinc-400">
                {searchTerm ? "Nie znaleziono klientów spełniających kryteria wyszukiwania." : "Brak klientów w systemie."}
              </div>
            )}
          </div>

          {/* Selected client info */}
          {selectedClient && (
            <Card className="bg-zinc-800 border-[#a08032]">
              <CardContent className="p-4">
                <h4 className="font-semibold text-zinc-100 mb-2">Wybrany klient:</h4>
                <div className="text-zinc-300">
                  <p><strong>Imię i nazwisko:</strong> {selectedClient.imie} {selectedClient.nazwisko}</p>
                  <p><strong>Wiek:</strong> {calculateAge(selectedClient.dataUrodzenia)} lat</p>
                  <p><strong>Status współpracy:</strong> {selectedClient.statusWspolpracy}</p>
                  {selectedClient.obecnyProces && (
                    <p><strong>Obecny proces:</strong> {selectedClient.obecnyProces}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Progress indicator */}
          {isApplying && applyProgress && (
            <Card className="bg-zinc-800 border-[#a08032]">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 text-[#a08032] animate-spin" />
                  <div>
                    <h4 className="font-semibold text-zinc-100">Stosowanie szablonu...</h4>
                    <p className="text-zinc-300 text-sm">{applyProgress}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>


        <div className="flex justify-end gap-3 pt-4">
          <Button
            variant="outline"
            onClick={handleConfirmationClose}
            disabled={isApplying}
            className="bg-zinc-700 border-zinc-600 text-zinc-100 hover:bg-zinc-600 disabled:opacity-50"
          >
            Anuluj
          </Button>
          <Button
            onClick={handleAssignTemplate}
            disabled={!selectedClient || isApplying}
            className="bg-gradient-to-r from-[#a08032] to-[#e6d280] text-white hover:from-[#8a6c2b] hover:to-[#d4c06b] disabled:opacity-50 min-w-[140px]"
          >
            {isApplying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Stosowanie...
              </>
            ) : (
              'Zastosuj szablon'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
    {confirmationDialog}
    </>
  );
};

export default ClientAssignmentModal;
