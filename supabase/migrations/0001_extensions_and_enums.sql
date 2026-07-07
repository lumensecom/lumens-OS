-- LUMENS OS · 0001 · Extensiones y tipos enum
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

create type user_role as enum ('owner', 'collaborator');
create type product_status as enum ('active', 'paused', 'testing', 'archived');
create type campaign_platform as enum ('meta', 'tiktok', 'marketplace');
create type campaign_status as enum ('active', 'paused', 'testing', 'archived');
create type expense_category as enum (
  'ads_meta', 'ads_tiktok', 'shipping', 'product_cost',
  'refund', 'tools', 'other'
);
create type revenue_source as enum ('shopify', 'marketplace', 'other');
create type creative_status as enum ('winning', 'testing', 'paused', 'archived');
create type angle_platform as enum ('meta', 'tiktok', 'both');
