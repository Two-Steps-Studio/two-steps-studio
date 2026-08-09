import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-helpers";
import { revokeApiKey, deleteApiKey } from "@/lib/api-auth";
import { apiSuccess, apiBadRequest, apiUnauthorized, apiNotFound, apiInternalError } from "@/lib/api-response";

/**
 * DELETE /api/user/api-keys/[id]
 * Revoke or delete an API key
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth();
  
  if (auth instanceof NextResponse) {
    return auth;
  }

  const keyId = params.id;

  // Validate key ID
  if (!keyId || isNaN(parseInt(keyId))) {
    return apiBadRequest("Invalid API key ID");
  }

  const { searchParams } = new URL(request.url);
  const permanent = searchParams.get("permanent") === "true";

  try {
    if (permanent) {
      // Permanently delete the API key
      const result = await deleteApiKey(auth.user.id, keyId);
      
      if (result instanceof NextResponse) {
        return result;
      }

      return apiSuccess({ message: "API key deleted permanently" });
    } else {
      // Revoke the API key (soft delete)
      const result = await revokeApiKey(auth.user.id, keyId);
      
      if (result instanceof NextResponse) {
        return result;
      }

      return apiSuccess({ message: "API key revoked" });
    }

  } catch (error) {
    return apiInternalError(error instanceof Error ? error.message : "Failed to revoke/delete API key");
  }
}
