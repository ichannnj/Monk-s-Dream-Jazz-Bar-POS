# 📦 Phase 1: Database Model Expansion, Recipe BOM & Seeding (Supabase BaaS)

> **Phase:** 01 of 06  
> **Status:** ✅ Completed  
> **Master Spec Reference:** [REQUIREMENTS.md — Section 8 (Schema Design)](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/REQUIREMENTS.md#L740-L1132)  
> **Goal:** Author the full 18-model domain schema in Supabase SQL migrations, synchronize Supabase Cloud Postgres via `supabase db push`, generate strongly-typed TypeScript definitions via `supabase gen types typescript`, and seed the catalog via `supabase/seed.sql`.

---

## 🎯 Scope of Work

```
┌────────────────────────────────────────────────────────────────────────┐
│ 1. Supabase SQL Schema Migration                                       │
│    • 15 Enums (role, operating_mode, table_zone, tab_status, etc.)     │
│    • 16 Relational Tables (products, stock_movements, tabs, etc.)      │
│    • Stored Procedures (authenticate_staff_pin, dispatch_order)        │
├────────────────────────────────────────────────────────────────────────┤
│ 2. Supabase Cloud Sync & Type Generation                               │
│    • supabase db push (direct synchronization to Cloud PostgreSQL)     │
│    • supabase gen types typescript (strongly-typed Database interface) │
├────────────────────────────────────────────────────────────────────────┤
│ 3. Comprehensive Seed Data (supabase/seed.sql)                         │
│    • Full Staff Roster (PINs across all 6 roles)                       │
│    • 25 Physical Tables (15 Cafe Area, 10 Bar Area)                    │
│    • Raw Stock Inventory (Espresso beans, oat milk, spirits, meat)     │
│    • Exact Recipe BOMs with High-Definition Unsplash Photography       │
│    • Resold Outside Food (+20% automatic locked markup)                │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 📝 Step-by-Step Implementation Checklist

### Step 1.1: Author Supabase SQL Migration

- [x] Target file: [supabase/migrations/20261017000000_init_pos_schema.sql](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/supabase/migrations/20261017000000_init_pos_schema.sql)
- [x] Implement all operational Enums & Models
- [x] Implement PL/pgSQL Stored Procedures (`authenticate_staff_pin`, `dispatch_order_with_depletion`, `transfer_table_tab`)
- [x] Enable Supabase Realtime publication on `tables`, `tabs`, `orders`, `order_items`, `products`, `print_jobs`

### Step 1.1b: Expand Shared Types & Zod Schemas

- [x] Target file: [packages/shared/src/database.types.ts](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/packages/shared/src/database.types.ts) and [packages/shared/src/index.ts](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/packages/shared/src/index.ts)
- [x] Export `Database` interface covering all tables, columns, and RPC return types.
- [x] Provide `ProductSchema` and `MenuItem` with `imageUrl?: string`.

### Step 1.2: Sync Database & Generate Types

- [x] Push migrations directly to Supabase Cloud PostgreSQL:
  ```bash
  npx supabase db push
  ```
- [x] Generate TypeScript types:
  ```bash
  pnpm supabase:types
  ```

### Step 1.3: Execute Comprehensive Seed Script

- [x] Target file: [supabase/seed.sql](file:///home/ichannnj/Documents/Commisions/Monk-s-Dream-Jazz-Bar-POS/supabase/seed.sql)
- [x] Run seed execution:
  ```bash
  npx supabase db query --linked -f ./supabase/seed.sql
  ```
- [x] Seed Data Requirements:
  1. **Standardized 4-Digit Staff Users Roster:**
     - Admin / Manager: Miles (`9999`)
     - Cashier: Coltrane (`1111`)
     - Floor Waiter: Ella (`2222`)
     - Bartender: Thelonious (`3333`)
     - Barista: Bill (`4444`)
     - Kitchen Chef: Chet (`5555`)
     - Expediter / Runner: Max (`6666`)
     - Non-workflow staff: Rosa (Dishwasher - `7777`), Marcus (Sound Tech - `8888`)
  2. **Physical Tables (25 Total):**
     - 15 Cafe Area tables (Table 1 through Table 15)
     - 10 Bar Area rail seats (Bar 1 through Bar 10)
  3. **Raw Inventory Items:**
     - `COF-001`: Specialty Espresso Bean (kg)
     - `COF-002`: Single Origin Ethiopia Bean (kg)
     - `DRY-010`: Barista Oat Milk (Liters)
     - `DRY-012`: Whole Dairy Milk (Liters)
     - `BAR-101`: London Dry Gin 750ml (Bottles)
     - `BAR-105`: Campari Bitter 750ml (Bottles)
     - `BAR-108`: Sweet Red Vermouth 750ml (Bottles)
     - `BAR-110`: Rye Whiskey 750ml (Bottles)
     - `BAR-112`: Premium Vodka 750ml (Bottles)
     - `BAR-115`: Kahlúa Coffee Liqueur 750ml (Bottles)
     - `BAR-118`: Absinthe Verte 750ml (Bottles)
     - `BAR-120`: Peychaud's Bitters (Bottles)
     - `KIT-201`: Cured Guanciale (kg)
     - `KIT-205`: Artisan Spaghetti (kg)
     - `KIT-210`: Farm Fresh Eggs (pcs)
     - `KIT-220`: Parmigiano Reggiano DOP (kg)
     - `KIT-225`: Truffle Oil Infusion (ml)
     - `KIT-230`: Artisan Pizza Dough (pcs)
     - `KIT-232`: San Marzano Tomato Sauce (kg)
     - `KIT-235`: Fresh Mozzarella Di Bufala (kg)
     - `KIT-240`: Artisan Ciabatta Buns (pcs)
     - `KIT-242`: Provolone Cheese (kg)
     - `KIT-245`: Fresh Arugula (kg)
     - `OUT-301`: Artisan Butter Croissant (pcs)
     - `OUT-305`: Basque Burnt Cheesecake Slice (pcs)
  4. **Curated Menu Catalog with Exact Recipe BOMs & Cover Images:**
     - All items include high-definition Unsplash photography URLs (`imageUrl`) for instant visual richness in POS cards:
     - **Specialty Coffee (Barista Station):**
       - _Flat White_ ($4.50, `https://images.unsplash.com/photo-1577968897966-3d4325b36b61?auto=format&fit=crop&w=600&q=80`) $\to$ 18g espresso beans + 200ml oat milk
       - _V60 Pour Over_ ($5.50, `https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80`) $\to$ 15g single origin beans + 250ml water
       - _Cold Brew_ ($5.00, `https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=600&q=80`) $\to$ 20g specialty beans + 150ml water/ice
     - **Signature Cocktails (Bar Station):**
       - _Thelonious Monk Negroni_ ($15.00, `https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80`) $\to$ 30ml Gin + 30ml Campari + 30ml Sweet Vermouth
       - _Blue Note Espresso Martini_ ($16.00, `https://images.unsplash.com/photo-1545438102-799c3991ffb2?auto=format&fit=crop&w=600&q=80`) $\to$ 45ml Vodka + 30ml Coffee Liqueur + 30ml Fresh Espresso (18g beans)
       - _Miles Davis Sazerac_ ($16.00, `https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=600&q=80`) $\to$ 60ml Rye Whiskey + 10ml Absinthe wash + 4 dashes Peychaud's
     - **Kitchen Mains (Kitchen Station):**
       - _Truffle Carbonara_ ($18.00, `https://images.unsplash.com/photo-1612874742237-6526221588e3?auto=format&fit=crop&w=600&q=80`) $\to$ 100g spaghetti + 60g guanciale + 2 farm eggs + 30g parmesan + 5ml truffle oil (Allergens: Dairy, Gluten, Eggs)
       - _Margherita Pizza_ ($16.00, `https://images.unsplash.com/photo-1604382355076-af4b0eb60143?auto=format&fit=crop&w=600&q=80`) $\to$ 1 pizza dough + 80g San Marzano sauce + 100g fresh mozzarella (Allergens: Dairy, Gluten)
       - _Guanciale Panini_ ($14.00, `https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=600&q=80`) $\to$ 1 ciabatta bun + 50g guanciale + 40g provolone + 15g arugula (Allergens: Dairy, Gluten)
     - **Resold Outside Food (Fixed +20% Markup Constraint):**
       - _Artisan Butter Croissant_ ($3.60, `https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=600&q=80`): Vendor Cost $3.00 $\to$ Locked Base Price: **$3.60**
       - _Basque Burnt Cheesecake_ ($6.00, `https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=600&q=80`): Vendor Cost $5.00 $\to$ Locked Base Price: **$6.00**

---

## 🔬 Verification & Validation

| Verification Check          | Command               | Expected Outcome                                                             |
| --------------------------- | --------------------- | ---------------------------------------------------------------------------- |
| Monorepo Build Integrity    | `pnpm build`          | Zero TypeScript errors across `@monks/shared` and `@monks/printing`          |
| Supabase Schema Sync        | `pnpm supabase:push`  | PostgreSQL schema synchronized to Cloud/Local Supabase instance              |
| TypeScript Types Generation | `pnpm supabase:types` | Generates strongly-typed `database.types.ts` reflecting 16 tables and enums  |
| Seed Execution              | `pnpm supabase:reset` | Applies migrations and loads 25 tables, 25 inventory items, and menu catalog |
