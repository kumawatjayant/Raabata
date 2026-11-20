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
  public: {
    Tables: {
      activity_photos: {
        Row: {
          caption: string
          category: string
          consent_verified: boolean
          created_at: string
          created_by: string | null
          id: string
          image_url: string
          is_published: boolean
          title: string
        }
        Insert: {
          caption: string
          category?: string
          consent_verified?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          image_url: string
          is_published?: boolean
          title: string
        }
        Update: {
          caption?: string
          category?: string
          consent_verified?: boolean
          created_at?: string
          created_by?: string | null
          id?: string
          image_url?: string
          is_published?: boolean
          title?: string
        }
        Relationships: []
      }
      app_profiles: {
        Row: {
          created_at: string
          display_name: string
          location: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          location?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          location?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      enquiries: {
        Row: {
          consent: boolean
          created_at: string
          details: Json
          email: string
          id: string
          kind: string
          name: string
        }
        Insert: {
          consent: boolean
          created_at?: string
          details: Json
          email: string
          id?: string
          kind: string
          name: string
        }
        Update: {
          consent?: boolean
          created_at?: string
          details?: Json
          email?: string
          id?: string
          kind?: string
          name?: string
        }
        Relationships: []
      }
      fund_allocations: {
        Row: {
          amount_inr: number
          category: string
          created_at: string
          description: string
          entry_date: string
          entry_type: string
          id: string
          is_published: boolean
          proof_caption: string | null
          proof_type: string | null
          proof_url: string | null
          recorded_by: string | null
          title: string
          updated_at: string
          vendor_or_beneficiary: string | null
        }
        Insert: {
          amount_inr: number
          category: string
          created_at?: string
          description?: string
          entry_date?: string
          entry_type: string
          id?: string
          is_published?: boolean
          proof_caption?: string | null
          proof_type?: string | null
          proof_url?: string | null
          recorded_by?: string | null
          title: string
          updated_at?: string
          vendor_or_beneficiary?: string | null
        }
        Update: {
          amount_inr?: number
          category?: string
          created_at?: string
          description?: string
          entry_date?: string
          entry_type?: string
          id?: string
          is_published?: boolean
          proof_caption?: string | null
          proof_type?: string | null
          proof_url?: string | null
          recorded_by?: string | null
          title?: string
          updated_at?: string
          vendor_or_beneficiary?: string | null
        }
        Relationships: []
      }
      fund_audit_logs: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          id: string
          record_id: string | null
          summary: string
          table_name: string
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          record_id?: string | null
          summary: string
          table_name: string
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          record_id?: string | null
          summary?: string
          table_name?: string
        }
        Relationships: []
      }
      fund_donations: {
        Row: {
          amount_inr: number
          created_at: string
          donor_email: string | null
          donor_name: string
          donor_phone: string | null
          id: string
          is_public_acknowledgement: boolean
          notes: string | null
          payment_reference: string | null
          public_label: string
          purpose: string
          received_date: string
          recorded_by: string | null
        }
        Insert: {
          amount_inr: number
          created_at?: string
          donor_email?: string | null
          donor_name?: string
          donor_phone?: string | null
          id?: string
          is_public_acknowledgement?: boolean
          notes?: string | null
          payment_reference?: string | null
          public_label?: string
          purpose?: string
          received_date?: string
          recorded_by?: string | null
        }
        Update: {
          amount_inr?: number
          created_at?: string
          donor_email?: string | null
          donor_name?: string
          donor_phone?: string | null
          id?: string
          is_public_acknowledgement?: boolean
          notes?: string | null
          payment_reference?: string | null
          public_label?: string
          purpose?: string
          received_date?: string
          recorded_by?: string | null
        }
        Relationships: []
      }
      mentor_profiles: {
        Row: {
          availability: string | null
          bio: string | null
          class_levels: string
          created_at: string
          email: string
          experience: string | null
          full_name: string
          is_active: boolean
          languages: string
          location: string | null
          phone: string | null
          qualifications: string
          subjects: string
          updated_at: string
          user_id: string
        }
        Insert: {
          availability?: string | null
          bio?: string | null
          class_levels?: string
          created_at?: string
          email?: string
          experience?: string | null
          full_name?: string
          is_active?: boolean
          languages?: string
          location?: string | null
          phone?: string | null
          qualifications?: string
          subjects?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          availability?: string | null
          bio?: string | null
          class_levels?: string
          created_at?: string
          email?: string
          experience?: string | null
          full_name?: string
          is_active?: boolean
          languages?: string
          location?: string | null
          phone?: string | null
          qualifications?: string
          subjects?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      mentor_student_assignments: {
        Row: {
          active: boolean
          assigned_at: string
          assigned_by: string | null
          id: string
          mentor_user_id: string
          schedule_notes: string | null
          student_id: string
          subjects: string
        }
        Insert: {
          active?: boolean
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          mentor_user_id: string
          schedule_notes?: string | null
          student_id: string
          subjects?: string
        }
        Update: {
          active?: boolean
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          mentor_user_id?: string
          schedule_notes?: string | null
          student_id?: string
          subjects?: string
        }
        Relationships: []
      }
      recorded_lectures: {
        Row: {
          class_level: string
          created_at: string
          created_by: string | null
          description: string
          duration: string | null
          id: string
          instructor_name: string
          is_published: boolean
          subject: string
          thumbnail_url: string | null
          title: string
          topic: string
          video_url: string
          youtube_id: string | null
        }
        Insert: {
          class_level?: string
          created_at?: string
          created_by?: string | null
          description?: string
          duration?: string | null
          id?: string
          instructor_name?: string
          is_published?: boolean
          subject: string
          thumbnail_url?: string | null
          title: string
          topic?: string
          video_url: string
          youtube_id?: string | null
        }
        Update: {
          class_level?: string
          created_at?: string
          created_by?: string | null
          description?: string
          duration?: string | null
          id?: string
          instructor_name?: string
          is_published?: boolean
          subject?: string
          thumbnail_url?: string | null
          title?: string
          topic?: string
          video_url?: string
          youtube_id?: string | null
        }
        Relationships: []
      }
      student_academic_profiles: {
        Row: {
          academic_documents: Json
          age: number | null
          attendance_calendar: Json
          class_grade: string
          educational_goals: string
          full_name: string
          joined_date: string
          learning_development: Json
          learning_goals: Json
          monthly_assessments: Json
          photo_url: string | null
          preferred_language: string
          school_name: string
          student_code: string
          student_id: string
          subject_performances: Json
          subjects_enrolled: string[]
          teacher_feedback: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          academic_documents?: Json
          age?: number | null
          attendance_calendar?: Json
          class_grade: string
          educational_goals?: string
          full_name: string
          joined_date?: string
          learning_development?: Json
          learning_goals?: Json
          monthly_assessments?: Json
          photo_url?: string | null
          preferred_language?: string
          school_name?: string
          student_code: string
          student_id: string
          subject_performances?: Json
          subjects_enrolled?: string[]
          teacher_feedback?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          academic_documents?: Json
          age?: number | null
          attendance_calendar?: Json
          class_grade?: string
          educational_goals?: string
          full_name?: string
          joined_date?: string
          learning_development?: Json
          learning_goals?: Json
          monthly_assessments?: Json
          photo_url?: string | null
          preferred_language?: string
          school_name?: string
          student_code?: string
          student_id?: string
          subject_performances?: Json
          subjects_enrolled?: string[]
          teacher_feedback?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      student_progress_logs: {
        Row: {
          attendance_status: string
          created_at: string
          id: string
          mentor_user_id: string | null
          remarks: string | null
          session_date: string
          student_id: string
          topic_covered: string
        }
        Insert: {
          attendance_status?: string
          created_at?: string
          id?: string
          mentor_user_id?: string | null
          remarks?: string | null
          session_date?: string
          student_id: string
          topic_covered: string
        }
        Update: {
          attendance_status?: string
          created_at?: string
          id?: string
          mentor_user_id?: string | null
          remarks?: string | null
          session_date?: string
          student_id?: string
          topic_covered?: string
        }
        Relationships: []
      }
      student_records: {
        Row: {
          attendance_count: number
          class_level: string
          created_at: string
          created_by: string | null
          first_name: string
          guardian_consent: boolean
          guardian_email: string
          guardian_name: string | null
          guardian_phone: string | null
          id: string
          learning_goals: string | null
          preferred_format: string
          preferred_language: string
          progress_summary: string | null
          status: string
          student_user_id: string | null
          subjects_needed: string
          total_sessions: number
          updated_at: string
        }
        Insert: {
          attendance_count?: number
          class_level: string
          created_at?: string
          created_by?: string | null
          first_name: string
          guardian_consent?: boolean
          guardian_email: string
          guardian_name?: string | null
          guardian_phone?: string | null
          id?: string
          learning_goals?: string | null
          preferred_format?: string
          preferred_language?: string
          progress_summary?: string | null
          status?: string
          student_user_id?: string | null
          subjects_needed: string
          total_sessions?: number
          updated_at?: string
        }
        Update: {
          attendance_count?: number
          class_level?: string
          created_at?: string
          created_by?: string | null
          first_name?: string
          guardian_consent?: boolean
          guardian_email?: string
          guardian_name?: string | null
          guardian_phone?: string | null
          id?: string
          learning_goals?: string | null
          preferred_format?: string
          preferred_language?: string
          progress_summary?: string | null
          status?: string
          student_user_id?: string | null
          subjects_needed?: string
          total_sessions?: number
          updated_at?: string
        }
        Relationships: []
      }
      success_stories: {
        Row: {
          achievement_or_progress: string
          class_or_age: string
          created_at: string
          created_by: string | null
          focus_area: string
          guardian_consent_verified: boolean
          id: string
          image_url: string | null
          is_anonymous: boolean
          is_published: boolean
          learner_display_name: string
          quote: string | null
          story_summary: string
          support_given: string
          title: string
        }
        Insert: {
          achievement_or_progress: string
          class_or_age?: string
          created_at?: string
          created_by?: string | null
          focus_area?: string
          guardian_consent_verified?: boolean
          id?: string
          image_url?: string | null
          is_anonymous?: boolean
          is_published?: boolean
          learner_display_name?: string
          quote?: string | null
          story_summary: string
          support_given: string
          title: string
        }
        Update: {
          achievement_or_progress?: string
          class_or_age?: string
          created_at?: string
          created_by?: string | null
          focus_area?: string
          guardian_consent_verified?: boolean
          id?: string
          image_url?: string | null
          is_anonymous?: boolean
          is_published?: boolean
          learner_display_name?: string
          quote?: string | null
          story_summary?: string
          support_given?: string
          title?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          requested_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          role: Database["public"]["Enums"]["app_role"]
          status: Database["public"]["Enums"]["role_status"]
          user_id: string
        }
        Insert: {
          id?: string
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          role: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["role_status"]
          user_id: string
        }
        Update: {
          id?: string
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          status?: Database["public"]["Enums"]["role_status"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      bootstrap_initial_admin: { Args: never; Returns: string }
      get_public_fund_summary: { Args: never; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_assigned_mentor: {
        Args: {
          _mentor_id: string
          _student_id: string
        }
        Returns: boolean
      }
      request_app_role: {
        Args: { p_role: Database["public"]["Enums"]["app_role"] }
        Returns: Database["public"]["Enums"]["role_status"]
      }
      review_app_role: {
        Args: {
          p_decision: Database["public"]["Enums"]["role_status"]
          p_role_id: string
        }
        Returns: Database["public"]["Enums"]["role_status"]
      }
      submit_enquiry: {
        Args: {
          p_consent: boolean
          p_details: Json
          p_email: string
          p_kind: string
          p_name: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "mentor" | "student"
      role_status: "pending" | "active" | "rejected"
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
  public: {
    Enums: {
      app_role: ["admin", "mentor", "student"],
      role_status: ["pending", "active", "rejected"],
    },
  },
} as const
