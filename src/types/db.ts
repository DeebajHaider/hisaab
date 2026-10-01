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
      asset_classes: {
        Row: {
          created_at: string
          created_by: string
          id: string
          is_archived: boolean
          name: string
          portfolio_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          id?: string
          is_archived?: boolean
          name: string
          portfolio_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          is_archived?: boolean
          name?: string
          portfolio_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_classes_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          budget_id: string
          created_at: string
          id: string
          invited_by: string
          role: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          budget_id: string
          created_at?: string
          id?: string
          invited_by?: string
          role: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          budget_id?: string
          created_at?: string
          id?: string
          invited_by?: string
          role?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_invites_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_members: {
        Row: {
          budget_id: string
          joined_at: string
          role: string
          user_id: string
        }
        Insert: {
          budget_id: string
          joined_at?: string
          role: string
          user_id: string
        }
        Update: {
          budget_id?: string
          joined_at?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_members_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      budgets: {
        Row: {
          created_at: string
          created_by: string | null
          currency: string
          id: string
          is_shared: boolean
          name: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          is_shared?: boolean
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency?: string
          id?: string
          is_shared?: boolean
          name?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          budget_id: string
          color: string | null
          id: string
          is_archived: boolean
          name: string
          sort_order: number
          tracks_person: boolean
        }
        Insert: {
          budget_id: string
          color?: string | null
          id?: string
          is_archived?: boolean
          name: string
          sort_order?: number
          tracks_person?: boolean
        }
        Update: {
          budget_id?: string
          color?: string | null
          id?: string
          is_archived?: boolean
          name?: string
          sort_order?: number
          tracks_person?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "categories_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      holding_value_history: {
        Row: {
          as_of: string
          created_at: string
          created_by: string
          holding_id: string
          id: string
          portfolio_id: string
          value: number
        }
        Insert: {
          as_of?: string
          created_at?: string
          created_by?: string
          holding_id: string
          id?: string
          portfolio_id: string
          value: number
        }
        Update: {
          as_of?: string
          created_at?: string
          created_by?: string
          holding_id?: string
          id?: string
          portfolio_id?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "holding_value_history_holding_id_fkey"
            columns: ["holding_id"]
            isOneToOne: false
            referencedRelation: "holdings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holding_value_history_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      holdings: {
        Row: {
          asset_class_id: string
          created_at: string
          created_by: string
          currency: string
          current_value: number
          current_value_at: string | null
          id: string
          is_archived: boolean
          name: string
          notes: string | null
          original_investment: number
          portfolio_id: string
          ticker: string | null
        }
        Insert: {
          asset_class_id: string
          created_at?: string
          created_by?: string
          currency?: string
          current_value?: number
          current_value_at?: string | null
          id?: string
          is_archived?: boolean
          name: string
          notes?: string | null
          original_investment?: number
          portfolio_id: string
          ticker?: string | null
        }
        Update: {
          asset_class_id?: string
          created_at?: string
          created_by?: string
          currency?: string
          current_value?: number
          current_value_at?: string | null
          id?: string
          is_archived?: boolean
          name?: string
          notes?: string | null
          original_investment?: number
          portfolio_id?: string
          ticker?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "holdings_asset_class_id_fkey"
            columns: ["asset_class_id"]
            isOneToOne: false
            referencedRelation: "asset_classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "holdings_portfolio_id_fkey"
            columns: ["portfolio_id"]
            isOneToOne: false
            referencedRelation: "portfolios"
            referencedColumns: ["id"]
          },
        ]
      }
      income_entries: {
        Row: {
          amount: number
          budget_id: string
          created_at: string
          created_by: string | null
          date: string
          id: string
          notes: string | null
          source: string
        }
        Insert: {
          amount: number
          budget_id: string
          created_at?: string
          created_by?: string | null
          date: string
          id?: string
          notes?: string | null
          source: string
        }
        Update: {
          amount?: number
          budget_id?: string
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          notes?: string | null
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "income_entries_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          category_id: string
          default_mode: string
          default_rate: number | null
          id: string
          is_archived: boolean
          name: string
          sort_order: number
          unit: string | null
        }
        Insert: {
          category_id: string
          default_mode?: string
          default_rate?: number | null
          id?: string
          is_archived?: boolean
          name: string
          sort_order?: number
          unit?: string | null
        }
        Update: {
          category_id?: string
          default_mode?: string
          default_rate?: number | null
          id?: string
          is_archived?: boolean
          name?: string
          sort_order?: number
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      people: {
        Row: {
          budget_id: string
          id: string
          is_archived: boolean
          name: string
        }
        Insert: {
          budget_id: string
          id?: string
          is_archived?: boolean
          name: string
        }
        Update: {
          budget_id?: string
          id?: string
          is_archived?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "people_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolios: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          created_by?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          email: string
          id: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          email: string
          id: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
        }
        Relationships: []
      }
      savings_entries: {
        Row: {
          amount: number
          budget_id: string
          created_at: string
          created_by: string | null
          date: string
          id: string
          name: string
          notes: string | null
        }
        Insert: {
          amount: number
          budget_id: string
          created_at?: string
          created_by?: string | null
          date: string
          id?: string
          name: string
          notes?: string | null
        }
        Update: {
          amount?: number
          budget_id?: string
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          name?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "savings_entries_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_templates: {
        Row: {
          amount: number
          budget_id: string
          category_id: string
          created_at: string
          created_by: string | null
          id: string
          is_archived: boolean
          item_id: string
          label: string | null
          notes: string | null
          person_id: string | null
          qty: number | null
          rate: number | null
          sort_order: number
        }
        Insert: {
          amount: number
          budget_id: string
          category_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_archived?: boolean
          item_id: string
          label?: string | null
          notes?: string | null
          person_id?: string | null
          qty?: number | null
          rate?: number | null
          sort_order?: number
        }
        Update: {
          amount?: number
          budget_id?: string
          category_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_archived?: boolean
          item_id?: string
          label?: string | null
          notes?: string | null
          person_id?: string | null
          qty?: number | null
          rate?: number | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "transaction_templates_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_templates_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_templates_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_templates_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          budget_id: string
          category_id: string
          created_at: string
          created_by: string | null
          date: string
          id: string
          item_id: string
          notes: string | null
          person_id: string | null
          qty: number | null
          rate: number | null
        }
        Insert: {
          amount: number
          budget_id: string
          category_id: string
          created_at?: string
          created_by?: string | null
          date: string
          id?: string
          item_id: string
          notes?: string | null
          person_id?: string | null
          qty?: number | null
          rate?: number | null
        }
        Update: {
          amount?: number
          budget_id?: string
          category_id?: string
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          item_id?: string
          notes?: string | null
          person_id?: string | null
          qty?: number | null
          rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_budget_id_fkey"
            columns: ["budget_id"]
            isOneToOne: false
            referencedRelation: "budgets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invite: { Args: { invite_token: string }; Returns: string }
      budget_monthly_category_totals: {
        Args: { b_id: string; end_date: string; start_date: string }
        Returns: {
          category_id: string
          category_name: string
          total: number
          year_month: string
        }[]
      }
      budget_monthly_totals: {
        Args: { b_id: string; end_date: string; start_date: string }
        Returns: {
          total: number
          year_month: string
        }[]
      }
      delete_own_account: { Args: never; Returns: undefined }
      get_budget_member_profiles: {
        Args: { p_budget_id: string }
        Returns: {
          email: string
          user_id: string
        }[]
      }
      get_owned_shared_budgets: {
        Args: never
        Returns: {
          budget_id: string
          budget_name: string
        }[]
      }
      has_budget_role: {
        Args: { b_id: string; min_role: string }
        Returns: boolean
      }
      has_item_budget_role: {
        Args: { item_category_id: string; min_role: string }
        Returns: boolean
      }
      is_budget_member: { Args: { b_id: string }; Returns: boolean }
      is_item_budget_member: {
        Args: { item_category_id: string }
        Returns: boolean
      }
      lookup_invite: {
        Args: { invite_token: string }
        Returns: {
          accepted_at: string
          already_member: boolean
          budget_id: string
          budget_name: string
          role: string
        }[]
      }
      owns_portfolio: { Args: { p_id: string }; Returns: boolean }
      shares_budget_with: { Args: { other_user_id: string }; Returns: boolean }
      transfer_budget_ownership: {
        Args: { p_budget_id: string; p_new_owner_id: string }
        Returns: undefined
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
    Enums: {},
  },
} as const
