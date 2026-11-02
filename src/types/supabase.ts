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
    PostgrestVersion: "14.18"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      customers: {
        Row: {
          area: string | null
          book_no: string | null
          created_at: string
          deleted_at: string | null
          family_root_id: string | null
          id: string
          name: string
          phone: string
          shop_id: string
          updated_at: string
        }
        Insert: {
          area?: string | null
          book_no?: string | null
          created_at?: string
          deleted_at?: string | null
          family_root_id?: string | null
          id?: string
          name: string
          phone: string
          shop_id: string
          updated_at?: string
        }
        Update: {
          area?: string | null
          book_no?: string | null
          created_at?: string
          deleted_at?: string | null
          family_root_id?: string | null
          id?: string
          name?: string
          phone?: string
          shop_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_family_root_id_fkey"
            columns: ["family_root_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      garment_types: {
        Row: {
          created_at: string
          deleted_at: string | null
          fabric_per_piece_m: number
          id: string
          name: string
          shop_id: string
          sort_order: number
          style_options: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          fabric_per_piece_m?: number
          id?: string
          name: string
          shop_id: string
          sort_order?: number
          style_options?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          fabric_per_piece_m?: number
          id?: string
          name?: string
          shop_id?: string
          sort_order?: number
          style_options?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "garment_types_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      measurement_fields: {
        Row: {
          created_at: string
          deleted_at: string | null
          garment_type_id: string
          id: string
          name: string
          shop_id: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          garment_type_id: string
          id?: string
          name: string
          shop_id: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          garment_type_id?: string
          id?: string
          name?: string
          shop_id?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "measurement_fields_garment_type_id_fkey"
            columns: ["garment_type_id"]
            isOneToOne: false
            referencedRelation: "garment_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "measurement_fields_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      measurement_values: {
        Row: {
          created_at: string
          deleted_at: string | null
          field_id: string
          measurement_id: string
          shop_id: string
          updated_at: string
          value_in: number
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          field_id: string
          measurement_id: string
          shop_id: string
          updated_at?: string
          value_in: number
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          field_id?: string
          measurement_id?: string
          shop_id?: string
          updated_at?: string
          value_in?: number
        }
        Relationships: [
          {
            foreignKeyName: "measurement_values_field_id_fkey"
            columns: ["field_id"]
            isOneToOne: false
            referencedRelation: "measurement_fields"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "measurement_values_measurement_id_fkey"
            columns: ["measurement_id"]
            isOneToOne: false
            referencedRelation: "measurements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "measurement_values_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      measurement_versions: {
        Row: {
          created_at: string
          id: string
          measured_on: string
          measurement_id: string
          notes: string | null
          shop_id: string
          updated_at: string
          values: Json
        }
        Insert: {
          created_at?: string
          id?: string
          measured_on: string
          measurement_id: string
          notes?: string | null
          shop_id: string
          updated_at?: string
          values: Json
        }
        Update: {
          created_at?: string
          id?: string
          measured_on?: string
          measurement_id?: string
          notes?: string | null
          shop_id?: string
          updated_at?: string
          values?: Json
        }
        Relationships: [
          {
            foreignKeyName: "measurement_versions_measurement_id_fkey"
            columns: ["measurement_id"]
            isOneToOne: false
            referencedRelation: "measurements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "measurement_versions_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      measurements: {
        Row: {
          created_at: string
          customer_id: string
          deleted_at: string | null
          garment_type_id: string
          id: string
          measured_on: string
          notes: string | null
          shop_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          deleted_at?: string | null
          garment_type_id: string
          id?: string
          measured_on?: string
          notes?: string | null
          shop_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          deleted_at?: string | null
          garment_type_id?: string
          id?: string
          measured_on?: string
          notes?: string | null
          shop_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "measurements_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "measurements_garment_type_id_fkey"
            columns: ["garment_type_id"]
            isOneToOne: false
            referencedRelation: "garment_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "measurements_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      order_extras: {
        Row: {
          amount: number
          created_at: string
          deleted_at: string | null
          id: string
          label: string
          order_id: string
          shop_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          deleted_at?: string | null
          id?: string
          label: string
          order_id: string
          shop_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          deleted_at?: string | null
          id?: string
          label?: string
          order_id?: string
          shop_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_extras_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_totals"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_extras_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_extras_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          deleted_at: string | null
          garment_type_id: string
          id: string
          note: string | null
          order_id: string
          qty: number
          rate: number
          shop_id: string
          sort_order: number
          styles: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          garment_type_id: string
          id?: string
          note?: string | null
          order_id: string
          qty: number
          rate: number
          shop_id: string
          sort_order?: number
          styles?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          garment_type_id?: string
          id?: string
          note?: string | null
          order_id?: string
          qty?: number
          rate?: number
          shop_id?: string
          sort_order?: number
          styles?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_garment_type_id_fkey"
            columns: ["garment_type_id"]
            isOneToOne: false
            referencedRelation: "garment_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_totals"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          cancel_reason: string | null
          cancelled_at: string | null
          created_at: string
          created_via: string
          customer_id: string
          deleted_at: string | null
          delivered_on: string | null
          discount: number
          due_date: string
          gst_rate: number
          id: string
          is_urgent: boolean
          notes: string | null
          order_date: string
          order_no: number
          ready_on: string | null
          shop_id: string
          status: Database["public"]["Enums"]["order_status"]
          updated_at: string
        }
        Insert: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          created_via?: string
          customer_id: string
          deleted_at?: string | null
          delivered_on?: string | null
          discount?: number
          due_date: string
          gst_rate?: number
          id?: string
          is_urgent?: boolean
          notes?: string | null
          order_date?: string
          order_no: number
          ready_on?: string | null
          shop_id: string
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
        }
        Update: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          created_at?: string
          created_via?: string
          customer_id?: string
          deleted_at?: string | null
          delivered_on?: string | null
          discount?: number
          due_date?: string
          gst_rate?: number
          id?: string
          is_urgent?: boolean
          notes?: string | null
          order_date?: string
          order_no?: number
          ready_on?: string | null
          shop_id?: string
          status?: Database["public"]["Enums"]["order_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          deleted_at: string | null
          id: string
          mode: Database["public"]["Enums"]["payment_mode"]
          note: string | null
          order_id: string
          paid_on: string
          shop_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          deleted_at?: string | null
          id?: string
          mode?: Database["public"]["Enums"]["payment_mode"]
          note?: string | null
          order_id: string
          paid_on?: string
          shop_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          deleted_at?: string | null
          id?: string
          mode?: Database["public"]["Enums"]["payment_mode"]
          note?: string | null
          order_id?: string
          paid_on?: string
          shop_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_totals"
            referencedColumns: ["order_id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          language: Database["public"]["Enums"]["app_language"]
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id: string
          language?: Database["public"]["Enums"]["app_language"]
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          language?: Database["public"]["Enums"]["app_language"]
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      shops: {
        Row: {
          created_at: string
          default_gst_rate: number
          deleted_at: string | null
          gstin: string | null
          id: string
          measurement_unit: Database["public"]["Enums"]["measurement_unit"]
          name: string
          next_order_no: number
          owner_id: string
          phone: string | null
          updated_at: string
          upi_id: string | null
          weekly_off_day: number | null
        }
        Insert: {
          created_at?: string
          default_gst_rate?: number
          deleted_at?: string | null
          gstin?: string | null
          id?: string
          measurement_unit?: Database["public"]["Enums"]["measurement_unit"]
          name: string
          next_order_no?: number
          owner_id: string
          phone?: string | null
          updated_at?: string
          upi_id?: string | null
          weekly_off_day?: number | null
        }
        Update: {
          created_at?: string
          default_gst_rate?: number
          deleted_at?: string | null
          gstin?: string | null
          id?: string
          measurement_unit?: Database["public"]["Enums"]["measurement_unit"]
          name?: string
          next_order_no?: number
          owner_id?: string
          phone?: string | null
          updated_at?: string
          upi_id?: string | null
          weekly_off_day?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shops_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          last_event_id: string | null
          plan: Database["public"]["Enums"]["plan_code"]
          provider: string
          provider_customer_id: string | null
          shop_id: string
          status: Database["public"]["Enums"]["plan_status"]
          trial_ends_at: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          last_event_id?: string | null
          plan?: Database["public"]["Enums"]["plan_code"]
          provider?: string
          provider_customer_id?: string | null
          shop_id: string
          status?: Database["public"]["Enums"]["plan_status"]
          trial_ends_at?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          last_event_id?: string | null
          plan?: Database["public"]["Enums"]["plan_code"]
          provider?: string
          provider_customer_id?: string | null
          shop_id?: string
          status?: Database["public"]["Enums"]["plan_status"]
          trial_ends_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: true
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      order_totals: {
        Row: {
          balance: number | null
          base: number | null
          extras: number | null
          order_id: string | null
          paid: number | null
          shop_id: string | null
          subtotal: number | null
          tax: number | null
          total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      add_default_garments: { Args: { p_shop: string }; Returns: undefined }
      add_sample_data: { Args: { p_shop: string }; Returns: undefined }
      claim_order_no: { Args: never; Returns: number }
      create_order: {
        Args: {
          p_advance?: Json
          p_extras?: Json
          p_items: Json
          p_order: Json
        }
        Returns: Json
      }
      create_shop: {
        Args: {
          p_language?: Database["public"]["Enums"]["app_language"]
          p_owner_name: string
          p_phone?: string
          p_shop_name: string
          p_with_sample?: boolean
        }
        Returns: Json
      }
      current_shop_id: { Args: never; Returns: string }
      next_book_no: { Args: never; Returns: string }
      save_measurement: {
        Args: {
          p_customer_id: string
          p_garment_type_id: string
          p_id: string
          p_notes: string
          p_values: Json
        }
        Returns: Json
      }
      set_order_status: {
        Args: {
          p_on?: string
          p_order_id: string
          p_status: Database["public"]["Enums"]["order_status"]
        }
        Returns: Json
      }
      shop_can_write: { Args: never; Returns: boolean }
      shop_today: { Args: never; Returns: string }
    }
    Enums: {
      app_language: "en" | "gu" | "hi"
      measurement_unit: "in" | "cm"
      order_status: "received" | "ready" | "delivered"
      payment_mode: "cash" | "upi" | "card"
      plan_code: "trial" | "pro_monthly" | "pro_yearly"
      plan_status: "trialing" | "active" | "grace" | "expired" | "cancelled"
      reminder_kind: "pickup" | "payment" | "delay"
      staff_pay_type: "piece" | "monthly"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_language: ["en", "gu", "hi"],
      measurement_unit: ["in", "cm"],
      order_status: ["received", "ready", "delivered"],
      payment_mode: ["cash", "upi", "card"],
      plan_code: ["trial", "pro_monthly", "pro_yearly"],
      plan_status: ["trialing", "active", "grace", "expired", "cancelled"],
      reminder_kind: ["pickup", "payment", "delay"],
      staff_pay_type: ["piece", "monthly"],
    },
  },
} as const
