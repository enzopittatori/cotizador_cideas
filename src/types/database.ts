// Tipos mínimos de las tablas que ya consume código de la app.
// Se amplía a medida que Fase 1+ va tocando más tablas — no se
// mantiene un schema especulativo completo por adelantado.

export type CotizadorRol = "superadmin" | "admin" | "vendedor";

export interface Database {
  public: {
    Tables: {
      cotizador_memberships: {
        Row: {
          id: string;
          user_id: string;
          tenant_id: string | null;
          rol: CotizadorRol;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          tenant_id?: string | null;
          rol: CotizadorRol;
          created_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["cotizador_memberships"]["Insert"]
        >;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
