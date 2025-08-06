import supabase from './supabase';

// 서비스 생성 시 베이스 가격 자동 설정 및 quote_item 동기화
export const setBasePriceAndSyncQuoteItem = async (
    serviceType: string,
    serviceId: string,
    priceCode: string,
    quoteId: string,
    quantity: number = 1
) => {
    try {
        let priceTable: string;
        let priceCodeField: string;

        // 서비스 타입에 따른 가격 테이블 매핑
        switch (serviceType) {
            case 'room':
                priceTable = 'room_price';
                priceCodeField = 'room_code';
                break;
            case 'car':
                priceTable = 'car_price';
                priceCodeField = 'car_code';
                break;
            case 'airport':
                priceTable = 'airport_price';
                priceCodeField = 'airport_code';
                break;
            case 'hotel':
                priceTable = 'hotel_price';
                priceCodeField = 'hotel_code';
                break;
            case 'tour':
                priceTable = 'tour_price';
                priceCodeField = 'tour_code';
                break;
            case 'rentcar':
                priceTable = 'rent_price';
                priceCodeField = 'rent_code';
                break;
            default:
                console.warn(`지원하지 않는 서비스 타입: ${serviceType}`);
                return { success: false, error: '지원하지 않는 서비스 타입' };
        }

        // 1. 가격 테이블에서 가격 조회
        const { data: priceData, error: priceError } = await supabase
            .from(priceTable)
            .select('price')
            .eq(priceCodeField, priceCode)
            .single();

        if (priceError || !priceData) {
            console.warn(`${serviceType} 가격 코드 ${priceCode}를 찾을 수 없습니다.`);
            return { success: false, error: '가격 정보를 찾을 수 없습니다' };
        }

        const basePrice = priceData.price;

        // 2. 서비스 테이블의 base_price 업데이트
        const { error: updateServiceError } = await supabase
            .from(serviceType)
            .update({ base_price: basePrice })
            .eq('id', serviceId);

        if (updateServiceError) {
            console.error(`${serviceType} 베이스 가격 설정 오류:`, updateServiceError);
            return { success: false, error: updateServiceError };
        }

        // 3. quote_item 테이블 업데이트 또는 생성
        const { data: existingItem, error: itemSelectError } = await supabase
            .from('quote_item')
            .select('id')
            .eq('quote_id', quoteId)
            .eq('service_type', serviceType)
            .eq('service_ref_id', serviceId)
            .single();

        if (existingItem) {
            // 기존 quote_item 업데이트
            const { error: itemUpdateError } = await supabase
                .from('quote_item')
                .update({
                    unit_price: basePrice,
                    total_price: basePrice * quantity
                })
                .eq('id', existingItem.id);

            if (itemUpdateError) {
                console.error('Quote item 업데이트 오류:', itemUpdateError);
                return { success: false, error: itemUpdateError };
            }
        } else {
            // 새 quote_item 생성
            const { error: itemInsertError } = await supabase
                .from('quote_item')
                .insert({
                    quote_id: quoteId,
                    service_type: serviceType,
                    service_ref_id: serviceId,
                    quantity: quantity,
                    unit_price: basePrice,
                    total_price: basePrice * quantity
                });

            if (itemInsertError) {
                console.error('Quote item 생성 오류:', itemInsertError);
                return { success: false, error: itemInsertError };
            }
        }

        return {
            success: true,
            basePrice: basePrice,
            totalPrice: basePrice * quantity
        };

    } catch (error) {
        console.error('베이스 가격 설정 및 동기화 중 오류:', error);
        return { success: false, error };
    }
};

// 기존 서비스들의 베이스 가격 일괄 동기화
export const syncAllServicePrices = async (quoteId: string) => {
    try {
        // quote_item에서 모든 서비스 조회
        const { data: quoteItems, error: itemsError } = await supabase
            .from('quote_item')
            .select('id, service_type, service_ref_id, quantity')
            .eq('quote_id', quoteId);

        if (itemsError || !quoteItems) {
            return { success: false, error: itemsError };
        }

        const results = [];

        for (const item of quoteItems) {
            // 각 서비스에서 가격 코드 조회
            const { data: serviceData, error: serviceError } = await supabase
                .from(item.service_type)
                .select(`
          id,
          ${item.service_type}_code,
          base_price
        `)
                .eq('id', item.service_ref_id)
                .single();

            if (serviceError || !serviceData) continue;

            const priceCodeField = `${item.service_type}_code`;
            const priceCode = serviceData[priceCodeField];

            if (priceCode) {
                const result = await setBasePriceAndSyncQuoteItem(
                    item.service_type,
                    item.service_ref_id,
                    priceCode,
                    quoteId,
                    item.quantity
                );
                results.push(result);
            }
        }

        return {
            success: true,
            results: results,
            updated: results.filter(r => r.success).length
        };

    } catch (error) {
        console.error('전체 서비스 가격 동기화 오류:', error);
        return { success: false, error };
    }
};