export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          name: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          name?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      d20_eligible_users: {
        Row: {
          enabled_at: string | null
          enabled_by: string | null
          id: string
          user_id: string
        }
        Insert: {
          enabled_at?: string | null
          enabled_by?: string | null
          id?: string
          user_id: string
        }
        Update: {
          enabled_at?: string | null
          enabled_by?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      finished_goods_stock: {
        Row: {
          current_quantity: number
          id: string
          product_id: string
          updated_at: string | null
        }
        Insert: {
          current_quantity?: number
          id?: string
          product_id: string
          updated_at?: string | null
        }
        Update: {
          current_quantity?: number
          id?: string
          product_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "finished_goods_stock_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: true
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      production_batch_items: {
        Row: {
          batch_id: string
          cost_per_unit: number
          created_at: string | null
          id: string
          quantity_consumed: number
          raw_material_id: string
          total_cost: number
          unit: Database["public"]["Enums"]["measurement_unit"]
        }
        Insert: {
          batch_id: string
          cost_per_unit?: number
          created_at?: string | null
          id?: string
          quantity_consumed: number
          raw_material_id: string
          total_cost?: number
          unit: Database["public"]["Enums"]["measurement_unit"]
        }
        Update: {
          batch_id?: string
          cost_per_unit?: number
          created_at?: string | null
          id?: string
          quantity_consumed?: number
          raw_material_id?: string
          total_cost?: number
          unit?: Database["public"]["Enums"]["measurement_unit"]
        }
        Relationships: [
          {
            foreignKeyName: "production_batch_items_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "production_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_batch_items_raw_material_id_fkey"
            columns: ["raw_material_id"]
            isOneToOne: false
            referencedRelation: "raw_materials"
            referencedColumns: ["id"]
          },
        ]
      }
      production_batches: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          produced_by: string | null
          product_id: string
          quantity_produced: number
          recipe_id: string
          reversed_at: string | null
          reversed_by: string | null
          status: string
          total_cost: number
          unit_cost: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          produced_by?: string | null
          product_id: string
          quantity_produced: number
          recipe_id: string
          reversed_at?: string | null
          reversed_by?: string | null
          status?: string
          total_cost?: number
          unit_cost?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          produced_by?: string | null
          product_id?: string
          quantity_produced?: number
          recipe_id?: string
          reversed_at?: string | null
          reversed_by?: string | null
          status?: string
          total_cost?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "production_batches_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_batches_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          badge: string | null
          benefits: string[] | null
          category_id: string | null
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          name: string
          original_price: number | null
          price: number
          slug: string
          updated_at: string | null
        }
        Insert: {
          badge?: string | null
          benefits?: string[] | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name: string
          original_price?: number | null
          price: number
          slug: string
          updated_at?: string | null
        }
        Update: {
          badge?: string | null
          benefits?: string[] | null
          category_id?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          name?: string
          original_price?: number | null
          price?: number
          slug?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          name: string | null
          phone: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id: string
          name?: string | null
          phone?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          name?: string | null
          phone?: string | null
        }
        Relationships: []
      }
      raw_material_movements: {
        Row: {
          balance_after: number
          balance_before: number
          cost_per_unit_at_time: number
          created_at: string | null
          id: string
          movement_type: Database["public"]["Enums"]["movement_type"]
          notes: string | null
          quantity: number
          raw_material_id: string
          reference_id: string | null
          reference_type: string | null
          user_id: string | null
        }
        Insert: {
          balance_after?: number
          balance_before?: number
          cost_per_unit_at_time?: number
          created_at?: string | null
          id?: string
          movement_type: Database["public"]["Enums"]["movement_type"]
          notes?: string | null
          quantity: number
          raw_material_id: string
          reference_id?: string | null
          reference_type?: string | null
          user_id?: string | null
        }
        Update: {
          balance_after?: number
          balance_before?: number
          cost_per_unit_at_time?: number
          created_at?: string | null
          id?: string
          movement_type?: Database["public"]["Enums"]["movement_type"]
          notes?: string | null
          quantity?: number
          raw_material_id?: string
          reference_id?: string | null
          reference_type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "raw_material_movements_raw_material_id_fkey"
            columns: ["raw_material_id"]
            isOneToOne: false
            referencedRelation: "raw_materials"
            referencedColumns: ["id"]
          },
        ]
      }
      raw_materials: {
        Row: {
          category: Database["public"]["Enums"]["raw_material_category"]
          cost_per_unit: number | null
          created_at: string | null
          current_quantity: number
          id: string
          is_active: boolean
          minimum_stock: number
          name: string
          purchase_cost: number
          purchase_quantity: number
          unit: Database["public"]["Enums"]["measurement_unit"]
          updated_at: string | null
        }
        Insert: {
          category?: Database["public"]["Enums"]["raw_material_category"]
          cost_per_unit?: number | null
          created_at?: string | null
          current_quantity?: number
          id?: string
          is_active?: boolean
          minimum_stock?: number
          name: string
          purchase_cost?: number
          purchase_quantity?: number
          unit?: Database["public"]["Enums"]["measurement_unit"]
          updated_at?: string | null
        }
        Update: {
          category?: Database["public"]["Enums"]["raw_material_category"]
          cost_per_unit?: number | null
          created_at?: string | null
          current_quantity?: number
          id?: string
          is_active?: boolean
          minimum_stock?: number
          name?: string
          purchase_cost?: number
          purchase_quantity?: number
          unit?: Database["public"]["Enums"]["measurement_unit"]
          updated_at?: string | null
        }
        Relationships: []
      }
      recipe_items: {
        Row: {
          cost_at_creation: number
          created_at: string | null
          id: string
          quantity: number
          raw_material_id: string
          recipe_id: string
          unit: Database["public"]["Enums"]["measurement_unit"]
        }
        Insert: {
          cost_at_creation?: number
          created_at?: string | null
          id?: string
          quantity: number
          raw_material_id: string
          recipe_id: string
          unit?: Database["public"]["Enums"]["measurement_unit"]
        }
        Update: {
          cost_at_creation?: number
          created_at?: string | null
          id?: string
          quantity?: number
          raw_material_id?: string
          recipe_id?: string
          unit?: Database["public"]["Enums"]["measurement_unit"]
        }
        Relationships: [
          {
            foreignKeyName: "recipe_items_raw_material_id_fkey"
            columns: ["raw_material_id"]
            isOneToOne: false
            referencedRelation: "raw_materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recipe_items_recipe_id_fkey"
            columns: ["recipe_id"]
            isOneToOne: false
            referencedRelation: "recipes"
            referencedColumns: ["id"]
          },
        ]
      }
      recipes: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean
          notes: string | null
          product_id: string
          total_cost: number
          updated_at: string | null
          version: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          product_id: string
          total_cost?: number
          updated_at?: string | null
          version?: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          product_id?: string
          total_cost?: number
          updated_at?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "recipes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_recipe_cost: { Args: { p_recipe_id: string }; Returns: number }
      convert_to_base_unit: {
        Args: {
          quantity: number
          unit: Database["public"]["Enums"]["measurement_unit"]
        }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      update_raw_material_stock: {
        Args: {
          p_movement_type: Database["public"]["Enums"]["movement_type"]
          p_notes?: string
          p_quantity: number
          p_raw_material_id: string
          p_reference_id?: string
          p_reference_type?: string
          p_user_id?: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "user"
      measurement_unit: "ml" | "l" | "g" | "kg" | "unidade"
      movement_type:
        | "entrada"
        | "ajuste"
        | "baixa_producao"
        | "estorno"
        | "perda"
      raw_material_category:
        | "base"
        | "essencia"
        | "fixador"
        | "corante"
        | "frasco"
        | "rotulo"
        | "caixa"
        | "embalagem"
        | "outro"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      measurement_unit: ["ml", "l", "g", "kg", "unidade"],
      movement_type: [
        "entrada",
        "ajuste",
        "baixa_producao",
        "estorno",
        "perda",
      ],
      raw_material_category: [
        "base",
        "essencia",
        "fixador",
        "corante",
        "frasco",
        "rotulo",
        "caixa",
        "embalagem",
        "outro",
      ],
    },
  },
} as const
