// Tipos de las tablas que consume código de la app. Se amplía a medida
// que las fases van tocando más tablas — no se mantiene un schema
// especulativo completo por adelantado.

export type CotizadorRol = "superadmin" | "admin" | "vendedor";
export type QuoteModo = "vendedor" | "cliente";
export type LeadEstado =
  | "nuevo"
  | "contactado"
  | "negociando"
  | "ganado"
  | "perdido";

type Json = unknown;

interface TableShape<Row, Insert> {
  Row: Row;
  Insert: Insert;
  Update: Partial<Insert>;
  Relationships: [];
}

export interface Database {
  public: {
    Tables: {
      cotizador_memberships: TableShape<
        {
          id: string;
          user_id: string;
          tenant_id: string | null;
          rol: CotizadorRol;
          created_at: string;
        },
        {
          id?: string;
          user_id: string;
          tenant_id?: string | null;
          rol: CotizadorRol;
          created_at?: string;
        }
      >;
      cotizador_tenants: TableShape<
        {
          id: string;
          nombre: string;
          slug: string;
          industria_base: string | null;
          plan: string;
          estado: "activo" | "suspendido";
          whatsapp_vendedor: string | null;
          cliente_ideal: string | null;
          branding: Json;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          nombre: string;
          slug: string;
          industria_base?: string | null;
          plan?: string;
          estado?: "activo" | "suspendido";
          whatsapp_vendedor?: string | null;
          cliente_ideal?: string | null;
          branding?: Json;
        }
      >;
      cotizador_quoter_configs: TableShape<
        {
          id: string;
          tenant_id: string;
          version: number;
          campos: Json;
          reglas_precio: Json;
          textos: Json;
          opciones: Json;
          publicado: boolean;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          tenant_id: string;
          version?: number;
          campos?: Json;
          reglas_precio?: Json;
          textos?: Json;
          opciones?: Json;
          publicado?: boolean;
        }
      >;
      cotizador_products: TableShape<
        {
          id: string;
          tenant_id: string;
          nombre: string;
          categoria: string | null;
          atributos: Json;
          precio_base: number;
          unidad: string | null;
          beneficios: Json;
          imagen_url: string | null;
          activo: boolean;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          tenant_id: string;
          nombre: string;
          categoria?: string | null;
          atributos?: Json;
          precio_base: number;
          unidad?: string | null;
          beneficios?: Json;
          imagen_url?: string | null;
          activo?: boolean;
        }
      >;
      cotizador_quotes: TableShape<
        {
          id: string;
          tenant_id: string;
          modo: QuoteModo;
          vendedor_id: string | null;
          total: number;
          texto_generado: string | null;
          texto_editado: string | null;
          cliente_nombre: string | null;
          cliente_telefono: string | null;
          created_at: string;
        },
        {
          id?: string;
          tenant_id: string;
          modo: QuoteModo;
          vendedor_id?: string | null;
          total: number;
          texto_generado?: string | null;
          texto_editado?: string | null;
          cliente_nombre?: string | null;
          cliente_telefono?: string | null;
        }
      >;
      cotizador_quote_items: TableShape<
        {
          id: string;
          quote_id: string;
          product_id: string | null;
          inputs: Json;
          cantidad: number;
          subtotal: number;
          created_at: string;
        },
        {
          id?: string;
          quote_id: string;
          product_id?: string | null;
          inputs?: Json;
          cantidad: number;
          subtotal: number;
        }
      >;
      cotizador_leads: TableShape<
        {
          id: string;
          tenant_id: string;
          quote_id: string | null;
          nombre: string | null;
          telefono: string | null;
          email: string | null;
          estado: LeadEstado;
          notas: string | null;
          canal: "whatsapp" | "pdf" | "web" | null;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          tenant_id: string;
          quote_id?: string | null;
          nombre?: string | null;
          telefono?: string | null;
          email?: string | null;
          estado?: LeadEstado;
          notas?: string | null;
          canal?: "whatsapp" | "pdf" | "web" | null;
        }
      >;
      cotizador_text_cache: TableShape<
        {
          id: string;
          tenant_id: string;
          hash_inputs: string;
          texto: string;
          model: string;
          created_at: string;
        },
        {
          id?: string;
          tenant_id: string;
          hash_inputs: string;
          texto: string;
          model: string;
        }
      >;
      cotizador_industry_templates: TableShape<
        {
          id: string;
          nombre: string;
          slug: string;
          config: Json;
          version: number;
          activo: boolean;
          created_at: string;
          updated_at: string;
        },
        {
          id?: string;
          nombre: string;
          slug: string;
          config: Json;
          version?: number;
          activo?: boolean;
        }
      >;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
