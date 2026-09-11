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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      alerts: {
        Row: {
          acknowledged_at: string | null
          alert_type: string
          created_at: string
          id: string
          lead_time: number | null
          location_id: string | null
          message: string
          probability: number
          recommended_action: string | null
          risk_level: Database["public"]["Enums"]["risk_level"]
          status: string
        }
        Insert: {
          acknowledged_at?: string | null
          alert_type: string
          created_at?: string
          id?: string
          lead_time?: number | null
          location_id?: string | null
          message: string
          probability?: number
          recommended_action?: string | null
          risk_level?: Database["public"]["Enums"]["risk_level"]
          status?: string
        }
        Update: {
          acknowledged_at?: string | null
          alert_type?: string
          created_at?: string
          id?: string
          lead_time?: number | null
          location_id?: string | null
          message?: string
          probability?: number
          recommended_action?: string | null
          risk_level?: Database["public"]["Enums"]["risk_level"]
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      emergency_actions: {
        Row: {
          action: string
          created_at: string
          id: string
          location_id: string | null
          priority: number
          reason: string | null
          status: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          location_id?: string | null
          priority?: number
          reason?: string | null
          status?: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          location_id?: string | null
          priority?: number
          reason?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "emergency_actions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      evacuation_orders: {
        Row: {
          alternate_shelters: Json
          created_at: string
          exposed_population: number
          id: string
          lead_time_minutes: number | null
          location_id: string | null
          location_name: string
          message: string
          primary_shelter_accessibility: string | null
          primary_shelter_available: number | null
          primary_shelter_distance_km: number | null
          primary_shelter_drive_minutes: number | null
          primary_shelter_lat: number | null
          primary_shelter_lng: number | null
          primary_shelter_name: string | null
          primary_shelter_walk_minutes: number | null
          probability: number
          risk_level: Database["public"]["Enums"]["risk_level"]
          risk_score: number
          status: string
          total_population: number
          updated_at: string
        }
        Insert: {
          alternate_shelters?: Json
          created_at?: string
          exposed_population?: number
          id?: string
          lead_time_minutes?: number | null
          location_id?: string | null
          location_name: string
          message: string
          primary_shelter_accessibility?: string | null
          primary_shelter_available?: number | null
          primary_shelter_distance_km?: number | null
          primary_shelter_drive_minutes?: number | null
          primary_shelter_lat?: number | null
          primary_shelter_lng?: number | null
          primary_shelter_name?: string | null
          primary_shelter_walk_minutes?: number | null
          probability?: number
          risk_level?: Database["public"]["Enums"]["risk_level"]
          risk_score?: number
          status?: string
          total_population?: number
          updated_at?: string
        }
        Update: {
          alternate_shelters?: Json
          created_at?: string
          exposed_population?: number
          id?: string
          lead_time_minutes?: number | null
          location_id?: string | null
          location_name?: string
          message?: string
          primary_shelter_accessibility?: string | null
          primary_shelter_available?: number | null
          primary_shelter_distance_km?: number | null
          primary_shelter_drive_minutes?: number | null
          primary_shelter_lat?: number | null
          primary_shelter_lng?: number | null
          primary_shelter_name?: string | null
          primary_shelter_walk_minutes?: number | null
          probability?: number
          risk_level?: Database["public"]["Enums"]["risk_level"]
          risk_score?: number
          status?: string
          total_population?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evacuation_orders_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      evacuation_routes: {
        Row: {
          distance_km: number
          estimated_time_minutes: number
          flood_risk: string
          id: string
          landslide_risk: string
          origin_location: string | null
          route_safety_score: number
          shelter_id: string | null
          status: string
        }
        Insert: {
          distance_km?: number
          estimated_time_minutes?: number
          flood_risk?: string
          id?: string
          landslide_risk?: string
          origin_location?: string | null
          route_safety_score?: number
          shelter_id?: string | null
          status?: string
        }
        Update: {
          distance_km?: number
          estimated_time_minutes?: number
          flood_risk?: string
          id?: string
          landslide_risk?: string
          origin_location?: string | null
          route_safety_score?: number
          shelter_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "evacuation_routes_origin_location_fkey"
            columns: ["origin_location"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evacuation_routes_shelter_id_fkey"
            columns: ["shelter_id"]
            isOneToOne: false
            referencedRelation: "shelters"
            referencedColumns: ["id"]
          },
        ]
      }
      historical_events: {
        Row: {
          affected_area: number
          affected_population: number
          event_date: string
          flood_occurred: boolean
          historical_water_level: number
          id: string
          infrastructure_damage: string | null
          landslide_occurred: boolean
          latitude: number | null
          location_id: string | null
          longitude: number | null
          rainfall: number
          severity: string
        }
        Insert: {
          affected_area?: number
          affected_population?: number
          event_date: string
          flood_occurred?: boolean
          historical_water_level?: number
          id?: string
          infrastructure_damage?: string | null
          landslide_occurred?: boolean
          latitude?: number | null
          location_id?: string | null
          longitude?: number | null
          rainfall?: number
          severity?: string
        }
        Update: {
          affected_area?: number
          affected_population?: number
          event_date?: string
          flood_occurred?: boolean
          historical_water_level?: number
          id?: string
          infrastructure_damage?: string | null
          landslide_occurred?: boolean
          latitude?: number | null
          location_id?: string | null
          longitude?: number | null
          rainfall?: number
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "historical_events_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          created_at: string
          district: string
          elevation: number
          id: string
          latitude: number
          longitude: number
          name: string
          population: number
          state: string
          vulnerability_score: number
        }
        Insert: {
          created_at?: string
          district?: string
          elevation?: number
          id?: string
          latitude: number
          longitude: number
          name: string
          population?: number
          state?: string
          vulnerability_score?: number
        }
        Update: {
          created_at?: string
          district?: string
          elevation?: number
          id?: string
          latitude?: number
          longitude?: number
          name?: string
          population?: number
          state?: string
          vulnerability_score?: number
        }
        Relationships: []
      }
      predictions: {
        Row: {
          confidence: number
          created_at: string
          flood_probability: number
          id: string
          lead_time_minutes: number | null
          location_id: string
          model_version: string
          risk_level: Database["public"]["Enums"]["risk_level"]
          severity: string
          timestamp: string
          uncertainty: number
        }
        Insert: {
          confidence?: number
          created_at?: string
          flood_probability?: number
          id?: string
          lead_time_minutes?: number | null
          location_id: string
          model_version?: string
          risk_level?: Database["public"]["Enums"]["risk_level"]
          severity?: string
          timestamp?: string
          uncertainty?: number
        }
        Update: {
          confidence?: number
          created_at?: string
          flood_probability?: number
          id?: string
          lead_time_minutes?: number | null
          location_id?: string
          model_version?: string
          risk_level?: Database["public"]["Enums"]["risk_level"]
          severity?: string
          timestamp?: string
          uncertainty?: number
        }
        Relationships: [
          {
            foreignKeyName: "predictions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          district: string | null
          home_location_id: string | null
          id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          district?: string | null
          home_location_id?: string | null
          id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          district?: string | null
          home_location_id?: string | null
          id?: string
        }
        Relationships: []
      }
      rainfall: {
        Row: {
          forecast_rainfall: number
          id: string
          location_id: string
          rainfall_15m: number
          rainfall_1h: number
          rainfall_24h: number
          rainfall_3h: number
          rainfall_6h: number
          rainfall_change_rate: number
          rainfall_intensity: number
          timestamp: string
        }
        Insert: {
          forecast_rainfall?: number
          id?: string
          location_id: string
          rainfall_15m?: number
          rainfall_1h?: number
          rainfall_24h?: number
          rainfall_3h?: number
          rainfall_6h?: number
          rainfall_change_rate?: number
          rainfall_intensity?: number
          timestamp?: string
        }
        Update: {
          forecast_rainfall?: number
          id?: string
          location_id?: string
          rainfall_15m?: number
          rainfall_1h?: number
          rainfall_24h?: number
          rainfall_3h?: number
          rainfall_6h?: number
          rainfall_change_rate?: number
          rainfall_intensity?: number
          timestamp?: string
        }
        Relationships: [
          {
            foreignKeyName: "rainfall_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      roads: {
        Row: {
          accessibility: string
          end_lat: number
          end_lng: number
          flood_risk: string
          id: string
          landslide_risk: string
          name: string
          shelter_connection: string | null
          start_lat: number
          start_lng: number
          status: string
        }
        Insert: {
          accessibility?: string
          end_lat: number
          end_lng: number
          flood_risk?: string
          id?: string
          landslide_risk?: string
          name: string
          shelter_connection?: string | null
          start_lat: number
          start_lng: number
          status?: string
        }
        Update: {
          accessibility?: string
          end_lat?: number
          end_lng?: number
          flood_risk?: string
          id?: string
          landslide_risk?: string
          name?: string
          shelter_connection?: string | null
          start_lat?: number
          start_lng?: number
          status?: string
        }
        Relationships: []
      }
      sensor_readings: {
        Row: {
          id: string
          metadata: Json
          quality: string
          sensor_id: string
          timestamp: string
          unit: string
          value: number
        }
        Insert: {
          id?: string
          metadata?: Json
          quality?: string
          sensor_id: string
          timestamp?: string
          unit: string
          value: number
        }
        Update: {
          id?: string
          metadata?: Json
          quality?: string
          sensor_id?: string
          timestamp?: string
          unit?: string
          value?: number
        }
        Relationships: []
      }
      sensors: {
        Row: {
          battery: number
          connectivity: string
          created_at: string
          id: string
          last_update: string
          latitude: number
          location_id: string | null
          longitude: number
          sensor_id: string
          sensor_type: string
          status: string
        }
        Insert: {
          battery?: number
          connectivity?: string
          created_at?: string
          id?: string
          last_update?: string
          latitude: number
          location_id?: string | null
          longitude: number
          sensor_id: string
          sensor_type: string
          status?: string
        }
        Update: {
          battery?: number
          connectivity?: string
          created_at?: string
          id?: string
          last_update?: string
          latitude?: number
          location_id?: string | null
          longitude?: number
          sensor_id?: string
          sensor_type?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "sensors_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      shelters: {
        Row: {
          accessibility: string
          available_capacity: number
          capacity: number
          id: string
          latitude: number
          longitude: number
          name: string
          occupied: number
          status: string
        }
        Insert: {
          accessibility?: string
          available_capacity?: number
          capacity?: number
          id?: string
          latitude: number
          longitude: number
          name: string
          occupied?: number
          status?: string
        }
        Update: {
          accessibility?: string
          available_capacity?: number
          capacity?: number
          id?: string
          latitude?: number
          longitude?: number
          name?: string
          occupied?: number
          status?: string
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
        Relationships: []
      }
      vulnerabilities: {
        Row: {
          bridges: number
          critical_infrastructure: number
          hospitals: number
          houses: number
          id: string
          location_id: string
          population: number
          roads: number
          schools: number
          shelters: number
          vulnerability_score: number
        }
        Insert: {
          bridges?: number
          critical_infrastructure?: number
          hospitals?: number
          houses?: number
          id?: string
          location_id: string
          population?: number
          roads?: number
          schools?: number
          shelters?: number
          vulnerability_score?: number
        }
        Update: {
          bridges?: number
          critical_infrastructure?: number
          hospitals?: number
          houses?: number
          id?: string
          location_id?: string
          population?: number
          roads?: number
          schools?: number
          shelters?: number
          vulnerability_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "vulnerabilities_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "responder" | "community"
      risk_level: "NORMAL" | "WATCH" | "WARNING" | "CRITICAL"
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
      app_role: ["admin", "responder", "community"],
      risk_level: ["NORMAL", "WATCH", "WARNING", "CRITICAL"],
    },
  },
} as const
