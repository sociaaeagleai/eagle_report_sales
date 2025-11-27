import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Embedded CSV data
const profilesData = [
  { id: "01bc5eb3-7e0f-44e5-9b60-29f5c4c15c5e", name: "Pradeep Kumar", email: "pradeep@socialeagle.in", mode: "AI" },
  { id: "0c97bcae-a798-404a-873d-71f2b8e8e2e0", name: "Madhavan S", email: "madhavan@socialeagle.ai", mode: "AI" },
  { id: "24c6d7fb-e2b4-4ba7-b76c-07e7a75af2a6", name: "Akshay Kishore", email: "allrounder@socialeagle.in", mode: "AI" },
  { id: "31e09371-33ce-4e5d-883e-03db1f40f27e", name: "Shalini Priya", email: "shalinipriya@socialeagle.ai", mode: "AI" },
  { id: "3e0ceb1a-4bca-47c1-8f81-39de4efb14c1", name: "Sri Hari Raj M", email: "interact@socialeagle.ai", mode: "AI" },
  { id: "4ca3c2c2-b2bc-4e32-95eb-9ee2f6bbbfe1", name: "Isak Daniel", email: "support@socialeagle.ai", mode: "AI" },
  { id: "5e07b9da-9a28-4cd9-b1ca-b6a8dacd0f1a", name: "Ramkumar B", email: "ramkumar@socialeagle.in", mode: "DM" },
  { id: "63c15e2b-0cb4-4e66-9c99-99be2c5b4e47", name: "Indhumathi S", email: "indhumathi@socialeagle.in", mode: "DM" },
  { id: "6e28a67f-a789-48b1-b5a1-bc9efebd8d1d", name: "Dhayanithi SK", email: "dhayanithi@socialeagle.in", mode: "DM" },
  { id: "717e76f0-c370-46ce-ae84-0fa90b4d0d7d", name: "Sabarinathan B", email: "elevate@socialeagle.in", mode: "DM" },
  { id: "80a43a67-9b7c-4d0f-bd88-25f1354b6ae4", name: "Surya B", email: "courage@socialeagle.in", mode: "DM" },
  { id: "8e8fb6bc-26b8-48a6-87a5-1ffcd1ef2c69", name: "Anbarasan VN", email: "sales2@socialeagle.in", mode: "DM" },
  { id: "90f9aa85-a093-4ec8-a1bf-87b35db5f25e", name: "Swarna Prasad", email: "swarnaprasad@socialeagle.in", mode: "DM" },
  { id: "a2f11767-3f73-4844-9a62-aef6f0b0ab74", name: "Admin User", email: "admin@salestrack.local", mode: null },
  { id: "a6dd4e75-2a77-4d1c-9c7c-1ac18ab52a3f", name: "Test User 1", email: "test1@salestrack.local", mode: "AI" },
  { id: "b089e098-ce7f-4e97-b53f-e3f7edb6debb", name: "Test User 2", email: "test2@salestrack.local", mode: "DM" },
  { id: "b3d4dcb1-df02-4af5-be74-cf0b3f89dd7e", name: "Test User 3", email: "test3@salestrack.local", mode: "AI" },
  { id: "c1f68c35-89d0-4e12-8a5e-d5b7f1c0e7a9", name: "Test User 4", email: "test4@salestrack.local", mode: "DM" },
  { id: "d7e5b4f2-3c2a-4d8e-9f0a-b6c8e1d9a5f3", name: "Test User 5", email: "test5@salestrack.local", mode: "AI" },
  { id: "e8f6c5d3-4b3b-5e9f-a0b1-c7d9f2e0b6g4", name: "Test User 6", email: "test6@salestrack.local", mode: "DM" },
  { id: "f9g7d6e4-5c4c-6fa0-b1c2-d8eaf3f1c7h5", name: "Test User 7", email: "test7@salestrack.local", mode: "AI" },
  { id: "gah8e7f5-6d5d-7gb1-c2d3-e9fbg4g2d8i6", name: "Test User 8", email: "test8@salestrack.local", mode: "DM" }
];

const userRolesData = [
  { user_id: "a2f11767-3f73-4844-9a62-aef6f0b0ab74", role: "admin" },
  { user_id: "01bc5eb3-7e0f-44e5-9b60-29f5c4c15c5e", role: "employee" },
  { user_id: "0c97bcae-a798-404a-873d-71f2b8e8e2e0", role: "employee" },
  { user_id: "24c6d7fb-e2b4-4ba7-b76c-07e7a75af2a6", role: "employee" },
  { user_id: "31e09371-33ce-4e5d-883e-03db1f40f27e", role: "employee" },
  { user_id: "3e0ceb1a-4bca-47c1-8f81-39de4efb14c1", role: "employee" },
  { user_id: "4ca3c2c2-b2bc-4e32-95eb-9ee2f6bbbfe1", role: "employee" },
  { user_id: "5e07b9da-9a28-4cd9-b1ca-b6a8dacd0f1a", role: "employee" },
  { user_id: "63c15e2b-0cb4-4e66-9c99-99be2c5b4e47", role: "employee" },
  { user_id: "6e28a67f-a789-48b1-b5a1-bc9efebd8d1d", role: "employee" },
  { user_id: "717e76f0-c370-46ce-ae84-0fa90b4d0d7d", role: "employee" },
  { user_id: "80a43a67-9b7c-4d0f-bd88-25f1354b6ae4", role: "employee" },
  { user_id: "8e8fb6bc-26b8-48a6-87a5-1ffcd1ef2c69", role: "employee" },
  { user_id: "90f9aa85-a093-4ec8-a1bf-87b35db5f25e", role: "employee" },
  { user_id: "a6dd4e75-2a77-4d1c-9c7c-1ac18ab52a3f", role: "employee" },
  { user_id: "b089e098-ce7f-4e97-b53f-e3f7edb6debb", role: "employee" },
  { user_id: "b3d4dcb1-df02-4af5-be74-cf0b3f89dd7e", role: "employee" },
  { user_id: "c1f68c35-89d0-4e12-8a5e-d5b7f1c0e7a9", role: "employee" },
  { user_id: "d7e5b4f2-3c2a-4d8e-9f0a-b6c8e1d9a5f3", role: "employee" },
  { user_id: "e8f6c5d3-4b3b-5e9f-a0b1-c7d9f2e0b6g4", role: "employee" },
  { user_id: "f9g7d6e4-5c4c-6fa0-b1c2-d8eaf3f1c7h5", role: "employee" },
  { user_id: "gah8e7f5-6d5d-7gb1-c2d3-e9fbg4g2d8i6", role: "employee" }
];

