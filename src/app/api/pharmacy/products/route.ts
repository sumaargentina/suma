import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';

function toCamel(row: Record<string, any>) {
    const out: Record<string, any> = {};
    for (const k in row) {
        const camelK = k.replace(/_([a-z])/g, (_, l) => l.toUpperCase());
        out[camelK] = row[k];
    }
    return out;
}

// GET /api/pharmacy/products?pharmacyId=...&onlyPromotions=...
export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const pharmacyId = searchParams.get('pharmacyId');
        const pharmacyIdsParam = searchParams.get('pharmacyIds');
        const onlyPromotions = searchParams.get('onlyPromotions') === 'true';

        let query = supabaseAdmin
            .from('pharmacy_products')
            .select('*')
            .order('is_promotion', { ascending: false })
            .order('name', { ascending: true });

        if (pharmacyId) {
            query = query.eq('pharmacy_id', pharmacyId);
        } else if (pharmacyIdsParam) {
            const ids = pharmacyIdsParam.split(',').map(s => s.trim()).filter(Boolean);
            if (ids.length > 0) {
                query = query.in('pharmacy_id', ids);
            }
        }

        if (onlyPromotions) {
            query = query.eq('is_promotion', true);
        }

        const { data, error } = await query;
        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json((data || []).map(toCamel));
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}

