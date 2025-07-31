// 사용자 권한 관리 유틸리티
// lib/userRoleUtils.ts

import supabase from './supabase';

/**
 * 예약 시 게스트를 멤버로 승격
 * 오직 예약 생성 시에만 호출되어야 함
 */
export const upgradeGuestToMember = async (userId: string, userEmail: string) => {
  try {
    // 1. 현재 사용자 정보 확인
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('사용자 정보 조회 실패:', userError);
      return { success: false, error: userError.message };
    }

    // 2. 게스트가 아니면 권한 변경 안함
    if (currentUser?.role !== 'guest') {
      console.log('이미 게스트가 아닌 사용자:', currentUser?.role);
      return { success: true, message: '권한 변경 불필요' };
    }

    // 3. 게스트를 멤버로 업그레이드
    const { error: updateError } = await supabase
      .from('users')
      .update({ 
        role: 'member',
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      console.error('권한 업그레이드 실패:', updateError);
      return { success: false, error: updateError.message };
    }

    console.log('✅ 게스트 → 멤버 권한 업그레이드 완료:', userId);
    return { success: true, message: '게스트에서 멤버로 승격됨' };

  } catch (error) {
    console.error('권한 업그레이드 중 오류:', error);
    return { success: false, error: '권한 업그레이드 실패' };
  }
};

/**
 * 사용자 권한 확인
 */
export const checkUserRole = async (userId: string) => {
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('권한 확인 실패:', error);
      return null;
    }

    return user?.role || null;
  } catch (error) {
    console.error('권한 확인 중 오류:', error);
    return null;
  }
};

/**
 * 관리자 권한 확인
 */
export const isAdmin = async (userId: string): Promise<boolean> => {
  const role = await checkUserRole(userId);
  return role === 'admin';
};

/**
 * 매니저 권한 확인
 */
export const isManager = async (userId: string): Promise<boolean> => {
  const role = await checkUserRole(userId);
  return role === 'manager' || role === 'admin';
};

/**
 * 멤버 권한 확인 (예약 가능)
 */
export const canMakeReservation = async (userId: string): Promise<boolean> => {
  const role = await checkUserRole(userId);
  return ['member', 'manager', 'admin'].includes(role || '');
};

/**
 * 권한별 리다이렉트 경로
 */
export const getRedirectPath = (role: string | null): string => {
  switch (role) {
    case 'admin':
      return '/admin/quotes';
    case 'manager':
      return '/manager/analytics';
    case 'member':
      return '/mypage';
    case 'guest':
    default:
      return '/mypage/quotes';
  }
};
