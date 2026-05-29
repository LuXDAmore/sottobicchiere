// Tipi del database Supabase usati dal client tipizzato (server e browser).
//
// Mantenuto a mano per DX immediata. Per rigenerarlo dallo schema reale:
//   supabase gen types typescript --local > shared/types/database.ts
// (o --project-id <ref> per il progetto remoto).

export type Json = Json[] | boolean | number | string | { [key: string]: Json | undefined } | null;

export interface Database {
    public: {
        Tables: {
            venues: {
                Row: { id: string; slug: string; name: string; config: Json; created_at: string };
                Insert: { id?: string; slug: string; name: string; config?: Json; created_at?: string };
                Update: Partial<Database['public']['Tables']['venues']['Insert']>;
                Relationships: [];
            };
            tables: {
                Row: { id: string; venue_id: string; table_number: number; qr_token: string; created_at: string };
                Insert: { id?: string; venue_id: string; table_number: number; qr_token: string; created_at?: string };
                Update: Partial<Database['public']['Tables']['tables']['Insert']>;
                Relationships: [];
            };
            table_sessions: {
                Row: {
                    id: string;
                    table_id: string;
                    started_at: string;
                    expires_at: string;
                    selected_game: string | null;
                    game_mode: string | null;
                    session_mode: string;
                    locked_at: string | null;
                    host_player_id: string | null;
                    dating_enabled: boolean;
                };
                Insert: {
                    id?: string;
                    table_id: string;
                    started_at?: string;
                    expires_at?: string;
                    selected_game?: string | null;
                    game_mode?: string | null;
                    session_mode?: string;
                    locked_at?: string | null;
                    host_player_id?: string | null;
                    dating_enabled?: boolean;
                };
                Update: Partial<Database['public']['Tables']['table_sessions']['Insert']>;
                Relationships: [];
            };
            groups: {
                Row: { id: string; table_session_id: string; name: string; color: string; created_at: string };
                Insert: { id?: string; table_session_id: string; name: string; color: string; created_at?: string };
                Update: Partial<Database['public']['Tables']['groups']['Insert']>;
                Relationships: [];
            };
            player_sessions: {
                Row: {
                    id: string;
                    table_session_id: string;
                    group_id: string | null;
                    user_id: string | null;
                    nickname: string;
                    color: string;
                    is_host: boolean;
                    joined_at: string;
                };
                Insert: {
                    id?: string;
                    table_session_id: string;
                    group_id?: string | null;
                    user_id?: string | null;
                    nickname: string;
                    color: string;
                    is_host?: boolean;
                    joined_at?: string;
                };
                Update: Partial<Database['public']['Tables']['player_sessions']['Insert']>;
                Relationships: [];
            };
            games: {
                Row: {
                    id: string;
                    table_session_id: string;
                    kind: string;
                    phase: string;
                    round_index: number;
                    total_rounds: number;
                    questions: Json;
                    current_question: Json | null;
                    scores: Json;
                    voted_count: number;
                    total_count: number;
                    revealed_votes: Json | null;
                    host_player_id: string;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    table_session_id: string;
                    kind?: string;
                    phase?: string;
                    round_index?: number;
                    total_rounds?: number;
                    questions?: Json;
                    current_question?: Json | null;
                    scores?: Json;
                    voted_count?: number;
                    total_count?: number;
                    revealed_votes?: Json | null;
                    host_player_id: string;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: Partial<Database['public']['Tables']['games']['Insert']>;
                Relationships: [];
            };
            votes: {
                Row: { game_id: string; round_index: number; player_id: string; vote: string; created_at: string };
                Insert: { game_id: string; round_index: number; player_id: string; vote: string; created_at?: string };
                Update: Partial<Database['public']['Tables']['votes']['Insert']>;
                Relationships: [];
            };
            dating_messages: {
                Row: { id: string; from_table_session_id: string; to_table_session_id: string; body: string; created_at: string };
                Insert: { id?: string; from_table_session_id: string; to_table_session_id: string; body: string; created_at?: string };
                Update: Partial<Database['public']['Tables']['dating_messages']['Insert']>;
                Relationships: [];
            };
        };
        Views: Record<string, never>;
        Functions: {
            cleanup_expired_sessions: { Args: Record<string, never>; Returns: number };
        };
        Enums: Record<string, never>;
        CompositeTypes: Record<string, never>;
    };
}
