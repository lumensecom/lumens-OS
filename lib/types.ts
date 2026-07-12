import type { Tables, Enums } from "@/lib/database.types"

// Aliases de tablas para uso en toda la app.
export type Profile = Tables<"profiles">
export type Product = Tables<"products">
export type ProductWithMargin = Tables<"products_with_margin">
export type ProductReference = Tables<"product_references">
export type ProductPriceHistory = Tables<"product_price_history">
export type Campaign = Tables<"campaigns">
export type CampaignMetric = Tables<"campaign_metrics">
export type RevenueEntry = Tables<"revenue_entries">
export type ExpenseEntry = Tables<"expense_entries">
export type KnowledgeCategory = Tables<"knowledge_categories">
export type KnowledgeArticle = Tables<"knowledge_articles">
export type KnowledgeResource = Tables<"knowledge_resources">
export type ResearchProduct = Tables<"research_products">
export type ResearchReference = Tables<"research_references">
export type Creative = Tables<"creatives">
export type Order = Tables<"orders">
export type Customer = Tables<"customers">
export type Settings = Tables<"settings">

// Aliases de enums.
export type UserRole = Enums<"user_role">
export type ProductStatus = Enums<"product_status">
export type CampaignPlatform = Enums<"campaign_platform">
export type CampaignStatus = Enums<"campaign_status">
export type ExpenseCategory = Enums<"expense_category">
export type RevenueSource = Enums<"revenue_source">
export type CreativeStatus = Enums<"creative_status">
export type AnglePlatform = Enums<"angle_platform">
