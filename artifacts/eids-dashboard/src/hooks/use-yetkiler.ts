import { useQueryClient } from "@tanstack/react-query";
import { 
  useListYetkiler, 
  getListYetkilerQueryKey, 
  useGetYetkiStats, 
  getGetYetkiStatsQueryKey, 
  useDeleteYetki 
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

export function useYetkiler() {
  return useListYetkiler({ 
    query: { 
      refetchInterval: 60000 // Auto-refresh every 60 seconds
    } 
  });
}

export function useYetkiStats() {
  return useGetYetkiStats({ 
    query: { 
      refetchInterval: 60000 
    } 
  });
}

export function useDeleteYetkiAction() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useDeleteYetki({
    mutation: {
      onSuccess: () => {
        // Invalidate lists and stats so they refresh immediately
        queryClient.invalidateQueries({ queryKey: getListYetkilerQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetYetkiStatsQueryKey() });
        
        toast({ 
          title: "İşlem Başarılı", 
          description: "Yetki kaydı başarıyla silindi." 
        });
      },
      onError: (error: any) => {
        toast({ 
          title: "Hata", 
          description: error?.message || "Silme işlemi başarısız oldu.", 
          variant: "destructive" 
        });
      }
    }
  });
}
