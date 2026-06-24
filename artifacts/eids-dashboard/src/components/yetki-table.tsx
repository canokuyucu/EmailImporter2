import { useState } from "react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { motion } from "framer-motion";
import { Trash2, Search, FileText, AlertCircle } from "lucide-react";
import { Yetki } from "@workspace/api-client-react";
import { useDeleteYetkiAction } from "@/hooks/use-yetkiler";
import { StatusBadge } from "./status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DeleteDialog } from "./delete-dialog";
import { Skeleton } from "@/components/ui/skeleton";

interface YetkiTableProps {
  data: Yetki[] | undefined;
  isLoading: boolean;
}

export function YetkiTable({ data, isLoading }: YetkiTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  
  const deleteAction = useDeleteYetkiAction();

  const filteredData = data?.filter((item) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      item.tasinmazNo.toLowerCase().includes(searchLower) ||
      item.ad.toLowerCase().includes(searchLower) ||
      item.durum.toLowerCase().includes(searchLower)
    );
  }) || [];

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    try {
      return format(new Date(dateStr), "dd.MM.yyyy", { locale: tr });
    } catch {
      return dateStr;
    }
  };

  const handleDeleteConfirm = () => {
    if (deleteId) {
      deleteAction.mutate({ id: deleteId }, {
        onSuccess: () => setDeleteId(null)
      });
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-border p-6 mt-8">
        <div className="space-y-4">
          <Skeleton className="h-10 w-64 rounded-xl" />
          <div className="space-y-2 mt-6">
            {[1, 2, 3, 4, 5].map(i => (
              <Skeleton key={i} className="h-16 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden mt-8">
        {/* Table Header / Toolbar */}
        <div className="p-6 border-b border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-display font-semibold text-foreground">Yetki Kayıtları</h2>
            <p className="text-sm text-muted-foreground mt-1">Sistemde kayıtlı tüm taşınmaz yetkileri</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Taşınmaz No veya İsim Ara..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 rounded-xl border-slate-200 bg-slate-50 focus-visible:bg-white transition-colors"
            />
          </div>
        </div>

        {/* Desktop Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="text-xs text-muted-foreground bg-slate-50/50 uppercase border-b border-border/50">
              <tr>
                <th className="px-6 py-4 font-semibold">Taşınmaz No</th>
                <th className="px-6 py-4 font-semibold">Ad Soyad / Unvan</th>
                <th className="px-6 py-4 font-semibold">Bitiş Tarihi</th>
                <th className="px-6 py-4 font-semibold">Mail Tarihi</th>
                <th className="px-6 py-4 font-semibold">Durum</th>
                <th className="px-6 py-4 font-semibold text-center">Kalan Gün</th>
                <th className="px-6 py-4 font-semibold text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileText className="h-8 w-8 text-slate-300" />
                      <p>Kayıt bulunamadı.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredData.map((yetki, idx) => (
                  <motion.tr 
                    key={yetki.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="hover:bg-slate-50/80 transition-colors group"
                  >
                    <td className="px-6 py-4 font-medium text-slate-900">{yetki.tasinmazNo}</td>
                    <td className="px-6 py-4 max-w-[200px] truncate" title={yetki.ad}>{yetki.ad}</td>
                    <td className="px-6 py-4">{formatDate(yetki.bitisTarihi)}</td>
                    <td className="px-6 py-4 text-muted-foreground">{formatDate(yetki.mailTarihi)}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={yetki.durum} />
                    </td>
                    <td className="px-6 py-4 text-center font-medium">
                      {yetki.kalanGun !== null ? (
                        <span className={yetki.kalanGun <= 7 ? "text-rose-600" : "text-slate-600"}>
                          {yetki.kalanGun}
                        </span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all focus:opacity-100"
                        onClick={() => setDeleteId(yetki.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">Sil</span>
                      </Button>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DeleteDialog 
        open={!!deleteId} 
        onOpenChange={(open) => !open && setDeleteId(null)}
        onConfirm={handleDeleteConfirm}
        isDeleting={deleteAction.isPending}
      />
    </>
  );
}
