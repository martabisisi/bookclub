export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          user_id: string;
          nome: string;
          slug: string;
          avatar_url: string | null;
          is_admin: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          nome: string;
          slug: string;
          avatar_url?: string | null;
          is_admin?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          nome?: string;
          slug?: string;
          avatar_url?: string | null;
          is_admin?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      books: {
        Row: {
          id: string;
          title: string;
          author: string;
          cover_url: string | null;
          total_pages: number;
          is_current_book: boolean;
          created_at: string;
          created_by: string;
          meeting_date: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          author: string;
          cover_url?: string | null;
          total_pages: number;
          is_current_book?: boolean;
          created_at?: string;
          created_by: string;
          meeting_date?: string | null;
        };
        Update: {
          id?: string;
          title?: string;
          author?: string;
          cover_url?: string | null;
          total_pages?: number;
          is_current_book?: boolean;
          created_at?: string;
          created_by?: string;
          meeting_date?: string | null;
        };
        Relationships: [];
      };
      ratings: {
        Row: {
          id: string;
          book_id: string;
          user_id: string;
          stars: number;
          comment: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          book_id: string;
          user_id: string;
          stars: number;
          comment?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          book_id?: string;
          user_id?: string;
          stars?: number;
          comment?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      reading_progress: {
        Row: {
          id: string;
          book_id: string;
          user_id: string;
          current_page: number;
          updated_at: string;
        };
        Insert: {
          id?: string;
          book_id: string;
          user_id: string;
          current_page?: number;
          updated_at?: string;
        };
        Update: {
          id?: string;
          book_id?: string;
          user_id?: string;
          current_page?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      book_suggestions: {
        Row: {
          id: string;
          title: string;
          author: string;
          reason: string;
          suggested_by: string;
          created_at: string;
          cover_url: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          author: string;
          reason?: string;
          suggested_by: string;
          created_at?: string;
          cover_url?: string | null;
        };
        Update: {
          id?: string;
          title?: string;
          author?: string;
          reason?: string;
          suggested_by?: string;
          created_at?: string;
          cover_url?: string | null;
        };
        Relationships: [];
      };
      suggestion_votes: {
        Row: {
          id: string;
          suggestion_id: string;
          user_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          suggestion_id: string;
          user_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          suggestion_id?: string;
          user_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      invites: {
        Row: {
          id: string;
          token: string;
          email: string | null;
          created_by: string;
          expires_at: string;
          used_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          token?: string;
          email?: string | null;
          created_by: string;
          expires_at?: string;
          used_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          token?: string;
          email?: string | null;
          created_by?: string;
          expires_at?: string;
          used_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      validate_invite: {
        Args: { p_token: string };
        Returns: Json;
      };
      consume_invite: {
        Args: { p_token: string };
        Returns: boolean;
      };
      create_invite: {
        Args: { p_email?: string | null };
        Returns: string;
      };
      remove_one_suggestion_vote: {
        Args: { p_suggestion_id: string };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Book = Database["public"]["Tables"]["books"]["Row"];
export type Rating = Database["public"]["Tables"]["ratings"]["Row"];
export type ReadingProgress = Database["public"]["Tables"]["reading_progress"]["Row"];
export type BookSuggestion = Database["public"]["Tables"]["book_suggestions"]["Row"];
export type SuggestionVote = Database["public"]["Tables"]["suggestion_votes"]["Row"];
