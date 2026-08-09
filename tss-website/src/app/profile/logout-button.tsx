 "use client";
 
 import { Button } from "@/components/ui/button";
 import { useAuth } from "@/hooks/use-auth";
 import { LogOut } from "lucide-react";
 
 export default function LogoutButton() {
   const { signOut, loading } = useAuth();
   return (
     <div className="flex items-center justify-between gap-4">
       <p className="text-sm text-[var(--text)]">
         Wylogowanie zakończy wszystkie aktywne sesje.
       </p>
       <Button
         onClick={signOut}
         disabled={loading}
         className="rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold h-11 px-6 shadow-[0_0_20px_-6px_rgba(220,53,69,0.7)]"
       >
         <LogOut className="mr-2" size={16} />
         Wyloguj
       </Button>
     </div>
   );
 }
