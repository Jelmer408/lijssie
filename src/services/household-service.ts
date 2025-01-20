import { supabase } from '@/lib/supabase';
import { nanoid } from 'nanoid';

export interface Household {
  id: string;
  name: string;
  invite_code: string;
  created_at: string;
  created_by: string;
}

export interface HouseholdMember {
  id: string;
  household_id: string;
  user_id: string;
  role: 'admin' | 'member';
  user_name?: string;
  user_avatar?: string;
}

export const householdService = {
  async createHousehold(name: string): Promise<Household> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !user.email) throw new Error('No user found');

    const invite_code = nanoid(8);

    try {
      const { data: household, error: householdError } = await supabase
        .from('households')
        .insert({
          name,
          invite_code,
          created_by: user.id
        })
        .select()
        .single();

      if (householdError) {
        console.error('Error creating household:', householdError);
        throw new Error(householdError.message);
      }

      if (!household) {
        throw new Error('No household returned after creation');
      }

      const { error: memberError } = await supabase
        .from('household_members')
        .insert({
          household_id: household.id,
          user_id: user.id,
          role: 'admin',
          email: user.email,
          user_name: user.user_metadata?.full_name || user.email
        });

      if (memberError) {
        await supabase
          .from('households')
          .delete()
          .eq('id', household.id);
        
        console.error('Error creating household membership:', memberError);
        throw new Error(memberError.message);
      }

      return household;
    } catch (error) {
      console.error('Error in createHousehold:', error);
      throw error;
    }
  },

  async subscribeToHouseholdChanges(callback: () => void) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return () => {};

    // Subscribe to changes in household_members table
    const householdSubscription = supabase
      .channel('household-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'household_members',
          filter: `user_id=eq.${user.id}`
        },
        () => callback()
      )
      .subscribe();

    // Return cleanup function
    return () => {
      householdSubscription.unsubscribe();
    };
  },

  async getCurrentHousehold() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    try {
      // First get the household member entry for the current user
      const { data: memberData, error: memberError } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', user.id)
        .single();

      if (memberError) {
        console.error('Error fetching member data:', memberError);
        return null;
      }

      if (!memberData) {
        return null;
      }

      // Then get the household details
      const { data: household, error: householdError } = await supabase
        .from('households')
        .select()
        .eq('id', memberData.household_id)
        .single();

      if (householdError) {
        console.error('Error fetching household:', householdError);
        return null;
      }

      // Get all members of the household
      const { data: members, error: membersError } = await supabase
        .from('household_members')
        .select('*')
        .eq('household_id', household.id);

      if (membersError) {
        console.error('Error fetching members:', membersError);
        return null;
      }

      return {
        household,
        members: members.map(member => ({
          ...member,
          user_name: member.user_name || member.email
        }))
      };
    } catch (error) {
      console.error('Error in getCurrentHousehold:', error);
      return null;
    }
  },

  async joinHousehold(inviteCode: string): Promise<Household> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !user.email) throw new Error('No user found');

    try {
      // Find the household with the invite code
      const { data: household, error: householdError } = await supabase
        .from('households')
        .select()
        .eq('invite_code', inviteCode)
        .single();

      if (householdError || !household) {
        throw new Error('Ongeldige uitnodigingscode');
      }

      // Check if user is already a member
      const { data: existingMember } = await supabase
        .from('household_members')
        .select()
        .eq('household_id', household.id)
        .eq('user_id', user.id)
        .single();

      if (existingMember) {
        throw new Error('Je bent al lid van dit huishouden');
      }

      // Add user as a member
      const { error: memberError } = await supabase
        .from('household_members')
        .insert({
          household_id: household.id,
          user_id: user.id,
          role: 'member',
          email: user.email,
          user_name: user.user_metadata?.full_name || user.email
        });

      if (memberError) {
        throw new Error('Kon niet joinen tot het huishouden');
      }

      return household;
    } catch (error) {
      console.error('Error in joinHousehold:', error);
      throw error;
    }
  }
}; 