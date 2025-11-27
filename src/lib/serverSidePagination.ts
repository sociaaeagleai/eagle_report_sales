import { supabase } from "@/integrations/supabase/client";

export interface PaginationParams {
  currentPage: number;
  pageSize: number;
  filters?: any;
}

export interface TotalsData {
  total_count: number;
  calls_dialled: number;
  calls_taken: number;
  rapport_built: number;
  touched_base: number;
  calls_not_taken: number;
  others: number;
  disqualified: number;
  followed_up: number;
  sm_rp: number;
  sm_enrolled: number;
  sm_rp_to_enrolled: number;
  fu_rp: number;
  fu_enrolled: number;
  fu_rp_to_enrolled: number;
}

export async function fetchSubmissionTotals(
  filterUserIds?: string[],
  filterStartDate?: string,
  filterEndDate?: string,
  filterSubSource?: string,
  selectedIds?: string[]
): Promise<TotalsData | null> {
  try {
    const { data, error } = await supabase.rpc('get_submission_totals', {
      filter_user_ids: filterUserIds && filterUserIds.length > 0 ? filterUserIds : null,
      filter_start_date: filterStartDate || null,
      filter_end_date: filterEndDate || null,
      filter_sub_source: filterSubSource || null,
      selected_ids: selectedIds && selectedIds.length > 0 ? selectedIds : null,
    });

    if (error) {
      console.error("Error fetching totals:", error);
      return null;
    }

    return data && data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error("Error in fetchSubmissionTotals:", error);
    return null;
  }
}
