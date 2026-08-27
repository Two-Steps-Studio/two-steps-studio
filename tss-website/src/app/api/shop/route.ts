import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const querySchema = z.object({
  category: z.enum(['frame', 'nick_color', 'background']).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const params = querySchema.parse({
      category: searchParams.get('category') || undefined,
    });

    const supabase = await createClient();

    // Check authentication
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized. Please login to view shop.' },
        { status: 401 }
      );
    }

    // Real catalog (shop_items table, added in
    // db/migrations/add-shop-inventory-achievements.sql) instead of the
    // previous hardcoded mock array.
    let query = supabase
      .from('shop_items')
      .select('id, category, name, description, price, value')
      .eq('active', true)
      .order('category')
      .order('price');

    if (params.category) {
      query = query.eq('category', params.category);
    }

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(data || []);
  } catch (err: any) {
    console.error('Shop API error:', err);
    return NextResponse.json([], { status: 500 });
  }
}