// POST /api/pharmacy/products - Crear producto individual o carga masiva desde Excel
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const pharmacyId = body.pharmacyId || body.pharmacy_id;

        if (!pharmacyId) {
            return NextResponse.json({ error: 'pharmacyId es obligatorio' }, { status: 400 });
        }

        // Caso 1: Carga masiva (Excel / CSV)
        if (Array.isArray(body.products)) {
            const now = new Date().toISOString();
            const rowsToInsert = body.products
                .filter((p: any) => p && (p.name || p.nombre || p.medicamento))
                .map((p: any) => {
                    const rawStock = p.stockQuantity ?? p.stock_quantity ?? p.cantidad ?? null;
                    const stockQty = rawStock !== null && rawStock !== '' && !isNaN(Number(rawStock)) ? Math.max(0, Math.floor(Number(rawStock))) : null;
                    const explicitAvail = p.isAvailable !== undefined ? Boolean(p.isAvailable) : true;
                    const computedAvailable = stockQty !== null ? (stockQty > 0 && explicitAvail) : explicitAvail;

                    return {
                        pharmacy_id: pharmacyId,
                        name: String(p.name || p.nombre || p.medicamento || '').trim(),
                        generic_name: p.genericName || p.generic_name || p.principioActivo || p.componente || null,
                        presentation: p.presentation || p.presentacion || null,
                        category: p.category || p.categoria || 'Medicamentos',
                        is_available: computedAvailable,
                        stock_quantity: stockQty,
                        is_promotion: p.isPromotion !== undefined ? Boolean(p.isPromotion) : false,
                        promo_label: p.promoLabel || p.promo_label || p.promocion || null,
                        reference_price: p.referencePrice !== undefined && p.referencePrice !== '' && p.referencePrice !== null ? Number(p.referencePrice) : null,
                        promo_price: p.promoPrice !== undefined && p.promoPrice !== '' && p.promoPrice !== null ? Number(p.promoPrice) : null,
                        image_url: p.imageUrl || p.image_url || null,
                        description: p.description || p.descripcion || null,
                        usage_indications: p.usageIndications || p.usage_indications || p.indicaciones || null,
                        created_at: now,
                        updated_at: now,
                    };
                });

            if (rowsToInsert.length === 0) {
                return NextResponse.json({ error: 'No se encontraron productos válidos para importar' }, { status: 400 });
            }

            if (body.replaceExisting || body.mode === 'replace') {
                await supabaseAdmin.from('pharmacy_products').delete().eq('pharmacy_id', pharmacyId);
            }

            const { data, error } = await supabaseAdmin
                .from('pharmacy_products')
                .insert(rowsToInsert)
                .select();

            if (error) {
                return NextResponse.json({ error: error.message }, { status: 500 });
            }

            return NextResponse.json({
                success: true,
                count: (data || []).length,
                importedCount: (data || []).length,
                products: (data || []).map(toCamel),
            });
        }

        // Caso 2: Producto individual (Manual)
        const pData = body.product || body;
        if (!pData.name || !String(pData.name).trim()) {
            return NextResponse.json({ error: 'El nombre del medicamento/producto es obligatorio' }, { status: 400 });
        }

        const rawStock = pData.stockQuantity ?? pData.stock_quantity ?? null;
        const stockQty = rawStock !== null && rawStock !== '' && !isNaN(Number(rawStock)) ? Math.max(0, Math.floor(Number(rawStock))) : null;
        const explicitAvail = pData.isAvailable !== undefined ? Boolean(pData.isAvailable) : true;
        const computedAvailable = stockQty !== null ? (stockQty > 0 && explicitAvail) : explicitAvail;

        const now = new Date().toISOString();
        const insertPayload = {
            pharmacy_id: pharmacyId,
            name: String(pData.name).trim(),
            generic_name: pData.genericName ?? pData.generic_name ?? null,
            presentation: pData.presentation ?? null,
            category: pData.category || 'Medicamentos',
            is_available: computedAvailable,
            stock_quantity: stockQty,
            is_promotion: pData.isPromotion !== undefined ? Boolean(pData.isPromotion) : false,
            promo_label: pData.promoLabel ?? pData.promo_label ?? null,
            reference_price: pData.referencePrice !== undefined && pData.referencePrice !== '' && pData.referencePrice !== null ? Number(pData.referencePrice) : null,
            promo_price: pData.promoPrice !== undefined && pData.promoPrice !== '' && pData.promoPrice !== null ? Number(pData.promoPrice) : null,
            image_url: pData.imageUrl ?? pData.image_url ?? null,
            description: pData.description ?? null,
            usage_indications: pData.usageIndications ?? pData.usage_indications ?? null,
            created_at: now,
            updated_at: now,
        };

        const { data, error } = await supabaseAdmin
            .from('pharmacy_products')
            .insert([insertPayload])
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const camelProd = toCamel(data);
        return NextResponse.json({
            ...camelProd,
            success: true,
            product: camelProd,
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}

// PATCH /api/pharmacy/products - Modificar producto (nombre, disponibilidad, cantidad SUMA, indicaciones, promoción, imagen WebP, etc.)
export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();
        const id = body.id;

        if (!id) {
            return NextResponse.json({ error: 'ID del producto requerido' }, { status: 400 });
        }

        const updates: Record<string, any> = {
            updated_at: new Date().toISOString(),
        };

        if (body.name !== undefined) updates.name = String(body.name).trim();
        if (body.genericName !== undefined) updates.generic_name = body.genericName;
        if (body.generic_name !== undefined) updates.generic_name = body.generic_name;
        if (body.presentation !== undefined) updates.presentation = body.presentation;
        if (body.category !== undefined) updates.category = body.category;
        if (body.isAvailable !== undefined) updates.is_available = Boolean(body.isAvailable);
        if (body.is_available !== undefined) updates.is_available = Boolean(body.is_available);

        const rawStock = body.stockQuantity !== undefined ? body.stockQuantity : body.stock_quantity;
        if (rawStock !== undefined) {
            const stockQty = rawStock === '' || rawStock === null ? null : Math.max(0, Math.floor(Number(rawStock)));
            updates.stock_quantity = stockQty;
            // Si la cantidad dispuesta para SUMA llega a 0, el sistema marca automáticamente como no disponible; si es > 0 y no se desactivó explícitamente, disponible
            if (stockQty !== null) {
                if (stockQty <= 0) {
                    updates.is_available = false;
                } else if (body.isAvailable === undefined && body.is_available === undefined) {
                    updates.is_available = true;
                }
            }
        }

        if (body.isPromotion !== undefined) updates.is_promotion = Boolean(body.isPromotion);
        if (body.is_promotion !== undefined) updates.is_promotion = Boolean(body.is_promotion);
        if (body.promoLabel !== undefined) updates.promo_label = body.promoLabel;
        if (body.promo_label !== undefined) updates.promo_label = body.promo_label;
        if (body.referencePrice !== undefined) {
            updates.reference_price = body.referencePrice === '' || body.referencePrice === null ? null : Number(body.referencePrice);
        }
        if (body.promoPrice !== undefined) {
            updates.promo_price = body.promoPrice === '' || body.promoPrice === null ? null : Number(body.promoPrice);
        }
        if (body.imageUrl !== undefined) updates.image_url = body.imageUrl;
        if (body.image_url !== undefined) updates.image_url = body.image_url;
        if (body.description !== undefined) updates.description = body.description;
        if (body.usageIndications !== undefined) updates.usage_indications = body.usageIndications;
        if (body.usage_indications !== undefined) updates.usage_indications = body.usage_indications;

        const { data, error } = await supabaseAdmin
            .from('pharmacy_products')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const camelProd = toCamel(data);
        return NextResponse.json({
            ...camelProd,
            success: true,
            product: camelProd,
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}

// DELETE /api/pharmacy/products?id=... o ?pharmacyId=...&clearAll=true
export async function DELETE(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');
        const pharmacyId = searchParams.get('pharmacyId');
        const clearAll = searchParams.get('clearAll') === 'true';

        if (clearAll && pharmacyId) {
            const { error } = await supabaseAdmin
                .from('pharmacy_products')
                .delete()
                .eq('pharmacy_id', pharmacyId);
            if (error) return NextResponse.json({ error: error.message }, { status: 500 });
            return NextResponse.json({ success: true });
        }

        if (!id) {
            return NextResponse.json({ error: 'ID de producto requerido' }, { status: 400 });
        }

        const { error } = await supabaseAdmin
            .from('pharmacy_products')
            .delete()
            .eq('id', id);

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (err: any) {
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
