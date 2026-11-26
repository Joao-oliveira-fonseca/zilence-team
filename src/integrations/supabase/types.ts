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
      audit_log: {
        Row: {
          action: string
          actor_id: string
          actor_name: string
          created_at: string
          details: Json
          entity_id: string | null
          entity_label: string | null
          entity_type: string
          id: string
        }
        Insert: {
          action: string
          actor_id: string
          actor_name: string
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_label?: string | null
          entity_type: string
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string
          actor_name?: string
          created_at?: string
          details?: Json
          entity_id?: string | null
          entity_label?: string | null
          entity_type?: string
          id?: string
        }
        Relationships: []
      }
      calendar_event_private_notes: {
        Row: {
          created_at: string
          created_by: string | null
          event_id: string
          notes: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          event_id: string
          notes?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          event_id?: string
          notes?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_event_private_notes_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: true
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          coach_notes: string | null
          created_at: string
          created_by: string | null
          description: string | null
          ends_at: string | null
          event_type: Database["public"]["Enums"]["event_type"]
          external_link: string | null
          id: string
          location: string | null
          participant_ids: string[]
          related_player_id: string | null
          scrim_session_id: string | null
          starts_at: string
          timezone: string
          title: string
          updated_at: string
          visibility: Database["public"]["Enums"]["visibility_level"]
        }
        Insert: {
          coach_notes?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          event_type?: Database["public"]["Enums"]["event_type"]
          external_link?: string | null
          id?: string
          location?: string | null
          participant_ids?: string[]
          related_player_id?: string | null
          scrim_session_id?: string | null
          starts_at: string
          timezone?: string
          title: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility_level"]
        }
        Update: {
          coach_notes?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          ends_at?: string | null
          event_type?: Database["public"]["Enums"]["event_type"]
          external_link?: string | null
          id?: string
          location?: string | null
          participant_ids?: string[]
          related_player_id?: string | null
          scrim_session_id?: string | null
          starts_at?: string
          timezone?: string
          title?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility_level"]
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_related_player_id_fkey"
            columns: ["related_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_scrim_session_id_fkey"
            columns: ["scrim_session_id"]
            isOneToOne: true
            referencedRelation: "scrim_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      champion_pool: {
        Row: {
          champion_id: string
          champion_name: string
          comment: string | null
          created_at: string
          created_by: string | null
          id: string
          mastery_notes: string | null
          player_id: string
          position: Database["public"]["Enums"]["lol_position"]
          rating: number
          updated_at: string
          visibility: Database["public"]["Enums"]["visibility_level"]
        }
        Insert: {
          champion_id: string
          champion_name: string
          comment?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          mastery_notes?: string | null
          player_id: string
          position: Database["public"]["Enums"]["lol_position"]
          rating?: number
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility_level"]
        }
        Update: {
          champion_id?: string
          champion_name?: string
          comment?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          mastery_notes?: string | null
          player_id?: string
          position?: Database["public"]["Enums"]["lol_position"]
          rating?: number
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility_level"]
        }
        Relationships: [
          {
            foreignKeyName: "champion_pool_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_notes: {
        Row: {
          author_name: string
          category: Database["public"]["Enums"]["coach_note_category"]
          content: string
          created_at: string
          created_by: string | null
          id: string
          pinned: boolean
          player_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          author_name?: string
          category?: Database["public"]["Enums"]["coach_note_category"]
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          pinned?: boolean
          player_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          author_name?: string
          category?: Database["public"]["Enums"]["coach_note_category"]
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          pinned?: boolean
          player_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_notes_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      draft_analyses: {
        Row: {
          analysis_date: string
          coach_name: string | null
          created_at: string
          created_by: string | null
          id: string
          matchups: string | null
          opponent: string | null
          opponent_composition: string[]
          player_id: string | null
          positives: string | null
          problems: string | null
          strategy: string | null
          team_composition: string[]
          title: string
          updated_at: string
          visibility: Database["public"]["Enums"]["visibility_level"]
          win_conditions: string | null
        }
        Insert: {
          analysis_date?: string
          coach_name?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          matchups?: string | null
          opponent?: string | null
          opponent_composition?: string[]
          player_id?: string | null
          positives?: string | null
          problems?: string | null
          strategy?: string | null
          team_composition?: string[]
          title: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility_level"]
          win_conditions?: string | null
        }
        Update: {
          analysis_date?: string
          coach_name?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          matchups?: string | null
          opponent?: string | null
          opponent_composition?: string[]
          player_id?: string | null
          positives?: string | null
          problems?: string | null
          strategy?: string | null
          team_composition?: string[]
          title?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility_level"]
          win_conditions?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "draft_analyses_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          data: Json
          entity_id: string
          entity_type: string
          id: string
          kind: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          data?: Json
          entity_id: string
          entity_type: string
          id?: string
          kind: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          data?: Json
          entity_id?: string
          entity_type?: string
          id?: string
          kind?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      player_evaluations: {
        Row: {
          coach_id: string | null
          coach_name: string | null
          comments: Json
          created_at: string
          evaluated_at: string
          id: string
          knowledge_avg: number | null
          macro_avg: number | null
          mental_avg: number | null
          micro_avg: number | null
          overall: number | null
          player_id: string
          scores: Json
          teamplay_avg: number | null
          updated_at: string
          visibility: Database["public"]["Enums"]["visibility_level"]
        }
        Insert: {
          coach_id?: string | null
          coach_name?: string | null
          comments?: Json
          created_at?: string
          evaluated_at?: string
          id?: string
          knowledge_avg?: number | null
          macro_avg?: number | null
          mental_avg?: number | null
          micro_avg?: number | null
          overall?: number | null
          player_id: string
          scores?: Json
          teamplay_avg?: number | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility_level"]
        }
        Update: {
          coach_id?: string | null
          coach_name?: string | null
          comments?: Json
          created_at?: string
          evaluated_at?: string
          id?: string
          knowledge_avg?: number | null
          macro_avg?: number | null
          mental_avg?: number | null
          micro_avg?: number | null
          overall?: number | null
          player_id?: string
          scores?: Json
          teamplay_avg?: number | null
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility_level"]
        }
        Relationships: [
          {
            foreignKeyName: "player_evaluations_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          avatar_url: string | null
          created_at: string
          created_by: string | null
          description: string | null
          elo: string | null
          id: string
          main_position: Database["public"]["Enums"]["lol_position"]
          nickname: string
          real_name: string | null
          region: string | null
          secondary_position: Database["public"]["Enums"]["lol_position"] | null
          status: Database["public"]["Enums"]["player_status"]
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          elo?: string | null
          id?: string
          main_position: Database["public"]["Enums"]["lol_position"]
          nickname: string
          real_name?: string | null
          region?: string | null
          secondary_position?:
            | Database["public"]["Enums"]["lol_position"]
            | null
          status?: Database["public"]["Enums"]["player_status"]
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          elo?: string | null
          id?: string
          main_position?: Database["public"]["Enums"]["lol_position"]
          nickname?: string
          real_name?: string | null
          region?: string | null
          secondary_position?:
            | Database["public"]["Enums"]["lol_position"]
            | null
          status?: Database["public"]["Enums"]["player_status"]
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          language: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id: string
          language?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          language?: string
          updated_at?: string
        }
        Relationships: []
      }
      scrim_games: {
        Row: {
          bans: Json
          created_at: string
          created_by: string | null
          duration_minutes: number | null
          game_number: number
          id: string
          improvements: string | null
          observations: string | null
          opponent_composition: string[]
          participant_ids: string[]
          picks: Json
          positives: string | null
          result: Database["public"]["Enums"]["scrim_result"] | null
          session_id: string
          updated_at: string
          zilence_composition: string[]
        }
        Insert: {
          bans?: Json
          created_at?: string
          created_by?: string | null
          duration_minutes?: number | null
          game_number: number
          id?: string
          improvements?: string | null
          observations?: string | null
          opponent_composition?: string[]
          participant_ids?: string[]
          picks?: Json
          positives?: string | null
          result?: Database["public"]["Enums"]["scrim_result"] | null
          session_id: string
          updated_at?: string
          zilence_composition?: string[]
        }
        Update: {
          bans?: Json
          created_at?: string
          created_by?: string | null
          duration_minutes?: number | null
          game_number?: number
          id?: string
          improvements?: string | null
          observations?: string | null
          opponent_composition?: string[]
          participant_ids?: string[]
          picks?: Json
          positives?: string | null
          result?: Database["public"]["Enums"]["scrim_result"] | null
          session_id?: string
          updated_at?: string
          zilence_composition?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "scrim_games_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "scrim_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      scrim_private_notes: {
        Row: {
          created_at: string
          created_by: string | null
          notes: string
          session_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          notes?: string
          session_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          notes?: string
          session_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "scrim_private_notes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "scrim_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      scrim_sessions: {
        Row: {
          created_at: string
          created_by: string | null
          duration_minutes: number
          id: string
          opponent: string
          participant_ids: string[]
          planned_games: number
          scrim_type: Database["public"]["Enums"]["scrim_type"]
          starts_at: string
          timezone: string
          updated_at: string
          visibility: Database["public"]["Enums"]["visibility_level"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          duration_minutes?: number
          id?: string
          opponent: string
          participant_ids?: string[]
          planned_games?: number
          scrim_type?: Database["public"]["Enums"]["scrim_type"]
          starts_at: string
          timezone?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility_level"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          duration_minutes?: number
          id?: string
          opponent?: string
          participant_ids?: string[]
          planned_games?: number
          scrim_type?: Database["public"]["Enums"]["scrim_type"]
          starts_at?: string
          timezone?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility_level"]
        }
        Relationships: []
      }
      team_settings: {
        Row: {
          about: string | null
          game: string
          id: number
          logo_url: string | null
          name: string
          slogan: string
          updated_at: string
        }
        Insert: {
          about?: string | null
          game?: string
          id?: number
          logo_url?: string | null
          name?: string
          slogan?: string
          updated_at?: string
        }
        Update: {
          about?: string | null
          game?: string
          id?: number
          logo_url?: string | null
          name?: string
          slogan?: string
          updated_at?: string
        }
        Relationships: []
      }
      team_tasks: {
        Row: {
          category: Database["public"]["Enums"]["task_category"]
          created_at: string
          created_by: string | null
          description: string | null
          due_at: string | null
          id: string
          player_id: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
          visibility: Database["public"]["Enums"]["visibility_level"]
        }
        Insert: {
          category?: Database["public"]["Enums"]["task_category"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          player_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility_level"]
        }
        Update: {
          category?: Database["public"]["Enums"]["task_category"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          player_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["visibility_level"]
        }
        Relationships: [
          {
            foreignKeyName: "team_tasks_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: []
      }
      vod_reviews: {
        Row: {
          category: Database["public"]["Enums"]["vod_category"]
          coach_name: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          match_label: string | null
          opponent: string | null
          player_id: string | null
          review_date: string
          title: string
          updated_at: string
          video_url: string
          visibility: Database["public"]["Enums"]["visibility_level"]
        }
        Insert: {
          category?: Database["public"]["Enums"]["vod_category"]
          coach_name?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          match_label?: string | null
          opponent?: string | null
          player_id?: string | null
          review_date?: string
          title: string
          updated_at?: string
          video_url: string
          visibility?: Database["public"]["Enums"]["visibility_level"]
        }
        Update: {
          category?: Database["public"]["Enums"]["vod_category"]
          coach_name?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          match_label?: string | null
          opponent?: string | null
          player_id?: string | null
          review_date?: string
          title?: string
          updated_at?: string
          video_url?: string
          visibility?: Database["public"]["Enums"]["visibility_level"]
        }
        Relationships: [
          {
            foreignKeyName: "vod_reviews_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      vod_timestamps: {
        Row: {
          category: Database["public"]["Enums"]["vod_category"]
          comment: string | null
          created_at: string
          created_by: string | null
          id: string
          player_id: string | null
          review_id: string
          seconds: number
          title: string
          updated_at: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["vod_category"]
          comment?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          player_id?: string | null
          review_id: string
          seconds: number
          title: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["vod_category"]
          comment?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          player_id?: string | null
          review_id?: string
          seconds?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vod_timestamps_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vod_timestamps_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "vod_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_coach_role: { Args: { _user_id: string }; Returns: undefined }
      can_read_scrim_session: {
        Args: { _session_id: string }
        Returns: boolean
      }
      can_read_vod_review: { Args: { _review_id: string }; Returns: boolean }
      has_any_coach: { Args: never; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_coach: { Args: { _user_id: string }; Returns: boolean }
      link_player_account: {
        Args: { _player_id: string; _user_id: string }
        Returns: undefined
      }
      my_player_id: { Args: never; Returns: string }
      notify_recipients: {
        Args: {
          _entity_id: string
          _entity_type: string
          _kind: string
          _name: string
          _participant_ids: string[]
          _player_id: string
          _team_all: boolean
          _visibility: Database["public"]["Enums"]["visibility_level"]
        }
        Returns: undefined
      }
      notify_user: {
        Args: {
          _entity_id: string
          _entity_type: string
          _kind: string
          _name: string
          _user_id: string
        }
        Returns: undefined
      }
      pending_accounts: {
        Args: never
        Returns: {
          created_at: string
          display_name: string
          email: string
          id: string
        }[]
      }
      remove_coach_role: { Args: { _user_id: string }; Returns: undefined }
      sync_task_deadline_notifications: { Args: never; Returns: undefined }
      unlink_player_account: {
        Args: { _player_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "coach" | "player"
      coach_note_category:
        | "player_notes"
        | "individual_performance"
        | "scrim_analysis"
        | "draft_analysis"
        | "team_strategy"
        | "mental_behavior"
        | "general_notes"
      event_type:
        | "championship"
        | "official_match"
        | "scrim"
        | "training"
        | "team_meeting"
        | "draft_review"
        | "other"
      lol_position: "TOP" | "JUNGLE" | "MID" | "ADC" | "SUPPORT"
      player_status: "active" | "substitute" | "trial" | "inactive"
      scrim_result: "WIN" | "LOSS"
      scrim_type:
        | "BO3"
        | "BO5"
        | "SOLO_GAME"
        | "TEAM_PRACTICE"
        | "DRAFT_PRACTICE"
      task_category:
        | "individual_training"
        | "champion_study"
        | "vod_review"
        | "macro_study"
        | "mechanics"
        | "team_objective"
        | "other"
      task_priority: "low" | "medium" | "high" | "urgent"
      task_status: "pending" | "in_progress" | "completed" | "overdue"
      visibility_level: "private" | "player" | "team"
      vod_category:
        | "macro"
        | "micro"
        | "teamfight"
        | "positioning"
        | "draft"
        | "objectives"
        | "communication"
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
      app_role: ["coach", "player"],
      coach_note_category: [
        "player_notes",
        "individual_performance",
        "scrim_analysis",
        "draft_analysis",
        "team_strategy",
        "mental_behavior",
        "general_notes",
      ],
      event_type: [
        "championship",
        "official_match",
        "scrim",
        "training",
        "team_meeting",
        "draft_review",
        "other",
      ],
      lol_position: ["TOP", "JUNGLE", "MID", "ADC", "SUPPORT"],
      player_status: ["active", "substitute", "trial", "inactive"],
      scrim_result: ["WIN", "LOSS"],
      scrim_type: [
        "BO3",
        "BO5",
        "SOLO_GAME",
        "TEAM_PRACTICE",
        "DRAFT_PRACTICE",
      ],
      task_category: [
        "individual_training",
        "champion_study",
        "vod_review",
        "macro_study",
        "mechanics",
        "team_objective",
        "other",
      ],
      task_priority: ["low", "medium", "high", "urgent"],
      task_status: ["pending", "in_progress", "completed", "overdue"],
      visibility_level: ["private", "player", "team"],
      vod_category: [
        "macro",
        "micro",
        "teamfight",
        "positioning",
        "draft",
        "objectives",
        "communication",
        "other",
      ],
    },
  },
} as const
