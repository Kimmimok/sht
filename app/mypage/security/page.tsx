'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import supabase from '@/lib/supabase';
import PageWrapper from '@/components/PageWrapper';
import SectionBox from '@/components/SectionBox';

interface UserSecuritySettings {
    hideUrlBar: boolean;
    autoLogoutMinutes: number;
    sessionTimeoutEnabled: boolean;
}

export default function UserSecuritySettingsPage() {
    const [user, setUser] = useState<any>(null);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [settings, setSettings] = useState<UserSecuritySettings>({
        hideUrlBar: false,
        autoLogoutMinutes: 60,
        sessionTimeoutEnabled: false,
    });
    const [loading, setLoading] = useState(false);
    const [lastActivity, setLastActivity] = useState(Date.now());
    const [timeRemaining, setTimeRemaining] = useState(0);
    const router = useRouter();

    useEffect(() => {
        const checkAuth = async () => {
            const { data } = await supabase.auth.getUser();
            if (!data.user) {
                alert('로그인이 필요합니다.');
                router.push('/login');
                return;
            }

            setUser(data.user);

            // 사용자 역할 확인
            const { data: userData } = await supabase
                .from('users')
                .select('role')
                .eq('id', data.user.id)
                .single();

            setUserRole(userData?.role || 'guest');
        };

        checkAuth();
    }, [router]);

    // 로컬 스토리지에서 설정 로드
    useEffect(() => {
        const savedSettings = localStorage.getItem('userSecuritySettings');
        if (savedSettings) {
            try {
                const parsed = JSON.parse(savedSettings);
                setSettings(parsed);

                // URL 숨기기 설정 즉시 적용
                if (parsed.hideUrlBar) {
                    applyUrlHiding();
                }

                // 자동 로그아웃 설정 초기화
                if (parsed.sessionTimeoutEnabled) {
                    initializeAutoLogout(parsed.autoLogoutMinutes);
                }
            } catch (error) {
                console.error('설정 로드 실패:', error);
            }
        }
    }, []);

    // 활동 감지 및 자동 로그아웃 시스템
    useEffect(() => {
        if (!settings.sessionTimeoutEnabled) return;

        const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];

        const resetTimer = () => {
            setLastActivity(Date.now());
        };

        // 활동 이벤트 리스너 등록
        activityEvents.forEach(event => {
            document.addEventListener(event, resetTimer, true);
        });

        // 타이머 인터벌
        const timer = setInterval(() => {
            const now = Date.now();
            const elapsed = Math.floor((now - lastActivity) / 1000);
            const timeoutSeconds = settings.autoLogoutMinutes * 60;
            const remaining = Math.max(0, timeoutSeconds - elapsed);

            setTimeRemaining(remaining);

            if (remaining <= 0) {
                handleAutoLogout();
            } else if (remaining <= 60) {
                showLogoutWarning(remaining);
            }
        }, 1000);

        return () => {
            activityEvents.forEach(event => {
                document.removeEventListener(event, resetTimer, true);
            });
            clearInterval(timer);
        };
    }, [settings.sessionTimeoutEnabled, settings.autoLogoutMinutes, lastActivity]);

    const applyUrlHiding = () => {
        const style = document.createElement('style');
        style.id = 'user-security-style';
        style.textContent = `
      /* 사용자 보안 설정 CSS */
      * {
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
        -webkit-touch-callout: none;
      }
      
      /* 입력 필드는 선택 허용 */
      input, textarea, [contenteditable] {
        -webkit-user-select: text !important;
        -moz-user-select: text !important;
        -ms-user-select: text !important;
        user-select: text !important;
      }
      
      /* 우클릭 방지 */
      body {
        -webkit-touch-callout: none;
        -webkit-user-select: none;
        -khtml-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
        user-select: none;
      }
    `;
        document.head.appendChild(style);

        // 키보드 단축키 차단
        const handleKeyDown = (e: KeyboardEvent) => {
            if (
                e.key === 'F12' ||
                (e.ctrlKey && e.shiftKey && e.key === 'I') ||
                (e.ctrlKey && e.shiftKey && e.key === 'C') ||
                (e.ctrlKey && e.key === 'u') ||
                (e.ctrlKey && e.key === 'U')
            ) {
                e.preventDefault();
                return false;
            }
        };

        // 우클릭 방지
        const handleContextMenu = (e: MouseEvent) => {
            e.preventDefault();
            return false;
        };

        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('contextmenu', handleContextMenu);
    };

    const removeUrlHiding = () => {
        const style = document.getElementById('user-security-style');
        if (style) {
            style.remove();
        }
    };

    const initializeAutoLogout = (minutes: number) => {
        setLastActivity(Date.now());
    };

    const handleAutoLogout = async () => {
        try {
            await supabase.auth.signOut();
            alert('비활성 상태로 인해 자동 로그아웃되었습니다.');
            router.push('/login');
        } catch (error) {
            console.error('자동 로그아웃 실패:', error);
            router.push('/login');
        }
    };

    const showLogoutWarning = (seconds: number) => {
        if (seconds === 60 || seconds === 30 || seconds === 10) {
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            const timeString = minutes > 0
                ? `${minutes}분 ${remainingSeconds}초`
                : `${remainingSeconds}초`;

            if (confirm(`${timeString} 후 자동 로그아웃됩니다. 계속 사용하시겠습니까?`)) {
                setLastActivity(Date.now());
            }
        }
    };

    const handleSettingChange = (key: keyof UserSecuritySettings, value: any) => {
        const newSettings = { ...settings, [key]: value };
        setSettings(newSettings);

        // 로컬 스토리지에 저장
        localStorage.setItem('userSecuritySettings', JSON.stringify(newSettings));

        // URL 숨기기 설정 즉시 적용
        if (key === 'hideUrlBar') {
            if (value) {
                applyUrlHiding();
            } else {
                removeUrlHiding();
            }
        }

        // 자동 로그아웃 설정 변경 시
        if (key === 'sessionTimeoutEnabled' || key === 'autoLogoutMinutes') {
            if (newSettings.sessionTimeoutEnabled) {
                initializeAutoLogout(newSettings.autoLogoutMinutes);
            }
        }
    };

    const saveSettings = async () => {
        setLoading(true);
        try {
            localStorage.setItem('userSecuritySettings', JSON.stringify(settings));
            alert('보안 설정이 저장되었습니다.');
        } catch (error) {
            console.error('설정 저장 실패:', error);
            alert('설정 저장에 실패했습니다.');
        } finally {
            setLoading(false);
        }
    };

    const resetSettings = () => {
        if (confirm('모든 보안 설정을 기본값으로 초기화하시겠습니까?')) {
            const defaultSettings: UserSecuritySettings = {
                hideUrlBar: false,
                autoLogoutMinutes: 60,
                sessionTimeoutEnabled: false,
            };

            setSettings(defaultSettings);
            localStorage.setItem('userSecuritySettings', JSON.stringify(defaultSettings));
            removeUrlHiding();
            alert('보안 설정이 초기화되었습니다.');
        }
    };

    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    if (!user) {
        return (
            <PageWrapper>
                <div className="text-center py-12">
                    <p>로그인 확인 중...</p>
                </div>
            </PageWrapper>
        );
    }

    return (
        <PageWrapper>
            <SectionBox title="🔒 보안 설정">
                <div className="space-y-6">

                    {/* 자동 로그아웃 상태 표시 */}
                    {settings.sessionTimeoutEnabled && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                    <span className="text-yellow-600">⏰</span>
                                    <span className="text-yellow-800 font-medium">
                                        자동 로그아웃까지: {formatTime(timeRemaining)}
                                    </span>
                                </div>
                                <button
                                    onClick={() => setLastActivity(Date.now())}
                                    className="px-3 py-1 bg-yellow-200 text-yellow-800 rounded text-sm hover:bg-yellow-300"
                                >
                                    시간 연장
                                </button>
                            </div>
                        </div>
                    )}

                    {/* 사용자 정보 */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h3 className="font-medium text-blue-900 mb-2">👤 사용자 정보</h3>
                        <div className="text-sm text-blue-800 space-y-1">
                            <div>이메일: {user.email}</div>
                            <div>역할: {userRole === 'admin' ? '관리자' : userRole === 'manager' ? '매니저' : userRole === 'member' ? '회원' : '게스트'}</div>
                            <div>마지막 활동: {new Date(lastActivity).toLocaleTimeString()}</div>
                        </div>
                    </div>

                    {/* URL 보안 설정 */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">🛡️ URL 보안</h3>

                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                            <div className="flex-1">
                                <h4 className="font-medium text-gray-900">URL 경로 숨기기</h4>
                                <p className="text-sm text-gray-600 mt-1">
                                    브라우저에서 개발자 도구와 우클릭을 차단하여 보안을 강화합니다.
                                </p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer ml-4">
                                <input
                                    type="checkbox"
                                    checked={settings.hideUrlBar}
                                    onChange={(e) => handleSettingChange('hideUrlBar', e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>

                        {settings.hideUrlBar && (
                            <div className="mt-4 bg-orange-50 border border-orange-200 rounded-lg p-4">
                                <div className="flex items-start space-x-2">
                                    <span className="text-orange-500 text-lg">⚠️</span>
                                    <div className="text-sm text-orange-700">
                                        <strong>활성화된 보안 기능:</strong>
                                        <ul className="mt-2 list-disc list-inside space-y-1">
                                            <li>개발자 도구 차단 (F12, Ctrl+Shift+I)</li>
                                            <li>우클릭 메뉴 비활성화</li>
                                            <li>페이지 소스 보기 제한 (Ctrl+U)</li>
                                            <li>텍스트 선택 제한 (입력 필드 제외)</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 자동 로그아웃 설정 */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">⏱️ 자동 로그아웃</h3>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                <div className="flex-1">
                                    <h4 className="font-medium text-gray-900">자동 로그아웃 활성화</h4>
                                    <p className="text-sm text-gray-600 mt-1">
                                        지정된 시간 동안 비활성 상태일 때 자동으로 로그아웃됩니다.
                                    </p>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer ml-4">
                                    <input
                                        type="checkbox"
                                        checked={settings.sessionTimeoutEnabled}
                                        onChange={(e) => handleSettingChange('sessionTimeoutEnabled', e.target.checked)}
                                        className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                </label>
                            </div>

                            {settings.sessionTimeoutEnabled && (
                                <div className="p-4 bg-blue-50 rounded-lg">
                                    <h4 className="font-medium text-gray-900 mb-3">로그아웃 대기 시간</h4>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        {[15, 30, 45, 60, 90, 120, 180, 240].map((minutes) => (
                                            <button
                                                key={minutes}
                                                onClick={() => handleSettingChange('autoLogoutMinutes', minutes)}
                                                className={`p-3 rounded-lg text-sm font-medium transition-colors ${settings.autoLogoutMinutes === minutes
                                                        ? 'bg-blue-600 text-white'
                                                        : 'bg-white text-gray-700 hover:bg-blue-100 border border-gray-300'
                                                    }`}
                                            >
                                                {minutes}분
                                            </button>
                                        ))}
                                    </div>

                                    <div className="mt-4 p-3 bg-white rounded border">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            직접 입력 (분)
                                        </label>
                                        <input
                                            type="number"
                                            min="5"
                                            max="480"
                                            value={settings.autoLogoutMinutes}
                                            onChange={(e) => handleSettingChange('autoLogoutMinutes', parseInt(e.target.value) || 60)}
                                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            placeholder="시간 입력 (5-480분)"
                                        />
                                    </div>

                                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded">
                                        <div className="flex items-center space-x-2">
                                            <span className="text-green-600">✅</span>
                                            <span className="text-green-800 text-sm">
                                                현재 설정: {settings.autoLogoutMinutes}분 후 자동 로그아웃
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 보안 정보 */}
                    <div className="bg-white border border-gray-200 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">ℹ️ 보안 정보</h3>

                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between py-2 border-b border-gray-200">
                                <span className="text-gray-600">설정 저장 위치:</span>
                                <span className="font-medium">브라우저 로컬 스토리지</span>
                            </div>
                            <div className="flex justify-between py-2 border-b border-gray-200">
                                <span className="text-gray-600">브라우저:</span>
                                <span className="font-medium">{navigator.userAgent.split(' ')[0]}</span>
                            </div>
                            <div className="flex justify-between py-2">
                                <span className="text-gray-600">마지막 저장:</span>
                                <span className="font-medium">{new Date().toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    {/* 액션 버튼 */}
                    <div className="flex justify-end space-x-4">
                        <button
                            onClick={resetSettings}
                            className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                            초기화
                        </button>
                        <button
                            onClick={saveSettings}
                            disabled={loading}
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                            {loading ? '저장 중...' : '설정 저장'}
                        </button>
                    </div>
                </div>
            </SectionBox>
        </PageWrapper>
    );
}
