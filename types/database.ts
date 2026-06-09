export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string | null;
          full_name: string | null;
          role: "admin" | "teacher" | "student";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email?: string | null;
          full_name?: string | null;
          role?: "admin" | "teacher" | "student";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string | null;
          full_name?: string | null;
          role?: "admin" | "teacher" | "student";
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      question_types: {
        Row: {
          id: string;
          level1: string;
          level2: string;
          level3: string;
          keywords: string[];
          description: string | null;
          is_active: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          level1: string;
          level2: string;
          level3: string;
          keywords?: string[];
          description?: string | null;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          level1?: string;
          level2?: string;
          level3?: string;
          keywords?: string[];
          description?: string | null;
          is_active?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "question_types_created_by_fkey";
            columns: ["created_by"];
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      question_type_examples: {
        Row: {
          id: string;
          question_type_id: string;
          example_text: string;
          solution_hint: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          question_type_id: string;
          example_text: string;
          solution_hint?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          question_type_id?: string;
          example_text?: string;
          solution_hint?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "question_type_examples_question_type_id_fkey";
            columns: ["question_type_id"];
            referencedRelation: "question_types";
            referencedColumns: ["id"];
          }
        ];
      };
      problems: {
        Row: {
          id: string;
          created_by: string | null;
          question_type_id: string | null;
          problem_type: "single_choice" | "fill_blank" | "calculation";
          raw_latex: string;
          normalized_text: string | null;
          options_json: Json | null;
          answer: string | null;
          analysis: string | null;
          source: string | null;
          source_type: "teacher_created" | "student_submitted";
          source_mistake_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          created_by?: string | null;
          question_type_id?: string | null;
          problem_type?: "single_choice" | "fill_blank" | "calculation";
          raw_latex: string;
          normalized_text?: string | null;
          options_json?: Json | null;
          answer?: string | null;
          analysis?: string | null;
          source?: string | null;
          source_type?: "teacher_created" | "student_submitted";
          source_mistake_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          created_by?: string | null;
          question_type_id?: string | null;
          problem_type?: "single_choice" | "fill_blank" | "calculation";
          raw_latex?: string;
          normalized_text?: string | null;
          options_json?: Json | null;
          answer?: string | null;
          analysis?: string | null;
          source?: string | null;
          source_type?: "teacher_created" | "student_submitted";
          source_mistake_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "problems_question_type_id_fkey";
            columns: ["question_type_id"];
            referencedRelation: "question_types";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "problems_source_mistake_id_fkey";
            columns: ["source_mistake_id"];
            referencedRelation: "mistakes";
            referencedColumns: ["id"];
          }
        ];
      };
      mistakes: {
        Row: {
          id: string;
          user_id: string;
          question_type_id: string | null;
          stem: string;
          problem_type: "single_choice" | "fill_blank" | "calculation";
          input_type: "plain_text" | "latex";
          raw_text: string;
          raw_latex: string | null;
          normalized_stem: string | null;
          options_json: Json | null;
          latex_content: string | null;
          source: string | null;
          note: string | null;
          answer: string | null;
          analysis: string | null;
          classification_status:
            | "pending"
            | "student_selected"
            | "teacher_confirmed";
          classified_by: "student" | "teacher" | "system" | null;
          teacher_note: string | null;
          status: "reviewing" | "mastered" | "archived";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          question_type_id?: string | null;
          stem: string;
          problem_type?: "single_choice" | "fill_blank" | "calculation";
          input_type?: "plain_text" | "latex";
          raw_text?: string;
          raw_latex?: string | null;
          normalized_stem?: string | null;
          options_json?: Json | null;
          latex_content?: string | null;
          source?: string | null;
          note?: string | null;
          answer?: string | null;
          analysis?: string | null;
          classification_status?:
            | "pending"
            | "student_selected"
            | "teacher_confirmed";
          classified_by?: "student" | "teacher" | "system" | null;
          teacher_note?: string | null;
          status?: "reviewing" | "mastered" | "archived";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          question_type_id?: string | null;
          stem?: string;
          problem_type?: "single_choice" | "fill_blank" | "calculation";
          input_type?: "plain_text" | "latex";
          raw_text?: string;
          raw_latex?: string | null;
          normalized_stem?: string | null;
          options_json?: Json | null;
          latex_content?: string | null;
          source?: string | null;
          note?: string | null;
          answer?: string | null;
          analysis?: string | null;
          classification_status?:
            | "pending"
            | "student_selected"
            | "teacher_confirmed";
          classified_by?: "student" | "teacher" | "system" | null;
          teacher_note?: string | null;
          status?: "reviewing" | "mastered" | "archived";
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "mistakes_question_type_id_fkey";
            columns: ["question_type_id"];
            referencedRelation: "question_types";
            referencedColumns: ["id"];
          }
        ];
      };
      review_tasks: {
        Row: {
          id: string;
          user_id: string;
          mistake_id: string;
          question_type_id: string | null;
          interval_days: 1 | 3 | 7 | 14 | 30;
          due_date: string;
          review_date: string;
          review_round: string;
          status: "pending" | "completed" | "skipped";
          result: "mastered" | "not_mastered" | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          mistake_id: string;
          question_type_id?: string | null;
          interval_days: 1 | 3 | 7 | 14 | 30;
          due_date: string;
          review_date?: string;
          review_round?: string;
          status?: "pending" | "completed" | "skipped";
          result?: "mastered" | "not_mastered" | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          mistake_id?: string;
          question_type_id?: string | null;
          interval_days?: 1 | 3 | 7 | 14 | 30;
          due_date?: string;
          review_date?: string;
          review_round?: string;
          status?: "pending" | "completed" | "skipped";
          result?: "mastered" | "not_mastered" | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "review_tasks_mistake_id_fkey";
            columns: ["mistake_id"];
            referencedRelation: "mistakes";
            referencedColumns: ["id"];
          }
        ];
      };
      weak_practice_tasks: {
        Row: {
          id: string;
          user_id: string;
          problem_id: string;
          question_type_id: string;
          practice_date: string;
          source_type: "weak" | "secondary" | "random";
          status: "pending" | "completed";
          result: "mastered" | "not_mastered" | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          problem_id: string;
          question_type_id: string;
          practice_date: string;
          source_type: "weak" | "secondary" | "random";
          status?: "pending" | "completed";
          result?: "mastered" | "not_mastered" | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          problem_id?: string;
          question_type_id?: string;
          practice_date?: string;
          source_type?: "weak" | "secondary" | "random";
          status?: "pending" | "completed";
          result?: "mastered" | "not_mastered" | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "weak_practice_tasks_problem_id_fkey";
            columns: ["problem_id"];
            referencedRelation: "problems";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "weak_practice_tasks_question_type_id_fkey";
            columns: ["question_type_id"];
            referencedRelation: "question_types";
            referencedColumns: ["id"];
          }
        ];
      };
      knowledge_mastery: {
        Row: {
          id: string;
          user_id: string;
          question_type_id: string;
          mastered_count: number;
          total_reviews: number;
          mastery_percent: number;
          last_reviewed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          question_type_id: string;
          mastered_count?: number;
          total_reviews?: number;
          mastery_percent?: number;
          last_reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          question_type_id?: string;
          mastered_count?: number;
          total_reviews?: number;
          mastery_percent?: number;
          last_reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "knowledge_mastery_question_type_id_fkey";
            columns: ["question_type_id"];
            referencedRelation: "question_types";
            referencedColumns: ["id"];
          }
        ];
      };
      review_records: {
        Row: {
          id: string;
          user_id: string;
          mistake_id: string;
          review_task_id: string | null;
          result: "correct" | "wrong" | "again";
          note: string | null;
          reviewed_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string;
          mistake_id: string;
          review_task_id?: string | null;
          result: "correct" | "wrong" | "again";
          note?: string | null;
          reviewed_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          mistake_id?: string;
          review_task_id?: string | null;
          result?: "correct" | "wrong" | "again";
          note?: string | null;
          reviewed_at?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "review_records_mistake_id_fkey";
            columns: ["mistake_id"];
            referencedRelation: "mistakes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "review_records_review_task_id_fkey";
            columns: ["review_task_id"];
            referencedRelation: "review_tasks";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
