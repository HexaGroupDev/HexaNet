import { formatNewsDate, type NewsArticle } from "@/lib/news/news";
import { createClient } from "@/lib/supabase/server";

type NewsArticleRow = {
  id: string;
  title: string;
  body: string;
  image_url: string | null;
  created_at: string;
};

const DASHBOARD_NEWS_LIMIT = 4;

export async function loadNewsArticles(): Promise<NewsArticle[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("news_articles")
    .select("id, title, body, image_url, created_at")
    .order("created_at", { ascending: false })
    .limit(DASHBOARD_NEWS_LIMIT);

  if (error) {
    console.error("Failed to load news articles:", error.message);
    return [];
  }

  return ((data ?? []) as NewsArticleRow[]).map((row, index) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    createdAt: row.created_at,
    formattedDate: formatNewsDate(row.created_at),
    imageUrl: row.image_url,
    isLatest: index === 0,
  }));
}
