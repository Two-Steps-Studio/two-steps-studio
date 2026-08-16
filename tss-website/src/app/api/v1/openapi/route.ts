import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * GET /api/v1/openapi
 * Return OpenAPI specification
 */
export async function GET() {
  try {
    const filePath = join(process.cwd(), "src/app/api/v1/openapi/openapi.json");
    const fileContents = await readFile(filePath, "utf-8");
    const openapiSpec = JSON.parse(fileContents);
    
    return NextResponse.json(openapiSpec, {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Failed to load OpenAPI spec:", error);
    return NextResponse.json(
      { error: "Failed to load OpenAPI specification" },
      { status: 500 }
    );
  }
}
