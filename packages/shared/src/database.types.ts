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
      attendance_records: {
        Row: {
          addon_pay: number
          base_daily_pay: number
          created_at: string
          date: string
          id: string
          is_present: boolean
          total_day_pay: number
          updated_at: string
          user_id: string
        }
        Insert: {
          addon_pay?: number
          base_daily_pay?: number
          created_at?: string
          date: string
          id?: string
          is_present?: boolean
          total_day_pay?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          addon_pay?: number
          base_daily_pay?: number
          created_at?: string
          date?: string
          id?: string
          is_present?: boolean
          total_day_pay?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          category: Database["public"]["Enums"]["inventory_category"]
          created_at: string
          current_stock: number
          id: string
          min_alert_level: number
          name: string
          sku: string
          supplier_name: string | null
          unit: string
          unit_cost: number
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["inventory_category"]
          created_at?: string
          current_stock?: number
          id?: string
          min_alert_level?: number
          name: string
          sku: string
          supplier_name?: string | null
          unit: string
          unit_cost?: number
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["inventory_category"]
          created_at?: string
          current_stock?: number
          id?: string
          min_alert_level?: number
          name?: string
          sku?: string
          supplier_name?: string | null
          unit?: string
          unit_cost?: number
          updated_at?: string
        }
        Relationships: []
      }
      modifier_ingredient_deltas: {
        Row: {
          amount_delta: number
          created_at: string
          id: string
          inventory_item_id: string
          modifier_id: string
          unit: string
        }
        Insert: {
          amount_delta: number
          created_at?: string
          id?: string
          inventory_item_id: string
          modifier_id: string
          unit: string
        }
        Update: {
          amount_delta?: number
          created_at?: string
          id?: string
          inventory_item_id?: string
          modifier_id?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "modifier_ingredient_deltas_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "modifier_ingredient_deltas_modifier_id_fkey"
            columns: ["modifier_id"]
            isOneToOne: false
            referencedRelation: "product_modifiers"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          is_depleted: boolean
          modifiers: Json | null
          notes: string | null
          order_id: string
          product_id: string
          quantity: number
          station_target: Database["public"]["Enums"]["station_target"]
          status: Database["public"]["Enums"]["item_status"]
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_depleted?: boolean
          modifiers?: Json | null
          notes?: string | null
          order_id: string
          product_id: string
          quantity?: number
          station_target?: Database["public"]["Enums"]["station_target"]
          status?: Database["public"]["Enums"]["item_status"]
          unit_price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_depleted?: boolean
          modifiers?: Json | null
          notes?: string | null
          order_id?: string
          product_id?: string
          quantity?: number
          station_target?: Database["public"]["Enums"]["station_target"]
          status?: Database["public"]["Enums"]["item_status"]
          unit_price?: number
          updated_at?: string
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
          created_at: string
          external_order_ref: string | null
          id: string
          order_channel: Database["public"]["Enums"]["order_channel"]
          order_number: string
          order_type: Database["public"]["Enums"]["order_type"]
          round_number: number
          status: Database["public"]["Enums"]["order_status"]
          tab_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          external_order_ref?: string | null
          id?: string
          order_channel?: Database["public"]["Enums"]["order_channel"]
          order_number: string
          order_type?: Database["public"]["Enums"]["order_type"]
          round_number?: number
          status?: Database["public"]["Enums"]["order_status"]
          tab_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          external_order_ref?: string | null
          id?: string
          order_channel?: Database["public"]["Enums"]["order_channel"]
          order_number?: string
          order_type?: Database["public"]["Enums"]["order_type"]
          round_number?: number
          status?: Database["public"]["Enums"]["order_status"]
          tab_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_tab_id_fkey"
            columns: ["tab_id"]
            isOneToOne: false
            referencedRelation: "tabs"
            referencedColumns: ["id"]
          },
        ]
      }
      print_jobs: {
        Row: {
          created_at: string
          id: string
          job_type: string
          printed_at: string | null
          receipt_data: Json
          status: Database["public"]["Enums"]["print_job_status"]
        }
        Insert: {
          created_at?: string
          id?: string
          job_type: string
          printed_at?: string | null
          receipt_data: Json
          status?: Database["public"]["Enums"]["print_job_status"]
        }
        Update: {
          created_at?: string
          id?: string
          job_type?: string
          printed_at?: string | null
          receipt_data?: Json
          status?: Database["public"]["Enums"]["print_job_status"]
        }
        Relationships: []
      }
      product_ingredients: {
        Row: {
          amount: number
          conversion_factor: number
          created_at: string
          id: string
          inventory_item_id: string
          product_id: string
          unit: string
        }
        Insert: {
          amount: number
          conversion_factor?: number
          created_at?: string
          id?: string
          inventory_item_id: string
          product_id: string
          unit: string
        }
        Update: {
          amount?: number
          conversion_factor?: number
          created_at?: string
          id?: string
          inventory_item_id?: string
          product_id?: string
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_ingredients_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_ingredients_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_modifiers: {
        Row: {
          created_at: string
          id: string
          name: string
          price_delta: number
          product_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          price_delta?: number
          product_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          price_delta?: number
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_modifiers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          allergens: string[] | null
          auto_86: boolean
          base_price: number
          category_id: string
          created_at: string
          description: string | null
          dietary: string[] | null
          id: string
          image_url: string | null
          is_available: boolean
          is_resold_outside_food: boolean
          name: string
          original_cost: number | null
          out_of_stock_reason: string | null
          station_target: Database["public"]["Enums"]["station_target"]
          updated_at: string
        }
        Insert: {
          allergens?: string[] | null
          auto_86?: boolean
          base_price: number
          category_id: string
          created_at?: string
          description?: string | null
          dietary?: string[] | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          is_resold_outside_food?: boolean
          name: string
          original_cost?: number | null
          out_of_stock_reason?: string | null
          station_target?: Database["public"]["Enums"]["station_target"]
          updated_at?: string
        }
        Update: {
          allergens?: string[] | null
          auto_86?: boolean
          base_price?: number
          category_id?: string
          created_at?: string
          description?: string | null
          dietary?: string[] | null
          id?: string
          image_url?: string | null
          is_available?: boolean
          is_resold_outside_food?: boolean
          name?: string
          original_cost?: number | null
          out_of_stock_reason?: string | null
          station_target?: Database["public"]["Enums"]["station_target"]
          updated_at?: string
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
      stock_movements: {
        Row: {
          balance_after: number
          balance_before: number
          change_amount: number
          created_at: string
          id: string
          inventory_item_id: string
          movement_type: Database["public"]["Enums"]["stock_movement_type"]
          reference_id: string | null
        }
        Insert: {
          balance_after: number
          balance_before?: number
          change_amount: number
          created_at?: string
          id?: string
          inventory_item_id: string
          movement_type: Database["public"]["Enums"]["stock_movement_type"]
          reference_id?: string | null
        }
        Update: {
          balance_after?: number
          balance_before?: number
          change_amount?: number
          created_at?: string
          id?: string
          inventory_item_id?: string
          movement_type?: Database["public"]["Enums"]["stock_movement_type"]
          reference_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      table_transfer_logs: {
        Row: {
          created_at: string
          id: string
          origin_table_id: string | null
          reason: string | null
          tab_id: string
          target_table_id: string | null
          transferred_by_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          origin_table_id?: string | null
          reason?: string | null
          tab_id: string
          target_table_id?: string | null
          transferred_by_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          origin_table_id?: string | null
          reason?: string | null
          tab_id?: string
          target_table_id?: string | null
          transferred_by_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "table_transfer_logs_origin_table_id_fkey"
            columns: ["origin_table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "table_transfer_logs_tab_id_fkey"
            columns: ["tab_id"]
            isOneToOne: false
            referencedRelation: "tabs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "table_transfer_logs_target_table_id_fkey"
            columns: ["target_table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "table_transfer_logs_transferred_by_id_fkey"
            columns: ["transferred_by_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tables: {
        Row: {
          capacity: number
          created_at: string
          id: string
          is_occupied: boolean
          table_number: string
          updated_at: string
          zone: Database["public"]["Enums"]["table_zone"]
        }
        Insert: {
          capacity?: number
          created_at?: string
          id?: string
          is_occupied?: boolean
          table_number: string
          updated_at?: string
          zone?: Database["public"]["Enums"]["table_zone"]
        }
        Update: {
          capacity?: number
          created_at?: string
          id?: string
          is_occupied?: boolean
          table_number?: string
          updated_at?: string
          zone?: Database["public"]["Enums"]["table_zone"]
        }
        Relationships: []
      }
      tabs: {
        Row: {
          corkage_amount: number
          created_at: string
          customer_name: string
          external_order_ref: string | null
          has_corkage_fee: boolean
          id: string
          opened_by_id: string | null
          operating_mode: Database["public"]["Enums"]["operating_mode"]
          order_channel: Database["public"]["Enums"]["order_channel"]
          order_type: Database["public"]["Enums"]["order_type"]
          rider_name: string | null
          status: Database["public"]["Enums"]["tab_status"]
          table_id: string | null
          transferred_at: string | null
          transferred_from_table_code: string | null
          updated_at: string
        }
        Insert: {
          corkage_amount?: number
          created_at?: string
          customer_name: string
          external_order_ref?: string | null
          has_corkage_fee?: boolean
          id?: string
          opened_by_id?: string | null
          operating_mode?: Database["public"]["Enums"]["operating_mode"]
          order_channel?: Database["public"]["Enums"]["order_channel"]
          order_type?: Database["public"]["Enums"]["order_type"]
          rider_name?: string | null
          status?: Database["public"]["Enums"]["tab_status"]
          table_id?: string | null
          transferred_at?: string | null
          transferred_from_table_code?: string | null
          updated_at?: string
        }
        Update: {
          corkage_amount?: number
          created_at?: string
          customer_name?: string
          external_order_ref?: string | null
          has_corkage_fee?: boolean
          id?: string
          opened_by_id?: string | null
          operating_mode?: Database["public"]["Enums"]["operating_mode"]
          order_channel?: Database["public"]["Enums"]["order_channel"]
          order_type?: Database["public"]["Enums"]["order_type"]
          rider_name?: string | null
          status?: Database["public"]["Enums"]["tab_status"]
          table_id?: string | null
          transferred_at?: string | null
          transferred_from_table_code?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tabs_opened_by_id_fkey"
            columns: ["opened_by_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tabs_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "tables"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          base_daily_rate: number
          created_at: string
          display_name: string
          id: string
          is_active: boolean
          is_workflow_staff: boolean
          pin: string
          role: Database["public"]["Enums"]["role"]
          updated_at: string
          username: string
        }
        Insert: {
          base_daily_rate?: number
          created_at?: string
          display_name: string
          id?: string
          is_active?: boolean
          is_workflow_staff?: boolean
          pin: string
          role?: Database["public"]["Enums"]["role"]
          updated_at?: string
          username: string
        }
        Update: {
          base_daily_rate?: number
          created_at?: string
          display_name?: string
          id?: string
          is_active?: boolean
          is_workflow_staff?: boolean
          pin?: string
          role?: Database["public"]["Enums"]["role"]
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      waste_logs: {
        Row: {
          cost_lost: number
          created_at: string
          id: string
          inventory_item_id: string
          quantity: number
          reason: Database["public"]["Enums"]["waste_reason"]
          reported_by_id: string | null
        }
        Insert: {
          cost_lost: number
          created_at?: string
          id?: string
          inventory_item_id: string
          quantity: number
          reason: Database["public"]["Enums"]["waste_reason"]
          reported_by_id?: string | null
        }
        Update: {
          cost_lost?: number
          created_at?: string
          id?: string
          inventory_item_id?: string
          quantity?: number
          reason?: Database["public"]["Enums"]["waste_reason"]
          reported_by_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "waste_logs_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waste_logs_reported_by_id_fkey"
            columns: ["reported_by_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      authenticate_staff_credentials: {
        Args: { p_username: string; p_pin: string }
        Returns: Json
      }
      authenticate_staff_pin: { Args: { p_pin: string }; Returns: Json }
      cancel_order_item_with_restoral: {
        Args: {
          p_order_item_id: string
          p_staff_id: string
          p_reason: string
        }
        Returns: Json
      }
      dispatch_order_with_depletion: {
        Args: { p_order_id: string }
        Returns: Json
      }
      settle_tab_and_record_payment: {
        Args: {
          p_tab_id: string
          p_staff_id?: string | null
          p_payment_method: Database["public"]["Enums"]["payment_method"]
          p_amount: number
          p_corkage_amount?: number
          p_discount_amount?: number
          p_tip_amount?: number
          p_notes?: string | null
        }
        Returns: Json
      }
      transfer_table_tab: {
        Args: {
          p_origin_table_id: string
          p_reason?: string | null
          p_staff_id?: string | null
          p_tab_id?: string | null
          p_target_table_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      allergen:
        | "DAIRY"
        | "GLUTEN"
        | "PEANUTS"
        | "TREE_NUTS"
        | "SHELLFISH"
        | "EGGS"
        | "SOY"
        | "FISH"
        | "SESAME"
      inventory_category:
        | "COFFEE_TEA"
        | "DAIRY_PLANT"
        | "SPIRITS_LIQUOR"
        | "WINE_BEER"
        | "SYRUPS_MIXERS"
        | "KITCHEN_MEAT"
        | "PRODUCE"
        | "DRY_GOODS"
        | "PACKAGING"
      item_status: "PENDING" | "PREPARING" | "READY" | "SERVED" | "CANCELLED"
      operating_mode: "CAFE" | "EVENT"
      order_channel:
        | "CAFE_AREA"
        | "BAR_AREA"
        | "TAKEOUT_COUNTER"
        | "GRAB_FOOD"
        | "FOODPANDA"
        | "OTHER_ONLINE"
      order_status:
        | "OPEN"
        | "IN_PREPARATION"
        | "READY_TO_SERVE"
        | "SERVED"
        | "COMPLETED"
        | "CANCELLED"
      order_type: "DINE_IN" | "TAKEOUT" | "ONLINE_DELIVERY"
      payment_method:
        | "CASH"
        | "CARD"
        | "DIGITAL_WALLET"
        | "GRAB_PAY_IN_APP"
        | "FOODPANDA_IN_APP"
        | "COMP"
      print_job_status: "PENDING" | "PRINTING" | "COMPLETED" | "FAILED"
      role:
        | "admin"
        | "cashier"
        | "waiter"
        | "station_bar"
        | "station_cafe"
        | "station_food"
        | "foh_runner"
        | "printer_station"
      station_target: "bar" | "kitchen"
      stock_movement_type:
        | "SALE_DEPLETION"
        | "RESTOCK_DELIVERY"
        | "SPOILAGE_WASTE"
        | "STOCKTAKE_ADJUST"
        | "CANCEL_RESTORE"
      tab_status: "OPEN" | "BILLED" | "CLOSED" | "CANCELLED"
      table_zone: "CAFE_AREA" | "BAR_AREA"
      waste_reason:
        | "DROPPED_SPILL"
        | "EXPIRED"
        | "PREPARATION_ERROR"
        | "CUSTOMER_RETURN"
        | "STAFF_TASTING"
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
      allergen: [
        "DAIRY",
        "GLUTEN",
        "PEANUTS",
        "TREE_NUTS",
        "SHELLFISH",
        "EGGS",
        "SOY",
        "FISH",
        "SESAME",
      ],
      inventory_category: [
        "COFFEE_TEA",
        "DAIRY_PLANT",
        "SPIRITS_LIQUOR",
        "WINE_BEER",
        "SYRUPS_MIXERS",
        "KITCHEN_MEAT",
        "PRODUCE",
        "DRY_GOODS",
        "PACKAGING",
      ],
      item_status: ["PENDING", "PREPARING", "READY", "SERVED", "CANCELLED"],
      operating_mode: ["CAFE", "EVENT"],
      order_channel: [
        "CAFE_AREA",
        "BAR_AREA",
        "TAKEOUT_COUNTER",
        "GRAB_FOOD",
        "FOODPANDA",
        "OTHER_ONLINE",
      ],
      order_status: [
        "OPEN",
        "IN_PREPARATION",
        "READY_TO_SERVE",
        "SERVED",
        "COMPLETED",
        "CANCELLED",
      ],
      order_type: ["DINE_IN", "TAKEOUT", "ONLINE_DELIVERY"],
      payment_method: [
        "CASH",
        "CARD",
        "DIGITAL_WALLET",
        "GRAB_PAY_IN_APP",
        "FOODPANDA_IN_APP",
        "COMP",
      ],
      print_job_status: ["PENDING", "PRINTING", "COMPLETED", "FAILED"],
      role: [
        "admin",
        "cashier",
        "waiter",
        "station_bar",
        "station_cafe",
        "station_food",
        "foh_runner",
        "printer_station",
      ],
      station_target: ["bar", "kitchen"],
      stock_movement_type: [
        "SALE_DEPLETION",
        "RESTOCK_DELIVERY",
        "SPOILAGE_WASTE",
        "STOCKTAKE_ADJUST",
        "CANCEL_RESTORE",
      ],
      tab_status: ["OPEN", "BILLED", "CLOSED", "CANCELLED"],
      table_zone: ["CAFE_AREA", "BAR_AREA"],
      waste_reason: [
        "DROPPED_SPILL",
        "EXPIRED",
        "PREPARATION_ERROR",
        "CUSTOMER_RETURN",
        "STAFF_TASTING",
      ],
    },
  },
} as const
