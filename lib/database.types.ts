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
      campaign_metrics: {
        Row: {
          campaign_id: string | null
          clicks: number | null
          conversions: number | null
          cpa: number | null
          cpm: number | null
          created_at: string | null
          ctr: number | null
          date: string
          frequency: number | null
          id: string
          impressions: number | null
          notes: string | null
          roas: number | null
          spend: number
        }
        Insert: {
          campaign_id?: string | null
          clicks?: number | null
          conversions?: number | null
          cpa?: number | null
          cpm?: number | null
          created_at?: string | null
          ctr?: number | null
          date: string
          frequency?: number | null
          id?: string
          impressions?: number | null
          notes?: string | null
          roas?: number | null
          spend?: number
        }
        Update: {
          campaign_id?: string | null
          clicks?: number | null
          conversions?: number | null
          cpa?: number | null
          cpm?: number | null
          created_at?: string | null
          ctr?: number | null
          date?: string
          frequency?: number | null
          id?: string
          impressions?: number | null
          notes?: string | null
          roas?: number | null
          spend?: number
        }
        Relationships: [
          {
            foreignKeyName: "campaign_metrics_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          created_at: string | null
          daily_budget: number | null
          external_id: string | null
          id: string
          name: string
          notes: string | null
          paused_at: string | null
          platform: Database["public"]["Enums"]["campaign_platform"]
          product_id: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["campaign_status"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          daily_budget?: number | null
          external_id?: string | null
          id?: string
          name: string
          notes?: string | null
          paused_at?: string | null
          platform: Database["public"]["Enums"]["campaign_platform"]
          product_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          daily_budget?: number | null
          external_id?: string | null
          id?: string
          name?: string
          notes?: string | null
          paused_at?: string | null
          platform?: Database["public"]["Enums"]["campaign_platform"]
          product_id?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["campaign_status"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_with_margin"
            referencedColumns: ["id"]
          },
        ]
      }
      creatives: {
        Row: {
          angle_type: string | null
          best_cpa: number | null
          best_ctr: number | null
          best_roas: number | null
          created_at: string | null
          cta: string | null
          duration_seconds: number | null
          hook: string | null
          id: string
          music_ref: string | null
          name: string
          notes: string | null
          platform: Database["public"]["Enums"]["angle_platform"]
          product_id: string | null
          script: string | null
          status: Database["public"]["Enums"]["creative_status"]
          thumbnail_url: string | null
          total_conversions: number | null
          total_spend: number | null
          updated_at: string | null
          video_url: string | null
        }
        Insert: {
          angle_type?: string | null
          best_cpa?: number | null
          best_ctr?: number | null
          best_roas?: number | null
          created_at?: string | null
          cta?: string | null
          duration_seconds?: number | null
          hook?: string | null
          id?: string
          music_ref?: string | null
          name: string
          notes?: string | null
          platform: Database["public"]["Enums"]["angle_platform"]
          product_id?: string | null
          script?: string | null
          status?: Database["public"]["Enums"]["creative_status"]
          thumbnail_url?: string | null
          total_conversions?: number | null
          total_spend?: number | null
          updated_at?: string | null
          video_url?: string | null
        }
        Update: {
          angle_type?: string | null
          best_cpa?: number | null
          best_ctr?: number | null
          best_roas?: number | null
          created_at?: string | null
          cta?: string | null
          duration_seconds?: number | null
          hook?: string | null
          id?: string
          music_ref?: string | null
          name?: string
          notes?: string | null
          platform?: Database["public"]["Enums"]["angle_platform"]
          product_id?: string | null
          script?: string | null
          status?: Database["public"]["Enums"]["creative_status"]
          thumbnail_url?: string | null
          total_conversions?: number | null
          total_spend?: number | null
          updated_at?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creatives_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creatives_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_with_margin"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          city: string | null
          created_at: string | null
          department: string | null
          email: string | null
          first_order_at: string | null
          id: string
          is_blacklisted: boolean | null
          last_order_at: string | null
          name: string | null
          phone: string
          risk_score: number | null
          total_delivered: number | null
          total_orders: number | null
          total_returned: number | null
          total_spent: number | null
          updated_at: string | null
        }
        Insert: {
          city?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          first_order_at?: string | null
          id?: string
          is_blacklisted?: boolean | null
          last_order_at?: string | null
          name?: string | null
          phone: string
          risk_score?: number | null
          total_delivered?: number | null
          total_orders?: number | null
          total_returned?: number | null
          total_spent?: number | null
          updated_at?: string | null
        }
        Update: {
          city?: string | null
          created_at?: string | null
          department?: string | null
          email?: string | null
          first_order_at?: string | null
          id?: string
          is_blacklisted?: boolean | null
          last_order_at?: string | null
          name?: string | null
          phone?: string
          risk_score?: number | null
          total_delivered?: number | null
          total_orders?: number | null
          total_returned?: number | null
          total_spent?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      expense_entries: {
        Row: {
          amount: number
          campaign_id: string | null
          category: Database["public"]["Enums"]["expense_category"]
          created_at: string | null
          created_by: string | null
          date: string
          description: string | null
          id: string
          product_id: string | null
        }
        Insert: {
          amount: number
          campaign_id?: string | null
          category: Database["public"]["Enums"]["expense_category"]
          created_at?: string | null
          created_by?: string | null
          date: string
          description?: string | null
          id?: string
          product_id?: string | null
        }
        Update: {
          amount?: number
          campaign_id?: string | null
          category?: Database["public"]["Enums"]["expense_category"]
          created_at?: string | null
          created_by?: string | null
          date?: string
          description?: string | null
          id?: string
          product_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_entries_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_entries_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_entries_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_with_margin"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_articles: {
        Row: {
          category_id: string | null
          content: string | null
          cover_image_url: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_pinned: boolean | null
          order_index: number | null
          slug: string
          tags: string[] | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category_id?: string | null
          content?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_pinned?: boolean | null
          order_index?: number | null
          slug: string
          tags?: string[] | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category_id?: string | null
          content?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_pinned?: boolean | null
          order_index?: number | null
          slug?: string
          tags?: string[] | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_articles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "knowledge_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "knowledge_articles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      knowledge_categories: {
        Row: {
          color: string | null
          created_at: string | null
          icon: string | null
          id: string
          name: string
          order_index: number | null
          slug: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          name: string
          order_index?: number | null
          slug: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          icon?: string | null
          id?: string
          name?: string
          order_index?: number | null
          slug?: string
        }
        Relationships: []
      }
      knowledge_resources: {
        Row: {
          article_id: string | null
          created_at: string | null
          file_type: string | null
          file_url: string
          id: string
          name: string
          size_bytes: number | null
        }
        Insert: {
          article_id?: string | null
          created_at?: string | null
          file_type?: string | null
          file_url: string
          id?: string
          name: string
          size_bytes?: number | null
        }
        Update: {
          article_id?: string | null
          created_at?: string | null
          file_type?: string | null
          file_url?: string
          id?: string
          name?: string
          size_bytes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "knowledge_resources_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "knowledge_articles"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          confirmed_at: string | null
          created_at: string | null
          customer_address: string | null
          customer_city: string | null
          customer_department: string | null
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          delivered_at: string | null
          dropi_order_id: string | null
          dropi_status: string | null
          id: string
          notes: string | null
          ordered_at: string | null
          product_id: string | null
          quantity: number | null
          returned_at: string | null
          shipped_at: string | null
          shopify_order_id: string | null
          status: string | null
          total_amount: number | null
          unit_price: number | null
          updated_at: string | null
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string | null
          customer_address?: string | null
          customer_city?: string | null
          customer_department?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivered_at?: string | null
          dropi_order_id?: string | null
          dropi_status?: string | null
          id?: string
          notes?: string | null
          ordered_at?: string | null
          product_id?: string | null
          quantity?: number | null
          returned_at?: string | null
          shipped_at?: string | null
          shopify_order_id?: string | null
          status?: string | null
          total_amount?: number | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string | null
          customer_address?: string | null
          customer_city?: string | null
          customer_department?: string | null
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivered_at?: string | null
          dropi_order_id?: string | null
          dropi_status?: string | null
          id?: string
          notes?: string | null
          ordered_at?: string | null
          product_id?: string | null
          quantity?: number | null
          returned_at?: string | null
          shipped_at?: string | null
          shopify_order_id?: string | null
          status?: string | null
          total_amount?: number | null
          unit_price?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_with_margin"
            referencedColumns: ["id"]
          },
        ]
      }
      product_price_history: {
        Row: {
          changed_at: string | null
          changed_by: string | null
          cost_dropi: number | null
          id: string
          product_id: string | null
          reason: string | null
          selling_price: number | null
        }
        Insert: {
          changed_at?: string | null
          changed_by?: string | null
          cost_dropi?: number | null
          id?: string
          product_id?: string | null
          reason?: string | null
          selling_price?: number | null
        }
        Update: {
          changed_at?: string | null
          changed_by?: string | null
          cost_dropi?: number | null
          id?: string
          product_id?: string | null
          reason?: string | null
          selling_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_price_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_price_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_price_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_with_margin"
            referencedColumns: ["id"]
          },
        ]
      }
      product_references: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          product_id: string | null
          ref_type: string
          screenshot_url: string | null
          title: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          product_id?: string | null
          ref_type: string
          screenshot_url?: string | null
          title?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          product_id?: string | null
          ref_type?: string
          screenshot_url?: string | null
          title?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_references_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_references_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_with_margin"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          admin_cost: number
          best_angle: string | null
          best_cpa: number | null
          best_roas: number | null
          compared_price: number | null
          cost_dropi: number
          cpa_real: number | null
          created_at: string | null
          description: string | null
          dropi_product_id: string | null
          fulfillment_cost: number
          gallery: Json | null
          id: string
          landing_url: string | null
          main_image_url: string | null
          name: string
          price_rule_pct: number
          selling_price: number
          shipping_cost: number
          shopify_product_id: string | null
          slug: string
          status: Database["public"]["Enums"]["product_status"]
          target_audience: string | null
          total_orders: number | null
          updated_at: string | null
        }
        Insert: {
          admin_cost?: number
          best_angle?: string | null
          best_cpa?: number | null
          best_roas?: number | null
          compared_price?: number | null
          cost_dropi?: number
          cpa_real?: number | null
          created_at?: string | null
          description?: string | null
          dropi_product_id?: string | null
          fulfillment_cost?: number
          gallery?: Json | null
          id?: string
          landing_url?: string | null
          main_image_url?: string | null
          name: string
          price_rule_pct?: number
          selling_price: number
          shipping_cost?: number
          shopify_product_id?: string | null
          slug: string
          status?: Database["public"]["Enums"]["product_status"]
          target_audience?: string | null
          total_orders?: number | null
          updated_at?: string | null
        }
        Update: {
          admin_cost?: number
          best_angle?: string | null
          best_cpa?: number | null
          best_roas?: number | null
          compared_price?: number | null
          cost_dropi?: number
          cpa_real?: number | null
          created_at?: string | null
          description?: string | null
          dropi_product_id?: string | null
          fulfillment_cost?: number
          gallery?: Json | null
          id?: string
          landing_url?: string | null
          main_image_url?: string | null
          name?: string
          price_rule_pct?: number
          selling_price?: number
          shipping_cost?: number
          shopify_product_id?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["product_status"]
          target_audience?: string | null
          total_orders?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Relationships: []
      }
      research_products: {
        Row: {
          created_by: string | null
          discovered_at: string | null
          estimated_cost: number | null
          estimated_margin: number | null
          estimated_selling_price: number | null
          gallery: Json | null
          hooks_ideas: string[] | null
          id: string
          main_image_url: string | null
          name: string
          notes: string | null
          score_competition: number | null
          score_demand: number | null
          score_logistics: number | null
          score_margin: number | null
          score_visual: number | null
          source_platform: string | null
          source_url: string | null
          status: string | null
          target_audience: string | null
          total_score: number | null
          updated_at: string | null
        }
        Insert: {
          created_by?: string | null
          discovered_at?: string | null
          estimated_cost?: number | null
          estimated_margin?: number | null
          estimated_selling_price?: number | null
          gallery?: Json | null
          hooks_ideas?: string[] | null
          id?: string
          main_image_url?: string | null
          name: string
          notes?: string | null
          score_competition?: number | null
          score_demand?: number | null
          score_logistics?: number | null
          score_margin?: number | null
          score_visual?: number | null
          source_platform?: string | null
          source_url?: string | null
          status?: string | null
          target_audience?: string | null
          total_score?: number | null
          updated_at?: string | null
        }
        Update: {
          created_by?: string | null
          discovered_at?: string | null
          estimated_cost?: number | null
          estimated_margin?: number | null
          estimated_selling_price?: number | null
          gallery?: Json | null
          hooks_ideas?: string[] | null
          id?: string
          main_image_url?: string | null
          name?: string
          notes?: string | null
          score_competition?: number | null
          score_demand?: number | null
          score_logistics?: number | null
          score_margin?: number | null
          score_visual?: number | null
          source_platform?: string | null
          source_url?: string | null
          status?: string | null
          target_audience?: string | null
          total_score?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "research_products_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      research_references: {
        Row: {
          created_at: string | null
          days_active: number | null
          engagement_notes: string | null
          id: string
          notes: string | null
          platform: string | null
          ref_type: string
          research_product_id: string | null
          screenshot_url: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          days_active?: number | null
          engagement_notes?: string | null
          id?: string
          notes?: string | null
          platform?: string | null
          ref_type: string
          research_product_id?: string | null
          screenshot_url?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          days_active?: number | null
          engagement_notes?: string | null
          id?: string
          notes?: string | null
          platform?: string | null
          ref_type?: string
          research_product_id?: string | null
          screenshot_url?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "research_references_research_product_id_fkey"
            columns: ["research_product_id"]
            isOneToOne: false
            referencedRelation: "research_products"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_entries: {
        Row: {
          created_at: string | null
          created_by: string | null
          date: string
          gross_amount: number
          id: string
          notes: string | null
          orders_count: number
          product_id: string | null
          source: Database["public"]["Enums"]["revenue_source"]
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          date: string
          gross_amount: number
          id?: string
          notes?: string | null
          orders_count?: number
          product_id?: string | null
          source?: Database["public"]["Enums"]["revenue_source"]
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          date?: string
          gross_amount?: number
          id?: string
          notes?: string | null
          orders_count?: number
          product_id?: string | null
          source?: Database["public"]["Enums"]["revenue_source"]
        }
        Relationships: [
          {
            foreignKeyName: "revenue_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_entries_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "revenue_entries_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products_with_margin"
            referencedColumns: ["id"]
          },
        ]
      }
      settings: {
        Row: {
          ai_brand_context: string | null
          default_admin_cost: number
          default_price_rule_pct: number
          default_shipping_cost: number
          id: number
          meta_a: number
          meta_b: number
          updated_at: string | null
        }
        Insert: {
          ai_brand_context?: string | null
          default_admin_cost?: number
          default_price_rule_pct?: number
          default_shipping_cost?: number
          id?: number
          meta_a?: number
          meta_b?: number
          updated_at?: string | null
        }
        Update: {
          ai_brand_context?: string | null
          default_admin_cost?: number
          default_price_rule_pct?: number
          default_shipping_cost?: number
          id?: number
          meta_a?: number
          meta_b?: number
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      products_with_margin: {
        Row: {
          admin_cost: number | null
          best_angle: string | null
          best_cpa: number | null
          best_roas: number | null
          cogs: number | null
          compared_price: number | null
          cost_dropi: number | null
          cpa_max_rentable: number | null
          cpa_real: number | null
          created_at: string | null
          description: string | null
          dropi_product_id: string | null
          fulfillment_cost: number | null
          gallery: Json | null
          id: string | null
          landing_url: string | null
          main_image_url: string | null
          margin: number | null
          margin_percentage: number | null
          min_selling_price: number | null
          name: string | null
          net_utility: number | null
          net_utility_percentage: number | null
          price_rule_pct: number | null
          selling_price: number | null
          shipping_cost: number | null
          shopify_product_id: string | null
          slug: string | null
          status: Database["public"]["Enums"]["product_status"] | null
          target_audience: string | null
          total_orders: number | null
          updated_at: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      is_owner: { Args: Record<PropertyKey, never>; Returns: boolean }
    }
    Enums: {
      angle_platform: "meta" | "tiktok" | "both"
      campaign_platform: "meta" | "tiktok" | "marketplace"
      campaign_status: "active" | "paused" | "testing" | "archived"
      creative_status: "winning" | "testing" | "paused" | "archived"
      expense_category:
        | "ads_meta"
        | "ads_tiktok"
        | "shipping"
        | "product_cost"
        | "refund"
        | "tools"
        | "other"
      product_status: "active" | "paused" | "testing" | "archived"
      revenue_source: "shopify" | "marketplace" | "other"
      user_role: "owner" | "collaborator"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database["public"]

export type Tables<T extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])> =
  (DefaultSchema["Tables"] & DefaultSchema["Views"])[T] extends { Row: infer R } ? R : never

export type TablesInsert<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T] extends { Insert: infer I } ? I : never

export type TablesUpdate<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T] extends { Update: infer U } ? U : never

export type Enums<T extends keyof DefaultSchema["Enums"]> = DefaultSchema["Enums"][T]
