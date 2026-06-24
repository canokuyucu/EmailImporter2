import { useQueryClient } from "@tanstack/react-query";
import { 
  useGetScannerStatus, 
  getGetScannerStatusQueryKey, 
  useRunScanner, 
  useSendReminder,
  getListYetkilerQueryKey,
  getGetYetkiStatsQueryKey
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

export function useScannerStatus() {
  return useGetScannerStatus({ 
    query: { 
      refetchInterval: 10000 // Refresh scanner status every 10 seconds
    } 
  });
}

export function useRunScannerAction() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useRunScanner({
    mutation: {
      onSuccess: (data) => {
        // Invalidate all related queries
        queryClient.invalidateQueries({ queryKey: getListYetkilerQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetYetkiStatsQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetScannerStatusQueryKey() });
        
        toast({
          title: "Tarama Tamamlandı",
          description: data.message || `${data.newCount} yeni, ${data.updatedCount} güncellenen kayıt bulundu.`,
        });
      },
      onError: (error: any) => {
        toast({ 
          title: "Tarama Hatası", 
          description: error?.message || "E-posta taraması başlatılamadı.", 
          variant: "destructive" 
        });
      }
    }
  });
}

export function useSendReminderAction() {
  const { toast } = useToast();
  
  return useSendReminder({
    mutation: {
      onSuccess: (data) => {
        toast({ 
          title: "Hatırlatıcı Gönderildi", 
          description: data.message || "Telegram grubuna bilgilendirme mesajı iletildi." 
        });
      },
      onError: (error: any) => {
        toast({ 
          title: "Gönderim Hatası", 
          description: error?.message || "Telegram hatırlatıcısı gönderilemedi.", 
          variant: "destructive" 
        });
      }
    }
  });
}
