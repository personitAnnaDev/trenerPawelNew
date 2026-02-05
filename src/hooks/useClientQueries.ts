import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getClientById, updateClient, getDietSnapshots, restoreImportantNotesSnapshot, restoreDietSnapshot } from '@/utils/clientStorage';
import type { Client, DietSnapshot } from '@/utils/clientStorage';
import { logger } from '@/utils/logger';

// Query Keys
export const clientKeys = {
  all: ['clients'] as const,
  detail: (id: string) => [...clientKeys.all, 'detail', id] as const,
  snapshots: (clientId: string) => ['snapshots', clientId] as const,
};

// Client Detail Query
export function useClient(clientId: string) {
  return useQuery({
    queryKey: clientKeys.detail(clientId),
    queryFn: () => getClientById(clientId),
    enabled: !!clientId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

// Client Update Mutation
export function useUpdateClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Client> }) =>
      updateClient(id, updates),
    onSuccess: (updatedClient, { id }) => {
      // Update the cache with new client data
      queryClient.setQueryData(clientKeys.detail(id), updatedClient);
    },
    onError: (error) => {
      logger.error('Client update failed:', error);
    },
  });
}

// Snapshots Query
export function useSnapshots(clientId: string, limit = 20) {
  return useQuery({
    queryKey: clientKeys.snapshots(clientId),
    queryFn: () => getDietSnapshots(clientId, { limit }),
    enabled: !!clientId,
    staleTime: 1000 * 30, // 30 seconds (snapshots change frequently)
  });
}

// Restore Important Notes Mutation
export function useRestoreImportantNotes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (snapshotId: string) => restoreImportantNotesSnapshot(snapshotId),
    onSuccess: (_, snapshotId) => {
      // Find which client this snapshot belongs to by checking all snapshot caches
      const queryCache = queryClient.getQueryCache();
      const snapshotQueries = queryCache.findAll({
        queryKey: ['snapshots'],
      });

      for (const query of snapshotQueries) {
        const snapshots = query.state.data as DietSnapshot[] | undefined;
        if (snapshots) {
          const snapshot = snapshots.find(s => s.id === snapshotId);
          if (snapshot) {
            // Invalidate client data for this specific client
            queryClient.invalidateQueries({
              queryKey: clientKeys.detail(snapshot.client_id),
            });
            // Refresh snapshots to show updated order
            queryClient.invalidateQueries({
              queryKey: clientKeys.snapshots(snapshot.client_id),
            });
            break;
          }
        }
      }
    },
  });
}

// Restore Diet Snapshot Mutation
export function useRestoreDietSnapshot() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (snapshotId: string) => restoreDietSnapshot(snapshotId),
    onSuccess: (_, snapshotId) => {
      // Find which client this snapshot belongs to
      const queryCache = queryClient.getQueryCache();
      const snapshotQueries = queryCache.findAll({
        queryKey: ['snapshots'],
      });

      for (const query of snapshotQueries) {
        const snapshots = query.state.data as DietSnapshot[] | undefined;
        if (snapshots) {
          const snapshot = snapshots.find(s => s.id === snapshotId);
          if (snapshot) {
            // Invalidate all related data for this client
            queryClient.invalidateQueries({
              queryKey: clientKeys.detail(snapshot.client_id),
            });
            queryClient.invalidateQueries({
              queryKey: clientKeys.snapshots(snapshot.client_id),
            });
            // Also invalidate diet plans (if we have queries for them)
            queryClient.invalidateQueries({
              queryKey: ['diet-plans', snapshot.client_id],
            });
            break;
          }
        }
      }
    },
  });
}

// Refresh snapshots manually
export function useRefreshSnapshots() {
  const queryClient = useQueryClient();

  return (clientId: string) => {
    queryClient.invalidateQueries({
      queryKey: clientKeys.snapshots(clientId),
    });
  };
}