import { NextRequest, NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { z } from 'zod';

const requestSchema = z.object({
  email: z.string().email('Podaj poprawny adres email'),
  // `action` used to be inferred from `email === 'unsubscribe'`, which the
  // email() validation above always rejected first ('unsubscribe' isn't a
  // valid email) - the whole unsubscribe branch was unreachable dead code,
  // so no request could ever actually remove a subscription.
  action: z.enum(['subscribe', 'unsubscribe']).optional().default('subscribe'),
});

export async function POST(req: NextRequest) {
  // Check if Supabase is configured
  if (!isSupabaseConfigured || !supabase) {
    return NextResponse.json({
      error: 'Newsletter subscription is disabled - contact administrator'
    }, { status: 503 });
  }

  try {
    const body = await req.json();
    const { email, action } = requestSchema.parse(body);

    if (action === 'unsubscribe') {
      const { error: unsubsError } = await supabase
        .from('newsletter_subs')
        .delete()
        .eq('email', email);

      if (unsubsError) {
        console.error('Unsubscribe error:', unsubsError);
      }

      return NextResponse.json({
        message: 'Unsubscribed successfully'
      }, { status: 200 });
    }

    const { data, error } = await supabase
      .from('newsletter_subs')
      .insert([{ email }]);

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ message: 'Already subscribed' }, { status: 200 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: 'Subscribed successfully' }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
