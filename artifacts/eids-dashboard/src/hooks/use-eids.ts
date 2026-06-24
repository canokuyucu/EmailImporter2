import { useQueryClient } from "@tanstack/react-query";
import { 
  useCreateYetki, 
  useUpdateYetki, 
  useDeleteYetki, 
  useBulkDeleteYetkiler,
  useCreateYetkiNot,
  useDeleteYetkiNot,
  useRunScanner,
  useSendReminder,
  getListYetkilerQueryKey,
  getGetYetkiStatsQueryKey,
  getListActivityLogsQueryKey,
  getGetYetkiQueryKey,
  getListYetkiNotlariQueryKey,
  getGetYetkiTakvimQueryKey,
  getGetScannerStatusQueryKey
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

export function useEidsMutations() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const invalidateLists = () => {
    queryClient.invalidateQueries({ queryKey: getListYetkilerQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetYetkiStatsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListActivityLogsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetYetkiTakvimQueryKey() });
  };

  const createYetki = useCreateYetki({
    mutation: {
      onSuccess: () => {
        invalidateLists();
        toast({ title: "Başarılı", description: "Yetki kaydedildi." });
      },
      onError: (err: any) => {
        toast({ title: "Hata", description: err.message || "Kaydedilemedi.", variant: "destructive" });
      }
    }
  });

  const updateYetki = useUpdateYetki({
    mutation: {
      onSuccess: (data, variables) => {
        invalidateLists();
        queryClient.invalidateQueries({ queryKey: getGetYetkiQueryKey(variables.id) });
        toast({ title: "Başarılı", description: "Yetki güncellendi." });
      },
      onError: (err: any) => {
        toast({ title: "Hata", description: err.message || "Güncellenemedi.", variant: "destructive" });
      }
    }
  });

  const deleteYetki = useDeleteYetki({
    mutation: {
      onSuccess: () => {
        invalidateLists();
        toast({ title: "Başarılı", description: "Yetki silindi." });
      },
      onError: (err: any) => {
        toast({ title: "Hata", description: err.message || "Silinemedi.", variant: "destructive" });
      }
    }
  });

  const bulkDeleteYetkiler = useBulkDeleteYetkiler({
    mutation: {
      onSuccess: () => {
        invalidateLists();
        toast({ title: "Başarılı", description: "Seçili yetkiler silindi." });
      },
      onError: (err: any) => {
        toast({ title: "Hata", description: err.message || "Toplu silme başarısız.", variant: "destructive" });
      }
    }
  });

  const createYetkiNot = useCreateYetkiNot({
    mutation: {
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries({ queryKey: getListYetkiNotlariQueryKey(variables.id) });
        toast({ title: "Başarılı", description: "Not eklendi." });
      },
      onError: (err: any) => {
        toast({ title: "Hata", description: err.message || "Not eklenemedi.", variant: "destructive" });
      }
    }
  });

  const deleteYetkiNot = useDeleteYetkiNot({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === '/api/yetkiler' && query.queryKey[2] === 'notlar' });
        toast({ title: "Başarılı", description: "Not silindi." });
      }
    }
  });

  const runScanner = useRunScanner({
    mutation: {
      onSuccess: (data) => {
        invalidateLists();
        queryClient.invalidateQueries({ queryKey: getGetScannerStatusQueryKey() });
        toast({ title: "Tarama Tamamlandı", description: data?.message || "İşlem başarılı" });
      },
      onError: (err: any) => {
        toast({ title: "Hata", description: err.message || "Tarama başlatılamadı.", variant: "destructive" });
      }
    }
  });

  const sendReminder = useSendReminder({
    mutation: {
      onSuccess: () => {
        toast({ title: "Başarılı", description: "Bildirim gönderildi." });
      },
      onError: (err: any) => {
        toast({ title: "Hata", description: err.message || "Bildirim gönderilemedi.", variant: "destructive" });
      }
    }
  });

  return {
    createYetki,
    updateYetki,
    deleteYetki,
    bulkDeleteYetkiler,
    createYetkiNot,
    deleteYetkiNot,
    runScanner,
    sendReminder
  };
}
