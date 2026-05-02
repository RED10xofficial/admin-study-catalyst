export interface ApiError {
  field?: string;
  message: string;
  code: string;
}

export interface PaginationMeta {
  page: number;
  per_page: number;
  total_pages: number;
  total_items: number;
}

export interface ApiResponse<T = null> {
  status: 'success' | 'error';
  code: number;
  message: string;
  data: T | null;
  errors: ApiError[] | null;
  meta: PaginationMeta | null;
  links: null;
}
