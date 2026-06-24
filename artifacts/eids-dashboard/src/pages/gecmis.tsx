import * as React from "react";
import { Layout } from "@/components/Layout";
import { useListActivityLogs } from "@workspace/api-client-react";
import { Skeleton, Card } from "@/components/ui/shared";
import { History } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { motion } from "framer-motion";

export default function Gecmis() {
  const { data: logs, isLoading } = useListActivityLogs({ limit: 100 });
  
  const getActionColor = (action: string) => {
    switch(action) {
      case 'YENİ EKLEME': return 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30';
      case 'GÜNCELLEME': return 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30';
      case 'SİLME': return 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30';
      case 'TARAMA': return 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-500/20 dark:text-indigo-400 dark:border-indigo-500/30';
      case 'UYARI': return 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30';
      case 'DURUM DEĞİŞİKLİĞİ': return 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-500/20 dark:text-purple-400 dark:border-purple-500/30';
      case 'HATA': return 'bg-red-100 text-red-800 border-red-200 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30';
      default: return 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    }
  };

  return (
    <Layout>
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="space-y-6 pb-12"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-primary/10 text-primary rounded-xl">
            <History className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">İşlem Geçmişi</h1>
            <p className="text-muted-foreground text-sm">Sistemdeki son 100 aktivite</p>
          </div>
        </div>
        
        <Card className="overflow-hidden border-2">
          {/* Desktop view */}
          <div className="hidden md:block overflow-x-auto min-h-[400px]">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-slate-50/80 dark:bg-slate-900/50 border-b dark:border-slate-800">
                <tr>
                  <th className="px-6 py-4 font-bold tracking-wider">Tarih</th>
                  <th className="px-6 py-4 font-bold tracking-wider">İşlem</th>
                  <th className="px-6 py-4 font-bold tracking-wider">Taşınmaz / Ad</th>
                  <th className="px-6 py-4 font-bold tracking-wider">Detay</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {isLoading ? (
                   Array.from({length: 10}).map((_, i) => (
                     <tr key={i}>
                       <td className="px-6 py-5"><Skeleton className="h-4 w-28"/></td>
                       <td className="px-6 py-5"><Skeleton className="h-6 w-24 rounded-full"/></td>
                       <td className="px-6 py-5"><Skeleton className="h-4 w-48"/></td>
                       <td className="px-6 py-5"><Skeleton className="h-4 w-full max-w-md"/></td>
                     </tr>
                   ))
                ) : logs?.length === 0 ? (
                   <tr>
                     <td colSpan={4} className="px-6 py-16 text-center text-muted-foreground font-medium">Henüz işlem geçmişi yok.</td>
                   </tr>
                ) : logs?.map((log, index) => (
                  <motion.tr 
                    key={log.id} 
                    initial={{ opacity: 0, x: -10 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    transition={{ delay: index * 0.02 }}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="px-6 py-4 font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">{formatDate(log.createdAt)}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {log.tasinmazNo ? (
                        <div className="flex flex-col">
                          <span className="font-bold text-foreground">{log.tasinmazNo}</span>
                          {log.ad && <span className="text-muted-foreground font-medium text-xs mt-0.5 max-w-[200px] truncate" title={log.ad}>{log.ad}</span>}
                        </div>
                      ) : <span className="text-slate-400">-</span>}
                    </td>
                    <td className="px-6 py-4 text-foreground font-medium leading-relaxed max-w-xl">{log.details || "-"}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile view */}
          <div className="md:hidden divide-y dark:divide-slate-800">
            {isLoading ? (
              Array.from({length: 5}).map((_, i) => (
                <div key={i} className="p-4 space-y-3"><Skeleton className="h-20 w-full rounded-xl"/></div>
              ))
            ) : logs?.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">Kayıt yok</div>
            ) : logs?.map((log) => (
              <div key={log.id} className="p-4 flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${getActionColor(log.action)}`}>
                    {log.action}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">{formatDate(log.createdAt)}</span>
                </div>
                {log.tasinmazNo && (
                  <div className="text-sm font-bold text-foreground">
                    NO: {log.tasinmazNo} <span className="font-normal text-muted-foreground block">{log.ad}</span>
                  </div>
                )}
                <p className="text-sm text-foreground bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border dark:border-slate-800 leading-relaxed mt-1">
                  {log.details}
                </p>
              </div>
            ))}
          </div>
        </Card>
      </motion.div>
    </Layout>
  );
}
