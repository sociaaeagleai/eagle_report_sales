import { supabase } from "@/integrations/supabase/client";

interface UserData {
  name: string;
  email: string;
  password: string;
  mode: 'AI' | 'DM';
}

export const bulkCreateUsers = async () => {
  const users: UserData[] = [
    // AI Team
    { name: 'Pradeep Kumar', email: 'pradeep@socialeagle.in', password: 'pradeep011', mode: 'AI' },
    { name: 'Madhavan S', email: 'madhavan@socialeagle.ai', password: 'madhavan012', mode: 'AI' },
    { name: 'Akshay Kishore', email: 'allrounder@socialeagle.in', password: 'allrounder013', mode: 'AI' },
    { name: 'Shalini Priya', email: 'shalinipriya@socialeagle.ai', password: 'shalinipriya014', mode: 'AI' },
    { name: 'Sri Hari Raj M', email: 'interact@socialeagle.ai', password: 'interact015', mode: 'AI' },
    { name: 'Isak Daniel', email: 'support@socialeagle.ai', password: 'support016', mode: 'AI' },
    
    // DM Team
    { name: 'Ramkumar B', email: 'ramkumar@socialeagle.in', password: 'ramkumar011', mode: 'DM' },
    { name: 'Indhumathi S', email: 'indhumathi@socialeagle.in', password: 'indhumathi012', mode: 'DM' },
    { name: 'Dhayanithi SK', email: 'dhayanithi@socialeagle.in', password: 'dhayanithi013', mode: 'DM' },
    { name: 'Sabarinathan B', email: 'elevate@socialeagle.in', password: 'sabari014', mode: 'DM' },
    { name: 'Surya B', email: 'courage@socialeagle.in', password: 'surya015', mode: 'DM' },
    { name: 'Anbarasan VN', email: 'sales2@socialeagle.in', password: 'anbarasan016', mode: 'DM' },
    { name: 'Swarna Prasad', email: 'swarnaprasad@socialeagle.in', password: 'swarnaprasad017', mode: 'DM' },
  ];

  try {
    const { data, error } = await supabase.functions.invoke('create-bulk-users', {
      body: { users },
    });

    if (error) {
      console.error('Error creating users:', error);
      throw error;
    }

    console.log('Bulk user creation result:', data);
    return data;
  } catch (error) {
    console.error('Failed to create users:', error);
    throw error;
  }
};
