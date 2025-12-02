/**
 * AVATAR API Hooks
 *
 * React hooks for AVATAR REST API operations
 * Uses TanStack Query for caching, loading states, and error handling
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { avatarAPI } from '@/lib/api-client';
import type { VoiceProfile, Conversation, SystemHealth, VRAMStatus } from '@/lib/api-config';

// Query keys for cache management
export const QUERY_KEYS = {
  VOICE_PROFILES: ['voice-profiles'] as const,
  CONVERSATIONS: ['conversations'] as const,
  SYSTEM_HEALTH: ['system-health'] as const,
  VRAM_STATUS: ['vram-status'] as const,
  SESSION_STATUS: ['session-status'] as const
};

// Voice Profile hooks
export const useVoiceProfiles = () => {
  return useQuery({
    queryKey: QUERY_KEYS.VOICE_PROFILES,
    queryFn: () => avatarAPI.getVoiceProfiles(),
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 10000 // Consider stale after 10 seconds
  });
};

export const useUploadVoiceProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, audioFile }: { name: string; audioFile: File }) =>
      avatarAPI.uploadVoiceProfile(name, audioFile),
    onSuccess: () => {
      // Invalidate voice profiles query to refresh the list
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.VOICE_PROFILES });
    },
    onError: (error) => {
      console.error('Voice profile upload failed:', error);
    }
  });
};

export const useDeleteVoiceProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (profileId: string) => avatarAPI.deleteVoiceProfile(profileId),
    onSuccess: () => {
      // Invalidate voice profiles query to refresh the list
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.VOICE_PROFILES });
    },
    onError: (error) => {
      console.error('Voice profile deletion failed:', error);
    }
  });
};

export const useTestVoiceProfileSynthesis = () => {
  return useMutation({
    mutationFn: ({ profileId, text }: { profileId: string; text: string }) =>
      avatarAPI.testVoiceProfileSynthesis(profileId, text),
    onError: (error) => {
      console.error('Voice synthesis test failed:', error);
    }
  });
};

// Conversation History hooks
export const useConversations = (page: number = 1, perPage: number = 20) => {
  return useQuery({
    queryKey: [...QUERY_KEYS.CONVERSATIONS, page, perPage],
    queryFn: () => avatarAPI.getConversations(page, perPage),
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000 // Consider stale after 30 seconds
  });
};

export const useSearchConversations = () => {
  return useMutation({
    mutationFn: ({
      query,
      page = 1,
      perPage = 20
    }: {
      query: string;
      page?: number;
      perPage?: number;
    }) => avatarAPI.searchConversations(query, page, perPage),
    onError: (error) => {
      console.error('Conversation search failed:', error);
    }
  });
};

export const useExportConversationSession = () => {
  return useMutation({
    mutationFn: ({
      sessionId,
      format = 'json'
    }: {
      sessionId: string;
      format?: 'json' | 'txt';
    }) => avatarAPI.exportConversationSession(sessionId, format),
    onSuccess: (blob, variables) => {
      // Auto-download the exported file
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `conversation-${variables.sessionId}.${variables.format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
    onError: (error) => {
      console.error('Conversation export failed:', error);
    }
  });
};

// System monitoring hooks
export const useSystemHealth = () => {
  return useQuery({
    queryKey: QUERY_KEYS.SYSTEM_HEALTH,
    queryFn: () => avatarAPI.getSystemHealth(),
    refetchInterval: 15000, // Refresh every 15 seconds for real-time monitoring
    staleTime: 5000 // Consider stale after 5 seconds
  });
};

export const useVRAMStatus = () => {
  return useQuery({
    queryKey: QUERY_KEYS.VRAM_STATUS,
    queryFn: () => avatarAPI.getVRAMStatus(),
    refetchInterval: 10000, // Refresh every 10 seconds
    staleTime: 5000
  });
};

// Utility hooks for system information
export const useSystemInfo = () => {
  return useQuery({
    queryKey: ['system-info'],
    queryFn: () => avatarAPI.getSystemInfo(),
    refetchInterval: 60000, // Refresh every minute
    staleTime: 30000
  });
};

// ==================== Voice Profiles (Extended) ====================

export const useVoiceProfile = (profileId: string) => {
  return useQuery({
    queryKey: [...QUERY_KEYS.VOICE_PROFILES, profileId],
    queryFn: () => avatarAPI.getVoiceProfile(profileId),
    staleTime: 30000
  });
};

export const useUpdateVoiceProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      profileId,
      data,
      audioFile
    }: {
      profileId: string;
      data: { name?: string; description?: string; reference_text?: string };
      audioFile?: File;
    }) => avatarAPI.updateVoiceProfile(profileId, data, audioFile),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.VOICE_PROFILES });
    },
    onError: (error) => {
      console.error('Voice profile update failed:', error);
    }
  });
};

export const useVoiceProfileAudio = (profileId: string) => {
  return useQuery({
    queryKey: [...QUERY_KEYS.VOICE_PROFILES, profileId, 'audio'],
    queryFn: () => avatarAPI.getVoiceProfileAudio(profileId),
    staleTime: Infinity,  // Audio files don't change
    enabled: false        // Only fetch when explicitly called
  });
};

// ==================== Conversations (Extended) ====================

export const useConversationHistory = (sessionId: string, limit: number = 50) => {
  return useQuery({
    queryKey: [...QUERY_KEYS.CONVERSATIONS, sessionId, limit],
    queryFn: () => avatarAPI.getConversationHistory(sessionId, limit),
    staleTime: 30000
  });
};

export const useDeleteConversation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) =>
      avatarAPI.deleteConversationSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.CONVERSATIONS });
    },
    onError: (error) => {
      console.error('Conversation deletion failed:', error);
    }
  });
};

export const useConversationAudio = () => {
  return useMutation({
    mutationFn: ({
      sessionId,
      turnNumber,
      audioType = 'ai_fast'
    }: {
      sessionId: string;
      turnNumber: number;
      audioType?: 'user' | 'ai_fast' | 'ai_hq';
    }) => avatarAPI.getConversationAudio(sessionId, turnNumber, audioType),
    onSuccess: (blob, variables) => {
      // Auto-download the audio file
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${variables.sessionId}-turn${variables.turnNumber}-${variables.audioType}.wav`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    },
    onError: (error) => {
      console.error('Audio download failed:', error);
    }
  });
};

export const useConversationStats = () => {
  return useQuery({
    queryKey: ['conversation-stats'],
    queryFn: () => avatarAPI.getConversationStats(),
    refetchInterval: 60000,
    staleTime: 30000
  });
};

// ==================== VRAM Management ====================

export const useVRAMHistory = (deviceId: number = 0, minutes: number = 10) => {
  return useQuery({
    queryKey: [...QUERY_KEYS.VRAM_STATUS, 'history', deviceId, minutes],
    queryFn: () => avatarAPI.getVRAMHistory(deviceId, minutes),
    refetchInterval: 30000,
    staleTime: 10000
  });
};

export const useTriggerVRAMCleanup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (deviceId?: number) => avatarAPI.triggerVRAMCleanup(deviceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.VRAM_STATUS });
    },
    onError: (error) => {
      console.error('VRAM cleanup failed:', error);
    }
  });
};

export const usePredictServiceCapacity = () => {
  return useMutation({
    mutationFn: (serviceType: 'stt' | 'llm' | 'tts_fast' | 'tts_hq') =>
      avatarAPI.predictServiceCapacity(serviceType),
    onError: (error) => {
      console.error('Service capacity prediction failed:', error);
    }
  });
};

// ==================== Monitoring API ====================

export const MONITORING_KEYS = {
  HEALTH: ['monitoring-health'] as const,
  ALERTS: ['monitoring-alerts'] as const,
  ERRORS: ['monitoring-errors'] as const,
  METRICS: ['monitoring-metrics'] as const,
  PERFORMANCE: ['monitoring-performance'] as const,
  DASHBOARD: ['monitoring-dashboard'] as const,
};

export const useMonitoringHealth = () => {
  return useQuery({
    queryKey: MONITORING_KEYS.HEALTH,
    queryFn: () => avatarAPI.getMonitoringHealth(),
    refetchInterval: 15000,
    staleTime: 5000
  });
};

export const useMonitoringAlerts = (
  includeResolved: boolean = false,
  level?: string
) => {
  return useQuery({
    queryKey: [...MONITORING_KEYS.ALERTS, includeResolved, level],
    queryFn: () => avatarAPI.getMonitoringAlerts(includeResolved, level),
    refetchInterval: 20000,
    staleTime: 10000
  });
};

export const useAcknowledgeAlert = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (alertId: string) => avatarAPI.acknowledgeAlert(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MONITORING_KEYS.ALERTS });
    }
  });
};

export const useResolveAlert = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (alertId: string) => avatarAPI.resolveAlert(alertId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MONITORING_KEYS.ALERTS });
    }
  });
};

export const useErrorStatistics = () => {
  return useQuery({
    queryKey: MONITORING_KEYS.ERRORS,
    queryFn: () => avatarAPI.getErrorStatistics(),
    refetchInterval: 30000,
    staleTime: 15000
  });
};

export const useRecentErrors = (limit: number = 50, severity?: string) => {
  return useQuery({
    queryKey: [...MONITORING_KEYS.ERRORS, 'recent', limit, severity],
    queryFn: () => avatarAPI.getRecentErrors(limit, severity),
    refetchInterval: 30000,
    staleTime: 15000
  });
};

export const useMetricsSummary = () => {
  return useQuery({
    queryKey: MONITORING_KEYS.METRICS,
    queryFn: () => avatarAPI.getMetricsSummary(),
    refetchInterval: 20000,
    staleTime: 10000
  });
};

export const usePerformanceMetrics = () => {
  return useQuery({
    queryKey: MONITORING_KEYS.PERFORMANCE,
    queryFn: () => avatarAPI.getPerformanceMetrics(),
    refetchInterval: 30000,
    staleTime: 15000
  });
};

export const useDashboardData = () => {
  return useQuery({
    queryKey: MONITORING_KEYS.DASHBOARD,
    queryFn: () => avatarAPI.getDashboardData(),
    refetchInterval: 15000,
    staleTime: 5000
  });
};

export const useResetMonitoringStats = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => avatarAPI.resetMonitoringStats(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['monitoring'] });
    }
  });
};

// Combined hook for system dashboard data
export const useSystemDashboardData = () => {
  const health = useSystemHealth();
  const vram = useVRAMStatus();
  const profiles = useVoiceProfiles();
  const conversationStats = useConversationStats();

  return {
    health: health.data,
    vram: vram.data,
    voiceProfiles: profiles.data,
    conversationStats: conversationStats.data,
    isLoading: health.isLoading || vram.isLoading || profiles.isLoading || conversationStats.isLoading,
    error: health.error || vram.error || profiles.error || conversationStats.error,
    refetch: () => {
      health.refetch();
      vram.refetch();
      profiles.refetch();
      conversationStats.refetch();
    }
  };
};

// Error handling utilities
export const useAPIErrorHandler = () => {
  const handleError = (error: any) => {
    console.error('API Error:', error);

    // You can add toast notifications, error reporting, etc. here
    if (error.code === 'NETWORK_ERROR') {
      console.warn('Network error - check connection to AVATAR backend');
    } else if (error.code === 'HTTP_401') {
      console.warn('Authentication required');
    } else if (error.code === 'HTTP_429') {
      console.warn('Rate limit exceeded');
    }

    return error;
  };

  return { handleError };
};