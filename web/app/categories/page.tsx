import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/auth";
import { getCategories } from "@/lib/actions/categories";
import AppLayout from "@/components/layout/AppLayout";
import PageHeader from "@/components/layout/PageHeader";
import CategoriesClient from "../../components/categories/CategoryManager";

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Check authentication
  const user = await getServerUser();
  if (!user) {
    redirect("/login");
  }

  // Await searchParams FIRST before using any of its properties
  const params = await searchParams;

  // Now safely use params instead of searchParams
  const page = Number(params.page) || 1;
  const limit = Number(params.limit) || 50; // Higher limit for categories
  const category_type = params.category_type as string;
  const is_system_category = params.is_system_category
    ? params.is_system_category === "true"
    : undefined;
  const is_active = params.is_active ? params.is_active === "true" : undefined;
  const search = params.search as string;

  // Fetch categories data
  const categoriesResponse = await getCategories({
    page,
    limit,
    category_type,
    is_system_category,
    is_active,
    search,
  });

  // Transform CategoriesResponse to CategoriesData format
  const categoriesData = {
    categories: categoriesResponse.data,
    total: categoriesResponse.total,
    page: categoriesResponse.page,
    limit: categoriesResponse.limit,
    pages: categoriesResponse.pages,
  };

  return (
    <AppLayout>
      {/* Page Header */}
      <PageHeader
        title="Categories"
        subtitle="Manage transaction categories and auto-categorization rules"
      />

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <CategoriesClient initialData={categoriesData} user={user} />
      </div>
    </AppLayout>
  );
}
