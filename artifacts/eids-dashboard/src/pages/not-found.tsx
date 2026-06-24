import { Layout } from "@/components/Layout";
import { Link } from "wouter";
import { Button } from "@/components/ui/shared";
import { ShieldAlert, Home } from "lucide-react";
import { motion } from "framer-motion";

export default function NotFound() {
  return (
    <Layout>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4"
      >
        <ShieldAlert className="w-24 h-24 text-slate-300 dark:text-slate-700 mb-6" />
        <h1 className="text-4xl font-display font-bold text-foreground mb-3">404 - Sayfa Bulunamadı</h1>
        <p className="text-lg text-muted-foreground mb-8 max-w-md">Aradığınız sayfaya ulaşılamıyor veya taşınmış olabilir.</p>
        <Link href="/">
          <Button size="lg" className="px-8 font-bold text-base bg-gradient-to-r from-primary to-blue-600 shadow-lg shadow-primary/30">
            <Home className="w-5 h-5 mr-2" />
            Dashboard'a Dön
          </Button>
        </Link>
      </motion.div>
    </Layout>
  );
}
