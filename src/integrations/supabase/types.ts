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
        ]
      }
      family_groups: {
        Row: {
          created_at: string
          host_members: string[] | null
          id: string
          lead_email: string | null
          lead_name: string | null
          lead_phone: string | null
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          host_members?: string[] | null
          id?: string
          lead_email?: string | null
          lead_name?: string | null
          lead_phone?: string | null
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          host_members?: string[] | null
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
        ]
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
            foreignKeyName: "receipts_organization_id_fkey"
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
            foreignKeyName: "reservation_settings_organization_id_fkey"
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
            foreignKeyName: "survey_responses_organization_id_fkey"
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
      set_primary_organization: {
        Args: { org_id: string }
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
