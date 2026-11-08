-- ==============================================================================
-- Monk's Dream Jazz Bar POS: Normalize order_items.modifiers JSONB Arrays
-- Migration: 20261108000010_normalize_order_item_modifiers.sql
-- Description:
--   The order dispatch client was writing `modifiers` as a JSON-encoded STRING
--   (JSON.stringify) into the jsonb column, producing a double-encoded scalar
--   such as "[\"Extra Shot\"]" instead of ["Extra Shot"].
--
--   When settlement (or KDS READY) transitions order_items.status to
--   'SERVED' / 'READY', public.fn_deplete_inventory_on_item_ready() calls
--   jsonb_array_length(NEW.modifiers) on that scalar and PostgreSQL aborts with:
--
--     ERROR: cannot get array length of a scalar
--
--   which surfaces to the POS as a failed settle_tab_and_record_payment call.
--
--   This migration:
--     1. Adds a safe JSONB array normalizer helper.
--     2. Adds a BEFORE INSERT/UPDATE trigger so modifiers are ALWAYS arrays,
--        regardless of which client writes the row.
--     3. Repairs every existing double-encoded / NULL modifiers row in place.
--     4. Hardens fn_deplete_inventory_on_item_ready() against scalar payloads.
-- ==============================================================================

-- 1. SAFE JSONB ARRAY NORMALIZER
--    Accepts NULL, a JSON array, or a JSON string containing an array and always
--    returns a valid JSONB array (never raises).
CREATE OR REPLACE FUNCTION public.fn_normalize_modifiers_jsonb(p_value JSONB)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  v_parsed JSONB;
BEGIN
  IF p_value IS NULL THEN
    RETURN '[]'::jsonb;
  END IF;

  IF jsonb_typeof(p_value) = 'array' THEN
    RETURN p_value;
  END IF;

  IF jsonb_typeof(p_value) = 'string' THEN
    BEGIN
      v_parsed := (p_value #>> '{}')::jsonb;
    EXCEPTION WHEN others THEN
      RETURN '[]'::jsonb;
    END;

    IF jsonb_typeof(v_parsed) = 'array' THEN
      RETURN v_parsed;
    END IF;
  END IF;

  RETURN '[]'::jsonb;
END;
$$;

-- 2. WRITE-PATH NORMALIZER TRIGGER
CREATE OR REPLACE FUNCTION public.fn_normalize_order_item_modifiers()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.modifiers := public.fn_normalize_modifiers_jsonb(NEW.modifiers);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_normalize_order_item_modifiers ON public.order_items;
CREATE TRIGGER trg_normalize_order_item_modifiers
BEFORE INSERT OR UPDATE ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.fn_normalize_order_item_modifiers();

-- 3. REPAIR EXISTING DOUBLE-ENCODED ROWS
WITH normalized AS (
  SELECT id, public.fn_normalize_modifiers_jsonb(modifiers) AS normalized_modifiers
  FROM public.order_items
  WHERE modifiers IS NULL OR jsonb_typeof(modifiers) <> 'array'
)
UPDATE public.order_items oi
SET modifiers = n.normalized_modifiers
FROM normalized n
WHERE oi.id = n.id
  AND oi.modifiers IS DISTINCT FROM n.normalized_modifiers;

-- 4. HARDEN RECIPE / MODIFIER DEPLETION AGAINST NON-ARRAY PAYLOADS
CREATE OR REPLACE FUNCTION public.fn_deplete_inventory_on_item_ready()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ing RECORD;
  v_mod RECORD;
  v_mod_text TEXT;
  v_clean_mod_name TEXT;
  v_balance_before NUMERIC;
  v_current_stock NUMERIC;
  v_deduction NUMERIC;
  v_mods JSONB;
BEGIN
  -- Only deplete when transitioning to READY or SERVED and not already depleted
  IF (NEW.status IN ('READY', 'SERVED')
      AND (TG_OP = 'INSERT' OR OLD.status NOT IN ('READY', 'SERVED'))
      AND NEW.is_depleted = false) THEN

    -- A. Deplete Base Recipe Ingredients
    FOR v_ing IN
      SELECT
        pi.inventory_item_id,
        pi.amount,
        pi.conversion_factor,
        ii.current_stock AS stock_now
      FROM public.product_ingredients pi
      JOIN public.inventory_items ii ON ii.id = pi.inventory_item_id
      WHERE pi.product_id = NEW.product_id
    LOOP
      SELECT current_stock INTO v_balance_before
      FROM public.inventory_items
      WHERE id = v_ing.inventory_item_id
      FOR UPDATE;

      IF FOUND THEN
        v_deduction := (v_ing.amount * NEW.quantity * v_ing.conversion_factor);
        v_current_stock := v_balance_before - v_deduction;

        UPDATE public.inventory_items
        SET current_stock = v_current_stock, updated_at = now()
        WHERE id = v_ing.inventory_item_id;

        INSERT INTO public.stock_movements (
          inventory_item_id,
          movement_type,
          change_amount,
          balance_before,
          balance_after,
          reference_id
        ) VALUES (
          v_ing.inventory_item_id,
          'SALE_DEPLETION',
          -v_deduction,
          v_balance_before,
          v_current_stock,
          NEW.order_id::text
        );
      END IF;
    END LOOP;

    -- B. Deplete Selected Modifiers (if linked to inventory)
    -- v_mods is always a JSONB array, even if a legacy double-encoded scalar
    -- ("[...]") somehow bypassed the normalizer trigger.
    v_mods := public.fn_normalize_modifiers_jsonb(NEW.modifiers);

    IF jsonb_array_length(v_mods) > 0 THEN
      FOR v_mod_text IN SELECT jsonb_array_elements_text(v_mods)
      LOOP
        -- Strip price suffix like " (+₱50.00)" if present to match modifier name
        v_clean_mod_name := regexp_replace(v_mod_text, '\s*\(\+₱[0-9.,]+\)$', '');

        FOR v_mod IN
          SELECT pm.inventory_item_id, pm.amount_delta, ii.current_stock AS stock_now
          FROM public.product_modifiers pm
          JOIN public.inventory_items ii ON ii.id = pm.inventory_item_id
          WHERE (pm.product_id = NEW.product_id OR pm.product_id IS NULL)
            AND pm.name = v_clean_mod_name
            AND pm.inventory_item_id IS NOT NULL
            AND pm.amount_delta > 0
          LIMIT 1
        LOOP
          SELECT current_stock INTO v_balance_before
          FROM public.inventory_items
          WHERE id = v_mod.inventory_item_id
          FOR UPDATE;

          IF FOUND THEN
            v_deduction := (v_mod.amount_delta * NEW.quantity);
            v_current_stock := v_balance_before - v_deduction;

            UPDATE public.inventory_items
            SET current_stock = v_current_stock, updated_at = now()
            WHERE id = v_mod.inventory_item_id;

            INSERT INTO public.stock_movements (
              inventory_item_id,
              movement_type,
              change_amount,
              balance_before,
              balance_after,
              reference_id
            ) VALUES (
              v_mod.inventory_item_id,
              'SALE_DEPLETION',
              -v_deduction,
              v_balance_before,
              v_current_stock,
              NEW.order_id::text || ' (MOD: ' || v_clean_mod_name || ')'
            );
          END IF;
        END LOOP;
      END LOOP;
    END IF;

    NEW.is_depleted := true;
    NEW.updated_at := now();
  END IF;

  RETURN NEW;
END;
$$;
