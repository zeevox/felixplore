// src/routes/search/+page.server.ts
import { ARTICLES_PER_PAGE } from "$lib/config";
import { searchArticles, SortOrder } from "$lib/server/search";
import type { Article } from "$lib/types/article";
import { isRedirect, redirect, error as SvelteKitError } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";

const MIN_YEAR = 1949;
const MAX_YEAR = 2025;

interface SearchPageData {
  articles: Promise<Article[]>;
  searchQuery: string;
  currentPage: number;
  sortOrder: SortOrder;
  startYear?: string; // YYYY format or empty string
  endYear?: string; // YYYY format or empty string
}

function validateYearParam(yearStr: string | null | undefined): string | undefined {
  if (!yearStr || yearStr.trim() === "") {
    return ""; // Return empty string for "Any" or missing
  }
  const yearNum = parseInt(yearStr, 10);
  if (isNaN(yearNum) || yearNum < MIN_YEAR || yearNum > MAX_YEAR) {
    // For simplicity, treat invalid year params as "Any" for now
    // A production app might redirect to a cleaned URL or throw an error
    return "";
  }
  return yearStr.trim();
}

export const load: PageServerLoad<SearchPageData> = async ({ url, depends }) => {
  depends("app:search:query:" + url.searchParams.get("query"));
  depends("app:search:page:" + url.searchParams.get("page"));
  depends("app:search:sort:" + url.searchParams.get("sort"));
  depends("app:search:startYear:" + url.searchParams.get("startYear"));
  depends("app:search:endYear:" + url.searchParams.get("endYear"));

  const currentPageParam = url.searchParams.get("page") || "1";
  const currentPage = Number(currentPageParam);
  const searchQuery = (url.searchParams.get("query") || "").trim();
  const sortOrderParam = url.searchParams.get("sort") as string | null;

  const currentStartYear = validateYearParam(url.searchParams.get("startYear"));
  const currentEndYear = validateYearParam(url.searchParams.get("endYear"));

  const isValidSortOrder = (value: string | null): value is SortOrder => {
    return value !== null && Object.values(SortOrder).includes(value as SortOrder);
  };

  const currentSortOrder = isValidSortOrder(sortOrderParam) ? sortOrderParam : SortOrder.Hybrid;

  if (!searchQuery) {
    redirect(307, "/");
  }

  if (!Number.isInteger(currentPage) || currentPage < 1) {
    const newParams = new URLSearchParams(url.searchParams);
    newParams.set("query", searchQuery);
    newParams.set("page", "1");
    newParams.set("sort", currentSortOrder);
    if (currentStartYear) newParams.set("startYear", currentStartYear);
    else newParams.delete("startYear");
    if (currentEndYear) newParams.set("endYear", currentEndYear);
    else newParams.delete("endYear");
    redirect(307, `/search?${newParams.toString()}`);
  }

  const startDateISO = currentStartYear ? `${currentStartYear}-01-01` : undefined;
  const endDateISO = currentEndYear ? `${currentEndYear}-12-31` : undefined;

  const articlesPromise = (async (): Promise<Article[]> => {
    try {
      const articlesData = await searchArticles({
        searchQuery,
        currentPage,
        sortOrder: currentSortOrder,
        articlesPerPage: ARTICLES_PER_PAGE,
        startDate: startDateISO,
        endDate: endDateISO,
      });

      if (articlesData.length === 0 && currentPage > 1) {
        const newParams = new URLSearchParams(url.searchParams);
        newParams.set("query", searchQuery);
        newParams.set("page", "1");
        newParams.set("sort", currentSortOrder);
        if (currentStartYear) newParams.set("startYear", currentStartYear);
        else newParams.delete("startYear");
        if (currentEndYear) newParams.set("endYear", currentEndYear);
        else newParams.delete("endYear");
        redirect(307, `/search?${newParams.toString()}`);
      }
      return articlesData;
    } catch (err) {
      if (isRedirect(err) || (err && typeof err === "object" && "status" in err && "body" in err)) {
        throw err;
      }
      console.error("Unexpected error during articlesPromise execution:", err);
      SvelteKitError(500, "An internal error occurred while preparing articles. Please try again.");
    }
  })();

  try {
    return {
      articles: articlesPromise,
      searchQuery,
      currentPage,
      sortOrder: currentSortOrder,
      startYear: currentStartYear,
      endYear: currentEndYear,
    };
  } catch (err: unknown) {
    if (isRedirect(err)) {
      throw err;
    }
    if (err && typeof err === "object" && "status" in err && "body" in err) {
      // HttpError
      throw err;
    }
    console.error("Unexpected error in search load function structure:", err);
    SvelteKitError(500, "Could not process search request due to a server configuration issue.");
  }
};

export const actions: Actions = {
  default: async ({ request }) => {
    const data = await request.formData();
    const query = ((data.get("searchQuery") as string) || "").trim();
    const submittedSortOrder = data.get("sortOrder") as string | null;
    const submittedStartYear = data.get("startYear") as string | null;
    const submittedEndYear = data.get("endYear") as string | null;

    if (!query) {
      redirect(303, `/`);
    }

    const isValidSortOrder = (value: string | null): value is SortOrder => {
      return value !== null && Object.values(SortOrder).includes(value as SortOrder);
    };
    const sortToUse = isValidSortOrder(submittedSortOrder) ? submittedSortOrder : SortOrder.Hybrid;

    const params = new URLSearchParams();
    params.set("query", query);
    params.set("page", "1");
    params.set("sort", sortToUse);

    if (submittedStartYear) params.set("startYear", submittedStartYear);
    if (submittedEndYear) params.set("endYear", submittedEndYear);

    redirect(303, `/search?${params.toString()}`);
  },
};
