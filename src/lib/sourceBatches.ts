export interface SourceBatch {
  batchId: number;
  batchName: string;
  sources: string[];
}

export const DM_BATCHES: SourceBatch[] = [
  { batchId: 1, batchName: "Batch 1", sources: ["Micro VSL", "VSL"] },
  { batchId: 2, batchName: "Batch 2", sources: ["GDD", "Sha", "Vishnu", "Referral"] },
  { batchId: 3, batchName: "Batch 3", sources: ["Meta Leads", "CTWA"] },
  { batchId: 4, batchName: "Batch 4", sources: ["Direct Call", "Direct Visit", "Direct WhatsApp", "WABA"] },
  { batchId: 5, batchName: "Batch 5", sources: ["Website", "Social Media"] },
  { batchId: 6, batchName: "Batch 6", sources: ["Webinar"] },
];

export const AI_BATCHES: SourceBatch[] = [
  { batchId: 1, batchName: "Batch 1", sources: ["Micro VSL", "VSL"] },
  { batchId: 2, batchName: "Batch 2", sources: ["Manoj", "Thiru", "Sha", "Referral"] },
  { batchId: 3, batchName: "Batch 3", sources: ["Meta Leads", "CTWA"] },
  { batchId: 4, batchName: "Batch 4", sources: ["Direct Call", "Direct Visit", "Direct WhatsApp", "WABA"] },
  { batchId: 5, batchName: "Batch 5", sources: ["Website", "Social Media"] },
  { batchId: 6, batchName: "Batch 6", sources: ["Webinar"] },
];

// Helper function to get batch for a source
export const getBatchForSource = (source: string, userMode: "AI" | "DM"): number | null => {
  const batches = userMode === "DM" ? DM_BATCHES : AI_BATCHES;
  const batch = batches.find(b => b.sources.includes(source));
  return batch ? batch.batchId : null;
};

// Helper function to get all sources in a batch
export const getSourcesInBatch = (batchId: number, userMode: "AI" | "DM"): string[] => {
  const batches = userMode === "DM" ? DM_BATCHES : AI_BATCHES;
  const batch = batches.find(b => b.batchId === batchId);
  return batch ? batch.sources : [];
};

// Get display labels for sources (convert from DB format)
export const getSourceDisplayLabel = (dbValue: string): string => {
  const labelMap: Record<string, string> = {
    'ai': 'AI',
    'micro_vsl': 'Micro VSL',
    'vsl': 'VSL',
    'manoj': 'Manoj',
    'thiru': 'Thiru',
    'website': 'Website',
    'sha': 'Sha',
    'direct_call': 'Direct Call',
    'direct_visit': 'Direct Visit',
    'direct_whatsapp': 'Direct WhatsApp',
    'waba': 'WABA',
    'meta_leads': 'Meta Leads',
    'ctwa': 'CTWA',
    'social_media': 'Social Media',
    'webinar': 'Webinar',
    'referral': 'Referral',
    'gdd': 'GDD',
    'vishnu': 'Vishnu',
  };
  return labelMap[dbValue] || dbValue;
};

// Get DB value from display label
export const getSourceDbValue = (label: string): string => {
  const valueMap: Record<string, string> = {
    'AI': 'ai',
    'Micro VSL': 'micro_vsl',
    'VSL': 'vsl',
    'Manoj': 'manoj',
    'Thiru': 'thiru',
    'Website': 'website',
    'Sha': 'sha',
    'Direct Call': 'direct_call',
    'Direct Visit': 'direct_visit',
    'Direct WhatsApp': 'direct_whatsapp',
    'WABA': 'waba',
    'Meta Leads': 'meta_leads',
    'CTWA': 'ctwa',
    'Social Media': 'social_media',
    'Webinar': 'webinar',
    'Referral': 'referral',
    'GDD': 'gdd',
    'Vishnu': 'vishnu',
  };
  return valueMap[label] || label;
};
