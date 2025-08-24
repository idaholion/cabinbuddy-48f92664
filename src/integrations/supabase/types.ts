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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      backup_metadata: {
        Row: {
          backup_type: string
          created_at: string
          created_by_user_id: string | null
          file_path: string
          file_size: number | null
          id: string
          organization_id: string
          status: string
        }
        Insert: {
          backup_type?: string
          created_at?: string
          created_by_user_id?: string | null
          file_path: string
          file_size?: number | null
          id?: string
          organization_id: string
          status?: string
        }
        Update: {
          backup_type?: string
          created_at?: string
          created_by_user_id?: string | null
          file_path?: string
          file_size?: number | null
          id?: string
          organization_id?: string
          status?: string
        }
        Relationships: []
      }
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
      cabin_rules: {
        Row: {
          content: Json
          created_at: string
          id: string
          organization_id: string
          section_title: string
          section_type: string
          updated_at: string
        }
        Insert: {
          content?: Json
          created_at?: string
          id?: string
          organization_id: string
          section_title: string
          section_type: string
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          organization_id?: string
          section_title?: string
          section_type?: string
          updated_at?: string
        }
        Relationships: []
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
      default_features: {
        Row: {
          category: string
          created_at: string
          description: string
          feature_key: string
          icon: string
          id: string
          is_active: boolean
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          feature_key: string
          icon: string
          id?: string
          is_active?: boolean
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          feature_key?: string
          icon?: string
          id?: string
          is_active?: boolean
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          category: string
          created_at: string
          description: string | null
          file_size: number | null
          file_type: string | null
          file_url: string | null
          id: string
          organization_id: string
          title: string
          updated_at: string
          uploaded_by_user_id: string | null
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          organization_id: string
          title: string
          updated_at?: string
          uploaded_by_user_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string | null
          id?: string
          organization_id?: string
          title?: string
          updated_at?: string
          uploaded_by_user_id?: string | null
        }
        Relationships: []
      }
      emergency_access_log: {
        Row: {
          action_type: string
          approved_by: string | null
          created_at: string | null
          details: Json | null
          id: string
          organization_id: string | null
          reason: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          approved_by?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          organization_id?: string | null
          reason?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          approved_by?: string | null
          created_at?: string | null
          details?: Json | null
          id?: string
          organization_id?: string | null
          reason?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      family_group_shares: {
        Row: {
          allocated_shares: number
          created_at: string
          family_group_name: string
          id: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          allocated_shares?: number
          created_at?: string
          family_group_name: string
          id?: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          allocated_shares?: number
          created_at?: string
          family_group_name?: string
          id?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: []
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
      features: {
        Row: {
          category: string
          created_at: string
          description: string
          feature_key: string
          icon: string
          id: string
          is_active: boolean
          learn_more_text: string | null
          learn_more_type: string | null
          learn_more_url: string | null
          organization_id: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          feature_key: string
          icon: string
          id?: string
          is_active?: boolean
          learn_more_text?: string | null
          learn_more_type?: string | null
          learn_more_url?: string | null
          organization_id: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          feature_key?: string
          icon?: string
          id?: string
          is_active?: boolean
          learn_more_text?: string | null
          learn_more_type?: string | null
          learn_more_url?: string | null
          organization_id?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      member_profile_links: {
        Row: {
          claimed_at: string | null
          claimed_by_user_id: string | null
          created_at: string
          family_group_name: string
          id: string
          member_name: string
          member_type: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          claimed_at?: string | null
          claimed_by_user_id?: string | null
          created_at?: string
          family_group_name: string
          id?: string
          member_name: string
          member_type?: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          claimed_at?: string | null
          claimed_by_user_id?: string | null
          created_at?: string
          family_group_name?: string
          id?: string
          member_name?: string
          member_type?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      member_share_allocations: {
        Row: {
          allocated_by_user_id: string | null
          allocated_shares: number
          created_at: string
          family_group_name: string
          id: string
          member_email: string | null
          member_name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          allocated_by_user_id?: string | null
          allocated_shares?: number
          created_at?: string
          family_group_name: string
          id?: string
          member_email?: string | null
          member_name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          allocated_by_user_id?: string | null
          allocated_shares?: number
          created_at?: string
          family_group_name?: string
          id?: string
          member_email?: string | null
          member_name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: []
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
      organization_voting_settings: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          total_shares: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          total_shares?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          total_shares?: number
          updated_at?: string
        }
        Relationships: []
      }
      organizations: {
        Row: {
          access_type: string
          admin_email: string | null
          admin_name: string | null
          admin_phone: string | null
          alternate_supervisor_email: string | null
          automated_reminders_enabled: boolean | null
          calendar_keeper_email: string | null
          calendar_keeper_name: string | null
          calendar_keeper_phone: string | null
          code: string
          created_at: string
          guest_access_token: string | null
          guest_token_expires_at: string | null
          id: string
          name: string
          treasurer_email: string | null
          treasurer_name: string | null
          treasurer_phone: string | null
          updated_at: string
        }
        Insert: {
          access_type?: string
          admin_email?: string | null
          admin_name?: string | null
          admin_phone?: string | null
          alternate_supervisor_email?: string | null
          automated_reminders_enabled?: boolean | null
          calendar_keeper_email?: string | null
          calendar_keeper_name?: string | null
          calendar_keeper_phone?: string | null
          code: string
          created_at?: string
          guest_access_token?: string | null
          guest_token_expires_at?: string | null
          id?: string
          name: string
          treasurer_email?: string | null
          treasurer_name?: string | null
          treasurer_phone?: string | null
          updated_at?: string
        }
        Update: {
          access_type?: string
          admin_email?: string | null
          admin_name?: string | null
          admin_phone?: string | null
          alternate_supervisor_email?: string | null
          automated_reminders_enabled?: boolean | null
          calendar_keeper_email?: string | null
          calendar_keeper_name?: string | null
          calendar_keeper_phone?: string | null
          code?: string
          created_at?: string
          guest_access_token?: string | null
          guest_token_expires_at?: string | null
          id?: string
          name?: string
          treasurer_email?: string | null
          treasurer_name?: string | null
          treasurer_phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          amount_paid: number | null
          balance_due: number | null
          created_at: string
          created_by_user_id: string | null
          description: string | null
          due_date: string | null
          family_group: string
          id: string
          notes: string | null
          organization_id: string
          paid_date: string | null
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          payment_reference: string | null
          payment_type: Database["public"]["Enums"]["payment_type"]
          reservation_id: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
          updated_by_user_id: string | null
        }
        Insert: {
          amount: number
          amount_paid?: number | null
          balance_due?: number | null
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          due_date?: string | null
          family_group: string
          id?: string
          notes?: string | null
          organization_id: string
          paid_date?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_reference?: string | null
          payment_type?: Database["public"]["Enums"]["payment_type"]
          reservation_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Update: {
          amount?: number
          amount_paid?: number | null
          balance_due?: number | null
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          due_date?: string | null
          family_group?: string
          id?: string
          notes?: string | null
          organization_id?: string
          paid_date?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          payment_reference?: string | null
          payment_type?: Database["public"]["Enums"]["payment_type"]
          reservation_id?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_payments_reservation"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      photo_comments: {
        Row: {
          comment: string
          created_at: string
          id: string
          organization_id: string
          photo_id: string
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string
          id?: string
          organization_id: string
          photo_id: string
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          organization_id?: string
          photo_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "photo_comments_photo_id_fkey"
            columns: ["photo_id"]
            isOneToOne: false
            referencedRelation: "photos"
            referencedColumns: ["id"]
          },
        ]
      }
      photos: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          image_url: string
          liked_by_users: string[] | null
          likes_count: number
          organization_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url: string
          liked_by_users?: string[] | null
          likes_count?: number
          organization_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          image_url?: string
          liked_by_users?: string[] | null
          likes_count?: number
          organization_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          family_group: string | null
          family_role: string | null
          first_name: string | null
          id: string
          last_name: string | null
          organization_id: string | null
          updated_at: string
          user_id: string
          user_type: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          family_group?: string | null
          family_role?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          organization_id?: string | null
          updated_at?: string
          user_id: string
          user_type?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          family_group?: string | null
          family_role?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          organization_id?: string | null
          updated_at?: string
          user_id?: string
          user_type?: string
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
      proposal_comments: {
        Row: {
          comment: string
          created_at: string
          id: string
          organization_id: string
          proposal_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string
          id?: string
          organization_id: string
          proposal_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          id?: string
          organization_id?: string
          proposal_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          hibernation_end_date: string | null
          hibernation_start_date: string | null
          historical_tracking_type: string | null
          historical_values: Json | null
          id: string
          name: string
          notes: string | null
          organization_id: string
          phone_number: string | null
          provider_name: string | null
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
          hibernation_end_date?: string | null
          hibernation_start_date?: string | null
          historical_tracking_type?: string | null
          historical_values?: Json | null
          id?: string
          name: string
          notes?: string | null
          organization_id: string
          phone_number?: string | null
          provider_name?: string | null
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
          hibernation_end_date?: string | null
          hibernation_start_date?: string | null
          historical_tracking_type?: string | null
          historical_values?: Json | null
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string
          phone_number?: string | null
          provider_name?: string | null
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
      reminder_templates: {
        Row: {
          checklist_items: Json
          created_at: string
          created_by_user_id: string | null
          custom_message: string | null
          days_in_advance: number | null
          id: string
          is_active: boolean | null
          organization_id: string
          reminder_type: string
          sort_order: number | null
          subject_template: string
          updated_at: string
        }
        Insert: {
          checklist_items?: Json
          created_at?: string
          created_by_user_id?: string | null
          custom_message?: string | null
          days_in_advance?: number | null
          id?: string
          is_active?: boolean | null
          organization_id: string
          reminder_type: string
          sort_order?: number | null
          subject_template: string
          updated_at?: string
        }
        Update: {
          checklist_items?: Json
          created_at?: string
          created_by_user_id?: string | null
          custom_message?: string | null
          days_in_advance?: number | null
          id?: string
          is_active?: boolean | null
          organization_id?: string
          reminder_type?: string
          sort_order?: number | null
          subject_template?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminder_templates_organization_id_fkey"
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
          auto_invoicing: boolean | null
          bathrooms: number | null
          bedrooms: number | null
          billing_frequency: string | null
          cancellation_policy: string | null
          check_mailing_address: string | null
          check_payable_to: string | null
          cleaning_fee: number | null
          created_at: string
          damage_deposit: number | null
          financial_method: string | null
          id: string
          late_fee_amount: number | null
          late_fee_grace_days: number | null
          late_fees_enabled: boolean | null
          max_guests: number | null
          nightly_rate: number | null
          organization_id: string
          payment_terms: string | null
          paypal_email: string | null
          pet_fee: number | null
          preferred_payment_method: string | null
          property_name: string | null
          tax_id: string | null
          tax_jurisdiction: string | null
          tax_rate: number | null
          updated_at: string
          venmo_handle: string | null
        }
        Insert: {
          address?: string | null
          auto_invoicing?: boolean | null
          bathrooms?: number | null
          bedrooms?: number | null
          billing_frequency?: string | null
          cancellation_policy?: string | null
          check_mailing_address?: string | null
          check_payable_to?: string | null
          cleaning_fee?: number | null
          created_at?: string
          damage_deposit?: number | null
          financial_method?: string | null
          id?: string
          late_fee_amount?: number | null
          late_fee_grace_days?: number | null
          late_fees_enabled?: boolean | null
          max_guests?: number | null
          nightly_rate?: number | null
          organization_id: string
          payment_terms?: string | null
          paypal_email?: string | null
          pet_fee?: number | null
          preferred_payment_method?: string | null
          property_name?: string | null
          tax_id?: string | null
          tax_jurisdiction?: string | null
          tax_rate?: number | null
          updated_at?: string
          venmo_handle?: string | null
        }
        Update: {
          address?: string | null
          auto_invoicing?: boolean | null
          bathrooms?: number | null
          bedrooms?: number | null
          billing_frequency?: string | null
          cancellation_policy?: string | null
          check_mailing_address?: string | null
          check_payable_to?: string | null
          cleaning_fee?: number | null
          created_at?: string
          damage_deposit?: number | null
          financial_method?: string | null
          id?: string
          late_fee_amount?: number | null
          late_fee_grace_days?: number | null
          late_fees_enabled?: boolean | null
          max_guests?: number | null
          nightly_rate?: number | null
          organization_id?: string
          payment_terms?: string | null
          paypal_email?: string | null
          pet_fee?: number | null
          preferred_payment_method?: string | null
          property_name?: string | null
          tax_id?: string | null
          tax_jurisdiction?: string | null
          tax_rate?: number | null
          updated_at?: string
          venmo_handle?: string | null
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
          enable_post_rotation_selection: boolean | null
          enable_secondary_selection: boolean | null
          first_last_option: string | null
          id: string
          max_nights: number | null
          max_time_slots: number | null
          organization_id: string
          rotation_order: Json
          rotation_year: number
          secondary_max_periods: number | null
          secondary_selection_days: number | null
          selection_days: number | null
          start_day: string | null
          start_month: string | null
          start_time: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          enable_post_rotation_selection?: boolean | null
          enable_secondary_selection?: boolean | null
          first_last_option?: string | null
          id?: string
          max_nights?: number | null
          max_time_slots?: number | null
          organization_id: string
          rotation_order?: Json
          rotation_year: number
          secondary_max_periods?: number | null
          secondary_selection_days?: number | null
          selection_days?: number | null
          start_day?: string | null
          start_month?: string | null
          start_time?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          enable_post_rotation_selection?: boolean | null
          enable_secondary_selection?: boolean | null
          first_last_option?: string | null
          id?: string
          max_nights?: number | null
          max_time_slots?: number | null
          organization_id?: string
          rotation_order?: Json
          rotation_year?: number
          secondary_max_periods?: number | null
          secondary_selection_days?: number | null
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
      seasonal_documents: {
        Row: {
          created_at: string
          description: string | null
          document_type: string
          external_url: string | null
          file_url: string | null
          id: string
          organization_id: string
          season: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          document_type?: string
          external_url?: string | null
          file_url?: string | null
          id?: string
          organization_id: string
          season: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          document_type?: string
          external_url?: string | null
          file_url?: string | null
          id?: string
          organization_id?: string
          season?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
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
      shopping_list_items: {
        Row: {
          added_by_user_id: string | null
          category: string | null
          created_at: string
          id: string
          is_completed: boolean
          item_name: string
          organization_id: string
          quantity: string | null
          shopping_list_id: string
          updated_at: string
        }
        Insert: {
          added_by_user_id?: string | null
          category?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          item_name: string
          organization_id: string
          quantity?: string | null
          shopping_list_id: string
          updated_at?: string
        }
        Update: {
          added_by_user_id?: string | null
          category?: string | null
          created_at?: string
          id?: string
          is_completed?: boolean
          item_name?: string
          organization_id?: string
          quantity?: string | null
          shopping_list_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shopping_list_items_shopping_list_id_fkey"
            columns: ["shopping_list_id"]
            isOneToOne: false
            referencedRelation: "shopping_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_lists: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      user_share_allocations: {
        Row: {
          allocated_by_user_id: string | null
          allocated_shares: number
          created_at: string
          family_group_name: string
          id: string
          organization_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          allocated_by_user_id?: string | null
          allocated_shares?: number
          created_at?: string
          family_group_name: string
          id?: string
          organization_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          allocated_by_user_id?: string | null
          allocated_shares?: number
          created_at?: string
          family_group_name?: string
          id?: string
          organization_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      votes: {
        Row: {
          created_at: string
          family_group_name: string
          id: string
          organization_id: string
          proposal_id: string
          shares_used: number
          vote_choice: string
          voted_by_user_id: string | null
          voter_email: string | null
          voter_name: string
        }
        Insert: {
          created_at?: string
          family_group_name: string
          id?: string
          organization_id: string
          proposal_id: string
          shares_used: number
          vote_choice: string
          voted_by_user_id?: string | null
          voter_email?: string | null
          voter_name: string
        }
        Update: {
          created_at?: string
          family_group_name?: string
          id?: string
          organization_id?: string
          proposal_id?: string
          shares_used?: number
          vote_choice?: string
          voted_by_user_id?: string | null
          voter_email?: string | null
          voter_name?: string
        }
        Relationships: []
      }
      voting_proposals: {
        Row: {
          created_at: string
          created_by_family_group: string | null
          created_by_name: string | null
          created_by_user_id: string | null
          description: string | null
          id: string
          organization_id: string
          shares_against: number | null
          shares_for: number | null
          status: string
          title: string
          total_shares_voted: number | null
          updated_at: string
          voting_deadline: string | null
        }
        Insert: {
          created_at?: string
          created_by_family_group?: string | null
          created_by_name?: string | null
          created_by_user_id?: string | null
          description?: string | null
          id?: string
          organization_id: string
          shares_against?: number | null
          shares_for?: number | null
          status?: string
          title: string
          total_shares_voted?: number | null
          updated_at?: string
          voting_deadline?: string | null
        }
        Update: {
          created_at?: string
          created_by_family_group?: string | null
          created_by_name?: string | null
          created_by_user_id?: string | null
          description?: string | null
          id?: string
          organization_id?: string
          shares_against?: number | null
          shares_for?: number | null
          status?: string
          title?: string
          total_shares_voted?: number | null
          updated_at?: string
          voting_deadline?: string | null
        }
        Relationships: []
      }
      work_weekend_approvals: {
        Row: {
          approval_type: string
          approved_at: string | null
          approved_by_email: string | null
          approved_by_name: string | null
          created_at: string
          family_group: string
          id: string
          organization_id: string
          rejection_reason: string | null
          status: string
          updated_at: string
          work_weekend_id: string
        }
        Insert: {
          approval_type: string
          approved_at?: string | null
          approved_by_email?: string | null
          approved_by_name?: string | null
          created_at?: string
          family_group: string
          id?: string
          organization_id: string
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          work_weekend_id: string
        }
        Update: {
          approval_type?: string
          approved_at?: string | null
          approved_by_email?: string | null
          approved_by_name?: string | null
          created_at?: string
          family_group?: string
          id?: string
          organization_id?: string
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          work_weekend_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_weekend_approvals_work_weekend_id_fkey"
            columns: ["work_weekend_id"]
            isOneToOne: false
            referencedRelation: "work_weekends"
            referencedColumns: ["id"]
          },
        ]
      }
      work_weekends: {
        Row: {
          conflict_reservations: Json | null
          created_at: string
          description: string | null
          end_date: string
          fully_approved_at: string | null
          id: string
          organization_id: string
          proposer_email: string
          proposer_family_group: string | null
          proposer_name: string
          proposer_user_id: string | null
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          start_date: string
          status: string
          supervisor_approved_at: string | null
          supervisor_approved_by: string | null
          title: string
          updated_at: string
        }
        Insert: {
          conflict_reservations?: Json | null
          created_at?: string
          description?: string | null
          end_date: string
          fully_approved_at?: string | null
          id?: string
          organization_id: string
          proposer_email: string
          proposer_family_group?: string | null
          proposer_name: string
          proposer_user_id?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          start_date: string
          status?: string
          supervisor_approved_at?: string | null
          supervisor_approved_by?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          conflict_reservations?: Json | null
          created_at?: string
          description?: string | null
          end_date?: string
          fully_approved_at?: string | null
          id?: string
          organization_id?: string
          proposer_email?: string
          proposer_family_group?: string | null
          proposer_name?: string
          proposer_user_id?: string | null
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          start_date?: string
          status?: string
          supervisor_approved_at?: string | null
          supervisor_approved_by?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
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
      claim_family_member_profile: {
        Args: {
          p_family_group_name: string
          p_member_name: string
          p_member_type?: string
          p_organization_id: string
        }
        Returns: Json
      }
      create_reservation_payment: {
        Args: {
          p_deposit_percentage?: number
          p_reservation_id: string
          p_split_deposit?: boolean
        }
        Returns: string
      }
      generate_guest_access_token: {
        Args: { expires_hours?: number; org_id: string }
        Returns: string
      }
      get_available_colors: {
        Args: { p_current_group_id?: string; p_organization_id: string }
        Returns: string[]
      }
      get_current_user_email: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_safe_guest_family_groups: {
        Args: { org_id: string }
        Returns: {
          color: string
          created_at: string
          id: string
          name: string
        }[]
      }
      get_safe_guest_organization_info: {
        Args: { org_id: string }
        Returns: {
          access_type: string
          code: string
          created_at: string
          id: string
          name: string
        }[]
      }
      get_safe_organization_info: {
        Args: { org_id: string }
        Returns: {
          code: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }[]
      }
      get_user_claimed_profile: {
        Args: { p_organization_id: string }
        Returns: Json
      }
      get_user_organization_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_user_organizations: {
        Args: Record<PropertyKey, never>
        Returns: {
          is_primary: boolean
          joined_at: string
          organization_code: string
          organization_id: string
          organization_name: string
          role: string
        }[]
      }
      get_user_primary_organization_id: {
        Args: { user_uuid?: string }
        Returns: string
      }
      is_organization_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_supervisor: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      rename_family_group: {
        Args: {
          p_new_name: string
          p_old_name: string
          p_organization_id: string
        }
        Returns: boolean
      }
      revoke_guest_access: {
        Args: { org_id: string }
        Returns: boolean
      }
      set_primary_organization: {
        Args: { org_id: string }
        Returns: boolean
      }
      supervisor_bulk_remove_host_member: {
        Args: {
          p_confirmation_code: string
          p_host_name: string
          p_organization_id: string
        }
        Returns: number
      }
      supervisor_bulk_update_family_groups: {
        Args: { p_confirmation_code: string; p_organization_id: string }
        Returns: boolean
      }
      supervisor_bulk_update_leads: {
        Args: {
          p_confirmation_code: string
          p_lead_email?: string
          p_lead_phone?: string
          p_organization_id: string
        }
        Returns: number
      }
      supervisor_bulk_update_reservations: {
        Args: {
          p_confirmation_code: string
          p_disable_all_hosts?: boolean
          p_enable_all_hosts?: boolean
          p_organization_id: string
        }
        Returns: number
      }
      supervisor_cleanup_duplicate_family_groups: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      supervisor_delete_organization: {
        Args: { p_confirmation_code: string; p_organization_id: string }
        Returns: string
      }
      supervisor_remove_user_from_organization: {
        Args: {
          p_confirmation_code: string
          p_organization_id: string
          p_user_email: string
        }
        Returns: Json
      }
      supervisor_reset_database: {
        Args: { p_confirmation_code: string }
        Returns: string
      }
      validate_guest_access: {
        Args: { org_id: string; token: string }
        Returns: boolean
      }
      validate_organization_access: {
        Args: { operation_name?: string; target_org_id: string }
        Returns: boolean
      }
    }
    Enums: {
      payment_method:
        | "cash"
        | "check"
        | "venmo"
        | "paypal"
        | "bank_transfer"
        | "stripe"
        | "other"
      payment_status:
        | "pending"
        | "paid"
        | "partial"
        | "overdue"
        | "cancelled"
        | "refunded"
      payment_type:
        | "reservation_deposit"
        | "reservation_balance"
        | "full_payment"
        | "cleaning_fee"
        | "damage_deposit"
        | "pet_fee"
        | "late_fee"
        | "refund"
        | "other"
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
      payment_method: [
        "cash",
        "check",
        "venmo",
        "paypal",
        "bank_transfer",
        "stripe",
        "other",
      ],
      payment_status: [
        "pending",
        "paid",
        "partial",
        "overdue",
        "cancelled",
        "refunded",
      ],
      payment_type: [
        "reservation_deposit",
        "reservation_balance",
        "full_payment",
        "cleaning_fee",
        "damage_deposit",
        "pet_fee",
        "late_fee",
        "refund",
        "other",
      ],
    },
  },
} as const