const submissionsData = [
  { id: "066cd8df-42c7-4a7a-8990-cd01b5e8e2a1", user_id: "6e28a67f-a789-48b1-b5a1-bc9efebd8d1d", date: "2025-11-11", calls_dialled: 20, calls_taken: 15, rapport_built: 10, touched_base: 5, calls_not_taken: 5, others: 0, disqualified: 0, sm_rp: 2, sm_enrolled: 1, sm_rp_to_enrolled: 50, fu_rp: 3, fu_enrolled: 2, fu_rp_to_enrolled: 66.67, is_crm_updated: true, followed_up: 8, task_completion_status: "Completed", batch: "Nov 2025", source: "manual" },
  { id: "0fe0bb28-e9e8-4c8c-b5fb-b24ef4d1a5a5", user_id: "01bc5eb3-7e0f-44e5-9b60-29f5c4c15c5e", date: "2025-11-11", calls_dialled: 25, calls_taken: 20, rapport_built: 15, touched_base: 5, calls_not_taken: 5, others: 0, disqualified: 0, sm_rp: 3, sm_enrolled: 2, sm_rp_to_enrolled: 66.67, fu_rp: 4, fu_enrolled: 3, fu_rp_to_enrolled: 75, is_crm_updated: true, followed_up: 10, task_completion_status: "Completed", batch: "Nov 2025", source: "manual" },
  { id: "14d8fe49-51ea-488e-ba11-fa64a7a9c51f", user_id: "24c6d7fb-e2b4-4ba7-b76c-07e7a75af2a6", date: "2025-11-11", calls_dialled: 22, calls_taken: 18, rapport_built: 12, touched_base: 6, calls_not_taken: 4, others: 0, disqualified: 0, sm_rp: 2, sm_enrolled: 2, sm_rp_to_enrolled: 100, fu_rp: 3, fu_enrolled: 2, fu_rp_to_enrolled: 66.67, is_crm_updated: true, followed_up: 9, task_completion_status: "Completed", batch: "Nov 2025", source: "manual" },
  { id: "1ecb45aa-8fe3-4bc5-bf02-c8dbb52e87d0", user_id: "31e09371-33ce-4e5d-883e-03db1f40f27e", date: "2025-11-12", calls_dialled: 23, calls_taken: 19, rapport_built: 13, touched_base: 6, calls_not_taken: 4, others: 0, disqualified: 0, sm_rp: 3, sm_enrolled: 2, sm_rp_to_enrolled: 66.67, fu_rp: 4, fu_enrolled: 3, fu_rp_to_enrolled: 75, is_crm_updated: true, followed_up: 10, task_completion_status: "Completed", batch: "Nov 2025", source: "manual" },
  { id: "1f5a4c2e-d7b9-4f8a-9e3c-6d1a8b5f7e9c", user_id: "3e0ceb1a-4bca-47c1-8f81-39de4efb14c1", date: "2025-11-12", calls_dialled: 21, calls_taken: 17, rapport_built: 11, touched_base: 6, calls_not_taken: 4, others: 0, disqualified: 0, sm_rp: 2, sm_enrolled: 1, sm_rp_to_enrolled: 50, fu_rp: 3, fu_enrolled: 2, fu_rp_to_enrolled: 66.67, is_crm_updated: true, followed_up: 8, task_completion_status: "Completed", batch: "Nov 2025", source: "manual" },
  { id: "2a8b7d3f-e9c1-4a5b-8f7d-9e2a6c4b8d1f", user_id: "4ca3c2c2-b2bc-4e32-95eb-9ee2f6bbbfe1", date: "2025-11-13", calls_dialled: 24, calls_taken: 20, rapport_built: 14, touched_base: 6, calls_not_taken: 4, others: 0, disqualified: 0, sm_rp: 3, sm_enrolled: 2, sm_rp_to_enrolled: 66.67, fu_rp: 4, fu_enrolled: 3, fu_rp_to_enrolled: 75, is_crm_updated: true, followed_up: 10, task_completion_status: "Completed", batch: "Nov 2025", source: "manual" },
  { id: "2b463a89-8c9f-4a12-a7e0-d5b8c4f3e2a1", user_id: "5e07b9da-9a28-4cd9-b1ca-b6a8dacd0f1a", date: "2025-11-11", calls_dialled: 26, calls_taken: 22, rapport_built: 16, touched_base: 6, calls_not_taken: 4, others: 0, disqualified: 0, sm_rp: 4, sm_enrolled: 3, sm_rp_to_enrolled: 75, fu_rp: 5, fu_enrolled: 4, fu_rp_to_enrolled: 80, is_crm_updated: true, followed_up: 12, task_completion_status: "Completed", batch: "Nov 2025", source: "manual" },
  { id: "3c9d8e4a-f2a3-5b6c-9d8e-a3f5c7d9e2b4", user_id: "63c15e2b-0cb4-4e66-9c99-99be2c5b4e47", date: "2025-11-13", calls_dialled: 23, calls_taken: 19, rapport_built: 13, touched_base: 6, calls_not_taken: 4, others: 0, disqualified: 0, sm_rp: 3, sm_enrolled: 2, sm_rp_to_enrolled: 66.67, fu_rp: 4, fu_enrolled: 3, fu_rp_to_enrolled: 75, is_crm_updated: true, followed_up: 10, task_completion_status: "Completed", batch: "Nov 2025", source: "manual" },
  { id: "3d2e5f8a-b4c6-4a9d-8e7f-b5a3c6d8e1f9", user_id: "6e28a67f-a789-48b1-b5a1-bc9efebd8d1d", date: "2025-11-14", calls_dialled: 22, calls_taken: 18, rapport_built: 12, touched_base: 6, calls_not_taken: 4, others: 0, disqualified: 0, sm_rp: 2, sm_enrolled: 2, sm_rp_to_enrolled: 100, fu_rp: 3, fu_enrolled: 2, fu_rp_to_enrolled: 66.67, is_crm_updated: true, followed_up: 9, task_completion_status: "Completed", batch: "Nov 2025", source: "manual" },
  { id: "4e5f7g9b-c6d8-5bae-9f8g-c7d9e2f3a4h1", user_id: "717e76f0-c370-46ce-ae84-0fa90b4d0d7d", date: "2025-11-14", calls_dialled: 25, calls_taken: 21, rapport_built: 15, touched_base: 6, calls_not_taken: 4, others: 0, disqualified: 0, sm_rp: 3, sm_enrolled: 3, sm_rp_to_enrolled: 100, fu_rp: 4, fu_enrolled: 4, fu_rp_to_enrolled: 100, is_crm_updated: true, followed_up: 11, task_completion_status: "Completed", batch: "Nov 2025", source: "manual" },
  { id: "5f6g8h0c-d7e9-6cbf-a0g9-d8eaf4g5b6i2", user_id: "80a43a67-9b7c-4d0f-bd88-25f1354b6ae4", date: "2025-11-15", calls_dialled: 24, calls_taken: 20, rapport_built: 14, touched_base: 6, calls_not_taken: 4, others: 0, disqualified: 0, sm_rp: 3, sm_enrolled: 2, sm_rp_to_enrolled: 66.67, fu_rp: 4, fu_enrolled: 3, fu_rp_to_enrolled: 75, is_crm_updated: true, followed_up: 10, task_completion_status: "Completed", batch: "Nov 2025", source: "manual" },
  { id: "6g7h9i1d-e8fa-7dcg-b1ha-e9fbg5h6c7j3", user_id: "8e8fb6bc-26b8-48a6-87a5-1ffcd1ef2c69", date: "2025-11-15", calls_dialled: 23, calls_taken: 19, rapport_built: 13, touched_base: 6, calls_not_taken: 4, others: 0, disqualified: 0, sm_rp: 3, sm_enrolled: 2, sm_rp_to_enrolled: 66.67, fu_rp: 4, fu_enrolled: 3, fu_rp_to_enrolled: 75, is_crm_updated: true, followed_up: 10, task_completion_status: "Completed", batch: "Nov 2025", source: "manual" },
  { id: "7h8i0j2e-f9gb-8edh-c2ib-fahch6i7d8k4", user_id: "90f9aa85-a093-4ec8-a1bf-87b35db5f25e", date: "2025-11-16", calls_dialled: 22, calls_taken: 18, rapport_built: 12, touched_base: 6, calls_not_taken: 4, others: 0, disqualified: 0, sm_rp: 2, sm_enrolled: 2, sm_rp_to_enrolled: 100, fu_rp: 3, fu_enrolled: 2, fu_rp_to_enrolled: 66.67, is_crm_updated: true, followed_up: 9, task_completion_status: "Completed", batch: "Nov 2025", source: "manual" },
  { id: "8i9j1k3f-gahc-9fei-d3jc-gbidi7j8e9l5", user_id: "01bc5eb3-7e0f-44e5-9b60-29f5c4c15c5e", date: "2025-11-16", calls_dialled: 26, calls_taken: 22, rapport_built: 16, touched_base: 6, calls_not_taken: 4, others: 0, disqualified: 0, sm_rp: 4, sm_enrolled: 3, sm_rp_to_enrolled: 75, fu_rp: 5, fu_enrolled: 4, fu_rp_to_enrolled: 80, is_crm_updated: true, followed_up: 12, task_completion_status: "Completed", batch: "Nov 2025", source: "manual" },
  { id: "9j0k2l4g-hbid-agfj-e4kd-hcjej8k9fam6", user_id: "0c97bcae-a798-404a-873d-71f2b8e8e2e0", date: "2025-11-17", calls_dialled: 25, calls_taken: 21, rapport_built: 15, touched_base: 6, calls_not_taken: 4, others: 0, disqualified: 0, sm_rp: 3, sm_enrolled: 3, sm_rp_to_enrolled: 100, fu_rp: 4, fu_enrolled: 4, fu_rp_to_enrolled: 100, is_crm_updated: true, followed_up: 11, task_completion_status: "Completed", batch: "Nov 2025", source: "manual" },
  { id: "ak1l3m5h-icje-bhgk-f5le-idkfk9lbgn7", user_id: "24c6d7fb-e2b4-4ba7-b76c-07e7a75af2a6", date: "2025-11-17", calls_dialled: 24, calls_taken: 20, rapport_built: 14, touched_base: 6, calls_not_taken: 4, others: 0, disqualified: 0, sm_rp: 3, sm_enrolled: 2, sm_rp_to_enrolled: 66.67, fu_rp: 4, fu_enrolled: 3, fu_rp_to_enrolled: 75, is_crm_updated: true, followed_up: 10, task_completion_status: "Completed", batch: "Nov 2025", source: "manual" },
  { id: "b8c2d4f6-a9e1-4c7d-9f5b-e3a7c9d1f5a8", user_id: "31e09371-33ce-4e5d-883e-03db1f40f27e", date: "2025-11-18", calls_dialled: 23, calls_taken: 19, rapport_built: 13, touched_base: 6, calls_not_taken: 4, others: 0, disqualified: 0, sm_rp: 3, sm_enrolled: 2, sm_rp_to_enrolled: 66.67, fu_rp: 4, fu_enrolled: 3, fu_rp_to_enrolled: 75, is_crm_updated: true, followed_up: 10, task_completion_status: "Completed", batch: "Nov 2025", source: "manual" },
  { id: "bk2m4n6i-jdkf-cihl-g6mf-jelgl0mcho8", user_id: "3e0ceb1a-4bca-47c1-8f81-39de4efb14c1", date: "2025-11-18", calls_dialled: 21, calls_taken: 17, rapport_built: 11, touched_base: 6, calls_not_taken: 4, others: 0, disqualified: 0, sm_rp: 2, sm_enrolled: 1, sm_rp_to_enrolled: 50, fu_rp: 3, fu_enrolled: 2, fu_rp_to_enrolled: 66.67, is_crm_updated: true, followed_up: 8, task_completion_status: "Completed", batch: "Nov 2025", source: "manual" },
  { id: "c9d3e5g7-baf2-5d8e-ag6c-f4b8dae2g6b9", user_id: "4ca3c2c2-b2bc-4e32-95eb-9ee2f6bbbfe1", date: "2025-11-19", calls_dialled: 24, calls_taken: 20, rapport_built: 14, touched_base: 6, calls_not_taken: 4, others: 0, disqualified: 0, sm_rp: 3, sm_enrolled: 2, sm_rp_to_enrolled: 66.67, fu_rp: 4, fu_enrolled: 3, fu_rp_to_enrolled: 75, is_crm_updated: true, followed_up: 10, task_completion_status: "Completed", batch: "Nov 2025", source: "manual" },
  { id: "cl3n5o7j-kelg-djim-h7ng-kfmhm1ndip9", user_id: "5e07b9da-9a28-4cd9-b1ca-b6a8dacd0f1a", date: "2025-11-19", calls_dialled: 26, calls_taken: 22, rapport_built: 16, touched_base: 6, calls_not_taken: 4, others: 0, disqualified: 0, sm_rp: 4, sm_enrolled: 3, sm_rp_to_enrolled: 75, fu_rp: 5, fu_enrolled: 4, fu_rp_to_enrolled: 80, is_crm_updated: true, followed_up: 12, task_completion_status: "Completed", batch: "Nov 2025", source: "manual" },
  { id: "dae4f6h8-cbg3-6e9f-bh7d-g5c9ebf3h7ca", user_id: "63c15e2b-0cb4-4e66-9c99-99be2c5b4e47", date: "2025-11-20", calls_dialled: 23, calls_taken: 19, rapport_built: 13, touched_base: 6, calls_not_taken: 4, others: 0, disqualified: 0, sm_rp: 3, sm_enrolled: 2, sm_rp_to_enrolled: 66.67, fu_rp: 4, fu_enrolled: 3, fu_rp_to_enrolled: 75, is_crm_updated: true, followed_up: 10, task_completion_status: "Completed", batch: "Nov 2025", source: "manual" },
  { id: "dm4o6p8k-lfmh-ekjn-i8oh-lgnjn2oejqa", user_id: "6e28a67f-a789-48b1-b5a1-bc9efebd8d1d", date: "2025-11-20", calls_dialled: 22, calls_taken: 18, rapport_built: 12, touched_base: 6, calls_not_taken: 4, others: 0, disqualified: 0, sm_rp: 2, sm_enrolled: 2, sm_rp_to_enrolled: 100, fu_rp: 3, fu_enrolled: 2, fu_rp_to_enrolled: 66.67, is_crm_updated: true, followed_up: 9, task_completion_status: "Completed", batch: "Nov 2025", source: "manual" },
  { id: "ebf5g7i9-dch4-7fag-ci8e-h6dafc4g8i8db", user_id: "717e76f0-c370-46ce-ae84-0fa90b4d0d7d", date: "2025-11-21", calls_dialled: 25, calls_taken: 21, rapport_built: 15, touched_base: 6, calls_not_taken: 4, others: 0, disqualified: 0, sm_rp: 3, sm_enrolled: 3, sm_rp_to_enrolled: 100, fu_rp: 4, fu_enrolled: 4, fu_rp_to_enrolled: 100, is_crm_updated: true, followed_up: 11, task_completion_status: "Completed", batch: "Nov 2025", source: "manual" },
  { id: "en5p7q9l-mgni-flko-j9pi-mhoko3pfkrb", user_id: "80a43a67-9b7c-4d0f-bd88-25f1354b6ae4", date: "2025-11-21", calls_dialled: 24, calls_taken: 20, rapport_built: 14, touched_base: 6, calls_not_taken: 4, others: 0, disqualified: 0, sm_rp: 3, sm_enrolled: 2, sm_rp_to_enrolled: 66.67, fu_rp: 4, fu_enrolled: 3, fu_rp_to_enrolled: 75, is_crm_updated: true, followed_up: 10, task_completion_status: "Completed", batch: "Nov 2025", source: "manual" },
  { id: "fcg6h8j0-edi5-8gbh-dj9f-i7ebgd5h9j9ec", user_id: "8e8fb6bc-26b8-48a6-87a5-1ffcd1ef2c69", date: "2025-11-22", calls_dialled: 23, calls_taken: 19, rapport_built: 13, touched_base: 6, calls_not_taken: 4, others: 0, disqualified: 0, sm_rp: 3, sm_enrolled: 2, sm_rp_to_enrolled: 66.67, fu_rp: 4, fu_enrolled: 3, fu_rp_to_enrolled: 75, is_crm_updated: true, followed_up: 10, task_completion_status: "Completed", batch: "Nov 2025", source: "manual" },
  { id: "fo6q8ram-nhoj-gmlp-kaqj-nipkp4qglsc", user_id: "90f9aa85-a093-4ec8-a1bf-87b35db5f25e", date: "2025-11-22", calls_dialled: 22, calls_taken: 18, rapport_built: 12, touched_base: 6, calls_not_taken: 4, others: 0, disqualified: 0, sm_rp: 2, sm_enrolled: 2, sm_rp_to_enrolled: 100, fu_rp: 3, fu_enrolled: 2, fu_rp_to_enrolled: 66.67, is_crm_updated: true, followed_up: 9, task_completion_status: "Completed", batch: "Nov 2025", source: "manual" },
  { id: "gdh7i9k1-fej6-9hci-ek0g-j8fche6i0k0fd", user_id: "01bc5eb3-7e0f-44e5-9b60-29f5c4c15c5e", date: "2025-11-23", calls_dialled: 26, calls_taken: 22, rapport_built: 16, touched_base: 6, calls_not_taken: 4, others: 0, disqualified: 0, sm_rp: 4, sm_enrolled: 3, sm_rp_to_enrolled: 75, fu_rp: 5, fu_enrolled: 4, fu_rp_to_enrolled: 80, is_crm_updated: true, followed_up: 12, task_completion_status: "Completed", batch: "Nov 2025", source: "manual" },
  { id: "gp7r9sbn-oipk-hnmq-lbrk-ojqlq5rhmtd", user_id: "0c97bcae-a798-404a-873d-71f2b8e8e2e0", date: "2025-11-23", calls_dialled: 25, calls_taken: 21, rapport_built: 15, touched_base: 6, calls_not_taken: 4, others: 0, disqualified: 0, sm_rp: 3, sm_enrolled: 3, sm_rp_to_enrolled: 100, fu_rp: 4, fu_enrolled: 4, fu_rp_to_enrolled: 100, is_crm_updated: true, followed_up: 11, task_completion_status: "Completed", batch: "Nov 2025", source: "manual" },
  { id: "hei8ja2k-gfk7-aidj-fl1h-kagdif7ja1lge", user_id: "24c6d7fb-e2b4-4ba7-b76c-07e7a75af2a6", date: "2025-11-24", calls_dialled: 24, calls_taken: 20, rapport_built: 14, touched_base: 6, calls_not_taken: 4, others: 0, disqualified: 0, sm_rp: 3, sm_enrolled: 2, sm_rp_to_enrolled: 66.67, fu_rp: 4, fu_enrolled: 3, fu_rp_to_enrolled: 75, is_crm_updated: true, followed_up: 10, task_completion_status: "Completed", batch: "Nov 2025", source: "manual" },
  { id: "hq8satco-pjql-ionr-mcsl-pksml6sinue", user_id: "31e09371-33ce-4e5d-883e-03db1f40f27e", date: "2025-11-24", calls_dialled: 23, calls_taken: 19, rapport_built: 13, touched_base: 6, calls_not_taken: 4, others: 0, disqualified: 0, sm_rp: 3, sm_enrolled: 2, sm_rp_to_enrolled: 66.67, fu_rp: 4, fu_enrolled: 3, fu_rp_to_enrolled: 75, is_crm_updated: true, followed_up: 10, task_completion_status: "Completed", batch: "Nov 2025", source: "manual" },
  { id: "ifj9kb3l-hgl8-bjek-gm2i-lbhejg8kb2mhf", user_id: "3e0ceb1a-4bca-47c1-8f81-39de4efb14c1", date: "2025-11-25", calls_dialled: 21, calls_taken: 17, rapport_built: 11, touched_base: 6, calls_not_taken: 4, others: 0, disqualified: 0, sm_rp: 2, sm_enrolled: 1, sm_rp_to_enrolled: 50, fu_rp: 3, fu_enrolled: 2, fu_rp_to_enrolled: 66.67, is_crm_updated: true, followed_up: 8, task_completion_status: "Completed", batch: "Nov 2025", source: "manual" },
  { id: "ir9tbudp-qkrm-jpns-ndtm-qltnm7tjovf", user_id: "4ca3c2c2-b2bc-4e32-95eb-9ee2f6bbbfe1", date: "2025-11-25", calls_dialled: 24, calls_taken: 20, rapport_built: 14, touched_base: 6, calls_not_aken: 4, others: 0, disqualified: 0, sm_rp: 3, sm_enrolled: 2, sm_rp_to_enrolled: 66.67, fu_rp: 4, fu_enrolled: 3, fu_rp_to_enrolled: 75, is_crm_updated: true, followed_up: 10, task_completion_status: "Completed", batch: "Nov 2025", source: "manual" }
];

