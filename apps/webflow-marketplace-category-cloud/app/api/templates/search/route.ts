import { NextResponse } from 'next/server';
import { parseCategoryQuery, searchTemplates } from '../../../../lib/template-search';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const categorySlug = url.searchParams.get('category_group_slug')?.trim();

  if (!categorySlug) {
    return NextResponse.json({ error: 'category_group_slug is required.' }, { status: 400 });
  }

  try {
    const searchParams: Record<string, string | string[] | undefined> = {};
    for (const [key, value] of url.searchParams.entries()) {
      const existing = searchParams[key];
      if (Array.isArray(existing)) {
        existing.push(value);
      } else if (existing) {
        searchParams[key] = [existing, value];
      } else {
        searchParams[key] = value;
      }
    }

    return NextResponse.json(await searchTemplates(categorySlug, parseCategoryQuery(searchParams)));
  } catch (error) {
    return NextResponse.json(
      { error: 'Template search proxy failed.', details: error instanceof Error ? error.message : String(error) },
      { status: 502 },
    );
  }
}
