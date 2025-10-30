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
      billing_cycles: {
        Row: {
          auto_send_invoices: boolean
          created_at: string
          created_by_user_id: string | null
          cycle_name: string
          cycle_type: Database["public"]["Enums"]["billing_cycle_type"]
          end_date: string
          id: string
          organization_id: string
          payment_deadline: string
          start_date: string
          status: Database["public"]["Enums"]["billing_cycle_status"]
          updated_at: string
        }
        Insert: {
          auto_send_invoices?: boolean
          created_at?: string
          created_by_user_id?: string | null
          cycle_name: string
          cycle_type: Database["public"]["Enums"]["billing_cycle_type"]
          end_date: string
          id?: string
          organization_id: string
          payment_deadline: string
          start_date: string
          status?: Database["public"]["Enums"]["billing_cycle_status"]
          updated_at?: string
        }
        Update: {
          auto_send_invoices?: boolean
          created_at?: string
          created_by_user_id?: string | null
          cycle_name?: string
          cycle_type?: Database["public"]["Enums"]["billing_cycle_type"]
          end_date?: string
          id?: string
          organization_id?: string
          payment_deadline?: string
          start_date?: string
          status?: Database["public"]["Enums"]["billing_cycle_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_cycles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
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
      checklist_images: {
        Row: {
          content_type: string | null
          created_at: string
          file_size: number | null
          id: string
          image_url: string
          marker_name: string | null
          organization_id: string
          original_filename: string
          updated_at: string
          uploaded_by_user_id: string | null
          usage_count: number
        }
        Insert: {
          content_type?: string | null
          created_at?: string
          file_size?: number | null
          id?: string
          image_url: string
          marker_name?: string | null
          organization_id: string
          original_filename: string
          updated_at?: string
          uploaded_by_user_id?: string | null
          usage_count?: number
        }
        Update: {
          content_type?: string | null
          created_at?: string
          file_size?: number | null
          id?: string
          image_url?: string
          marker_name?: string | null
          organization_id?: string
          original_filename?: string
          updated_at?: string
          uploaded_by_user_id?: string | null
          usage_count?: number
        }
        Relationships: []
      }
      checklist_progress: {
        Row: {
          checklist_id: string
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          image_sizes: Json | null
          item_id: string
          organization_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          checklist_id: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          image_sizes?: Json | null
          item_id: string
          organization_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          checklist_id?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          image_sizes?: Json | null
          item_id?: string
          organization_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_progress_organization_id_fkey"
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
          images: Json | null
          introductory_text: string | null
          items: Json
          organization_id: string
          updated_at: string
        }
        Insert: {
          checklist_type: string
          created_at?: string
          id?: string
          images?: Json | null
          introductory_text?: string | null
          items?: Json
          organization_id: string
          updated_at?: string
        }
        Update: {
          checklist_type?: string
          created_at?: string
          id?: string
          images?: Json | null
          introductory_text?: string | null
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
      faq_items: {
        Row: {
          answer: string
          category: string
          category_order: number
          created_at: string
          id: string
          item_order: number
          organization_id: string
          question: string
          updated_at: string
        }
        Insert: {
          answer: string
          category: string
          category_order?: number
          created_at?: string
          id?: string
          item_order?: number
          organization_id: string
          question: string
          updated_at?: string
        }
        Update: {
          answer?: string
          category?: string
          category_order?: number
          created_at?: string
          id?: string
          item_order?: number
          organization_id?: string
          question?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "faq_items_organization_id_fkey"
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
      invoice_reminders_log: {
        Row: {
          email_status: Database["public"]["Enums"]["email_status"]
          error_message: string | null
          id: string
          invoice_id: string
          organization_id: string
          recipient_emails: string[]
          reminder_type: Database["public"]["Enums"]["reminder_type"]
          sent_at: string
        }
        Insert: {
          email_status?: Database["public"]["Enums"]["email_status"]
          error_message?: string | null
          id?: string
          invoice_id: string
          organization_id: string
          recipient_emails: string[]
          reminder_type: Database["public"]["Enums"]["reminder_type"]
          sent_at?: string
        }
        Update: {
          email_status?: Database["public"]["Enums"]["email_status"]
          error_message?: string | null
          id?: string
          invoice_id?: string
          organization_id?: string
          recipient_emails?: string[]
          reminder_type?: Database["public"]["Enums"]["reminder_type"]
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_reminders_log_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_reminders_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          amount_paid: number
          balance_due: number
          billing_cycle_id: string | null
          created_at: string
          created_by_user_id: string | null
          due_date: string
          family_group: string
          id: string
          invoice_number: string
          issue_date: string
          line_items: Json
          notes: string | null
          organization_id: string
          paid_at: string | null
          pdf_url: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          subtotal: number
          tax_amount: number
          total_amount: number
          updated_at: string
        }
        Insert: {
          amount_paid?: number
          balance_due?: number
          billing_cycle_id?: string | null
          created_at?: string
          created_by_user_id?: string | null
          due_date: string
          family_group: string
          id?: string
          invoice_number: string
          issue_date?: string
          line_items?: Json
          notes?: string | null
          organization_id: string
          paid_at?: string | null
          pdf_url?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          balance_due?: number
          billing_cycle_id?: string | null
          created_at?: string
          created_by_user_id?: string | null
          due_date?: string
          family_group?: string
          id?: string
          invoice_number?: string
          issue_date?: string
          line_items?: Json
          notes?: string | null
          organization_id?: string
          paid_at?: string | null
          pdf_url?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          subtotal?: number
          tax_amount?: number
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_billing_cycle_id_fkey"
            columns: ["billing_cycle_id"]
            isOneToOne: false
            referencedRelation: "billing_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_template_sends: {
        Row: {
          created_at: string
          email_content: string
          email_subject: string
          failed_sends: number
          id: string
          organization_id: string
          recipient_type: string
          recipients: Json
          sent_at: string
          sent_by_user_id: string
          successful_sends: number
          template_id: string
          template_variables: Json
          total_recipients: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          email_content: string
          email_subject: string
          failed_sends?: number
          id?: string
          organization_id: string
          recipient_type: string
          recipients?: Json
          sent_at?: string
          sent_by_user_id: string
          successful_sends?: number
          template_id: string
          template_variables?: Json
          total_recipients?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          email_content?: string
          email_subject?: string
          failed_sends?: number
          id?: string
          organization_id?: string
          recipient_type?: string
          recipients?: Json
          sent_at?: string
          sent_by_user_id?: string
          successful_sends?: number
          template_id?: string
          template_variables?: Json
          total_recipients?: number
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
          allow_member_financial_access: boolean | null
          alternate_supervisor_email: string | null
          automated_reminders_1_day_enabled: boolean | null
          automated_reminders_3_day_enabled: boolean | null
          automated_reminders_7_day_enabled: boolean | null
          automated_reminders_enabled: boolean | null
          automated_selection_ending_tomorrow_enabled: boolean | null
          automated_selection_reminders_enabled: boolean | null
          automated_selection_turn_notifications_enabled: boolean | null
          automated_work_weekend_1_day_enabled: boolean | null
          automated_work_weekend_3_day_enabled: boolean | null
          automated_work_weekend_7_day_enabled: boolean | null
          automated_work_weekend_reminders_enabled: boolean | null
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
          allow_member_financial_access?: boolean | null
          alternate_supervisor_email?: string | null
          automated_reminders_1_day_enabled?: boolean | null
          automated_reminders_3_day_enabled?: boolean | null
          automated_reminders_7_day_enabled?: boolean | null
          automated_reminders_enabled?: boolean | null
          automated_selection_ending_tomorrow_enabled?: boolean | null
          automated_selection_reminders_enabled?: boolean | null
          automated_selection_turn_notifications_enabled?: boolean | null
          automated_work_weekend_1_day_enabled?: boolean | null
          automated_work_weekend_3_day_enabled?: boolean | null
          automated_work_weekend_7_day_enabled?: boolean | null
          automated_work_weekend_reminders_enabled?: boolean | null
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
          allow_member_financial_access?: boolean | null
          alternate_supervisor_email?: string | null
          automated_reminders_1_day_enabled?: boolean | null
          automated_reminders_3_day_enabled?: boolean | null
          automated_reminders_7_day_enabled?: boolean | null
          automated_reminders_enabled?: boolean | null
          automated_selection_ending_tomorrow_enabled?: boolean | null
          automated_selection_reminders_enabled?: boolean | null
          automated_selection_turn_notifications_enabled?: boolean | null
          automated_work_weekend_1_day_enabled?: boolean | null
          automated_work_weekend_3_day_enabled?: boolean | null
          automated_work_weekend_7_day_enabled?: boolean | null
          automated_work_weekend_reminders_enabled?: boolean | null
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
      payment_splits: {
        Row: {
          created_at: string
          created_by_user_id: string
          daily_occupancy_split: Json
          id: string
          notification_sent_at: string | null
          notification_status: string
          organization_id: string
          source_family_group: string
          source_payment_id: string
          source_user_id: string
          split_payment_id: string
          split_to_family_group: string
          split_to_user_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by_user_id: string
          daily_occupancy_split?: Json
          id?: string
          notification_sent_at?: string | null
          notification_status?: string
          organization_id: string
          source_family_group: string
          source_payment_id: string
          source_user_id: string
          split_payment_id: string
          split_to_family_group: string
          split_to_user_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by_user_id?: string
          daily_occupancy_split?: Json
          id?: string
          notification_sent_at?: string | null
          notification_status?: string
          organization_id?: string
          source_family_group?: string
          source_payment_id?: string
          source_user_id?: string
          split_payment_id?: string
          split_to_family_group?: string
          split_to_user_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_splits_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_splits_source_payment_id_fkey"
            columns: ["source_payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_splits_split_payment_id_fkey"
            columns: ["split_payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          adjustment_notes: string | null
          amount: number
          amount_paid: number | null
          balance_due: number | null
          billing_locked: boolean | null
          created_at: string
          created_by_user_id: string | null
          credit_applied_to_future: boolean | null
          daily_occupancy: Json | null
          description: string | null
          due_date: string | null
          family_group: string
          id: string
          manual_adjustment_amount: number | null
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
          adjustment_notes?: string | null
          amount: number
          amount_paid?: number | null
          balance_due?: number | null
          billing_locked?: boolean | null
          created_at?: string
          created_by_user_id?: string | null
          credit_applied_to_future?: boolean | null
          daily_occupancy?: Json | null
          description?: string | null
          due_date?: string | null
          family_group: string
          id?: string
          manual_adjustment_amount?: number | null
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
          adjustment_notes?: string | null
          amount?: number
          amount_paid?: number | null
          balance_due?: number | null
          billing_locked?: boolean | null
          created_at?: string
          created_by_user_id?: string | null
          credit_applied_to_future?: boolean | null
          daily_occupancy?: Json | null
          description?: string | null
          due_date?: string | null
          family_group?: string
          id?: string
          manual_adjustment_amount?: number | null
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
      pdf_checklists: {
        Row: {
          checkboxes: Json | null
          created_at: string
          id: string
          pages_data: Json | null
          pdf_url: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          checkboxes?: Json | null
          created_at?: string
          id?: string
          pages_data?: Json | null
          pdf_url?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          checkboxes?: Json | null
          created_at?: string
          id?: string
          pages_data?: Json | null
          pdf_url?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          sms_message_template: string | null
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
          sms_message_template?: string | null
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
          sms_message_template?: string | null
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
          auto_billing_enabled: boolean | null
          auto_invoicing: boolean | null
          batch_send_enabled: boolean | null
          bathrooms: number | null
          bedrooms: number | null
          billing_frequency: string | null
          cancellation_policy: string | null
          check_mailing_address: string | null
          check_payable_to: string | null
          cleaning_fee: number | null
          created_at: string
          damage_deposit: number | null
          default_occupancy: number | null
          email_delivery_enabled: boolean | null
          financial_method: string | null
          id: string
          invoice_approval_required: boolean | null
          invoice_email_body: string | null
          invoice_email_subject: string | null
          invoice_prefix: string | null
          late_fee_amount: number | null
          late_fee_grace_days: number | null
          late_fees_enabled: boolean | null
          max_guests: number | null
          next_invoice_number: number | null
          nightly_rate: number | null
          organization_id: string
          overdue_reminder_interval_days: number | null
          payment_terms: string | null
          paypal_email: string | null
          pet_fee: number | null
          preferred_payment_method: string | null
          property_name: string | null
          reminder_1_day_enabled: boolean | null
          reminder_3_days_enabled: boolean | null
          reminder_7_days_enabled: boolean | null
          reminder_due_date_enabled: boolean | null
          reminder_email_body: string | null
          reminder_email_subject: string | null
          season_end_day: number | null
          season_end_month: number | null
          season_payment_deadline_offset_days: number | null
          season_start_day: number | null
          season_start_month: number | null
          sms_delivery_enabled: boolean | null
          tax_id: string | null
          tax_jurisdiction: string | null
          tax_rate: number | null
          updated_at: string
          venmo_handle: string | null
        }
        Insert: {
          address?: string | null
          auto_billing_enabled?: boolean | null
          auto_invoicing?: boolean | null
          batch_send_enabled?: boolean | null
          bathrooms?: number | null
          bedrooms?: number | null
          billing_frequency?: string | null
          cancellation_policy?: string | null
          check_mailing_address?: string | null
          check_payable_to?: string | null
          cleaning_fee?: number | null
          created_at?: string
          damage_deposit?: number | null
          default_occupancy?: number | null
          email_delivery_enabled?: boolean | null
          financial_method?: string | null
          id?: string
          invoice_approval_required?: boolean | null
          invoice_email_body?: string | null
          invoice_email_subject?: string | null
          invoice_prefix?: string | null
          late_fee_amount?: number | null
          late_fee_grace_days?: number | null
          late_fees_enabled?: boolean | null
          max_guests?: number | null
          next_invoice_number?: number | null
          nightly_rate?: number | null
          organization_id: string
          overdue_reminder_interval_days?: number | null
          payment_terms?: string | null
          paypal_email?: string | null
          pet_fee?: number | null
          preferred_payment_method?: string | null
          property_name?: string | null
          reminder_1_day_enabled?: boolean | null
          reminder_3_days_enabled?: boolean | null
          reminder_7_days_enabled?: boolean | null
          reminder_due_date_enabled?: boolean | null
          reminder_email_body?: string | null
          reminder_email_subject?: string | null
          season_end_day?: number | null
          season_end_month?: number | null
          season_payment_deadline_offset_days?: number | null
          season_start_day?: number | null
          season_start_month?: number | null
          sms_delivery_enabled?: boolean | null
          tax_id?: string | null
          tax_jurisdiction?: string | null
          tax_rate?: number | null
          updated_at?: string
          venmo_handle?: string | null
        }
        Update: {
          address?: string | null
          auto_billing_enabled?: boolean | null
          auto_invoicing?: boolean | null
          batch_send_enabled?: boolean | null
          bathrooms?: number | null
          bedrooms?: number | null
          billing_frequency?: string | null
          cancellation_policy?: string | null
          check_mailing_address?: string | null
          check_payable_to?: string | null
          cleaning_fee?: number | null
          created_at?: string
          damage_deposit?: number | null
          default_occupancy?: number | null
          email_delivery_enabled?: boolean | null
          financial_method?: string | null
          id?: string
          invoice_approval_required?: boolean | null
          invoice_email_body?: string | null
          invoice_email_subject?: string | null
          invoice_prefix?: string | null
          late_fee_amount?: number | null
          late_fee_grace_days?: number | null
          late_fees_enabled?: boolean | null
          max_guests?: number | null
          next_invoice_number?: number | null
          nightly_rate?: number | null
          organization_id?: string
          overdue_reminder_interval_days?: number | null
          payment_terms?: string | null
          paypal_email?: string | null
          pet_fee?: number | null
          preferred_payment_method?: string | null
          property_name?: string | null
          reminder_1_day_enabled?: boolean | null
          reminder_3_days_enabled?: boolean | null
          reminder_7_days_enabled?: boolean | null
          reminder_due_date_enabled?: boolean | null
          reminder_email_body?: string | null
          reminder_email_subject?: string | null
          season_end_day?: number | null
          season_end_month?: number | null
          season_payment_deadline_offset_days?: number | null
          season_start_day?: number | null
          season_start_month?: number | null
          sms_delivery_enabled?: boolean | null
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
          original_reservation_id: string | null
          property_name: string | null
          start_date: string
          status: string | null
          time_period_number: number | null
          total_cost: number | null
          transfer_type: string | null
          transferred_from: string | null
          transferred_to: string | null
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
          original_reservation_id?: string | null
          property_name?: string | null
          start_date: string
          status?: string | null
          time_period_number?: number | null
          total_cost?: number | null
          transfer_type?: string | null
          transferred_from?: string | null
          transferred_to?: string | null
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
          original_reservation_id?: string | null
          property_name?: string | null
          start_date?: string
          status?: string | null
          time_period_number?: number | null
          total_cost?: number | null
          transfer_type?: string | null
          transferred_from?: string | null
          transferred_to?: string | null
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
          {
            foreignKeyName: "reservations_original_reservation_id_fkey"
            columns: ["original_reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      rotation_orders: {
        Row: {
          created_at: string
          current_primary_turn_family: string | null
          enable_post_rotation_selection: boolean | null
          enable_secondary_selection: boolean | null
          first_last_option: string | null
          id: string
          max_consecutive_nights_primary: number | null
          max_consecutive_nights_secondary: number | null
          max_nights: number | null
          max_time_slots: number | null
          min_nights_per_booking: number | null
          organization_id: string
          post_rotation_max_consecutive_nights: number | null
          post_rotation_max_weeks: number | null
          post_rotation_min_nights: number | null
          rotation_order: Json
          rotation_year: number
          secondary_max_periods: number | null
          secondary_selection_days: number | null
          selection_days: number | null
          start_day: string | null
          start_month: string | null
          start_time: string | null
          total_nights_allowed_primary: number | null
          total_weeks_allowed_primary: number | null
          total_weeks_allowed_secondary: number | null
          updated_at: string
          use_virtual_weeks_system: boolean | null
        }
        Insert: {
          created_at?: string
          current_primary_turn_family?: string | null
          enable_post_rotation_selection?: boolean | null
          enable_secondary_selection?: boolean | null
          first_last_option?: string | null
          id?: string
          max_consecutive_nights_primary?: number | null
          max_consecutive_nights_secondary?: number | null
          max_nights?: number | null
          max_time_slots?: number | null
          min_nights_per_booking?: number | null
          organization_id: string
          post_rotation_max_consecutive_nights?: number | null
          post_rotation_max_weeks?: number | null
          post_rotation_min_nights?: number | null
          rotation_order?: Json
          rotation_year: number
          secondary_max_periods?: number | null
          secondary_selection_days?: number | null
          selection_days?: number | null
          start_day?: string | null
          start_month?: string | null
          start_time?: string | null
          total_nights_allowed_primary?: number | null
          total_weeks_allowed_primary?: number | null
          total_weeks_allowed_secondary?: number | null
          updated_at?: string
          use_virtual_weeks_system?: boolean | null
        }
        Update: {
          created_at?: string
          current_primary_turn_family?: string | null
          enable_post_rotation_selection?: boolean | null
          enable_secondary_selection?: boolean | null
          first_last_option?: string | null
          id?: string
          max_consecutive_nights_primary?: number | null
          max_consecutive_nights_secondary?: number | null
          max_nights?: number | null
          max_time_slots?: number | null
          min_nights_per_booking?: number | null
          organization_id?: string
          post_rotation_max_consecutive_nights?: number | null
          post_rotation_max_weeks?: number | null
          post_rotation_min_nights?: number | null
          rotation_order?: Json
          rotation_year?: number
          secondary_max_periods?: number | null
          secondary_selection_days?: number | null
          selection_days?: number | null
          start_day?: string | null
          start_month?: string | null
          start_time?: string | null
          total_nights_allowed_primary?: number | null
          total_weeks_allowed_primary?: number | null
          total_weeks_allowed_secondary?: number | null
          updated_at?: string
          use_virtual_weeks_system?: boolean | null
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
          turn_completed: boolean | null
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
          turn_completed?: boolean | null
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
          turn_completed?: boolean | null
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
      selection_period_extensions: {
        Row: {
          created_at: string
          extended_by_user_id: string | null
          extended_until: string
          extension_reason: string | null
          family_group: string
          id: string
          organization_id: string
          original_end_date: string
          rotation_year: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          extended_by_user_id?: string | null
          extended_until: string
          extension_reason?: string | null
          family_group: string
          id?: string
          organization_id: string
          original_end_date: string
          rotation_year: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          extended_by_user_id?: string | null
          extended_until?: string
          extension_reason?: string | null
          family_group?: string
          id?: string
          organization_id?: string
          original_end_date?: string
          rotation_year?: number
          updated_at?: string
        }
        Relationships: []
      }
      selection_turn_notifications_sent: {
        Row: {
          family_group: string
          id: string
          organization_id: string
          phase: string
          rotation_year: number
          sent_at: string | null
        }
        Insert: {
          family_group: string
          id?: string
          organization_id: string
          phase: string
          rotation_year: number
          sent_at?: string | null
        }
        Update: {
          family_group?: string
          id?: string
          organization_id?: string
          phase?: string
          rotation_year?: number
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "selection_turn_notifications_sent_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_notes: {
        Row: {
          category: string
          content: string
          created_at: string
          created_by_user_id: string | null
          id: string
          organization_id: string
          priority: string
          status: string
          tags: string[] | null
          title: string
          updated_at: string
          updated_by_user_id: string | null
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          organization_id: string
          priority?: string
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          created_by_user_id?: string | null
          id?: string
          organization_id?: string
          priority?: string
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          updated_by_user_id?: string | null
        }
        Relationships: []
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
          turn_completed: boolean | null
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
          turn_completed?: boolean | null
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
          turn_completed?: boolean | null
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
      trial_access_codes: {
        Row: {
          code: string
          created_at: string
          created_by_user_id: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          notes: string | null
          updated_at: string
          used_at: string | null
          used_by_user_id: string | null
        }
        Insert: {
          code: string
          created_at?: string
          created_by_user_id?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          updated_at?: string
          used_at?: string | null
          used_by_user_id?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          created_by_user_id?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          notes?: string | null
          updated_at?: string
          used_at?: string | null
          used_by_user_id?: string | null
        }
        Relationships: []
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
          shares_abstain: number
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
          shares_abstain?: number
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
          shares_abstain?: number
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
      work_weekend_comments: {
        Row: {
          comment: string
          commenter_email: string
          commenter_family_group: string | null
          commenter_name: string
          created_at: string
          id: string
          interest_level: string | null
          organization_id: string
          updated_at: string
          user_id: string
          work_weekend_id: string
        }
        Insert: {
          comment: string
          commenter_email: string
          commenter_family_group?: string | null
          commenter_name: string
          created_at?: string
          id?: string
          interest_level?: string | null
          organization_id: string
          updated_at?: string
          user_id: string
          work_weekend_id: string
        }
        Update: {
          comment?: string
          commenter_email?: string
          commenter_family_group?: string | null
          commenter_name?: string
          created_at?: string
          id?: string
          interest_level?: string | null
          organization_id?: string
          updated_at?: string
          user_id?: string
          work_weekend_id?: string
        }
        Relationships: []
      }
      work_weekends: {
        Row: {
          conflict_reservations: Json | null
          created_at: string
          description: string | null
          end_date: string
          fully_approved_at: string | null
          id: string
          invitation_message: string | null
          invited_all_members: boolean | null
          invited_family_leads: boolean | null
          notifications_sent_at: string | null
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
          invitation_message?: string | null
          invited_all_members?: boolean | null
          invited_family_leads?: boolean | null
          notifications_sent_at?: string | null
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
          invitation_message?: string | null
          invited_all_members?: boolean | null
          invited_family_leads?: boolean | null
          notifications_sent_at?: string | null
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
      assign_default_colors: { Args: never; Returns: undefined }
      backfill_checklist_images: { Args: never; Returns: number }
      claim_family_member_profile: {
        Args: {
          p_family_group_name: string
          p_member_name: string
          p_member_type?: string
          p_organization_id: string
        }
        Returns: Json
      }
      consume_trial_code: {
        Args: { p_code: string; p_user_id: string }
        Returns: boolean
      }
      create_organization_with_user_link: {
        Args: {
          p_admin_email?: string
          p_admin_name?: string
          p_admin_phone?: string
          p_calendar_keeper_email?: string
          p_calendar_keeper_name?: string
          p_calendar_keeper_phone?: string
          p_code: string
          p_name: string
          p_treasurer_email?: string
          p_treasurer_name?: string
          p_treasurer_phone?: string
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
      create_trial_code: {
        Args: { p_expires_days?: number; p_notes?: string }
        Returns: string
      }
      debug_auth_context: { Args: never; Returns: Json }
      delete_all_organization_payments: {
        Args: { p_confirmation_code: string; p_organization_id: string }
        Returns: Json
      }
      delete_image_safely: {
        Args: {
          p_force_delete?: boolean
          p_image_url: string
          p_organization_id: string
        }
        Returns: Json
      }
      family_group_exists_in_org: {
        Args: { p_family_group: string; p_organization_id: string }
        Returns: boolean
      }
      fix_empty_occupancy_payments: {
        Args: { p_organization_id: string }
        Returns: Json
      }
      generate_guest_access_token: {
        Args: { expires_hours?: number; org_id: string }
        Returns: string
      }
      generate_unique_organization_code: {
        Args: { base_code?: string }
        Returns: string
      }
      get_available_colors: {
        Args: { p_current_group_id?: string; p_organization_id: string }
        Returns: string[]
      }
      get_current_user_email: { Args: never; Returns: string }
      get_next_invoice_number: { Args: { org_id: string }; Returns: string }
      get_organization_user_emails: {
        Args: { org_id: string }
        Returns: {
          display_name: string
          email: string
          first_name: string
          last_name: string
          user_id: string
        }[]
      }
      get_password_reset_template_variables: {
        Args: {
          p_organization_id: string
          p_reset_link?: string
          p_user_email?: string
          p_user_name?: string
        }
        Returns: Json
      }
      get_safe_family_groups: {
        Args: { p_organization_id: string }
        Returns: {
          alternate_lead_id: string
          color: string
          created_at: string
          host_members: Json
          id: string
          lead_email: string
          lead_name: string
          lead_phone: string
          name: string
          organization_id: string
          updated_at: string
        }[]
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
      get_user_organization_id: { Args: never; Returns: string }
      get_user_organizations: {
        Args: never
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
      is_family_group_lead: {
        Args: { p_family_group_name: string; p_organization_id: string }
        Returns: boolean
      }
      is_organization_admin: { Args: never; Returns: boolean }
      is_supervisor: { Args: never; Returns: boolean }
      link_orphaned_payments_to_reservations: {
        Args: { p_organization_id: string }
        Returns: Json
      }
      migrate_existing_checklist_images: { Args: never; Returns: number }
      rename_family_group: {
        Args: {
          p_new_name: string
          p_old_name: string
          p_organization_id: string
        }
        Returns: boolean
      }
      replace_image_globally: {
        Args: {
          p_new_image_url: string
          p_old_image_url: string
          p_organization_id: string
        }
        Returns: Json
      }
      reset_selection_for_testing: {
        Args: { org_id: string; target_family_name: string }
        Returns: Json
      }
      revoke_guest_access: { Args: { org_id: string }; Returns: boolean }
      set_primary_organization: { Args: { org_id: string }; Returns: boolean }
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
        Args: never
        Returns: string
      }
      supervisor_delete_organization: {
        Args: { p_confirmation_code: string; p_organization_id: string }
        Returns: string
      }
      supervisor_fix_barb_reservations: { Args: never; Returns: string }
      supervisor_fix_primary_organization_duplicates: {
        Args: never
        Returns: Json
      }
      supervisor_fix_user_email: {
        Args: {
          p_confirmation_code: string
          p_new_email: string
          p_old_email: string
        }
        Returns: Json
      }
      supervisor_manual_claim_profile: {
        Args: {
          p_family_group_name: string
          p_member_name: string
          p_member_type: string
          p_organization_id: string
          p_user_email: string
          p_user_id: string
        }
        Returns: Json
      }
      supervisor_normalize_emails_and_fix_membership: {
        Args: never
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
      supervisor_reset_user_password: {
        Args: {
          p_confirmation_code: string
          p_new_password: string
          p_user_email: string
        }
        Returns: Json
      }
      update_image_usage_counts: {
        Args: { p_organization_id: string }
        Returns: undefined
      }
      user_belongs_to_organization: {
        Args: { p_organization_id: string; p_user_id: string }
        Returns: boolean
      }
      validate_guest_access: {
        Args: { org_id: string; token: string }
        Returns: boolean
      }
      validate_organization_access: {
        Args: { operation_name?: string; target_org_id: string }
        Returns: boolean
      }
      validate_trial_code: { Args: { p_code: string }; Returns: boolean }
    }
    Enums: {
      billing_cycle_status: "draft" | "active" | "completed" | "cancelled"
      billing_cycle_type: "end_of_year" | "end_of_season" | "monthly" | "custom"
      billing_frequency: "annual" | "seasonal" | "monthly" | "manual"
      email_status: "sent" | "failed"
      invoice_status:
        | "draft"
        | "sent"
        | "partial"
        | "paid"
        | "overdue"
        | "cancelled"
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
        | "deferred"
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
        | "use_fee"
      reminder_type:
        | "30_day"
        | "14_day"
        | "7_day"
        | "due_date"
        | "overdue_weekly"
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
      billing_cycle_status: ["draft", "active", "completed", "cancelled"],
      billing_cycle_type: ["end_of_year", "end_of_season", "monthly", "custom"],
      billing_frequency: ["annual", "seasonal", "monthly", "manual"],
      email_status: ["sent", "failed"],
      invoice_status: [
        "draft",
        "sent",
        "partial",
        "paid",
        "overdue",
        "cancelled",
      ],
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
        "deferred",
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
        "use_fee",
      ],
      reminder_type: [
        "30_day",
        "14_day",
        "7_day",
        "due_date",
        "overdue_weekly",
      ],
    },
  },
} as const
