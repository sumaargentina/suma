
const patientId = '1bbd288f-58f7-4847-8761-f57b506143b4';
const url = `http://localhost:3000/api/medical-records?patient_id=${patientId}`;

console.log(`📡 Testing API: ${url}`);

async function test() {
    try {
        const res = await fetch(url);
        console.log(`Status: ${res.status} ${res.statusText}`);

        const text = await res.text();
        console.log('Body:', text.substring(0, 500));

        try {
            const json = JSON.parse(text);
            console.log('JSON Length:', Array.isArray(json) ? json.length : 'Not Array');
        } catch (e) {
            console.log('Not JSON');
        }
    } catch (e) {
        console.error('❌ Fetch failed:', e.message);
    }
}

test();
