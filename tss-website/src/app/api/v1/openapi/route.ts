import { NextResponse } from "next/server";
import openapiSpec from "./openapi.json";

/**
 * GET /api/v1/openapi
 * Return OpenAPI specification
 */
export async function GET() {
  return NextResponse.json(openapiSpec, {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
