
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "appointments": {
                  Row: {
                    "cancelled_by": string | null,"client_id": string | null,"created_at": string,"ends_at": string,"id": string,"manage_token": string,"member_id": string,"price_cents": number,"public_code": string,"salon_id": string,"service_id": string | null,"service_name": string,"source": Database["public"]['Enums']["appt_source_t"],"starts_at": string,"status": Database["public"]['Enums']["appt_status_t"]
                  }
                  ComputedFields: never
                  Insert: {
                    "cancelled_by"?: string | null,"client_id"?: string | null,"created_at"?: string,"ends_at": string,"id"?: string,"manage_token"?: string,"member_id": string,"price_cents": number,"public_code": string,"salon_id": string,"service_id"?: string | null,"service_name": string,"source"?: Database["public"]['Enums']["appt_source_t"],"starts_at": string,"status"?: Database["public"]['Enums']["appt_status_t"]
                  }
                  Update: {
                    "cancelled_by"?: string | null,"client_id"?: string | null,"created_at"?: string,"ends_at"?: string,"id"?: string,"manage_token"?: string,"member_id"?: string,"price_cents"?: number,"public_code"?: string,"salon_id"?: string,"service_id"?: string | null,"service_name"?: string,"source"?: Database["public"]['Enums']["appt_source_t"],"starts_at"?: string,"status"?: Database["public"]['Enums']["appt_status_t"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "appointments_client_id_salon_id_fkey"
      columns: ["client_id","salon_id"]
isOneToOne: false
      referencedRelation: "clients"
      referencedColumns: ["id","salon_id"]
    },{
      foreignKeyName: "appointments_client_id_salon_id_fkey"
      columns: ["client_id","salon_id"]
isOneToOne: false
      referencedRelation: "clients_visible"
      referencedColumns: ["id","salon_id"]
    },{
      foreignKeyName: "appointments_member_id_salon_id_fkey"
      columns: ["member_id","salon_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id","salon_id"]
    },{
      foreignKeyName: "appointments_salon_id_fkey"
      columns: ["salon_id"]
isOneToOne: false
      referencedRelation: "salons"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "appointments_service_id_salon_id_fkey"
      columns: ["service_id","salon_id"]
isOneToOne: false
      referencedRelation: "services"
      referencedColumns: ["id","salon_id"]
    }
                  ]
                },"booking_codes": {
                  Row: {
                    "attempts": number,"code_hash": string,"created_at": string,"email": string,"expires_at": string,"id": string,"payload": NonNullable<Json>,"salon_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attempts"?: number,"code_hash": string,"created_at"?: string,"email": string,"expires_at"?: string,"id"?: string,"payload": NonNullable<Json>,"salon_id": string
                  }
                  Update: {
                    "attempts"?: number,"code_hash"?: string,"created_at"?: string,"email"?: string,"expires_at"?: string,"id"?: string,"payload"?: NonNullable<Json>,"salon_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "booking_codes_salon_id_fkey"
      columns: ["salon_id"]
isOneToOne: false
      referencedRelation: "salons"
      referencedColumns: ["id"]
    }
                  ]
                },"clients": {
                  Row: {
                    "created_at": string,"email": string | null,"id": string,"marketing_opt_in": boolean,"name": string,"note": string | null,"phone": string | null,"privacy_accepted_at": string | null,"salon_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"email"?: string | null,"id"?: string,"marketing_opt_in"?: boolean,"name": string,"note"?: string | null,"phone"?: string | null,"privacy_accepted_at"?: string | null,"salon_id": string
                  }
                  Update: {
                    "created_at"?: string,"email"?: string | null,"id"?: string,"marketing_opt_in"?: boolean,"name"?: string,"note"?: string | null,"phone"?: string | null,"privacy_accepted_at"?: string | null,"salon_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "clients_salon_id_fkey"
      columns: ["salon_id"]
isOneToOne: false
      referencedRelation: "salons"
      referencedColumns: ["id"]
    }
                  ]
                },"closures": {
                  Row: {
                    "ends_on": string,"id": string,"member_id": string | null,"note": string | null,"salon_id": string,"starts_on": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ends_on": string,"id"?: string,"member_id"?: string | null,"note"?: string | null,"salon_id": string,"starts_on": string
                  }
                  Update: {
                    "ends_on"?: string,"id"?: string,"member_id"?: string | null,"note"?: string | null,"salon_id"?: string,"starts_on"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "closures_member_id_salon_id_fkey"
      columns: ["member_id","salon_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id","salon_id"]
    },{
      foreignKeyName: "closures_salon_id_fkey"
      columns: ["salon_id"]
isOneToOne: false
      referencedRelation: "salons"
      referencedColumns: ["id"]
    }
                  ]
                },"email_prefs": {
                  Row: {
                    "cancellation": boolean,"confirmation": boolean,"reminder": boolean,"salon_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cancellation"?: boolean,"confirmation"?: boolean,"reminder"?: boolean,"salon_id": string
                  }
                  Update: {
                    "cancellation"?: boolean,"confirmation"?: boolean,"reminder"?: boolean,"salon_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "email_prefs_salon_id_fkey"
      columns: ["salon_id"]
isOneToOne: true
      referencedRelation: "salons"
      referencedColumns: ["id"]
    }
                  ]
                },"members": {
                  Row: {
                    "active": boolean,"bio": string | null,"chair_no": number,"id": string,"invite_email": string | null,"invite_expires_at": string | null,"invite_token": string | null,"name": string,"photo_path": string | null,"role": Database["public"]['Enums']["role_t"],"salon_id": string,"user_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"bio"?: string | null,"chair_no": number,"id"?: string,"invite_email"?: string | null,"invite_expires_at"?: string | null,"invite_token"?: string | null,"name": string,"photo_path"?: string | null,"role"?: Database["public"]['Enums']["role_t"],"salon_id": string,"user_id"?: string | null
                  }
                  Update: {
                    "active"?: boolean,"bio"?: string | null,"chair_no"?: number,"id"?: string,"invite_email"?: string | null,"invite_expires_at"?: string | null,"invite_token"?: string | null,"name"?: string,"photo_path"?: string | null,"role"?: Database["public"]['Enums']["role_t"],"salon_id"?: string,"user_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "members_salon_id_fkey"
      columns: ["salon_id"]
isOneToOne: false
      referencedRelation: "salons"
      referencedColumns: ["id"]
    }
                  ]
                },"notification_prefs": {
                  Row: {
                    "channel": string,"client_cancel": boolean,"daily_summary": boolean,"member_id": string,"new_booking": boolean,"only_mine": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "channel"?: string,"client_cancel"?: boolean,"daily_summary"?: boolean,"member_id": string,"new_booking"?: boolean,"only_mine"?: boolean
                  }
                  Update: {
                    "channel"?: string,"client_cancel"?: boolean,"daily_summary"?: boolean,"member_id"?: string,"new_booking"?: boolean,"only_mine"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "notification_prefs_member_id_fkey"
      columns: ["member_id"]
isOneToOne: true
      referencedRelation: "members"
      referencedColumns: ["id"]
    }
                  ]
                },"opening_hours": {
                  Row: {
                    "break_end_min": number | null,"break_start_min": number | null,"close_min": number | null,"closed": boolean,"open_min": number | null,"salon_id": string,"weekday": number
                  }
                  ComputedFields: never
                  Insert: {
                    "break_end_min"?: number | null,"break_start_min"?: number | null,"close_min"?: number | null,"closed"?: boolean,"open_min"?: number | null,"salon_id": string,"weekday": number
                  }
                  Update: {
                    "break_end_min"?: number | null,"break_start_min"?: number | null,"close_min"?: number | null,"closed"?: boolean,"open_min"?: number | null,"salon_id"?: string,"weekday"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "opening_hours_salon_id_fkey"
      columns: ["salon_id"]
isOneToOne: false
      referencedRelation: "salons"
      referencedColumns: ["id"]
    }
                  ]
                },"push_subscriptions": {
                  Row: {
                    "endpoint": string,"id": string,"keys": NonNullable<Json>,"member_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "endpoint": string,"id"?: string,"keys": NonNullable<Json>,"member_id": string
                  }
                  Update: {
                    "endpoint"?: string,"id"?: string,"keys"?: NonNullable<Json>,"member_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "push_subscriptions_member_id_fkey"
      columns: ["member_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    }
                  ]
                },"salons": {
                  Row: {
                    "address": string | null,"area": string | null,"barbers_contacts": boolean,"barbers_edit": boolean,"barbers_see_all": boolean,"booking_online": boolean,"cancel_limit_min": number,"cancel_online": boolean,"cover_path": string | null,"created_at": string,"deleted_at": string | null,"description": string | null,"id": string,"instagram": string | null,"max_advance_days": number,"min_notice_min": number,"name": string,"onboarding_step": number,"phone": string | null,"plan": Database["public"]['Enums']["plan_t"],"show_prices": boolean,"slot_step_min": number,"slug": string,"stripe_customer_id": string | null,"stripe_subscription_id": string | null,"sub_status": Database["public"]['Enums']["sub_status_t"],"timezone": string,"trial_ends_at": string,"vat_number": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string | null,"area"?: string | null,"barbers_contacts"?: boolean,"barbers_edit"?: boolean,"barbers_see_all"?: boolean,"booking_online"?: boolean,"cancel_limit_min"?: number,"cancel_online"?: boolean,"cover_path"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"description"?: string | null,"id"?: string,"instagram"?: string | null,"max_advance_days"?: number,"min_notice_min"?: number,"name": string,"onboarding_step"?: number,"phone"?: string | null,"plan"?: Database["public"]['Enums']["plan_t"],"show_prices"?: boolean,"slot_step_min"?: number,"slug": string,"stripe_customer_id"?: string | null,"stripe_subscription_id"?: string | null,"sub_status"?: Database["public"]['Enums']["sub_status_t"],"timezone"?: string,"trial_ends_at"?: string,"vat_number"?: string | null
                  }
                  Update: {
                    "address"?: string | null,"area"?: string | null,"barbers_contacts"?: boolean,"barbers_edit"?: boolean,"barbers_see_all"?: boolean,"booking_online"?: boolean,"cancel_limit_min"?: number,"cancel_online"?: boolean,"cover_path"?: string | null,"created_at"?: string,"deleted_at"?: string | null,"description"?: string | null,"id"?: string,"instagram"?: string | null,"max_advance_days"?: number,"min_notice_min"?: number,"name"?: string,"onboarding_step"?: number,"phone"?: string | null,"plan"?: Database["public"]['Enums']["plan_t"],"show_prices"?: boolean,"slot_step_min"?: number,"slug"?: string,"stripe_customer_id"?: string | null,"stripe_subscription_id"?: string | null,"sub_status"?: Database["public"]['Enums']["sub_status_t"],"timezone"?: string,"trial_ends_at"?: string,"vat_number"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"services": {
                  Row: {
                    "active": boolean,"duration_min": number,"id": string,"name": string,"price_cents": number,"salon_id": string,"sort": number
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"duration_min": number,"id"?: string,"name": string,"price_cents": number,"salon_id": string,"sort"?: number
                  }
                  Update: {
                    "active"?: boolean,"duration_min"?: number,"id"?: string,"name"?: string,"price_cents"?: number,"salon_id"?: string,"sort"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "services_salon_id_fkey"
      columns: ["salon_id"]
isOneToOne: false
      referencedRelation: "salons"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "clients_visible": {
                  Row: {
                    "created_at": string,"email": string | null,"id": string,"marketing_opt_in": boolean,"name": string,"note": string | null,"phone": string | null,"privacy_accepted_at": string | null,"salon_id": string
                  }
                  ComputedFields: never
                  Insert: {
                           "created_at"?: string | null,"email"?: never,"id"?: string | null,"marketing_opt_in"?: boolean | null,"name"?: string | null,"note"?: string | null,"phone"?: never,"privacy_accepted_at"?: string | null,"salon_id"?: string | null
                         }
                        Update: {
                           "created_at"?: string | null,"email"?: never,"id"?: string | null,"marketing_opt_in"?: boolean | null,"name"?: string | null,"note"?: string | null,"phone"?: never,"privacy_accepted_at"?: string | null,"salon_id"?: string | null
                         }
                        Relationships: [
                    {
      foreignKeyName: "clients_salon_id_fkey"
      columns: ["salon_id"]
isOneToOne: false
      referencedRelation: "salons"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "pending_invites":
{ Args: { "p_salon": string }; Returns: {
              "email": string,"expires_at": string,"member_id": string,"name": string,"token": string
            }[]
                           },
"register_salon":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"slug_available":
{ Args: { "p_slug": string }; Returns: boolean
                           }
          }
          Enums: {
            "appt_source_t": "manuale"|"online"|"in_negozio","appt_status_t": "confermato"|"completato"|"annullato"|"non_presentato","plan_t": "trial"|"solo"|"salone","role_t": "owner"|"barber","sub_status_t": "trialing"|"active"|"past_due"|"canceled"|"expired"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "appt_source_t": ["manuale", "online", "in_negozio"],"appt_status_t": ["confermato", "completato", "annullato", "non_presentato"],"plan_t": ["trial", "solo", "salone"],"role_t": ["owner", "barber"],"sub_status_t": ["trialing", "active", "past_due", "canceled", "expired"]
          }
        }
} as const