const attendanceData = [
  { user_id: "01bc5eb3-7e0f-44e5-9b60-29f5c4c15c5e", date: "2025-11-11", check_in: "2025-11-11T09:00:00Z", check_out: "2025-11-11T18:00:00Z", status: "present", notes: "Good day", absence_type: null, task_completed: "All tasks done", performance_rating: 5 },
  { user_id: "0c97bcae-a798-404a-873d-71f2b8e8e2e0", date: "2025-11-11", check_in: "2025-11-11T09:15:00Z", check_out: "2025-11-11T18:15:00Z", status: "present", notes: "Productive", absence_type: null, task_completed: "All tasks done", performance_rating: 4 },
  { user_id: "24c6d7fb-e2b4-4ba7-b76c-07e7a75af2a6", date: "2025-11-11", check_in: "2025-11-11T09:05:00Z", check_out: "2025-11-11T18:05:00Z", status: "present", notes: "Excellent performance", absence_type: null, task_completed: "All tasks done", performance_rating: 5 },
  { user_id: "31e09371-33ce-4e5d-883e-03db1f40f27e", date: "2025-11-12", check_in: "2025-11-12T09:00:00Z", check_out: "2025-11-12T18:00:00Z", status: "present", notes: "Great work", absence_type: null, task_completed: "All tasks done", performance_rating: 5 },
  { user_id: "3e0ceb1a-4bca-47c1-8f81-39de4efb14c1", date: "2025-11-12", check_in: "2025-11-12T09:10:00Z", check_out: "2025-11-12T18:10:00Z", status: "present", notes: "Good effort", absence_type: null, task_completed: "Most tasks done", performance_rating: 4 },
  { user_id: "4ca3c2c2-b2bc-4e32-95eb-9ee2f6bbbfe1", date: "2025-11-13", check_in: "2025-11-13T09:00:00Z", check_out: "2025-11-13T18:00:00Z", status: "present", notes: "Very productive", absence_type: null, task_completed: "All tasks done", performance_rating: 5 },
  { user_id: "5e07b9da-9a28-4cd9-b1ca-b6a8dacd0f1a", date: "2025-11-11", check_in: "2025-11-11T09:00:00Z", check_out: "2025-11-11T18:00:00Z", status: "present", notes: "Outstanding", absence_type: null, task_completed: "All tasks done", performance_rating: 5 },
  { user_id: "63c15e2b-0cb4-4e66-9c99-99be2c5b4e47", date: "2025-11-13", check_in: "2025-11-13T09:05:00Z", check_out: "2025-11-13T18:05:00Z", status: "present", notes: "Good performance", absence_type: null, task_completed: "All tasks done", performance_rating: 4 },
  { user_id: "6e28a67f-a789-48b1-b5a1-bc9efebd8d1d", date: "2025-11-11", check_in: "2025-11-11T09:00:00Z", check_out: "2025-11-11T18:00:00Z", status: "present", notes: "Solid work", absence_type: null, task_completed: "All tasks done", performance_rating: 4 },
  { user_id: "6e28a67f-a789-48b1-b5a1-bc9efebd8d1d", date: "2025-11-14", check_in: "2025-11-14T09:00:00Z", check_out: "2025-11-14T18:00:00Z", status: "present", notes: "Good day", absence_type: null, task_completed: "All tasks done", performance_rating: 4 },
  { user_id: "717e76f0-c370-46ce-ae84-0fa90b4d0d7d", date: "2025-11-14", check_in: "2025-11-14T09:00:00Z", check_out: "2025-11-14T18:00:00Z", status: "present", notes: "Perfect execution", absence_type: null, task_completed: "All tasks done", performance_rating: 5 },
  { user_id: "717e76f0-c370-46ce-ae84-0fa90b4d0d7d", date: "2025-11-21", check_in: "2025-11-21T09:00:00Z", check_out: "2025-11-21T18:00:00Z", status: "present", notes: "Excellent", absence_type: null, task_completed: "All tasks done", performance_rating: 5 },
  { user_id: "80a43a67-9b7c-4d0f-bd88-25f1354b6ae4", date: "2025-11-15", check_in: "2025-11-15T09:00:00Z", check_out: "2025-11-15T18:00:00Z", status: "present", notes: "Great effort", absence_type: null, task_completed: "All tasks done", performance_rating: 4 },
  { user_id: "80a43a67-9b7c-4d0f-bd88-25f1354b6ae4", date: "2025-11-21", check_in: "2025-11-21T09:00:00Z", check_out: "2025-11-21T18:00:00Z", status: "present", notes: "Good work", absence_type: null, task_completed: "All tasks done", performance_rating: 4 },
  { user_id: "8e8fb6bc-26b8-48a6-87a5-1ffcd1ef2c69", date: "2025-11-15", check_in: "2025-11-15T09:00:00Z", check_out: "2025-11-15T18:00:00Z", status: "present", notes: "Solid performance", absence_type: null, task_completed: "All tasks done", performance_rating: 4 },
  { user_id: "8e8fb6bc-26b8-48a6-87a5-1ffcd1ef2c69", date: "2025-11-22", check_in: "2025-11-22T09:00:00Z", check_out: "2025-11-22T18:00:00Z", status: "present", notes: "Good effort", absence_type: null, task_completed: "All tasks done", performance_rating: 4 },
  { user_id: "90f9aa85-a093-4ec8-a1bf-87b35db5f25e", date: "2025-11-16", check_in: "2025-11-16T09:00:00Z", check_out: "2025-11-16T18:00:00Z", status: "present", notes: "Excellent", absence_type: null, task_completed: "All tasks done", performance_rating: 5 },
  { user_id: "90f9aa85-a093-4ec8-a1bf-87b35db5f25e", date: "2025-11-22", check_in: "2025-11-22T09:00:00Z", check_out: "2025-11-22T18:00:00Z", status: "present", notes: "Good work", absence_type: null, task_completed: "All tasks done", performance_rating: 4 },
  { user_id: "01bc5eb3-7e0f-44e5-9b60-29f5c4c15c5e", date: "2025-11-16", check_in: "2025-11-16T09:00:00Z", check_out: "2025-11-16T18:00:00Z", status: "present", notes: "Great day", absence_type: null, task_completed: "All tasks done", performance_rating: 5 },
  { user_id: "01bc5eb3-7e0f-44e5-9b60-29f5c4c15c5e", date: "2025-11-23", check_in: "2025-11-23T09:00:00Z", check_out: "2025-11-23T18:00:00Z", status: "present", notes: "Outstanding", absence_type: null, task_completed: "All tasks done", performance_rating: 5 },
  { user_id: "0c97bcae-a798-404a-873d-71f2b8e8e2e0", date: "2025-11-17", check_in: "2025-11-17T09:00:00Z", check_out: "2025-11-17T18:00:00Z", status: "present", notes: "Perfect", absence_type: null, task_completed: "All tasks done", performance_rating: 5 },
  { user_id: "0c97bcae-a798-404a-873d-71f2b8e8e2e0", date: "2025-11-23", check_in: "2025-11-23T09:00:00Z", check_out: "2025-11-23T18:00:00Z", status: "present", notes: "Excellent", absence_type: null, task_completed: "All tasks done", performance_rating: 5 },
  { user_id: "24c6d7fb-e2b4-4ba7-b76c-07e7a75af2a6", date: "2025-11-17", check_in: "2025-11-17T09:00:00Z", check_out: "2025-11-17T18:00:00Z", status: "present", notes: "Great work", absence_type: null, task_completed: "All tasks done", performance_rating: 4 },
  { user_id: "24c6d7fb-e2b4-4ba7-b76c-07e7a75af2a6", date: "2025-11-24", check_in: "2025-11-24T09:00:00Z", check_out: "2025-11-24T18:00:00Z", status: "present", notes: "Good performance", absence_type: null, task_completed: "All tasks done", performance_rating: 4 },
  { user_id: "31e09371-33ce-4e5d-883e-03db1f40f27e", date: "2025-11-18", check_in: "2025-11-18T09:00:00Z", check_out: "2025-11-18T18:00:00Z", status: "present", notes: "Solid effort", absence_type: null, task_completed: "All tasks done", performance_rating: 4 },
  { user_id: "31e09371-33ce-4e5d-883e-03db1f40f27e", date: "2025-11-24", check_in: "2025-11-24T09:00:00Z", check_out: "2025-11-24T18:00:00Z", status: "present", notes: "Good work", absence_type: null, task_completed: "All tasks done", performance_rating: 4 },
  { user_id: "3e0ceb1a-4bca-47c1-8f81-39de4efb14c1", date: "2025-11-18", check_in: "2025-11-18T09:00:00Z", check_out: "2025-11-18T18:00:00Z", status: "present", notes: "Good day", absence_type: null, task_completed: "Most tasks done", performance_rating: 4 }
];

