import { NextResponse } from 'next/server';
import { createServiceClient, createClient } from '@/lib/supabase-server';
import { requireAuth, requireAdmin, isAuthError } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

export async function GET() {
  // This is a storage diagnostics endpoint -- it reports whether the
  // service-role key works, lists every bucket (name/public flag), and
  // probes bucket name variants. None of that had an auth check, so it was
  // reachable by anyone who found the URL. Gate it like the other internal
  // debug/admin tooling.
  const auth = await requireAuth();
  if (isAuthError(auth)) return auth;
  const adminCheck = requireAdmin(auth);
  if (adminCheck) return adminCheck;

  const results: any = {
    env: {
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      urlPrefix: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 20) + '...',
    },
    buckets: [],
    error: null,
    serviceRoleTest: null,
    anonRoleTest: null
  };

  // Test with service role client
  try {
    const serviceClient = createServiceClient();
    const { data: serviceBuckets, error: serviceError } = await serviceClient.storage.listBuckets();
    
    results.serviceRoleTest = {
      success: !serviceError,
      error: serviceError?.message,
      bucketCount: serviceBuckets?.length || 0,
      buckets: serviceBuckets?.map(b => ({ id: b.id, name: b.name, public: b.public })) || []
    };
  } catch (e: any) {
    results.serviceRoleTest = {
      success: false,
      error: e.message
    };
  }

  // Test with regular anon client
  try {
    const anonClient = await createClient();
    const { data: anonBuckets, error: anonError } = await anonClient.storage.listBuckets();
    
    results.anonRoleTest = {
      success: !anonError,
      error: anonError?.message,
      bucketCount: anonBuckets?.length || 0,
      buckets: anonBuckets?.map(b => ({ id: b.id, name: b.name, public: b.public })) || []
    };
  } catch (e: any) {
    results.anonRoleTest = {
      success: false,
      error: e.message
    };
  }

  // Use whichever client works for detailed bucket info
  try {
    const client = results.serviceRoleTest?.success ? createServiceClient() : await createClient();

    // List all buckets
    const { data: buckets, error: listError } = await client.storage.listBuckets();
    
    if (listError) {
      results.error = `Failed to list buckets: ${listError.message}`;
      results.listErrorDetails = listError;
    } else {
      results.buckets=buckets?.map(b => ({
        id: b.id,
        name: b.name,
        public: b.public,
      })) || [];
      results.bucketCount = buckets?.length || 0;
    }

    // Try to access dev-files specifically
    const { data: bucket, error: bucketError } = await client.storage.getBucket('dev-files');
    
    if (bucketError) {
      results.devFilesError = bucketError.message;
      
      // Try alternative names
      const alternatives = ['dev_files', 'DevFiles', 'devfiles', 'dev-files-bucket'];
      for (const altName of alternatives) {
        try {
          const { data: altBucket, error: altError } = await client.storage.getBucket(altName);
          if (!altError && altBucket) {
            results.alternativeBucketFound = altName;
            results.alternativeBucket = altBucket;
            break;
          }
        } catch (e) {
          // Continue trying other names
        }
      }
    } else {
      results.devFiles = {
        id: bucket.id,
        name: bucket.name,
        public: bucket.public,
        file_size_limit: bucket.file_size_limit,
        allowed_mime_types: bucket.allowed_mime_types,
      };
    }

  } catch (error: any) {
    results.error = error.message || 'Unknown error';
  }

  return NextResponse.json(results);
}
