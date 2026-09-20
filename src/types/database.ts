export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: { PostgrestVersion: '14.5' }
  private: {
    Tables: {
      draw_secrets: {
        Row: { created_at: string; draw_id: string; encrypted_seed: string | null; random_seed_hash: string | null }
        Insert: { created_at?: string; draw_id: string; encrypted_seed?: string | null; random_seed_hash?: string | null }
        Update: { created_at?: string; draw_id?: string; encrypted_seed?: string | null; random_seed_hash?: string | null }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
  public: {
    Tables: {
      app_settings: {
        Row: { key: string; updated_at: string; updated_by: string | null; value: Json }
        Insert: { key: string; updated_at?: string; updated_by?: string | null; value: Json }
        Update: { key?: string; updated_at?: string; updated_by?: string | null; value?: Json }
        Relationships: [{ foreignKeyName: 'app_settings_updated_by_fkey'; columns: ['updated_by']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] }]
      }
      audit_logs: {
        Row: { action: string; actor_id: string | null; after_data: Json | null; before_data: Json | null; created_at: string; entity_id: string | null; entity_type: string; id: string }
        Insert: { action: string; actor_id?: string | null; after_data?: Json | null; before_data?: Json | null; created_at?: string; entity_id?: string | null; entity_type: string; id?: string }
        Update: { action?: string; actor_id?: string | null; after_data?: Json | null; before_data?: Json | null; created_at?: string; entity_id?: string | null; entity_type?: string; id?: string }
        Relationships: [{ foreignKeyName: 'audit_logs_actor_id_fkey'; columns: ['actor_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] }]
      }
      charities: {
        Row: { categories: string[]; cover_image_path: string | null; created_at: string; donation_url: string | null; full_description: string | null; id: string; is_archived: boolean; is_featured: boolean; is_published: boolean; logo_path: string | null; name: string; short_description: string; slug: string; updated_at: string; website_url: string | null }
        Insert: { categories?: string[]; cover_image_path?: string | null; created_at?: string; donation_url?: string | null; full_description?: string | null; id?: string; is_archived?: boolean; is_featured?: boolean; is_published?: boolean; logo_path?: string | null; name: string; short_description: string; slug: string; updated_at?: string; website_url?: string | null }
        Update: { categories?: string[]; cover_image_path?: string | null; created_at?: string; donation_url?: string | null; full_description?: string | null; id?: string; is_archived?: boolean; is_featured?: boolean; is_published?: boolean; logo_path?: string | null; name?: string; short_description?: string; slug?: string; updated_at?: string; website_url?: string | null }
        Relationships: []
      }
      charity_events: {
        Row: { charity_id: string; created_at: string; description: string | null; event_starts_at: string; event_url: string | null; id: string; location_text: string | null; title: string }
        Insert: { charity_id: string; created_at?: string; description?: string | null; event_starts_at: string; event_url?: string | null; id?: string; location_text?: string | null; title: string }
        Update: { charity_id?: string; created_at?: string; description?: string | null; event_starts_at?: string; event_url?: string | null; id?: string; location_text?: string | null; title?: string }
        Relationships: [{ foreignKeyName: 'charity_events_charity_id_fkey'; columns: ['charity_id']; isOneToOne: false; referencedRelation: 'charities'; referencedColumns: ['id'] }]
      }
      charity_preferences: {
        Row: { charity_id: string; contribution_percentage: number; created_at: string; effective_from: string; effective_to: string | null; id: string; user_id: string }
        Insert: { charity_id: string; contribution_percentage: number; created_at?: string; effective_from?: string; effective_to?: string | null; id?: string; user_id: string }
        Update: { charity_id?: string; contribution_percentage?: number; created_at?: string; effective_from?: string; effective_to?: string | null; id?: string; user_id?: string }
        Relationships: [{ foreignKeyName: 'charity_preferences_charity_id_fkey'; columns: ['charity_id']; isOneToOne: false; referencedRelation: 'charities'; referencedColumns: ['id'] }, { foreignKeyName: 'charity_preferences_user_id_fkey'; columns: ['user_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] }]
      }
      direct_donations: {
        Row: { amount_paise: number; charity_id: string; created_at: string; id: string; payment_transaction_id: string | null; status: Database['public']['Enums']['donation_status']; user_id: string | null }
        Insert: { amount_paise: number; charity_id: string; created_at?: string; id?: string; payment_transaction_id?: string | null; status?: Database['public']['Enums']['donation_status']; user_id?: string | null }
        Update: { amount_paise?: number; charity_id?: string; created_at?: string; id?: string; payment_transaction_id?: string | null; status?: Database['public']['Enums']['donation_status']; user_id?: string | null }
        Relationships: [{ foreignKeyName: 'direct_donations_charity_id_fkey'; columns: ['charity_id']; isOneToOne: false; referencedRelation: 'charities'; referencedColumns: ['id'] }, { foreignKeyName: 'direct_donations_payment_transaction_id_fkey'; columns: ['payment_transaction_id']; isOneToOne: true; referencedRelation: 'payment_transactions'; referencedColumns: ['id'] }, { foreignKeyName: 'direct_donations_user_id_fkey'; columns: ['user_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] }]
      }
      draw_entries: {
        Row: { created_at: string; draw_id: string; entry_weight: number; id: string; matched_numbers: number; score_date_snapshot: string[]; score_snapshot: number[]; user_id: string }
        Insert: { created_at?: string; draw_id: string; entry_weight?: number; id?: string; matched_numbers?: number; score_date_snapshot: string[]; score_snapshot: number[]; user_id: string }
        Update: { created_at?: string; draw_id?: string; entry_weight?: number; id?: string; matched_numbers?: number; score_date_snapshot?: string[]; score_snapshot?: number[]; user_id?: string }
        Relationships: [{ foreignKeyName: 'draw_entries_draw_id_fkey'; columns: ['draw_id']; isOneToOne: false; referencedRelation: 'draws'; referencedColumns: ['id'] }, { foreignKeyName: 'draw_entries_user_id_fkey'; columns: ['user_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] }]
      }
      draw_simulations: {
        Row: { configuration_snapshot: Json; created_at: string; draw_id: string; id: string; initiated_by: string | null; projected_results: Json }
        Insert: { configuration_snapshot: Json; created_at?: string; draw_id: string; id?: string; initiated_by?: string | null; projected_results: Json }
        Update: { configuration_snapshot?: Json; created_at?: string; draw_id?: string; id?: string; initiated_by?: string | null; projected_results?: Json }
        Relationships: [{ foreignKeyName: 'draw_simulations_draw_id_fkey'; columns: ['draw_id']; isOneToOne: false; referencedRelation: 'draws'; referencedColumns: ['id'] }, { foreignKeyName: 'draw_simulations_initiated_by_fkey'; columns: ['initiated_by']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] }]
      }
      draw_winners: {
        Row: { created_at: string; draw_entry_id: string; draw_id: string; id: string; match_count: number; prize_amount_paise: number; status: Database['public']['Enums']['winner_status']; user_id: string }
        Insert: { created_at?: string; draw_entry_id: string; draw_id: string; id?: string; match_count: number; prize_amount_paise: number; status?: Database['public']['Enums']['winner_status']; user_id: string }
        Update: { created_at?: string; draw_entry_id?: string; draw_id?: string; id?: string; match_count?: number; prize_amount_paise?: number; status?: Database['public']['Enums']['winner_status']; user_id?: string }
        Relationships: [{ foreignKeyName: 'draw_winners_draw_entry_id_fkey'; columns: ['draw_entry_id']; isOneToOne: true; referencedRelation: 'draw_entries'; referencedColumns: ['id'] }, { foreignKeyName: 'draw_winners_draw_id_fkey'; columns: ['draw_id']; isOneToOne: false; referencedRelation: 'draws'; referencedColumns: ['id'] }, { foreignKeyName: 'draw_winners_user_id_fkey'; columns: ['user_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] }]
      }
      draws: {
        Row: { algo_formula_hash: string | null; cash_prize_enabled: boolean; created_at: string; cycle_month: string; draw_at: string | null; drawn_numbers: number[] | null; entry_lock_at: string | null; id: string; jackpot_rollover_in_paise: number; jackpot_rollover_out_paise: number; jurisdiction_code: string; legal_approval_ref: string | null; mode: Database['public']['Enums']['draw_mode']; published_at: string | null; reward_pool_paise: number; status: Database['public']['Enums']['draw_status']; tier_3_paise: number; tier_4_paise: number; tier_5_paise: number; title: string; updated_at: string }
        Insert: { algo_formula_hash?: string | null; cash_prize_enabled?: boolean; created_at?: string; cycle_month: string; draw_at?: string | null; drawn_numbers?: number[] | null; entry_lock_at?: string | null; id?: string; jackpot_rollover_in_paise?: number; jackpot_rollover_out_paise?: number; jurisdiction_code?: string; legal_approval_ref?: string | null; mode?: Database['public']['Enums']['draw_mode']; published_at?: string | null; reward_pool_paise?: number; status?: Database['public']['Enums']['draw_status']; tier_3_paise?: number; tier_4_paise?: number; tier_5_paise?: number; title: string; updated_at?: string }
        Update: { algo_formula_hash?: string | null; cash_prize_enabled?: boolean; created_at?: string; cycle_month?: string; draw_at?: string | null; drawn_numbers?: number[] | null; entry_lock_at?: string | null; id?: string; jackpot_rollover_in_paise?: number; jackpot_rollover_out_paise?: number; jurisdiction_code?: string; legal_approval_ref?: string | null; mode?: Database['public']['Enums']['draw_mode']; published_at?: string | null; reward_pool_paise?: number; status?: Database['public']['Enums']['draw_status']; tier_3_paise?: number; tier_4_paise?: number; tier_5_paise?: number; title?: string; updated_at?: string }
        Relationships: []
      }
      golf_scores: {
        Row: { created_at: string; id: string; played_on: string; stableford_score: number; updated_at: string; user_id: string }
        Insert: { created_at?: string; id?: string; played_on: string; stableford_score: number; updated_at?: string; user_id: string }
        Update: { created_at?: string; id?: string; played_on?: string; stableford_score?: number; updated_at?: string; user_id?: string }
        Relationships: [{ foreignKeyName: 'golf_scores_user_id_fkey'; columns: ['user_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] }]
      }
      membership_plans: {
        Row: { amount_paise: number; created_at: string; currency: string; id: string; interval_months: number; is_active: boolean; name: string; razorpay_plan_id: string | null; stripe_price_id: string | null; stripe_product_id: string | null }
        Insert: { amount_paise: number; created_at?: string; currency?: string; id: string; interval_months: number; is_active?: boolean; name: string; razorpay_plan_id?: string | null; stripe_price_id?: string | null; stripe_product_id?: string | null }
        Update: { amount_paise?: number; created_at?: string; currency?: string; id?: string; interval_months?: number; is_active?: boolean; name?: string; razorpay_plan_id?: string | null; stripe_price_id?: string | null; stripe_product_id?: string | null }
        Relationships: []
      }
      payment_allocations: {
        Row: { allocation_type: Database['public']['Enums']['allocation_type']; amount_paise: number; charity_id: string | null; contribution_percentage: number | null; created_at: string; id: string; payment_transaction_id: string; recognition_month: string; user_id: string | null }
        Insert: { allocation_type: Database['public']['Enums']['allocation_type']; amount_paise: number; charity_id?: string | null; contribution_percentage?: number | null; created_at?: string; id?: string; payment_transaction_id: string; recognition_month: string; user_id?: string | null }
        Update: { allocation_type?: Database['public']['Enums']['allocation_type']; amount_paise?: number; charity_id?: string | null; contribution_percentage?: number | null; created_at?: string; id?: string; payment_transaction_id?: string; recognition_month?: string; user_id?: string | null }
        Relationships: [{ foreignKeyName: 'payment_allocations_charity_id_fkey'; columns: ['charity_id']; isOneToOne: false; referencedRelation: 'charities'; referencedColumns: ['id'] }, { foreignKeyName: 'payment_allocations_payment_transaction_id_fkey'; columns: ['payment_transaction_id']; isOneToOne: false; referencedRelation: 'payment_transactions'; referencedColumns: ['id'] }, { foreignKeyName: 'payment_allocations_user_id_fkey'; columns: ['user_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] }]
      }
      payment_transactions: {
        Row: { amount_paise: number; created_at: string; currency: string; id: string; paid_at: string | null; payment_kind: string; provider: string; provider_order_id: string | null; provider_payment_id: string | null; status: Database['public']['Enums']['payment_status']; subscription_id: string | null; user_id: string | null }
        Insert: { amount_paise: number; created_at?: string; currency?: string; id?: string; paid_at?: string | null; payment_kind: string; provider?: string; provider_order_id?: string | null; provider_payment_id?: string | null; status?: Database['public']['Enums']['payment_status']; subscription_id?: string | null; user_id?: string | null }
        Update: { amount_paise?: number; created_at?: string; currency?: string; id?: string; paid_at?: string | null; payment_kind?: string; provider?: string; provider_order_id?: string | null; provider_payment_id?: string | null; status?: Database['public']['Enums']['payment_status']; subscription_id?: string | null; user_id?: string | null }
        Relationships: [{ foreignKeyName: 'payment_transactions_subscription_id_fkey'; columns: ['subscription_id']; isOneToOne: false; referencedRelation: 'subscriptions'; referencedColumns: ['id'] }, { foreignKeyName: 'payment_transactions_user_id_fkey'; columns: ['user_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] }]
      }
      payouts: {
        Row: { amount_paise: number; created_at: string; id: string; marked_paid_by: string | null; paid_at: string | null; provider_payout_id: string | null; status: Database['public']['Enums']['payment_status']; winner_id: string }
        Insert: { amount_paise: number; created_at?: string; id?: string; marked_paid_by?: string | null; paid_at?: string | null; provider_payout_id?: string | null; status?: Database['public']['Enums']['payment_status']; winner_id: string }
        Update: { amount_paise?: number; created_at?: string; id?: string; marked_paid_by?: string | null; paid_at?: string | null; provider_payout_id?: string | null; status?: Database['public']['Enums']['payment_status']; winner_id?: string }
        Relationships: [{ foreignKeyName: 'payouts_marked_paid_by_fkey'; columns: ['marked_paid_by']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] }, { foreignKeyName: 'payouts_winner_id_fkey'; columns: ['winner_id']; isOneToOne: true; referencedRelation: 'draw_winners'; referencedColumns: ['id'] }]
      }
      profiles: {
        Row: { avatar_path: string | null; created_at: string; display_name: string | null; id: string; phone: string | null; role: Database['public']['Enums']['app_role']; updated_at: string; winner_name_visible: boolean }
        Insert: { avatar_path?: string | null; created_at?: string; display_name?: string | null; id: string; phone?: string | null; role?: Database['public']['Enums']['app_role']; updated_at?: string; winner_name_visible?: boolean }
        Update: { avatar_path?: string | null; created_at?: string; display_name?: string | null; id?: string; phone?: string | null; role?: Database['public']['Enums']['app_role']; updated_at?: string; winner_name_visible?: boolean }
        Relationships: []
      }
      subscriptions: {
        Row: { cancel_at_period_end: boolean; created_at: string; current_period_end: string | null; current_period_start: string | null; id: string; last_verified_at: string | null; plan_id: string; provider: string; provider_checkout_session_id: string | null; provider_customer_id: string | null; provider_subscription_id: string | null; status: Database['public']['Enums']['subscription_status']; updated_at: string; user_id: string }
        Insert: { cancel_at_period_end?: boolean; created_at?: string; current_period_end?: string | null; current_period_start?: string | null; id?: string; last_verified_at?: string | null; plan_id: string; provider?: string; provider_checkout_session_id?: string | null; provider_customer_id?: string | null; provider_subscription_id?: string | null; status?: Database['public']['Enums']['subscription_status']; updated_at?: string; user_id: string }
        Update: { cancel_at_period_end?: boolean; created_at?: string; current_period_end?: string | null; current_period_start?: string | null; id?: string; last_verified_at?: string | null; plan_id?: string; provider?: string; provider_checkout_session_id?: string | null; provider_customer_id?: string | null; provider_subscription_id?: string | null; status?: Database['public']['Enums']['subscription_status']; updated_at?: string; user_id?: string }
        Relationships: [{ foreignKeyName: 'subscriptions_plan_id_fkey'; columns: ['plan_id']; isOneToOne: false; referencedRelation: 'membership_plans'; referencedColumns: ['id'] }, { foreignKeyName: 'subscriptions_user_id_fkey'; columns: ['user_id']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] }]
      }
      webhook_events: {
        Row: { created_at: string; id: string; payload: Json; processed_at: string | null; provider: string; provider_event_id: string }
        Insert: { created_at?: string; id?: string; payload: Json; processed_at?: string | null; provider: string; provider_event_id: string }
        Update: { created_at?: string; id?: string; payload?: Json; processed_at?: string | null; provider?: string; provider_event_id?: string }
        Relationships: []
      }
      winner_verifications: {
        Row: { approved: boolean | null; id: string; internal_audit_reason: string | null; proof_storage_path: string; rejection_reason: string | null; reviewed_at: string | null; reviewed_by: string | null; submitted_at: string; submitted_by: string; winner_id: string }
        Insert: { approved?: boolean | null; id?: string; internal_audit_reason?: string | null; proof_storage_path: string; rejection_reason?: string | null; reviewed_at?: string | null; reviewed_by?: string | null; submitted_at?: string; submitted_by: string; winner_id: string }
        Update: { approved?: boolean | null; id?: string; internal_audit_reason?: string | null; proof_storage_path?: string; rejection_reason?: string | null; reviewed_at?: string | null; reviewed_by?: string | null; submitted_at?: string; submitted_by?: string; winner_id?: string }
        Relationships: [{ foreignKeyName: 'winner_verifications_reviewed_by_fkey'; columns: ['reviewed_by']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] }, { foreignKeyName: 'winner_verifications_submitted_by_fkey'; columns: ['submitted_by']; isOneToOne: false; referencedRelation: 'profiles'; referencedColumns: ['id'] }, { foreignKeyName: 'winner_verifications_winner_id_fkey'; columns: ['winner_id']; isOneToOne: false; referencedRelation: 'draw_winners'; referencedColumns: ['id'] }]
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean }
      has_active_subscription: { Args: Record<PropertyKey, never>; Returns: boolean }
    }
    Enums: {
      allocation_type: 'charity' | 'reward_pool' | 'platform' | 'tax_reserve' | 'payment_fee'
      app_role: 'subscriber' | 'admin'
      donation_status: 'pending' | 'paid' | 'failed' | 'refunded'
      draw_mode: 'random' | 'algorithmic'
      draw_status: 'draft' | 'simulation_ready' | 'locked' | 'published' | 'cancelled' | 'archived'
      payment_status: 'pending' | 'paid' | 'failed' | 'refunded'
      subscription_status: 'active' | 'past_due' | 'cancelled' | 'lapsed' | 'inactive'
      winner_status: 'pending_proof' | 'proof_submitted' | 'approved' | 'rejected' | 'paid'
    }
    CompositeTypes: { [_ in never]: never }
  }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>]

export type Tables<T extends keyof DefaultSchema['Tables']> = DefaultSchema['Tables'][T]['Row']
export type TablesInsert<T extends keyof DefaultSchema['Tables']> = DefaultSchema['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof DefaultSchema['Tables']> = DefaultSchema['Tables'][T]['Update']
export type Enums<T extends keyof DefaultSchema['Enums']> = DefaultSchema['Enums'][T]

export const Constants = {
  public: {
    Enums: {
      allocation_type: ['charity', 'reward_pool', 'platform', 'tax_reserve', 'payment_fee'],
      app_role: ['subscriber', 'admin'],
      donation_status: ['pending', 'paid', 'failed', 'refunded'],
      draw_mode: ['random', 'algorithmic'],
      draw_status: ['draft', 'simulation_ready', 'locked', 'published', 'cancelled', 'archived'],
      payment_status: ['pending', 'paid', 'failed', 'refunded'],
      subscription_status: ['active', 'past_due', 'cancelled', 'lapsed', 'inactive'],
      winner_status: ['pending_proof', 'proof_submitted', 'approved', 'rejected', 'paid'],
    },
  },
} as const
