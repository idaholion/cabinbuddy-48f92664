export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      bulk_operation_audit: {
        Row: {
          details: Json | null
          id: string
          operation_type: string
          organization_id: string | null
          performed_at: string | null
          performed_by_user_id: string | null
          records_affected: number | null
        }
        Insert: {
          details?: Json | null
          id?: string
          operation_type: string
          organization_id?: string | null
          performed_at?: string | null
          performed_by_user_id?: string | null
          records_affected?: number | null
        }
        Update: {
          details?: Json | null
          id?: string
          operation_type?: string
          organization_id?: string | null
          performed_at?: string | null
          performed_by_user_id?: string | null
          records_affected?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_bulk_operation_audit_organization"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_keeper_requests: {
        Row: {
          calendar_keeper_response: string | null
          category: string
          created_at: string
          description: string
          id: string
          organization_id: string
          requester_email: string
          requester_family_group: string
          requester_name: string
          requester_user_id: string | null
          responded_at: string | null
          responded_by: string | null
          status: string
          subject: string
          updated_at: string
          urgency: string
        }
        Insert: {
          calendar_keeper_response?: string | null
          category?: string
          created_at?: string
          description: string
          id?: string
          organization_id: string
          requester_email: string
          requester_family_group: string
          requester_name: string
          requester_user_id?: string | null
          responded_at?: string | null
          responded_by?: string | null
          status?: string
          subject: string
          updated_at?: string
          urgency?: string
        }
        Update: {
          calendar_keeper_response?: string | null
          category?: string
          created_at?: string
          description?: string
          id?: string
          organization_id?: string
          requester_email?: string
          requester_family_group?: string
          requester_name?: string
          requester_user_id?: string | null
          responded_at?: string | null
          responded_by?: string | null
          status?: string
          subject?: string
          updated_at?: string
          urgency?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_calendar_keeper_requests_organization"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      checkin_sessions: {
        Row: {
          check_date: string
          checklist_responses: Json
          completed_at: string | null
          created_at: string
          family_group: string | null
          guest_names: string[] | null
          id: string
          notes: string | null
          organization_id: string
          session_type: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          check_date: string
          checklist_responses?: Json
          completed_at?: string | null
          created_at?: string
          family_group?: string | null
          guest_names?: string[] | null
          id?: string
          notes?: string | null
          organization_id: string
          session_type: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          check_date?: string
          checklist_responses?: Json
          completed_at?: string | null
          created_at?: string
          family_group?: string | null
          guest_names?: string[] | null
          id?: string
          notes?: string | null
          organization_id?: string
          session_type?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "checkin_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_checkin_sessions_organization"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_checklists: {
        Row: {
          checklist_type: string
          created_at: string
          id: string
          items: Json
          organization_id: string
          updated_at: string
        }
        Insert: {
          checklist_type: string
          created_at?: string
          id?: string
          items?: Json
          organization_id: string
          updated_at?: string
        }
        Update: {
          checklist_type?: string
          created_at?: string
          id?: string
          items?: Json
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_checklists_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_custom_checklists_organization"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      family_groups: {
        Row: {
          alternate_lead_id: string | null
          color: string | null
          created_at: string
          host_members: Json | null
          id: string
          lead_email: string | null
          lead_name: string | null
          lead_phone: string | null
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          alternate_lead_id?: string | null
          color?: string | null
          created_at?: string
          host_members?: Json | null
          id?: string
          lead_email?: string | null
          lead_name?: string | null
          lead_phone?: string | null
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          alternate_lead_id?: string | null
          color?: string | null
          created_at?: string
          host_members?: Json | null
          id?: string
          lead_email?: string | null
          lead_name?: string | null
          lead_phone?: string | null
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_groups_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_family_groups_organization"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_log: {
        Row: {
          email_sent: boolean | null
          family_group: string
          id: string
          notification_type: string
          organization_id: string
          reservation_period_id: string | null
          sent_at: string
          sms_sent: boolean | null
        }
        Insert: {
          email_sent?: boolean | null
          family_group: string
          id?: string
          notification_type: string
          organization_id: string
          reservation_period_id?: string | null
          sent_at?: string
          sms_sent?: boolean | null
        }
        Update: {
          email_sent?: boolean | null
          family_group?: string
          id?: string
          notification_type?: string
          organization_id?: string
          reservation_period_id?: string | null
          sent_at?: string
          sms_sent?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_notification_log_organization"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_access_audit: {
        Row: {
          access_type: string
          attempted_organization_id: string | null
          created_at: string
          error_message: string | null
          id: string
          operation_type: string
          success: boolean
          table_name: string
          user_id: string | null
          user_organization_id: string | null
        }
        Insert: {
          access_type: string
          attempted_organization_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          operation_type: string
          success?: boolean
          table_name: string
          user_id?: string | null
          user_organization_id?: string | null
        }
        Update: {
          access_type?: string
          attempted_organization_id?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          operation_type?: string
          success?: boolean
          table_name?: string
          user_id?: string | null
          user_organization_id?: string | null
        }
        Relationships: []
      }
      organizations: {
        Row: {
          admin_email: string | null
          admin_name: string | null
          admin_phone: string | null
          alternate_supervisor_email: string | null
          calendar_keeper_email: string | null
          calendar_keeper_name: string | null
          calendar_keeper_phone: string | null
          code: string
          created_at: string
          id: string
          name: string
          treasurer_email: string | null
          treasurer_name: string | null
          treasurer_phone: string | null
          updated_at: string
        }
        Insert: {
          admin_email?: string | null
          admin_name?: string | null
          admin_phone?: string | null
          alternate_supervisor_email?: string | null
          calendar_keeper_email?: string | null
          calendar_keeper_name?: string | null
          calendar_keeper_phone?: string | null
          code: string
          created_at?: string
          id?: string
          name: string
          treasurer_email?: string | null
          treasurer_name?: string | null
          treasurer_phone?: string | null
          updated_at?: string
        }
        Update: {
          admin_email?: string | null
          admin_name?: string | null
          admin_phone?: string | null
          alternate_supervisor_email?: string | null
          calendar_keeper_email?: string | null
          calendar_keeper_name?: string | null
          calendar_keeper_phone?: string | null
          code?: string
          created_at?: string
          id?: string
          name?: string
          treasurer_email?: string | null
          treasurer_name?: string | null
          treasurer_phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          family_role: string | null
          first_name: string | null
          id: string
          last_name: string | null
          organization_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          family_role?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          organization_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          family_role?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          organization_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      receipts: {
        Row: {
          amount: number
          created_at: string
          date: string
          description: string
          family_group: string | null
          id: string
          image_url: string | null
          organization_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          date: string
          description: string
          family_group?: string | null
          id?: string
          image_url?: string | null
          organization_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          description?: string
          family_group?: string | null
          id?: string
          image_url?: string | null
          organization_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_receipts_organization"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "receipts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_bills: {
        Row: {
          account_number: string | null
          amount: number | null
          category: string
          created_at: string
          due_date: string | null
          frequency: string
          id: string
          name: string
          notes: string | null
          organization_id: string
          phone_number: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          account_number?: string | null
          amount?: number | null
          category: string
          created_at?: string
          due_date?: string | null
          frequency?: string
          id?: string
          name: string
          notes?: string | null
          organization_id: string
          phone_number?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          account_number?: string | null
          amount?: number | null
          category?: string
          created_at?: string
          due_date?: string | null
          frequency?: string
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string
          phone_number?: string | null
          updated_at?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_recurring_bills_organization"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      reservation_periods: {
        Row: {
          created_at: string
          current_family_group: string
          current_group_index: number
          id: string
          organization_id: string
          reservations_completed: boolean | null
          rotation_year: number
          selection_end_date: string
          selection_start_date: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_family_group: string
          current_group_index: number
          id?: string
          organization_id: string
          reservations_completed?: boolean | null
          rotation_year: number
          selection_end_date: string
          selection_start_date: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_family_group?: string
          current_group_index?: number
          id?: string
          organization_id?: string
          reservations_completed?: boolean | null
          rotation_year?: number
          selection_end_date?: string
          selection_start_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_reservation_periods_organization"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      reservation_settings: {
        Row: {
          address: string | null
          bathrooms: number | null
          bedrooms: number | null
          cleaning_fee: number | null
          created_at: string
          damage_deposit: number | null
          financial_method: string | null
          id: string
          max_guests: number | null
          nightly_rate: number | null
          organization_id: string
          pet_fee: number | null
          property_name: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          cleaning_fee?: number | null
          created_at?: string
          damage_deposit?: number | null
          financial_method?: string | null
          id?: string
          max_guests?: number | null
          nightly_rate?: number | null
          organization_id: string
          pet_fee?: number | null
          property_name?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          cleaning_fee?: number | null
          created_at?: string
          damage_deposit?: number | null
          financial_method?: string | null
          id?: string
          max_guests?: number | null
          nightly_rate?: number | null
          organization_id?: string
          pet_fee?: number | null
          property_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_reservation_settings_organization"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          allocated_end_date: string | null
          allocated_start_date: string | null
          created_at: string
          end_date: string
          family_group: string
          guest_count: number | null
          host_assignments: Json | null
          id: string
          nights_used: number | null
          organization_id: string
          property_name: string | null
          start_date: string
          status: string | null
          time_period_number: number | null
          total_cost: number | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          allocated_end_date?: string | null
          allocated_start_date?: string | null
          created_at?: string
          end_date: string
          family_group: string
          guest_count?: number | null
          host_assignments?: Json | null
          id?: string
          nights_used?: number | null
          organization_id: string
          property_name?: string | null
          start_date: string
          status?: string | null
          time_period_number?: number | null
          total_cost?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          allocated_end_date?: string | null
          allocated_start_date?: string | null
          created_at?: string
          end_date?: string
          family_group?: string
          guest_count?: number | null
          host_assignments?: Json | null
          id?: string
          nights_used?: number | null
          organization_id?: string
          property_name?: string | null
          start_date?: string
          status?: string | null
          time_period_number?: number | null
          total_cost?: number | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_reservations_organization"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      rotation_orders: {
        Row: {
          created_at: string
          enable_secondary_selection: boolean | null
          first_last_option: string | null
          id: string
          max_nights: number | null
          max_time_slots: number | null
          organization_id: string
          rotation_order: Json
          rotation_year: number
          secondary_max_periods: number | null
          selection_days: number | null
          start_day: string | null
          start_month: string | null
          start_time: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          enable_secondary_selection?: boolean | null
          first_last_option?: string | null
          id?: string
          max_nights?: number | null
          max_time_slots?: number | null
          organization_id: string
          rotation_order?: Json
          rotation_year: number
          secondary_max_periods?: number | null
          selection_days?: number | null
          start_day?: string | null
          start_month?: string | null
          start_time?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          enable_secondary_selection?: boolean | null
          first_last_option?: string | null
          id?: string
          max_nights?: number | null
          max_time_slots?: number | null
          organization_id?: string
          rotation_order?: Json
          rotation_year?: number
          secondary_max_periods?: number | null
          selection_days?: number | null
          start_day?: string | null
          start_month?: string | null
          start_time?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_rotation_orders_organization"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      secondary_selection_status: {
        Row: {
          created_at: string | null
          current_family_group: string | null
          current_group_index: number | null
          id: string
          organization_id: string
          rotation_year: number
          started_at: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          current_family_group?: string | null
          current_group_index?: number | null
          id?: string
          organization_id: string
          rotation_year: number
          started_at?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          current_family_group?: string | null
          current_group_index?: number | null
          id?: string
          organization_id?: string
          rotation_year?: number
          started_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_secondary_selection_status_organization"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "secondary_selection_status_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      supervisors: {
        Row: {
          created_at: string
          email: string
          id: string
          is_active: boolean
          name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      survey_responses: {
        Row: {
          created_at: string
          family_group: string | null
          id: string
          organization_id: string
          responses: Json
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          family_group?: string | null
          id?: string
          organization_id: string
          responses?: Json
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          family_group?: string | null
          id?: string
          organization_id?: string
          responses?: Json
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_survey_responses_organization"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_responses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      time_period_usage: {
        Row: {
          created_at: string
          family_group: string
          id: string
          last_selection_date: string | null
          organization_id: string
          rotation_year: number
          secondary_periods_allowed: number | null
          secondary_periods_used: number | null
          selection_deadline: string | null
          selection_round: string | null
          time_periods_allowed: number
          time_periods_used: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          family_group: string
          id?: string
          last_selection_date?: string | null
          organization_id: string
          rotation_year: number
          secondary_periods_allowed?: number | null
          secondary_periods_used?: number | null
          selection_deadline?: string | null
          selection_round?: string | null
          time_periods_allowed?: number
          time_periods_used?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          family_group?: string
          id?: string
          last_selection_date?: string | null
          organization_id?: string
          rotation_year?: number
          secondary_periods_allowed?: number | null
          secondary_periods_used?: number | null
          selection_deadline?: string | null
          selection_round?: string | null
          time_periods_allowed?: number
          time_periods_used?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_time_period_usage_organization"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_notifications: {
        Row: {
          created_at: string
          id: string
          notification_type: string
          organization_id: string
          recipient_email: string
          recipient_family_group: string
          sent_at: string | null
          trade_request_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notification_type: string
          organization_id: string
          recipient_email: string
          recipient_family_group: string
          sent_at?: string | null
          trade_request_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notification_type?: string
          organization_id?: string
          recipient_email?: string
          recipient_family_group?: string
          sent_at?: string | null
          trade_request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_trade_notifications_organization"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trade_notifications_trade_request_id_fkey"
            columns: ["trade_request_id"]
            isOneToOne: false
            referencedRelation: "trade_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_requests: {
        Row: {
          approved_at: string | null
          approver_message: string | null
          approver_user_id: string | null
          created_at: string
          id: string
          offered_end_date: string | null
          offered_start_date: string | null
          organization_id: string
          request_type: string
          requested_end_date: string
          requested_start_date: string
          requester_family_group: string
          requester_message: string | null
          requester_user_id: string | null
          status: string
          target_family_group: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approver_message?: string | null
          approver_user_id?: string | null
          created_at?: string
          id?: string
          offered_end_date?: string | null
          offered_start_date?: string | null
          organization_id: string
          request_type: string
          requested_end_date: string
          requested_start_date: string
          requester_family_group: string
          requester_message?: string | null
          requester_user_id?: string | null
          status?: string
          target_family_group: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approver_message?: string | null
          approver_user_id?: string | null
          created_at?: string
          id?: string
          offered_end_date?: string | null
          offered_start_date?: string | null
          organization_id?: string
          request_type?: string
          requested_end_date?: string
          requested_start_date?: string
          requester_family_group?: string
          requester_message?: string | null
          requester_user_id?: string | null
          status?: string
          target_family_group?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_trade_requests_organization"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_organizations: {
        Row: {
          created_at: string
          id: string
          is_primary: boolean
          joined_at: string
          organization_id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary?: boolean
          joined_at?: string
          organization_id: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_primary?: boolean
          joined_at?: string
          organization_id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_user_organizations_organization"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_organizations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_default_colors: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_available_colors: {
        Args: { p_organization_id: string; p_current_group_id?: string }
        Returns: string[]
      }
      get_user_organization_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_organizations: {
        Args: { user_uuid?: string }
        Returns: {
          organization_id: string
          organization_name: string
          organization_code: string
          role: string
          is_primary: boolean
          joined_at: string
        }[]
      }
      get_user_primary_organization_id: {
        Args: { user_uuid?: string }
        Returns: string
      }
      is_supervisor: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      rename_family_group: {
        Args: {
          p_organization_id: string
          p_old_name: string
          p_new_name: string
        }
        Returns: boolean
      }
      set_primary_organization: {
        Args: { org_id: string }
        Returns: boolean
      }
      supervisor_bulk_update_family_groups: {
        Args: { p_organization_id: string; p_confirmation_code: string }
        Returns: boolean
      }
      supervisor_bulk_update_leads: {
        Args: {
          p_organization_id: string
          p_confirmation_code: string
          p_lead_phone?: string
          p_lead_email?: string
        }
        Returns: number
      }
      validate_organization_access: {
        Args: { target_org_id: string; operation_name?: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
