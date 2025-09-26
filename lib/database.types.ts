export interface Database {
  public: {
    Tables: {
      ingredients: {
        Row: {
          id: string;
          name: string;
          aliases: string[];
          evidence: 'A' | 'B' | 'C';
          dose_usual_min: number;
          dose_usual_max: number;
          dose_per_kg?: number;
          dose_unit: string;
          timing: string;
          notes: string;
          sources: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          aliases?: string[];
          evidence: 'A' | 'B' | 'C';
          dose_usual_min: number;
          dose_usual_max: number;
          dose_per_kg?: number;
          dose_unit: string;
          timing: string;
          notes?: string;
          sources?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          aliases?: string[];
          evidence?: 'A' | 'B' | 'C';
          dose_usual_min?: number;
          dose_usual_max?: number;
          dose_per_kg?: number;
          dose_unit?: string;
          timing?: string;
          notes?: string;
          sources?: string[];
          updated_at?: string;
        };
      };
      products: {
        Row: {
          id: string;
          brand: string;
          name: string;
          gtin: string;
          format: string;
          price_reference?: number;
          certifications: string[];
          url?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          brand: string;
          name: string;
          gtin: string;
          format: string;
          price_reference?: number;
          certifications?: string[];
          url?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          brand?: string;
          name?: string;
          gtin?: string;
          format?: string;
          price_reference?: number;
          certifications?: string[];
          url?: string;
          updated_at?: string;
        };
      };
      product_ingredients: {
        Row: {
          product_id: string;
          ingredient_id: string;
          amount_per_serving?: number;
          amount_unit: string;
          created_at: string;
        };
        Insert: {
          product_id: string;
          ingredient_id: string;
          amount_per_serving?: number;
          amount_unit: string;
          created_at?: string;
        };
        Update: {
          product_id?: string;
          ingredient_id?: string;
          amount_per_serving?: number;
          amount_unit?: string;
        };
      };
      protocols: {
        Row: {
          id: string;
          goal: 'hypertrophy' | 'fatloss' | 'endurance' | 'health';
          ingredient_id: string;
          dose_suggested_min: number;
          dose_suggested_max: number;
          dose_unit: string;
          timing: 'pre' | 'intra' | 'post' | 'daily';
          notes?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          goal: 'hypertrophy' | 'fatloss' | 'endurance' | 'health';
          ingredient_id: string;
          dose_suggested_min: number;
          dose_suggested_max: number;
          dose_unit: string;
          timing: 'pre' | 'intra' | 'post' | 'daily';
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          goal?: 'hypertrophy' | 'fatloss' | 'endurance' | 'health';
          ingredient_id?: string;
          dose_suggested_min?: number;
          dose_suggested_max?: number;
          dose_unit?: string;
          timing?: 'pre' | 'intra' | 'post' | 'daily';
          notes?: string;
          updated_at?: string;
        };
      };
      objective: {
        Row: {
          slug: string;
          label: string;
          emoji: string | null;
          description: string | null;
          sort_order: number | null;
        };
        Insert: {
          slug: string;
          label: string;
          emoji?: string | null;
          description?: string | null;
          sort_order?: number | null;
        };
        Update: {
          slug?: string;
          label?: string;
          emoji?: string | null;
          description?: string | null;
          sort_order?: number | null;
        };
      };
      user_profiles: {
        Row: {
          user_id: string;
          sport: string;
          frequency_per_week: number;
          training_time: string;
          goal: 'hypertrophy' | 'fatloss' | 'endurance' | 'health';
          budget_monthly: number;
          constraints: string[];
          competition_mode: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          sport: string;
          frequency_per_week: number;
          training_time: string;
          goal: 'hypertrophy' | 'fatloss' | 'endurance' | 'health';
          budget_monthly: number;
          constraints?: string[];
          competition_mode?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          sport?: string;
          frequency_per_week?: number;
          training_time?: string;
          goal?: 'hypertrophy' | 'fatloss' | 'endurance' | 'health';
          budget_monthly?: number;
          constraints?: string[];
          competition_mode?: boolean;
          updated_at?: string;
        };
      };
      plan_days: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          date: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          updated_at?: string;
        };
      };
      intakes: {
        Row: {
          id: string;
          plan_day_id: string;
          type: 'ingredient' | 'product';
          ref_id: string;
          dose: number;
          unit: string;
          time: string;
          status: 'todo' | 'done' | 'skipped';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          plan_day_id: string;
          type: 'ingredient' | 'product';
          ref_id: string;
          dose: number;
          unit: string;
          time: string;
          status?: 'todo' | 'done' | 'skipped';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          plan_day_id?: string;
          type?: 'ingredient' | 'product';
          ref_id?: string;
          dose?: number;
          unit?: string;
          time?: string;
          status?: 'todo' | 'done' | 'skipped';
          updated_at?: string;
        };
      };
      user_conseil_reads: {
        Row: {
          user_id: string;
          conseil_id: string;
          read_at: string;
          read_day: string;
        };
        Insert: {
          user_id: string;
          conseil_id: string;
          read_at?: string;
          read_day?: string;
        };
        Update: {
          user_id?: string;
          conseil_id?: string;
          read_at?: string;
          read_day?: string;
        };
      };
      user_fiche_views: {
        Row: {
          user_id: string;
          fiche_slug: string;
          viewed_at: string;
          view_day: string;
        };
        Insert: {
          user_id: string;
          fiche_slug: string;
          viewed_at?: string;
          view_day?: string;
        };
        Update: {
          user_id?: string;
          fiche_slug?: string;
          viewed_at?: string;
          view_day?: string;
        };
      };
      user_product_scans: {
        Row: {
          user_id: string;
          product_gtin: string;
          scanned_at: string;
          scan_day: string;
        };
        Insert: {
          user_id: string;
          product_gtin: string;
          scanned_at?: string;
          scan_day?: string;
        };
        Update: {
          user_id?: string;
          product_gtin?: string;
          scanned_at?: string;
          scan_day?: string;
        };
      };
      user_time_pref: {
        Row: {
          user_id: string;
          morning: string;
          noon: string;
          evening: string;
          pre_offset_min: number;
          post_offset_min: number;
        };
        Insert: {
          user_id: string;
          morning?: string;
          noon?: string;
          evening?: string;
          pre_offset_min?: number;
          post_offset_min?: number;
        };
        Update: {
          user_id?: string;
          morning?: string;
          noon?: string;
          evening?: string;
          pre_offset_min?: number;
          post_offset_min?: number;
        };
        Relationships: [
          {
            foreignKeyName: "user_time_pref_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      user_training_slot: {
        Row: {
          id: string;
          user_id: string;
          weekday: number;
          start_time: string;
          end_time: string;
          kind: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          weekday: number;
          start_time: string;
          end_time: string;
          kind?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          weekday?: number;
          start_time?: string;
          end_time?: string;
          kind?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "user_training_slot_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      user_supplement_rule: {
        Row: {
          id: string;
          user_id: string;
          supplement_id: string;
          frequency: 'daily' | 'weekly' | 'custom';
          anchors: string[];
          days_of_week: number[] | null;
          dose: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          supplement_id: string;
          frequency: 'daily' | 'weekly' | 'custom';
          anchors: string[];
          days_of_week?: number[] | null;
          dose?: string | null;
          notes?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          supplement_id?: string;
          frequency?: 'daily' | 'weekly' | 'custom';
          anchors?: string[];
          days_of_week?: number[] | null;
          dose?: string | null;
          notes?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "user_supplement_rule_user_id_fkey";
            columns: ["user_id"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_supplement_rule_supplement_id_fkey";
            columns: ["supplement_id"];
            referencedRelation: "supplement";
            referencedColumns: ["id"];
          }
        ];
      };
      user_plan_event: {
        Row: {
          id: string;
          user_id: string;
          supplement_id: string;
          ts_planned: string;
          status: 'planned' | 'taken' | 'skipped' | 'snoozed';
          source: string | null;
          ts_taken: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          supplement_id: string;
          ts_planned: string;
          status?: 'planned' | 'taken' | 'skipped' | 'snoozed';
          source?: string | null;
          ts_taken?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          supplement_id?: string;
          ts_planned?: string;
          status?: 'planned' | 'taken' | 'skipped' | 'snoozed';
          source?: string | null;
          ts_taken?: string | null;
          updated_at?: string;
        };
      };
      conseil: {
        Row: {
          id: string;
          title: string;
          content: string;
          icon: string;
          category: string;
          is_active: boolean;
          display_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          content: string;
          icon?: string;
          category?: string;
          is_active?: boolean;
          display_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          content?: string;
          icon?: string;
          category?: string;
          is_active?: boolean;
          display_date?: string | null;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      evidence_level: 'A' | 'B' | 'C';
      goal_type: 'hypertrophy' | 'fatloss' | 'endurance' | 'health';
      timing_type: 'pre' | 'intra' | 'post' | 'daily';
      intake_status: 'todo' | 'done' | 'skipped';
    };
  };
}