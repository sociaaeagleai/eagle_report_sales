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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      anomaly_resolutions: {
        Row: {
          anomaly_field: string
          anomaly_message: string
          anomaly_type: string
          created_at: string
          id: string
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          submission_id: string
        }
        Insert: {
          anomaly_field: string
          anomaly_message: string
          anomaly_type: string
          created_at?: string
          id?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          submission_id: string
        }
        Update: {
          anomaly_field?: string
          anomaly_message?: string
          anomaly_type?: string
          created_at?: string
          id?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          submission_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "anomaly_resolutions_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "anomaly_resolutions_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "daily_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          absence_type: Database["public"]["Enums"]["absence_type"] | null
          created_at: string
          date: string
          id: string
          marked_by: string | null
          notes: string | null
          notes_updated_at: string | null
          notes_updated_by: string | null
          performance_rating: number | null
          status: Database["public"]["Enums"]["attendance_status"]
          task_completed: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          absence_type?: Database["public"]["Enums"]["absence_type"] | null
          created_at?: string
          date: string
          id?: string
          marked_by?: string | null
          notes?: string | null
          notes_updated_at?: string | null
          notes_updated_by?: string | null
          performance_rating?: number | null
          status?: Database["public"]["Enums"]["attendance_status"]
          task_completed?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          absence_type?: Database["public"]["Enums"]["absence_type"] | null
          created_at?: string
          date?: string
          id?: string
          marked_by?: string | null
          notes?: string | null
          notes_updated_at?: string | null
          notes_updated_by?: string | null
          performance_rating?: number | null
          status?: Database["public"]["Enums"]["attendance_status"]
          task_completed?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_marked_by_fkey"
            columns: ["marked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_submissions: {
        Row: {
          admin_notes: string | null
          admin_notes_updated_at: string | null
          admin_notes_updated_by: string | null
          calls_dialled: number | null
          calls_not_taken: number | null
          calls_taken: number | null
          created_at: string
          date: string
          disqualified: number | null
          followed_up: number | null
          fu_enrolled: number | null
          fu_rp: number | null
          fu_rp_to_enrolled: number | null
          id: string
          is_crm_updated: string | null
          others: number | null
          rapport_built: number | null
          sm_enrolled: number | null
          sm_rp: number | null
          sm_rp_to_enrolled: number | null
          source: Json | null
          sub_source: string | null
          task_completion_status: string | null
          touched_base: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          admin_notes_updated_at?: string | null
          admin_notes_updated_by?: string | null
          calls_dialled?: number | null
          calls_not_taken?: number | null
          calls_taken?: number | null
          created_at?: string
          date: string
          disqualified?: number | null
          followed_up?: number | null
          fu_enrolled?: number | null
          fu_rp?: number | null
          fu_rp_to_enrolled?: number | null
          id?: string
          is_crm_updated?: string | null
          others?: number | null
          rapport_built?: number | null
          sm_enrolled?: number | null
          sm_rp?: number | null
          sm_rp_to_enrolled?: number | null
          source?: Json | null
          sub_source?: string | null
          task_completion_status?: string | null
          touched_base?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          admin_notes_updated_at?: string | null
          admin_notes_updated_by?: string | null
          calls_dialled?: number | null
          calls_not_taken?: number | null
          calls_taken?: number | null
          created_at?: string
          date?: string
          disqualified?: number | null
          followed_up?: number | null
          fu_enrolled?: number | null
          fu_rp?: number | null
          fu_rp_to_enrolled?: number | null
          id?: string
          is_crm_updated?: string | null
          others?: number | null
          rapport_built?: number | null
          sm_enrolled?: number | null
          sm_rp?: number | null
          sm_rp_to_enrolled?: number | null
          source?: Json | null
          sub_source?: string | null
          task_completion_status?: string | null
          touched_base?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_submissions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_anomalies: {
        Row: {
          anomaly_field: string
          anomaly_message: string
          created_at: string
          created_by: string
          id: string
          resolution_note: string | null
          resolved_at: string | null
          resolved_by: string | null
          submission_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          anomaly_field: string
          anomaly_message: string
          created_at?: string
          created_by: string
          id?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          submission_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          anomaly_field?: string
          anomaly_message?: string
          created_at?: string
          created_by?: string
          id?: string
          resolution_note?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          submission_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "manual_anomalies_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_anomalies_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_anomalies_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "daily_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          mode: Database["public"]["Enums"]["work_mode"]
          name: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          mode?: Database["public"]["Enums"]["work_mode"]
          name: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          mode?: Database["public"]["Enums"]["work_mode"]
          name?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_submission_totals: {
        Args: {
          filter_end_date?: string
          filter_sources?: string[]
          filter_start_date?: string
          filter_sub_source?: string
          filter_user_ids?: string[]
          selected_ids?: string[]
        }
        Returns: {
          calls_dialled: number
          calls_not_taken: number
          calls_taken: number
          disqualified: number
          followed_up: number
          fu_enrolled: number
          fu_rp: number
          fu_rp_to_enrolled: number
          others: number
          rapport_built: number
          sm_enrolled: number
          sm_rp: number
          sm_rp_to_enrolled: number
          total_count: number
          touched_base: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      absence_type: "sick_leave" | "emergency" | "vacation" | "other"
      app_role: "admin" | "employee"
      attendance_status: "present" | "absent"
      source_type:
        | "micro_vsl"
        | "vsl"
        | "thiru"
        | "vishnu"
        | "ctwa"
        | "direct_visit"
        | "sha"
        | "direct_whatsapp"
        | "direct_call"
        | "meta_leads"
        | "website"
        | "manoj"
        | "social_media"
      work_mode: "AI" | "DM"
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
      absence_type: ["sick_leave", "emergency", "vacation", "other"],
      app_role: ["admin", "employee"],
      attendance_status: ["present", "absent"],
      source_type: [
        "micro_vsl",
        "vsl",
        "thiru",
        "vishnu",
        "ctwa",
        "direct_visit",
        "sha",
        "direct_whatsapp",
        "direct_call",
        "meta_leads",
        "website",
        "manoj",
        "social_media",
      ],
      work_mode: ["AI", "DM"],
    },
  },
} as const
