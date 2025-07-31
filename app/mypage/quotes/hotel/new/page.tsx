'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import supabase from '@/lib/supabase'

function NewHotelQuoteContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const quoteId = searchParams.get('quoteId')

  const [loading, setLoading] = useState(false)
  const [quote, setQuote] = useState(null)
  const [hotelNameOptions, setHotelNameOptions] = useState([])
  const [roomNameOptions, setRoomNameOptions] = useState([])
  const [roomTypeOptions, setRoomTypeOptions] = useState([])
  const [filteredHotels, setFilteredHotels] = useState([])

  // 선택된 값들
  const [selectedHotelName, setSelectedHotelName] = useState('')
  const [selectedRoomName, setSelectedRoomName] = useState('')
  const [selectedRoomType, setSelectedRoomType] = useState('')
  const [selectedHotel, setSelectedHotel] = useState(null)
  const [selectedHotelCode, setSelectedHotelCode] = useState('')

  const [formData, setFormData] = useState({
    checkin_date: '',
    checkout_date: '',
    guest_count: 1,
    special_requests: ''
  })

  const loadQuote = async () => {
    if (!quoteId) return
    
    try {
      const { data, error } = await supabase
        .from('quote')
        .select('*')
        .eq('id', quoteId)
        .single()
      
      if (error) throw error
      setQuote(data)
    } catch (error) {
      console.error('견적 정보 로드 실패:', error)
      alert('견적 정보를 불러올 수 없습니다.')
      router.push('/mypage/quotes')
    }
  }

  useEffect(() => {
    if (!quoteId) {
      alert('견적 ID가 필요합니다.')
      router.push('/mypage')
      return
    }
    loadQuote()
  }, [quoteId, router])

  // 체크인/체크아웃 날짜가 설정되면 호텔명 옵션 업데이트
  useEffect(() => {
    if (formData.checkin_date && formData.checkout_date) {
      loadHotelNameOptions()
    } else {
      setHotelNameOptions([])
      setSelectedHotelName('')
    }
  }, [formData.checkin_date, formData.checkout_date])

  // 호텔명 선택 시 객실명 옵션 업데이트
  useEffect(() => {
    if (selectedHotelName && formData.checkin_date && formData.checkout_date) {
      loadRoomNameOptions(selectedHotelName)
    } else {
      setRoomNameOptions([])
      setSelectedRoomName('')
    }
  }, [selectedHotelName, formData.checkin_date, formData.checkout_date])

  // 호텔명과 객실명이 선택될 때 객실 타입 목록 업데이트
  useEffect(() => {
    if (selectedHotelName && selectedRoomName && formData.checkin_date && formData.checkout_date) {
      loadRoomTypeOptions(selectedHotelName, selectedRoomName)
    } else {
      setRoomTypeOptions([])
      setSelectedRoomType('')
    }
  }, [selectedHotelName, selectedRoomName, formData.checkin_date, formData.checkout_date])

  // 모든 조건이 선택되면 최종 호텔 옵션 검색
  useEffect(() => {
    if (selectedHotelName && selectedRoomName && selectedRoomType && formData.checkin_date && formData.checkout_date) {
      searchFinalHotels()
    } else {
      setFilteredHotels([])
      setSelectedHotel(null)
      setSelectedHotelCode('')
    }
  }, [selectedHotelName, selectedRoomName, selectedRoomType, formData.checkin_date, formData.checkout_date])

  // 요일 계산 함수
  const getWeekdayFromDate = useCallback((dateString) => {
    const date = new Date(dateString)
    const weekdays = ['일', '월', '화', '수', '목', '금', '토']
    return weekdays[date.getDay()]
  }, [])

  const loadHotelNameOptions = useCallback(async () => {
    try {
      const checkinWeekday = getWeekdayFromDate(formData.checkin_date)
      console.log('🏨 체크인 요일:', checkinWeekday)

      const { data, error } = await supabase
        .from('hotel_price')
        .select('hotel_name')
        .lte('start_date', formData.checkin_date)
        .gte('end_date', formData.checkout_date)
        .like('weekday_type', `%${checkinWeekday}%`)
        .order('hotel_name')

      if (error) throw error
      
      // 중복 제거
      const uniqueHotelNames = [...new Set(data.map((item) => item.hotel_name).filter(Boolean))]
      setHotelNameOptions(uniqueHotelNames)
      
      console.log('🏨 필터링된 호텔명 옵션:', uniqueHotelNames)
    } catch (error) {
      console.error('호텔명 옵션 로드 실패:', error)
    }
  }, [formData.checkin_date, formData.checkout_date, getWeekdayFromDate])

  const loadRoomNameOptions = useCallback(async (hotelName) => {
    try {
      const checkinWeekday = getWeekdayFromDate(formData.checkin_date)

      const { data, error } = await supabase
        .from('hotel_price')
        .select('room_name')
        .eq('hotel_name', hotelName)
        .lte('start_date', formData.checkin_date)
        .gte('end_date', formData.checkout_date)
        .like('weekday_type', `%${checkinWeekday}%`)
        .order('room_name')

      if (error) throw error
      
      const uniqueRoomNames = [...new Set(data.map((item) => item.room_name).filter(Boolean))]
      setRoomNameOptions(uniqueRoomNames)
      
      console.log('🏨 필터링된 객실명 옵션:', uniqueRoomNames)
    } catch (error) {
      console.error('객실명 옵션 로드 실패:', error)
    }
  }, [formData.checkin_date, formData.checkout_date, getWeekdayFromDate])

  const loadRoomTypeOptions = useCallback(async (hotelName, roomName) => {
    try {
      const checkinWeekday = getWeekdayFromDate(formData.checkin_date)

      const { data, error } = await supabase
        .from('hotel_price')
        .select('room_type')
        .eq('hotel_name', hotelName)
        .eq('room_name', roomName)
        .lte('start_date', formData.checkin_date)
        .gte('end_date', formData.checkout_date)
        .like('weekday_type', `%${checkinWeekday}%`)
        .order('room_type')

      if (error) throw error
      
      const uniqueRoomTypes = [...new Set(data.map((item) => item.room_type).filter(Boolean))]
      setRoomTypeOptions(uniqueRoomTypes)
      
      console.log('🏨 필터링된 객실 타입 옵션:', uniqueRoomTypes)
    } catch (error) {
      console.error('객실 타입 옵션 로드 실패:', error)
    }
  }, [formData.checkin_date, formData.checkout_date, getWeekdayFromDate])

  const searchFinalHotels = useCallback(async () => {
    try {
      const checkinWeekday = getWeekdayFromDate(formData.checkin_date)

      const { data, error } = await supabase
        .from('hotel_price')
        .select('hotel_code, hotel_name, room_name, room_type, price')
        .eq('hotel_name', selectedHotelName)
        .eq('room_name', selectedRoomName)
        .eq('room_type', selectedRoomType)
        .lte('start_date', formData.checkin_date)
        .gte('end_date', formData.checkout_date)
        .like('weekday_type', `%${checkinWeekday}%`)
        .order('hotel_code')

      if (error) throw error
      
      setFilteredHotels(data)
      console.log('🏨 최종 필터링된 호텔들:', data)
    } catch (error) {
      console.error('최종 호텔 검색 실패:', error)
      setFilteredHotels([])
    }
  }, [formData.checkin_date, formData.checkout_date, selectedHotelName, selectedRoomName, selectedRoomType, getWeekdayFromDate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.checkin_date || !formData.checkout_date) {
      alert('체크인/체크아웃 날짜를 선택해주세요.')
      return
    }

    if (!selectedHotel) {
      alert('호텔을 선택해주세요.')
      return
    }

    if (!quoteId) {
      alert('견적 ID가 없습니다.')
      return
    }

    setLoading(true)

    try {
      // 호텔 폼 데이터 구성
      const hotelData = {
        hotel_code: selectedHotel.hotel_code,
        checkin_date: formData.checkin_date,
        checkout_date: formData.checkout_date,
        guest_count: formData.guest_count,
        base_price: 0,
        ...(formData.special_requests && { special_requests: formData.special_requests })
      }

      console.log('🏨 호텔 데이터:', hotelData)

      // 1. 호텔 서비스 생성
      const { data: hotelServiceData, error: hotelError } = await supabase
        .from('hotel')
        .insert([hotelData])
        .select()
        .single()

      if (hotelError) {
        console.error('❌ 호텔 서비스 생성 오류:', hotelError)
        alert(`호텔 서비스 생성 실패: ${hotelError.message}`)
        return
      }

      console.log('✅ 호텔 서비스 생성 성공:', hotelServiceData)

      // 2. 견적 아이템 생성
      const { data: itemData, error: itemError } = await supabase
        .from('quote_item')
        .insert({
          quote_id: quoteId,
          service_type: 'hotel',
          service_ref_id: hotelServiceData.id,
          quantity: 1,
          unit_price: parseInt(selectedHotel.price) || 0,
          total_price: parseInt(selectedHotel.price) || 0
        })
        .select()
        .single()

      if (itemError) {
        console.error('❌ 견적 아이템 생성 오류:', itemError)
        alert(`견적 아이템 생성 실패: ${itemError.message}`)
        return
      }

      console.log('✅ 견적 아이템 생성 성공:', itemData)

      alert('호텔이 견적에 추가되었습니다!')
      router.push(`/mypage/quotes/${quoteId}/view`)

    } catch (error) {
      console.error('❌ 호텔 견적 추가 중 오류:', error)
      alert('오류가 발생했습니다: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const isFormValid = formData.checkin_date && formData.checkout_date && selectedHotel

  if (!quote) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
          <p className="mt-4 text-gray-600">견적 정보를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-gradient-to-br from-blue-200 via-purple-200 to-indigo-100 text-gray-900">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">🏨 호텔 견적 신청</h1>
              <p className="text-lg opacity-90">
                호텔 숙박을 위한 견적을 작성해주세요.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => router.back()}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                ← 뒤로
              </button>
            </div>
          </div>
          
          {/* 견적 정보 */}
          <div className="bg-white/70 backdrop-blur rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-800 mb-2">현재 견적 정보</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>견적명: <span className="font-semibold text-blue-600">{quote.title}</span></div>
              <div>상태: {quote.status === 'draft' ? '작성 중' : quote.status}</div>
              <div>작성일: {new Date(quote.created_at).toLocaleDateString('ko-KR')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 폼 */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">호텔 정보 입력</h2>
            
            {/* 호텔 안내 카드 */}
            <div className="bg-blue-600 rounded-lg p-6 mb-6 border border-blue-700">
              <h3 className="text-white text-lg font-semibold mb-2">📝 견적안내</h3>
              <p className="text-white/90 text-sm">호텔 예약을 위해 아래 정보를 순서대로 입력해 주세요.<br/>체크인/체크아웃 날짜를 먼저 선택하시면 해당 날짜에 예약 가능한 호텔 목록이 표시됩니다.</p>
            </div>

            {/* 호텔 선택 폼 */}
            <div className="space-y-6">
              {/* 투숙 기간 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    📅 체크인 날짜 *
                  </label>
                  <input
                    type="date"
                    value={formData.checkin_date}
                    onChange={(e) => setFormData({...formData, checkin_date: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                  {formData.checkin_date && (
                    <p className="text-sm text-gray-500 mt-1">
                      요일: {getWeekdayFromDate(formData.checkin_date)}요일
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    📅 체크아웃 날짜 *
                  </label>
                  <input
                    type="date"
                    value={formData.checkout_date}
                    onChange={(e) => setFormData({...formData, checkout_date: e.target.value})}
                    min={formData.checkin_date}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              {/* 1단계: 호텔명 선택 */}
              {hotelNameOptions.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    🏨 호텔명 *
                  </label>
                  <select
                    value={selectedHotelName}
                    onChange={(e) => setSelectedHotelName(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">호텔을 선택하세요</option>
                    {hotelNameOptions.map(hotel => (
                      <option key={hotel} value={hotel}>{hotel}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* 2단계: 객실명 선택 */}
              {selectedHotelName && roomNameOptions.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    🛏️ 객실명 *
                  </label>
                  <select
                    value={selectedRoomName}
                    onChange={(e) => setSelectedRoomName(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">객실을 선택하세요</option>
                    {roomNameOptions.map(room => (
                      <option key={room} value={room}>{room}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* 3단계: 객실 타입 선택 */}
              {selectedHotelName && selectedRoomName && roomTypeOptions.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    🏷️ 객실 타입 *
                  </label>
                  <select
                    value={selectedRoomType}
                    onChange={(e) => setSelectedRoomType(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">객실 타입을 선택하세요</option>
                    {roomTypeOptions.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* 4단계: 최종 호텔 선택 */}
              {filteredHotels.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ✅ 최종 호텔 선택 *
                  </label>
                  <div className="space-y-3">
                    {filteredHotels.map((hotel, index) => (
                      <div
                        key={`${hotel.hotel_code}-${index}`}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          selectedHotel?.hotel_code === hotel.hotel_code
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                        onClick={() => {
                          setSelectedHotel(hotel)
                          setSelectedHotelCode(hotel.hotel_code)
                        }}
                      >
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="font-medium">{hotel.hotel_name}</h3>
                            <p className="text-sm text-gray-600">
                              {hotel.room_name} - {hotel.room_type}
                            </p>
                            <p className="text-sm text-gray-500">코드: {hotel.hotel_code}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-blue-600">
                              {parseInt(hotel.price || '0').toLocaleString()}원
                            </p>
                            <p className="text-sm text-gray-500">1박 기준</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 투숙 인원 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  👥 투숙 인원 *
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.guest_count}
                  onChange={(e) => setFormData({...formData, guest_count: parseInt(e.target.value) || 1})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              {/* 특별 요청사항 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📝 특별 요청사항
                </label>
                <textarea
                  value={formData.special_requests}
                  onChange={(e) => setFormData({...formData, special_requests: e.target.value})}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                  placeholder="특별한 요청사항이 있으시면 입력해주세요"
                />
              </div>

              {/* 선택 요약 */}
              {isFormValid && (
                <div className="bg-green-50 p-6 rounded-lg border border-green-200">
                  <h3 className="font-semibold text-green-800 mb-3">✅ 선택 요약</h3>
                  <div className="text-green-700 space-y-2">
                    <div><strong>체크인:</strong> {new Date(formData.checkin_date).toLocaleDateString('ko-KR')} ({getWeekdayFromDate(formData.checkin_date)}요일)</div>
                    <div><strong>체크아웃:</strong> {new Date(formData.checkout_date).toLocaleDateString('ko-KR')}</div>
                    <div><strong>호텔:</strong> {selectedHotelName}</div>
                    <div><strong>객실:</strong> {selectedRoomName} - {selectedRoomType}</div>
                    <div><strong>투숙 인원:</strong> {formData.guest_count}명</div>
                    <div><strong>1박 요금:</strong> {parseInt(selectedHotel?.price || '0').toLocaleString()}원</div>
                    {selectedHotelCode && (
                      <div className="pt-2 border-t border-green-200">
                        <strong>🔍 선택된 호텔 코드:</strong> <span className="bg-yellow-100 px-2 py-1 rounded font-mono text-sm">{selectedHotelCode}</span>
                      </div>
                    )}
                    {formData.special_requests && <div><strong>특별 요청:</strong> {formData.special_requests}</div>}
                  </div>
                </div>
              )}
            </div>

            {/* 제출 버튼 */}
            <div className="flex justify-center space-x-4 pt-6 mt-8">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={!isFormValid || loading}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? '처리 중...' : '견적에 추가'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default function NewHotelQuotePage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center h-64">로딩 중...</div>}>
      <NewHotelQuoteContent />
    </Suspense>
  );
}
