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
      customer_addresses: {
        Row: {
          cep: string
          city: string
          complement: string | null
          created_at: string
          id: string
          is_default: boolean | null
          label: string
          neighborhood: string
          number: string
          phone: string | null
          recipient_name: string
          state: string
          street: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cep: string
          city: string
          complement?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          label?: string
          neighborhood: string
          number: string
          phone?: string | null
          recipient_name: string
          state: string
          street: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cep?: string
          city?: string
          complement?: string | null
          created_at?: string
          id?: string
          is_default?: boolean | null
          label?: string
          neighborhood?: string
          number?: string
          phone?: string | null
          recipient_name?: string
          state?: string
          street?: string
          updated_at?: string
          user_id?: string
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
      d20_rolls: {
        Row: {
          id: string
          prize_code: string
          prize_description: string
          prize_title: string
          roll_result: number
          rolled_at: string
          used_at: string | null
          used_in_order_id: string | null
          user_id: string
        }
        Insert: {
          id?: string
          prize_code: string
          prize_description: string
          prize_title: string
          roll_result: number
          rolled_at?: string
          used_at?: string | null
          used_in_order_id?: string | null
          user_id: string
        }
        Update: {
          id?: string
          prize_code?: string
          prize_description?: string
          prize_title?: string
          roll_result?: number
          rolled_at?: string
          used_at?: string | null
          used_in_order_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "d20_rolls_used_in_order_id_fkey"
            columns: ["used_in_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string | null
          description: string
          due_date: string | null
          expense_date: string
          id: string
          notes: string | null
          payment_date: string | null
          payment_status: string
          recurrence: string | null
          supplier: string | null
          updated_at: string | null
        }
        Insert: {
          amount?: number
          category?: string
          created_at?: string | null
          description: string
          due_date?: string | null
          expense_date?: string
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_status?: string
          recurrence?: string | null
          supplier?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string | null
          description?: string
          due_date?: string | null
          expense_date?: string
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_status?: string
          recurrence?: string | null
          supplier?: string | null
          updated_at?: string | null
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
      fixed_assets: {
        Row: {
          category: string
          created_at: string | null
          current_value: number
          depreciation_rate: number | null
          description: string | null
          id: string
          is_active: boolean
          location: string | null
          name: string
          notes: string | null
          purchase_date: string | null
          purchase_value: number
          serial_number: string | null
          supplier: string | null
          updated_at: string | null
          useful_life_months: number | null
        }
        Insert: {
          category?: string
          created_at?: string | null
          current_value?: number
          depreciation_rate?: number | null
          description?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          name: string
          notes?: string | null
          purchase_date?: string | null
          purchase_value?: number
          serial_number?: string | null
          supplier?: string | null
          updated_at?: string | null
          useful_life_months?: number | null
        }
        Update: {
          category?: string
          created_at?: string | null
          current_value?: number
          depreciation_rate?: number | null
          description?: string | null
          id?: string
          is_active?: boolean
          location?: string | null
          name?: string
          notes?: string | null
          purchase_date?: string | null
          purchase_value?: number
          serial_number?: string | null
          supplier?: string | null
          updated_at?: string | null
          useful_life_months?: number | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string
          product_name: string
          product_price: number
          quantity: number
          total: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id: string
          product_name: string
          product_price: number
          quantity?: number
          total: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string
          product_name?: string
          product_price?: number
          quantity?: number
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address_id: string | null
          admin_notes: string | null
          created_at: string
          discount: number
          id: string
          notes: string | null
          order_number: number
          payment_status: string
          shipping_cost: number
          status: string
          subtotal: number
          total: number
          tracking_code: string | null
          tracking_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address_id?: string | null
          admin_notes?: string | null
          created_at?: string
          discount?: number
          id?: string
          notes?: string | null
          order_number?: number
          payment_status?: string
          shipping_cost?: number
          status?: string
          subtotal?: number
          total?: number
          tracking_code?: string | null
          tracking_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address_id?: string | null
          admin_notes?: string | null
          created_at?: string
          discount?: number
          id?: string
          notes?: string | null
          order_number?: number
          payment_status?: string
          shipping_cost?: number
          status?: string
          subtotal?: number
          total?: number
          tracking_code?: string | null
          tracking_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_address_id_fkey"
            columns: ["address_id"]
            isOneToOne: false
            referencedRelation: "customer_addresses"
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
          status_new: string | null
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
          status_new?: string | null
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
          status_new?: string | null
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
          scent_family_id: string | null
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
          scent_family_id?: string | null
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
          scent_family_id?: string | null
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
          {
            foreignKeyName: "products_scent_family_id_fkey"
            columns: ["scent_family_id"]
            isOneToOne: false
            referencedRelation: "scent_families"
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
      scent_families: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
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
      user_xp: {
        Row: {
          created_at: string | null
          current_xp: number
          id: string
          level: number
          total_xp: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_xp?: number
          id?: string
          level?: number
          total_xp?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_xp?: number
          id?: string
          level?: number
          total_xp?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      award_xp: {
        Args: { p_user_id: string; p_xp_amount: number }
        Returns: Json
      }
      calculate_level_from_xp: { Args: { p_total_xp: number }; Returns: number }
      calculate_recipe_cost: { Args: { p_recipe_id: string }; Returns: number }
      change_production_status: {
        Args: { p_batch_id: string; p_new_status: string; p_user_id?: string }
        Returns: Json
      }
      convert_to_base_unit: {
        Args: {
          quantity: number
          unit: Database["public"]["Enums"]["measurement_unit"]
        }
        Returns: number
      }
      create_production_batch: {
        Args: {
          p_initial_status?: string
          p_notes?: string
          p_quantity: number
          p_recipe_id: string
          p_user_id?: string
        }
        Returns: Json
      }
      delete_production_batch: {
        Args: { p_batch_id: string; p_user_id?: string }
        Returns: Json
      }
      get_catalog_availability: {
        Args: { p_only_active?: boolean }
        Returns: {
          in_stock: boolean
          product_id: string
        }[]
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
      xp_for_next_level: { Args: { p_current_level: number }; Returns: number }
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
      production_status: "produzindo" | "concluido" | "perda" | "estornado"
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
      production_status: ["produzindo", "concluido", "perda", "estornado"],
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
