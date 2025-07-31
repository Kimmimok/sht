import supabase from './supabase';

// 사용자 프로필 생성/업데이트 함수
export const upsertUserProfile = async (
  userId: string,
  email: string,
  additionalData: {
    name?: string;
    english_name?: string;
    phone_number?: string;
    role?: string;
  } = {}
) => {
  try {
    const { error } = await supabase
      .from('users')
      .upsert({
        id: userId,
        email: email,
        role: additionalData.role || 'guest',
        name: additionalData.name,
        english_name: additionalData.english_name,
        phone_number: additionalData.phone_number,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      });

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
