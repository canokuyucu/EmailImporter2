import * as React from "react";
import { Layout } from "@/components/Layout";
import { useTestConnections } from "@workspace/api-client-react";
import { Card, Button, Skeleton } from "@/components/ui/shared";
import { Activity, Mail, Send, CheckCircle2, XCircle, RefreshCw, Sheet, Info } from "lucide-react";
import { motion } from "framer-motion";

export default function Baglanti() {
  const { data, isLoading, refetch, isFetching } = useTestConnections();

  return (
    <Layout>
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="space-y-6 max-w-3xl mx-auto"
      >
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 text-primary rounded-xl">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold text-foreground">Bağlantı Testi</h1>
              <p className="text-muted-foreground text-sm">Sistem entegrasyonlarının durum kontrolü</p>
            </div>
          </div>
          <Button onClick={() => refetch()} disabled={isFetching} variant="outline" className="h-10">
            <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
            Yenile
          </Button>
        </div>

        <div className="grid gap-6">
          {isLoading ? (
            <>
              <Skeleton className="h-32 w-full rounded-2xl" />
              <Skeleton className="h-32 w-full rounded-2xl" />
            </>
          ) : (
            <>
              {/* Gmail Test */}
              <Card className="p-6 border-2 flex items-start gap-5">
                <div className={`p-4 rounded-full shrink-0 ${data?.gmail.ok ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400'}`}>
                  <Mail className="w-8 h-8" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-lg font-bold font-display text-foreground">Gmail IMAP Bağlantısı</h2>
                    {data?.gmail.ok ? <CheckCircle2 className="w-6 h-6 text-emerald-500" /> : <XCircle className="w-6 h-6 text-rose-500" />}
                  </div>
                  <p className="text-muted-foreground leading-relaxed">{data?.gmail.message}</p>
                </div>
              </Card>

              {/* Telegram Test */}
              <Card className="p-6 border-2 flex items-start gap-5">
                <div className={`p-4 rounded-full shrink-0 ${data?.telegram.ok ? 'bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400' : 'bg-rose-100 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400'}`}>
                  <Send className="w-8 h-8" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-lg font-bold font-display text-foreground">Telegram Bot Bağlantısı</h2>
                    {data?.telegram.ok ? <CheckCircle2 className="w-6 h-6 text-emerald-500" /> : <XCircle className="w-6 h-6 text-rose-500" />}
                  </div>
                  <p className="text-muted-foreground leading-relaxed">{data?.telegram.message}</p>
                </div>
              </Card>

              {/* Google Sheets */}
              <Card className="p-6 border-2 border-dashed border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-900/10 flex items-start gap-5">
                <div className="p-4 rounded-full shrink-0 bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                  <Sheet className="w-8 h-8" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-lg font-bold font-display text-foreground">Google Sheets Senkronizasyonu</h2>
                    <Info className="w-6 h-6 text-amber-500" />
                  </div>
                  <p className="text-muted-foreground leading-relaxed mb-3">
                    Yetki verileri otomatik olarak Google Sheets'e aktarılabilir. Aktif etmek için aşağıdaki ortam değişkenlerini tanımlayın:
                  </p>
                  <div className="bg-white dark:bg-slate-900 rounded-xl p-4 border dark:border-slate-700 space-y-2 font-mono text-sm">
                    <p><span className="text-amber-600 font-bold">GOOGLE_SHEET_ID</span> <span className="text-muted-foreground">— Tablonuzun URL'sindeki kimlik</span></p>
                    <p><span className="text-amber-600 font-bold">GOOGLE_SERVICE_ACCOUNT_JSON</span> <span className="text-muted-foreground">— Servis hesabı JSON anahtarı</span></p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Service Account oluşturduktan sonra tabloyu o hesapla paylaşmayı unutmayın.
                  </p>
                </div>
              </Card>
            </>
          )}
        </div>
      </motion.div>
    </Layout>
  );
}
