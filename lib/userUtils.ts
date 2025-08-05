import supabase from './supabase';

// 사용자 프로필 생성/업데이트 함수 (역할은 신중하게 다룸)
export const upsertUserProfile = async (
  userId: string,
  email: string,
  additionalData: {
    name?: string;
    english_name?: string;
    phone_number?: string;
    role?: string; // 역할 업데이트는 이 함수에서 직접 하지 않도록 유도
  } = {}
) => {
  try {
    // 1. 기존 사용자 정보 조회
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('사용자 정보 조회 오류:', fetchError);
      throw fetchError;
    }

    // 2. 업데이트할 데이터 준비
    const updateData: any = {
      id: userId,
      email: email,
      updated_at: new Date().toISOString(),
    };

    // 추가 정보가 있으면 병합
    if (additionalData.name) updateData.name = additionalData.name;
    if (additionalData.english_name) updateData.english_name = additionalData.english_name;
    if (additionalData.phone_number) updateData.phone_number = additionalData.phone_number;

    // 3. 역할(role) 처리
    // 기존 사용자가 있으면 역할을 변경하지 않음
    // 새 사용자이거나, 역할이 명시적으로 제공된 경우에만 설정
    if (existingUser) {
      // 기존 역할 유지
      updateData.role = existingUser.role;
    } else {
      // 새 사용자: 제공된 역할 또는 'guest'
      updateData.role = additionalData.role || 'guest';
      updateData.created_at = new Date().toISOString();
    }

    // 4. Upsert 실행
    const { error } = await supabase
      .from('users')
      .upsert(updateData, { onConflict: 'id' });

    if (error) {
      console.error('❌ 사용자 프로필 생성/업데이트 실패:', error);
      return { success: false, error };
    }

    console.log('✅ 사용자 프로필 생성/업데이트 성공');
    return { success: true, error: null };
  } catch (error) {
    console.error('❌ upsertUserProfile 오류:', error);
    return { success: false, error };
  }
};

// 현재 사용자 정보 가져오기 (인증 정보 + DB 정보)
export const getCurrentUserInfo = async () => {
  try {
    // 1. 인증된 사용자 정보 가져오기
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData.user) {
      return { user: null, userData: null, error: authError };
    }

    // 2. DB에서 사용자 추가 정보 가져오기
    const { data: userData, error: dbError } = await supabase
      .from('users')
      .select('id, email, name, english_name, phone_number, role, created_at, updated_at')
      .eq('id', authData.user.id)
      .single();

    if (dbError) {
      console.error('사용자 DB 정보 조회 실패:', dbError);
      // DB 정보가 없어도 인증 정보는 반환
      return {
        user: authData.user,
        userData: null,
        error: dbError,
      };
    }

    return {
      user: authData.user,
      userData,
      error: null,
    };
  } catch (error) {
    console.error('getCurrentUserInfo 오류:', error);
    return { user: null, userData: null, error };
  }
};

// 사용자 표시명 가져오기 (우선순위: name > user_metadata.name > email 앞부분 > '사용자')
export const getUserDisplayName = (user: any, userData: any) => {
  if (userData?.name) {
    return userData.name;
  }

  if (user?.user_metadata?.name) {
    return user.user_metadata.name;
  }

  if (user?.email) {
    return user.email.split('@')[0];
  }

  return '사용자';
};

// 사용자가 관리자인지 확인
export const isAdmin = (userData: any) => {
  return userData?.role === 'admin';
};

// 인증 상태 변경 리스너 설정
export const setupAuthListener = (onUserChange: (user: any, userData: any) => void) => {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(async (event: any, session: any) => {
    if (event === 'SIGNED_OUT') {
      onUserChange(null, null);
    } else if (event === 'SIGNED_IN' && session?.user) {
      // 로그인 시 사용자 정보 다시 가져오기
      const { user, userData } = await getCurrentUserInfo();
      onUserChange(user, userData);
    }
  });

  return subscription;
};
