require('dotenv').config({ path: '.env.local' });
const { google } = require('googleapis');

async function checkCruiseSheets() {
    const auth = new google.auth.GoogleAuth({
        credentials: {
            type: 'service_account',
            client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
            private_key: process.env.GOOGLE_SERVICE_ACCOUNT_KEY.replace(/\\n/g, '\n'),
        },
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;

    try {
        // 시트 목록 확인
        const sheetInfo = await sheets.spreadsheets.get({ spreadsheetId });
        const sheetNames = sheetInfo.data.sheets.map(sheet => sheet.properties.title);
        console.log('📋 사용 가능한 시트:', sheetNames.join(', '));

        // 차량 관련 시트 확인
        const carSheets = sheetNames.filter(name =>
            name.includes('차량') || name.includes('car') || name.includes('Car')
        );

        console.log('\n🚗 차량 관련 시트:', carSheets.join(', '));

        // 크루즈 관련 시트 확인
        const cruiseSheets = sheetNames.filter(name =>
            name.includes('크루즈') || name.includes('cruise') || name.includes('Cruise')
        );

        console.log('\n🚢 크루즈 관련 시트:', cruiseSheets.join(', '));

        // 각 시트의 헤더 확인
        const allTargetSheets = [...cruiseSheets, ...carSheets];
        for (const sheetName of allTargetSheets) {
            try {
                const response = await sheets.spreadsheets.values.get({
                    spreadsheetId,
                    range: `${sheetName}!1:3`,
                });

                const rows = response.data.values || [];
                console.log(`\n📊 [${sheetName}] 시트 구조:`);
                if (rows.length > 0) {
                    console.log('헤더:', rows[0].join(' | '));
                    if (rows.length > 1) {
                        console.log('샘플 데이터:', rows[1].slice(0, 5).join(' | ') + '...');
                        console.log(`총 데이터 행: ${rows.length - 1}`);
                    }
                } else {
                    console.log('데이터 없음');
                }
            } catch (error) {
                console.error(`❌ ${sheetName} 시트 읽기 실패:`, error.message);
            }
        }
    } catch (error) {
        console.error('❌ 시트 정보 확인 실패:', error.message);
    }
}

checkCruiseSheets();
