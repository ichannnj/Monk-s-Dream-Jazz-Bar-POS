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
          clock_in_at: string | null
          clock_out_at: string | null
          created_at: string
          date: string
          hours_worked: number
          id: string
          is_present: boolean
          notes: string | null
          shift_status: string
          total_day_pay: number
          updated_at: string
          user_id: string
        }
        Insert: {
          addon_pay?: number
          base_daily_pay?: number
          clock_in_at?: string | null
          clock_out_at?: string | null
          created_at?: string
          date: string
          hours_worked?: number
          id?: string
          is_present?: boolean
          notes?: string | null
          shift_status?: string
          total_day_pay?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          addon_pay?: number
          base_daily_pay?: number
          clock_in_at?: string | null
          clock_out_at?: string | null
          created_at?: string
          date?: string
          hours_worked?: number
          id?: string
          is_present?: boolean
          notes?: string | null
          shift_status?: string
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
      cash_drawer_transactions: {
        Row: {
          action_type: Database["public"]["Enums"]["cash_drawer_action_type"]
          amount: number
          created_at: string
          drawer_target: string
          id: string
          payment_id: string | null
          performed_by_id: string | null
          reason: string
        }
        Insert: {
          action_type: Database["public"]["Enums"]["cash_drawer_action_type"]
          amount: number
          created_at?: string
          drawer_target?: string
          id?: string
          payment_id?: string | null
          performed_by_id?: string | null
          reason: string
        }
        Update: {
          action_type?: Database["public"]["Enums"]["cash_drawer_action_type"]
          amount?: number
          created_at?: string
          drawer_target?: string
          id?: string
          payment_id?: string | null
          performed_by_id?: string | null
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_drawer_transactions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cash_drawer_transactions_performed_by_id_fkey"
            columns: ["performed_by_id"]
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
      chat_conversations: {
        Row: {
          avatar_text: string
          created_at: string
          id: string
          pinned_at: string | null
          pinned_author: string | null
          pinned_text: string | null
          slug: string | null
          subtitle: string | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          avatar_text: string
          created_at?: string
          id?: string
          pinned_at?: string | null
          pinned_author?: string | null
          pinned_text?: string | null
          slug?: string | null
          subtitle?: string | null
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          avatar_text?: string
          created_at?: string
          id?: string
          pinned_at?: string | null
          pinned_author?: string | null
          pinned_text?: string | null
          slug?: string | null
          subtitle?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          is_read: boolean
          is_system: boolean
          message: string
          read_at: string | null
          sender_id: string | null
          sender_name: string
          sender_role: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          is_system?: boolean
          message: string
          read_at?: string | null
          sender_id?: string | null
          sender_name: string
          sender_role: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          is_system?: boolean
          message?: string
          read_at?: string | null
          sender_id?: string | null
          sender_name?: string
          sender_role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_participants: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          last_read_at: string
          user_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          last_read_at?: string
          user_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          last_read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
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
          supplier_id: string | null
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
          supplier_id?: string | null
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
          supplier_id?: string | null
          supplier_name?: string | null
          unit?: string
          unit_cost?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      modifier_groups: {
        Row: {
          created_at: string
          id: string
          is_required: boolean
          max_selections: number
          min_selections: number
          name: string
          product_id: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_required?: boolean
          max_selections?: number
          min_selections?: number
          name: string
          product_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_required?: boolean
          max_selections?: number
          min_selections?: number
          name?: string
          product_id?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "modifier_groups_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
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
      payments: {
        Row: {
          amount: number
          corkage_amount: number
          created_at: string
          discount_amount: number
          drawer_target: string
          id: string
          notes: string | null
          operating_mode: Database["public"]["Enums"]["operating_mode"]
          payment_channel: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          reference_number: string | null
          staff_id: string | null
          tab_id: string
          tip_amount: number
        }
        Insert: {
          amount: number
          corkage_amount?: number
          created_at?: string
          discount_amount?: number
          drawer_target?: string
          id?: string
          notes?: string | null
          operating_mode?: Database["public"]["Enums"]["operating_mode"]
          payment_channel?: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          reference_number?: string | null
          staff_id?: string | null
          tab_id: string
          tip_amount?: number
        }
        Update: {
          amount?: number
          corkage_amount?: number
          created_at?: string
          discount_amount?: number
          drawer_target?: string
          id?: string
          notes?: string | null
          operating_mode?: Database["public"]["Enums"]["operating_mode"]
          payment_channel?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          reference_number?: string | null
          staff_id?: string | null
          tab_id?: string
          tip_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "payments_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_tab_id_fkey"
            columns: ["tab_id"]
            isOneToOne: false
            referencedRelation: "tabs"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_y_readings: {
        Row: {
          cafe_net_sales: number
          cafe_tx_count: number
          cash_in: number
          cash_out: number
          closed_at: string
          counted_cash: number
          created_at: string
          discount_total: number
          drawer_target: string
          event_net_sales: number
          event_tx_count: number
          expected_cash: number
          first_payment_id: string | null
          first_receipt_no: string | null
          gross_sales: number
          id: string
          incoming_staff_name: string
          last_payment_id: string | null
          last_receipt_no: string | null
          metadata: Json
          net_sales: number
          notes: string | null
          opened_at: string
          opening_float: number
          outgoing_staff_id: string | null
          outgoing_staff_name: string
          safe_drops: number
          service_charge: number
          tender_card: number
          tender_cash: number
          tender_delivery: number
          tender_digital: number
          total_tender: number
          transaction_count: number
          variance: number
          vat_amount: number
          vatable_sales: number
          y_number: number
        }
        Insert: {
          cafe_net_sales?: number
          cafe_tx_count?: number
          cash_in?: number
          cash_out?: number
          closed_at?: string
          counted_cash?: number
          created_at?: string
          discount_total?: number
          drawer_target?: string
          event_net_sales?: number
          event_tx_count?: number
          expected_cash?: number
          first_payment_id?: string | null
          first_receipt_no?: string | null
          gross_sales?: number
          id?: string
          incoming_staff_name?: string
          last_payment_id?: string | null
          last_receipt_no?: string | null
          metadata?: Json
          net_sales?: number
          notes?: string | null
          opened_at: string
          opening_float?: number
          outgoing_staff_id?: string | null
          outgoing_staff_name: string
          safe_drops?: number
          service_charge?: number
          tender_card?: number
          tender_cash?: number
          tender_delivery?: number
          tender_digital?: number
          total_tender?: number
          transaction_count?: number
          variance?: number
          vat_amount?: number
          vatable_sales?: number
          y_number?: never
        }
        Update: {
          cafe_net_sales?: number
          cafe_tx_count?: number
          cash_in?: number
          cash_out?: number
          closed_at?: string
          counted_cash?: number
          created_at?: string
          discount_total?: number
          drawer_target?: string
          event_net_sales?: number
          event_tx_count?: number
          expected_cash?: number
          first_payment_id?: string | null
          first_receipt_no?: string | null
          gross_sales?: number
          id?: string
          incoming_staff_name?: string
          last_payment_id?: string | null
          last_receipt_no?: string | null
          metadata?: Json
          net_sales?: number
          notes?: string | null
          opened_at?: string
          opening_float?: number
          outgoing_staff_id?: string | null
          outgoing_staff_name?: string
          safe_drops?: number
          service_charge?: number
          tender_card?: number
          tender_cash?: number
          tender_delivery?: number
          tender_digital?: number
          total_tender?: number
          transaction_count?: number
          variance?: number
          vat_amount?: number
          vatable_sales?: number
          y_number?: never
        }
        Relationships: [
          {
            foreignKeyName: "pos_y_readings_first_payment_id_fkey"
            columns: ["first_payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_y_readings_last_payment_id_fkey"
            columns: ["last_payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_y_readings_outgoing_staff_id_fkey"
            columns: ["outgoing_staff_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      pos_z_readings: {
        Row: {
          cafe_net_sales: number
          cafe_tx_count: number
          cash_in: number
          cash_out: number
          closed_at: string
          counted_cash: number
          created_at: string
          discount_total: number
          drawer_target: string
          event_net_sales: number
          event_tx_count: number
          expected_cash: number
          first_payment_id: string | null
          first_receipt_no: string | null
          gross_sales: number
          guest_count: number
          id: string
          last_payment_id: string | null
          last_receipt_no: string | null
          metadata: Json
          net_sales: number
          notes: string | null
          opened_at: string
          opening_float: number
          performed_by: string | null
          performed_by_name: string
          safe_drops: number
          service_charge: number
          tender_card: number
          tender_cash: number
          tender_delivery: number
          tender_digital: number
          total_tender: number
          transaction_count: number
          variance: number
          vat_amount: number
          vat_exempt_sales: number
          vatable_sales: number
          z_number: number
        }
        Insert: {
          cafe_net_sales?: number
          cafe_tx_count?: number
          cash_in?: number
          cash_out?: number
          closed_at?: string
          counted_cash?: number
          created_at?: string
          discount_total?: number
          drawer_target?: string
          event_net_sales?: number
          event_tx_count?: number
          expected_cash?: number
          first_payment_id?: string | null
          first_receipt_no?: string | null
          gross_sales?: number
          guest_count?: number
          id?: string
          last_payment_id?: string | null
          last_receipt_no?: string | null
          metadata?: Json
          net_sales?: number
          notes?: string | null
          opened_at: string
          opening_float?: number
          performed_by?: string | null
          performed_by_name?: string
          safe_drops?: number
          service_charge?: number
          tender_card?: number
          tender_cash?: number
          tender_delivery?: number
          tender_digital?: number
          total_tender?: number
          transaction_count?: number
          variance?: number
          vat_amount?: number
          vat_exempt_sales?: number
          vatable_sales?: number
          z_number?: never
        }
        Update: {
          cafe_net_sales?: number
          cafe_tx_count?: number
          cash_in?: number
          cash_out?: number
          closed_at?: string
          counted_cash?: number
          created_at?: string
          discount_total?: number
          drawer_target?: string
          event_net_sales?: number
          event_tx_count?: number
          expected_cash?: number
          first_payment_id?: string | null
          first_receipt_no?: string | null
          gross_sales?: number
          guest_count?: number
          id?: string
          last_payment_id?: string | null
          last_receipt_no?: string | null
          metadata?: Json
          net_sales?: number
          notes?: string | null
          opened_at?: string
          opening_float?: number
          performed_by?: string | null
          performed_by_name?: string
          safe_drops?: number
          service_charge?: number
          tender_card?: number
          tender_cash?: number
          tender_delivery?: number
          tender_digital?: number
          total_tender?: number
          transaction_count?: number
          variance?: number
          vat_amount?: number
          vat_exempt_sales?: number
          vatable_sales?: number
          z_number?: never
        }
        Relationships: [
          {
            foreignKeyName: "pos_z_readings_first_payment_id_fkey"
            columns: ["first_payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_z_readings_last_payment_id_fkey"
            columns: ["last_payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pos_z_readings_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "users"
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
      product_media_uploads: {
        Row: {
          bucket_id: string
          created_at: string
          height: number | null
          id: string
          mime_type: string
          original_filename: string | null
          product_id: string
          public_url: string
          size_bytes: number
          storage_path: string
          uploaded_by: string | null
          width: number | null
        }
        Insert: {
          bucket_id?: string
          created_at?: string
          height?: number | null
          id?: string
          mime_type: string
          original_filename?: string | null
          product_id: string
          public_url: string
          size_bytes: number
          storage_path: string
          uploaded_by?: string | null
          width?: number | null
        }
        Update: {
          bucket_id?: string
          created_at?: string
          height?: number | null
          id?: string
          mime_type?: string
          original_filename?: string | null
          product_id?: string
          public_url?: string
          size_bytes?: number
          storage_path?: string
          uploaded_by?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_media_uploads_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_media_uploads_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      product_modifiers: {
        Row: {
          amount_delta: number
          created_at: string
          group_id: string | null
          id: string
          inventory_item_id: string | null
          name: string
          price_delta: number
          product_id: string | null
          unit: string | null
        }
        Insert: {
          amount_delta?: number
          created_at?: string
          group_id?: string | null
          id?: string
          inventory_item_id?: string | null
          name: string
          price_delta?: number
          product_id?: string | null
          unit?: string | null
        }
        Update: {
          amount_delta?: number
          created_at?: string
          group_id?: string | null
          id?: string
          inventory_item_id?: string | null
          name?: string
          price_delta?: number
          product_id?: string | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_modifiers_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "modifier_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_modifiers_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
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
          image_mime_type: string | null
          image_size_bytes: number | null
          image_storage_path: string | null
          image_updated_at: string | null
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
          image_mime_type?: string | null
          image_size_bytes?: number | null
          image_storage_path?: string | null
          image_updated_at?: string | null
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
          image_mime_type?: string | null
          image_size_bytes?: number | null
          image_storage_path?: string | null
          image_updated_at?: string | null
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
      station_status: {
        Row: {
          active_user_id: string | null
          created_at: string
          is_online: boolean
          last_heartbeat: string | null
          name: string
          station_key: string
          updated_at: string
        }
        Insert: {
          active_user_id?: string | null
          created_at?: string
          is_online?: boolean
          last_heartbeat?: string | null
          name: string
          station_key: string
          updated_at?: string
        }
        Update: {
          active_user_id?: string | null
          created_at?: string
          is_online?: boolean
          last_heartbeat?: string | null
          name?: string
          station_key?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "station_status_active_user_id_fkey"
            columns: ["active_user_id"]
            isOneToOne: false
            referencedRelation: "users"
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
      stocktake_items: {
        Row: {
          actual_quantity: number
          created_at: string
          expected_quantity: number
          id: string
          inventory_item_id: string
          session_id: string
          unit_cost: number
          variance_cost: number
          variance_quantity: number
        }
        Insert: {
          actual_quantity: number
          created_at?: string
          expected_quantity: number
          id?: string
          inventory_item_id: string
          session_id: string
          unit_cost: number
          variance_cost: number
          variance_quantity: number
        }
        Update: {
          actual_quantity?: number
          created_at?: string
          expected_quantity?: number
          id?: string
          inventory_item_id?: string
          session_id?: string
          unit_cost?: number
          variance_cost?: number
          variance_quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "stocktake_items_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stocktake_items_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "stocktake_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      stocktake_sessions: {
        Row: {
          conducted_by_id: string | null
          created_at: string
          id: string
          notes: string | null
          status: string
          total_variance_cost: number
        }
        Insert: {
          conducted_by_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          status?: string
          total_variance_cost?: number
        }
        Update: {
          conducted_by_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          status?: string
          total_variance_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "stocktake_sessions_conducted_by_id_fkey"
            columns: ["conducted_by_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          lead_time_days: number
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          lead_time_days?: number
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          lead_time_days?: number
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
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
          is_prepaid: boolean
          notes: string | null
          opened_by_id: string | null
          operating_mode: Database["public"]["Enums"]["operating_mode"]
          order_channel: Database["public"]["Enums"]["order_channel"]
          order_type: Database["public"]["Enums"]["order_type"]
          rider_name: string | null
          status: Database["public"]["Enums"]["tab_status"]
          table_id: string | null
          ticket_number: string | null
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
          is_prepaid?: boolean
          notes?: string | null
          opened_by_id?: string | null
          operating_mode?: Database["public"]["Enums"]["operating_mode"]
          order_channel?: Database["public"]["Enums"]["order_channel"]
          order_type?: Database["public"]["Enums"]["order_type"]
          rider_name?: string | null
          status?: Database["public"]["Enums"]["tab_status"]
          table_id?: string | null
          ticket_number?: string | null
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
          is_prepaid?: boolean
          notes?: string | null
          opened_by_id?: string | null
          operating_mode?: Database["public"]["Enums"]["operating_mode"]
          order_channel?: Database["public"]["Enums"]["order_channel"]
          order_type?: Database["public"]["Enums"]["order_type"]
          rider_name?: string | null
          status?: Database["public"]["Enums"]["tab_status"]
          table_id?: string | null
          ticket_number?: string | null
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
          avatar_url: string | null
          base_daily_rate: number
          created_at: string
          display_name: string
          email: string | null
          id: string
          is_active: boolean
          is_workflow_staff: boolean
          job_title: string | null
          last_login_at: string | null
          password_hash: string | null
          password_updated_at: string | null
          phone: string | null
          pin: string | null
          pin_hash: string | null
          pin_updated_at: string | null
          role: Database["public"]["Enums"]["role"]
          updated_at: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          base_daily_rate?: number
          created_at?: string
          display_name: string
          email?: string | null
          id?: string
          is_active?: boolean
          is_workflow_staff?: boolean
          job_title?: string | null
          last_login_at?: string | null
          password_hash?: string | null
          password_updated_at?: string | null
          phone?: string | null
          pin?: string | null
          pin_hash?: string | null
          pin_updated_at?: string | null
          role?: Database["public"]["Enums"]["role"]
          updated_at?: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          base_daily_rate?: number
          created_at?: string
          display_name?: string
          email?: string | null
          id?: string
          is_active?: boolean
          is_workflow_staff?: boolean
          job_title?: string | null
          last_login_at?: string | null
          password_hash?: string | null
          password_updated_at?: string | null
          phone?: string | null
          pin?: string | null
          pin_hash?: string | null
          pin_updated_at?: string | null
          role?: Database["public"]["Enums"]["role"]
          updated_at?: string
          username?: string
        }
        Relationships: []
      }
      venue_events: {
        Row: {
          created_at: string
          description: string | null
          end_time: string | null
          event_date: string
          gear_requirements: string | null
          genre: string | null
          id: string
          performer_name: string | null
          poster_storage_path: string | null
          poster_url: string | null
          reserved_tables: string | null
          sound_check_time: string | null
          special_requests: string | null
          start_time: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_time?: string | null
          event_date: string
          gear_requirements?: string | null
          genre?: string | null
          id?: string
          performer_name?: string | null
          poster_storage_path?: string | null
          poster_url?: string | null
          reserved_tables?: string | null
          sound_check_time?: string | null
          special_requests?: string | null
          start_time: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_time?: string | null
          event_date?: string
          gear_requirements?: string | null
          genre?: string | null
          id?: string
          performer_name?: string | null
          poster_storage_path?: string | null
          poster_url?: string | null
          reserved_tables?: string | null
          sound_check_time?: string | null
          special_requests?: string | null
          start_time?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      venue_qr_payment_channels: {
        Row: {
          account_name: string
          account_number: string
          channel_code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          qr_image_url: string
          qr_storage_path: string | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          account_name: string
          account_number: string
          channel_code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          qr_image_url: string
          qr_storage_path?: string | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          account_name?: string
          account_number?: string
          channel_code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          qr_image_url?: string
          qr_storage_path?: string | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      venue_settings: {
        Row: {
          daily_overhead_cost: number
          discounts_config: Json
          id: string
          mode_switched_at: string
          operating_mode: Database["public"]["Enums"]["operating_mode"]
          printer_routing_config: Json
          service_charge_enabled: boolean
          service_charge_rate: number
          updated_at: string
          vat_inclusive: boolean
          vat_rate: number
          venue_name: string
        }
        Insert: {
          daily_overhead_cost?: number
          discounts_config?: Json
          id?: string
          mode_switched_at?: string
          operating_mode?: Database["public"]["Enums"]["operating_mode"]
          printer_routing_config?: Json
          service_charge_enabled?: boolean
          service_charge_rate?: number
          updated_at?: string
          vat_inclusive?: boolean
          vat_rate?: number
          venue_name?: string
        }
        Update: {
          daily_overhead_cost?: number
          discounts_config?: Json
          id?: string
          mode_switched_at?: string
          operating_mode?: Database["public"]["Enums"]["operating_mode"]
          printer_routing_config?: Json
          service_charge_enabled?: boolean
          service_charge_rate?: number
          updated_at?: string
          vat_inclusive?: boolean
          vat_rate?: number
          venue_name?: string
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
      admin_force_release_table: { Args: { p_table_id: string }; Returns: Json }
      admin_upsert_attendance_record: {
        Args: {
          p_addon_pay: number
          p_base_daily_pay: number
          p_date: string
          p_is_present: boolean
          p_notes?: string
          p_shift_status: string
          p_user_id: string
        }
        Returns: Json
      }
      authenticate_admin_credentials: {
        Args: { p_identifier: string; p_password: string }
        Returns: Json
      }
      authenticate_staff_credentials: {
        Args: { p_pin: string; p_username: string }
        Returns: Json
      }
      authenticate_staff_pin: { Args: { p_pin: string }; Returns: Json }
      cancel_order_item_with_restoral: {
        Args: { p_order_item_id: string; p_reason: string; p_staff_id: string }
        Returns: Json
      }
      change_admin_override_pin: {
        Args: {
          p_current_password: string
          p_new_pin: string
          p_user_id: string
        }
        Returns: Json
      }
      change_admin_password: {
        Args: {
          p_current_password: string
          p_new_password: string
          p_user_id: string
        }
        Returns: Json
      }
      check_unsettled_tabs: { Args: { p_drawer?: string }; Returns: Json }
      close_shift_and_generate_y_reading: {
        Args: {
          p_counted_cash?: number
          p_drawer?: string
          p_incoming_staff_name?: string
          p_notes?: string
          p_outgoing_staff_id?: string
        }
        Returns: Json
      }
      close_shift_and_generate_z_reading: {
        Args: {
          p_counted_cash?: number
          p_drawer?: string
          p_notes?: string
          p_performed_by?: string
        }
        Returns: Json
      }
      complete_off_premise_tab: {
        Args: { p_staff_id?: string; p_tab_id: string }
        Returns: Json
      }
      create_staff_account_with_secrets: {
        Args: {
          p_base_daily_rate?: number
          p_display_name: string
          p_email?: string
          p_job_title?: string
          p_password?: string
          p_phone?: string
          p_pin: string
          p_role: string
          p_username: string
        }
        Returns: Json
      }
      dispatch_order_with_depletion: {
        Args: { p_order_id: string }
        Returns: Json
      }
      get_current_x_reading:
        | { Args: { p_drawer?: string }; Returns: Json }
        | { Args: { p_drawer?: string; p_scope?: string }; Returns: Json }
      intake_inventory_restock: {
        Args: {
          p_inventory_item_id: string
          p_invoice_number?: string
          p_invoice_unit_cost: number
          p_quantity: number
          p_supplier_name?: string
        }
        Returns: Json
      }
      log_inventory_waste: {
        Args: {
          p_inventory_item_id: string
          p_quantity: number
          p_reason: Database["public"]["Enums"]["waste_reason"]
          p_reported_by_id?: string
        }
        Returns: Json
      }
      punch_staff_timeclock: {
        Args: { p_action?: string; p_pin: string; p_username: string }
        Returns: Json
      }
      reconcile_operating_mode_6am: { Args: never; Returns: Json }
      record_pos_staff_logout_punch: {
        Args: { p_user_id: string }
        Returns: Json
      }
      record_product_image_upload: {
        Args: {
          p_height?: number
          p_mime_type?: string
          p_original_filename?: string
          p_product_id: string
          p_public_url: string
          p_size_bytes?: number
          p_storage_path: string
          p_uploaded_by?: string
          p_width?: number
        }
        Returns: Json
      }
      report_station_heartbeat: {
        Args: {
          p_is_online?: boolean
          p_station_key: string
          p_user_id?: string
        }
        Returns: Json
      }
      settle_tab_and_record_payment: {
        Args: {
          p_amount: number
          p_corkage_amount?: number
          p_discount_amount?: number
          p_keep_open_for_prep?: boolean
          p_notes?: string
          p_payment_channel?: string
          p_payment_method: Database["public"]["Enums"]["payment_method"]
          p_reference_number?: string
          p_staff_id: string
          p_tab_id: string
          p_tip_amount?: number
        }
        Returns: Json
      }
      submit_stocktake_session: {
        Args: { p_conducted_by_id: string; p_items: Json; p_notes: string }
        Returns: Json
      }
      transfer_table_tab: {
        Args: {
          p_origin_table_id: string
          p_reason?: string
          p_staff_id?: string
          p_tab_id?: string
          p_target_table_id: string
        }
        Returns: Json
      }
      update_admin_profile: {
        Args: {
          p_display_name: string
          p_email?: string
          p_job_title?: string
          p_phone?: string
          p_user_id: string
          p_username: string
        }
        Returns: Json
      }
      update_product_image: {
        Args: { p_image_url: string; p_product_id: string }
        Returns: Json
      }
      verify_manager_override_pin: { Args: { p_pin: string }; Returns: Json }
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
      cash_drawer_action_type:
        | "FLOAT"
        | "CASH_IN"
        | "CASH_OUT"
        | "DROP"
        | "SALE"
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
      cash_drawer_action_type: ["FLOAT", "CASH_IN", "CASH_OUT", "DROP", "SALE"],
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