const anomalyResolutionsData = [
  { submission_id: "066cd8df-42c7-4a7a-8990-cd01b5e8e2a1", resolved_by: "a2f11767-3f73-4844-9a62-aef6f0b0ab74", anomaly_field: "calls_taken", anomaly_message: "Value seems low", resolution_note: "Verified, accurate", anomaly_type: "low_value" },
  { submission_id: "0fe0bb28-e9e8-4c8c-b5fb-b24ef4d1a5a5", resolved_by: "a2f11767-3f73-4844-9a62-aef6f0b0ab74", anomaly_field: "rapport_built", anomaly_message: "High ratio", resolution_note: "Confirmed correct", anomaly_type: "high_ratio" },
  { submission_id: "14d8fe49-51ea-488e-ba11-fa64a7a9c51f", resolved_by: "a2f11767-3f73-4844-9a62-aef6f0b0ab74", anomaly_field: "sm_enrolled", anomaly_message: "Perfect conversion", resolution_note: "Outstanding performance", anomaly_type: "perfect_conversion" },
  { submission_id: "1ecb45aa-8fe3-4bc5-bf02-c8dbb52e87d0", resolved_by: "a2f11767-3f73-4844-9a62-aef6f0b0ab74", anomaly_field: "calls_dialled", anomaly_message: "Slightly high", resolution_note: "Extra effort confirmed", anomaly_type: "high_value" },
  { submission_id: "1f5a4c2e-d7b9-4f8a-9e3c-6d1a8b5f7e9c", resolved_by: "a2f11767-3f73-4844-9a62-aef6f0b0ab74", anomaly_field: "sm_rp_to_enrolled", anomaly_message: "Low conversion", resolution_note: "Difficult prospects", anomaly_type: "low_conversion" },
  { submission_id: "2a8b7d3f-e9c1-4a5b-8f7d-9e2a6c4b8d1f", resolved_by: "a2f11767-3f73-4844-9a62-aef6f0b0ab74", anomaly_field: "followed_up", anomaly_message: "High follow-ups", resolution_note: "Good initiative", anomaly_type: "high_value" },
  { submission_id: "2b463a89-8c9f-4a12-a7e0-d5b8c4f3e2a1", resolved_by: "a2f11767-3f73-4844-9a62-aef6f0b0ab74", anomaly_field: "calls_taken", anomaly_message: "Very high", resolution_note: "Verified correct", anomaly_type: "high_value" },
  { submission_id: "3c9d8e4a-f2a3-5b6c-9d8e-a3f5c7d9e2b4", resolved_by: "a2f11767-3f73-4844-9a62-aef6f0b0ab74", anomaly_field: "rapport_built", anomaly_message: "Good ratio", resolution_note: "Confirmed", anomaly_type: "normal" },
  { submission_id: "3d2e5f8a-b4c6-4a9d-8e7f-b5a3c6d8e1f9", resolved_by: "a2f11767-3f73-4844-9a62-aef6f0b0ab74", anomaly_field: "sm_enrolled", anomaly_message: "Perfect conversion", resolution_note: "Excellent work", anomaly_type: "perfect_conversion" },
  { submission_id: "4e5f7g9b-c6d8-5bae-9f8g-c7d9e2f3a4h1", resolved_by: "a2f11767-3f73-4844-9a62-aef6f0b0ab74", anomaly_field: "fu_enrolled", anomaly_message: "Perfect conversion", resolution_note: "Outstanding", anomaly_type: "perfect_conversion" },
  { submission_id: "5f6g8h0c-d7e9-6cbf-a0g9-d8eaf4g5b6i2", resolved_by: "a2f11767-3f73-4844-9a62-aef6f0b0ab74", anomaly_field: "calls_dialled", anomaly_message: "Consistent", resolution_note: "Good work", anomaly_type: "normal" },
  { submission_id: "6g7h9i1d-e8fa-7dcg-b1ha-e9fbg5h6c7j3", resolved_by: "a2f11767-3f73-4844-9a62-aef6f0b0ab74", anomaly_field: "rapport_built", anomaly_message: "Good performance", resolution_note: "Verified", anomaly_type: "normal" },
  { submission_id: "7h8i0j2e-f9gb-8edh-c2ib-fahch6i7d8k4", resolved_by: "a2f11767-3f73-4844-9a62-aef6f0b0ab74", anomaly_field: "sm_enrolled", anomaly_message: "Perfect conversion", resolution_note: "Excellent", anomaly_type: "perfect_conversion" },
  { submission_id: "8i9j1k3f-gahc-9fei-d3jc-gbidi7j8e9l5", resolved_by: "a2f11767-3f73-4844-9a62-aef6f0b0ab74", anomaly_field: "calls_taken", anomaly_message: "Very high", resolution_note: "Confirmed", anomaly_type: "high_value" },
  { submission_id: "9j0k2l4g-hbid-agfj-e4kd-hcjej8k9fam6", resolved_by: "a2f11767-3f73-4844-9a62-aef6f0b0ab74", anomaly_field: "fu_enrolled", anomaly_message: "Perfect conversion", resolution_note: "Great work", anomaly_type: "perfect_conversion" },
  { submission_id: "ak1l3m5h-icje-bhgk-f5le-idkfk9lbgn7", resolved_by: "a2f11767-3f73-4844-9a62-aef6f0b0ab74", anomaly_field: "calls_dialled", anomaly_message: "Good effort", resolution_note: "Verified", anomaly_type: "normal" }
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Starting data import...');

    // Step 1: Create users and build ID mapping
    const userIdMap = new Map<string, string>();
    const results = {
      usersCreated: 0,
      profilesUpdated: 0,
      rolesAssigned: 0,
      submissionsImported: 0,
      attendanceImported: 0,
      anomaliesImported: 0,
      errors: [] as string[],
    };

    // Create all users
    for (const profile of profilesData) {
      try {
        const firstName = profile.name.split(' ')[0].toLowerCase();
        const tempPassword = `${firstName}@temp123`;

        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
          email: profile.email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            name: profile.name,
            mode: profile.mode,
          },
        });

        if (userError) {
          results.errors.push(`User creation failed for ${profile.email}: ${userError.message}`);
          continue;
        }

        if (userData?.user) {
          userIdMap.set(profile.id, userData.user.id);
          results.usersCreated++;
          console.log(`Created user: ${profile.email} (${userData.user.id})`);

          // Update profile
          const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .update({
              name: profile.name,
              mode: profile.mode,
              email: profile.email,
            })
            .eq('id', userData.user.id);

          if (profileError) {
            results.errors.push(`Profile update failed for ${profile.email}: ${profileError.message}`);
          } else {
            results.profilesUpdated++;
          }

          // Assign role
          const roleData = userRolesData.find(r => r.user_id === profile.id);
          if (roleData) {
            // Delete existing role first
            await supabaseAdmin
              .from('user_roles')
              .delete()
              .eq('user_id', userData.user.id);

            const { error: roleError } = await supabaseAdmin
              .from('user_roles')
              .insert({
                user_id: userData.user.id,
                role: roleData.role,
              });

            if (roleError) {
              results.errors.push(`Role assignment failed for ${profile.email}: ${roleError.message}`);
            } else {
              results.rolesAssigned++;
            }
          }
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        results.errors.push(`Exception creating user ${profile.email}: ${errorMsg}`);
      }
    }

    console.log(`Users created: ${results.usersCreated}`);

    // Step 2: Import submissions with JSONB conversion
    const submissionIdMap = new Map<string, string>();

    for (const sub of submissionsData) {
      const newUserId = userIdMap.get(sub.user_id);
      if (!newUserId) {
        results.errors.push(`No user mapping found for submission ${sub.id}`);
        continue;
      }

      try {
        const data = {
          calls_dialled: sub.calls_dialled,
          calls_taken: sub.calls_taken,
          rapport_built: sub.rapport_built,
          touched_base: sub.touched_base,
          calls_not_taken: sub.calls_not_taken,
          others: sub.others,
          disqualified: sub.disqualified,
          sm_rp: sub.sm_rp,
          sm_enrolled: sub.sm_enrolled,
          sm_rp_to_enrolled: sub.sm_rp_to_enrolled,
          fu_rp: sub.fu_rp,
          fu_enrolled: sub.fu_enrolled,
          fu_rp_to_enrolled: sub.fu_rp_to_enrolled,
          is_crm_updated: sub.is_crm_updated,
          followed_up: sub.followed_up,
          task_completion_status: sub.task_completion_status,
        };

        const { data: newSub, error: subError } = await supabaseAdmin
          .from('submissions')
          .insert({
            user_id: newUserId,
            date: sub.date,
            data,
            batch: sub.batch,
            source: sub.source,
          })
          .select()
          .single();

        if (subError) {
          results.errors.push(`Submission import failed for ${sub.id}: ${subError.message}`);
        } else if (newSub) {
          submissionIdMap.set(sub.id, newSub.id);
          results.submissionsImported++;
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        results.errors.push(`Exception importing submission ${sub.id}: ${errorMsg}`);
      }
    }

    console.log(`Submissions imported: ${results.submissionsImported}`);

    // Step 3: Import attendance
    for (const att of attendanceData) {
      const newUserId = userIdMap.get(att.user_id);
      if (!newUserId) {
        results.errors.push(`No user mapping found for attendance: ${att.user_id} on ${att.date}`);
        continue;
      }

      try {
        const { error: attError } = await supabaseAdmin
          .from('attendance')
          .insert({
            user_id: newUserId,
            date: att.date,
            check_in: att.check_in,
            check_out: att.check_out,
            status: att.status,
            notes: att.notes,
            absence_type: att.absence_type,
            task_completed: att.task_completed,
            performance_rating: att.performance_rating,
          });

        if (attError) {
          results.errors.push(`Attendance import failed for ${att.user_id} on ${att.date}: ${attError.message}`);
        } else {
          results.attendanceImported++;
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        results.errors.push(`Exception importing attendance: ${errorMsg}`);
      }
    }

    console.log(`Attendance imported: ${results.attendanceImported}`);

    // Step 4: Import anomaly resolutions
    for (const anomaly of anomalyResolutionsData) {
      const newSubmissionId = submissionIdMap.get(anomaly.submission_id);
      const newResolvedById = userIdMap.get(anomaly.resolved_by);

      if (!newSubmissionId) {
        results.errors.push(`No submission mapping found for anomaly: ${anomaly.submission_id}`);
        continue;
      }

      if (!newResolvedById) {
        results.errors.push(`No user mapping found for resolver: ${anomaly.resolved_by}`);
        continue;
      }

      try {
        const { error: anomalyError } = await supabaseAdmin
          .from('anomaly_resolutions')
          .insert({
            submission_id: newSubmissionId,
            resolved_by: newResolvedById,
            anomaly_field: anomaly.anomaly_field,
            anomaly_message: anomaly.anomaly_message,
            resolution_note: anomaly.resolution_note,
            anomaly_type: anomaly.anomaly_type,
          });

        if (anomalyError) {
          results.errors.push(`Anomaly resolution import failed: ${anomalyError.message}`);
        } else {
          results.anomaliesImported++;
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        results.errors.push(`Exception importing anomaly resolution: ${errorMsg}`);
      }
    }

    console.log(`Anomaly resolutions imported: ${results.anomaliesImported}`);
    console.log('Data import completed!');

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Import error:', error);
    const errorMsg = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: errorMsg }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
